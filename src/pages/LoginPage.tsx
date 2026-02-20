import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { StoreFooter } from '../components/StoreFooter'
import { StoreHeader } from '../components/StoreHeader'
import { apiService } from '../services/api'

export const LoginPage = () => {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!username || !password) {
      window.alert('Por favor ingresa usuario y contraseña')
      return
    }

    setLoading(true)
    const success = await apiService.login(username, password)
    setLoading(false)

    if (success) {
      localStorage.setItem('@fl_store_auth', 'true')
      navigate('/admin', { replace: true })
      return
    }

    window.alert('Usuario o contraseña incorrectos')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 via-primary-700 to-primary-500">
      <StoreHeader subtitle="Panel de administrador" />

      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-24 md:px-8">
        <section className="w-full rounded-3xl bg-white p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <img src="/logo.png" alt="FL Store" className="mx-auto mb-4 h-24 w-24 rounded-full bg-white p-2" />
            <h1 className="text-3xl font-bold text-gray-900">Panel de Administrador</h1>
            <p className="mt-1 text-primary-600">FL Store</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Usuario</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Ingresa tu usuario"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none ring-primary-200 transition focus:ring"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Contraseña</span>
              <div className="flex rounded-xl border border-gray-300 bg-white">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="w-full rounded-l-xl px-4 py-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="rounded-r-xl px-4"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary-600 px-4 py-3 text-base font-bold text-white transition hover:bg-primary-700 disabled:opacity-60"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Volver a la tienda
            </button>
          </form>
        </section>
      </main>

      <StoreFooter />
    </div>
  )
}
