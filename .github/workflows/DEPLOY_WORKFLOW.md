# Deploy Workflow Documentation

## Overview

The `deploy.yml` workflow implements a complete CI/CD pipeline with the following key features:

- **Test-before-deploy**: Runs comprehensive test suite before any deployment
- **Branch protection**: Only deploys from the `main` branch on push events
- **Environment protection**: Uses GitHub Environments for production deployment controls
- **Build artifacts**: Supports using pre-built artifacts from the test job
- **Rollback capability**: Automatic rollback on deployment failure
- **Database preservation**: Maintains database state during deployments

## Workflow Structure

### 1. Test Job
- Runs on multiple Node.js versions (22.x, 24.x)
- Executes type checking and test suite
- Builds the project
- Uploads build artifacts for potential reuse

### 2. Deploy Job

#### Dependencies and Conditions
```yaml
needs: test  # Depends on test job completion
if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

#### Environment Configuration
```yaml
environment:
  name: production
  url: ${{ secrets.APP_URL }}
```

## Environment Protection Rules

To enable required reviewers and additional protection:

1. Go to **Settings** → **Environments** → **production**
2. Configure the following options:

### Required Reviewers
- Add specific users or teams who must approve deployments
- Deployments will pause and wait for approval

### Deployment Branches
- Restrict deployments to specific branches (e.g., `main` only)
- Prevents accidental deployments from feature branches

### Environment Secrets
Configure production-specific secrets:
- `VPS_HOST`: Your VPS hostname/IP
- `VPS_USER`: SSH username
- `DEPLOY_SSH_KEY`: SSH private key for deployment
- `DEPLOY_PATH`: Target deployment directory
- `APP_URL`: Application URL for health checks

### Wait Timer (Optional)
- Add a delay before deployment proceeds
- Useful for manual review of changes

## Using Build Artifacts

The workflow supports two deployment strategies:

### Option 1: Fresh Build (Default)
```yaml
- name: Install dependencies
  run: pnpm install

- name: Build project
  run: pnpm run build
```

### Option 2: Reuse Test Artifacts
Uncomment the following to use pre-built artifacts:
```yaml
- name: Download build artifacts
  uses: actions/download-artifact@v4
  with:
    name: build-artifacts
    path: .
```

## Deployment Process

1. **Pre-deployment**: Creates backup of current deployment
2. **Database preservation**: Backs up database files
3. **Git deployment**: Uses git pull for code updates
4. **Dependencies**: Installs production dependencies
5. **Database migrations**: Runs any pending migrations
6. **Application restart**: Restarts PM2 process
7. **Health check**: Verifies deployment success
8. **Rollback**: Automatic rollback on failure

## Security Considerations

- SSH keys stored as encrypted secrets
- Deployment restricted to main branch
- Optional approval requirements via environment protection
- Database backups before each deployment
- Automatic rollback on failure

## Testing Locally

The workflow supports local testing with [act](https://github.com/nektos/act):

```bash
act push -W .github/workflows/deploy.yml --secret-file .env.secrets
```

## Monitoring and Alerts

- Health checks after deployment
- Automatic rollback on failure
- Old backup cleanup (keeps last 2 backups)
- Deployment URL tracking in GitHub Environments

## Customization

### Adding Cloud Provider Deployment

Replace or supplement the SSH deployment with cloud-specific actions:

```yaml
# AWS ECS Example
- name: Deploy to AWS ECS
  uses: aws-actions/amazon-ecs-deploy-task-definition@v1
  with:
    task-definition: task-definition.json
    service: my-service
    cluster: my-cluster

# Vercel Example  
- name: Deploy to Vercel
  uses: amondnet/vercel-action@v20
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.ORG_ID }}
    vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Adding Required Reviewers

1. Navigate to Settings → Environments → production
2. Under "Required reviewers", add users or teams
3. Enable "Prevent self-review" if desired
4. Save protection rules

## Troubleshooting

### Common Issues

1. **Deployment not triggering**: Ensure push is to main branch
2. **Waiting for approval**: Check environment protection rules
3. **SSH connection fails**: Verify SSH key and host configuration
4. **Health check fails**: Check application logs and URL configuration
5. **Rollback issues**: Ensure backup directory permissions are correct

### Debug Mode

Enable SSH debugging:
```bash
DEBUG_SSH=true
```

### Support

For issues or questions, please check:
- GitHub Actions logs
- Environment protection settings
- Repository secrets configuration
- PM2 logs on the VPS
