# Deployment Guide

This project uses GitHub Actions for automated deployment to a VPS server.

## GitHub Actions Workflows

### 🔧 Available Workflows

1. **Lint Workflow** (`.github/workflows/lint.yml`)
   - Runs on: `push` and `pull_request` to `main` and `develop` branches
   - Checks: ESLint rules and code quality
   - Status: ✅ Ready

2. **Test Workflow** (`.github/workflows/test.yml`)
   - Runs on: `push` and `pull_request` to `main` and `develop` branches
   - Tests: TypeScript compilation, unit tests, and build process
   - Status: ✅ Ready

3. **Deploy Workflow** (`.github/workflows/deploy.yml`)
   - Runs on: `push` to `main` branch and manual trigger (`workflow_dispatch`)
   - Actions: Build, test, deploy to VPS, health check, rollback on failure
   - Status: ✅ Ready

## Required GitHub Secrets

To enable deployment, add these secrets in your GitHub repository settings:

```
DEPLOY_SSH_KEY          # Private SSH key for VPS access
VPS_HOST               # VPS hostname or IP address
VPS_USER               # VPS username
DEPLOY_PATH            # Deployment path on VPS (e.g., /home/user/api.oluwasetemi.dev)
APP_URL                # Application URL for health checks (e.g., https://api.oluwasetemi.dev)
```

## VPS Requirements

### Prerequisites on VPS:
- **Node.js** (version 22+)
- **pnpm** (package manager)
- **PM2** (process manager)
- **SSH access** with key-based authentication
- **rsync** (for file synchronization)

### PM2 Setup:
The project includes an `ecosystem.config.js` file configured for Bun runtime:

```javascript
module.exports = {
  apps: [{
    name: "api.oluwasetemi.dev",
    script: "./dist/src/index.js",
    interpreter: "bun",
    instances: "max",
    exec_mode: "cluster",
    // ... other configuration
  }]
}
```

## SSH Key Setup

### 1. Generate SSH Key Pair (if needed):
```bash
ssh-keygen -t ed25519 -C "deployment@api.oluwasetemi.dev"
```

### 2. Add Public Key to VPS:
```bash
# Copy public key to VPS
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-vps-ip
```

### 3. Add Private Key to GitHub Secrets:
```bash
# Copy private key content
cat ~/.ssh/id_ed25519
# Add this content to GitHub Secrets as DEPLOY_SSH_KEY
```

## Deployment Process

### Automated Deployment:
1. **Trigger**: Push to `main` branch or manual workflow dispatch
2. **Build**: Install dependencies, run tests, build project
3. **Deploy**: 
   - Create backup on VPS
   - Stop application
   - Sync files to VPS
   - Install production dependencies
   - Run database migrations
   - Start/restart application with PM2
4. **Health Check**: Verify deployment with retry logic
5. **Rollback**: Automatic rollback if deployment fails

### Manual Deployment:
You can also trigger deployment manually from GitHub Actions tab:
1. Go to Actions tab in your GitHub repository
2. Select "Deploy to VPS" workflow
3. Click "Run workflow"
4. Select branch and run

## Local Testing

### Test GitHub Actions Locally:
```bash
# Install act (GitHub Actions local runner)
brew install act

# Test all workflows
./test-actions-skip.sh

# Test specific workflow
act -j lint    # Test lint workflow
act -j test    # Test test workflow
act -j deploy  # Test deploy workflow (with mocked steps)
```

### Direct Script Testing:
```bash
# Test the same commands that run in CI
pnpm run lint      # Lint check
pnpm run typecheck # TypeScript check  
pnpm run build     # Build process
pnpm test          # Run tests
```

## Troubleshooting

### Common Issues:

1. **SSH Connection Failed**
   - Verify SSH key is correct and added to VPS
   - Check VPS hostname/IP is accessible
   - Ensure SSH key has proper permissions (600)

2. **PM2 Process Not Starting**
   - Check ecosystem.config.js configuration
   - Verify Bun is installed on VPS
   - Check application logs: `pm2 logs api.oluwasetemi.dev`

3. **Health Check Fails**
   - Verify APP_URL is correct and accessible
   - Check if application is listening on correct port
   - Review application startup logs

4. **Database Migration Issues**
   - Ensure database is accessible from VPS
   - Check DATABASE_URL environment variable
   - Verify migration scripts are executable

### Monitoring:

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs api.oluwasetemi.dev

# Monitor process
pm2 monit

# Restart if needed
pm2 restart api.oluwasetemi.dev
```

## Environment Variables

Ensure these environment variables are set on your VPS:

```bash
NODE_ENV=production
DATABASE_URL=your_database_url
DATABASE_AUTH_TOKEN=your_auth_token  # if using production database
PORT=3000  # or your preferred port
# ... other environment variables from your .env file
```

## Security Notes

- Never commit private keys or sensitive secrets to the repository
- Use environment variables for all sensitive configuration
- Regularly rotate SSH keys and secrets
- Monitor deployment logs for any security issues
- Keep VPS and dependencies updated

## Support

If you encounter issues with deployment:
1. Check GitHub Actions logs for detailed error messages
2. Review VPS logs and PM2 status
3. Verify all secrets and environment variables are correctly set
4. Test SSH connection manually from your local machine
