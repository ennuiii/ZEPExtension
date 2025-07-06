# ZEP Time Tracker - Simple Azure DevOps Extension

**✅ WORKING SIMPLE VERSION - Just a Button That Works!**

This extension adds a simple "Update Time from ZEP" button to Azure DevOps work items. No complex UI, no React, no TypeScript errors - just pure functionality.

## 🎯 What It Does

1. **Click the Button**: One button: "Update Time from ZEP"
2. **Enter Credentials**: Configure your ZEP API key and URL once
3. **Automatic Processing**: 
   - Reads `Custom.ZEPNummer` field from work item
   - Fetches time entries from ZEP API
   - Updates `CUSTOM.IST` field with total hours
   - Shows detailed results

## 🚀 Ready to Install

The extension is packaged and ready: **`GOpus.zep-time-tracker-browser-1.0.10.vsix`**

### Installation Steps:
1. Upload the `.vsix` file to Azure DevOps marketplace
2. Install in your organization
3. Open any work item with ZEP tickets
4. Find the "ZEP Time Tracking" section
5. Configure your credentials and click "Update Time from ZEP"

## 🔧 Configuration Required

### Azure DevOps Custom Fields
Your work items need these fields:
- **`Custom.ZEPNummer`**: Text field with comma-separated ZEP ticket IDs (e.g., "8136, 8403")  
- **`Custom.Ist`**: Decimal field that gets updated with total hours (matches your API calls)

### ZEP API Setup
- **API Key**: Your personal ZEP API token
- **Base URL**: Your ZEP instance URL (e.g., `https://your-company.zep.de`)

### CORS Configuration

**Option 1: Configure ZEP Server (Recommended)**
Ask your ZEP administrator to allow requests from Azure DevOps:
```
Access-Control-Allow-Origin: https://dev.azure.com
Access-Control-Allow-Methods: GET, POST, OPTIONS  
Access-Control-Allow-Headers: Authorization, Content-Type
```

**Option 2: Use Proxy Server (Alternative)**
If you cannot modify ZEP server CORS settings, use the included proxy server:

1. **Start the proxy server:**
   ```bash
   # Quick start (recommended)
   node start-proxy.js
   
   # Or manually
   cd proxy-server
   npm install
   npm start
   ```

2. **Configure extension to use proxy:**
   - In extension settings, enable "Use Proxy"
   - Set proxy URL to: `https://zep-proxy-server.onrender.com/api/zep`

3. **Keep proxy running** while using the extension

See [proxy-server/README.md](proxy-server/README.md) for detailed setup instructions.

## 🎮 How to Use

1. **Configure Extension**: Edit `ZEP_CONFIG` in the code with your credentials (one-time setup)
2. **Open Work Item**: Any work item with ZEP ticket IDs in `Custom.ZEPNummer`
3. **Click Button**: "Update Time from ZEP" - that's it!
4. **View Results**: See time entries table and updated duration

## 🔍 What You'll See

The extension shows:
- ✅ Real-time status updates during processing
- 📊 Table of all time entries found
- ⏱️ Total duration calculation  
- 🎯 Automatic work item field update
- ⚠️ Clear error messages with CORS guidance

## 📁 Simple Architecture

```
src/workitem-group/workitem-group.html
├── HTML form with credentials and button
├── Pure JavaScript (no frameworks)
├── Direct ZEP API calls
└── Azure DevOps SDK integration
```

No React, no TypeScript compilation, no webpack - just working code!

## 🛠️ Development

```bash
# Package the extension
npm run package:dev

# Upload to marketplace
# (Use Azure DevOps Publishing Portal)
```

## 🆘 Troubleshooting

### Common Issues:

**"No ZEP ticket IDs found"**
- Check that `Custom.ZEPNummer` field exists and has values like "8136, 8403"

**"CORS Error"** 
- **Option 1**: Configure ZEP server to allow requests from dev.azure.com (contact your ZEP administrator)
- **Option 2**: Use the proxy server (see CORS Configuration section above)
- **Option 3**: Use a CORS browser extension as a temporary workaround

**"Failed to update field"**
- Ensure `Custom.Ist` field exists and is numeric type
- Check you have edit permissions on the work item

**"API Error"**
- Verify your ZEP API key is valid
- Check the base URL format (https://your-company.zep.de)

## 🎯 Success Example

```
✅ Found 2 ticket ID(s): 8136, 8403
✅ Ticket 8136: 5 entries, 12.50 hours  
✅ Ticket 8403: 3 entries, 8.25 hours
✅ Successfully updated! Total: 20.75 hours from 8 entries
```

**That's it! Simple, working, reliable.** 🎉 