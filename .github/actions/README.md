# GitHub Actions Reusable Components

This directory contains reusable composite actions that standardize common workflow tasks across our CI/CD pipeline.

## Available Actions

### 1. Setup Action (`./.github/actions/setup`)

**Purpose**: Provides a standardized environment setup with Node.js, pnpm, and optimized caching.

**Key Features**:
- Configures pnpm with specified version
- Sets up Node.js with built-in caching
- Implements multi-level cache strategy:
  - Primary cache: OS + pnpm + cache prefix + Node version + lockfile hash
  - Fallback caches for faster restoration
- Caches both pnpm store path and `~/.pnpm-store` directory
- Smart dependency installation (prefer offline when cache hit)

**Usage**:
```yaml
- uses: ./.github/actions/setup
  with:
    node-version: '22'        # Default: '22'
    pnpm-version: '10.14.0'   # Default: '10.14.0'
    cache-key-prefix: 'lint'  # Default: 'default'
```

**Outputs**:
- `pnpm-store-path`: The pnpm store directory path
- `cache-hit`: Boolean indicating if cache was restored

### 2. Build Action (`./.github/actions/build`)

**Purpose**: Handles application building with artifact caching.

**Key Features**:
- Leverages the setup action for environment configuration
- Caches build artifacts (dist, .next, build, out directories)
- Smart cache key based on lockfile and source files
- Skips build if cache hit
- Auto-detects build output directory

**Usage**:
```yaml
- uses: ./.github/actions/build
  with:
    node-version: '22'              # Default: '22'
    pnpm-version: '10.14.0'          # Default: '10.14.0'
    build-command: 'pnpm run build'  # Default: 'pnpm run build'
    cache-build-artifacts: 'true'    # Default: 'true'
```

**Outputs**:
- `build-cache-hit`: Boolean indicating if build cache was restored
- `build-output-path`: Path to the build output directory

## Cache Strategy

### Cache Key Structure

The caching strategy uses a hierarchical key structure:

```
{OS}-pnpm-{cache-prefix}-node{version}-{lockfile-hash}
```

This ensures:
1. **OS-specific caches**: Different operating systems maintain separate caches
2. **Job-specific prefixes**: Lint, test, and build jobs don't interfere with each other
3. **Node version isolation**: Different Node versions maintain separate caches
4. **Lockfile-based invalidation**: Cache invalidates when dependencies change

### Cache Restoration Priority

When a exact cache key miss occurs, the system falls back in this order:
1. Same OS, prefix, and Node version (any lockfile)
2. Same OS and prefix (any Node version)
3. Same OS (any prefix or Node version)

### Cached Paths

- **pnpm store**: Retrieved dynamically via `pnpm store path`
- **Global pnpm store**: `~/.pnpm-store` directory
- **Build artifacts**: Common output directories (dist, .next, build, out)

## Benefits

1. **Reduced CI Time**: Caching dependencies and build artifacts significantly reduces workflow execution time
2. **Consistency**: All jobs use the same setup process, reducing configuration drift
3. **Maintainability**: Updates to setup process only need to be made in one place
4. **Cost Optimization**: Fewer dependency downloads and builds reduce CI/CD costs
5. **Reliability**: Fallback cache keys ensure workflows continue even with cache misses

## Best Practices

1. **Use specific cache prefixes**: Different job types should use different prefixes to avoid cache pollution
2. **Monitor cache size**: GitHub Actions has a 10GB cache limit per repository
3. **Regular cache cleanup**: Old cache entries are automatically evicted after 7 days of inactivity
4. **Version pinning**: Always pin pnpm and Node.js versions for reproducible builds

## Troubleshooting

### Cache not being used
- Check if `pnpm-lock.yaml` has changed
- Verify the cache key prefix is correct
- Ensure cache hasn't exceeded size limits

### Dependencies out of sync
- Clear cache by incrementing `CACHE_VERSION` in workflow
- Manually delete caches via GitHub UI or API

### Build artifacts stale
- Build cache considers source file changes
- Ensure all relevant source paths are included in hash

## Future Improvements

- [ ] Add telemetry for cache hit rates
- [ ] Implement cache warming for scheduled workflows
- [ ] Add support for Yarn and npm package managers
- [ ] Create action for test result caching
- [ ] Add cache compression for faster restoration
