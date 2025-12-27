**Note:** This project has been migrated from Docker to PM2 process management. See `/root/PM2_MIGRATION_GUIDE.md` for details.



# SECURITY.md – Node.js Web App Security Profile for AI Agents

> **Purpose**  
> This file defines the **security baseline and automation rules** for this Node.js web application.  
> It is written for **AI coding agents (Cursor, Claude Code, GPT, etc.)** so they can **analyze, fix and harden** the codebase **without any human guidance**.

---

## 0. Global Rules for AI Agents

1. **Never weaken security.**  
   - You MUST NOT remove or relax existing security checks unless you immediately replace them with a stronger, equivalent control.
2. **Keep the app working.**  
   - All changes MUST keep the app compiling, tests passing and the main workflows functioning. If a security improvement would break the app, prefer the **smallest safe change** and document the limitation in comments.
3. **No secrets in code.**  
   - Do NOT introduce hardcoded passwords, API keys, tokens or private keys.  
   - Always load secrets from environment variables or from the existing secret management mechanism.
4. **Respect the tech stack.**  
   - Detect whether the app uses **Express, Fastify, NestJS, Koa or another framework**, and apply the relevant recipes below without changing the architectural style.
5. **Idempotent changes.**  
   - Write security code so that running the agent multiple times does NOT duplicate middleware, env vars, or CI jobs.
6. **Prefer LTS Node.js.**  
   - Target **Node.js 24.x LTS ("Krypton")** when possible. If the project is on Node 20.x or 22.x LTS, prefer **upgrading to 24.x** in new work but **do not break current production** just to change the version.

---

## 1. Project Discovery (What You Must Inspect)

AI agents MUST scan and understand at least the following files if they exist:

- `package.json`, `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock`
- Application entrypoints: `src/index.ts`, `src/index.js`, `src/server.ts`, `src/server.js`, `app.ts`, `main.ts` (NestJS), or framework-specific bootstrap files
- Framework configuration: `src/app.module.ts`, `src/routes/*`, `src/controllers/*`, `src/middleware/*`
- Environment handling: `.env*`, `config/*.js`, `config/*.ts`, `src/config/*`
- HTTP layer: `Dockerfile`, `docker-compose.yml`, `infra/*`, `nginx.conf` or other reverse proxy configs
- CI/CD: `.github/workflows/*.yml`, `.gitlab-ci.yml`, `azure-pipelines.yml`, `Jenkinsfile`, etc.

For each security task below, the agent MUST:

1. Locate the relevant files.  
2. Detect current patterns (e.g. Express vs NestJS).  
3. Apply the specific recipes, code templates and configuration rules described in this document.

---

## 2. Runtime & Dependency Security

### 2.1 Node.js Runtime

1. Locate Node version declarations in:
   - `.nvmrc`, `package.json` (`engines.node`), `Dockerfile`, CI configuration.
2. If the runtime is **older than Node 20.x**:
   - Add a **comment** in `SECURITY.md` or `README.md` recommending upgrade to **Node 24.x LTS**.  
   - Do **not** change CI images or runtime unless this repository clearly already supports Node ≥20.
3. If `engines.node` is missing in `package.json`, set it to a safe LTS range, for example:
   ```json
   "engines": {
     "node": ">=20 <26"
   }
   ```

### 2.2 Lockfiles & Install Hygiene

AI agents MUST ensure **deterministic installs**:

1. If the project uses npm:
   - Ensure `package-lock.json` exists; if not, add an instruction comment in `README.md` to run `npm install` once to generate it.
   - CI MUST use `npm ci` instead of `npm install` where possible.
2. If the project uses pnpm or yarn:
   - Ensure the relevant lockfile is committed and **not** ignored.

### 2.3 Dependency Scanning Tasks

In `package.json` the AI agent MUST:

1. Add or ensure existence of these scripts (adapt if using pnpm/yarn):
   ```json
   "scripts": {
     "lint": "eslint .",
     "test": "NODE_ENV=test jest",
     "audit": "npm audit --audit-level=high || true",
     "audit:ci": "npm audit --audit-level=high"
   }
   ```
2. For CI workflows:
   - Ensure at least one job runs `npm ci`, `npm run lint`, `npm test` and `npm run audit:ci` for pull requests and main branch.
3. If unused or obviously malicious-looking packages appear in `dependencies` or `devDependencies` (e.g. random names unrelated to the project):
   - Remove them and adjust imports accordingly.

