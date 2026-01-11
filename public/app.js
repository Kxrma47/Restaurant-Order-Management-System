const { useState, useEffect, useCallback } = React;

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocal ? 'http://localhost:3001/api' : `${window.location.protocol}//${window.location.host}/api`;
const WS_URL = isLocal ? 'ws://localhost:3001' : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

const formatCurrency = (amount) => {
  return parseFloat(amount || 0).toLocaleString('en-IN', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 2 
  });
};

const formatNumber = (num) => {
  return parseInt(num || 0).toLocaleString('en-IN');
};

const playReadySound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
  
  setTimeout(() => {
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.frequency.value = 1000;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    osc2.start(audioContext.currentTime);
    osc2.stop(audioContext.currentTime + 0.5);
  }, 200);
};

function App() {
  const [view, setView] = useState('role-select');
  const [currentWaiter, setCurrentWaiter] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);

  const handleWaiterSelect = (waiter, session) => {
    setCurrentWaiter(waiter);
    setCurrentSession(session);
    setView('main');
  };

  const handleRoleSelect = (role) => {
    if (role === 'kitchen') {
      setView('kitchen');
    } else if (role === 'manager') {
      setView('manager-login');
    } else if (role === 'waiter') {
      setView('waiter-select');
    }
  };

  if (view === 'role-select') {
    return <RoleSelect onSelect={handleRoleSelect} />;
  }

  if (view === 'waiter-select') {
    return <WaiterSelect onSelect={handleWaiterSelect} onBack={() => setView('role-select')} />;
  }

  if (view === 'manager-login') {
    return <ManagerLogin onSuccess={() => setView('manager')} onBack={() => setView('role-select')} />;
  }

  if (view === 'main') {
    return <MainView 
      waiter={currentWaiter} 
      session={currentSession}
      onLogout={() => {
        setView('role-select');
        setCurrentWaiter(null);
        setCurrentSession(null);
      }}
      onViewChange={setView}
    />;
  }

  if (view === 'kitchen') {
    return <KitchenView onBack={() => setView('role-select')} />;
  }

  if (view === 'manager') {
    return <ManagerView onBack={() => setView('role-select')} />;
  }

  return null;
}

