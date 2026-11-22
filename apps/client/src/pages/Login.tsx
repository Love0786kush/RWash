// apps/client/src/pages/Login.tsx
// Redirect — the actual login page is ClientLogin.tsx
import { Navigate } from 'react-router-dom'

export default function Login() {
  return <Navigate to="/login" replace />
}
