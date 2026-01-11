import express from 'express';
import pg from 'pg';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.use(express.static(join(__dirname, 'public')));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/restaurant_orders',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const initDatabase = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS waiters (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      pin VARCHAR(6),
      password_hash VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const columnCheck = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='waiters' AND column_name='password_hash'
  `);

  if (columnCheck.rows.length === 0) {
    await pool.query(`
      ALTER TABLE waiters ADD COLUMN password_hash VARCHAR(255)
    `);
    console.log('Added password_hash column to waiters table');
    
    const waitersWithoutHash = await pool.query(`
      SELECT id, pin FROM waiters WHERE password_hash IS NULL
    `);
    
    for (const waiter of waitersWithoutHash.rows) {
      if (waiter.pin) {
        const hashedPassword = await bcrypt.hash(waiter.pin, 10);
        await pool.query(`
          UPDATE waiters SET password_hash = $1 WHERE id = $2
        `, [hashedPassword, waiter.id]);
      }
    }
    console.log(`Migrated ${waitersWithoutHash.rows.length} waiters to use password hashes`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_sessions (
      id SERIAL PRIMARY KEY,
      waiter_id INTEGER REFERENCES waiters(id),
      date DATE NOT NULL,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(waiter_id, date)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      table_number INTEGER NOT NULL,
      waiter_id INTEGER REFERENCES waiters(id),
      status VARCHAR(50) DEFAULT 'active',
      total_amount DECIMAL(10, 2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      paid_at TIMESTAMP,
      session_id INTEGER REFERENCES daily_sessions(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id),
      item_name VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      added_by INTEGER REFERENCES waiters(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cancellations (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id),
      item_id INTEGER REFERENCES order_items(id),
      reason TEXT NOT NULL,
      canceled_by INTEGER REFERENCES waiters(id),
      canceled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      type VARCHAR(50)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      category VARCHAR(100),
      available BOOLEAN DEFAULT true
    )
  `);

  const waiterCheck = await pool.query('SELECT COUNT(*) FROM waiters');
  if (waiterCheck.rows[0].count === '0') {
    const hashedPassword = await bcrypt.hash('1234', 10);
    await pool.query(`
      INSERT INTO waiters (name, pin, password_hash) VALUES 
      ('Raj', '1234', $1),
      ('Priya', '1234', $1),
      ('Amit', '1234', $1),
      ('Anjali', '1234', $1),
      ('Manager', '1234', $1)
    `, [hashedPassword]);
  }

  const menuCheck = await pool.query('SELECT COUNT(*) FROM menu_items');
  if (menuCheck.rows[0].count === '0') {
    await pool.query(`
      INSERT INTO menu_items (name, price, category) VALUES 
      ('Chicken Biryani', 350, 'Main'),
      ('Mutton Biryani', 450, 'Main'),
      ('Butter Chicken', 380, 'Main'),
      ('Paneer Butter Masala', 320, 'Main'),
      ('Dal Makhani', 280, 'Main'),
      ('Tandoori Chicken', 420, 'Main'),
      ('Chicken Tikka Masala', 360, 'Main'),
      ('Palak Paneer', 300, 'Main'),
      ('Samosa', 80, 'Starter'),
      ('Paneer Tikka', 280, 'Starter'),
      ('Chicken 65', 320, 'Starter'),
      ('Aloo Tikki', 120, 'Starter'),
      ('Papdi Chaat', 150, 'Starter'),
      ('Veg Pakora', 180, 'Starter'),
      ('Tandoori Roti', 40, 'Bread'),
      ('Butter Naan', 60, 'Bread'),
      ('Garlic Naan', 70, 'Bread'),
      ('Cheese Naan', 80, 'Bread'),
      ('Laccha Paratha', 50, 'Bread'),
      ('Plain Rice', 120, 'Side'),
      ('Jeera Rice', 150, 'Side'),
      ('Raita', 80, 'Side'),
      ('Papad', 30, 'Side'),
      ('Gulab Jamun', 120, 'Dessert'),
      ('Rasmalai', 140, 'Dessert'),
      ('Gajar Halwa', 130, 'Dessert'),
      ('Kulfi', 100, 'Dessert'),
      ('Jalebi', 90, 'Dessert'),
      ('Masala Chai', 40, 'Drink'),
      ('Lassi', 80, 'Drink'),
      ('Mango Lassi', 100, 'Drink'),
      ('Thums Up', 50, 'Drink'),
      ('Fresh Lime Soda', 70, 'Drink'),
      ('Gulab Jamun', 120, 'Dessert'),
      ('Rasmalai', 150, 'Dessert'),
      ('Gajar Halwa', 140, 'Dessert'),
      ('Kulfi', 100, 'Dessert')
    `);
  }
};

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Access from other devices using your computer\'s IP address');
  await initDatabase();
  console.log('Database initialized');
});

