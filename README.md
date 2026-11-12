# CareFlow

**Hospital Resource & Patient Readmission Analytics** — a working ASP.NET Core application with a minimalist light interface, SQL Server / Entity Framework Core, role-based authentication, patient workflows, and discharge drafting.

![CareFlow dashboard](docs/screenshots/dashboard.png)

## Running result

The completed local Docker deployment is available at **http://localhost:5080**, backed by Microsoft SQL Server. Start/restart with `docker compose up -d`. Stop the `careflow` container before using the alternative SQLite launcher on the same port.

## Start locally

Prerequisite: .NET 10 SDK. On this machine a temporary SDK is also available at `/tmp/careflow-dotnet`.

```bash
bash scripts/run-local.sh
```

Open **http://localhost:5080**. This development shortcut uses SQLite and seeds synthetic patients. The configured deployment database is **Microsoft SQL Server**, not SQLite.

| Portal | Email | Development password |
|---|---|---|
| Admin | admin@careflow.local | CareFlow@Demo2026! |
| Staff / User | staff@careflow.local | CareFlow@Demo2026! |

Use `/?portal=staff` for the staff login entry point; the login screen also has a portal selector. Both portal roles are enforced on the server. Users are clinical staff, not patients.

## Run with SQL Server

Start Docker, copy `.env.example` to `.env`, and choose a strong `SQL_PASSWORD`.

```bash
cp .env.example .env
# Edit .env before starting.
docker compose up --build -d
```

Open http://localhost:5080. This Compose setup is a **local development** deployment and deliberately seeds demonstration accounts. SQL Server runs as linux/amd64; Apple Silicon requires compatible emulation and is not Microsoft's supported production platform. Use an x86-64 Linux host or Azure SQL for deployment.

If using an existing SQL Server:

```bash
export ASPNETCORE_ENVIRONMENT=Development
export DatabaseProvider=SqlServer
export ConnectionStrings__Hospital='Server=localhost,1433;Database=CareFlow;User Id=YOUR_USER;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=True'
dotnet run --project src/CareFlow.Api --urls http://localhost:5080
```

Use a trusted server certificate and `TrustServerCertificate=False` outside local development. Initial schema is created by EF Core `EnsureCreated` on an empty development database. See `docs/DEPLOYMENT.md` for controlled production initialization and schema evolution limitations.

## What is implemented

- Eight related domain tables plus a user table, EF Core relationships, restricted deletion, unique record numbers, and filtered unique indexes for active bed/patient assignments.
- Admin and staff login, password hashing, HttpOnly session cookies, CSRF tokens, login throttling, and server-side role authorization.
- Patient, admission, bed, ward, department, note, care-plan, and follow-up CRUD.
- Current occupancy, admission history, completed-stay length, mature-cohort 30-day readmission metrics, and ward utilization.
- Responsive UI with search, sorting, status filtering, bed overview, care-plan editor, and account creation.
- Validated CSV file import, Excel-compatible CSV report export, print/save-to-PDF care plans, and optional AI drafting.
- Swagger, Postman collection, real HTTP integration tests, browser smoke tests, Docker configuration, and GitHub Actions CI.

## AI configuration

Set `AI__ApiKey` in the server environment. Optionally set `AI__Endpoint` (HTTPS chat-completions-compatible endpoint) and `AI__Model`. The default model setting is an example; select a model available to your account. In Discharge studio choose **AI plain-language draft**. The server sends the diagnosis and clinician-note text; patient name/record-number fields are not included automatically. Do not enter identifying details in notes intended for external processing.

Without credentials, use **Structured template**. Templates are explicitly labeled and do not pretend to be AI output. AI failures return a clear error. Drafting never automatically approves a plan; an authorized clinician must review it. API-key integration is implemented, but a live provider call requires your configured credentials.

## Verification

With the local development server running:

```bash
python3 tests/api_smoke.py
node --check src/CareFlow.Api/wwwroot/app.js
dotnet build src/CareFlow.Api -c Release
```

Browser checks use Playwright plus installed Chrome:

```bash
npm install --prefix /tmp/careflow-browser playwright
node tests/browser-smoke.cjs
```

For a different Playwright installation set `PLAYWRIGHT_MODULE` to its module path. Open `/swagger` in Development, or import `docs/CareFlow.postman_collection.json` into Postman. Obtain CSRF before login and refresh it after login; the Postman collection handles token capture.

## Project guide

| Deliverable | File |
|---|---|
| Detailed implementation plan | [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) |
| Full academic report, ER, architecture, DFD | [docs/PROJECT_REPORT.md](docs/PROJECT_REPORT.md) |
| Deployment and GitHub instructions | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| API reference and testing notes | [docs/API.md](docs/API.md) |
| Verification evidence | [docs/VERIFICATION.md](docs/VERIFICATION.md) |
| Final evaluation demo and contributions | [docs/EVALUATION.md](docs/EVALUATION.md) |
| Sample approved care-plan PDF | [docs/sample-care-plan.pdf](docs/sample-care-plan.pdf) |
| PowerPoint deck | [docs/CareFlow-Presentation.pptx](docs/CareFlow-Presentation.pptx) |
| SQL Server initial schema | [deploy/schema.sql](deploy/schema.sql) |

## Scope

An academic prototype using synthetic data. It does not establish a reduction in real readmissions, provide a validated prediction model, or replace clinical judgment. The CSV export is Excel-compatible, not an XLSX workbook; PDF output uses the browser print dialog. No email-delivery feature is claimed. SQL Server/GitHub/cloud verification status is documented separately from local test results.
