const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API status
app.get('/api/v1/status', (req, res) => {
    res.json({ 
        service: 'NexGen-api',
        version: '1.0.0',
        status: 'running',
        environment: process.env.NODE_ENV || 'development'
    });
});

// API info
app.get('/api/v1/info', (req, res) => {
    res.json({
        name: 'NexGen API',
        version: '1.0.0',
        description: 'Backend API service',
        endpoints: [
            'GET /health',
            'GET /api/v1/status',
            'GET /api/v1/info',
            'GET /api/v1/users',
            'POST /api/v1/users'
        ]
    });
});

// Sample users data
const users = new Map();
let userIdCounter = 1;

// Get all users
app.get('/api/v1/users', (req, res) => {
    const allUsers = Array.from(users.values());
    res.json({ users: allUsers, count: allUsers.length });
});

// Get user by ID
app.get('/api/v1/users/:id', (req, res) => {
    const user = users.get(parseInt(req.params.id));
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
});

// Create user
app.post('/api/v1/users', (req, res) => {
    const { username, email } = req.body;
    if (!username || !email) {
        return res.status(400).json({ error: 'Username and email required' });
    }
    const id = userIdCounter++;
    const user = { id, username, email, createdAt: new Date().toISOString() };
    users.set(id, user);
    res.status(201).json(user);
});

// Update user
app.put('/api/v1/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const user = users.get(id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    const { username, email } = req.body;
    if (username) user.username = username;
    if (email) user.email = email;
    user.updatedAt = new Date().toISOString();
    users.set(id, user);
    res.json(user);
});

// Delete user
app.delete('/api/v1/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (!users.has(id)) {
        return res.status(404).json({ error: 'User not found' });
    }
    users.delete(id);
    res.status(204).send();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;