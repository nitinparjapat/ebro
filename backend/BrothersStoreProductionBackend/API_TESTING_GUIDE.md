# API Testing Guide

## Using Postman or cURL

### 1. Google Login Endpoint

**POST** `http://localhost:5000/api/auth/google-login`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE4OWNkYzJhODg2YTNhYWIyYzE0YTk1MGFmNDJhY2YwOGNiYWIxZjQiLCJ0eXAiOiJKV1QifQ..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy94bWwyMDAwLzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjM2YjMxYjc5LTkyMTQtNDg0YS04ZDIxLWZhOTRhNjBkNjU5YiIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3htbDIwMDAvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6Im5pdGlucGFyamFwYXQzQGdtYWlsLmNvbSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3htbDIwMDAvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiOiJOaXRpbiBQYXJqYXBhdCIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20veG1sL3htbDIwMDEvMDUvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBZG1pbiIsImV4cCI6MTcxNDE2NTk5MiwiaXNzIjoiQnJvdGhlcnNTdG9yZUFwaSIsImF1ZCI6IkJyb3RoZXJzU3RvcmVDbGllbnQifQ.L-n3XL8Z_uXE_yZpVQVQ8kXhAx1oXQ3H5pXQvH9XQ8o",
  "user": {
    "id": "36b31b79-9214-484a-8d21-fa94a60d6599",
    "email": "nitinparjapat3@gmail.com",
    "name": "Nitin Parjapat",
    "role": "Admin",
    "createdAt": "2025-05-02T10:15:30.123456Z"
  }
}
```

---

### 2. Get Current User

**GET** `http://localhost:5000/api/auth/me`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy94bWwyMDAwLzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjM2YjMxYjc5LTkyMTQtNDg0YS04ZDIxLWZhOTRhNjBkNjU5YiIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3htbDIwMDAvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6Im5pdGlucGFyamFwYXQzQGdtYWlsLmNvbSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3htbDIwMDAvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiOiJOaXRpbiBQYXJqYXBhdCIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20veG1sL3htbDIwMDEvMDUvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBZG1pbiIsImV4cCI6MTcxNDE2NTk5MiwiaXNzIjoiQnJvdGhlcnNTdG9yZUFwaSIsImF1ZCI6IkJyb3RoZXJzU3RvcmVDbGllbnQifQ.L-n3XL8Z_uXE_yZpVQVQ8kXhAx1oXQ3H5pXQvH9XQ8o
```

**Response (200 OK):**
```json
{
  "id": "36b31b79-9214-484a-8d21-fa94a60d6599",
  "email": "nitinparjapat3@gmail.com",
  "name": "Nitin Parjapat",
  "role": "Admin"
}
```

---

### 3. Logout

**POST** `http://localhost:5000/api/auth/logout`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

## cURL Examples

### Login with Google
```bash
curl -X POST http://localhost:5000/api/auth/google-login \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "YOUR_GOOGLE_ID_TOKEN_HERE"
  }'
```

### Get Current User
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

---

## How to Get Google ID Token from Frontend

### Using Google Sign-In Button (React)

1. Install package:
```bash
npm install @react-oauth/google
```

2. Wrap your app with GoogleOAuthProvider:
```jsx
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

export default function Root() {
  return (
    <GoogleOAuthProvider clientId="235789455690-abk09k6o73ligh8r30nh8ro50a14mehh.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  );
}
```

3. Use GoogleLogin component:
```jsx
import { GoogleLogin } from '@react-oauth/google';

export function LoginPage() {
  return (
    <GoogleLogin
      onSuccess={(credentialResponse) => {
        // credentialResponse.credential contains the ID token
        console.log(credentialResponse.credential);
        
        // Send to backend
        sendTokenToBackend(credentialResponse.credential);
      }}
      onError={() => console.log('Login Failed')}
    />
  );
}
```

---

## Testing Flow

1. **Get Google ID Token**: Click Google Sign-In button on frontend
2. **Send to Backend**: POST the token to `/api/auth/google-login`
3. **Receive JWT**: Backend verifies and returns JWT token
4. **Use JWT**: Include in Authorization header for subsequent requests
5. **Check Role**: Response includes user role (Admin or User)

---

## Important Notes

- **Admin Emails**: Only these get Admin role:
  - nitinparjapat3@gmail.com
  - jaintparjapat2000@gmail.com

- **JWT Token**: Valid for 7 days. After expiration, user needs to login again.

- **CORS**: API allows requests from http://localhost:5173 (your Vite frontend)

- **Authentication**: All endpoints except `/api/auth/google-login` require JWT token in Authorization header
