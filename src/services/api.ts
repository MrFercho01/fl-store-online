import axios from 'axios'
import type { Product } from '../types/product'
import type { CreateReviewPayload, PublicReviewStats, Review } from '../types/review'

const API_URL = 'https://fl-store-backend.onrender.com/api'
export const AUTH_TOKEN_STORAGE_KEY = '@fl_store_admin_token'

type ProductApiResponse = Partial<Product> & { _id?: string }
type ReviewApiResponse = Partial<Review> & { _id?: string; visitorLikes?: string[] }

interface PublicReviewsResponse {
  reviews: ReviewApiResponse[]
  stats?: Partial<PublicReviewStats>
}

interface PublicMetricsResponse {
  totalVisits?: number
  customerVisits?: number
}

interface AdminMetricsResponse {
  totalVisits?: number
  apkDownloads?: number
  customerVisits?: number
  internalVisits?: number
  todayVisits?: number
  todayCustomerVisits?: number
  uniqueVisitors?: number
  uniqueCustomerVisitors?: number
  recentVisits?: Array<{
    visitorId?: string
    ipAddress?: string
    lastVisitedAt?: string
    isInternalVisit?: boolean
    visitSource?: 'customer' | 'admin' | 'internal_ip'
  }>
}

interface MobileApkInfoResponse {
  available?: boolean
  downloadCount?: number
  downloadUrl?: string
  fileName?: string
}

interface PushStatsResponse {
  totalTokens?: number
  activeTokens?: number
  activeByPlatform?: {
    android?: number
    ios?: number
    web?: number
  }
  lastSeenAt?: string | null
}

const normalizeProduct = (item: ProductApiResponse): Product => {
  return {
    id: String(item.id ?? item._id ?? ''),
    name: item.name ?? '',
    description: item.description ?? '',
    price: Number(item.price ?? 0),
    image: item.image ?? '',
    category: item.category ?? '',
    isNew: Boolean(item.isNew),
    isEnabled: item.isEnabled !== false,
  }
}

const normalizeReview = (item: ReviewApiResponse): Review => {
  const visitorLikes = Array.isArray(item.visitorLikes) ? item.visitorLikes : []
  const computedLikeCount = (Boolean(item.recommend) ? 1 : 0) + visitorLikes.length

  return {
    id: String(item.id ?? item._id ?? ''),
    customerName: item.customerName ?? '',
    productId: item.productId ?? '',
    productName: item.productName ?? '',
    category: item.category ?? '',
    rating: Number(item.rating ?? 0),
    comment: item.comment ?? '',
    recommend: Boolean(item.recommend),
    likeCount: Number(item.likeCount ?? computedLikeCount),
    likedByVisitor: Boolean(item.likedByVisitor),
    status: (item.status as Review['status']) ?? 'pending',
    createdAt: item.createdAt ?? '',
  }
}

const getAuthToken = (): string => {
  return String(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '').trim()
}

const getAuthHeaders = () => {
  const token = getAuthToken()
  if (!token) return undefined

  return {
    Authorization: `Bearer ${token}`,
  }
}

const getRequiredAuthHeaders = (operation: string) => {
  const headers = getAuthHeaders()
  if (!headers) {
    throw new Error(`No hay token de administrador para ${operation}`)
  }

  return headers
}

export const authService = {
  setToken(token: string) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
    localStorage.setItem('@fl_store_auth', 'true')
  },
  clearToken() {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    localStorage.removeItem('@fl_store_auth')
  },
  hasToken() {
    return Boolean(getAuthToken())
  },
}

const handleAdminUnauthorized = (error: unknown) => {
  if (!axios.isAxiosError(error)) return
  if (error.response?.status !== 401) return

  authService.clearToken()
}

