# GitHub Workflows - Keep Render Server Alive

This repository contains GitHub Actions workflows that automatically ping your Render server every 5 minutes to prevent it from going to sleep due to inactivity.

## Files Created

1. **`.github/workflows/keep-alive.yml`** - Main workflow that runs every 5 minutes
2. **`.github/workflows/keep-alive-backup.yml`** - Backup workflow that runs every 14 minutes

## Setup Instructions

### 1. Set Your Render URL

You have two options:

#### Option A: Use GitHub Secrets (Recommended)
1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Name: `RENDER_URL`
6. Value: Your full Render service URL (e.g., `https://your-app-name.onrender.com`)
7. Click **Add secret**

#### Option B: Edit the Workflow Files Directly
1. Open `.github/workflows/keep-alive.yml`
2. Replace `https://your-app-name.onrender.com` with your actual Render URL
3. Do the same for `.github/workflows/keep-alive-backup.yml`

### 2. Your Render URL Format
Make sure your Render URL follows this format:
```
https://your-app-name.onrender.com
```

### 3. Verify Your Health Endpoint
The workflows ping your `/api/health` endpoint. Based on your server code, this endpoint should return a 200 status code with a JSON response.

Your current health endpoint (from `server/server.js`):
```javascript
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Devsync API is running successfully',
    timestamp: new Date().toISOString()
  });
});
```

## How It Works

### Main Workflow (`keep-alive.yml`)
- Runs every 5 minutes using cron schedule: `*/5 * * * *`
- Sends a GET request to your `/api/health` endpoint
- If health check fails, tries the root URL as fallback
- Logs the response status

### Backup Workflow (`keep-alive-backup.yml`)
- Runs every 14 minutes as a backup: `*/14 * * * *`
- Includes retry logic (3 attempts with 10-second delays)
- Has a 30-second timeout per request
- Provides more detailed logging

## Manual Triggering

Both workflows can be manually triggered:
1. Go to your GitHub repository
2. Click the **Actions** tab
3. Select the workflow you want to run
4. Click **Run workflow**

## Monitoring

To check if the workflows are working:
1. Go to **Actions** tab in your GitHub repository
2. You should see the workflows running every 5 and 14 minutes
3. Click on any run to see the logs
4. Green checkmarks indicate successful pings

## Important Notes

### GitHub Actions Limitations
- **Minimum Interval**: GitHub Actions has a minimum cron interval of 5 minutes
- **Delays**: Scheduled workflows may have delays during high-traffic periods
- **Repository Activity**: Workflows may be disabled if the repository is inactive for 60+ days

### Render Free Tier
- Free Render services sleep after 15 minutes of inactivity
- These pings should keep your service awake 24/7
- Monitor your Render dashboard to ensure it's working

### Alternative Approaches
If GitHub Actions proves unreliable, consider:
1. **Uptime monitoring services** (UptimeRobot, Pingdom)
2. **External cron services** (cron-job.org)
3. **Upgrading to Render paid tier** (removes sleep limitation)

## Troubleshooting

### Workflow Not Running
1. Check if workflows are enabled in repository settings
2. Ensure the repository is public or you have GitHub Actions minutes
3. Check the Actions tab for any error messages

### Server Still Going to Sleep
1. Verify the RENDER_URL is correct
2. Check if your health endpoint is responding correctly
3. Consider adding more frequent backup pings
4. Monitor Render logs to see if requests are being received

### Failed Requests
1. Check your Render service status
2. Verify the health endpoint is accessible
3. Look at the workflow logs for specific error messages

## Example Log Output

Successful ping:
```
✅ Server is alive! Response code: 200
Ping completed at Sun Jun 22 10:15:32 UTC 2025
```

Failed ping with fallback:
```
⚠️ Server responded with code: 503
Root URL response code: 200
Ping completed at Sun Jun 22 10:15:32 UTC 2025
```