function RoleSelect({ onSelect }) {
  return (
    <div className="app">
      <div className="header">
        <h1>Restaurant Order System</h1>
      </div>
      <div className="login-container">
        <div style={{ maxWidth: '600px', width: '100%' }}>
          <h2 style={{ marginBottom: '40px', textAlign: 'center', fontSize: '28px' }}>Select Your Role</h2>
          <div className="grid grid-2" style={{ gap: '24px' }}>
            <button
              className="button button-large button-primary"
              onClick={() => onSelect('waiter')}
              style={{ padding: '48px 32px', fontSize: '24px' }}
            >
              Waiter
            </button>
            <button
              className="button button-large button-primary"
              onClick={() => onSelect('manager')}
              style={{ padding: '48px 32px', fontSize: '24px' }}
            >
              Manager
            </button>
            <button
              className="button button-large button-success"
              onClick={() => onSelect('kitchen')}
              style={{ padding: '48px 32px', fontSize: '24px', gridColumn: '1 / -1' }}
            >
              Kitchen Display
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WaiterSelect({ onSelect, onBack }) {
  const [waiters, setWaiters] = useState([]);
  const [selectedWaiter, setSelectedWaiter] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/waiters`)
      .then(r => r.json())
      .then(data => {
        setWaiters(data.filter(w => w.name.toLowerCase() !== 'manager'));
        setLoading(false);
      });
  }, []);

  const handleWaiterClick = (waiter) => {
    setSelectedWaiter(waiter);
    setPassword('');
    setError('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const authResponse = await fetch(`${API_URL}/auth/waiter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waiterId: selectedWaiter.id, password })
      });

      if (!authResponse.ok) {
        setError('Invalid password');
        setPassword('');
        return;
      }

      const sessionResponse = await fetch(`${API_URL}/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waiterId: selectedWaiter.id })
      });
      const session = await sessionResponse.json();
      onSelect(selectedWaiter, session);
    } catch (error) {
      setError('Authentication failed');
      setPassword('');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!selectedWaiter) {
    return (
      <div className="app">
        <div className="header">
          <h1>Select Waiter</h1>
          <button className="button" onClick={onBack}>Back</button>
        </div>
        <div className="content">
          <div className="grid grid-2">
            {waiters.map(waiter => (
              <button
                key={waiter.id}
                className="button button-large button-primary"
                onClick={() => handleWaiterClick(waiter)}
              >
                {waiter.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>Enter Password</h1>
        <button className="button" onClick={() => setSelectedWaiter(null)}>Back</button>
      </div>
      <div className="login-container">
        <div className="login-box">
          <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>{selectedWaiter.name}</h2>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              className="input pin-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="****"
              maxLength="4"
              autoFocus
            />
            {error && (
              <div style={{ color: '#d66f6f', textAlign: 'center', marginTop: '12px' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="button button-primary"
              style={{ width: '100%', marginTop: '24px' }}
              disabled={!password}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ManagerLogin({ onSuccess, onBack }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const authResponse = await fetch(`${API_URL}/auth/manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!authResponse.ok) {
        setError('Invalid password');
        setPassword('');
        return;
      }

      onSuccess();
    } catch (error) {
      setError('Authentication failed');
      setPassword('');
    }
  };

  return (
    <div className="app">
      <div className="header">
        <h1>Manager Login</h1>
        <button className="button" onClick={onBack}>Back</button>
      </div>
      <div className="login-container">
        <div className="login-box">
          <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Manager</h2>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              className="input pin-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="****"
              maxLength="4"
              autoFocus
            />
            {error && (
              <div style={{ color: '#d66f6f', textAlign: 'center', marginTop: '12px' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="button button-primary"
              style={{ width: '100%', marginTop: '24px' }}
              disabled={!password}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function MainView({ waiter, session, onLogout, onViewChange }) {
  const [allOrders, setAllOrders] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tables');
  const [dateFilter, setDateFilter] = useState('today');

  useEffect(() => {
    loadAllOrders();

    const ws = new WebSocket(WS_URL);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (['new_order', 'order_updated', 'order_cancelled', 'order_paid', 'order_ready', 'item_cancelled', 'order_deleted'].includes(data.type)) {
        if (data.type === 'order_ready') {
          playReadySound();
          alert(`Order for Table ${data.order.table_number} is ready!`);
        }
        loadAllOrders();
      }
    };

    return () => ws.close();
  }, []);

  const loadAllOrders = async () => {
    const response = await fetch(`${API_URL}/kitchen/orders`);
    const data = await response.json();
    setAllOrders(data);
  };

  const handleTableClick = (tableNumber) => {
    const existingOrder = activeOrders.find(o => o.table_number === tableNumber);
    setSelectedTable({ number: tableNumber, order: existingOrder });
    setShowOrderModal(true);
  };

  const filterByDate = (orders) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return orders.filter(o => {
      const orderDate = new Date(o.created_at);
      const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
      const diffTime = today - orderDay;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      switch(dateFilter) {
        case 'today':
          return diffDays === 0;
        case 'yesterday':
          return diffDays === 1;
        case 'last3':
          return diffDays <= 2;
        case 'last7':
          return diffDays <= 6;
        case 'last30':
          return diffDays <= 29;
        default:
          return true;
      }
    });
  };

  const getFilteredOrders = () => {
    let filtered;
    switch(activeTab) {
      case 'active':
        filtered = allOrders.filter(o => o.status === 'active');
        break;
      case 'ready':
        filtered = allOrders.filter(o => o.status === 'ready');
        break;
      case 'completed':
        filtered = allOrders.filter(o => o.status === 'paid');
        break;
      case 'cancelled':
        filtered = allOrders.filter(o => o.status === 'cancelled');
        break;
      default:
        filtered = allOrders.filter(o => o.status === 'active' || o.status === 'ready');
    }
    return filterByDate(filtered);
  };

  const activeOrders = allOrders.filter(o => o.status === 'active' || o.status === 'ready');
  const filteredOrders = getFilteredOrders();
  const dateFilteredOrders = filterByDate(allOrders);
  const activeCount = filterByDate(allOrders.filter(o => o.status === 'active')).length;
  const readyCount = filterByDate(allOrders.filter(o => o.status === 'ready')).length;
  const completedCount = filterByDate(allOrders.filter(o => o.status === 'paid')).length;
  const cancelledCount = filterByDate(allOrders.filter(o => o.status === 'cancelled')).length;
  const occupiedTables = activeOrders.map(o => o.table_number);

  const handleTableClickFromStatus = (order) => {
    setSelectedTable({ number: order.table_number, order: order });
    setShowOrderModal(true);
    setActiveTab('tables');
  };

  return (
    <div className="app">
      <div className="header">
        <h1>Order System</h1>
        <div className="header-info">
          <span>Waiter: <strong>{waiter.name}</strong></span>
          <span>{new Date().toLocaleDateString()}</span>
          <div className="nav-buttons">
            <button className="button" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </div>
      <div className="content">
        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ fontWeight: '600' }}>Filter:</label>
          <select 
            className="select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last3">Last 3 Days</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
          </select>
        </div>

        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'tables' ? 'active' : ''}`}
            onClick={() => setActiveTab('tables')}
          >
            Tables
          </button>
          <button 
            className={`tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Pending {activeCount > 0 && `(${formatNumber(activeCount)})`}
          </button>
          <button 
            className={`tab ${activeTab === 'ready' ? 'active' : ''}`}
            onClick={() => setActiveTab('ready')}
          >
            Ready {readyCount > 0 && `(${formatNumber(readyCount)})`}
          </button>
          <button 
            className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed {completedCount > 0 && `(${formatNumber(completedCount)})`}
          </button>
          <button 
            className={`tab ${activeTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled {cancelledCount > 0 && `(${formatNumber(cancelledCount)})`}
          </button>
        </div>

        {activeTab === 'tables' ? (
          <>
            <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>Select Table</h2>
            <div className="table-grid">
          {[...Array(20)].map((_, i) => {
            const tableNum = i + 1;
            const isOccupied = occupiedTables.includes(tableNum);
            return (
              <button
                key={tableNum}
                className={`table-btn ${isOccupied ? 'occupied' : ''}`}
                onClick={() => handleTableClick(tableNum)}
              >
                {tableNum}
              </button>
            );
          })}
            </div>
          </>
        ) : (
          <div style={{ marginTop: '20px' }}>
            {filteredOrders.length === 0 ? (
              <div className="loading">No {activeTab} orders</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {filteredOrders.map(order => (
                  <div 
                    key={order.id} 
                    className={`kitchen-order ${order.status}`}
                    onClick={() => handleTableClickFromStatus(order)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="kitchen-order-header">
                      <div>
                        <div className="kitchen-table">TABLE {order.table_number}</div>
                        <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
                          {order.waiter_name}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`status-badge status-${order.status}`}>
                          {order.status}
                        </span>
                        <div className="kitchen-time" style={{ marginTop: '8px' }}>
                          {new Date(order.created_at).toLocaleString().replace(/\d{4}/, '').replace(/,/, '')}
                        </div>
                        <div className="price" style={{ marginTop: '8px', fontSize: '20px', fontWeight: '700' }}>
                          ₽{formatCurrency(order.total_amount)}
                        </div>
                      </div>
                    </div>
                    <ul className="kitchen-items">
                      {order.items.map(item => (
                        <li 
                          key={item.id} 
                          className={`kitchen-item ${item.status === 'cancelled' ? 'cancelled' : ''}`}
                        >
                          <span>{item.name}</span>
                          <span style={{ fontWeight: '700' }}>x{item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showOrderModal && (
        <OrderModal
          table={selectedTable}
          waiter={waiter}
          session={session}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedTable(null);
            loadActiveOrders();
          }}
        />
      )}
    </div>
  );
}

function OrderModal({ table, waiter, session, onClose }) {
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [order, setOrder] = useState(table.order);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState({});

  useEffect(() => {
    fetch(`${API_URL}/menu`)
      .then(r => r.json())
      .then(items => {
        setMenuItems(items);
        const categories = [...new Set(items.map(item => item.category))];
        const initialCollapsed = {};
        categories.forEach(cat => {
          initialCollapsed[cat] = true;
        });
        setCollapsedCategories(initialCollapsed);
      });
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filteredBySearch = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const categoriesWithMatches = [...new Set(filteredBySearch.map(item => item.category))];
      const allCategories = [...new Set(menuItems.map(item => item.category))];
      
      const newCollapsed = {};
      allCategories.forEach(cat => {
        newCollapsed[cat] = !categoriesWithMatches.includes(cat);
      });
      setCollapsedCategories(newCollapsed);
    } else if (searchQuery === '' && menuItems.length > 0) {
      const allCategories = [...new Set(menuItems.map(item => item.category))];
      const newCollapsed = {};
      allCategories.forEach(cat => {
        newCollapsed[cat] = true;
      });
      setCollapsedCategories(newCollapsed);
    }
  }, [searchQuery, menuItems]);

  const toggleCategory = (category) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleQuantityChange = (item, delta) => {
    setSelectedItems(prev => {
      const current = prev[item.id] || 0;
      const newQty = Math.max(0, current + delta);
      if (newQty === 0) {
        const { [item.id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [item.id]: newQty };
    });
  };

  const handleSubmit = async () => {
    const items = Object.entries(selectedItems).map(([id, qty]) => {
      const menuItem = menuItems.find(m => m.id === parseInt(id));
      return {
        name: menuItem.name,
        quantity: qty,
        price: menuItem.price
      };
    });

    if (items.length === 0) return;

    if (order) {
      await fetch(`${API_URL}/orders/${order.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, waiterId: waiter.id })
      });
    } else {
      await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: table.number,
          items,
          waiterId: waiter.id,
          sessionId: session.id
        })
      });
    }

    setSelectedItems({});
    const response = await fetch(`${API_URL}/orders/active`);
    const orders = await response.json();
    const updatedOrder = orders.find(o => o.table_number === table.number);
    setOrder(updatedOrder);
  };

  const handlePay = async () => {
    await fetch(`${API_URL}/orders/${order.id}/pay`, { method: 'POST' });
    onClose();
  };

  const handleCancelItem = async (item) => {
    setCancelTarget({ type: 'item', item });
    setShowCancelModal(true);
  };

  const handleCancelOrder = () => {
    setCancelTarget({ type: 'order', order });
    setShowCancelModal(true);
  };

  const confirmCancel = async (reason) => {
    if (cancelTarget.type === 'item') {
      await fetch(`${API_URL}/items/${cancelTarget.item.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, waiterId: waiter.id })
      });
    } else {
      await fetch(`${API_URL}/orders/${cancelTarget.order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, waiterId: waiter.id })
      });
    }
    setShowCancelModal(false);
    setCancelTarget(null);

    if (cancelTarget.type === 'order') {
      onClose();
    } else {
      const response = await fetch(`${API_URL}/orders/${order.id}`);
      const updatedOrder = await response.json();
      setOrder(updatedOrder);
    }
  };

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedMenu = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const categoryOrder = ['Starter', 'Main', 'Bread', 'Side', 'Dessert', 'Drink'];
  const sortedCategories = Object.keys(groupedMenu).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  const total = order 
    ? order.items.filter(i => i.status === 'active').reduce((sum, i) => sum + (i.price * i.quantity), 0)
    : 0;

  return (
    <div className="modal">
      <div className="modal-content" style={{ maxWidth: '900px' }}>
        <div className="modal-title">Table {table.number}</div>

        {order && (
          <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '18px' }}>Current Order</h3>
              <div style={{ fontSize: '24px', fontWeight: '700' }} className="price">
                ₽{formatCurrency(total)}
              </div>
            </div>
            {order.items.map(item => (
              <div key={item.id} className={`order-item ${item.status}`}>
                <div>
                  <div style={{ fontWeight: '600' }}>{item.name} x{item.quantity}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    {new Date(item.added_at).toLocaleString().replace(/\d{4}/, '').replace(/,/, '')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span className="price">₽{formatCurrency(item.price * item.quantity)}</span>
                  {item.status === 'active' && (
                    <button 
                      className="button button-danger"
                      onClick={() => handleCancelItem(item)}
                      style={{ padding: '8px 16px' }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Add Items</h3>
          
          <div className="search-bar">
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Search for dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {sortedCategories.map(category => {
            const items = groupedMenu[category];
            const isCollapsed = collapsedCategories[category];
            
            return (
              <div key={category} style={{ marginBottom: '16px' }}>
                <div 
                  className="category-header"
                  onClick={() => toggleCategory(category)}
                >
                  <h4>{category}</h4>
                  <span className={`category-toggle ${isCollapsed ? 'collapsed' : ''}`}>
                    ▼
                  </span>
                </div>
                
                <div className={`category-content ${isCollapsed ? 'collapsed' : ''}`} style={{ maxHeight: isCollapsed ? '0' : '2000px' }}>
                  <div className="grid grid-2" style={{ marginBottom: '12px' }}>
                    {items.map(item => (
                      <div key={item.id} className={`menu-item ${selectedItems[item.id] ? 'selected' : ''}`}>
                        <div>
                          <div style={{ fontWeight: '600' }}>{item.name}</div>
                          <div className="price">₽{formatCurrency(item.price)}</div>
                        </div>
                        <div className="quantity-control">
                          <button 
                            className="quantity-btn"
                            onClick={() => handleQuantityChange(item, -1)}
                          >
                            -
                          </button>
                          <div className="quantity-value">{selectedItems[item.id] || 0}</div>
                          <button 
                            className="quantity-btn"
                            onClick={() => handleQuantityChange(item, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-actions">
          {Object.keys(selectedItems).length > 0 && (
            <button 
              className="button button-primary"
              onClick={handleSubmit}
              style={{ flex: 1 }}
            >
              {order ? 'Add Items' : 'Create Order'}
            </button>
          )}
          {order && (order.status === 'active' || order.status === 'ready') && (
            <>
              <button 
                className="button button-primary"
                onClick={handlePay}
                style={{ flex: 1 }}
              >
                Cash Received (₽{formatCurrency(total)})
              </button>
              <button 
                className="button button-danger"
                onClick={handleCancelOrder}
              >
                Cancel Order
              </button>
            </>
          )}
          <button className="button" onClick={onClose}>Close</button>
        </div>
      </div>

      {showCancelModal && (
        <CancelModal
          onConfirm={confirmCancel}
          onCancel={() => {
            setShowCancelModal(false);
            setCancelTarget(null);
          }}
        />
      )}
    </div>
  );
}

function CancelModal({ onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const predefinedReasons = [
    'Customer changed mind',
    'Kitchen mistake',
    'Item unavailable',
    'Wrong order entered',
    'Customer left'
  ];

  const handleConfirm = () => {
    const finalReason = reason === 'other' ? customReason : reason;
    if (finalReason) {
      onConfirm(finalReason);
    }
  };

  return (
    <div className="modal" style={{ zIndex: 1001 }}>
      <div className="modal-content">
        <div className="modal-title">Cancel Reason</div>
        <div className="form-group">
          <label className="form-label">Select Reason</label>
          <select 
            className="select"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="">Select reason...</option>
            {predefinedReasons.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
            <option value="other">Other (specify below)</option>
          </select>
        </div>
        {reason === 'other' && (
          <div className="form-group">
            <label className="form-label">Custom Reason</label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Enter reason..."
            />
          </div>
        )}
        <div className="modal-actions">
          <button 
            className="button button-danger"
            onClick={handleConfirm}
            disabled={!reason || (reason === 'other' && !customReason)}
            style={{ flex: 1 }}
          >
            Confirm Cancel
          </button>
          <button className="button" onClick={onCancel}>Back</button>
        </div>
      </div>
    </div>
  );
}

function KitchenView({ onBack }) {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [dateFilter, setDateFilter] = useState('today');

  useEffect(() => {
    loadOrders();

    const ws = new WebSocket(WS_URL);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (['new_order', 'order_updated', 'order_cancelled', 'order_paid', 'order_ready', 'item_cancelled', 'order_deleted'].includes(data.type)) {
        loadOrders();
      }
    };

    const interval = setInterval(loadOrders, 5000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);

  const loadOrders = async () => {
    const response = await fetch(`${API_URL}/kitchen/orders`);
    const data = await response.json();
    setOrders(data);
  };

  const handleMarkReady = async (orderId) => {
    await fetch(`${API_URL}/orders/${orderId}/ready`, { method: 'POST' });
    loadOrders();
  };

  const filterByDate = (ordersList) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return ordersList.filter(o => {
      const orderDate = new Date(o.created_at);
      const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
      const diffTime = today - orderDay;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      switch(dateFilter) {
        case 'today':
          return diffDays === 0;
        case 'yesterday':
          return diffDays === 1;
        case 'last3':
          return diffDays <= 2;
        case 'last7':
          return diffDays <= 6;
        case 'last30':
          return diffDays <= 29;
        default:
          return true;
      }
    });
  };

  const getFilteredOrders = () => {
    let filtered;
    switch(activeTab) {
      case 'active':
        filtered = orders.filter(o => o.status === 'active');
        break;
      case 'ready':
        filtered = orders.filter(o => o.status === 'ready');
        break;
      case 'completed':
        filtered = orders.filter(o => o.status === 'paid');
        break;
      case 'cancelled':
        filtered = orders.filter(o => o.status === 'cancelled');
        break;
      default:
        filtered = orders;
    }
    return filterByDate(filtered);
  };

  const filteredOrders = getFilteredOrders();
  const activeCount = filterByDate(orders.filter(o => o.status === 'active')).length;
  const readyCount = filterByDate(orders.filter(o => o.status === 'ready')).length;
  const completedCount = filterByDate(orders.filter(o => o.status === 'paid')).length;
  const cancelledCount = filterByDate(orders.filter(o => o.status === 'cancelled')).length;

  return (
    <div className="app">
      <div className="header">
        <h1>Kitchen Display</h1>
        <div className="header-info">
          <span>{new Date().toLocaleString()}</span>
          <button className="button" onClick={onBack}>Back</button>
        </div>
      </div>
      <div className="content">
        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ fontWeight: '600' }}>Filter:</label>
          <select 
            className="select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last3">Last 3 Days</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
          </select>
        </div>

        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Pending {activeCount > 0 && `(${formatNumber(activeCount)})`}
          </button>
          <button 
            className={`tab ${activeTab === 'ready' ? 'active' : ''}`}
            onClick={() => setActiveTab('ready')}
          >
            Ready {readyCount > 0 && `(${formatNumber(readyCount)})`}
          </button>
          <button 
            className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed {completedCount > 0 && `(${formatNumber(completedCount)})`}
          </button>
          <button 
            className={`tab ${activeTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled {cancelledCount > 0 && `(${formatNumber(cancelledCount)})`}
          </button>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="loading">No {activeTab} orders</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {filteredOrders.map(order => (
              <div key={order.id} className={`kitchen-order ${order.status}`}>
                <div className="kitchen-order-header">
                  <div>
                    <div className="kitchen-table">TABLE {order.table_number}</div>
                    <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
                      {order.waiter_name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`status-badge status-${order.status}`}>
                      {order.status}
                    </span>
                    <div className="kitchen-time" style={{ marginTop: '8px' }}>
                      {new Date(order.created_at).toLocaleString().replace(/\d{4}/, '').replace(/,/, '')}
                    </div>
                  </div>
                </div>
                <ul className="kitchen-items">
                  {order.items.map(item => {
                    const isNew = (new Date() - new Date(item.added_at)) < 30000;
                    return (
                      <li 
                        key={item.id} 
                        className={`kitchen-item ${item.status === 'cancelled' ? 'cancelled' : ''} ${isNew ? 'new' : ''}`}
                      >
                        <span>{item.name}</span>
                        <span style={{ fontWeight: '700' }}>x{item.quantity}</span>
                      </li>
                    );
                  })}
                </ul>
                {order.status === 'active' && (
                  <button
                    className="button button-success"
                    style={{ width: '100%', marginTop: '16px' }}
                    onClick={() => handleMarkReady(order.id)}
                  >
                    Mark Ready
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsView() {
  const [salesPeriod, setSalesPeriod] = useState('daily');
  const [ordersPeriod, setOrdersPeriod] = useState('15days');
  const [dishesPeriod, setDishesPeriod] = useState('30days');
  const [salesData, setSalesData] = useState([]);
  const [ordersData, setOrdersData] = useState([]);
  const [dishesData, setDishesData] = useState([]);

  useEffect(() => {
    loadSalesData();
  }, [salesPeriod]);

  useEffect(() => {
    loadOrdersData();
  }, []);

  useEffect(() => {
    loadDishesData();
  }, [dishesPeriod]);

  const loadSalesData = async () => {
    const response = await fetch(`${API_URL}/analytics/sales?period=${salesPeriod}`);
    const data = await response.json();
    setSalesData(data);
  };

  const loadOrdersData = async () => {
    const response = await fetch(`${API_URL}/analytics/orders-vs-cancellations`);
    const data = await response.json();
    setOrdersData(data);
  };

  const loadDishesData = async () => {
    const response = await fetch(`${API_URL}/analytics/top-dishes?period=${dishesPeriod}`);
    const data = await response.json();
    setDishesData(data);
  };

  const drawLineChart = (canvasId, data, labelKey, valueKey, color, label) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const leftPadding = 100;
    const rightPadding = 60;
    const topPadding = 70;
    const bottomPadding = 100;
    const chartWidth = width - leftPadding - rightPadding;
    const chartHeight = height - topPadding - bottomPadding;

    ctx.clearRect(0, 0, width, height);
    
    if (data.length === 0) {
      ctx.fillStyle = '#aaa';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', width / 2, height / 2);
      return;
    }

    const maxValue = Math.max(...data.map(d => parseFloat(d[valueKey]) || 0));
    const minValue = 0;
    const valueRange = maxValue - minValue || 1;
    const pointSpacing = chartWidth / (data.length - 1 || 1);

    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const y = height - bottomPadding - (i / ySteps) * chartHeight;
      const value = (i / ySteps) * maxValue;
      
      ctx.strokeStyle = i === 0 ? '#3a3a3a' : '#222';
      ctx.lineWidth = i === 0 ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(leftPadding, y);
      ctx.lineTo(width - rightPadding, y);
      ctx.stroke();

      ctx.fillStyle = '#aaa';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('₽' + formatCurrency(value), leftPadding - 15, y + 5);
    }

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;

    data.forEach((item, index) => {
      const value = parseFloat(item[valueKey]) || 0;
      const x = leftPadding + index * pointSpacing;
      const y = height - bottomPadding - ((value - minValue) / valueRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
    ctx.shadowBlur = 0;

    data.forEach((item, index) => {
      const value = parseFloat(item[valueKey]) || 0;
      const x = leftPadding + index * pointSpacing;
      const y = height - bottomPadding - ((value - minValue) / valueRange) * chartHeight;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#0a0a0a';
      ctx.lineWidth = 3;
      ctx.stroke();

      const showValueLabel = data.length <= 5 || index % 2 === 0;
      if (showValueLabel) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        const labelY = y < height / 2 ? y + 25 : y - 18;
        ctx.fillText('₽' + formatCurrency(value), x, labelY);
      }

      const labelFrequency = data.length > 7 ? 2 : 1;
      if (index % labelFrequency === 0 || index === data.length - 1) {
        let labelText = String(item[labelKey] || '');
        try {
          const dateObj = new Date(labelText);
          if (!isNaN(dateObj.getTime())) {
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            labelText = `${month}-${day}`;
          }
        } catch (e) {
          labelText = labelText.substring(0, 8);
        }
        ctx.fillStyle = '#999';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x, height - bottomPadding + 20);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText(labelText, 0, 0);
        ctx.restore();
      }
    });

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, width / 2, 35);

    ctx.fillStyle = '#aaa';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time Period', width / 2, height - 20);

    ctx.save();
    ctx.translate(30, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Revenue (₽)', 0, 0);
    ctx.restore();
  };

  const drawBarChart = (canvasId, data, labelKey, valueKey, color, label) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const leftPadding = 80;
    const rightPadding = 60;
    const topPadding = 80;
    const bottomPadding = 120;
    const chartWidth = width - leftPadding - rightPadding;
    const chartHeight = height - topPadding - bottomPadding;

    ctx.clearRect(0, 0, width, height);
    
    if (data.length === 0) {
      ctx.fillStyle = '#aaa';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', width / 2, height / 2);
      return;
    }

    const maxValue = Math.max(...data.map(d => parseFloat(d[valueKey]) || 0));
    const barWidth = chartWidth / data.length;

    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const y = height - bottomPadding - (i / ySteps) * chartHeight;
      const value = Math.round((i / ySteps) * maxValue);
      
      ctx.strokeStyle = i === 0 ? '#3a3a3a' : '#222';
      ctx.lineWidth = i === 0 ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(leftPadding, y);
      ctx.lineTo(width - rightPadding, y);
      ctx.stroke();

      ctx.fillStyle = '#aaa';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(value.toString(), leftPadding - 15, y + 5);
    }

    data.forEach((item, index) => {
      const value = parseFloat(item[valueKey]) || 0;
      const barHeight = (value / maxValue) * chartHeight;
      const x = leftPadding + index * barWidth;
      const y = height - bottomPadding - barHeight;

      const gradient = ctx.createLinearGradient(0, y, 0, height - bottomPadding);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '99');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x + barWidth * 0.2, y, barWidth * 0.6, barHeight);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(formatNumber(value), x + barWidth / 2, y - 10);

      const labelText = String(item[labelKey] || '').substring(0, 12);
      ctx.fillStyle = '#999';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(x + barWidth / 2, height - bottomPadding + 20);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(labelText, 0, 0);
      ctx.restore();
    });

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, width / 2, 40);

    ctx.fillStyle = '#aaa';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Dishes', width / 2, height - 20);

    ctx.save();
    ctx.translate(30, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Quantity Sold', 0, 0);
    ctx.restore();
  };

  useEffect(() => {
    if (salesData.length > 0) {
      drawLineChart('salesChart', salesData.slice(0, 10).reverse(), 'period', 'total_sales', '#3a7ca5', 'Sales Trend (₽)');
    }
  }, [salesData]);

  useEffect(() => {
    if (ordersData.length > 0) {
      const canvas = document.getElementById('ordersChart');
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      const leftPadding = 100;
      const rightPadding = 80;
      const topPadding = 80;
      const bottomPadding = 100;

      ctx.clearRect(0, 0, width, height);

      let dataSlice, chartTitle, dateFormat;
      switch(ordersPeriod) {
        case 'daily':
          dataSlice = ordersData.slice(0, 1);
          chartTitle = 'Orders vs Cancellations (Today)';
          dateFormat = (date) => `${date.getDate()}/${date.getMonth() + 1}`;
          break;
        case '7days':
          dataSlice = ordersData.slice(0, 7);
          chartTitle = 'Orders vs Cancellations (Last 7 Days)';
          dateFormat = (date) => `${date.getDate()}/${date.getMonth() + 1}`;
          break;
        case '15days':
          dataSlice = ordersData.slice(0, 15);
          chartTitle = 'Orders vs Cancellations (Last 15 Days)';
          dateFormat = (date) => `${date.getDate()}/${date.getMonth() + 1}`;
          break;
        case '30days':
          dataSlice = ordersData.slice(0, 30);
          chartTitle = 'Orders vs Cancellations (Last 30 Days)';
          dateFormat = (date) => `${date.getDate()}/${date.getMonth() + 1}`;
          break;
        case 'monthly':
          const monthlyData = {};
          ordersData.forEach(item => {
            const date = new Date(item.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = {
                date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`,
                completed_orders: 0,
                cancelled_orders: 0,
                month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              };
            }
            monthlyData[monthKey].completed_orders += item.completed_orders || 0;
            monthlyData[monthKey].cancelled_orders += item.cancelled_orders || 0;
          });
          dataSlice = Object.values(monthlyData).slice(0, 6);
          chartTitle = 'Orders vs Cancellations (Last 6 Months)';
          dateFormat = (date, item) => item.month;
          break;
        default:
          dataSlice = ordersData.slice(0, 15);
          chartTitle = 'Orders vs Cancellations (Last 15 Days)';
          dateFormat = (date) => `${date.getDate()}/${date.getMonth() + 1}`;
      }

      const data = dataSlice.reverse();
      const maxValue = Math.max(
        ...data.map(d => Math.max(d.completed_orders || 0, d.cancelled_orders || 0))
      );
      const barWidth = (width - leftPadding - rightPadding) / data.length / 2;
      const chartHeight = height - bottomPadding - topPadding;

      const ySteps = 5;
      for (let i = 0; i <= ySteps; i++) {
        const y = height - bottomPadding - (i / ySteps) * chartHeight;
        const value = Math.round((i / ySteps) * maxValue);
        
        ctx.strokeStyle = i === 0 ? '#3a3a3a' : '#222';
        ctx.lineWidth = i === 0 ? 1.5 : 0.5;
        ctx.beginPath();
        ctx.moveTo(leftPadding, y);
        ctx.lineTo(width - rightPadding, y);
        ctx.stroke();

        ctx.fillStyle = '#aaa';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(value.toString(), leftPadding - 15, y + 5);
      }

      data.forEach((item, index) => {
        const x = leftPadding + index * (barWidth * 2);
        const completedHeight = ((item.completed_orders || 0) / maxValue) * chartHeight;
        const cancelledHeight = ((item.cancelled_orders || 0) / maxValue) * chartHeight;

        const completedGradient = ctx.createLinearGradient(0, height - bottomPadding - completedHeight, 0, height - bottomPadding);
        completedGradient.addColorStop(0, '#4a7c5a');
        completedGradient.addColorStop(1, '#2a5a2a');
        ctx.fillStyle = completedGradient;
        ctx.fillRect(x + 5, height - bottomPadding - completedHeight, barWidth - 10, completedHeight);

        const cancelledGradient = ctx.createLinearGradient(0, height - bottomPadding - cancelledHeight, 0, height - bottomPadding);
        cancelledGradient.addColorStop(0, '#aa4a4a');
        cancelledGradient.addColorStop(1, '#8a2a2a');
        ctx.fillStyle = cancelledGradient;
        ctx.fillRect(x + barWidth + 5, height - bottomPadding - cancelledHeight, barWidth - 10, cancelledHeight);

        if (completedHeight > 20) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(item.completed_orders || 0, x + barWidth / 2, height - bottomPadding - completedHeight - 8);
        }
        if (cancelledHeight > 20) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(item.cancelled_orders || 0, x + barWidth * 1.5, height - bottomPadding - cancelledHeight - 8);
        }

        const date = new Date(item.date);
        const dateLabel = ordersPeriod === 'monthly' ? dateFormat(date, item) : dateFormat(date);
        ctx.fillStyle = '#999';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(dateLabel, x + barWidth, height - bottomPadding + 25);
      });

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(chartTitle, width / 2, 40);

      ctx.fillStyle = '#aaa';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ordersPeriod === 'monthly' ? 'Month' : 'Date', width / 2, height - 20);

      ctx.save();
      ctx.translate(30, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('Number of Orders', 0, 0);
      ctx.restore();

      ctx.fillStyle = '#4a7c5a';
      ctx.fillRect(width - 220, 50, 20, 20);
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Completed', width - 195, 65);

      ctx.fillStyle = '#aa4a4a';
      ctx.fillRect(width - 100, 50, 20, 20);
      ctx.fillStyle = '#fff';
      ctx.fillText('Cancelled', width - 75, 65);
    }
  }, [ordersData, ordersPeriod]);

  useEffect(() => {
    if (dishesData.length > 0) {
      let chartTitle;
      switch(dishesPeriod) {
        case 'daily':
          chartTitle = 'Top 10 Dishes by Quantity (Today)';
          break;
        case '7days':
          chartTitle = 'Top 10 Dishes by Quantity (Last 7 Days)';
          break;
        case '15days':
          chartTitle = 'Top 10 Dishes by Quantity (Last 15 Days)';
          break;
        case '30days':
          chartTitle = 'Top 10 Dishes by Quantity (Last 30 Days)';
          break;
        case 'monthly':
          chartTitle = 'Top 10 Dishes by Quantity (Last 6 Months)';
          break;
        default:
          chartTitle = 'Top 10 Dishes by Quantity';
      }
      drawBarChart('dishesChart', dishesData.slice(0, 10), 'item_name', 'total_quantity', '#6fd66f', chartTitle);
    }
  }, [dishesData, dishesPeriod]);

  return (
    <div>
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 className="card-title">Sales Trend</h3>
        <div style={{ marginBottom: '16px' }}>
          <select 
            className="select"
            value={salesPeriod}
            onChange={(e) => setSalesPeriod(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <canvas id="salesChart" width="1000" height="400" style={{ maxWidth: '100%', height: 'auto' }}></canvas>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 className="card-title">Orders vs Cancellations</h3>
        <div style={{ marginBottom: '16px' }}>
          <select 
            className="select"
            value={ordersPeriod}
            onChange={(e) => setOrdersPeriod(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="daily">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="15days">Last 15 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="monthly">Monthly (Last 6 Months)</option>
          </select>
        </div>
        <canvas id="ordersChart" width="1000" height="450" style={{ maxWidth: '100%', height: 'auto' }}></canvas>
      </div>

      <div className="card">
        <h3 className="card-title">Top Dishes in Demand</h3>
        <div style={{ marginBottom: '16px' }}>
          <select 
            className="select"
            value={dishesPeriod}
            onChange={(e) => setDishesPeriod(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="daily">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="15days">Last 15 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="monthly">Last 6 Months</option>
          </select>
        </div>
        <canvas id="dishesChart" width="1000" height="400" style={{ maxWidth: '100%', height: 'auto' }}></canvas>
        <div style={{ marginTop: '20px' }}>
          {dishesData.slice(0, 10).map((dish, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #2a2a2a' }}>
              <span>{index + 1}. {dish.item_name}</span>
              <span>
                <strong>{formatNumber(dish.total_quantity)}</strong> orders · 
                <span className="price"> ₽{formatCurrency(dish.total_revenue)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ManagerView({ onBack }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [orderStatusTab, setOrderStatusTab] = useState('all');
  const [stats, setStats] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateFilter, setDateFilter] = useState('today');
  const [waiters, setWaiters] = useState([]);
  const [showAddWaiter, setShowAddWaiter] = useState(false);
  const [newWaiterName, setNewWaiterName] = useState('');
  const [newWaiterPin, setNewWaiterPin] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [menuForm, setMenuForm] = useState({ name: '', price: '', category: 'Main' });
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [collapsedMenuCategories, setCollapsedMenuCategories] = useState({});
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    loadStats();
    if (activeTab === 'waiters') {
      loadWaiters();
    }
    if (activeTab === 'menu') {
      loadMenuItems();
    }

    const ws = new WebSocket(WS_URL);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (['new_order', 'order_updated', 'order_cancelled', 'order_paid', 'order_ready', 'item_cancelled', 'order_deleted'].includes(data.type)) {
        loadStats();
      }
      if (['waiter_added', 'waiter_deleted'].includes(data.type) && activeTab === 'waiters') {
        loadWaiters();
      }
      if (data.type === 'menu_updated' && activeTab === 'menu') {
        loadMenuItems();
      }
    };

    return () => ws.close();
  }, [selectedDate, activeTab]);

  const loadStats = async () => {
    const response = await fetch(`${API_URL}/manager/stats?date=${selectedDate}`);
    const data = await response.json();
    setStats(data);
  };

  const loadWaiters = async () => {
    const response = await fetch(`${API_URL}/waiters`);
    const data = await response.json();
    setWaiters(data);
  };

  const loadMenuItems = async () => {
    const response = await fetch(`${API_URL}/manager/menu`);
    const data = await response.json();
    setMenuItems(data);
    
    const categories = [...new Set(data.map(item => item.category))];
    const initialCollapsed = {};
    categories.forEach(cat => {
      initialCollapsed[cat] = true;
    });
    setCollapsedMenuCategories(initialCollapsed);
  };

  const toggleMenuCategory = (category) => {
    setCollapsedMenuCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getFilteredMenuItems = () => {
    if (!menuSearchQuery.trim()) return menuItems;
    return menuItems.filter(item =>
      item.name.toLowerCase().includes(menuSearchQuery.toLowerCase())
    );
  };

  const handleAddMenuItem = () => {
    setEditingMenuItem(null);
    setMenuForm({ name: '', price: '', category: 'Main' });
    setIsAddingNewCategory(false);
    setNewCategoryName('');
    setShowMenuModal(true);
  };

  const handleEditMenuItem = (item) => {
    setEditingMenuItem(item);
    setMenuForm({ name: item.name, price: item.price, category: item.category });
    setIsAddingNewCategory(false);
    setNewCategoryName('');
    setShowMenuModal(true);
  };

  const handleSaveMenuItem = async (e) => {
    e.preventDefault();
    
    const finalCategory = isAddingNewCategory && newCategoryName.trim() 
      ? newCategoryName.trim() 
      : menuForm.category;
    
    const itemData = {
      ...menuForm,
      category: finalCategory
    };
    
    if (editingMenuItem) {
      await fetch(`${API_URL}/manager/menu/${editingMenuItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
    } else {
      await fetch(`${API_URL}/manager/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
    }
    setShowMenuModal(false);
    setMenuForm({ name: '', price: '', category: 'Main' });
    setIsAddingNewCategory(false);
    setNewCategoryName('');
    loadMenuItems();
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (confirm('Are you sure you want to delete this menu item?')) {
      await fetch(`${API_URL}/manager/menu/${itemId}`, { method: 'DELETE' });
      loadMenuItems();
    }
  };

  const handleDelete = async (orderId) => {
    if (confirm('Are you sure you want to delete this order?')) {
      await fetch(`${API_URL}/manager/orders/${orderId}`, { method: 'DELETE' });
      loadStats();
    }
  };

  const handleDeleteWaiter = async (waiterId) => {
    if (confirm('Are you sure you want to delete this waiter?')) {
      await fetch(`${API_URL}/manager/waiters/${waiterId}`, { method: 'DELETE' });
      loadWaiters();
    }
  };

  const handleAddWaiter = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/manager/waiters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newWaiterName, pin: newWaiterPin })
    });
    setNewWaiterName('');
    setNewWaiterPin('');
    setShowAddWaiter(false);
    loadWaiters();
  };

  if (!stats) {
    return <div className="loading">Loading...</div>;
  }

  const filterByDate = (ordersList) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return ordersList.filter(o => {
      const orderDate = new Date(o.created_at);
      const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
      const diffTime = today - orderDay;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      switch(dateFilter) {
        case 'today':
          return diffDays === 0;
        case 'yesterday':
          return diffDays === 1;
        case 'last3':
          return diffDays <= 2;
        case 'last7':
          return diffDays <= 6;
        case 'last30':
          return diffDays <= 29;
        default:
          return true;
      }
    });
  };

  const getFilteredManagerOrders = () => {
    let filtered;
    switch(orderStatusTab) {
      case 'active':
        filtered = stats.orders.filter(o => o.status === 'active');
        break;
      case 'ready':
        filtered = stats.orders.filter(o => o.status === 'ready');
        break;
      case 'completed':
        filtered = stats.orders.filter(o => o.status === 'paid');
        break;
      case 'cancelled':
        filtered = stats.orders.filter(o => o.status === 'cancelled');
        break;
      default:
        filtered = stats.orders;
    }
    return filterByDate(filtered);
  };

  const paidOrders = filterByDate(stats.orders.filter(o => o.status === 'paid'));
  const cancelledOrders = filterByDate(stats.orders.filter(o => o.status === 'cancelled'));
  const activeOrdersCount = filterByDate(stats.orders.filter(o => o.status === 'active')).length;
  const readyOrdersCount = filterByDate(stats.orders.filter(o => o.status === 'ready')).length;
  const filteredManagerOrders = getFilteredManagerOrders();
  const totalCash = paidOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

  return (
    <div className="app">
      <div className="header">
        <h1>Manager Dashboard</h1>
        <div className="header-info">
          <select 
            className="select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last3">Last 3 Days</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
          </select>
          <button className="button" onClick={onBack}>Back</button>
        </div>
      </div>
      <div className="content">
        <div className="grid grid-3" style={{ marginBottom: '30px' }}>
          <div className="stat-card">
            <div className="stat-value">₽{formatCurrency(totalCash)}</div>
            <div className="stat-label">Total Cash</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatNumber(paidOrders.length)}</div>
            <div className="stat-label">Paid Orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatNumber(cancelledOrders.length)}</div>
            <div className="stat-label">Cancelled Orders</div>
          </div>
        </div>

        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            All Orders
          </button>
          <button 
            className={`tab ${activeTab === 'cancellations' ? 'active' : ''}`}
            onClick={() => setActiveTab('cancellations')}
          >
            Cancellations
          </button>
          <button 
            className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button 
            className={`tab ${activeTab === 'waiters' ? 'active' : ''}`}
            onClick={() => setActiveTab('waiters')}
          >
            Manage Waiters
          </button>
          <button 
            className={`tab ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            Manage Menu
          </button>
        </div>

        {activeTab === 'overview' && (
          <div>
            <div className="tabs" style={{ marginBottom: '20px', borderTop: '1px solid #2a2a2a', paddingTop: '12px' }}>
              <button 
                className={`tab ${orderStatusTab === 'all' ? 'active' : ''}`}
                onClick={() => setOrderStatusTab('all')}
              >
                All ({formatNumber(filterByDate(stats.orders).length)})
              </button>
              <button 
                className={`tab ${orderStatusTab === 'active' ? 'active' : ''}`}
                onClick={() => setOrderStatusTab('active')}
              >
                Pending {activeOrdersCount > 0 && `(${formatNumber(activeOrdersCount)})`}
              </button>
              <button 
                className={`tab ${orderStatusTab === 'ready' ? 'active' : ''}`}
                onClick={() => setOrderStatusTab('ready')}
              >
                Ready {readyOrdersCount > 0 && `(${formatNumber(readyOrdersCount)})`}
              </button>
              <button 
                className={`tab ${orderStatusTab === 'completed' ? 'active' : ''}`}
                onClick={() => setOrderStatusTab('completed')}
              >
                Completed ({formatNumber(paidOrders.length)})
              </button>
              <button 
                className={`tab ${orderStatusTab === 'cancelled' ? 'active' : ''}`}
                onClick={() => setOrderStatusTab('cancelled')}
              >
                Cancelled ({formatNumber(cancelledOrders.length)})
              </button>
            </div>
            {filteredManagerOrders.map(order => (
              <div key={order.id} className="card" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '700' }}>Table {order.table_number}</div>
                    <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
                      {order.waiter_name} · {new Date(order.created_at).toLocaleString().replace(/\d{4}/, '').replace(/,/, '')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`status-badge status-${order.status}`}>
                      {order.status}
                    </span>
                    <div style={{ marginTop: '8px', fontSize: '24px', fontWeight: '700' }} className="price">
                      ₽{formatCurrency(order.total_amount)}
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '12px' }}>
                  {order.items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className={item.status === 'cancelled' ? 'status-cancelled' : ''}>
                        {item.name} x{item.quantity}
                      </span>
                      <span className="price">₽{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '12px' }}>
                  <button 
                    className="button button-danger"
                    onClick={() => handleDelete(order.id)}
                    style={{ padding: '8px 16px', fontSize: '14px' }}
                  >
                    Delete Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'cancellations' && (
          <div>
            {stats.cancellations.map(cancel => (
              <div key={cancel.id} className="card" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontWeight: '600' }}>Table {cancel.table_number}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    {new Date(cancel.canceled_at).toLocaleString().replace(/\d{4}/, '').replace(/,/, '')}
                  </div>
                </div>
                <div style={{ marginBottom: '8px', color: '#aaa' }}>
                  Cancelled by: {cancel.canceled_by_name}
                </div>
                <div style={{ fontSize: '14px' }}>
                  <strong>Reason:</strong> {cancel.reason}
                </div>
              </div>
            ))}
            {stats.cancellations.length === 0 && (
              <div className="loading">No cancellations</div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView />
        )}

        {activeTab === 'waiters' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <button
                className="button button-primary"
                onClick={() => setShowAddWaiter(!showAddWaiter)}
              >
                {showAddWaiter ? 'Cancel' : 'Add New Waiter'}
              </button>
            </div>

            {showAddWaiter && (
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '16px' }}>Add New Waiter</h3>
                <form onSubmit={handleAddWaiter}>
                  <div className="form-group">
                    <label className="form-label">Waiter Name</label>
                    <input
                      type="text"
                      className="input"
                      value={newWaiterName}
                      onChange={(e) => setNewWaiterName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Token/PIN (4-6 digits)</label>
                    <input
                      type="text"
                      className="input"
                      value={newWaiterPin}
                      onChange={(e) => setNewWaiterPin(e.target.value)}
                      maxLength="6"
                      required
                    />
                  </div>
                  <button type="submit" className="button button-primary">
                    Create Waiter
                  </button>
                </form>
              </div>
            )}

            {waiters.map(waiter => (
              <div key={waiter.id} className="card" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '700' }}>{waiter.name}</div>
                    <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
                      Token: {waiter.pin}
                    </div>
                  </div>
                  <button
                    className="button button-danger"
                    onClick={() => handleDeleteWaiter(waiter.id)}
                    style={{ padding: '8px 16px', fontSize: '14px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'menu' && (
          <div>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className="button button-primary"
                onClick={handleAddMenuItem}
              >
                Add New Menu Item
              </button>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="🔍 Search menu items..."
                  value={menuSearchQuery}
                  onChange={(e) => {
                    setMenuSearchQuery(e.target.value);
                    if (e.target.value.trim()) {
                      const filtered = menuItems.filter(item =>
                        item.name.toLowerCase().includes(e.target.value.toLowerCase())
                      );
                      const matchingCategories = [...new Set(filtered.map(item => item.category))];
                      const allCategories = [...new Set(menuItems.map(item => item.category))];
                      const newCollapsed = {};
                      allCategories.forEach(cat => {
                        newCollapsed[cat] = !matchingCategories.includes(cat);
                      });
                      setCollapsedMenuCategories(newCollapsed);
                    }
                  }}
                />
              </div>
            </div>

            {[...new Set(menuItems.map(item => item.category))].sort().map(category => {
              const filteredItems = getFilteredMenuItems();
              const categoryItems = filteredItems.filter(item => item.category === category);
              if (categoryItems.length === 0) return null;
              
              const isCollapsed = collapsedMenuCategories[category];
              
              return (
                <div key={category} style={{ marginBottom: '16px' }}>
                  <div 
                    className="category-header"
                    onClick={() => toggleMenuCategory(category)}
                  >
                    <h4 style={{ fontSize: '16px', margin: 0, textTransform: 'uppercase', color: '#aaa' }}>
                      {category} ({categoryItems.length})
                    </h4>
                    <span className={`category-toggle ${isCollapsed ? 'collapsed' : ''}`}>
                      ▼
                    </span>
                  </div>
                  
                  <div className={`category-content ${isCollapsed ? 'collapsed' : ''}`} style={{ maxHeight: isCollapsed ? '0' : '5000px' }}>
                    <div style={{ paddingTop: '12px' }}>
                      {categoryItems.map(item => (
                        <div key={item.id} className="card" style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              <div style={{ fontSize: '18px', fontWeight: '600' }}>{item.name}</div>
                              <div className="price" style={{ fontSize: '16px', marginTop: '4px' }}>
                                ₽{formatCurrency(item.price)}
                              </div>
                              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                                {item.available ? '✓ Available' : '✗ Not Available'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              <button
                                className="button button-primary"
                                onClick={() => handleEditMenuItem(item)}
                                style={{ padding: '8px 16px', fontSize: '14px' }}
                              >
                                Edit
                              </button>
                              <button
                                className="button button-danger"
                                onClick={() => handleDeleteMenuItem(item.id)}
                                style={{ padding: '8px 16px', fontSize: '14px' }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {showMenuModal && (
              <div className="modal">
                <div className="modal-content">
                  <div className="modal-title">
                    {editingMenuItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                  </div>
                  <form onSubmit={handleSaveMenuItem}>
                    <div className="form-group">
                      <label className="form-label">Item Name</label>
                      <input
                        type="text"
                        className="input"
                        value={menuForm.name}
                        onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Price (₽)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        value={menuForm.price}
                        onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      {!isAddingNewCategory ? (
                        <>
                          <select
                            className="select"
                            value={menuForm.category}
                            onChange={(e) => {
                              if (e.target.value === '__ADD_NEW__') {
                                setIsAddingNewCategory(true);
                              } else {
                                setMenuForm({ ...menuForm, category: e.target.value });
                              }
                            }}
                            required
                          >
                            {[...new Set(menuItems.map(item => item.category))].sort().map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="__ADD_NEW__">+ Add New Category</option>
                          </select>
                        </>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="input"
                            placeholder="Enter new category name..."
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            required
                            autoFocus
                          />
                          <button
                            type="button"
                            className="button"
                            onClick={() => {
                              setIsAddingNewCategory(false);
                              setNewCategoryName('');
                            }}
                            style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="modal-actions">
                      <button type="submit" className="button button-primary" style={{ flex: 1 }}>
                        {editingMenuItem ? 'Save Changes' : 'Add Item'}
                      </button>
                      <button
                        type="button"
                        className="button"
                        onClick={() => setShowMenuModal(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
