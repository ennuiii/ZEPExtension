import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS to allow requests from Azure DevOps extension
app.use(cors({
  origin: [
    'https://dev.azure.com',
    'https://visualstudio.com',
    'https://tfs.visualstudio.com',
    'https://vsrm.visualstudio.com',
    'https://gopus.gallerycdn.vsassets.io',
    'https://gallerycdn.vsassets.io',
    'https://vsassets.io',
    'https://localhost:3000',
    'https://localhost:8080',
    'https://127.0.0.1:3000',
    'https://127.0.0.1:8080',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080'
  ],
  credentials: false, // Change to false as extension doesn't need credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-ZEP-Base-URL', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Request-ID'],
  optionsSuccessStatus: 200 // Ensure OPTIONS requests return 200
}));

// Additional CORS headers middleware for troubleshooting
app.use((req, res, next) => {
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, X-ZEP-Base-URL, Origin');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log('🔧 Handling CORS preflight request');
    return res.status(200).end();
  }
  
  next();
});

// Parse JSON bodies
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n🌐 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('📋 Query params:', req.query);
  console.log('🔑 Headers:', {
    authorization: req.headers.authorization ? 'Bearer ***' : 'none',
    'content-type': req.headers['content-type'],
    origin: req.headers.origin,
    'user-agent': req.headers['user-agent'],
    'x-zep-base-url': req.headers['x-zep-base-url'] || 'not provided'
  });
  console.log('🌍 Request from:', req.headers.origin || req.headers.referer || 'unknown');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ZEP API Proxy Server'
  });
});

// Simple test endpoint for Azure DevOps extension debugging
app.get('/api/test', (req, res) => {
  console.log('🧪 Test endpoint called from:', req.headers.origin || 'unknown');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, X-ZEP-Base-URL, Origin');
  
  res.json({
    success: true,
    message: 'Test endpoint working correctly',
    timestamp: new Date().toISOString(),
    requestHeaders: {
      origin: req.headers.origin,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer
    }
  });
});

