# Product development plan

Each round completes one feature or repair. Future items are planned, not implemented claims.

## Current round

skeleton

## Roadmap

### skeleton — FastAPI/React skeleton with auth, DB, CI

Status: done

Acceptance:
- Backend FastAPI app starts with health endpoint
- Frontend Vite+React+TS builds and serves
- SQLite database with migrations
- OIDC/Keycloak auth configured (demo mode)
- Docker compose with backend, frontend, Keycloak
- CI workflow runs backend/frontend tests
- Portfolio.json, README, LICENSE, CHANGELOG present

Implementation: `backend/app/main.py`, `backend/app/core/config.py`, `backend/app/core/database.py`, `backend/app/core/auth.py`, `backend/app/models/__init__.py`, `backend/app/api/health.py`, `backend/app/api/auth.py`, `backend/app/api/skills.py`, `backend/app/api/evaluations.py`, `backend/app/api/capsules.py`, `backend/app/services/evaluation_runner.py`, `backend/app/services/capsule_checker.py`, `backend/tests/conftest.py`, `backend/tests/test_health.py`, `backend/tests/test_auth.py`, `backend/tests/test_models.py`, `backend/tests/test_skills.py`, `backend/tests/test_evaluations.py`, `backend/tests/test_capsules.py`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/api/client.ts`, `frontend/src/types/api.ts`, `frontend/src/hooks/useAuth.tsx`, `frontend/src/hooks/useSkills.ts`, `frontend/src/hooks/useEvaluations.ts`, `frontend/src/hooks/useCapsules.ts`, `frontend/src/hooks/useToast.tsx`, `frontend/src/components/index.ts`, `frontend/src/components/Layout.tsx`, `frontend/src/components/Button.tsx`, `frontend/src/components/Input.tsx`, `frontend/src/components/Textarea.tsx`, `frontend/src/components/Badge.tsx`, `frontend/src/components/Card.tsx`, `frontend/src/components/Modal.tsx`, `frontend/src/components/Table.tsx`, `frontend/src/pages/Login.tsx`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Skills.tsx`, `frontend/src/pages/Evaluations.tsx`, `frontend/src/pages/Capsules.tsx`, `frontend/src/pages/Drift.tsx`, `frontend/tests/components.test.tsx`, `frontend/package.json`, `frontend/vite.config.ts`, `frontend/Dockerfile`, `backend/Dockerfile`, `compose.yaml`, `.github/workflows/ci.yml`, `portfolio.json`, `README.md`, `LICENSE`, `CHANGELOG.md`, `.env.example`, `pyproject.toml`

Tests: `backend/tests/test_health.py`, `backend/tests/test_auth.py`, `backend/tests/test_models.py`, `backend/tests/test_skills.py`, `backend/tests/test_evaluations.py`, `backend/tests/test_capsules.py`, `frontend/tests/components.test.tsx`

### skill-eval-engine — Skill evaluation engine with deterministic scoring

Status: planned

Acceptance:
- Skill schema validation and loading
- Deterministic evaluation runner (no LLM required)
- API endpoints for skill CRUD and evaluation
- Frontend dashboard for skill management
- At least 3 complete workflows: create skill, run eval, view results

### drift-detection — Model drift detection across releases

Status: planned

Acceptance:
- Drift detection algorithm with confidence bands
- Historical result storage and comparison
- API for drift reports
- Frontend visualization of drift trends

### repository-memory — Repository memory capsules (AGENT_MEMORY.md)

Status: planned

Acceptance:
- Capsule schema validation (scope, evidence, invalidated_by, claims)
- Git-aware freshness checker (check-memory.sh equivalent)
- API for capsule CRUD and retrieval
- Frontend for capsule management

