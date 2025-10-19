# Version Management Scripts

## update-version.js

This script automatically synchronizes the version from `package.json` to the Angular environment files.

### What it does:

1. Reads the version from `package.json`
2. Updates `src/environments/environment.ts`
3. Updates `src/environments/environment.prod.ts`

### When it runs:

- **Automatically before every build** (via `prebuild` script)
- **After semantic-release** updates the version (via `@semantic-release/exec`)
- **Manually** by running: `yarn version:sync`

### Usage:

```bash
# Manual sync
yarn version:sync

# Automatic sync before build
yarn build

# Automatic sync during release
yarn release
```

### How it works with CI/CD:

1. Semantic-release analyzes commits and determines new version
2. Updates `package.json` with new version
3. Runs `update-version.js` to sync environment files
4. Commits all changes (package.json + environment files)
5. Creates git tag and GitHub release
6. Builds application with correct version
7. Deploys to FTP

### Result:

The version displayed in the navigation component (`{{ version }}`) will always match the version in `package.json` and the GitHub release version.

### Example:

```typescript
// package.json
{
  "version": "4.21.0"
}

// After running update-version.js:
// src/environments/environment.ts
export const environment = {
  version: '4.21.0',  // ✅ Automatically synced!
  production: false,
  // ...
}
```
