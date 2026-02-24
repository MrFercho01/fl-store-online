import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '../services/api'

interface ProtectedRouteProps {
  children: ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = authService.hasToken()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}
