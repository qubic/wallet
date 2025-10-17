# CI/CD Documentation

This document describes the Continuous Integration and Continuous Deployment (CI/CD) setup for the Qubic Wallet.

## Overview

The CI/CD pipeline is designed to match the [explorer-frontend](https://github.com/qubic/explorer-frontend) setup with the following workflows:

1. **Commit Message Validation** (`commitlint.yml`)
2. **Pull Request Title Validation** (`lint-pr.yml`)
3. **Code Linting** (`lint.yml`)
4. **Release and Deploy** (`deploy.yml`)

## Workflows

### 1. Commitlint (`commitlint.yml`)

**Triggers:**
- Push to any branch
- Pull request opened/reopened/edited

**Purpose:**
- Validates commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) specification
- Ensures consistency in commit history for automated changelog generation

**Allowed commit types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Routine tasks, maintenance
- `revert`: Reverting previous changes

**Example commit messages:**
```
feat: add dark mode toggle
fix: resolve transaction validation issue
docs: update deployment instructions
```

### 2. Lint PR (`lint-pr.yml`)

**Triggers:**
- Pull request opened/reopened/edited

**Purpose:**
- Validates PR titles follow semantic commit conventions
- Uses concurrency controls to cancel outdated validation runs

**Example PR titles:**
```
feat: implement seed display pipes
fix: correct balance calculation
docs: add CI/CD documentation
```

### 3. Lint (`lint.yml`)

**Triggers:**
- Pull request to `main`, `staging`, or `dev` branches
- Push to `main`, `staging`, or `dev` branches

**Purpose:**
- Runs build checks to ensure code compiles successfully
- Future: Will include ESLint and Prettier checks

### 4. Release and Deploy (`deploy.yml`)

**Triggers:**
- Push to `dev`, `staging`, or `main` branches
- Pull request closed

**Purpose:**
- Automatically versions and releases the application
- Deploys to the appropriate environment via FTP

**Deployment Targets:**

| Branch | Environment | URL | Server Directory |
|--------|------------|-----|------------------|
| `dev` | Development | dev.wallet.qubic.org | `/sites/dev.wallet.qubic.org/` |
| `staging` | Staging | staging.wallet.qubic.org | `/sites/staging.wallet.qubic.org/` |
| `main` | Production | wallet.qubic.org | `/sites/wallet.qubic.org/` |

**Workflow Steps:**
1. Checkout repository with full git history
2. Install dependencies with yarn
3. Run semantic-release (on `main` and `staging` only)
   - Analyzes commits since last release
   - Determines version bump (major.minor.patch)
   - Generates changelog
   - Creates git tag
   - Publishes GitHub release
4. Build the Angular application
5. Deploy to FTP server based on branch

## Semantic Versioning

The project uses [Semantic Versioning](https://semver.org/) automated by [semantic-release](https://github.com/semantic-release/semantic-release):

- **Major version** (1.0.0 → 2.0.0): Breaking changes (`BREAKING CHANGE:` in commit body)
- **Minor version** (1.0.0 → 1.1.0): New features (`feat:` commits)
- **Patch version** (1.0.0 → 1.0.1): Bug fixes (`fix:` commits)

### Version Bump Examples

```bash
# Patch release (1.0.0 → 1.0.1)
fix: correct seed validation logic

# Minor release (1.0.0 → 1.1.0)
feat: add QR code export functionality

# Major release (1.0.0 → 2.0.0)
feat: redesign wallet API

BREAKING CHANGE: API endpoints have been restructured
```

## Required GitHub Secrets

The following secrets must be configured in the repository settings:

### FTP Deployment Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `FTP_SERVER` | FTP server hostname | `ftp.qubic.org` |
| `FTP_USERNAME_DEV` | FTP username for dev environment | `dev_deploy` |
| `FTP_PASSWORD_DEV` | FTP password for dev environment | `***` |
| `FTP_USERNAME_STAGING` | FTP username for staging | `staging_deploy` |
| `FTP_PASSWORD_STAGING` | FTP password for staging | `***` |
| `FTP_USERNAME_PROD` | FTP username for production | `prod_deploy` |
| `FTP_PASSWORD_PROD` | FTP password for production | `***` |

### GitHub Token

| Secret Name | Description | Notes |
|------------|-------------|-------|
| `GITHUB_TOKEN` | Automatic token for GitHub API | Auto-provided by GitHub Actions |

## Branch Strategy

```
main        (Production - wallet.qubic.org)
  ↑
staging     (Pre-release - staging.wallet.qubic.org)
  ↑
dev         (Development - dev.wallet.qubic.org)
  ↑
feature/*   (Feature branches)
```

### Workflow:
1. Create feature branch from `dev`
2. Develop and commit with conventional commit messages
3. Open PR to `dev` (triggers linting and validation)
4. Merge to `dev` (auto-deploys to dev.wallet.qubic.org)
5. When ready for staging, PR from `dev` → `staging`
6. Merge to `staging` (creates RC release, deploys to staging)
7. When ready for production, PR from `staging` → `main`
8. Merge to `main` (creates production release, deploys to wallet.qubic.org)

## Local Setup

### Install Dependencies

```bash
yarn install
```

### Test Commit Messages Locally

```bash
# Install commitlint globally (optional)
yarn add -D @commitlint/cli @commitlint/config-conventional

# Test a commit message
echo "feat: add new feature" | npx commitlint
```

### Test Release Process Locally

```bash
# Dry-run semantic-release
yarn run release --dry-run
```

## Troubleshooting

### Commit Message Validation Fails

**Error:** `subject must not be sentence-case`

**Solution:** Use lowercase for commit subject
```bash
# ❌ Bad
feat: Add new feature

# ✅ Good
feat: add new feature
```

### PR Title Validation Fails

**Error:** `PR title doesn't match conventional commits`

**Solution:** Ensure PR title starts with valid type
```bash
# ❌ Bad
Add new feature

# ✅ Good
feat: add new feature
```

### Deployment Fails

**Common issues:**
1. FTP credentials incorrect → Check GitHub secrets
2. Build fails → Check build logs, run `yarn build` locally
3. Wrong directory → Verify `server-dir` in deploy.yml

## Configuration Files

- `.commitlintrc.json` - Commitlint configuration
- `.releaserc.json` - Semantic-release configuration
- `.github/workflows/` - GitHub Actions workflow definitions

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Semantic Release](https://github.com/semantic-release/semantic-release)
- [Commitlint](https://commitlint.js.org/)
