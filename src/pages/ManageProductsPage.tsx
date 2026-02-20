import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StoreFooter } from '../components/StoreFooter'
import { StoreHeader } from '../components/StoreHeader'
import { apiService } from '../services/api'
import type { Product } from '../types/product'
import { removeProductBannerFlag } from '../utils/bannerSettings'
import { isProductEnabled, setProductEnabledStatus } from '../utils/productStatus'

export const ManageProductsPage = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const loadProducts = async () => {
    setLoading(true)
    const fetchedProducts = await apiService.getProducts()
    setProducts(fetchedProducts)
    setLoading(false)
  }

  useEffect(() => {
    void loadProducts()
  }, [])

  const handleToggleStatus = (product: Product) => {
    const currentlyEnabled = isProductEnabled(product.id)

    if (currentlyEnabled) {
      const confirmed = window.confirm(`¿Deseas deshabilitar "${product.name}" de la tienda?`)
      if (!confirmed) return

      setProductEnabledStatus(product.id, false)
      removeProductBannerFlag(product.id)
      window.alert('Producto deshabilitado correctamente')
      setProducts((prev) => [...prev])
      return
    }

    const confirmed = window.confirm(`¿Deseas volver a habilitar "${product.name}"?`)
    if (!confirmed) return

    setProductEnabledStatus(product.id, true)
    window.alert('Producto habilitado correctamente')
    setProducts((prev) => [...prev])
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 via-primary-700 to-primary-500">
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

          {loading ? (
            <div className="py-16 text-center text-gray-600">Cargando...</div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
              <p className="text-lg font-semibold text-gray-800">No hay productos</p>
              <p className="mt-2 text-sm text-gray-600">Agrega productos desde el panel admin</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {products.map((product) => {
                const enabled = isProductEnabled(product.id)

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
          )}
        </section>
      </main>

      <StoreFooter />
    </div>
  )
}
