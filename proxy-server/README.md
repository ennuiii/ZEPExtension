# ZEP API Proxy Server

A CORS proxy server that acts as a bridge between the Azure DevOps extension and the ZEP API to resolve browser CORS restrictions.

## Features

- ✅ **CORS Support**: Handles CORS issues when calling ZEP API from browser
- ✅ **Request Forwarding**: Forwards all requests to ZEP API with proper headers
- ✅ **Error Handling**: Comprehensive error handling with meaningful responses
- ✅ **Request Logging**: Detailed logging for debugging
- ✅ **Health Check**: Built-in health check endpoint
- ✅ **Flexible Configuration**: Support for multiple ZEP instances

## Quick Start

1. **Install dependencies:**
   ```bash
   cd proxy-server
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Configure your extension:**
   - In the ZEP extension settings, enable "Use Proxy"
   - Set proxy URL to: `https://zep-proxy-server.onrender.com/api/zep` (hosted version)
   - Or use `http://localhost:3000/api/zep` (local development)

## Configuration

### Environment Variables

Create a `.env` file in the proxy-server directory:

```bash
# Server Port (default: 3000)
PORT=3000

# Environment
NODE_ENV=development

# Optional: Default ZEP Base URL (can be overridden by extension)
ZEP_BASE_URL=https://your-zep-instance.com

# Optional: Request timeout in milliseconds
REQUEST_TIMEOUT=30000

# Optional: Enable debug logging
DEBUG=true
```

### Extension Configuration

The extension automatically sends the ZEP base URL as a header (`X-ZEP-Base-URL`) to the proxy server, so no additional configuration is needed.

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and configuration info.

### Proxy Endpoint
```
ALL /api/zep/*
```
Proxies all requests to the ZEP API. Examples:
- `GET /api/zep/attendances?ticket_id=123` → `GET {ZEP_BASE_URL}/api/v1/attendances?ticket_id=123`

## Development

### Development Mode
```bash
npm run dev
```
Uses nodemon for auto-restart on file changes.

### Production Mode
```bash
npm start
```

## Deployment

### Render.com Deployment

The proxy server is configured for easy deployment on Render.com:

1. **Fork this repository** to your GitHub account
2. **Connect to Render.com:**
   - Go to https://render.com and sign up/login
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the repository containing this proxy server

3. **Configure deployment:**
   - Name: `zep-proxy-server`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - The `render.yaml` file will handle the rest

4. **Deploy:**
   - Click "Create Web Service"
   - Render will automatically deploy your server
   - Your server will be available at `https://your-service-name.onrender.com`

5. **Update extension:**
   - Use your deployed URL in the extension settings
   - Example: `https://zep-proxy-server.onrender.com/api/zep`

### Production URL

The production proxy server is hosted at:
**https://zep-proxy-server.onrender.com**

- Health check: https://zep-proxy-server.onrender.com/health
- Proxy endpoint: https://zep-proxy-server.onrender.com/api/zep/*

## How It Works

1. **Extension Request**: The Azure DevOps extension sends a request to `http://localhost:3000/api/zep/attendances`
2. **Header Processing**: The proxy server reads the `X-ZEP-Base-URL` header from the extension
3. **Request Forwarding**: The proxy forwards the request to `{ZEP_BASE_URL}/api/v1/attendances`
4. **Response Handling**: The proxy returns the ZEP API response back to the extension
5. **CORS Handling**: The proxy adds appropriate CORS headers to allow browser access

## Troubleshooting

### Common Issues

**1. CORS errors still occurring**
- Ensure the proxy server is running on port 3000
- Check that the extension is configured to use proxy mode
- Verify the proxy URL is set correctly in extension settings

**2. Cannot connect to ZEP API**
- Check your ZEP base URL is correct
- Ensure your ZEP instance is accessible from the proxy server
- Verify your API credentials are valid

**3. Server won't start**
- Check if port 3000 is already in use
- Try a different port by setting `PORT=3001` in .env file
- Update the proxy URL in extension settings accordingly

### Debugging

Enable debug logging by setting `DEBUG=true` in your `.env` file. This will show:
- Incoming requests from the extension
- Outgoing requests to ZEP API
- Response status and headers
- Error details

### Testing

Test the proxy server directly:

```bash
# Health check
curl http://localhost:3000/health

# Test proxy (replace with your ZEP credentials)
curl -H "Authorization: Bearer YOUR_ZEP_TOKEN" \
     -H "X-ZEP-Base-URL: https://your-zep-instance.com" \
     "http://localhost:3000/api/zep/attendances?ticket_id=123"
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Azure DevOps    │    │ Proxy Server    │    │ ZEP API         │
│ Extension       │───▶│ (localhost:3000)│───▶│ (your-zep.com)  │
│ (Browser)       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

The proxy server eliminates CORS issues by:
- Running on localhost (same origin policy doesn't apply)
- Making server-to-server calls to ZEP API (no CORS restrictions)
- Adding proper CORS headers for browser requests

## License

MIT License 