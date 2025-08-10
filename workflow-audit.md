# GitHub Actions Workflow Audit

## Overview

This document provides a comprehensive audit of all GitHub Actions workflows in the project, documenting every job, step, environment variable, secret, and configuration to ensure nothing is lost when merging or refactoring workflows.

---

## 1. Lint Workflow (`lint.yml`)

### Workflow Configuration

- **Name**: Lint
- **Triggers**:
  - `push`: branches `[main, develop]`
  - `pull_request`: branches `[main, develop]`

### Jobs

#### Job: `lint`

- **Runs on**: `ubuntu-latest`
- **Node version**: `22`
- **Package manager**: `pnpm` (latest version)
- **Caching**: `pnpm` cache enabled via `actions/setup-node`

### Steps

1. **Checkout code** - `actions/checkout@v4`
2. **Setup pnpm** - `pnpm/action-setup@v2` with `version: latest`
3. **Setup Node.js** - `actions/setup-node@v4` with Node 22 and pnpm caching
4. **Install dependencies** - `pnpm install`
5. **Run ESLint** - `pnpm run lint`

### Environment Variables

- None defined at workflow level

### Secrets Used

- None

---

## 2. Test Workflow (`test.yml`)

### Workflow Configuration

- **Name**: Tests
- **Triggers**:
  - `push`: branches `[main, develop]`
  - `pull_request`: branches `[main, develop]`

### Jobs

#### Job: `test`

- **Runs on**: `ubuntu-latest`
- **Strategy**: Matrix testing with Node versions `[22.x, 24.x]`
- **Package manager**: `pnpm` (latest version)
- **Caching**: `pnpm` cache enabled via `actions/setup-node`

### Steps

1. **Checkout code** - `actions/checkout@v4`
2. **Setup pnpm** - `pnpm/action-setup@v2` with `version: latest`
3. **Setup Node.js** - `actions/setup-node@v4` with matrix Node version and pnpm caching
4. **Install dependencies** - `pnpm install`
5. **Run type check** - `pnpm run typecheck`
6. **Run tests** - `pnpm test`
7. **Build project** - `pnpm run build`

### Environment Variables

- None defined at workflow level

### Matrix Variables

- `matrix.node-version`: Used for multi-version testing

### Secrets Used

- None

---

## 3. Deploy Workflow (`deploy.yml`)

### Workflow Configuration

- **Name**: Deploy to VPS
- **Triggers**:
  - `push`: branches `[main]`
  - `workflow_dispatch`: Manual trigger enabled

### Environment Variables (Workflow Level)

- `NODE_VERSION`: `"lts/*"`
- `PNPM_VERSION`: `"10.14.0"`

### Jobs

#### Job: `deploy`

- **Runs on**: `ubuntu-latest`
- **Timeout**: 15 minutes
- **Package manager**: `pnpm` version 10.14.0
- **Node version**: LTS
- **Caching**: `pnpm` cache enabled

### Steps (Detailed)

#### 1. Build Phase

1. **Checkout code** - `actions/checkout@v4`
2. **Setup pnpm** - `pnpm/action-setup@v4` with version from `env.PNPM_VERSION`
3. **Setup Node.js** - `actions/setup-node@v4` with LTS version and pnpm caching
4. **Install dependencies** - `pnpm install`
5. **Build project** - `pnpm run build`

#### 2. SSH Configuration Phase

6. **Setup SSH directory** - Creates `$HOME/.ssh` directory
7. **Setup SSH for local testing (ACT)** - Conditional step for local testing with `act`
   - Condition: `env.ACT == 'true'`
   - Creates fake SSH key for testing
8. **Add SSH key** - Production SSH key setup
   - Condition: `env.ACT != 'true'`
   - Validates SSH key format, size, and structure
   - Multiple validation checks for key integrity
9. **Configure SSH key permissions and setup agent**
   - Condition: `env.ACT != 'true'`
   - Sets permissions to 600
   - Starts SSH agent
   - Adds key to agent
10. **Setup SSH permissions for local testing (ACT)**
    - Condition: `env.ACT == 'true'`
11. **Verify ssh-agent has key** (Optional debug step)
    - Condition: `env.DEBUG_SSH == 'true' && env.ACT != 'true'`
12. **Verify fake SSH key for local testing** (Optional debug step)
    - Condition: `env.DEBUG_SSH == 'true' && env.ACT == 'true'`

#### 3. SSH Connection Phase

13. **Configure SSH client**
    - Condition: `env.ACT != 'true'`
    - Creates SSH config with connection parameters:
      - ServerAliveInterval: 60
      - ServerAliveCountMax: 3
      - ConnectTimeout: 30
      - TCPKeepAlive: yes
      - Compression: yes
      - StrictHostKeyChecking: no
14. **Add VPS to known hosts and test connection**
    - Condition: `env.ACT != 'true'`
    - Uses `ssh-keyscan` to add host
    - Tests SSH connection with verbose debugging on failure

#### 4. Deployment Phase

15. **Mock deployment steps for local testing**
    - Condition: `env.ACT == 'true'`
    - Simulates all deployment steps
16. **Create backup on VPS**
    - Condition: `env.ACT != 'true'`
    - Creates timestamped backup
    - Preserves database files (`prod.db`, `dev.db`)
17. **Deploy to VPS**
    - Condition: `env.ACT != 'true'`
    - Complex deployment process:
      - Stops PM2 process `api.oluwasetemi.dev`
      - Preserves database files to `/tmp`
      - Uses Git to pull latest changes
      - Git SSH command: `ssh -i ~/.ssh/id_ed25519_api.oluwasetemi.dev -o IdentitiesOnly=yes`
      - Initializes git repo if needed
      - Fetches and resets to `origin/main`
      - Cleans untracked files
      - Restores database files
      - Runs `pnpm install`
      - Runs database migrations: `pnpm run db:migrate && pnpm run db:generate`
      - Starts/restarts PM2 with `ecosystem.config.cjs`
      - Saves PM2 configuration

