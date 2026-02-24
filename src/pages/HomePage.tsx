import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CustomerReviewsSection } from '../components/CustomerReviewsSection'
import { ProductCard } from '../components/ProductCard'
import { StoreFooter } from '../components/StoreFooter'
import { StoreHeader } from '../components/StoreHeader'
import { apiService, authService } from '../services/api'
import type { Product } from '../types/product'
import type { Review } from '../types/review'
import { getProductBannerFlag } from '../utils/bannerSettings'
import { openWhatsApp } from '../utils/whatsapp'

const VISITOR_ID_STORAGE_KEY = '@fl_store_visitor_id'
const VISIT_TRACK_STORAGE_KEY = '@fl_store_last_visit_day'
const PRODUCTS_PER_PAGE = 6
const ECUADOR_TIMEZONE = 'America/Guayaquil'
const COMPACT_PAGINATION_LIMIT = 7

type PaginationItem = number | 'ellipsis'

const buildCompactPagination = (currentPage: number, totalPages: number): PaginationItem[] => {
  if (totalPages <= COMPACT_PAGINATION_LIMIT) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pageSet = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1])

  if (currentPage <= 3) {
    pageSet.add(2)
    pageSet.add(3)
    pageSet.add(4)
  }

  if (currentPage >= totalPages - 2) {
    pageSet.add(totalPages - 1)
    pageSet.add(totalPages - 2)
    pageSet.add(totalPages - 3)
  }

  const sortedPages = Array.from(pageSet)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second)

  const compactItems: PaginationItem[] = []
  sortedPages.forEach((page, index) => {
    const previous = sortedPages[index - 1]
    if (previous && page - previous > 1) {
      compactItems.push('ellipsis')
    }
    compactItems.push(page)
  })

  return compactItems
}

const getEcuadorDayKey = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ECUADOR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

const getOrCreateVisitorId = () => {
  let currentVisitorId = localStorage.getItem(VISITOR_ID_STORAGE_KEY)

  if (!currentVisitorId) {
    currentVisitorId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    localStorage.setItem(VISITOR_ID_STORAGE_KEY, currentVisitorId)
  }

  return currentVisitorId
}

