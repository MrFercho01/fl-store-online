import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StoreFooter } from '../components/StoreFooter'
import { StoreHeader } from '../components/StoreHeader'
import { apiService } from '../services/api'
import type { Product } from '../types/product'
import { removeProductBannerFlag } from '../utils/bannerSettings'

const PRODUCTS_PER_PAGE = 4
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

export const ManageProductsPage = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const loadProducts = async () => {
    setLoading(true)
    const fetchedProducts = await apiService.getProducts()
    setProducts(fetchedProducts)
    setLoading(false)
  }

  useEffect(() => {
    void loadProducts()
  }, [])

  const categories = useMemo(() => {
    const categoryMap = new Map<string, string>()

    products.forEach((item) => {
      const categoryValue = item.category.trim()
      if (!categoryValue) return

      const key = categoryValue.toLowerCase()
      if (!categoryMap.has(key)) {
        categoryMap.set(key, categoryValue)
      }
    })

    return Array.from(categoryMap.values()).sort((first, second) =>
      first.localeCompare(second, 'es', { sensitivity: 'base' })
    )
  }, [products])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const normalizedCategory = categoryFilter.trim().toLowerCase()

    return products.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedSearch)
      const matchesCategory =
        normalizedCategory === 'all' || item.category.trim().toLowerCase() === normalizedCategory

      return matchesSearch && matchesCategory
    })
  }, [products, searchTerm, categoryFilter])

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE))
  }, [filteredProducts.length])

  const safeCurrentPage = useMemo(() => {
    return Math.min(currentPage, totalPages)
  }, [currentPage, totalPages])

  const paginatedProducts = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PRODUCTS_PER_PAGE
    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE)
  }, [filteredProducts, safeCurrentPage])

  const productPageNumbers = useMemo(() => {
    return buildCompactPagination(safeCurrentPage, totalPages)
  }, [safeCurrentPage, totalPages])

  const handleToggleStatus = async (product: Product) => {
    const currentlyEnabled = product.isEnabled !== false

    if (currentlyEnabled) {
      const confirmed = window.confirm(`¿Deseas deshabilitar "${product.name}" de la tienda?`)
      if (!confirmed) return

      const updated = await apiService.updateProduct(product.id, {
        ...product,
        isEnabled: false,
      })
      if (!updated) {
        window.alert('No se pudo deshabilitar el producto')
        return
      }
      removeProductBannerFlag(product.id)
      window.alert('Producto deshabilitado correctamente')
      setProducts((prev) => prev.map((item) => (item.id === product.id ? updated : item)))
      return
    }

    const confirmed = window.confirm(`¿Deseas volver a habilitar "${product.name}"?`)
    if (!confirmed) return

    const updated = await apiService.updateProduct(product.id, {
      ...product,
      isEnabled: true,
    })
    if (!updated) {
      window.alert('No se pudo habilitar el producto')
      return
    }
    window.alert('Producto habilitado correctamente')
    setProducts((prev) => prev.map((item) => (item.id === product.id ? updated : item)))
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-primary-900 via-primary-700 to-primary-500">
      <StoreHeader subtitle="Gestionar productos" />

      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-32 md:px-8">
        <section className="rounded-3xl bg-white p-6 shadow-2xl md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Gestionar Productos</h1>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="rounded-xl border border-primary-500 px-4 py-2 text-sm font-semibold text-primary-700"
            >
              ← Volver
            </button>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Buscar producto</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Ej: iPhone, audífonos..."
                className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none ring-primary-200 focus:ring"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Filtrar por categoría</span>
              <select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value)
                  setCurrentPage(1)
                }}
                className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm outline-none ring-primary-200 focus:ring"
              >
                <option value="all">Todas</option>
                {categories.map((category) => (
                  <option key={category} value={category.toLowerCase()}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-600">Cargando...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
              <p className="text-lg font-semibold text-gray-800">No hay productos para este filtro</p>
              <p className="mt-2 text-sm text-gray-600">Prueba otra búsqueda o categoría</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {paginatedProducts.map((product) => {
                const enabled = product.isEnabled !== false

                return (
                  <article key={product.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <img src={product.image} alt={product.name} className="h-44 w-full object-cover" />
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="line-clamp-1 text-lg font-bold text-gray-900">{product.name}</h2>
                        <div className="flex items-center gap-2">
                          {product.isNew && <span className="rounded-md bg-pink-500 px-2 py-1 text-xs font-bold text-white">NUEVO</span>}
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-bold ${
                              enabled
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {enabled ? 'ACTIVO' : 'DESHABILITADO'}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-primary-700">{product.category}</p>
                      <p className="text-xl font-bold text-gray-900">${product.price}</p>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/editar/${product.id}`)}
                          className="rounded-xl border border-primary-500 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(product)}
                          className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                            enabled
                              ? 'border-rose-400 text-rose-600 hover:bg-rose-50'
                              : 'border-emerald-400 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {enabled ? '⏸️ Deshabilitar' : '✅ Habilitar'}
                        </button>
                      </div>
                    </div>
                  </article>
                )
                })}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-700">
                <p>
                  Página {safeCurrentPage} de {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                    disabled={safeCurrentPage === 1}
                    className="rounded-lg border border-primary-300 px-3 py-1.5 font-semibold text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ← Anterior
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
                        className={`rounded-lg border px-3 py-1.5 font-semibold ${
                          pageItem === safeCurrentPage
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
                    onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="rounded-lg border border-primary-300 px-3 py-1.5 font-semibold text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      <StoreFooter />
    </div>
  )
}
