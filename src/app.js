const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to DevOps Node.js Application!',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'devops-nodejs-app'
  });
});

app.get('/ready', (req, res) => {
  res.status(200).json({
    status: 'ready',
    message: 'Application is ready to accept requests'
  });
});

// API endpoints
app.get('/api/info', (req, res) => {
  res.json({
    name: 'DevOps Node.js App',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
});

app.post('/api/echo', (req, res) => {
  res.json({
    message: 'Echo endpoint',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Calculator endpoints for testing
app.get('/api/add/:a/:b', (req, res) => {
  const a = parseFloat(req.params.a);
  const b = parseFloat(req.params.b);
  
  if (isNaN(a) || isNaN(b)) {
    return res.status(400).json({ error: 'Invalid numbers provided' });
  }
  
  res.json({
    operation: 'addition',
    a: a,
    b: b,
    result: a + b
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

module.exports = app;