// Main proxy endpoint for ZEP API
app.all('/api/zep/*', async (req, res) => {
  console.log('🎯 ZEP API Proxy Request Received!');
  console.log('📍 Request URL:', req.originalUrl);
  console.log('🔧 HTTP Method:', req.method);
  console.log('🌐 Origin:', req.headers.origin || 'unknown');
  console.log('🔑 Has Authorization from client:', !!req.headers.authorization);
  
  try {
    // Extract the ZEP API endpoint from the request path
    const zepEndpoint = req.path.replace('/api/zep', '');
    
    // Get credentials from environment variables (server-side config)
    const zepBaseUrl = process.env.ZEP_BASE_URL;
    const zepApiKey = process.env.ZEP_API_KEY;
    
    console.log('🔧 Server Configuration:');
    console.log('  ├─ ZEP Base URL:', zepBaseUrl || 'NOT SET');
    console.log('  └─ ZEP API Key:', zepApiKey ? `${zepApiKey.substring(0, 8)}...` : 'NOT SET');
    
    if (!zepBaseUrl) {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      return res.status(500).json({
        error: 'Server configuration error: ZEP_BASE_URL environment variable not set.'
      });
    }
    
    if (!zepApiKey) {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      return res.status(500).json({
        error: 'Server configuration error: ZEP_API_KEY environment variable not set.'
      });
    }

    // Construct the full ZEP API URL
    const zepApiUrl = `${zepBaseUrl}/api/v1${zepEndpoint}`;
    
    // Build query string if present
    const queryString = Object.keys(req.query).length > 0 
      ? '?' + new URLSearchParams(req.query).toString()
      : '';
    
    const fullUrl = `${zepApiUrl}${queryString}`;

    console.log(`🔗 Proxying to ZEP API: ${fullUrl}`);
    console.log(`📡 Method: ${req.method}`);
    console.log(`🎯 ZEP Endpoint: ${zepEndpoint}`);
    console.log(`🏢 ZEP Base URL: ${zepBaseUrl}`);
    console.log(`📝 Query String: ${queryString || 'none'}`);

    // Prepare headers for ZEP API request
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'ZEP-Proxy-Server/1.0',
      'Authorization': `Bearer ${zepApiKey}`
    };

    console.log('🔑 Using server-side API key for ZEP authentication');

    // Make the request to ZEP API
    const fetchOptions = {
      method: req.method,
      headers: headers,
      timeout: 30000 // 30 second timeout
    };

    // Add body for POST/PUT requests
    if (req.method === 'POST' || req.method === 'PUT') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(fullUrl, fetchOptions);
    
    console.log(`📊 ZEP API Response: ${response.status} ${response.statusText}`);
    console.log(`📏 Response size: ${response.headers.get('content-length') || 'unknown'} bytes`);
    console.log(`📦 Response type: ${response.headers.get('content-type') || 'unknown'}`);

    // Get response body
    const responseBody = await response.text();
    let jsonResponse;
    
    console.log(`📄 Raw response body (first 200 chars): ${responseBody.substring(0, 200)}${responseBody.length > 200 ? '...' : ''}`);
    
    try {
      jsonResponse = JSON.parse(responseBody);
      console.log(`📋 Parsed JSON response type: ${Array.isArray(jsonResponse) ? 'array' : typeof jsonResponse}`);
      if (Array.isArray(jsonResponse)) {
        console.log(`📊 Response array length: ${jsonResponse.length}`);
      } else if (jsonResponse && typeof jsonResponse === 'object') {
        console.log(`📊 Response object keys: ${Object.keys(jsonResponse).slice(0, 5).join(', ')}`);
      }
    } catch (e) {
      console.log(`⚠️ Response is not valid JSON, sending as text: ${e.message}`);
      jsonResponse = responseBody;
    }

    // Set response headers
    res.status(response.status);
    
    // Copy relevant headers from ZEP API response
    const headersToProxy = ['content-type', 'cache-control', 'expires'];
    headersToProxy.forEach(header => {
      if (response.headers.get(header)) {
        res.set(header, response.headers.get(header));
      }
    });

    // Set additional CORS headers for the response
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, X-ZEP-Base-URL, Origin');
    
    // Send response back to extension
    console.log('✅ Sending successful response back to extension');
    res.json(jsonResponse);

  } catch (error) {
    console.error('❌ Proxy Error:', error);
    console.error('🔍 Error details:', {
      name: error.name,
      code: error.code,
      message: error.message,
      cause: error.cause
    });
    
    // Set CORS headers for error responses
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, X-ZEP-Base-URL, Origin');
    
    // Handle different types of errors
    if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
      console.log('⏰ Request timeout error');
      return res.status(408).json({
        error: 'Request timeout - ZEP API did not respond within 30 seconds',
        details: error.message
      });
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.log('🔌 Connection error to ZEP API');
      return res.status(503).json({
        error: 'Cannot connect to ZEP API - check base URL and network connection',
        details: error.message
      });
    }
    
    // Generic error response
    console.log('💥 Generic proxy error');
    res.status(500).json({
      error: 'Proxy server error',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Handle 404 for other routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'This proxy server only handles /api/zep/* endpoints',
    availableEndpoints: ['/health', '/api/zep/*']
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('💥 Unhandled Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  const env = process.env.NODE_ENV || 'development';
  const baseUrl = env === 'production' ? process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}` : `http://localhost:${PORT}`;
  
  console.log(`🚀 ZEP Proxy Server running on ${baseUrl}`);
  console.log(`🌐 Health check: ${baseUrl}/health`);
  console.log(`📡 Proxy endpoint: ${baseUrl}/api/zep/*`);
  console.log(`📋 Environment: ${env}`);
  console.log(`🔧 Port: ${PORT}`);
  
  if (process.env.ZEP_BASE_URL) {
    console.log(`🔧 Default ZEP Base URL: ${process.env.ZEP_BASE_URL}`);
  } else {
    console.log(`⚠️  No default ZEP Base URL set. Extension must send X-ZEP-Base-URL header.`);
  }
  
  if (env === 'production') {
    console.log(`🌍 Production deployment ready for Azure DevOps extensions`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
}); 