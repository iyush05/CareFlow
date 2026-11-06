# Deployment and source control

## Local source control
The repository contains incremental commits for planning, backend, frontend, verification, and documentation. The owner will push to GitHub manually.

```bash
git remote add origin https://github.com/YOUR_ACCOUNT/careflow.git
git push -u origin main
```

Do not add `.env`, local databases, or API keys. `.gitignore` excludes them. CI builds and runs API integration checks on push and pull requests. No remote repository was created automatically.

## Local SQL Server stack
1. Install/start Docker with at least 2 GB available to SQL Server (4 GB or more recommended for the complete stack).
2. Copy `.env.example` to `.env`; choose your password. This task may already have created an ignored `.env` with a generated password.
3. Run `docker compose up --build -d`.
4. Visit http://localhost:5080 and sign in with the documented development credentials.
5. Run `docker compose logs careflow` for diagnostics and `docker compose stop` to stop without deleting the database volume.

Port 1433 and web port 5080 bind only to loopback. SQL data persists in the named volume. Do not use `docker compose down -v` unless deliberately discarding the development database.

## Production target: Linux Docker host + SQL Server / Azure SQL
The supplied Dockerfile builds the actual .NET application. It does not deploy a static mockup. Use an x86-64 host for SQL Server, or an external Azure SQL database. A Sites/Workers host cannot run this ASP.NET Core process.

Build the image:

```bash
docker build -t careflow:1.0 .
```

Configure these environment settings through the host secret/configuration store:

| Key | Value |
|---|---|
| ASPNETCORE_ENVIRONMENT | Production |
| DatabaseProvider | SqlServer |
| ConnectionStrings__Hospital | SQL Server/Azure SQL connection string with Encrypt=True and trusted certificate |
| InitializeDatabase | true only for the first, controlled initialization of an empty database |
| Bootstrap__Email | initial administrator email |
| Bootstrap__Password | initial secret password of at least 14 characters |
| AI__ApiKey | optional provider key |
| AI__Endpoint | HTTPS provider endpoint if overriding the default |
| AI__Model | model available to the configured provider account |
| AllowedHosts | deployed host name |

Initial initialization requires database schema-creation privileges. After initialization, remove bootstrap secrets, set InitializeDatabase=false, and use an application identity with only required CRUD permissions. `deploy/schema.sql` is an inspectable SQL Server schema export. EF EnsureCreated is suitable for first creation, not upgrades of existing schemas. Add versioned EF migrations before deploying later schema changes.

Expose the application through a configured HTTPS endpoint. For a reverse proxy, explicitly configure trusted forwarded headers and persist ASP.NET Core Data Protection keys outside ephemeral containers; otherwise secure-cookie/redirect behavior and session continuity will be affected. Do not enable unconditional trust of forwarded headers on a directly exposed server. The supplied Compose file is for local Development and is not a hardened production proxy configuration.

## Azure App Service option
1. Create Azure SQL and a database, with network access restricted to the application.
2. Build and publish the container image to your registry.
3. Create an App Service for Containers and configure the image and application port 8080.
4. Require HTTPS, configure the app's settings/secrets and trusted proxy headers, and use a persistent Data Protection key store.
5. Initialize the empty database once with bootstrap credentials, then remove bootstrap settings.
6. Validate `/health`, sign-in, resource CRUD, patient admission/discharge, report export, and provider drafting if configured.
7. Configure monitoring, backups and restore tests before introducing real records.

Cloud deployment needs an authenticated hosting account, destination, and database credentials. No production URL is claimed by this repository. GitHub pushing is explicitly left to the owner.

## Optional AI
A provider key is never written into the frontend. The endpoint is an HTTPS server configuration value, not an end-user supplied URL. Drafting sends clinical text to the selected provider and returns an editable draft. Use synthetic records during evaluation. A missing key returns 503; the UI retains the template option.
