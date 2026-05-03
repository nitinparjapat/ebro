# Complete Frontend Setup Guide

## Step 1: Project Setup

### Create Vite React Project
```bash
npm create vite@latest brothers-store-frontend -- --template react
cd brothers-store-frontend
npm install
```

### Install Required Packages
```bash
npm install @react-oauth/google axios react-router-dom
```

## Step 2: Environment Configuration

Create `.env` file:
```env
VITE_GOOGLE_CLIENT_ID=235789455690-abk09k6o73ligh8r30nh8ro50a14mehh.apps.googleusercontent.com
VITE_API_URL=http://localhost:5000/api
```

## Step 3: Setup Main App

### main.jsx
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
```

### App.jsx
```jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import PrivateRoute from './components/PrivateRoute'
import AdminRoute from './components/AdminRoute'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route 
          path="/dashboard" 
          element={<PrivateRoute><Dashboard /></PrivateRoute>} 
        />
        <Route 
          path="/admin" 
          element={<AdminRoute><AdminDashboard /></AdminRoute>} 
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  )
}

export default App
```

## Step 4: API Configuration

### api.js
```jsx
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

### authService.js
```jsx
import api from './api'

export const authService = {
  login: async (idToken) => {
    const response = await api.post('/auth/google-login', { idToken })
    localStorage.setItem('token', response.data.token)
    localStorage.setItem('user', JSON.stringify(response.data.user))
    return response.data
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },

  logout: async () => {
    await api.post('/auth/logout')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  getStoredUser: () => {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  },

  getToken: () => localStorage.getItem('token'),
}

export default authService
```

### adminService.js
```jsx
import api from './api'

export const adminService = {
  getAllUsers: async () => {
    const response = await api.get('/admin/users')
    return response.data
  },

  getUser: async (userId) => {
    const response = await api.get(`/admin/users/${userId}`)
    return response.data
  },

  promoteToAdmin: async (userId) => {
    const response = await api.put(`/admin/users/${userId}/promote`)
    return response.data
  },

  demoteToUser: async (userId) => {
    const response = await api.put(`/admin/users/${userId}/demote`)
    return response.data
  },

  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard/stats')
    return response.data
  },

  getPendingReviews: async () => {
    const response = await api.get('/admin/reviews/pending')
    return response.data
  },

  approveReview: async (reviewId) => {
    const response = await api.put(`/admin/reviews/${reviewId}/approve`)
    return response.data
  },

  rejectReview: async (reviewId) => {
    const response = await api.put(`/admin/reviews/${reviewId}/reject`)
    return response.data
  },

  getAllOrders: async () => {
    const response = await api.get('/admin/orders')
    return response.data
  },

  updateOrderStatus: async (orderId, status) => {
    const response = await api.put(`/admin/orders/${orderId}/status`, { status })
    return response.data
  },
}

export default adminService
```

## Step 5: Components

### components/PrivateRoute.jsx
```jsx
import { Navigate } from 'react-router-dom'
import authService from '../services/authService'

export default function PrivateRoute({ children }) {
  const user = authService.getStoredUser()
  const token = authService.getToken()

  if (!token || !user) {
    return <Navigate to="/login" />
  }

  return children
}
```

### components/AdminRoute.jsx
```jsx
import { Navigate } from 'react-router-dom'
import authService from '../services/authService'

export default function AdminRoute({ children }) {
  const user = authService.getStoredUser()
  const token = authService.getToken()

  if (!token || !user || user.role !== 'Admin') {
    return <Navigate to="/dashboard" />
  }

  return children
}
```

### components/Header.jsx
```jsx
import { useNavigate } from 'react-router-dom'
import authService from '../services/authService'

export default function Header() {
  const navigate = useNavigate()
  const user = authService.getStoredUser()

  const handleLogout = async () => {
    try {
      await authService.logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <header style={{ padding: '1rem', backgroundColor: '#333', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Brothers Store</h1>
          <p>Welcome, {user?.name} ({user?.role})</p>
        </div>
        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Logout
        </button>
      </div>
    </header>
  )
}
```

## Step 6: Pages

### pages/LoginPage.jsx
```jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import authService from '../services/authService'

export default function LoginPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (authService.getToken()) {
      navigate('/dashboard')
    }
  }, [])

  const handleSuccess = async (credentialResponse) => {
    try {
      const data = await authService.login(credentialResponse.credential)
      
      if (data.user.role === 'Admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>Brothers Store</h1>
        <p>Login to your account</p>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => console.log('Login Failed')}
        />
      </div>
    </div>
  )
}
```

