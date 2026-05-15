const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/v1/status', (req, res) => {
    res.json({ 
        service: 'NexGen-api',
        version: '1.0.0',
        status: 'running'
    });
});

app.listen(PORT, () => {
    process.stdout.write(`API server running on port ${PORT}\n`);
});
