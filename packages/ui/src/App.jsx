import React, { useState, useEffect } from 'react';

function App() {
    const [status, setStatus] = useState(null);

    useEffect(() => {
        fetch('/api/v1/status')
            .then(res => res.json())
            .then(data => setStatus(data))
            .catch(err => process.stderr.write(String(err) + '\n'));
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>NexGen</h1>
            <p>Welcome to your application.</p>
            {status && (
                <div>
                    <h2>API Status</h2>
                    <pre>{JSON.stringify(status, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}

export default App;