export const HomePage = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas')
  const [newsIndex, setNewsIndex] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<'name' | 'price'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showSortInfo, setShowSortInfo] = useState(false)
  const sortInfoRef = useRef<HTMLDivElement | null>(null)
  const [publicReviews, setPublicReviews] = useState<Review[]>([])
  const [reviewsStats, setReviewsStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    totalLikes: 0,
  })
  const [totalVisits, setTotalVisits] = useState(0)
  const [backendAndroidApkUrl, setBackendAndroidApkUrl] = useState('')
  const [backendApkAvailable, setBackendApkAvailable] = useState(false)
  const [visitorId] = useState(getOrCreateVisitorId)

  const configuredAndroidApkUrl = String(import.meta.env.VITE_MOBILE_ANDROID_APK_URL ?? '').trim()
  const androidApkUrl = configuredAndroidApkUrl || backendAndroidApkUrl
  const hasAndroidApkUrl = androidApkUrl.length > 0 && (configuredAndroidApkUrl.length > 0 || backendApkAvailable)

  const openExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true)
      const fetchedProducts = await apiService.getProducts()
      setProducts(fetchedProducts)
      setLoading(false)
    }
    void loadProducts()
  }, [])

  const loadPublicReviews = useCallback(async () => {
    if (!visitorId) return

    const response = await apiService.getPublicReviews(visitorId)
    setPublicReviews(response.reviews)
    setReviewsStats(response.stats)
  }, [visitorId])

  useEffect(() => {
    let isMounted = true

    const fetchReviews = async () => {
      if (!visitorId) return
      const response = await apiService.getPublicReviews(visitorId)
      if (!isMounted) return
      setPublicReviews(response.reviews)
      setReviewsStats(response.stats)
    }

    void fetchReviews()

    return () => {
      isMounted = false
    }
  }, [visitorId])

  useEffect(() => {
    let isMounted = true

    const loadApkInfo = async () => {
      const apkInfo = await apiService.getMobileApkInfo()
      if (!apkInfo || !isMounted) return

      setBackendApkAvailable(Boolean(apkInfo.available))
      if (apkInfo.downloadUrl) {
        setBackendAndroidApkUrl(String(apkInfo.downloadUrl))
      }
    }

    void loadApkInfo()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadVisits = async () => {
      const today = getEcuadorDayKey()
      const lastTrackedDay = localStorage.getItem(VISIT_TRACK_STORAGE_KEY)
      const isAdminVisit = authService.hasToken()

      if (visitorId && lastTrackedDay !== today) {
        const registered = await apiService.registerVisit(visitorId, isAdminVisit)
        if (registered && isMounted) {
          setTotalVisits(registered.customerVisits)
        }
        localStorage.setItem(VISIT_TRACK_STORAGE_KEY, today)
        return
      }

      const metrics = await apiService.getPublicMetrics()
      if (isMounted) {
        setTotalVisits(metrics.customerVisits)
      }
    }

    void loadVisits()

    return () => {
      isMounted = false
    }
  }, [visitorId])

  const visibleProducts = useMemo(() => {
    return products.filter((item) => item.isEnabled !== false)
  }, [products])

  const categories = useMemo(() => {
    const categoryMap = new Map<string, string>()

    visibleProducts.forEach((item) => {
      const categoryValue = item.category.trim()
      if (!categoryValue) return

      const key = categoryValue.toLowerCase()
      if (!categoryMap.has(key)) {
        categoryMap.set(key, categoryValue)
      }
    })

    const sortedCategories = Array.from(categoryMap.values()).sort((first, second) =>
      first.localeCompare(second, 'es', { sensitivity: 'base' })
    )

    return ['Todas', ...sortedCategories]
  }, [visibleProducts])

  const normalizedSelectedCategory = useMemo(() => {
    const normalized = selectedCategory.trim().toLowerCase()
    const available = categories.map((item) => item.trim().toLowerCase())
    return available.includes(normalized) ? normalized : 'todas'
  }, [categories, selectedCategory])

  const filteredProducts = useMemo(() => {

    return visibleProducts.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase())
      const matchesCategory =
        normalizedSelectedCategory === 'todas' || item.category.trim().toLowerCase() === normalizedSelectedCategory
      return matchesSearch && matchesCategory
    })
  }, [visibleProducts, searchText, normalizedSelectedCategory])

  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts]

    if (sortField === 'name') {
      sorted.sort((first, second) => {
        const compareValue = first.name.localeCompare(second.name, 'es', { sensitivity: 'base' })
        return sortDirection === 'asc' ? compareValue : -compareValue
      })
      return sorted
    }

    sorted.sort((first, second) => {
      const compareValue = first.price - second.price
      return sortDirection === 'asc' ? compareValue : -compareValue
    })

    return sorted
  }, [filteredProducts, sortField, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PRODUCTS_PER_PAGE))

  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedProducts = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PRODUCTS_PER_PAGE
    const endIndex = startIndex + PRODUCTS_PER_PAGE
    return sortedProducts.slice(startIndex, endIndex)
  }, [sortedProducts, safeCurrentPage])

  const productPageNumbers = useMemo(() => {
    return buildCompactPagination(safeCurrentPage, totalPages)
  }, [safeCurrentPage, totalPages])

  useEffect(() => {
    if (!showSortInfo) return

    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target) return

      if (sortInfoRef.current && !sortInfoRef.current.contains(target)) {
        setShowSortInfo(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDownOutside)
    document.addEventListener('touchstart', handlePointerDownOutside)

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSortInfo(false)
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside)
      document.removeEventListener('touchstart', handlePointerDownOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showSortInfo])

  const handleSortSelect = (field: 'name' | 'price') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      setCurrentPage(1)
      return
    }

    setSortField(field)
    setSortDirection('asc')
    setCurrentPage(1)
  }

  const currentSortText =
    sortField === 'name'
      ? `Orden actual: Nombre ${sortDirection === 'asc' ? 'ascendente' : 'descendente'}`
      : `Orden actual: Precio ${sortDirection === 'asc' ? 'ascendente' : 'descendente'}`

  const newsItems = useMemo(() => {
    const bannerProducts = visibleProducts.filter((item) => getProductBannerFlag(item)).slice(0, 3)
    const base = [
      { type: 'oferta', text: 'Ofertas exclusivas activas hoy en FL Store' },
      { type: 'envio', text: 'Envíos rápidos y seguros en todo momento' },
    ]

    if (bannerProducts.length > 0) {
      const dynamicNews = bannerProducts.map((item) => ({
        type: 'nuevo',
        text: `Nuevo ingreso: ${item.name} por $${item.price}`,
      }))
      return [...dynamicNews, ...base]
    }

    return base
  }, [visibleProducts])

  const currentNews = newsItems[newsIndex]

  const currentBadge = useMemo(() => {
    if (!currentNews) return '✨ NOVEDADES'
    if (currentNews.type === 'nuevo') return '🆕 NUEVO'
    if (currentNews.type === 'envio') return '🚚 ENVÍO'
    return '🔥 OFERTA'
  }, [currentNews])

  const newsVariant = useMemo(() => {
    if (!currentNews) {
      return {
        wrapper: 'border-amber-300 bg-linear-to-r from-amber-50 to-orange-50 shadow-[0_8px_20px_rgba(245,158,11,0.15)]',
        badge: 'bg-amber-500 text-slate-900',
        text: 'text-amber-900',
      }
    }

    if (currentNews.type === 'nuevo') {
      return {
        wrapper: 'border-lime-300 bg-linear-to-r from-lime-50 to-emerald-50 shadow-[0_8px_20px_rgba(132,204,22,0.18)]',
        badge: 'bg-lime-500 text-slate-900',
        text: 'text-emerald-900',
      }
    }

    if (currentNews.type === 'envio') {
      return {
        wrapper: 'border-sky-300 bg-linear-to-r from-sky-50 to-cyan-50 shadow-[0_8px_20px_rgba(14,165,233,0.16)]',
        badge: 'bg-sky-500 text-white',
        text: 'text-sky-900',
      }
    }

    return {
      wrapper: 'border-amber-300 bg-linear-to-r from-amber-50 to-orange-50 shadow-[0_8px_20px_rgba(245,158,11,0.15)]',
      badge: 'bg-amber-500 text-slate-900',
      text: 'text-amber-900',
    }
  }, [currentNews])

  useEffect(() => {
    if (newsItems.length <= 1) return

    const timer = window.setInterval(() => {
      setNewsIndex((prev) => (prev + 1) % newsItems.length)
    }, 3200)

    return () => window.clearInterval(timer)
  }, [newsItems])

  return (
    <div className="min-h-screen bg-linear-to-b from-primary-900 via-primary-700 to-primary-500">
      <StoreHeader
        subtitle="Productos premium a tu alcance"
        onLogoLongPress={() => navigate('/login')}
      />

      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-32 md:px-8">
        <section className="rounded-3xl bg-white/95 p-6 shadow-2xl backdrop-blur-sm md:p-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex w-fit flex-col">
              <span className="mb-1 inline-flex w-fit items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-700">
                ✨ Catálogo Premium
              </span>
              <h1 className="bg-linear-to-r from-slate-900 via-primary-700 to-cyan-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent drop-shadow-sm md:text-4xl">
                Catálogo FL Store
              </h1>
              <span className="mt-2 h-1 w-40 rounded-full bg-linear-to-r from-primary-600 to-cyan-400" />
            </div>
          </div>

          <div className={`mb-5 overflow-hidden rounded-2xl border transition-colors duration-500 ${newsVariant.wrapper}`}>
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span
                key={currentBadge}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide transition-colors duration-500 ${newsVariant.badge}`}
              >
                <span className="animate-[newsFade_320ms_ease]">{currentBadge}</span>
              </span>
              <div className="relative h-6 flex-1 overflow-hidden">
                <p
                  key={`${currentNews?.text ?? ''}-${newsIndex}`}
                  className={`absolute inset-0 line-clamp-1 animate-[newsFade_320ms_ease] text-sm font-semibold ${newsVariant.text}`}
                >
                  {currentNews?.text ?? ''}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6 grid gap-3 md:grid-cols-[2fr_3fr]">
            <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-4">
              <span className="mr-2 text-lg">🔍</span>
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                onInput={() => setCurrentPage(1)}
                placeholder="Buscar productos..."
                className="w-full bg-transparent py-3 text-sm text-gray-700 outline-none"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category)
                    setCurrentPage(1)
                  }}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    normalizedSelectedCategory === category.trim().toLowerCase()
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-primary-500 hover:text-primary-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3">
            <div ref={sortInfoRef} className="relative flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-700">Ordenar catálogo:</p>
              <button
                type="button"
                aria-label="Mostrar orden actual"
                onMouseEnter={() => setShowSortInfo(true)}
                onMouseLeave={() => setShowSortInfo(false)}
                onFocus={() => setShowSortInfo(true)}
                onBlur={() => setShowSortInfo(false)}
                onClick={() => setShowSortInfo((prev) => !prev)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary-200 bg-white text-xs font-bold text-primary-700 transition hover:border-primary-400"
              >
                ℹ️
              </button>

              {showSortInfo && (
                <div className="absolute left-0 top-8 z-20 w-64 rounded-xl border border-primary-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-lg">
                  {currentSortText}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-semibold text-primary-700">
                👁️ {totalVisits} visitas
              </span>
              <button
                type="button"
                onClick={() => handleSortSelect('name')}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  sortField === 'name'
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-primary-500 hover:text-primary-600'
                }`}
              >
                🔤 Nombre {sortField === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </button>
              <button
                type="button"
                onClick={() => handleSortSelect('price')}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  sortField === 'price'
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-primary-500 hover:text-primary-600'
                }`}
              >
                💲 Precio {sortField === 'price' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-600">Cargando productos...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
              <p className="text-lg font-semibold text-gray-800">No hay productos disponibles</p>
              <p className="mt-2 text-sm text-gray-600">Usa el panel admin para agregar productos</p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {paginatedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onView={() => navigate(`/producto/${product.id}`)}
                    onContact={() => openWhatsApp(`Hola! Estoy interesado en: ${product.name}`)}
                  />
                ))}
              </div>

              {sortedProducts.length > PRODUCTS_PER_PAGE && (
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary-500 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  {productPageNumbers.map((pageItem, index) => {
                    if (pageItem === 'ellipsis') {
                      return (
                        <span key={`ellipsis-${index}`} className="px-1 text-primary-700">
                          …
                        </span>
                      )
                    }

                    return (
                      <button
                        key={pageItem}
                        type="button"
                        onClick={() => setCurrentPage(pageItem)}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          safeCurrentPage === pageItem
                            ? 'bg-primary-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:border-primary-500 hover:text-primary-600'
                        }`}
                      >
                        {pageItem}
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary-500 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}

          <CustomerReviewsSection
            products={visibleProducts}
            reviews={publicReviews}
            averageRating={reviewsStats.averageRating}
            totalReviews={reviewsStats.totalReviews}
            totalLikes={reviewsStats.totalLikes}
            onReviewSent={loadPublicReviews}
            visitorId={visitorId}
          />

          <section className="mt-6 rounded-2xl border border-primary-200 bg-primary-50/70 p-4 shadow-sm md:p-5">
            <h2 className="mb-3 text-xl font-extrabold text-slate-900">Instalar app</h2>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => openExternalLink(androidApkUrl)}
                disabled={!hasAndroidApkUrl}
                className="group rounded-xl border border-gray-200 bg-white p-2 text-left transition hover:border-primary-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <img src="/android-download.svg" alt="Descargar en Android" className="h-16 w-full rounded-lg object-cover" />
              </button>

              <button
                type="button"
                onClick={() => window.alert('iOS próximamente.')}
                className="group rounded-xl border border-gray-200 bg-white p-2 text-left transition hover:border-amber-300"
              >
                <img src="/ios-soon.svg" alt="iOS próximamente" className="h-16 w-full rounded-lg object-cover" />
              </button>
            </div>
          </section>
        </section>
      </main>

      <StoreFooter />
    </div>
  )
}
