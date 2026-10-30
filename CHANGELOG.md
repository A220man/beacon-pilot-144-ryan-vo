# Changelog

## 1.1.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.0.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-23

### Added
- Initial project skeleton with FastAPI backend and React frontend
- SQLite database with SQLAlchemy models
- OIDC/Keycloak authentication (demo mode binder)
- Docker Compose with backend, frontend, Keycloak
- CI workflow for backend and frontend tests
  - Skill evaluation engine with deterministic scoring
  - Evaluation runner service with confidence bands and drift comparison
  - Evaluation detail page with results visualization
  - Frontend date-fns dependency for date formatting

### Fixed
- Frontend TypeScript compilation errors (duplicate attributes, unused imports, undefined data access)
- Vite proxy configuration typo (health endpoint)
- Backend database directory creation for SQLite
- Frontend test imports to use component index