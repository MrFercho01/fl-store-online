import { useMemo, useState } from 'react'
import { apiService } from '../services/api'
import type { Product } from '../types/product'
import type { Review } from '../types/review'

interface CustomerReviewsSectionProps {
  products: Product[]
  reviews: Review[]
  averageRating: number
  totalReviews: number
  totalLikes: number
  onReviewSent: () => Promise<void>
  visitorId: string
}

const DEFAULT_REVIEW_RATING = 5

const normalizeCategory = (value: string) => value.trim().toLowerCase()

const renderStars = (rating: number) => {
  return '★★★★★'.split('').map((star, index) => (
    <span key={`${star}-${index}`} className={index < rating ? 'text-amber-500' : 'text-gray-300'}>
      ★
    </span>
  ))
}

export const CustomerReviewsSection = ({
  products,
  reviews,
  averageRating,
  totalReviews,
  totalLikes,
  onReviewSent,
  visitorId,
}: CustomerReviewsSectionProps) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [rating, setRating] = useState(DEFAULT_REVIEW_RATING)
  const [comment, setComment] = useState('')
  const [recommend, setRecommend] = useState(true)
  const [likingReviewId, setLikingReviewId] = useState('')
  const [reviewLikeOverrides, setReviewLikeOverrides] = useState<Record<string, { likeCount: number; likedByVisitor: boolean }>>({})

  const displayedReviews = useMemo(() => {
    return reviews.map((review) => {
      const override = reviewLikeOverrides[review.id]
      if (!override) return review

      return {
        ...review,
        likeCount: override.likeCount,
        likedByVisitor: override.likedByVisitor,
      }
    })
  }, [reviews, reviewLikeOverrides])

  const displayedTotalLikes = useMemo(() => {
    const originalTotal = reviews.reduce((sum, review) => sum + review.likeCount, 0)
    const newTotal = displayedReviews.reduce((sum, review) => sum + review.likeCount, 0)
    return totalLikes + (newTotal - originalTotal)
  }, [reviews, displayedReviews, totalLikes])

  const categories = useMemo(() => {
    const map = new Map<string, string>()
    products.forEach((item) => {
      const value = item.category.trim()
      if (!value) return
      const key = normalizeCategory(value)
      if (!map.has(key)) map.set(key, value)
    })
    return Array.from(map.values()).sort((first, second) =>
      first.localeCompare(second, 'es', { sensitivity: 'base' })
    )
  }, [products])

  const productsByCategory = useMemo(() => {
    if (!selectedCategory) return []
    const normalizedSelectedCategory = normalizeCategory(selectedCategory)
    return products.filter((item) => normalizeCategory(item.category) === normalizedSelectedCategory)
  }, [products, selectedCategory])

  const selectedProduct = useMemo(
    () => productsByCategory.find((item) => item.id === selectedProductId),
    [productsByCategory, selectedProductId]
  )

  const resetForm = () => {
    setCustomerName('')
    setSelectedCategory('')
    setSelectedProductId('')
    setRating(DEFAULT_REVIEW_RATING)
    setComment('')
    setRecommend(true)
  }

  const handleSendReview = async () => {
    if (!customerName.trim() || !selectedCategory || !selectedProduct || !comment.trim()) {
      window.alert('Completa todos los campos del comentario')
      return
    }

    setSubmitting(true)
    const message = await apiService.createReview({
      customerName: customerName.trim(),
      category: selectedCategory,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      rating,
      comment: comment.trim(),
      recommend,
    })
    setSubmitting(false)

    if (!message) {
      window.alert('No se pudo enviar el comentario. Intenta nuevamente.')
      return
    }

    window.alert(message)
    resetForm()
    setIsPopupOpen(false)
    setReviewLikeOverrides({})
    await onReviewSent()
  }

  const handleToggleLike = async (review: Review) => {
    if (!visitorId) return

    const nextLikedValue = !review.likedByVisitor
    setLikingReviewId(review.id)

    const updated = await apiService.setReviewLike(review.id, visitorId, nextLikedValue)
    setLikingReviewId('')

    if (!updated) {
      window.alert('No se pudo actualizar el like')
      return
    }

    setReviewLikeOverrides((prev) => ({
      ...prev,
      [review.id]: {
        likeCount: updated.likeCount,
        likedByVisitor: updated.likedByVisitor,
      },
    }))
  }

  return (
    <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-5 shadow-lg md:p-6">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Opiniones de clientes</h2>
          <p className="text-sm text-gray-600">Reseñas verificadas y moderadas para mostrar compras reales.</p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold text-gray-700">
          <span className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1">
            ⭐ {averageRating > 0 ? averageRating.toFixed(1) : '0.0'} / 5
          </span>
          <span className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1">
            🧾 {totalReviews} reseñas
          </span>
          <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">
            ❤️ {displayedTotalLikes} likes
          </span>
          <button
            type="button"
            onClick={() => setIsPopupOpen(true)}
            className="rounded-full border border-primary-500 bg-primary-600 px-3 py-1 text-white transition hover:bg-primary-700"
          >
            ✍️ Dejar comentario
          </button>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center">
          <p className="text-sm font-semibold text-gray-700">Aún no hay reseñas aprobadas</p>
          <p className="mt-1 text-xs text-gray-600">Sé el primero en compartir tu experiencia de compra.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {displayedReviews.map((review) => {
            const isLikedByVisitor = review.likedByVisitor
            const reviewLikes = review.likeCount
            const isUpdatingLike = likingReviewId === review.id

            return (
              <article key={review.id} className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{review.customerName}</p>
                    <p className="text-xs font-semibold text-primary-700">Compra: {review.productName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-rose-600">
                      ❤️ {reviewLikes}
                    </span>
                    <button
                      type="button"
                      disabled={isUpdatingLike}
                      onClick={() => void handleToggleLike(review)}
                      className={`rounded-full border px-2 py-1 text-[11px] font-bold transition ${
                        isLikedByVisitor
                          ? 'border-rose-300 bg-rose-100 text-rose-700'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-rose-300 hover:text-rose-700'
                      } disabled:opacity-60`}
                    >
                      {isUpdatingLike ? 'Actualizando...' : isLikedByVisitor ? 'Quitar like' : 'Dar like'}
                    </button>
                  </div>
                </div>

                <div className="mb-2 flex items-center gap-1 text-sm">{renderStars(review.rating)}</div>
                <p className="text-sm text-gray-700">“{review.comment}”</p>
              </article>
            )
          })}
        </div>
      )}

      {isPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Comparte tu experiencia</h3>
              <button
                type="button"
                onClick={() => setIsPopupOpen(false)}
                className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Tu nombre</span>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none ring-primary-200 focus:ring"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Categoría comprada</span>
                <select
                  value={selectedCategory}
                  onChange={(event) => {
                    setSelectedCategory(event.target.value)
                    setSelectedProductId('')
                  }}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-primary-200 focus:ring"
                >
                  <option value="">Selecciona categoría</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Producto comprado</span>
                <select
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  disabled={!selectedCategory}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-primary-200 focus:ring disabled:bg-gray-100"
                >
                  <option value="">Selecciona producto</option>
                  {productsByCategory.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Calificación</span>
                <select
                  value={rating}
                  onChange={(event) => setRating(Number(event.target.value))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-primary-200 focus:ring"
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} estrella{value > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Comentario</span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none ring-primary-200 focus:ring"
                />
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2">
                <input type="checkbox" checked={recommend} onChange={() => setRecommend((prev) => !prev)} />
                <span className="text-sm font-semibold text-gray-700">Recomiendo esta tienda</span>
              </label>

              <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Tu comentario será verificado por seguridad antes de mostrarse públicamente.
              </p>

              <button
                type="button"
                onClick={() => void handleSendReview()}
                disabled={submitting}
                className="w-full rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:opacity-60"
              >
                {submitting ? 'Enviando...' : 'Enviar comentario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
