import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { StoreFooter } from '../components/StoreFooter'
import { StoreHeader } from '../components/StoreHeader'
import { apiService } from '../services/api'
import type { Product } from '../types/product'
import { isProductEnabled } from '../utils/productStatus'
import { openWhatsApp } from '../utils/whatsapp'

const features = [
  'Calidad premium garantizada',
  'Envío rápido y seguro',
  'Garantía del fabricante',
  'Soporte técnico incluido',
]

export const ProductDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) {
        setLoading(false)
        return
      }
      setLoading(true)
      const fetchedProduct = await apiService.getProductById(id)

      if (!fetchedProduct || !isProductEnabled(fetchedProduct.id)) {
        setProduct(null)
        setLoading(false)
        return
      }

      setProduct(fetchedProduct)
      setLoading(false)
    }
    void loadProduct()
  }, [id])

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 via-primary-700 to-primary-500">
      <StoreHeader subtitle="Detalle de producto" />

      <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-32 md:px-8">
        <section className="overflow-hidden rounded-3xl bg-white shadow-2xl">
          {loading ? (
            <div className="py-16 text-center text-gray-600">Cargando producto...</div>
          ) : !product ? (
            <div className="space-y-4 py-16 text-center">
              <p className="text-xl font-semibold text-gray-800">Producto no encontrado</p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Volver a la tienda
              </button>
            </div>
          ) : (
            <>
              <div className="relative h-72 w-full md:h-96">
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                {product.isNew && (
                  <span className="absolute right-4 top-4 rounded-full bg-pink-500 px-4 py-1 text-xs font-bold text-white">
                    NUEVO
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="absolute left-4 top-4 rounded-xl border border-primary-400 bg-primary-900/80 px-4 py-2 text-sm font-semibold text-white"
                >
                  ← Volver
                </button>
              </div>

              <div className="grid gap-8 p-6 md:grid-cols-[1.2fr_1fr] md:p-8">
                <div>
                  <span className="inline-flex rounded-lg border border-primary-500 bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700">
                    {product.category}
                  </span>
                  <h1 className="mt-3 text-3xl font-bold text-gray-900">{product.name}</h1>

                  <hr className="my-6 border-gray-200" />
                  <h2 className="mb-2 text-xl font-bold text-gray-900">Descripción</h2>
                  <p className="text-gray-600">{product.description}</p>

                  <hr className="my-6 border-gray-200" />
                  <h2 className="mb-3 text-xl font-bold text-gray-900">Características</h2>
                  <ul className="space-y-2 text-gray-600">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <span className="text-primary-600">●</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <aside className="h-fit rounded-2xl border border-gray-200 bg-gray-50 p-6">
                  <p className="text-sm text-gray-500">Precio</p>
                  <p className="mb-6 text-4xl font-bold text-primary-700">${product.price}</p>

                  <button
                    type="button"
                    onClick={() =>
                      openWhatsApp(`Hola! Estoy interesado en: ${product.name} - $${product.price}`)
                    }
                    className="w-full rounded-xl bg-primary-600 px-4 py-3 text-base font-bold text-white transition hover:bg-primary-700"
                  >
                    Contactar Ahora
                  </button>
                </aside>
              </div>
            </>
          )}
        </section>
      </main>

      <StoreFooter />
    </div>
  )
}
