# Brothers Store API - Backend Implementation Guide

## Overview
This is a complete backend implementation for an e-commerce application with Google OAuth authentication and role-based access control (Admin/User).

## Features Implemented

### 1. **Google OAuth Authentication**
- Users can login using their Google account
- Admin verification based on specific email addresses
- JWT token generation for authenticated requests

### 2. **Role-Based Access Control**
- **Admin Emails:** 
  - nitinparjapat3@gmail.com
  - jaintparjapat2000@gmail.com
- Admin users get "Admin" role automatically
- Other users get "User" role

### 3. **JWT Authentication**
- Secure token-based authentication
- 7-day token expiration
- Claims-based authorization

### 4. **Database**
- User management with email, name, and role
- All existing product, order, cart, and review tables
- Proper relationships and constraints

## Setup Instructions

### Step 1: Update Configuration
Update your `appsettings.json` with your database connection string and Google OAuth credentials:

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

### Step 2: Run Database Migrations
```bash
dotnet ef database update
```

This will create the Users table in your database.

### Step 3: Run the Application
```bash
dotnet run
```

The API will be available at `https://localhost:5001` (or your configured port)

## API Endpoints

### Authentication Endpoints

#### 1. **Google Login**
- **Endpoint:** `POST /api/auth/google-login`
- **Request Body:**
```json
{
  "idToken": "<Google ID Token>"
}
```
- **Response (Success):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-guid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "Admin" | "User",
    "createdAt": "2025-05-02T00:00:00Z"
  }
}
```

#### 2. **Get Current User**
- **Endpoint:** `GET /api/auth/me`
- **Headers:** 
  - `Authorization: Bearer <JWT Token>`
- **Response:**
```json
{
  "id": "user-guid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "Admin" | "User"
}
```

#### 3. **Logout**
- **Endpoint:** `POST /api/auth/logout`
- **Headers:** 
  - `Authorization: Bearer <JWT Token>`
- **Response:**
```json
{
  "message": "Logged out successfully"
}
```

## Frontend Integration (React/Vue Example)

### 1. Install Google Login Library
```bash
npm install @react-oauth/google
```

### 2. Setup Google Login in Frontend
```jsx
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

export function GoogleLoginButton() {
  const handleSuccess = async (credentialResponse) => {
    try {
      // Send the ID token to your backend
      const response = await axios.post('http://localhost:5000/api/auth/google-login', {
        idToken: credentialResponse.credential
      });

      // Save the JWT token
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Redirect based on role
      if (response.data.user.role === 'Admin') {
        window.location.href = '/admin-dashboard';
      } else {
        window.location.href = '/user-dashboard';
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

### 3. API Calls with Authentication
```jsx
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

## File Structure

```
BrothersStoreProductionBackend/
??? Controllers/
?   ??? AuthController.cs          # Authentication endpoints
?   ??? ProductsController.cs
?   ??? CartController.cs
?   ??? OrdersController.cs
?   ??? ReviewsController.cs
?   ??? UsersController.cs
?   ??? WishlistController.cs
??? Entities/
?   ??? User.cs                    # NEW: User entity
?   ??? Product.cs
?   ??? CartItem.cs
?   ??? Order.cs
?   ??? OrderItem.cs
?   ??? Review.cs
?   ??? Address.cs
?   ??? WishlistItem.cs
??? Services/
?   ??? JwtTokenService.cs         # NEW: JWT token generation
?   ??? GoogleAuthService.cs       # NEW: Google OAuth verification
??? Data/
?   ??? AppDbContext.cs            # Database context
??? Migrations/
?   ??? 20260502114741_InitialCreate.cs
?   ??? 20260502120000_AddUsers.cs # NEW: Users table migration
??? Program.cs                      # Application startup
??? appsettings.json               # Configuration
```

## Key Changes Made

### 1. **User Entity** (Entities/User.cs)
- Added User table with Id, Email, Name, Role, and CreatedAt

### 2. **AuthController** (Controllers/AuthController.cs)
- Google login endpoint with token verification
- Current user endpoint
- Logout endpoint

### 3. **Services**
- **JwtTokenService.cs**: Generates JWT tokens with claims
- **GoogleAuthService.cs**: Verifies Google ID tokens

### 4. **Program.cs**
- Added JWT authentication configuration
- Registered services in dependency injection
- Added authentication and authorization middleware

### 5. **Database Migration**
- Created Users table with proper schema

## Admin Access

Only users with these emails will have "Admin" role:
1. `nitinparjapat3@gmail.com`
2. `jaintparjapat2000@gmail.com`

All other users will have "User" role.

## Security Considerations

1. **JWT Secret:** Change the secret in appsettings.json to a strong, unique value
2. **HTTPS:** Always use HTTPS in production
3. **CORS:** Configure CORS policies appropriately for your frontend domain
4. **Token Expiration:** JWT tokens expire after 7 days
5. **Google OAuth:** Keep your Google credentials secure and never expose them in frontend code

## Troubleshooting

### 1. Database Connection Issues
- Verify SQL Server is running
- Check connection string in appsettings.json
- Run migrations: `dotnet ef database update`

### 2. Google Token Verification Fails
- Ensure the ID token is valid and not expired
- Check Google Client ID is correct
- Verify network connectivity to Google's OAuth endpoints

### 3. JWT Token Issues
- Ensure the secret key is at least 32 characters
- Check token hasn't expired
- Verify Authorization header format: `Bearer <token>`

## Next Steps

1. Add additional controllers for admin operations
2. Implement email verification for new users
3. Add refresh token mechanism
4. Implement password reset functionality
5. Add audit logging for admin actions
6. Set up API rate limiting