---

## 3. HTTP Server Baseline (Middleware & Headers)

This section defines the **minimum security middleware** that MUST exist.

### 3.1 Express Applications

If the project uses **Express** (detected via `import express from 'express'` or `const express = require('express')`):

1. Ensure the following packages are in `dependencies` (add them if missing):
   - `helmet`
   - `cors`
   - `express-rate-limit`
   - `compression`
2. In the main server file (commonly `src/server.ts` or `src/index.ts`), after `const app = express();`, add **idempotent** middleware setup:
   ```ts
   import helmet from 'helmet';
   import cors from 'cors';
   import compression from 'compression';
   import rateLimit from 'express-rate-limit';

   const app = express();

   // Trust proxy if running behind a reverse proxy (e.g. nginx, load balancer)
   app.set('trust proxy', 1);

   // Security HTTP headers
   app.use(helmet());

   // CORS – replace ALLOWED_ORIGINS with a comma-separated list in env
   const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
     .split(',')
     .map(o => o.trim())
     .filter(Boolean);

   app.use(
     cors({
       origin: allowedOrigins.length > 0 ? allowedOrigins : false,
       credentials: true,
     })
   );

   // Gzip / Brotli compression
   app.use(compression());

   // Basic rate limiting (adjust limits as needed)
   const apiLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 100,
     standardHeaders: true,
     legacyHeaders: false,
   });

   app.use('/api', apiLimiter);
   ```
3. The agent MUST ensure this block is inserted **once**, not duplicated.

### 3.2 Fastify / NestJS / Koa

For other frameworks, apply equivalent plugins:

- **Fastify**: use `@fastify/helmet`, `@fastify/cors`, and a rate-limiter plugin (`@fastify/rate-limit`).
- **NestJS**: configure Helmet, CORS and rate limiting in the bootstrap function in `main.ts`.
- **Koa**: add middleware equivalents (helmet, cors, rate limit) around the app.

The logic MUST be functionally equivalent to the Express recipe above.

---

## 4. Authentication & Session Security

AI agents MUST verify and enforce the following rules.

### 4.1 Password Storage

1. Search for any place passwords are stored or compared.  
   - If plaintext or weak hashing (e.g. `md5`, `sha1`) is used, change it to **Argon2** (preferred) or **bcrypt**.
2. If using Argon2, ensure a safe configuration, for example:
   ```ts
   import argon2 from 'argon2';

   const hash = await argon2.hash(plainPassword, {
     type: argon2.argon2id,
   });

   const ok = await argon2.verify(hash, candidatePassword);
   ```

### 4.2 Session Cookies (Stateful Auth)

For cookie-based sessions (e.g. `express-session`):

1. Ensure session cookie options are secure:
   ```ts
   app.use(
     session({
       secret: process.env.SESSION_SECRET!,
       resave: false,
       saveUninitialized: false,
       cookie: {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: 'lax',
       },
     })
   );
   ```
2. If `SESSION_SECRET` is missing, **do not** hardcode; require env var and document need in comments.

### 4.3 JWT-based Auth

If JWTs are used (search for `jsonwebtoken` or similar):

1. Tokens MUST be signed with a strong secret or key pair (`HS256` or stronger, or `RS256`/`ES256`).
2. Verify tokens with explicit `issuer`, `audience` and `expiresIn` checks.
3. Do NOT store JWTs in `localStorage` in browser code if secure cookies are possible. Prefer `HttpOnly` cookies for browser-based apps.

---

## 5. Input Validation & Output Encoding

### 5.1 Validation

1. AI agents MUST ensure **all external inputs** (request body, query, params, headers) are validated with a schema library such as:
   - `zod`
   - `joi` / `@hapi/joi`
   - `class-validator` (for NestJS)
2. For each public controller/route handler:
   - If there is no validation, introduce a schema and validate before business logic.
   - Reject invalid input with an appropriate HTTP status (400) and a generic error message.

### 5.2 XSS & Output Encoding

1. Ensure templates or JSX/TSX rendering escape user-provided content by default.  
2. For raw HTML/rich text, sanitize using a trusted library (e.g. `sanitize-html`) and a **strict allowlist**.
3. AI agents MUST NOT introduce unsanitized interpolation of user input into HTML, JavaScript or attribute contexts.

---

## 6. Protection Against Common Web Attacks

