# Deploy CareFlow on Render Free + Neon Free

This deploys the ASP.NET Core app and its frontend together on Render, with persistent PostgreSQL data and authentication keys in Neon. Use synthetic records for this academic prototype. This is a new database deployment; it does not copy records from your local SQL Server database.

## 1. Create the Neon database

1. Sign in at https://console.neon.tech and create a Free project named `careflow`.
2. Choose a region close to your Render service. Start with a new, empty database. Do not run `deploy/schema.sql`: that file is for SQL Server.
3. Open **Connect**, select your database and role, and obtain the connection details. For this small single-instance app, use the direct endpoint (connection pooling off); Npgsql supplies application-side pooling.
4. Build an Npgsql connection string using those details:

   ```text
   Host=YOUR_ENDPOINT.neon.tech;Port=5432;Database=neondb;Username=YOUR_ROLE;Password=YOUR_PASSWORD;SSL Mode=VerifyFull;Channel Binding=Require;Timeout=30;Maximum Pool Size=10
   ```

   Replace the hostname, database, role, and password with the actual Neon values. Paste only the connection string, without shell commands or surrounding shell quotes. A `postgresql://...` URL is not accepted by this app. If a password contains semicolons, surround its value with double quotes and double any embedded double quotes.

## 2. Push the prepared source to GitHub

Render needs the current source, including `render.yaml`, the PostgreSQL package references, and all frontend assets. Review your working tree and commit the intended changes, then push your branch to `https://github.com/iyush05/CareFlow`.

Never commit `.env`, database passwords, or API keys. Existing local changes need to be included if they are required by the app; the deployment setup does not publish them automatically.

## 3. Create the Render service

1. Sign in at https://dashboard.render.com and choose **New > Blueprint**.
2. Connect the CareFlow GitHub repository and select the branch containing these changes.
3. Render reads `render.yaml`. Confirm the web service is **Free**, uses **Docker**, and has no paid resources attached.
4. Supply the prompted values:

   | Variable | First deployment value |
   |---|---|
   | `ConnectionStrings__Hospital` | Your Npgsql connection string from step 1 |
   | `InitializeDatabase` | `true` |
   | `Bootstrap__Email` | Your administrator email |
   | `Bootstrap__Password` | A unique password with at least 14 characters |

5. Deploy and wait for the build and health check to pass. Render supplies the public HTTPS URL; no purchased domain is necessary.

The Blueprint selects `Production`, `PostgreSql`, and port `8080`. Render automatically supplies `RENDER=true`, which enables protocol forwarding for its HTTPS ingress. Do not set `RENDER=true` on a server directly exposed to clients. Render handles public HTTP-to-HTTPS redirects; `/health` remains available to internal HTTP health checks. Client IP forwarding is deliberately disabled, so the login limiter can be shared by visitors behind the same proxy.

## 4. Verify and finish initialization

1. Open `https://YOUR-SERVICE.onrender.com/health`; expect `{"status":"ok"}`. This is a process health check, not a database test.
2. Open the homepage, choose the Admin portal, and sign in using your bootstrap credentials. The public app does not create the documented development/demo accounts.
3. Create a department, ward, bed, patient, and admission to confirm database access. Test discharge, care plans, CSV import, and export with synthetic data.
4. In Render's **Environment** settings, set `InitializeDatabase=false` and remove `Bootstrap__Email` and `Bootstrap__Password`. Save and redeploy. These entries use `sync:false`, so later Blueprint syncs do not overwrite your choices.
5. Confirm your records remain and the existing login session still works after redeploy. Set `AllowedHosts` to your actual `YOUR-SERVICE.onrender.com` hostname (no scheme or path); separate additional custom domains with semicolons.

Production begins empty except for your administrator account. Create staff accounts through the app. `EnsureCreated` initializes only a fresh database; it does not upgrade existing schemas. Add reviewed migrations before future schema changes.

## Optional Gemini drafting

Add `AI__ApiKey` in Render's Environment settings. If needed, also set `AI__Model` to a model available to your account. Render does not load your laptop's `.env`. The structured template works without an API key. Provider usage has its own quotas and is separate from hosting.

## Free plan behavior

- Render Free sleeps after 15 minutes without inbound traffic. The first subsequent visit can take about a minute. Its local filesystem is temporary; clinical records and Data Protection keys are stored in Neon instead.
- Neon can suspend idle compute and resume on connection. The app retries transient PostgreSQL failures. Free compute/storage allowances still apply.
- Keep both services on their Free plans. Do not add a Render disk or paid service for this setup.
- Data Protection keys are stored in the database without an additional application-level encryption wrapper. Protect the Neon credentials and database access as carefully as the application data.

## Troubleshooting

- **Build cannot restore packages:** inspect the Render build log; it must build the current .NET 10 Dockerfile.
- **Database connection fails:** check `DatabaseProvider=PostgreSql`, use Npgsql key/value syntax, and verify the exact host/role/password. Do not disable TLS certificate verification.
- **Missing tables:** use a fresh empty database and set `InitializeDatabase=true` for the controlled first boot. Existing tables from another app can prevent `EnsureCreated` from creating CareFlow's schema.
- **Login fails:** choose Admin, use the bootstrap credentials, and confirm initialization completed. Development passwords do not work in Production.
- **AI unavailable:** set `AI__ApiKey` on Render or use Structured template.

References: [Render Blueprints](https://render.com/docs/blueprint-spec), [Render Free limitations](https://render.com/docs/free), [Neon .NET connections](https://neon.com/docs/guides/dotnet-npgsql), [Neon pricing](https://neon.com/pricing).
