import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePaginationLimit } from '../hooks/usePaginationLimit'
import { StoreFooter } from '../components/StoreFooter'
import { StoreHeader } from '../components/StoreHeader'
import { apiService } from '../services/api'
import type { Review } from '../types/review'
import { buildCompactPagination } from '../utils/pagination'

const REVIEWS_PER_PAGE = 5

export const ManageReviewsPage = () => {
  const paginationLimit = usePaginationLimit()
  const navigate = useNavigate()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    let isMounted = true

    const loadReviews = async () => {
      const fetchedReviews = await apiService.getAdminReviews()
      if (!isMounted) return
      setReviews(fetchedReviews)
      setLoading(false)
    }

    void loadReviews()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredReviews = useMemo(() => {
    if (statusFilter === 'all') return reviews
    return reviews.filter((item) => item.status === statusFilter)
  }, [reviews, statusFilter])

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE))
  }, [filteredReviews.length])

  const safeCurrentPage = useMemo(() => {
    return Math.min(currentPage, totalPages)
  }, [currentPage, totalPages])

  const paginatedReviews = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * REVIEWS_PER_PAGE
    return filteredReviews.slice(startIndex, startIndex + REVIEWS_PER_PAGE)
  }, [filteredReviews, safeCurrentPage])

  const pageNumbers = useMemo(() => {
    return buildCompactPagination(safeCurrentPage, totalPages, paginationLimit)
  }, [paginationLimit, safeCurrentPage, totalPages])

  const handleUpdateStatus = async (review: Review, status: Review['status']) => {
    const updated = await apiService.updateReviewStatus(review.id, status)
    if (!updated) {
      window.alert('No se pudo actualizar el comentario')
      return
    }

    window.alert('Comentario actualizado correctamente')
    setReviews((prev) => prev.map((item) => (item.id === review.id ? updated : item)))
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-primary-900 via-primary-700 to-primary-500">
      <StoreHeader subtitle="Gestionar comentarios" />

      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-32 md:px-8">
        <section className="rounded-3xl bg-white p-6 shadow-2xl md:p-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Moderación de comentarios</h1>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="rounded-xl border border-primary-500 px-4 py-2 text-sm font-semibold text-primary-700"
            >
              ← Volver
            </button>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'pending', label: 'Pendientes' },
              { key: 'approved', label: 'Aprobados' },
              { key: 'rejected', label: 'Rechazados' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setStatusFilter(item.key as typeof statusFilter)
                  setCurrentPage(1)
                }}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  statusFilter === item.key
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-primary-500 hover:text-primary-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-600">Cargando comentarios...</div>
          ) : filteredReviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
              <p className="text-lg font-semibold text-gray-800">No hay comentarios para este filtro</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedReviews.map((review) => (
                <article key={review.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{review.customerName}</p>
                      <p className="text-xs font-semibold text-primary-700">{review.category} · {review.productName}</p>
                    </div>
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                        review.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : review.status === 'rejected'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {review.status === 'approved' ? 'Aprobado' : review.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                    </span>
                  </div>

                  <p className="mb-2 text-xs text-gray-500">⭐ {review.rating}/5 · {review.recommend ? '❤️ Recomienda' : '🤍 No recomienda'}</p>
                  <p className="text-sm text-gray-700">“{review.comment}”</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleUpdateStatus(review, 'approved')}
                      className="rounded-lg border border-emerald-400 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      ✅ Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleUpdateStatus(review, 'rejected')}
                      className="rounded-lg border border-rose-400 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      ❌ Rechazar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleUpdateStatus(review, 'pending')}
                      className="rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                    >
                      ⏳ Pendiente
                    </button>
                  </div>
                </article>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-700">
                <p>
                  Página {safeCurrentPage} de {totalPages}
                </p>
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                    disabled={safeCurrentPage === 1}
                    className="rounded-lg border border-primary-300 px-3 py-1.5 font-semibold text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="sm:hidden">←</span>
                    <span className="hidden sm:inline">← Anterior</span>
                  </button>
                  {pageNumbers.map((pageItem, index) => {
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
                    <span className="sm:hidden">→</span>
                    <span className="hidden sm:inline">Siguiente →</span>
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
