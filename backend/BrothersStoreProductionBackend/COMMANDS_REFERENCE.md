# Complete Command Reference

## ?? Backend Setup Commands

### Initial Setup
```bash
# Navigate to project
cd BrothersStoreProductionBackend

# Restore NuGet packages
dotnet restore

# Update database with migration
dotnet ef database update

# Run the backend
dotnet run
```

### Backend will be available at:
```
http://localhost:5000
https://localhost:5001
Swagger UI: https://localhost:5001/swagger
```

---

## ?? Frontend Setup Commands (Vite + React)

### Create New Project
```bash
npm create vite@latest brothers-store-frontend -- --template react
cd brothers-store-frontend
npm install
```

### Install Dependencies
```bash
npm install @react-oauth/google axios react-router-dom
```

### Run Frontend
```bash
npm run dev
```

### Frontend will be available at:
```
http://localhost:5173
```

---

## ?? Testing with cURL

### 1. Google Login
```bash
curl -X POST http://localhost:5000/api/auth/google-login \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE4OWNkYzJhODg4NmEzYWFiMmMxNGE5NTBhZjQyYWNmMDhjYmFiMWY0In0..."
  }'
```

### 2. Get Current User
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### 3. Get Dashboard Stats (Admin Only)
```bash
curl -X GET http://localhost:5000/api/admin/dashboard/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### 4. Get All Users (Admin Only)
```bash
curl -X GET http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### 5. Approve Review (Admin Only)
```bash
curl -X PUT http://localhost:5000/api/admin/reviews/1/approve \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### 6. Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

---

## ??? Database Commands

### Update Database with Migrations
```bash
dotnet ef database update
```

### Create New Migration (if you modify models)
```bash
dotnet ef migrations add YourMigrationName
```

### View Pending Migrations
```bash
dotnet ef migrations list
```

### Drop Database (caution!)
```bash
dotnet ef database drop
```

### Apply Specific Migration
```bash
dotnet ef database update 20260502120000_AddUsers
```

---

## ?? Unit Testing (Optional)

### Create Test Project
```bash
dotnet new xunit -n BrothersStoreApi.Tests
cd BrothersStoreApi.Tests
dotnet add reference ../BrothersStoreApi/BrothersStoreApi.csproj
```

### Run Tests
```bash
dotnet test
```

### Run Tests with Coverage
```bash
dotnet test /p:CollectCoverage=true
```

---

## ?? Publish Backend (Production)

### Publish to Folder
```bash
dotnet publish -c Release -o ./bin/Release/publish
```

### Run Published Version
```bash
.\bin\Release\publish\BrothersStoreApi.exe
```

### Create Docker Image
```bash
docker build -t brothers-store-api .
docker run -p 5000:5000 brothers-store-api
```

---

## ?? Publish Frontend (Production)

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel --prod
```

### Deploy to Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

---

## ?? Git Commands

### Initialize Repository
```bash
git init
git add .
git commit -m "Initial commit: Full authentication system with Google OAuth and admin roles"
```

### Add Remote
```bash
git remote add origin https://github.com/yourusername/brothers-store.git
```

### Push to GitHub
```bash
git push -u origin main
```

---

## ?? Debugging Commands

### View Recent Logs
```bash
dotnet run 2>&1 | tail -50
```

### Enable Detailed Logging
```bash
# Add to appsettings.json
"Logging": {
  "LogLevel": {
    "Default": "Debug",
    "Microsoft": "Information"
  }
}
```

### Check Database Connection
```bash
# In Package Manager Console
Update-Database -Verbose
```

---

## ?? Useful Development Commands

### Clean Build
```bash
dotnet clean
dotnet build
```

### Format Code
```bash
dotnet format
```

### Run Specific Controller
```bash
# Test just auth endpoints
curl -v http://localhost:5000/api/auth/me
```

### Watch for Changes (auto-rebuild)
```bash
dotnet watch run
```

---

## ?? Deploy to Azure (Optional)

### Login to Azure
```bash
az login
```

### Create Resource Group
```bash
az group create --name BrothersStoreRG --location eastus
```

### Create App Service
```bash
az appservice plan create --name BrothersStorePlan --resource-group BrothersStoreRG --sku F1
az webapp create --resource-group BrothersStoreRG --plan BrothersStorePlan --name brothers-store-api
```

### Publish to Azure
```bash
dotnet publish -c Release
az webapp up --name brothers-store-api --resource-group BrothersStoreRG
```

---

## ?? Environment Configuration

### Backend Environment Variables
```bash
# .env or system environment
CONNECTIONSTRING="Server=YOUR_SERVER;Database=BrothersStoreDb;..."
JWTSECRET="your-super-secret-key-min-32-characters..."
GOOGLECLIENTID="235789455690-abk09k6o73ligh8r30nh8ro50a14mehh.apps.googleusercontent.com"
GOOGLECLIENTSECRET="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"
```

### Frontend Environment Variables
```bash
# .env in React project
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=235789455690-abk09k6o73ligh8r30nh8ro50a14mehh.apps.googleusercontent.com
```

---

## ?? Common Workflows

### Full Development Setup
```bash
# Terminal 1 - Backend
cd BrothersStoreProductionBackend
dotnet restore
dotnet ef database update
dotnet run

# Terminal 2 - Frontend
cd brothers-store-frontend
npm install
npm run dev
```

### Testing Admin Features
```bash
# 1. Login with: nitinparjapat3@gmail.com
# 2. Get JWT token from response
# 3. Use token in admin endpoints
curl -X GET http://localhost:5000/api/admin/dashboard/stats \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

### Adding New Admin Email
```csharp
// Edit Controllers/AdminController.cs or AuthController.cs
// Update AdminEmails list:
private static readonly List<string> AdminEmails = new()
{
    "nitinparjapat3@gmail.com",
    "jaintparjapat2000@gmail.com",
    "new.admin@gmail.com"  // Add here
};
```

---

## ?? Production Checklist

Before deploying to production:

```bash
? dotnet publish -c Release
? Update appsettings.Production.json with real values
? Change JWT secret to a strong value
? Use HTTPS only
? Enable CORS for your domain
? Set up database backups
? Configure logging and monitoring
? Test with production database
? Set up SSL certificate
? Configure firewall rules
? Test admin endpoints
? Verify Google OAuth credentials
? Load test the API
```

---

## ?? Quick Help

### Port Already in Use
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (Windows)
taskkill /PID {PID} /F

# Kill process (Linux/Mac)
lsof -ti:5000 | xargs kill -9
```

### Clear Node Modules
```bash
rm -rf node_modules
npm install
```

### Clear NuGet Cache
```bash
dotnet nuget locals all --clear
```

---

## ?? Documentation Commands

### Generate API Documentation
```bash
# Swagger is available at:
https://localhost:5001/swagger

# Download OpenAPI spec:
https://localhost:5001/swagger/v1/swagger.json
```

---

## ? You're All Set!

All commands are ready to use. Your backend is fully functional with:
- ? Google OAuth
- ? JWT Authentication
- ? Admin Roles
- ? Database Integration
- ? Production Ready

**Run the backend and frontend, then test the login flow!** ??

---

**Need help?** Refer to the documentation files included in the project.
