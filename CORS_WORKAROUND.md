# ZEP Time Tracker - CORS Workaround Guide

## 🚨 CORS Error? Here's How to Fix It

If you're seeing a "CORS Error" when trying to connect to ZEP, here are simple solutions:

### Option 1: Disable CORS in Browser (Temporary)
**For Chrome/Edge:**
1. Close all browser windows
2. Create a shortcut to Chrome/Edge with this flag: `--disable-web-security --user-data-dir="C:/temp/chrome-cors"`
3. Use this browser instance only for Azure DevOps + ZEP work

**For Firefox:**
1. Type `about:config` in address bar
2. Search for `security.tls.insecure_fallback_hosts`
3. Add your ZEP domain (e.g., `your-company.zep.de`)

### Option 2: Browser Extension (Recommended)
Install a CORS extension like:
- **CORS Unblock** (Chrome/Edge)
- **CORS Everywhere** (Firefox)

**Steps:**
1. Install the extension
2. Enable it only when using ZEP Time Tracker
3. Disable it when done for security

### Option 3: Contact Your ZEP Administrator
Ask them to add these domains to ZEP's CORS whitelist:
```
https://dev.azure.com
https://*.dev.azure.com
https://*.visualstudio.com
```

### Option 4: Use ZEP's Web Interface
If all else fails:
1. Open ZEP in another tab
2. Manually copy time data
3. Enter it into Azure DevOps Custom.IST field

## 🔒 Security Note
Remember to re-enable CORS protection after using the extension!

## 📞 Need Help?
Contact your IT administrator or ZEP support for permanent CORS configuration. 