### 6.1 CSRF

For cookie-based browser sessions:

1. Add and configure a CSRF protection mechanism (library such as `csurf` for Express or equivalent in the framework), unless the API is strictly stateless and only uses header-based tokens.
2. Ensure **state-changing operations** (POST/PUT/PATCH/DELETE) require a CSRF token from a secure source.

### 6.2 Rate Limiting & DoS

1. Confirm that high-risk endpoints (login, registration, password reset) are rate limited.  
2. Set JSON/body parser limits, for example:
   ```ts
   app.use(express.json({ limit: '1mb' }));
   app.use(express.urlencoded({ extended: true, limit: '1mb' }));
   ```
3. Avoid any unbounded in-memory aggregation of user-controlled data.

### 6.3 SSRF & External Calls

1. For any feature that fetches remote URLs provided by users, enforce:
   - Validation of the URL format
   - Blocking or filtering of internal IP ranges (`127.0.0.0/8`, `10.0.0.0/8`, `169.254.169.254`, etc.)
2. Prefer allowlists of domains over general outbound freedom.

---

## 7. File Uploads

If the application accepts file uploads:

1. Enforce constraints via a library like `multer` or framework plugin:
   - Maximum file size
   - Allowed MIME types and file extensions
2. Store files **outside** the web root or in object storage (S3, GCS, etc.).  
3. Never execute uploaded content.  
4. For images or PDFs, prefer processing them in a separate worker or microservice to limit exposure to parser vulnerabilities.

---

## 8. Logging & Error Handling

### 8.1 Logging

1. Use a structured logger (`pino`, `winston`) if not already present.
2. Log at least:
   - Request ID / correlation ID
   - HTTP method, path, status code
   - Authentication principal (user ID) where available
3. Make sure logs do **not** contain:
   - Passwords
   - Full credit card numbers
   - Full access tokens or refresh tokens

### 8.2 Error Handling

1. Ensure a centralized error handler exists in the HTTP framework.
2. For production builds:
   - Do not expose stack traces or internal error messages to clients.
   - Log detailed errors server-side; return generic error responses client-side.

---

## 9. Docker / Container Security (If Used)

When a `Dockerfile` is present:

1. Prefer an official Node.js LTS base image (Node 24.x or at least Node 20.x/22.x).
2. Run the app as a **non-root user**:
   ```dockerfile
   RUN useradd -ms /bin/bash appuser
   USER appuser
   ```
3. Avoid installing build tools in the final image. Use multi-stage builds if necessary.
4. Expose only the required port and rely on an external reverse proxy for TLS termination where appropriate.

---

## 10. CI/CD Security Tasks

AI agents MUST ensure that CI/CD pipelines include the following steps when possible:

1. **Install & cache dependencies** using `npm ci` or equivalent.
2. **Static analysis** (lint + type-check):
   - `npm run lint`
   - `npm run build` (for TypeScript projects)
3. **Tests**: `npm test` or the project’s equivalent test command.
4. **Security scans**:
   - `npm run audit:ci` or an external scanner (Snyk, etc.) if available in the project.

If CI files are missing, the agent SHOULD NOT create full pipelines from scratch unless clearly required by project conventions, but MAY add security steps to existing workflows.

---

## 11. Access Control & Authorization Checks

AI agents MUST verify that protected routes and controllers perform explicit authorization checks.

1. For each route handling sensitive data (user profile, payments, administration):
   - Confirm **authentication** is enforced (user must be logged in or must present a valid token).
   - Confirm **authorization** is enforced (user has rights to the resource and action).
2. AI agents MUST prevent IDOR (Insecure Direct Object Reference):
   - When accessing resources by ID (e.g. `/users/:id`), ensure the handler verifies ownership or required permissions, not only that the user is authenticated.

---

## 12. How AI Agents Should Report Their Work

After applying changes, an AI agent SHOULD:

1. Ensure the application builds and tests pass.  
2. Update or create a short section in `CHANGELOG.md` or commit messages summarizing:
   - Which security controls were added or modified
   - Any remaining limitations (e.g. legacy Node version, external services preventing stricter security)
3. Keep this `SECURITY.md` **in sync** with the actual implementation. If the app diverges, update this document.

---

By following this document, an AI coding assistant can **fully analyze and harden** the Node.js web application with **no human interaction**, while preserving functionality and avoiding insecure shortcuts.