### pages/Dashboard.jsx
```jsx
import Header from '../components/Header'
import authService from '../services/authService'

export default function Dashboard() {
  const user = authService.getStoredUser()

  return (
    <div>
      <Header />
      <main style={{ padding: '2rem' }}>
        <h2>User Dashboard</h2>
        <div style={{ backgroundColor: '#f0f0f0', padding: '1rem', borderRadius: '4px' }}>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Name:</strong> {user?.name}</p>
          <p><strong>Role:</strong> {user?.role}</p>
          <p><strong>Joined:</strong> {new Date(user?.createdAt).toLocaleDateString()}</p>
        </div>

        <h3 style={{ marginTop: '2rem' }}>Your Orders</h3>
        <p>Order history would appear here...</p>

        <h3>Your Addresses</h3>
        <p>Saved addresses would appear here...</p>
      </main>
    </div>
  )
}
```

### pages/AdminDashboard.jsx
```jsx
import { useEffect, useState } from 'react'
import Header from '../components/Header'
import adminService from '../services/adminService'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsData, usersData, reviewsData] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAllUsers(),
        adminService.getPendingReviews(),
      ])
      setStats(statsData)
      setUsers(usersData)
      setReviews(reviewsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div><Header /><p>Loading...</p></div>

  const handleApproveReview = async (reviewId) => {
    try {
      await adminService.approveReview(reviewId)
      loadData()
    } catch (error) {
      console.error('Failed to approve review:', error)
    }
  }

  return (
    <div>
      <Header />
      <main style={{ padding: '2rem' }}>
        <h2>Admin Dashboard</h2>

        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: '#e3f2fd', padding: '1rem', borderRadius: '4px' }}>
              <h3>Total Users</h3>
              <p style={{ fontSize: '2rem' }}>{stats.totalUsers}</p>
            </div>
            <div style={{ backgroundColor: '#f3e5f5', padding: '1rem', borderRadius: '4px' }}>
              <h3>Total Orders</h3>
              <p style={{ fontSize: '2rem' }}>{stats.totalOrders}</p>
            </div>
            <div style={{ backgroundColor: '#fff3e0', padding: '1rem', borderRadius: '4px' }}>
              <h3>Pending Reviews</h3>
              <p style={{ fontSize: '2rem' }}>{stats.pendingReviews}</p>
            </div>
          </div>
        )}

        <h3>Users ({users.length})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
          <thead style={{ backgroundColor: '#f0f0f0' }}>
            <tr>
              <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Email</th>
              <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Name</th>
              <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Role</th>
              <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{user.email}</td>
                <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{user.name}</td>
                <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{user.role}</td>
                <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Pending Reviews ({reviews.length})</h3>
        <div>
          {reviews.map(review => (
            <div key={review.id} style={{ backgroundColor: '#fafafa', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
              <p><strong>{review.productTitle}</strong> - {review.rating}?</p>
              <p>{review.text}</p>
              <p><small>By: {review.customerName}</small></p>
              <button
                onClick={() => handleApproveReview(review.id)}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Approve
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
```

## Step 7: Run Frontend

```bash
npm run dev
```

Open: `http://localhost:5173`

---

## Project Structure

```
brothers-store-frontend/
??? src/
?   ??? components/
?   ?   ??? PrivateRoute.jsx
?   ?   ??? AdminRoute.jsx
?   ?   ??? Header.jsx
?   ??? pages/
?   ?   ??? LoginPage.jsx
?   ?   ??? Dashboard.jsx
?   ?   ??? AdminDashboard.jsx
?   ??? services/
?   ?   ??? api.js
?   ?   ??? authService.js
?   ?   ??? adminService.js
?   ??? App.jsx
?   ??? main.jsx
?   ??? index.css
??? .env
??? vite.config.js
??? package.json
```

---

## Testing Flow

1. Open `http://localhost:5173`
2. Click "Login with Google"
3. Use Google account
4. If admin email ? redirect to `/admin`
5. If regular user ? redirect to `/dashboard`
6. View stats and manage content
7. Click logout when done

---

**Status:** ? Complete Frontend Implementation Ready
