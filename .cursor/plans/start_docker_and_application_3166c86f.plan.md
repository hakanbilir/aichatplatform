**Note:** This project has been migrated from Docker to PM2 process management. See `/root/PM2_MIGRATION_GUIDE.md` for details.

---
name: Start Docker and Application
overview: Verify Docker is running, then build and start all application services using Docker Compose, including database migrations.
todos:
  - id: verify-docker
    content: Check if Docker daemon is running using `docker info` or `docker ps
    status: completed
  - id: check-env
    content: Verify .env file exists or inform about default values
    status: completed
  - id: build-start
    content: Run `docker compose up --build -d` to build and start all services
    status: completed
  - id: wait-healthy
    content: Wait for services to pass health checks (monitor with `docker compose ps`)
    status: completed
  - id: run-migrations
    content: "Execute database migrations: `docker compose exec api-gateway pnpm --filter @ai-chat/db prisma:migrate:deploy`"
    status: completed
  - id: verify-services
    content: Verify all services are running with `docker compose ps`
    status: completed
---

# Start Docker and Application Stack

## Overview

This plan will verify Docker daemon is running and start the entire application stack using Docker Compose. The stack includes:

- PostgreSQL database (with pgvector)
- Redis cache
- Ollama AI service
- API Gateway
- Web frontend
- Worker Jobs service
- Prometheus & Grafana (monitoring)

## Steps

### 1. Verify Docker Installation and Status

- Check if Docker is installed and the daemon is running
- If Docker is not running, provide instructions to start it

### 2. Check Environment Configuration

- Verify if `.env` file exists in the project root
- If missing, inform user that docker-compose.yml uses default values (or check for `.env.development`)

### 3. Build and Start Services

Run the following command to build images and start all services:

```bash
docker compose up --build -d
```

**Alternative for development mode:**

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
```

### 4. Wait for Services to be Healthy

- Monitor service health checks (services have healthcheck configurations)
- Services will start in dependency order (db → redis → ollama → api-gateway → web)

### 5. Run Database Migrations

After services are up, apply Prisma migrations:

```bash
docker compose exec api-gateway pnpm --filter @ai-chat/db prisma:migrate:deploy
```

### 6. Verify Services

Check service status:

```bash
docker compose ps
```

## Service URLs (after startup)

- **Web UI:** http://localhost:3001
- **API Gateway:** http://localhost:4000
- **Grafana:** http://localhost:3000
- **Prometheus:** http://localhost:9090
- **PostgreSQL:** localhost:5436
- **Redis:** localhost:6384
- **Ollama:** localhost:11435

## Notes

- The `-d` flag runs services in detached mode (background)
- Use `docker compose logs -f` to follow logs
- Use `docker compose down` to stop all services
- For development with hot-reload, use the dev compose override file