#### 5. Verification Phase

18. **Health Check with Retry**
    - Condition: `env.ACT != 'true'`
    - Waits 30 seconds initially
    - 5 retry attempts with 10-second intervals
    - Uses curl with 10-second connect timeout, 30-second max time

#### 6. Rollback Phase

19. **Rollback on Failure**
    - Condition: `failure() && env.ACT != 'true'`
    - Finds latest backup
    - Preserves current database files
    - Restores from backup
    - Restarts PM2 process

#### 7. Cleanup Phase

20. **Cleanup old backups**
    - Condition: `success() && env.ACT != 'true'`
    - Keeps only the 2 most recent backups
    - Deletes older backups to save space

### Secrets Used

- `DEPLOY_SSH_KEY`: SSH private key for VPS access
- `VPS_HOST`: VPS hostname/IP address
- `VPS_USER`: VPS username for SSH
- `DEPLOY_PATH`: Deployment directory path on VPS
- `APP_URL`: Application URL for health checks

### Environment Variables (Runtime)

- `SSH_AUTH_SOCK`: SSH agent socket (exported to GITHUB_ENV)
- `SSH_AGENT_PID`: SSH agent process ID (exported to GITHUB_ENV)
- `ACT`: Flag for local testing with act tool
- `DEBUG_SSH`: Optional flag for SSH debugging
- `GIT_SSH_COMMAND`: Custom SSH command for git operations

### Special Configurations

- **PM2 Process Name**: `api.oluwasetemi.dev`
- **PM2 Config File**: `ecosystem.config.cjs`
- **Database Files**: `prod.db`, `dev.db`
- **SSH Key on VPS**: `~/.ssh/id_ed25519_api.oluwasetemi.dev`
- **Git Remote**: `git@github.com:oluwasetemi/api.oluwasetemi.dev.git`
- **Backup Pattern**: `backup-YYYYMMDD-HHMMSS`

---

## Summary of All Required Secrets

1. **DEPLOY_SSH_KEY** - SSH private key for VPS authentication
2. **VPS_HOST** - Target VPS hostname or IP address
3. **VPS_USER** - Username for VPS SSH access
4. **DEPLOY_PATH** - Full path to deployment directory on VPS
5. **APP_URL** - Application URL for health check verification

## Summary of All Commands/Scripts Used

### Package Manager Commands

- `pnpm install` - Install dependencies
- `pnpm run lint` - Run ESLint
- `pnpm run typecheck` - Run TypeScript type checking
- `pnpm test` - Run tests
- `pnpm run build` - Build the project
- `pnpm run db:migrate` - Run database migrations
- `pnpm run db:generate` - Generate database artifacts

### PM2 Commands

- `pm2 stop api.oluwasetemi.dev` - Stop the application
- `pm2 start ecosystem.config.cjs` - Start with config file
- `pm2 restart api.oluwasetemi.dev` - Restart the application
- `pm2 save` - Save PM2 configuration

### Git Commands

- `git init` - Initialize repository
- `git remote add origin [url]` - Add remote origin
- `git fetch origin main` - Fetch latest changes
- `git reset --hard origin/main` - Reset to latest commit
- `git clean -fd` - Clean untracked files

## Branch Protection and Workflow Triggers

### Protected Branches

- **main**: Deployment trigger, lint and test on push/PR
- **develop**: Lint and test on push/PR

### Workflow Trigger Summary

| Workflow | Push Branches | PR Branches   | Manual Trigger          |
| -------- | ------------- | ------------- | ----------------------- |
| Lint     | main, develop | main, develop | No                      |
| Test     | main, develop | main, develop | No                      |
| Deploy   | main only     | N/A           | Yes (workflow_dispatch) |

## Caching Strategies

All workflows use `pnpm` caching through `actions/setup-node@v4`:

- Cache key based on `pnpm-lock.yaml`
- Speeds up dependency installation
- Reduces workflow execution time

## Testing Strategies

1. **Matrix Testing**: Test workflow uses Node versions 22.x and 24.x
2. **Local Testing Support**: Deploy workflow supports local testing with `act`
3. **Type Checking**: Separate TypeScript validation step
4. **Build Verification**: All workflows verify build success

## Deployment Safety Features

1. **Backup Creation**: Automatic backup before deployment
2. **Database Preservation**: Database files preserved during deployment
3. **Health Checks**: 5 retry attempts with timeouts
4. **Automatic Rollback**: Rollback on deployment failure
5. **Backup Cleanup**: Automatic cleanup keeping 2 most recent backups
6. **SSH Validation**: Multiple SSH key validation checks
7. **Connection Testing**: SSH connection test before deployment

## Notes for Merging/Refactoring

When merging these workflows, ensure to:

1. Preserve all secrets configuration
2. Maintain branch filters for appropriate environments
3. Keep matrix testing configuration for multiple Node versions
4. Preserve the sophisticated deployment rollback mechanism
5. Maintain database preservation logic during deployments
6. Keep the local testing support with `act`
7. Preserve all SSH configuration and validation steps
8. Maintain PM2 process management configuration
9. Keep health check retry logic
10. Preserve backup management (creation and cleanup)

## Optimization Opportunities

Consider when merging:

1. Consolidating common setup steps (checkout, pnpm, Node.js)
2. Creating reusable workflows for common patterns
3. Potentially combining lint and test for PR checks
4. Adding deployment status notifications
5. Implementing deployment environments for staging/production
6. Adding more comprehensive health checks
7. Implementing blue-green deployment strategy
