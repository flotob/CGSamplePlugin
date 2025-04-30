# Database Setup (Local PostgreSQL with Docker and Migrations)

This document outlines the proposed setup for integrating a PostgreSQL database into the project for persistent storage, using Docker for local development and `node-pg-migrate` for schema management.

## Goals

-   **Local Development:** Easily run a PostgreSQL instance locally using Docker.
-   **Schema Management:** Use a robust migration tool (`node-pg-migrate`) to manage database schema changes version controlled alongside the codebase.
-   **Environment Consistency:** Use environment variables for database connection details, allowing easy configuration for different environments (local, staging, production on Railway).

## Proposed Tools

1.  **Docker & Docker Compose:** To define and run a PostgreSQL service locally.
2.  **`node-pg-migrate`:** A popular Node.js library for managing PostgreSQL migrations.
3.  **`pg` (node-postgres):** The standard Node.js client library for PostgreSQL.

## Setup Steps

1.  **Install Dependencies:**
    *   Install the necessary Node.js packages:
        ```bash
        yarn add pg node-pg-migrate dotenv
        # Install types for TypeScript development
        yarn add -D @types/pg
        ```
    *   `dotenv` is included to easily load environment variables from a `.env.local` file for local development.

2.  **Create `docker-compose.yml`:**
    *   Create a `docker-compose.yml` file in the project root to define the PostgreSQL service.

3.  **Configure Database Connection:**
    *   Utilize environment variables for database connection details:
        *   `POSTGRES_HOST`
        *   `POSTGRES_PORT`
        *   `POSTGRES_USER`
        *   `POSTGRES_PASSWORD`
        *   `POSTGRES_DB`
    *   Create a `.env.local` file (and add it to `.gitignore`) for local development credentials.
    *   Potentially create a utility file (e.g., `src/lib/db.ts`) to manage the database connection pool using these variables.

4.  **Set up Migrations:**
    *   Create a `migrations` directory in the project root. This is where `node-pg-migrate` will store migration files.
    *   Configure `node-pg-migrate` (it can often use environment variables directly or via a config file if needed). Ensure it uses the same environment variables as the application.

5.  **Add Migration Scripts:**
    *   Add scripts to `package.json` to easily run migration commands.

## Example `docker-compose.yml`

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15 # Use a specific version
    container_name: cg-plugin-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-user} # Use env var or default
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password} # Use env var or default
      POSTGRES_DB: ${POSTGRES_DB:-cgplugindb} # Use env var or default
    ports:
      - "${POSTGRES_PORT:-5432}:5432" # Use env var or default for host port
    volumes:
      - postgres_data:/var/lib/postgresql/data # Persist data locally
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
```

## Example `.env.local`

```dotenv
# .env.local - Add this file to .gitignore!
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=cgplugindb

# Combine into DATABASE_URL for node-pg-migrate convenience
DATABASE_URL=postgres://user:password@localhost:5432/cgplugindb
```

## Example `package.json` Scripts

```json
// package.json (add to "scripts")
"scripts": {
  // ... other scripts
  "db:migrate": "node-pg-migrate",
  "db:migrate:up": "yarn db:migrate up",
  "db:migrate:create": "yarn db:migrate create --migration-file-language ts"
  // Add down, redo scripts as needed
}
```
*Note: `node-pg-migrate` needs the `DATABASE_URL` environment variable set. `dotenv` can help load this from `.env.local` if you call `node -r dotenv/config node_modules/.bin/node-pg-migrate ...` or configure `dotenv` loading early in your application/scripts.*

## Next Steps

1.  **Install dependencies:** Run `yarn add pg node-pg-migrate dotenv` and `yarn add -D @types/pg`.
2.  **Create `docker-compose.yml`:** Add the file to the root directory with the content above.
3.  **Create `.env.local`:** Add the file to the root directory (ensure it's in `.gitignore`).
4.  **Add scripts to `package.json`:** Modify the `scripts` section.
5.  **Create `migrations` directory:** Run `mkdir migrations`.
6.  **Start Docker container:** Run `docker compose up -d`.
7.  **Create first migration:** Run `yarn db:migrate:create --name initial_setup` (or similar).
8.  **Implement Database Client:** Create `src/lib/db.ts` (or similar) to initialize and export a `pg` Pool instance configured with environment variables. 