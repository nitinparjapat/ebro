# Brothers Store Deployment (Free Tier)

This setup deploys:
- Backend: Render Web Service (free tier)
- Frontend: Render Static Site (free tier)
- Database: Neon PostgreSQL (free tier) or Supabase PostgreSQL (free tier)

## 1) Create free PostgreSQL database
1. Create a Neon or Supabase project.
2. Copy the connection string in URL form:
   - `postgres://USER:PASSWORD@HOST:5432/DBNAME`

## 2) Deploy backend on Render
1. Push this repo to GitHub.
2. In Render, create a new Web Service from your repo.
3. Use root directory: `backend/BrothersStoreProductionBackend`.
4. Build command: `dotnet publish -c Release -o out`
5. Start command: `dotnet out/BrothersStoreApi.dll`
6. Add environment variables:
   - `ASPNETCORE_ENVIRONMENT=Production`
   - `ASPNETCORE_URLS=http://0.0.0.0:10000`
   - `DATABASE_URL=<your postgres url>`
   - `JwtSettings__Secret=<long random secret 32+ chars>`
   - `JwtSettings__Issuer=BrothersStoreApi`
   - `JwtSettings__Audience=BrothersStoreClient`
   - `Google__ClientId=<google client id>`
   - `Google__ClientSecret=<google client secret>`
   - `Cors__AllowedOrigins__0=<your frontend url>`
   - `PublicSite__BaseUrl=<your frontend url>`
   - `PublicSite__LogoUrl=<your frontend url>/bs_logo_hd.png`

## 3) Deploy frontend on Render
1. Create a new Static Site from the same repo.
2. Root directory: `ui/brothersStore-ui`
3. Build command: `npm ci && npm run build`
4. Publish directory: `dist`
5. Add environment variables:
   - `VITE_API_BASE_URL=<your backend url>/api`
   - `VITE_GOOGLE_CLIENT_ID=<google client id>`

## 4) Post-deploy checks
1. Open frontend and test login.
2. Confirm API health with any GET endpoint.
3. Place a test order.
4. Check Render backend logs for migration startup success.

## Security hardening already done in code
- Added security headers (`X-Content-Type-Options`, `X-Frame-Options`, CSP, HSTS in prod).
- Enforced HTTPS redirection.
- Kept rate limiter active for API and auth endpoints.
- Removed SQL Server-only startup SQL that could fail and expose internals.
- Moved sensitive values to environment-variable flow.
- Package vulnerability checks run: no known vulnerabilities currently.
