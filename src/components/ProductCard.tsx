import type { Product } from '../types/product'

interface ProductCardProps {
  product: Product
  onView: () => void
  onContact: () => void
}

export const ProductCard = ({ product, onView, onContact }: ProductCardProps) => {
  const hasDescription = product.description.trim().length > 0

  return (
    <article className="overflow-hidden rounded-2xl border border-primary-200/50 bg-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative">
        <img src={product.image} alt={product.name} className="h-52 w-full object-cover" />
        {product.isNew && (
          <span className="absolute right-3 top-3 rounded-full bg-pink-500 px-3 py-1 text-xs font-bold text-white">
            NUEVO
          </span>
        )}
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">{product.category}</p>
          <p className="text-xl font-bold text-gray-900">${product.price}</p>
        </div>

        <h3 className="line-clamp-1 text-lg font-bold text-gray-900">{product.name}</h3>
        <p className="min-h-12 line-clamp-2 text-sm text-gray-600">
          {hasDescription ? product.description : 'Descripción breve no disponible'}
        </p>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onView}
            className="flex-1 rounded-xl border border-primary-500 px-3 py-2 text-sm font-semibold text-primary-600 transition hover:bg-primary-50"
          >
            Ver detalle
          </button>
          <button
            type="button"
            onClick={onContact}
            className="flex-1 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            Contactar
          </button>
        </div>
      </div>
    </article>
  )
}
