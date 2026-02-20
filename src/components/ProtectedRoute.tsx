import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = localStorage.getItem('@fl_store_auth') === 'true'
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}
