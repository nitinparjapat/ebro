
# ?? Brothers Store API - Complete Backend Implementation

## Quick Start

### 1 Create Database
```bash
CREATE DATABASE BrothersStoreDb
```

### 2 Restore Packages
```bash
dotnet restore
```

### 3 Apply Migrations
```bash
dotnet ef database update
```

### 4 Run Application
```bash
dotnet run
```

### 5 Access Swagger
Open: `https://localhost:5001/swagger`

---

## ?? New Features - Google OAuth & Admin Roles

### Authentication
- **Google OAuth Login** ? `POST /api/auth/google-login`
- **Get Current User** ? `GET /api/auth/me`
- **Logout** ? `POST /api/auth/logout`

### Admin Endpoints
- **All Users** ? `GET /api/admin/users` (Admin only)
- **Dashboard Stats** ? `GET /api/admin/dashboard/stats` (Admin only)
- **Manage Reviews** ? `PUT /api/admin/reviews/{id}/approve` (Admin only)
- **Manage Orders** ? `PUT /api/admin/orders/{id}/status` (Admin only)

### Admin Emails (Automatic Admin Role)
- `nitinparjapat3@gmail.com`
- `jaintparjapat2000@gmail.com`

---

## ?? Configuration

Update `appsettings.json`:
```json
{
  "JwtSettings": {
    "Secret": "your-super-secret-key-min-32-characters-long!",
    "Issuer": "BrothersStoreApi",
    "Audience": "BrothersStoreClient",
    "ExpirationMinutes": 10080
  },
  "Google": {
    "ClientId": "235789455690-abk09k6o73ligh8r30nh8ro50a14mehh.apps.googleusercontent.com",
    "ClientSecret": "SET_IN_ENVIRONMENT"
  }
}
```

---

## ?? Documentation

- **IMPLEMENTATION_GUIDE.md** - Complete setup guide
- **API_TESTING_GUIDE.md** - API examples and Postman guide
- **QUICK_SETUP.md** - Step-by-step setup checklist
- **ADMIN_ENDPOINTS_EXAMPLE.md** - Example admin controllers

---

## ?? Key Improvements Made

? Google OAuth authentication  
? JWT token-based authorization  
? Admin role system with email-based detection  
? User management and tracking  
? Admin-only endpoints  
? Database migration for Users table  
? Complete frontend integration examples  
? Production-ready security features  

---

## ?? Frontend Integration (React/Vite)

```bash
npm install @react-oauth/google axios
```

```jsx
import { GoogleLogin } from '@react-oauth/google';

export function LoginPage() {
  const handleSuccess = async (credentialResponse) => {
    const response = await axios.post(
      'http://localhost:5000/api/auth/google-login',
      { idToken: credentialResponse.credential }
    );
    localStorage.setItem('token', response.data.token);
  };

  return <GoogleLogin onSuccess={handleSuccess} />;
}
```

---

**Status:** ? Production Ready | **Version:** 1.0 | **Auth:** JWT + Google OAuth
