import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authService } from '../services/api'

interface StoreHeaderProps {
  subtitle: string
  onLogoLongPress?: () => void
}

export const StoreHeader = ({ subtitle, onLogoLongPress }: StoreHeaderProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const [welcomeText, setWelcomeText] = useState('Bienvenido cliente')
  const [isAdmin, setIsAdmin] = useState(false)
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false)
  const timerRef = useRef<number | null>(null)
  const adminMenuRef = useRef<HTMLDivElement | null>(null)
  const adminMenuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const adminMenuItemRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const isAuthenticated = authService.hasToken()
    setIsAdmin(isAuthenticated)
    setWelcomeText(isAuthenticated ? 'Bienvenido Admin' : 'Bienvenido cliente')
    setIsAdminMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isAdminMenuOpen) return

    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target) return

      if (adminMenuRef.current && !adminMenuRef.current.contains(target)) {
        setIsAdminMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAdminMenuOpen(false)
        adminMenuTriggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDownOutside)
    document.addEventListener('touchstart', handlePointerDownOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside)
      document.removeEventListener('touchstart', handlePointerDownOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isAdminMenuOpen])

  useEffect(() => {
    if (!isAdminMenuOpen) return
    adminMenuItemRefs.current[0]?.focus()
  }, [isAdminMenuOpen])

  const startPress = () => {
    if (!onLogoLongPress) return
    timerRef.current = window.setTimeout(() => {
      onLogoLongPress()
    }, 3000)
  }

  const cancelPress = () => {
    if (!timerRef.current) return
    window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const handleLogout = () => {
    authService.clearToken()
    setIsAdmin(false)
    setIsAdminMenuOpen(false)
    setWelcomeText('Bienvenido cliente')
    window.alert('Sesión cerrada correctamente')
    navigate('/', { replace: true })
  }

  const handleAdminMenuItemKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const items = adminMenuItemRefs.current
    const total = items.length
    if (total === 0) return

    if (event.key === 'Tab') {
      event.preventDefault()

      if (event.shiftKey) {
        const prevIndex = (index - 1 + total) % total
        items[prevIndex]?.focus()
        return
      }

      const nextIndex = (index + 1) % total
      items[nextIndex]?.focus()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const nextIndex = (index + 1) % total
      items[nextIndex]?.focus()
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const prevIndex = (index - 1 + total) % total
      items[prevIndex]?.focus()
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      items[0]?.focus()
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      items[total - 1]?.focus()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setIsAdminMenuOpen(false)
      adminMenuTriggerRef.current?.focus()
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 shadow-lg backdrop-blur-sm py-2'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 md:px-8">
        <button
          type="button"
          className="group flex min-w-0 shrink-0 items-center gap-2 text-left md:gap-3"
          onMouseDown={startPress}
          onMouseUp={cancelPress}
          onMouseLeave={cancelPress}
          onTouchStart={startPress}
          onTouchEnd={cancelPress}
        >
          <div className="relative">
            <div
              className={`absolute -inset-1 rounded-full blur opacity-60 transition duration-300 ${
                isScrolled
                  ? 'bg-linear-to-r from-primary-400 to-primary-600'
                  : 'bg-linear-to-r from-white to-primary-200'
              }`}
            />
            <img
              src="/logo.png"
              alt="FL Store"
              className={`relative h-12 w-12 rounded-full border-2 bg-white object-contain md:h-16 md:w-16 ${
                isScrolled ? 'border-primary-500' : 'border-white shadow-lg'
              }`}
            />
          </div>
          <div className="min-w-0">
            <p
              className={`truncate text-sm font-bold leading-tight sm:text-lg md:text-2xl ${
                isScrolled ? 'text-gray-900' : 'text-white drop-shadow-lg'
              }`}
            >
              FL Store
            </p>
            <p
              className={`hidden text-[10px] italic sm:block md:text-sm ${
                isScrolled ? 'text-primary-600' : 'text-orange-300 drop-shadow'
              }`}
            >
              {subtitle}
            </p>
          </div>
        </button>

        <nav className="flex flex-wrap items-center justify-end gap-2 text-xs font-semibold md:gap-5 md:text-sm">
          <Link
            to="/"
            className={`whitespace-nowrap ${isScrolled ? 'text-gray-700' : 'text-white'} transition hover:text-primary-500`}
          >
            Tienda
          </Link>
          {isAdmin && (
            <>
              <div ref={adminMenuRef} className="relative md:hidden">
                <button
                  ref={adminMenuTriggerRef}
                  type="button"
                  onClick={() => setIsAdminMenuOpen((prev) => !prev)}
                  aria-label="Abrir menú de administrador"
                  aria-haspopup="menu"
                  aria-expanded={isAdminMenuOpen}
                  aria-controls="admin-mobile-menu"
                  className={`rounded-full border px-3 py-1 ${
                    isScrolled
                      ? 'border-primary-200 bg-white text-primary-700'
                      : 'border-white/40 bg-white/10 text-white'
                  }`}
                >
                  Admin ▾
                </button>

                {isAdminMenuOpen && (
                  <div
                    id="admin-mobile-menu"
                    role="menu"
                    aria-label="Menú de administrador"
                    className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
                  >
                    <button
                      ref={(element) => {
                        adminMenuItemRefs.current[0] = element
                      }}
                      type="button"
                      role="menuitem"
                      onKeyDown={(event) => handleAdminMenuItemKeyDown(event, 0)}
                      onClick={() => {
                        setIsAdminMenuOpen(false)
                        navigate('/admin')
                      }}
                      className="block w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Crear
                    </button>
                    <button
                      ref={(element) => {
                        adminMenuItemRefs.current[1] = element
                      }}
                      type="button"
                      role="menuitem"
                      onKeyDown={(event) => handleAdminMenuItemKeyDown(event, 1)}
                      onClick={() => {
                        setIsAdminMenuOpen(false)
                        navigate('/admin/productos')
                      }}
                      className="block w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Gestionar
                    </button>
                    <button
                      ref={(element) => {
                        adminMenuItemRefs.current[2] = element
                      }}
                      type="button"
                      role="menuitem"
                      onKeyDown={(event) => handleAdminMenuItemKeyDown(event, 2)}
                      onClick={() => {
                        setIsAdminMenuOpen(false)
                        navigate('/admin/comentarios')
                      }}
                      className="block w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Comentarios
                    </button>
                    <button
                      ref={(element) => {
                        adminMenuItemRefs.current[3] = element
                      }}
                      type="button"
                      role="menuitem"
                      onKeyDown={(event) => handleAdminMenuItemKeyDown(event, 3)}
                      onClick={handleLogout}
                      className="block w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Salir
                    </button>
                  </div>
                )}
              </div>

              <div className="hidden items-center gap-2 md:flex">
                <Link
                  to="/admin"
                  className={`whitespace-nowrap ${isScrolled ? 'text-gray-700' : 'text-white'} transition hover:text-primary-500`}
                >
                  Crear
                </Link>
                <Link
                  to="/admin/productos"
                  className={`whitespace-nowrap ${isScrolled ? 'text-gray-700' : 'text-white'} transition hover:text-primary-500`}
                >
                  Gestionar
                </Link>
                <Link
                  to="/admin/comentarios"
                  className={`whitespace-nowrap ${isScrolled ? 'text-gray-700' : 'text-white'} transition hover:text-primary-500`}
                >
                  Comentarios
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`whitespace-nowrap ${isScrolled ? 'text-rose-600' : 'text-rose-200'} transition hover:text-rose-500`}
                >
                  Salir
                </button>
              </div>
            </>
          )}
          <span
            className={`select-none rounded-full px-3 py-1 text-xs md:text-sm ${
              isScrolled
                ? 'bg-primary-100 text-primary-700'
                : 'bg-white/20 text-white backdrop-blur-sm'
            }`}
          >
            <span className="md:hidden">{isAdmin ? 'Admin' : 'Cliente'}</span>
            <span className="hidden md:inline">{welcomeText}</span>
          </span>
        </nav>
      </div>
    </header>
  )
}
