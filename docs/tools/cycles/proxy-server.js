const http = require('http');
const https = require('https');
const url = require('url');

// Disable SSL certificate validation (only for development)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORT = 8080;
const TARGET_API = 'https://movercycles.fly.dev';

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Only allow POST to our endpoints
    if (req.method !== 'POST') {
        res.writeHead(405);
        res.end('Method not allowed');
        return;
    }
    
    // Parse request body
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        // Determine target endpoint
        let targetPath = '/cycles/generate';
        if (req.url.includes('/analysis')) {
            targetPath = '/cycles/generate/analysis';
        }
        
        const targetUrl = TARGET_API + targetPath;
        
        console.log(`[${new Date().toISOString()}] Proxy request to: ${targetUrl}`);
        console.log('Request body:', body);
        
        // Forward request to target API
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            },
            timeout: 180000 // 3 minutes
        };
        
        const proxyReq = https.request(targetUrl, options, (proxyRes) => {
            console.log(`Response status: ${proxyRes.statusCode}`);
            
            // Forward response headers
            res.writeHead(proxyRes.statusCode, {
                'Content-Type': proxyRes.headers['content-type'] || 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            
            // Forward response body
            proxyRes.pipe(res);
        });
        
        proxyReq.on('error', (error) => {
            console.error('Proxy error:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Proxy error: ' + error.message }));
        });
        
        proxyReq.on('timeout', () => {
            console.error('Request timeout');
            proxyReq.destroy();
            res.writeHead(504);
            res.end(JSON.stringify({ error: 'Request timeout' }));
        });
        
        // Send request body
        proxyReq.write(body);
        proxyReq.end();
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Proxy server running on http://localhost:${PORT}`);
    console.log(`   Forwarding requests to: ${TARGET_API}`);
    console.log(`   Use this in your app: http://localhost:${PORT}\n`);
});
