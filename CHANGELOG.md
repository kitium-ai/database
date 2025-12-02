# Changelog

## Unreleased
- Added centralized configuration loader with retry/backoff defaults, pooling normalization, and shutdown controls.
- Implemented resilient Prisma client initialization with structured logging, metrics, and readiness probes.
- Introduced safe, parameterized raw query helper and optional unsafe escape hatch with metrics instrumentation.
- Delivered MongoDB initialization, health checks, and pooling parity alongside PostgreSQL.
- Upgraded migration runner to execute Prisma migrations programmatically with rollback automation.
- Hardened seeding with bcrypt hashing, configurable defaults, idempotent upserts, and environment guardrails for destructive operations.
- Documented new APIs, observability, and security defaults across README with fresh examples.

## v1.0.0 (Initial Release)
- Prisma ORM integration
- Connection pooling with PgBouncer support
- Automated migrations
- Database seeding
- Monitoring and health checks
- Security best practices
