const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ============ KONFIGURACIJA ============
const config = {
    version: '1.0.0',
    rateLimit: {
        windowMs: parseInt(process.env.RATE_WINDOW_MS) || 60000,
        maxRequests: parseInt(process.env.RATE_MAX_REQUESTS) || 100,
        enabled: process.env.RATE_LIMIT_ENABLED !== 'false'
    },
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: process.env.CORS_CREDENTIALS === 'true'
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json'
    },
    security: {
        helmetEnabled: process.env.HELMET_ENABLED !== 'false',
        cspEnabled: process.env.CSP_ENABLED !== 'false'
    },
    compression: {
        enabled: process.env.COMPRESSION_ENABLED !== 'false'
    },
    cache: {
        maxAge: parseInt(process.env.CACHE_MAX_AGE) || 3600
    }
};

// JSON middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    const requestId = Math.random().toString(36).substring(2, 15);
    req.requestId = requestId;
    res.on('finish', () => {
        const duration = Date.now() - start;
        const log = {
            requestId,
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: duration + 'ms',
            ip: req.ip
        };
        console.log(JSON.stringify(log));
    });
    next();
});

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', config.cors.origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
    res.header('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Rate limiting
const requestCounts = new Map();
if (config.rateLimit.enabled) {
    setInterval(() => requestCounts.clear(), config.rateLimit.windowMs);
    app.use((req, res, next) => {
        const key = req.ip || 'unknown';
        const count = requestCounts.get(key) || 0;
        if (count >= config.rateLimit.maxRequests) {
            return res.status(429).json({ error: 'Too many requests' });
        }
        requestCounts.set(key, count + 1);
        res.set('X-RateLimit-Limit', config.rateLimit.maxRequests);
        res.set('X-RateLimit-Remaining', config.rateLimit.maxRequests - count - 1);
        next();
    });
}

// Metrics
const metrics = { requests: 0, errors: 0, byStatus: {}, byEndpoint: {} };

// ============ API ROUTES ============

// Health check
app.get('/health', (req, res) => {
    metrics.requests++;
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        requestId: req.requestId
    });
});

// API status
app.get('/api/v1/status', (req, res) => {
    metrics.requests++;
    res.json({ 
        service: 'NexGen-api',
        version: config.version,
        status: 'running',
        environment: process.env.NODE_ENV || 'development'
    });
});

// API info
app.get('/api/v1/info', (req, res) => {
    metrics.requests++;
    res.json({
        name: 'NexGen API',
        version: config.version,
        description: 'Backend API service',
        endpoints: [
            'GET /health',
            'GET /api/v1/status',
            'GET /api/v1/info',
            'GET /api/v1/config',
            'PUT /api/v1/config',
            'GET /api/v1/users',
            'POST /api/v1/users',
            'GET /api/v1/users/:id',
            'PUT /api/v1/users/:id',
            'DELETE /api/v1/users/:id',
            'GET /api/v1/metrics',
            'GET /api/v1/env'
        ]
    });
});

// Config endpoint
app.get('/api/v1/config', (req, res) => {
    metrics.requests++;
    res.json({
        version: config.version,
        rateLimit: config.rateLimit,
        cors: config.cors,
        logging: config.logging,
        security: config.security,
        compression: config.compression,
        cache: config.cache
    });
});

// Update config at runtime
app.put('/api/v1/config', (req, res) => {
    metrics.requests++;
    const { rateLimit, logging, security } = req.body;
    if (rateLimit) {
        if (rateLimit.maxRequests) config.rateLimit.maxRequests = rateLimit.maxRequests;
        if (rateLimit.enabled !== undefined) config.rateLimit.enabled = rateLimit.enabled;
    }
    if (logging && logging.level) config.logging.level = logging.level;
    if (security) Object.assign(config.security, security);
    res.json({ success: true, config: config });
});

// Environment variables (non-sensitive)
app.get('/api/v1/env', (req, res) => {
    metrics.requests++;
    res.json({
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || 3000,
        RATE_LIMIT_ENABLED: config.rateLimit.enabled,
        LOG_LEVEL: config.logging.level
    });
});

// Metrics
app.get('/api/v1/metrics', (req, res) => {
    metrics.requests++;
    res.json({
        uptime: process.uptime(),
        requests: metrics.requests,
        errors: metrics.errors,
        memory: process.memoryUsage(),
        config: config
    });
});

// Users data
const users = new Map();
let userIdCounter = 1;

// Get all users
app.get('/api/v1/users', (req, res) => {
    metrics.requests++;
    const allUsers = Array.from(users.values());
    res.json({ users: allUsers, count: allUsers.length });
});

// Get user by ID
app.get('/api/v1/users/:id', (req, res) => {
    metrics.requests++;
    const user = users.get(parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

// Create user
app.post('/api/v1/users', (req, res) => {
    metrics.requests++;
    const { username, email } = req.body;
    if (!username || !email) {
        return res.status(400).json({ error: 'Username and email required' });
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ error: 'Invalid username format' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    const id = userIdCounter++;
    const user = { id, username, email, createdAt: new Date().toISOString() };
    users.set(id, user);
    res.status(201).json(user);
});

// Update user
app.put('/api/v1/users/:id', (req, res) => {
    metrics.requests++;
    const id = parseInt(req.params.id);
    const user = users.get(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { username, email } = req.body;
    if (username) user.username = username;
    if (email) user.email = email;
    user.updatedAt = new Date().toISOString();
    users.set(id, user);
    res.json(user);
});

// Delete user
app.delete('/api/v1/users/:id', (req, res) => {
    metrics.requests++;
    const id = parseInt(req.params.id);
    if (!users.has(id)) return res.status(404).json({ error: 'User not found' });
    users.delete(id);
    res.status(204).send();
});

// Error handling
app.use((err, req, res, next) => {
    metrics.errors++;
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler - serve UI
app.use((req, res) => {
    const uiPath = path.join(__dirname, '../../ui');
    if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
        return res.sendFile(path.join(uiPath, 'index.html'));
    }
    res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(JSON.stringify({ type: 'server', port: PORT, version: config.version, environment: process.env.NODE_ENV || 'development' }));
});

module.exports = app;
