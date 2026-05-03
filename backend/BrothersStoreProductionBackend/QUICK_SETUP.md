# Quick Setup Checklist

## Files Created/Modified

### ? Created Files:
- [x] `Entities/User.cs` - User entity with email, name, and role
- [x] `Services/JwtTokenService.cs` - JWT token generation service
- [x] `Services/GoogleAuthService.cs` - Google OAuth verification service
- [x] `Controllers/AuthController.cs` - Authentication endpoints
- [x] `Migrations/20260502120000_AddUsers.cs` - Migration for Users table
- [x] `Migrations/20260502120000_AddUsers.Designer.cs` - Migration designer
- [x] `IMPLEMENTATION_GUIDE.md` - Complete implementation guide
- [x] `API_TESTING_GUIDE.md` - API testing examples

### ? Modified Files:
- [x] `Program.cs` - Added JWT authentication and service registration
- [x] `Data/AppDbContext.cs` - Added Users DbSet
- [x] `appsettings.json` - Added JWT and Google OAuth configuration
- [x] `Migrations/AppDbContextModelSnapshot.cs` - Updated model snapshot

---

## Step-by-Step Setup Instructions

### Step 1: Restore NuGet Packages
```bash
dotnet restore
```

### Step 2: Update Database with Migration
```bash
dotnet ef database update
```
This creates the Users table in your SQL Server database.

### Step 3: Update appsettings.json
Verify these settings in your `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=DESKTOP-AEI7D2P\\SQLEXPRESS;Database=BrothersStoreDb;Trusted_Connection=True;TrustServerCertificate=True"
  },
  "JwtSettings": {
    "Secret": "your-super-secret-key-min-32-characters-long-string-here!",
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

### Step 4: Run the Application
```bash
dotnet run
```
Server will run on `https://localhost:5001` (or your configured port)

---

## Key Features Implemented

### 1. Google OAuth Login
- Endpoint: `POST /api/auth/google-login`
- Takes Google ID Token
- Returns JWT token and user data

### 2. Admin Role Assignment
- Email-based admin detection
- Admin emails: `nitinparjapat3@gmail.com`, `jaintparjapat2000@gmail.com`
- Other emails get "User" role

### 3. JWT Authentication
- 7-day token expiration
- Claims include: Id, Email, Name, Role
- Used for subsequent API requests

### 4. User Management
- Get current user: `GET /api/auth/me`
- Logout: `POST /api/auth/logout`

---

## Frontend Integration (Vite + React Example)

### 1. Install Google OAuth
```bash
npm install @react-oauth/google axios
```

### 2. Setup Provider
```jsx
// main.jsx
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId="235789455690-abk09k6o73ligh8r30nh8ro50a14mehh.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);
```

### 3. Login Component
```jsx
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

export function LoginPage() {
  const handleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/google-login', {
        idToken: credentialResponse.credential
      });
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      // Redirect to dashboard
      if (res.data.user.role === 'Admin') {
        window.location.href = '/admin-dashboard';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={() => console.log('Login Failed')}
    />
  );
}
```

### 4. API Interceptor
```jsx
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

## Testing the API

### Using Postman:

1. **Login Endpoint**
   - Method: POST
   - URL: `http://localhost:5000/api/auth/google-login`
   - Body (JSON): `{ "idToken": "YOUR_GOOGLE_ID_TOKEN" }`
   - Response: JWT token and user data

2. **Get Current User**
   - Method: GET
   - URL: `http://localhost:5000/api/auth/me`
   - Header: `Authorization: Bearer YOUR_JWT_TOKEN`

3. **Logout**
   - Method: POST
   - URL: `http://localhost:5000/api/auth/logout`
   - Header: `Authorization: Bearer YOUR_JWT_TOKEN`

---

## Admin Dashboard Access

Only these Gmail addresses will have Admin access:
1. `nitinparjapat3@gmail.com`
2. `jaintparjapat2000@gmail.com`

When these users login, their `role` field will be set to `"Admin"` instead of `"User"`.

---

## Troubleshooting

### Issue: Database Migration Fails
**Solution:** 
```bash
dotnet ef database update --verbose
```
Check SQL Server is running and connection string is correct.

### Issue: Google Token Verification Fails
**Solution:** 
- Ensure Google Client ID is correct
- Check internet connection
- Verify token is not expired

### Issue: JWT Token Not Working
**Solution:**
- Verify token is in Authorization header as: `Bearer {token}`
- Check token hasn't expired (7 days)
- Ensure JWT secret is correctly configured

---

## Project Structure

```
BrothersStoreProductionBackend/
??? Controllers/
?   ??? AuthController.cs (NEW)
?   ??? ProductsController.cs
?   ??? CartController.cs
?   ??? ...
??? Entities/
?   ??? User.cs (NEW)
?   ??? Product.cs
?   ??? ...
??? Services/
?   ??? JwtTokenService.cs (NEW)
?   ??? GoogleAuthService.cs (NEW)
??? Data/
?   ??? AppDbContext.cs (MODIFIED)
??? Migrations/
?   ??? 20260502114741_InitialCreate.cs
?   ??? 20260502120000_AddUsers.cs (NEW)
??? Program.cs (MODIFIED)
??? appsettings.json (MODIFIED)
??? IMPLEMENTATION_GUIDE.md (NEW)
??? API_TESTING_GUIDE.md (NEW)
??? README.md
```

---

## Next Steps (Optional)

1. Add admin-only endpoints with `[Authorize(Roles = "Admin")]` attribute
2. Implement refresh token mechanism
3. Add email verification for new users
4. Implement password reset (for email/password auth)
5. Add audit logging for admin actions
6. Set up rate limiting
7. Add API documentation with Swagger

---

## Support

For detailed information, refer to:
- `IMPLEMENTATION_GUIDE.md` - Complete setup and feature documentation
- `API_TESTING_GUIDE.md` - API endpoints and testing examples

Happy coding! ??
