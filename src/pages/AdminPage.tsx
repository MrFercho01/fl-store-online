import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { StoreFooter } from '../components/StoreFooter'
import { StoreHeader } from '../components/StoreHeader'
import { apiService } from '../services/api'
import { setProductBannerFlag } from '../utils/bannerSettings'

const NEW_CATEGORY_VALUE = '__new_category__'
const VISITS_PER_PAGE = 5
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

const sortCategories = (items: string[]) => {
  return [...items].sort((first, second) => first.localeCompare(second, 'es', { sensitivity: 'base' }))
}

export const AdminPage = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [isNew, setIsNew] = useState(true)
  const [showInBanner, setShowInBanner] = useState(true)
  const [loading, setLoading] = useState(false)
  const [recalculatingMetrics, setRecalculatingMetrics] = useState(false)
  const [adminMetrics, setAdminMetrics] = useState({
    totalVisits: 0,
    apkDownloads: 0,
    customerVisits: 0,
    internalVisits: 0,
    todayVisits: 0,
    todayCustomerVisits: 0,
    uniqueVisitors: 0,
    uniqueCustomerVisitors: 0,
    recentVisits: [] as Array<{
      visitorId: string
      ipAddress: string
      lastVisitedAt: string
      isInternalVisit: boolean
      visitSource: 'customer' | 'admin' | 'internal_ip'
    }>,
  })
  const [currentVisitsPage, setCurrentVisitsPage] = useState(1)
  const [pushTokenStats, setPushTokenStats] = useState({
    totalTokens: 0,
    activeTokens: 0,
    activeByPlatform: {
      android: 0,
      ios: 0,
      web: 0,
    },
    lastSeenAt: null as string | null,
  })

  useEffect(() => {
    const loadCategories = async () => {
      const [fetchedProducts, fetchedMetrics, fetchedPushStats] = await Promise.all([
        apiService.getProducts(),
        apiService.getAdminMetrics(),
        apiService.getPushTokenStats(),
      ])
      const categoryMap = new Map<string, string>()

      fetchedProducts.forEach((item) => {
        const categoryValue = item.category.trim()
        if (!categoryValue) return

        const key = categoryValue.toLowerCase()
        if (!categoryMap.has(key)) {
          categoryMap.set(key, categoryValue)
        }
      })

      setCategories(sortCategories(Array.from(categoryMap.values())))
      setAdminMetrics(fetchedMetrics)
      if (fetchedPushStats) {
        setPushTokenStats(fetchedPushStats)
      }
      setCurrentVisitsPage(1)
    }

    void loadCategories()
  }, [])

  useEffect(() => {
    if (imageFile) {
      const objectUrl = URL.createObjectURL(imageFile)
      setPreview(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }
    setPreview('')
    return
  }, [imageFile])

  const totalVisitPages = useMemo(() => {
    return Math.max(1, Math.ceil(adminMetrics.recentVisits.length / VISITS_PER_PAGE))
  }, [adminMetrics.recentVisits.length])

  const safeVisitsPage = useMemo(() => {
    return Math.min(currentVisitsPage, totalVisitPages)
  }, [currentVisitsPage, totalVisitPages])

  const paginatedVisits = useMemo(() => {
    const startIndex = (safeVisitsPage - 1) * VISITS_PER_PAGE
    return adminMetrics.recentVisits.slice(startIndex, startIndex + VISITS_PER_PAGE)
  }, [adminMetrics.recentVisits, safeVisitsPage])

  const visitPageNumbers = useMemo(() => {
    return buildCompactPagination(safeVisitsPage, totalVisitPages)
  }, [safeVisitsPage, totalVisitPages])

  const resetForm = () => {
    setName('')
    setDescription('')
    setPrice('')
    setSelectedCategory('')
    setNewCategory('')
    setImageFile(null)
    setPreview('')
    setIsNew(true)
    setShowInBanner(true)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const categoryValue = selectedCategory === NEW_CATEGORY_VALUE ? newCategory : selectedCategory
    const normalizedCategory = categoryValue.trim()

    if (!name || !description || !price || !normalizedCategory || !imageFile) {
      window.alert('Por favor completa todos los campos')
      return
    }

    const priceNumber = Number(price)
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      window.alert('El precio debe ser un número válido')
      return
    }

    setLoading(true)
    const uploadedImage = await apiService.uploadImage(imageFile)
    if (!uploadedImage) {
      setLoading(false)
      window.alert('No se pudo subir la imagen')
      return
    }

    const response = await apiService.addProduct({
      name,
      description,
      price: priceNumber,
      category: normalizedCategory,
      image: uploadedImage,
      isNew,
    })

    setLoading(false)
    if (!response) {
      window.alert('No se pudo agregar el producto')
      return
    }

    setCategories((prev) => {
      const alreadyExists = prev.some((item) => item.trim().toLowerCase() === normalizedCategory.toLowerCase())
      if (alreadyExists) return prev
      return sortCategories([...prev, normalizedCategory])
    })

    setProductBannerFlag(response.id, showInBanner)

    window.alert('Producto agregado correctamente')
    resetForm()
  }

  const logout = () => {
    localStorage.removeItem('@fl_store_auth')
    navigate('/login', { replace: true })
  }

  const handleRecalculateMetrics = async () => {
    const confirmed = window.confirm('¿Deseas recalcular el histórico de métricas de visitas ahora?')
    if (!confirmed) return

    setRecalculatingMetrics(true)
    const recalculated = await apiService.recalculateAdminMetrics()
    setRecalculatingMetrics(false)

    if (!recalculated) {
      window.alert('No se pudo recalcular métricas. Intenta nuevamente.')
      return
    }

    setAdminMetrics(recalculated)
    setCurrentVisitsPage(1)
    window.alert('Métricas históricas recalculadas correctamente')
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-primary-900 via-primary-700 to-primary-500">
      <StoreHeader subtitle="Panel de administrador" />

      <main className="mx-auto w-full max-w-4xl px-4 pb-10 pt-32 md:px-8">
        <section className="rounded-3xl bg-white p-6 shadow-2xl md:p-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Agregar Producto</h1>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Cerrar sesión
            </button>
          </div>

          <div className="mb-6 space-y-3 rounded-2xl border border-primary-100 bg-primary-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-primary-900">Métricas de visitas</h2>
              <button
                type="button"
                onClick={() => void handleRecalculateMetrics()}
                disabled={recalculatingMetrics}
                className="rounded-lg border border-primary-500 bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {recalculatingMetrics ? 'Recalculando...' : '♻️ Recalcular histórico'}
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-primary-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Visitas totales</p>
                <p className="mt-1 text-2xl font-extrabold text-primary-900">{adminMetrics.totalVisits}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Visitas clientes</p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-800">{adminMetrics.customerVisits}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Visitas internas</p>
                <p className="mt-1 text-2xl font-extrabold text-amber-800">{adminMetrics.internalVisits}</p>
              </div>
              <div className="rounded-xl border border-primary-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Visitas hoy</p>
                <p className="mt-1 text-2xl font-extrabold text-primary-900">{adminMetrics.todayVisits}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Clientes hoy</p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-800">{adminMetrics.todayCustomerVisits}</p>
              </div>
              <div className="rounded-xl border border-primary-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Visitantes únicos</p>
                <p className="mt-1 text-2xl font-extrabold text-primary-900">{adminMetrics.uniqueVisitors}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Únicos clientes</p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-800">{adminMetrics.uniqueCustomerVisitors}</p>
              </div>
              <div className="rounded-xl border border-sky-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Descargas APK Android</p>
                <p className="mt-1 text-2xl font-extrabold text-sky-800">{adminMetrics.apkDownloads}</p>
              </div>
              <div className="rounded-xl border border-fuchsia-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-700">Tokens Push Activos</p>
                <p className="mt-1 text-2xl font-extrabold text-fuchsia-800">{pushTokenStats.activeTokens}</p>
                <p className="mt-1 text-xs text-fuchsia-700">
                  Android: {pushTokenStats.activeByPlatform.android} · iOS: {pushTokenStats.activeByPlatform.ios}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-primary-200 bg-white">
              <table className="min-w-full divide-y divide-primary-100 text-sm">
                <thead className="bg-primary-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-primary-800">IP</th>
                    <th className="px-3 py-2 text-left font-semibold text-primary-800">Tipo</th>
                    <th className="px-3 py-2 text-left font-semibold text-primary-800">Visitor ID</th>
                    <th className="px-3 py-2 text-left font-semibold text-primary-800">Última visita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-100">
                  {adminMetrics.recentVisits.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                        Aún no hay visitas registradas
                      </td>
                    </tr>
                  ) : (
                    paginatedVisits.map((visit, index) => (
                      <tr key={`${visit.visitorId}-${visit.lastVisitedAt}-${index}`}>
                        <td className="px-3 py-2 font-medium text-gray-700">{visit.ipAddress || 'N/A'}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${
                              visit.isInternalVisit
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {visit.visitSource === 'admin'
                              ? 'ADMIN'
                              : visit.visitSource === 'internal_ip'
                                ? 'RED INTERNA'
                                : 'CLIENTE'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{visit.visitorId || 'N/A'}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {visit.lastVisitedAt
                            ? new Date(visit.lastVisitedAt).toLocaleString('es-EC', {
                                timeZone: 'America/Guayaquil',
                                hour12: false,
                              })
                            : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {adminMetrics.recentVisits.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-700">
                <p>
                  Página {safeVisitsPage} de {totalVisitPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentVisitsPage(Math.max(1, safeVisitsPage - 1))}
                    disabled={safeVisitsPage === 1}
                    className="rounded-lg border border-primary-300 px-3 py-1.5 font-semibold text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ← Anterior
                  </button>
                  {visitPageNumbers.map((pageItem, index) => {
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
                        onClick={() => setCurrentVisitsPage(pageItem)}
                        className={`rounded-lg border px-3 py-1.5 font-semibold ${
                          pageItem === safeVisitsPage
                            ? 'border-primary-600 bg-primary-600 text-white'
                            : 'border-primary-300 text-primary-700 hover:bg-primary-50'
                        }`}
                      >
                        {pageItem}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setCurrentVisitsPage(Math.min(totalVisitPages, safeVisitsPage + 1))}
                    disabled={safeVisitsPage === totalVisitPages}
                    className="rounded-lg border border-primary-300 px-3 py-1.5 font-semibold text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Foto del producto</span>
              <input
                id="admin-image-file"
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                className="hidden"
              />
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="admin-image-file"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
                  >
                    📸 Seleccionar imagen
                  </label>
                  {preview ? (
                    <img
                      src={preview}
                      alt="Miniatura"
                      className="h-11 w-11 rounded-full border border-primary-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-gray-300 text-lg text-gray-400">
                      🖼️
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-600">{imageFile ? imageFile.name : 'Ningún archivo seleccionado'}</p>
              </div>
            </label>

            {preview ? (
              <img src={preview} alt="Preview" className="h-56 w-full rounded-2xl object-cover" />
            ) : (
              <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-gray-300 text-gray-500">
                Sin imagen seleccionada
              </div>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Nombre del producto</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej: iPhone 15 Pro"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none ring-primary-200 focus:ring"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Descripción</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe el producto..."
                rows={4}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none ring-primary-200 focus:ring"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Precio ($)</span>
                <input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="299.99"
                  className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none ring-primary-200 focus:ring"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Categoría</span>
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm outline-none ring-primary-200 focus:ring"
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                  <option value={NEW_CATEGORY_VALUE}>+ Nueva categoría</option>
                </select>
              </label>
            </div>

            {selectedCategory === NEW_CATEGORY_VALUE ? (
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Nueva categoría</span>
                <input
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  placeholder="Ej: Accesorios"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none ring-primary-200 focus:ring"
                />
              </label>
            ) : null}

            <label className="flex items-center gap-3 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3">
              <input type="checkbox" checked={isNew} onChange={() => setIsNew((prev) => !prev)} />
              <span className="text-sm font-semibold text-gray-700">Marcar como nuevo</span>
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
              <input
                type="checkbox"
                checked={showInBanner}
                onChange={() => setShowInBanner((prev) => !prev)}
              />
              <span className="text-sm font-semibold text-amber-800">Mostrar en banner de novedades</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary-600 px-4 py-3 text-base font-bold text-white transition hover:bg-primary-700 disabled:opacity-60"
            >
              {loading ? 'Publicando...' : 'Publicar Producto'}
            </button>
          </form>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => navigate('/admin/productos')}
              className="rounded-xl border border-primary-500 px-4 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-50"
            >
              Gestionar Productos
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/comentarios')}
              className="rounded-xl border border-primary-500 px-4 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-50"
            >
              Moderar Comentarios
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Ver Tienda
            </button>
          </div>
        </section>
      </main>

      <StoreFooter />
    </div>
  )
}
