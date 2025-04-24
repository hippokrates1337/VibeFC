# Testing Your Supabase Connection

This guide will help you verify that your backend is correctly connected to Supabase.

## Prerequisites

1. Make sure you have set up your `.env` file with the correct Supabase credentials:
   ```
   SUPABASE_URL="your-project-url"
   SUPABASE_KEY="your-service-key"
   ```

2. Ensure you have created the necessary tables in Supabase using the SQL script in `sql/create_variables_table.sql`.

## Installation with PowerShell Script

If you encounter execution policy issues on Windows, you can use the provided PowerShell script:

1. Edit the `install-deps.ps1` script if needed
2. Right-click on the script in File Explorer and select "Run with PowerShell"
3. Alternatively, open PowerShell as Administrator and run:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
   .\install-deps.ps1
   ```

## Running the Application with PowerShell Script

1. Edit the `run-app.ps1` script to set your Supabase environment variables
2. Right-click on the script in File Explorer and select "Run with PowerShell"
3. Alternatively, open PowerShell as Administrator and run:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
   .\run-app.ps1
   ```

## Automatic Connection Test

The backend automatically tests the Supabase connection when it starts up:

1. Check the logs for connection status:
   - Success: `Successfully connected to Supabase`
   - Failure: `Failed to connect to Supabase: [error message]`

## Health Check Endpoints

You can also verify the connection using the health check endpoints:

### General Health Check
```
GET http://localhost:3001/health
```

This will return:
```json
{
  "status": "ok",
  "timestamp": "2023-08-01T12:34:56.789Z"
}
```

### Supabase-specific Health Check
```
GET http://localhost:3001/health/supabase
```

Success response:
```json
{
  "status": "ok",
  "message": "Supabase connection successful",
  "timestamp": "2023-08-01T12:34:56.789Z"
}
```

Error response:
```json
{
  "status": "error",
  "message": "Supabase connection failed: [error details]",
  "timestamp": "2023-08-01T12:34:56.789Z"
}
```

## Common Connection Issues

1. **PowerShell Execution Policy**: If you see errors about script execution being disabled, use the provided PowerShell scripts with the appropriate execution policy settings.

2. **Invalid Credentials**: Double-check your Supabase URL and key in the `.env` file or in the `run-app.ps1` script.

3. **Table Not Found Error**: Ensure you've run the SQL script to create the necessary tables.

4. **Network Issues**: Verify your network connection and that Supabase isn't blocked by a firewall.

5. **Dependency Issues**: If you encounter module not found errors, try removing the `node_modules` directory and reinstalling dependencies with the `install-deps.ps1` script.

## Next Steps

Once you've confirmed your connection is working:

1. Test the `/data-intake/variables` endpoint to ensure data can be saved.
2. Set up authentication if required by your application.
3. Implement additional features using Supabase services. 