# Restaurant Order Management System

A comprehensive, real-time restaurant order management system built with modern web technologies. This full-stack application provides separate interfaces for waiters, kitchen staff, and managers, with real-time synchronization across all clients using WebSocket technology.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technical Architecture](#technical-architecture)
- [Security Implementation](#security-implementation)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Real-Time Updates](#real-time-updates)
- [Analytics and Reporting](#analytics-and-reporting)
- [Deployment](#deployment)
- [Technology Stack](#technology-stack)

## Overview

The Restaurant Order Management System is a production-ready application designed to streamline restaurant operations. It provides role-based access control with dedicated interfaces for waiters, kitchen staff, and management personnel. The system handles the complete order lifecycle from creation to payment, with real-time notifications and comprehensive analytics.

### System Capabilities

- Multi-role authentication system with encrypted credentials
- Real-time order synchronization across all connected clients
- Comprehensive order management with status tracking
- Kitchen display system with order prioritization
- Manager dashboard with business analytics
- Menu management with category organization
- Sales analytics with multiple time period views
- Mobile-responsive design for tablet and smartphone access

## Key Features

### Waiter Interface

The waiter interface provides a streamlined workflow for order management:

- **Table Management**: Visual grid display of all restaurant tables with occupancy status
- **Order Creation**: Interactive menu selection with quantity controls
- **Category Navigation**: Collapsible menu categories with search functionality
- **Order Modification**: Add items to existing orders with automatic price calculation
- **Order Status Tracking**: View orders by status (Pending, Processing, Ready, Completed, Cancelled)
- **Payment Processing**: Mark orders as paid with timestamp recording
- **Cancellation Management**: Cancel entire orders or individual items with reason tracking
- **Date Range Filtering**: View historical orders with flexible date range options

### Kitchen Interface

The kitchen display system optimizes food preparation workflow:

- **Order Queue Display**: Real-time display of all active orders
- **Priority Sorting**: Automatic sorting by order creation time
- **Visual Organization**: Color-coded status indicators for quick identification
- **Item Details**: Complete visibility of order items with quantities
- **Status Management**: Mark orders as ready when preparation is complete
- **Status Filtering**: Separate tabs for Pending, Processing, Ready, Completed, and Cancelled orders
- **Audio Notifications**: Sound alerts when orders are marked as ready
- **Date Range Views**: Historical order access for reference and review

### Manager Dashboard

The management interface provides comprehensive business oversight:

- **Business Statistics**: Real-time display of total cash, paid orders, and cancellations
- **Waiter Management**: Add, edit, and remove waiter accounts
- **Menu Management**: Complete CRUD operations for menu items and categories
- **Order Overview**: System-wide view of all orders with filtering capabilities
- **Cancellation Review**: Detailed view of cancelled orders with reasons
- **Order Deletion**: Administrative capability to remove orders from the system
- **Analytics Dashboard**: Multi-chart visualization of business metrics

### Analytics and Reporting

Comprehensive business intelligence features:

- **Sales Trend Analysis**: Line chart visualization with daily, weekly, and monthly aggregation
- **Order vs Cancellation Comparison**: Bar chart showing completed versus cancelled orders
- **Top Dishes Report**: Bar chart ranking of most popular menu items by quantity sold
- **Time Period Filtering**: Flexible date range selection for all analytics views
- **Revenue Calculation**: Automatic computation of total sales with currency formatting
- **Export-Ready Data**: JSON responses suitable for further processing or export

## Technical Architecture

### Frontend Architecture

The client-side application is built using React with functional components and hooks:

- **Component Structure**: Modular design with separate components for each user role
- **State Management**: React hooks (useState, useEffect, useCallback) for local state
- **Real-Time Communication**: WebSocket integration for bi-directional data flow
- **Responsive Design**: CSS media queries for mobile, tablet, and desktop layouts
- **Chart Rendering**: Custom HTML5 Canvas implementation for data visualization
- **Form Handling**: Controlled components with validation and error handling

### Backend Architecture

The server-side application follows RESTful principles with WebSocket augmentation:

- **HTTP Server**: Express.js framework for RESTful API endpoints
- **WebSocket Server**: ws library for real-time communication
- **Database Layer**: PostgreSQL with connection pooling
- **Authentication**: bcrypt-based password hashing with secure credential verification
- **Error Handling**: Comprehensive try-catch blocks with global error middleware
- **Input Validation**: Server-side validation for all user inputs
- **CORS Configuration**: Environment-based origin whitelisting

### Database Design

The system uses PostgreSQL with the following normalized schema:

**Tables:**
- `waiters`: User accounts with encrypted passwords
- `daily_sessions`: Session tracking for waiter shifts
- `orders`: Order records with status and financial information
- `order_items`: Individual items within orders with pricing
- `menu_items`: Restaurant menu with categories and pricing
- `cancellations`: Audit trail for cancelled orders and items

**Key Features:**
- Foreign key constraints for referential integrity
- Automatic timestamp generation
- Status tracking with CHECK constraints
- Aggregate functions for reporting queries

## Security Implementation

### Authentication and Authorization

- **Password Encryption**: All passwords hashed using bcrypt with 10 salt rounds
- **Secure Comparison**: Timing-attack resistant password verification
- **Role-Based Access**: Separate authentication endpoints for waiters and managers
- **Credential Validation**: Server-side validation of all authentication attempts

### Input Validation and Sanitization

- **Type Checking**: Strict validation of data types for all inputs
- **Range Validation**: Numeric bounds checking for quantities and prices
- **Required Field Validation**: Verification of mandatory fields
- **Array Validation**: Length and content validation for array inputs
- **SQL Injection Prevention**: Parameterized queries for all database operations

### Network Security

- **CORS Policy**: Configurable origin whitelisting via environment variables
- **Security Headers**: Implementation of X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- **HSTS**: Strict-Transport-Security header with one-year max-age
- **Body Size Limits**: 10MB maximum payload size to prevent memory exhaustion
- **WebSocket Origin Validation**: Connection rejection for unauthorized origins

### Error Handling

- **Global Error Middleware**: Catches unhandled errors throughout the application
- **Try-Catch Blocks**: Comprehensive error handling in all async operations
- **Error Logging**: Detailed server-side logging for debugging
- **Safe Error Messages**: Generic client-facing errors in production mode
- **Graceful Degradation**: Application continues functioning after non-critical errors

## Installation

### Prerequisites

- Node.js version 16.x or higher
- PostgreSQL version 12.x or higher
- npm or yarn package manager

### Installation Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd Method
```

2. Install dependencies:
```bash
npm install
```

3. Configure PostgreSQL:
```bash
createdb restaurant_orders
```

4. Set up environment variables (optional):
```bash
# Create .env file
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/restaurant_orders
ALLOWED_ORIGINS=http://localhost:3001
NODE_ENV=development
```

5. Start the server:
```bash
npm start
```

The application will be available at http://localhost:3001

## Configuration

### Environment Variables

- `PORT`: Server port number (default: 3001)
- `DATABASE_URL`: PostgreSQL connection string
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
- `NODE_ENV`: Environment mode (development/production)

### Database Configuration

The application automatically creates all required tables on first startup. The database connection pool is configured with the following settings:

- Connection pooling enabled for performance
- SSL support for remote database connections
- Automatic reconnection on connection loss

### Initial Data

On first startup, the system creates:
- Five waiter accounts (Raj, Priya, Amit, Anjali, Manager)
- Sample menu items across multiple categories
- All accounts use password "1234" (should be changed in production)

## Usage

### Accessing the Application

**Local Access:**
```
http://localhost:3001
```

**Network Access:**
Find your local IP address and access from other devices:
```
http://[YOUR_IP]:3001
```

### User Roles and Login

**Waiter Login:**
1. Select your name from the waiter list
2. Enter password: 1234
3. Access waiter interface

**Manager Login:**
1. Click "Manager" button
2. Enter password: 1234
3. Access manager dashboard

**Kitchen View:**
1. Click "Kitchen" button
2. No authentication required (display-only mode)

### Creating Orders

1. Select a table number from the grid
2. Search or browse menu items by category
3. Click items to add to order
4. Adjust quantities using + and - buttons
5. Review order summary
6. Click "Place Order" to submit

### Processing Orders

**Kitchen Staff:**
1. View incoming orders in real-time
2. Prepare items as listed
3. Click "Mark as Ready" when complete

**Waiters:**
1. Receive notification when order is ready
2. Deliver order to table
3. Click "Mark as Paid" after payment

### Managing Menu Items

**Managers Only:**
1. Navigate to "Manage Menu" tab
2. Click "Add Menu Item" to create new items
3. Click edit icon on existing items to modify
4. Click delete icon to remove items
5. Use search to find specific items
6. Expand/collapse categories for organization

## API Documentation

### Authentication Endpoints

**POST /api/auth/waiter**
- Authenticates waiter credentials
- Request body: `{ waiterId: number, password: string }`
- Response: `{ success: true, waiter: { id, name } }`

**POST /api/auth/manager**
- Authenticates manager credentials
- Request body: `{ password: string }`
- Response: `{ success: true }`

### Order Management Endpoints

**GET /api/orders/active**
- Retrieves all active orders for a waiter
- Query params: `?waiterId=<id>`
- Response: Array of order objects with items

**POST /api/orders**
- Creates a new order
- Request body: `{ tableNumber, items[], waiterId, sessionId }`
- Response: Created order object

**POST /api/orders/:id/items**
- Adds items to existing order
- Request body: `{ items[], waiterId }`
- Response: Updated order object

**POST /api/orders/:id/ready**
- Marks order as ready for pickup
- Response: Updated order object

**POST /api/orders/:id/pay**
- Records payment for order
- Response: Updated order object

**POST /api/orders/:id/cancel**
- Cancels entire order
- Request body: `{ reason: string, waiterId: number }`
- Response: Cancelled order object

**POST /api/items/:id/cancel**
- Cancels individual order item
- Request body: `{ reason: string, waiterId: number }`
- Response: Updated order object

### Kitchen Endpoints

**GET /api/kitchen/orders**
- Retrieves orders for kitchen display
- Returns orders from last 180 days
- Response: Array of orders with waiter information

### Manager Endpoints

**GET /api/waiters**
- Lists all waiter accounts
- Response: Array of waiter objects

**POST /api/manager/waiters**
- Creates new waiter account
- Request body: `{ name: string, pin: string }`
- Response: Created waiter object

**DELETE /api/manager/waiters/:id**
- Removes waiter account
- Response: `{ success: true }`

**GET /api/manager/orders**
- Retrieves all system orders with filtering
- Response: Array of orders

**GET /api/manager/stats**
- Returns business statistics
- Response: `{ totalCash, paidOrders, cancelledOrders }`

**GET /api/manager/cancellations**
- Lists all cancelled orders
- Response: Array of cancellation records

**DELETE /api/manager/orders/:id**
- Permanently deletes order
- Response: `{ success: true }`

### Menu Management Endpoints

**GET /api/menu**
- Retrieves available menu items
- Response: Array of menu items by category

**GET /api/manager/menu**
- Retrieves all menu items including unavailable
- Response: Array of all menu items

**POST /api/manager/menu**
- Creates new menu item
- Request body: `{ name: string, price: number, category: string }`
- Response: Created menu item object

**PUT /api/manager/menu/:id**
- Updates existing menu item
- Request body: `{ name, price, category, available }`
- Response: Updated menu item object

**DELETE /api/manager/menu/:id**
- Deletes menu item
- Response: `{ success: true }`

### Analytics Endpoints

**GET /api/analytics/sales**
- Returns sales data aggregated by time period
- Query params: `?period=daily|weekly|monthly`
- Response: Array of sales data with totals

**GET /api/analytics/orders-vs-cancellations**
- Compares completed and cancelled orders
- Query params: `?period=daily|7days|15days|30days|monthly`
- Response: Array of order counts by date

**GET /api/analytics/top-dishes**
- Returns most popular menu items
- Query params: `?period=daily|7days|15days|30days|monthly`
- Response: Array of dishes sorted by quantity sold

## Database Schema

### Waiters Table
```sql
CREATE TABLE waiters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  pin VARCHAR(6),
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  table_number INTEGER NOT NULL,
  waiter_id INTEGER REFERENCES waiters(id),
  session_id INTEGER REFERENCES daily_sessions(id),
  status VARCHAR(50) DEFAULT 'active',
  total_amount DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP
);
```

### Order Items Table
```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  added_by INTEGER REFERENCES waiters(id),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Menu Items Table
```sql
CREATE TABLE menu_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100),
  available BOOLEAN DEFAULT true
);
```

### Cancellations Table
```sql
CREATE TABLE cancellations (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  item_id INTEGER REFERENCES order_items(id),
  reason TEXT,
  canceled_by INTEGER REFERENCES waiters(id),
  type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Real-Time Updates

The system uses WebSocket technology for instant synchronization:

### Connection Establishment
- Client establishes WebSocket connection on page load
- Server maintains set of active client connections
- Origin validation ensures only authorized connections

### Broadcast Events

The following events trigger real-time updates to all connected clients:

- `new_order`: Order created
- `order_updated`: Items added to order
- `order_cancelled`: Order cancelled by waiter
- `item_cancelled`: Individual item cancelled
- `order_ready`: Kitchen marks order as ready
- `order_paid`: Payment processed
- `order_deleted`: Manager deletes order
- `waiter_added`: New waiter account created
- `waiter_deleted`: Waiter account removed
- `menu_updated`: Menu item added, edited, or deleted

### Event Handling

Each client component subscribes to relevant events:
- Waiter view: Reloads orders on order updates
- Kitchen view: Refreshes display on all order events
- Manager view: Updates statistics and lists on all events

### Connection Management

- Automatic reconnection on disconnect
- Graceful handling of connection errors
- Cleanup on client disconnect to prevent memory leaks

## Analytics and Reporting

### Sales Trend Analysis

Visualizes revenue patterns over time with three aggregation options:

**Daily View:**
- Shows individual day sales totals
- Displays up to 30 most recent days
- Useful for identifying daily patterns

**Weekly View:**
- Aggregates sales by week
- Groups by ISO week boundaries
- Ideal for weekly performance review

**Monthly View:**
- Summarizes sales by calendar month
- Shows long-term trends
- Useful for financial reporting

### Orders vs Cancellations

Comparative analysis of completed and cancelled orders:

**Time Period Options:**
- Today: Current day statistics
- Last 7 Days: Weekly performance
- Last 15 Days: Bi-weekly trends
- Last 30 Days: Monthly overview
- Last 6 Months: Long-term analysis

**Chart Features:**
- Dual-bar display for comparison
- Color-coded bars (green for completed, red for cancelled)
- Hover values for precise numbers
- Automatic scale adjustment

### Top Dishes in Demand

Identifies bestselling menu items by quantity:

**Metrics Displayed:**
- Total quantity sold
- Number of orders containing item
- Total revenue generated
- Rankings by popularity

**Filtering Options:**
- Daily: Today's bestsellers
- 7 Days: Weekly favorites
- 15 Days: Bi-weekly trends
- 30 Days: Monthly bestsellers
- 6 Months: Long-term favorites

### Chart Rendering Technology

Custom HTML5 Canvas implementation providing:
- High-performance rendering
- Smooth animations and transitions
- Responsive sizing for all screen sizes
- Professional gradient effects
- Interactive hover states
- Precise data point positioning

## Deployment

### Local Network Deployment

1. Find your computer's local IP address
2. Start the server
3. Access from other devices using: `http://[YOUR_IP]:3001`
4. Ensure firewall allows connections on port 3001

### Production Deployment

**Recommended Platforms:**
- Railway.app (configuration included)
- Heroku
- DigitalOcean
- AWS Elastic Beanstalk
- Google Cloud Platform

**Deployment Checklist:**
- Set NODE_ENV=production
- Configure DATABASE_URL environment variable
- Set ALLOWED_ORIGINS to your domain
- Enable SSL/TLS certificate
- Configure database backups
- Set up monitoring and logging

**Using Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway up
```

### Environment Configuration

**Production Environment Variables:**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
ALLOWED_ORIGINS=https://yourdomain.com
PORT=3001
```

**SSL/TLS Configuration:**
The application includes HSTS headers. For production:
- Use a reverse proxy (Nginx, Apache)
- Configure SSL certificate
- Redirect HTTP to HTTPS

## Technology Stack

### Frontend Technologies

- **React 18**: UI component library
- **Babel Standalone**: In-browser JSX transformation
- **HTML5 Canvas**: Chart rendering
- **CSS3**: Styling with flexbox and grid
- **WebSocket API**: Real-time communication
- **Fetch API**: HTTP requests

### Backend Technologies

- **Node.js**: JavaScript runtime environment
- **Express.js 4**: Web application framework
- **PostgreSQL**: Relational database
- **pg**: PostgreSQL client for Node.js
- **ws**: WebSocket server implementation
- **bcrypt**: Password hashing library
- **cors**: Cross-origin resource sharing middleware

### Development Tools

- **npm**: Package management
- **ES6 Modules**: Modern JavaScript module system
- **async/await**: Asynchronous code handling

### Design Patterns

- **MVC Architecture**: Separation of concerns
- **RESTful API**: Standard HTTP methods and status codes
- **WebSocket Protocol**: Bi-directional communication
- **Component-Based UI**: Reusable React components
- **Singleton Pattern**: Database connection pooling

## Performance Optimization

### Database Optimization

- Connection pooling for efficient resource usage
- Indexed foreign keys for fast joins
- Aggregate queries for analytics
- Prepared statements for query caching

### Frontend Optimization

- Component memoization where appropriate
- Efficient re-rendering with React hooks
- Canvas-based charts for performance
- Debounced search inputs
- Lazy loading of order history

### Network Optimization

- WebSocket for reduced HTTP overhead
- JSON data format for compact payloads
- Compression headers for text responses
- Static file caching

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

## License

This project is proprietary software. All rights reserved.

## Support

For technical support or bug reports, please contact the development team or review the security documentation in SECURITY_FIXES_APPLIED.md.

## Version History

**Version 1.0.0**
- Initial release
- Complete order management system
- Real-time WebSocket synchronization
- Comprehensive analytics dashboard
- Mobile-responsive design
- Production-ready security implementation