const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  if (process.env.ALLOWED_ORIGINS && !process.env.ALLOWED_ORIGINS.split(',').includes(origin)) {
    console.warn(`WebSocket connection rejected from origin: ${origin}`);
    ws.close(1008, 'Origin not allowed');
    return;
  }
  
  clients.add(ws);
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  ws.on('close', () => {
    clients.delete(ws);
  });
});

const broadcast = (data) => {
  clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
};

app.get('/api/waiters', async (req, res) => {
  const result = await pool.query('SELECT id, name, pin FROM waiters ORDER BY name');
  res.json(result.rows);
});

app.post('/api/waiters/login', async (req, res) => {
  const { token } = req.body;
  const result = await pool.query('SELECT id, name FROM waiters WHERE pin = $1', [token]);
  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  res.json(result.rows[0]);
});

app.post('/api/manager/waiters', async (req, res) => {
  const { name, pin } = req.body;
  const hashedPassword = await bcrypt.hash(pin, 10);
  const result = await pool.query(
    'INSERT INTO waiters (name, pin, password_hash) VALUES ($1, $2, $3) RETURNING *',
    [name, pin, hashedPassword]
  );
  broadcast({ type: 'waiter_added', waiter: result.rows[0] });
  res.json(result.rows[0]);
});

app.delete('/api/manager/waiters/:id', async (req, res) => {
  await pool.query('DELETE FROM waiters WHERE id = $1', [req.params.id]);
  broadcast({ type: 'waiter_deleted', waiterId: req.params.id });
  res.json({ success: true });
});

