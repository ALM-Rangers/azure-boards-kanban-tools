# Maintenance complexity and dependency update scope

## Snapshot of the current stack
- **Framework**: React 16.14 with ReactDOM 16.14, Azure DevOps UI 2.259, Azure DevOps extension SDK/API 4.x.
- **Language/build**: TypeScript 5.9, Webpack 5, TSLint 5 (deprecated), Sass, webpack-dev-server.
- **Testing/build scripts**: `npm run build:dev` (lint + compile) is the primary quality gate; no automated tests are defined.

## Overall maintenance complexity
- **Overall**: **Medium–High**. The codebase is relatively small, but major-version gaps in the React stack and the deprecated linting tool raise complexity.
- **Key drivers**:
  - Large version jump from React 16 → 19 requires audit of class components/hooks usage and compatibility with the new root API.
  - TSLint is end-of-life; migration to ESLint is required before or alongside dependency upgrades.
  - Azure DevOps UI/SDK have minor updates available; these are low risk but need validation within the extension host.

## Dependency upgrade complexity
| Area | Current | Latest | Effort | Notes |
| --- | --- | --- | --- | --- |
| React / ReactDOM | 16.14 | 19.x | High | Requires updating ReactDOM render API, verifying legacy lifecycle methods, and updating typings. |
| Azure DevOps UI | 2.259 | 2.266 | Low | Minor bump; verify visual regressions in Kanban panel components. |
| Azure DevOps SDK/API | 4.0.2 / 4.258 | 4.2.x / 4.264 | Low | Patch-level changes; retest extension initialization and auth. |
| Tooling: TSLint | 5.18 | N/A (deprecated) | Medium–High | Migrate rules to ESLint with TypeScript plugin; update lint script. |
| Webpack toolchain | 5.101 | 5.104 | Low | Patch-level; minimal config changes expected. |
| Build utilities (sass, ts-loader, copy-webpack-plugin, tfx-cli, rimraf) | Slightly behind | Latest patch | Low–Medium | Mostly patch bumps; ensure node version compatibility. |

## Recommended path to reduce maintenance risk
1. **Introduce ESLint** (keep TSLint temporarily if needed) and migrate existing rules to unblock modern dependency upgrades.
2. **Upgrade React stack** incrementally (e.g., 17 → 18 → 19) while validating UI flows in the extension host.
3. **Patch Azure DevOps SDK/UI and tooling** after linting migration, then rerun `npm run build:dev` and manual UI verification.
4. **Add smoke tests** around core scenarios (board import/export) to stabilize future upgrades.

## Effort sizing (rough)
- ESLint migration: **Medium–High**, 1–2 days depending on rule parity and CI integration.
- React major upgrades: **High**, 2–4 days with manual extension verification.
- Patch/minor bumps (Azure DevOps, webpack/tooling): **Low**, <1 day including validation.
