# ZEP Time Tracker Configuration Guide

## Overview

The ZEP Time Tracker extension for Azure DevOps now supports **organization-wide settings** that can be configured by administrators. This eliminates the need for hardcoded credentials and allows centralized management of ZEP API access.

## Recent Updates (Version 1.0.12)

✅ **Fixed SDK Loading Issues**: 
- Resolved "VSS is not defined" and "define is not a function" errors
- Updated to use modern Azure DevOps Extension SDK from CDN
- Improved error handling and initialization

## Configuration Options

### Organization-Wide Settings (Recommended)

This approach allows Collection Administrators to configure ZEP credentials once for the entire organization.

#### Setup Steps:

1. **Install the Extension**:
   - Upload the latest version (1.0.12) of the extension to your Azure DevOps organization
   - Ensure the extension is enabled for your organization

2. **Configure Settings (Collection Admin Only)**:
   - Navigate to **Admin Settings** (gear icon) in Azure DevOps
   - Go to **Extensions** in the left sidebar
   - Find **ZEP Time Tracker** and click on it
   - Click **Configure** or navigate to the settings page
   - Enter your organization's ZEP credentials:
     - **ZEP Base URL**: Your ZEP server URL (e.g., `https://company.zep.de`)
     - **ZEP API Key**: Organization-wide API token with read access to time entries

3. **Test Connection**:
   - Use the "Test Connection" button to verify the credentials
   - Ensure your ZEP server allows CORS requests from `dev.azure.com` domains

4. **Save Settings**:
   - Click "Save Settings" to store the configuration organization-wide
   - All users in the organization can now use the extension without individual setup

#### For End Users:

1. **Using the Extension**:
   - Open any work item in Azure DevOps
   - Look for the "ZEP Time Tracker" section in the work item form
   - Ensure the `Custom.ZEPNummer` field contains ZEP ticket IDs (format: "8136, 8403")
   - Click "Update Time from ZEP" to fetch and calculate total time
   - The extension will update the `Custom.Ist` field with the total hours

## Field Requirements

### Input Field: `Custom.ZEPNummer`
- **Purpose**: Contains ZEP ticket/project numbers
- **Format**: Comma-separated values (e.g., "8136, 8403, 8501")
- **Location**: Work item custom field
- **Required**: Yes, must contain valid ZEP ticket IDs

### Output Field: `Custom.Ist`  
- **Purpose**: Stores calculated total time from ZEP
- **Format**: Decimal number (hours)
- **Location**: Work item custom field
- **Updated**: Automatically by the extension

## ZEP API Requirements

### CORS Configuration
Your ZEP server must allow CORS requests from Azure DevOps domains:
- `https://dev.azure.com`
- `https://*.dev.azure.com`
- `https://*.visualstudio.com` (for older Azure DevOps instances)

### API Token Requirements
- Token must have **read access** to time entries
- Recommended: Create a dedicated service account for the integration
- Token should be long-lived to avoid frequent reconfiguration

### API Endpoint Usage
The extension calls the following ZEP API endpoints:
- `GET /api/v2/me` (for connection testing)
- `GET /api/v2/time-entries?ticket={ticketId}` (for fetching time entries)

## Troubleshooting

### Common Issues

1. **"ZEP configuration not found" Error**:
   - Ensure a Collection Administrator has configured the settings
   - Check that you have the correct permissions to access Extension Data

2. **CORS Errors**:
   - Contact your ZEP administrator to configure CORS
   - Ensure Azure DevOps domains are allowed in ZEP server configuration

3. **"No ZEP ticket numbers found" Warning**:
   - Verify the `Custom.ZEPNummer` field exists and contains data
   - Check the field format (comma-separated ticket IDs)

4. **Extension Not Loading**:
   - Clear browser cache and refresh the page
   - Ensure the extension is enabled for your organization
   - Check browser console for JavaScript errors

5. **Connection Test Failures**:
   - Verify the ZEP Base URL is correct and accessible
   - Check that the API token has proper permissions
   - Ensure ZEP server is configured for CORS

### Debug Information

The extension logs detailed information to the browser console:
1. Press `F12` to open browser developer tools
2. Go to the **Console** tab
3. Look for messages starting with `[INFO]`, `[SUCCESS]`, or `[ERROR]`

## Security Considerations

- **API Token Storage**: Credentials are stored securely using Azure DevOps Extension Data Service
- **Organization Scope**: Settings are scoped to the organization level
- **Access Control**: Only Collection Administrators can modify settings
- **Data Privacy**: The extension only reads time entry data, never writes to ZEP

## Legacy Configuration (Not Recommended)

### Option 2: Hardcoded Credentials (Deprecated as of v1.0.11)

This approach is no longer recommended but can be used if organization-wide settings are not suitable:

1. **Edit the Extension Files**:
   - Locate the `src/workitem-group/workitem-group.html` file
   - Find the `ZEP_CONFIG` object at the top of the script section
   - Replace with your actual credentials:

```javascript
const ZEP_CONFIG = {
    baseUrl: 'https://your-company.zep.de',
    apiKey: 'your_actual_zep_api_key_here'
};
```

2. **Repackage the Extension**:
   - Run `tfx extension create --manifest-globs vss-extension.json`
   - Upload the new `.vsix` file to your Azure DevOps organization

**⚠️ Warning**: Hardcoded credentials are less secure and harder to maintain. Use organization-wide settings instead.

## Support

For issues with the extension:
1. Check the troubleshooting section above
2. Review browser console logs for detailed error information
3. Verify ZEP server configuration and CORS settings
4. Contact your Azure DevOps or ZEP administrator for permissions issues

## Version History

- **v1.0.12**: Fixed SDK loading issues, improved error handling
- **v1.0.11**: Added organization-wide settings support
- **v1.0.10**: Simplified to single HTML file approach
- **v1.0.1-1.0.9**: Various React-based implementations (deprecated)
- **v1.0.0**: Initial release 