// Authentication Endpoints
app.post('/api/auth/waiter', async (req, res) => {
  const { waiterId, password } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT * FROM waiters WHERE id = $1',
      [waiterId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const waiter = result.rows[0];
    const isValid = await bcrypt.compare(password, waiter.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({ success: true, waiter: { id: waiter.id, name: waiter.name } });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.post('/api/auth/manager', async (req, res) => {
  const { password } = req.body;
  
  try {
    const result = await pool.query(
      "SELECT * FROM waiters WHERE name = 'Manager'"
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const manager = result.rows[0];
    const isValid = await bcrypt.compare(password, manager.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Manager Menu Management Endpoints
app.post('/api/manager/menu', async (req, res) => {
  const { name, price, category } = req.body;
  const result = await pool.query(
    'INSERT INTO menu_items (name, price, category, available) VALUES ($1, $2, $3, true) RETURNING *',
    [name, price, category]
  );
  broadcast({ type: 'menu_updated' });
  res.json(result.rows[0]);
});

app.put('/api/manager/menu/:id', async (req, res) => {
  const { name, price, category, available } = req.body;
  const result = await pool.query(
    'UPDATE menu_items SET name = $1, price = $2, category = $3, available = $4 WHERE id = $5 RETURNING *',
    [name, price, category, available !== undefined ? available : true, req.params.id]
  );
  broadcast({ type: 'menu_updated' });
  res.json(result.rows[0]);
});

app.delete('/api/manager/menu/:id', async (req, res) => {
  await pool.query('DELETE FROM menu_items WHERE id = $1', [req.params.id]);
  broadcast({ type: 'menu_updated' });
  res.json({ success: true });
});

app.get('/api/manager/menu', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM menu_items ORDER BY category, name'
  );
  res.json(result.rows);
});

app.post('/api/session/start', async (req, res) => {
  const { waiterId } = req.body;
  const today = new Date().toISOString().split('T')[0];
  
  const result = await pool.query(
    `INSERT INTO daily_sessions (waiter_id, date) 
     VALUES ($1, $2) 
     ON CONFLICT (waiter_id, date) 
     DO UPDATE SET started_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [waiterId, today]
  );
  
  res.json(result.rows[0]);
});

app.get('/api/session/current', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const result = await pool.query(
    `SELECT s.*, w.name as waiter_name 
     FROM daily_sessions s
     JOIN waiters w ON s.waiter_id = w.id
     WHERE s.date = $1
     ORDER BY s.started_at DESC
     LIMIT 1`,
    [today]
  );
  res.json(result.rows[0] || null);
});

app.get('/api/menu', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM menu_items WHERE available = true ORDER BY category, name'
  );
  res.json(result.rows);
});

app.post('/api/orders', async (req, res) => {
  try {
    const { tableNumber, items, waiterId, sessionId } = req.body;
    
    if (!tableNumber || !Array.isArray(items) || items.length === 0 || !waiterId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (typeof tableNumber !== 'number' || tableNumber < 1) {
      return res.status(400).json({ error: 'Invalid table number' });
    }
    
    for (const item of items) {
      if (!item.name || !item.quantity || !item.price || item.quantity < 1 || item.price < 0) {
        return res.status(400).json({ error: 'Invalid item data' });
      }
    }
    
    const existingOrder = await pool.query(
      'SELECT id FROM orders WHERE table_number = $1 AND status = $2',
      [tableNumber, 'active']
    );

    if (existingOrder.rows.length > 0) {
      return res.status(400).json({ error: 'Table already has an active order' });
    }

    const orderResult = await pool.query(
      `INSERT INTO orders (table_number, waiter_id, session_id) 
       VALUES ($1, $2, $3) RETURNING *`,
      [tableNumber, waiterId, sessionId]
    );

    const order = orderResult.rows[0];
    let total = 0;

    for (const item of items) {
      await pool.query(
        `INSERT INTO order_items (order_id, item_name, quantity, price, added_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.name, item.quantity, item.price, waiterId]
      );
      total += item.price * item.quantity;
    }

    await pool.query(
      'UPDATE orders SET total_amount = $1 WHERE id = $2',
      [total, order.id]
    );

    const fullOrder = await pool.query(
      `SELECT o.*, w.name as waiter_name,
       json_agg(json_build_object(
         'id', oi.id,
         'name', oi.item_name,
         'quantity', oi.quantity,
         'price', oi.price,
         'status', oi.status,
         'added_at', oi.added_at
       )) as items
       FROM orders o
       JOIN waiters w ON o.waiter_id = w.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = $1
       GROUP BY o.id, w.name`,
      [order.id]
    );

    broadcast({ type: 'new_order', order: fullOrder.rows[0] });
    res.json(fullOrder.rows[0]);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/api/orders/active', async (req, res) => {
  const result = await pool.query(
    `SELECT o.*, w.name as waiter_name,
     json_agg(json_build_object(
       'id', oi.id,
       'name', oi.item_name,
       'quantity', oi.quantity,
       'price', oi.price,
       'status', oi.status,
       'added_at', oi.added_at
     ) ORDER BY oi.added_at) as items
     FROM orders o
     JOIN waiters w ON o.waiter_id = w.id
     LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.status IN ('active', 'ready')
     GROUP BY o.id, w.name
     ORDER BY o.created_at DESC`
  );
  res.json(result.rows);
});

app.get('/api/orders/:id', async (req, res) => {
  const result = await pool.query(
    `SELECT o.*, w.name as waiter_name,
     json_agg(json_build_object(
       'id', oi.id,
       'name', oi.item_name,
       'quantity', oi.quantity,
       'price', oi.price,
       'status', oi.status,
       'added_at', oi.added_at
     ) ORDER BY oi.added_at) as items
     FROM orders o
     JOIN waiters w ON o.waiter_id = w.id
     LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.id = $1
     GROUP BY o.id, w.name`,
    [req.params.id]
  );
  res.json(result.rows[0]);
});

app.post('/api/orders/:id/items', async (req, res) => {
  const { items, waiterId } = req.body;
  const orderId = req.params.id;

  let addedTotal = 0;

  for (const item of items) {
    await pool.query(
      `INSERT INTO order_items (order_id, item_name, quantity, price, added_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, item.name, item.quantity, item.price, waiterId]
    );
    addedTotal += item.price * item.quantity;
  }

  await pool.query(
    'UPDATE orders SET total_amount = total_amount + $1 WHERE id = $2',
    [addedTotal, orderId]
  );

  const order = await pool.query(
    `SELECT o.*, w.name as waiter_name,
     json_agg(json_build_object(
       'id', oi.id,
       'name', oi.item_name,
       'quantity', oi.quantity,
       'price', oi.price,
       'status', oi.status,
       'added_at', oi.added_at
     ) ORDER BY oi.added_at) as items
     FROM orders o
     JOIN waiters w ON o.waiter_id = w.id
     LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.id = $1
     GROUP BY o.id, w.name`,
    [orderId]
  );

  broadcast({ type: 'order_updated', order: order.rows[0] });
  res.json(order.rows[0]);
});

app.post('/api/orders/:id/cancel', async (req, res) => {
  const { reason, waiterId } = req.body;
  const orderId = req.params.id;

  await pool.query(
    'UPDATE orders SET status = $1 WHERE id = $2',
    ['cancelled', orderId]
  );

  await pool.query(
    'UPDATE order_items SET status = $1 WHERE order_id = $2',
    ['cancelled', orderId]
  );

  await pool.query(
    `INSERT INTO cancellations (order_id, reason, canceled_by, type)
     VALUES ($1, $2, $3, $4)`,
    [orderId, reason, waiterId, 'full_order']
  );

  const order = await pool.query(
    `SELECT o.*, w.name as waiter_name,
     json_agg(json_build_object(
       'id', oi.id,
       'name', oi.item_name,
       'quantity', oi.quantity,
       'price', oi.price,
       'status', oi.status,
       'added_at', oi.added_at
     ) ORDER BY oi.added_at) as items
     FROM orders o
     JOIN waiters w ON o.waiter_id = w.id
     LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.id = $1
     GROUP BY o.id, w.name`,
    [orderId]
  );

  broadcast({ type: 'order_cancelled', order: order.rows[0] });
  res.json(order.rows[0]);
});

app.post('/api/items/:id/cancel', async (req, res) => {
  const { reason, waiterId } = req.body;
  const itemId = req.params.id;

  const item = await pool.query(
    'SELECT * FROM order_items WHERE id = $1',
    [itemId]
  );

  if (!item.rows[0]) {
    return res.status(404).json({ error: 'Item not found' });
  }

  await pool.query(
    'UPDATE order_items SET status = $1 WHERE id = $2',
    ['cancelled', itemId]
  );

  const removedAmount = item.rows[0].price * item.rows[0].quantity;
  await pool.query(
    'UPDATE orders SET total_amount = total_amount - $1 WHERE id = $2',
    [removedAmount, item.rows[0].order_id]
  );

  await pool.query(
    `INSERT INTO cancellations (order_id, item_id, reason, canceled_by, type)
     VALUES ($1, $2, $3, $4, $5)`,
    [item.rows[0].order_id, itemId, reason, waiterId, 'item']
  );

  const order = await pool.query(
    `SELECT o.*, w.name as waiter_name,
     json_agg(json_build_object(
       'id', oi.id,
       'name', oi.item_name,
       'quantity', oi.quantity,
       'price', oi.price,
       'status', oi.status,
       'added_at', oi.added_at
     ) ORDER BY oi.added_at) as items
     FROM orders o
     JOIN waiters w ON o.waiter_id = w.id
     LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.id = $1
     GROUP BY o.id, w.name`,
    [item.rows[0].order_id]
  );

  broadcast({ type: 'item_cancelled', order: order.rows[0] });
  res.json(order.rows[0]);
});

app.post('/api/orders/:id/ready', async (req, res) => {
  const orderId = req.params.id;

  await pool.query(
    'UPDATE orders SET status = $1 WHERE id = $2',
    ['ready', orderId]
  );

  const order = await pool.query(
    `SELECT o.*, w.name as waiter_name,
     json_agg(json_build_object(
       'id', oi.id,
       'name', oi.item_name,
       'quantity', oi.quantity,
       'price', oi.price,
       'status', oi.status,
       'added_at', oi.added_at
     ) ORDER BY oi.added_at) as items
     FROM orders o
     JOIN waiters w ON o.waiter_id = w.id
     LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.id = $1
     GROUP BY o.id, w.name`,
    [orderId]
  );

  broadcast({ type: 'order_ready', order: order.rows[0] });
  res.json(order.rows[0]);
});

app.post('/api/orders/:id/pay', async (req, res) => {
  const orderId = req.params.id;

  await pool.query(
    'UPDATE orders SET status = $1, paid_at = CURRENT_TIMESTAMP WHERE id = $2',
    ['paid', orderId]
  );

  const order = await pool.query(
    `SELECT o.*, w.name as waiter_name,
     json_agg(json_build_object(
       'id', oi.id,
       'name', oi.item_name,
       'quantity', oi.quantity,
       'price', oi.price,
       'status', oi.status,
       'added_at', oi.added_at
     ) ORDER BY oi.added_at) as items
     FROM orders o
     JOIN waiters w ON o.waiter_id = w.id
     LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.id = $1
     GROUP BY o.id, w.name`,
    [orderId]
  );

  broadcast({ type: 'order_paid', order: order.rows[0] });
  res.json(order.rows[0]);
});

app.get('/api/kitchen/orders', async (req, res) => {
  const result = await pool.query(
    `SELECT o.*, 
     COALESCE(w1.name, w2.name) as waiter_name,
     json_agg(json_build_object(
       'id', oi.id,
       'name', oi.item_name,
       'quantity', oi.quantity,
       'price', oi.price,
       'status', oi.status,
       'added_at', oi.added_at
     ) ORDER BY oi.added_at) as items
     FROM orders o
     LEFT JOIN waiters w1 ON o.waiter_id = w1.id
     LEFT JOIN daily_sessions ds ON o.session_id = ds.id
     LEFT JOIN waiters w2 ON ds.waiter_id = w2.id
     LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.created_at >= CURRENT_DATE - INTERVAL '180 days'
     GROUP BY o.id, w1.name, w2.name
     ORDER BY o.created_at DESC`
  );
  res.json(result.rows);
});

app.get('/api/manager/stats', async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const orders = await pool.query(
    `SELECT o.*, 
     COALESCE(w1.name, w2.name) as waiter_name,
     json_agg(json_build_object(
       'id', oi.id,
       'name', oi.item_name,
       'quantity', oi.quantity,
       'price', oi.price,
       'status', oi.status,
       'added_at', oi.added_at
     ) ORDER BY oi.added_at) as items
     FROM orders o
     LEFT JOIN waiters w1 ON o.waiter_id = w1.id
     LEFT JOIN daily_sessions ds ON o.session_id = ds.id
     LEFT JOIN waiters w2 ON ds.waiter_id = w2.id
     LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY o.id, w1.name, w2.name
     ORDER BY o.created_at DESC`
  );

  const cancellations = await pool.query(
    `SELECT c.*, w.name as canceled_by_name, o.table_number
     FROM cancellations c
     JOIN waiters w ON c.canceled_by = w.id
     JOIN orders o ON c.order_id = o.id
     WHERE c.canceled_at >= CURRENT_DATE - INTERVAL '30 days'
     ORDER BY c.canceled_at DESC`
  );

  const totalCash = await pool.query(
    `SELECT COALESCE(SUM(total_amount), 0) as total
     FROM orders
     WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' AND status = 'paid'`
  );

  res.json({
    orders: orders.rows,
    cancellations: cancellations.rows,
    totalCash: totalCash.rows[0].total
  });
});

app.delete('/api/manager/orders/:id', async (req, res) => {
  const orderId = req.params.id;
  
  await pool.query('DELETE FROM cancellations WHERE order_id = $1', [orderId]);
  await pool.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
  await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
  
  broadcast({ type: 'order_deleted', orderId: orderId });
  res.json({ success: true });
});

app.get('/api/analytics/sales', async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period parameter' });
    }
    
    let query, params;
    if (period === 'weekly') {
      query = `
        SELECT 
          DATE_TRUNC('week', created_at) as period,
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount), 0) as total_sales
        FROM orders
        WHERE status = 'paid'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY period DESC
        LIMIT 30
      `;
    } else if (period === 'monthly') {
      query = `
        SELECT 
          DATE_TRUNC('month', created_at) as period,
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount), 0) as total_sales
        FROM orders
        WHERE status = 'paid'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY period DESC
        LIMIT 30
      `;
    } else {
      query = `
        SELECT 
          DATE(created_at) as period,
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount), 0) as total_sales
        FROM orders
        WHERE status = 'paid'
        GROUP BY DATE(created_at)
        ORDER BY period DESC
        LIMIT 30
      `;
    }

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Analytics sales error:', error);
    res.status(500).json({ error: 'Failed to fetch sales data' });
  }
});

app.get('/api/analytics/orders-vs-cancellations', async (req, res) => {
  const result = await pool.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) FILTER (WHERE status = 'paid') as completed_orders,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders
    FROM orders
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `);

  res.json(result.rows);
});

app.get('/api/analytics/top-dishes', async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    let intervalDays;
    switch(period) {
      case 'daily':
        intervalDays = 1;
        break;
      case '7days':
        intervalDays = 7;
        break;
      case '15days':
        intervalDays = 15;
        break;
      case '30days':
        intervalDays = 30;
        break;
      case 'monthly':
        intervalDays = 180;
        break;
      default:
        intervalDays = 30;
    }

    const result = await pool.query(`
      SELECT 
        oi.item_name,
        COUNT(*) as order_count,
        SUM(oi.quantity) as total_quantity,
        COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'paid' AND oi.status = 'active'
        AND o.created_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
      GROUP BY oi.item_name
      ORDER BY total_quantity DESC
      LIMIT 15
    `, [intervalDays]);

    res.json(result.rows);
  } catch (error) {
    console.error('Top dishes error:', error);
    res.status(500).json({ error: 'Failed to fetch top dishes' });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});