export const apiService = {
  async getProducts(): Promise<Product[]> {
    try {
      const response = await axios.get<ProductApiResponse[]>(`${API_URL}/products`)
      return response.data
        .map(normalizeProduct)
        .filter((item) => item.id && item.name && item.image)
    } catch (error) {
      console.error('Error loading products:', error)
      return []
    }
  },

  async getProductById(id: string): Promise<Product | null> {
    try {
      const response = await axios.get<ProductApiResponse>(`${API_URL}/products/${id}`)
      const product = normalizeProduct(response.data)
      return product.id ? product : null
    } catch {
      const products = await this.getProducts()
      return products.find((item) => item.id === id) ?? null
    }
  },

  async addProduct(product: Omit<Product, 'id'>): Promise<Product | null> {
    try {
      const response = await axios.post<ProductApiResponse>(`${API_URL}/products`, product, {
        headers: getRequiredAuthHeaders('agregar producto'),
      })
      return normalizeProduct(response.data)
    } catch (error) {
      handleAdminUnauthorized(error)
      console.error('Error adding product:', error)
      return null
    }
  },

  async updateProduct(id: string, product: Product): Promise<Product | null> {
    try {
      const response = await axios.put<ProductApiResponse>(`${API_URL}/products/${id}`, product, {
        headers: getRequiredAuthHeaders('actualizar producto'),
      })
      return normalizeProduct(response.data)
    } catch (error) {
      handleAdminUnauthorized(error)
      console.error('Error updating product:', error)
      return null
    }
  },

  async deleteProduct(id: string): Promise<boolean> {
    try {
      await axios.delete(`${API_URL}/products/${id}`, {
        headers: getRequiredAuthHeaders('deshabilitar producto'),
      })
      return true
    } catch (error) {
      handleAdminUnauthorized(error)
      console.error('Error deleting product:', error)
      return false
    }
  },

  async uploadImage(file: File): Promise<string | null> {
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await axios.post<{ url: string }>(`${API_URL}/upload`, formData, {
        headers: getRequiredAuthHeaders('subir imagen'),
      })

      return response.data.url
    } catch (error) {
      handleAdminUnauthorized(error)
      console.error('Error uploading image:', error)
      return null
    }
  },

  async login(username: string, password: string): Promise<string | null> {
    try {
      const response = await axios.post<{ success: boolean; token?: string }>(`${API_URL}/login`, {
        username,
        password,
      })
      if (!response.data.success || !response.data.token) {
        return null
      }

      return response.data.token
    } catch (error) {
      console.error('Error in login:', error)
      return null
    }
  },

  async createReview(payload: CreateReviewPayload): Promise<string | null> {
    try {
      const response = await axios.post<{ message: string }>(`${API_URL}/reviews`, payload)
      return response.data.message
    } catch (error) {
      console.error('Error creating review:', error)
      return null
    }
  },

  async getPublicReviews(visitorId?: string): Promise<{ reviews: Review[]; stats: PublicReviewStats }> {
    try {
      const response = await axios.get<PublicReviewsResponse>(`${API_URL}/reviews/public`, {
        params: visitorId ? { visitorId } : undefined,
      })

      const normalizedPublicReviews = (response.data.reviews ?? []).map(normalizeReview)
      const stats = {
        totalReviews: Number(response.data.stats?.totalReviews ?? 0),
        averageRating: Number(response.data.stats?.averageRating ?? 0),
        totalLikes: Number(response.data.stats?.totalLikes ?? 0),
      }

      return {
        reviews: normalizedPublicReviews,
        stats,
      }
    } catch (error) {
      console.error('Error loading public reviews:', error)
      return {
        reviews: [],
        stats: {
          totalReviews: 0,
          averageRating: 0,
          totalLikes: 0,
        },
      }
    }
  },

  async getAdminReviews(): Promise<Review[]> {
    try {
      const response = await axios.get<ReviewApiResponse[]>(`${API_URL}/reviews/admin`, {
        headers: getRequiredAuthHeaders('obtener reseñas administrativas'),
      })
      return response.data.map(normalizeReview)
    } catch (error) {
      handleAdminUnauthorized(error)
      console.error('Error loading admin reviews:', error)
      return []
    }
  },

  async updateReviewStatus(id: string, status: Review['status']): Promise<Review | null> {
    try {
      const response = await axios.patch<ReviewApiResponse>(`${API_URL}/reviews/${id}/status`, { status }, {
        headers: getRequiredAuthHeaders('actualizar estado de reseña'),
      })
      return normalizeReview(response.data)
    } catch (error) {
      handleAdminUnauthorized(error)
      console.error('Error updating review status:', error)
      return null
    }
  },

  async setReviewLike(
    reviewId: string,
    visitorId: string,
    liked: boolean
  ): Promise<{ likeCount: number; likedByVisitor: boolean } | null> {
    try {
      const response = await axios.patch<{ likeCount: number; likedByVisitor: boolean }>(
        `${API_URL}/reviews/${reviewId}/like`,
        { visitorId, liked }
      )

      return {
        likeCount: Number(response.data.likeCount ?? 0),
        likedByVisitor: Boolean(response.data.likedByVisitor),
      }
    } catch (error) {
      console.error('Error updating review like:', error)
      return null
    }
  },

  async getPublicMetrics(): Promise<{ totalVisits: number; customerVisits: number }> {
    try {
      const response = await axios.get<PublicMetricsResponse>(`${API_URL}/metrics/public`)
      return {
        totalVisits: Number(response.data.totalVisits ?? 0),
        customerVisits: Number(response.data.customerVisits ?? response.data.totalVisits ?? 0),
      }
    } catch (error) {
      console.error('Error loading public metrics:', error)
      return { totalVisits: 0, customerVisits: 0 }
    }
  },

  async registerVisit(visitorId: string, isAdminVisit = false): Promise<{ totalVisits: number; customerVisits: number } | null> {
    try {
      const response = await axios.post<PublicMetricsResponse>(`${API_URL}/metrics/visit`, { visitorId, isAdminVisit })
      return {
        totalVisits: Number(response.data.totalVisits ?? 0),
        customerVisits: Number(response.data.customerVisits ?? response.data.totalVisits ?? 0),
      }
    } catch (error) {
      console.error('Error registering visit:', error)
      return null
    }
  },

  async getAdminMetrics(): Promise<{
    totalVisits: number
    apkDownloads: number
    customerVisits: number
    internalVisits: number
    todayVisits: number
    todayCustomerVisits: number
    uniqueVisitors: number
    uniqueCustomerVisitors: number
    recentVisits: Array<{
      visitorId: string
      ipAddress: string
      lastVisitedAt: string
      isInternalVisit: boolean
      visitSource: 'customer' | 'admin' | 'internal_ip'
    }>
  } | null> {
    try {
      const response = await axios.get<AdminMetricsResponse>(`${API_URL}/metrics/admin`, {
        headers: getRequiredAuthHeaders('obtener métricas administrativas'),
      })
      return {
        totalVisits: Number(response.data.totalVisits ?? 0),
        apkDownloads: Number(response.data.apkDownloads ?? 0),
        customerVisits: Number(response.data.customerVisits ?? response.data.totalVisits ?? 0),
        internalVisits: Number(response.data.internalVisits ?? 0),
        todayVisits: Number(response.data.todayVisits ?? 0),
        todayCustomerVisits: Number(response.data.todayCustomerVisits ?? response.data.todayVisits ?? 0),
        uniqueVisitors: Number(response.data.uniqueVisitors ?? 0),
        uniqueCustomerVisitors: Number(response.data.uniqueCustomerVisitors ?? response.data.uniqueVisitors ?? 0),
        recentVisits: (response.data.recentVisits ?? []).map((item) => ({
          visitorId: String(item.visitorId ?? ''),
          ipAddress: String(item.ipAddress ?? ''),
          lastVisitedAt: String(item.lastVisitedAt ?? ''),
          isInternalVisit: Boolean(item.isInternalVisit),
          visitSource: (item.visitSource ?? 'customer') as 'customer' | 'admin' | 'internal_ip',
        })),
      }
    } catch (error) {
      handleAdminUnauthorized(error)
      console.error('Error loading admin metrics:', error)
      return null
    }
  },

  async recalculateAdminMetrics(): Promise<{
    totalVisits: number
    apkDownloads: number
    customerVisits: number
    internalVisits: number
    todayVisits: number
    todayCustomerVisits: number
    uniqueVisitors: number
    uniqueCustomerVisitors: number
    recentVisits: Array<{
      visitorId: string
      ipAddress: string
      lastVisitedAt: string
      isInternalVisit: boolean
      visitSource: 'customer' | 'admin' | 'internal_ip'
    }>
  } | null> {
    try {
      const response = await axios.post<AdminMetricsResponse & { message?: string }>(`${API_URL}/metrics/admin/recalculate`, null, {
        headers: getRequiredAuthHeaders('recalcular métricas administrativas'),
      })
      return {
        totalVisits: Number(response.data.totalVisits ?? 0),
        apkDownloads: Number(response.data.apkDownloads ?? 0),
        customerVisits: Number(response.data.customerVisits ?? response.data.totalVisits ?? 0),
        internalVisits: Number(response.data.internalVisits ?? 0),
        todayVisits: Number(response.data.todayVisits ?? 0),
        todayCustomerVisits: Number(response.data.todayCustomerVisits ?? response.data.todayVisits ?? 0),
        uniqueVisitors: Number(response.data.uniqueVisitors ?? 0),
        uniqueCustomerVisitors: Number(response.data.uniqueCustomerVisitors ?? 0),
        recentVisits: (response.data.recentVisits ?? []).map((item) => ({
          visitorId: String(item.visitorId ?? ''),
          ipAddress: String(item.ipAddress ?? ''),
          lastVisitedAt: String(item.lastVisitedAt ?? ''),
          isInternalVisit: Boolean(item.isInternalVisit),
          visitSource: (item.visitSource ?? 'customer') as 'customer' | 'admin' | 'internal_ip',
        })),
      }
    } catch (error) {
      handleAdminUnauthorized(error)
      console.error('Error recalculating admin metrics:', error)
      return null
    }
  },

  async getMobileApkInfo(): Promise<{ available: boolean; downloadCount: number; downloadUrl: string } | null> {
    try {
      const response = await axios.get<MobileApkInfoResponse>(`${API_URL}/mobile/apk-info`)
      return {
        available: Boolean(response.data.available),
        downloadCount: Number(response.data.downloadCount ?? 0),
        downloadUrl: String(response.data.downloadUrl ?? ''),
      }
    } catch (error) {
      console.error('Error loading mobile apk info:', error)
      return null
    }
  },

  async getPushTokenStats(): Promise<{
    totalTokens: number
    activeTokens: number
    activeByPlatform: { android: number; ios: number; web: number }
    lastSeenAt: string | null
  } | null> {
    try {
      const response = await axios.get<PushStatsResponse>(`${API_URL}/mobile/push/stats`, {
        headers: getRequiredAuthHeaders('obtener estadísticas push'),
      })
      return {
        totalTokens: Number(response.data.totalTokens ?? 0),
        activeTokens: Number(response.data.activeTokens ?? 0),
        activeByPlatform: {
          android: Number(response.data.activeByPlatform?.android ?? 0),
          ios: Number(response.data.activeByPlatform?.ios ?? 0),
          web: Number(response.data.activeByPlatform?.web ?? 0),
        },
        lastSeenAt: response.data.lastSeenAt ? String(response.data.lastSeenAt) : null,
      }
    } catch (error) {
      handleAdminUnauthorized(error)
      console.error('Error loading push token stats:', error)
      return null
    }
  },
}
