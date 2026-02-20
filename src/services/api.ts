import axios from 'axios'
import type { Product } from '../types/product'
import type { CreateReviewPayload, PublicReviewStats, Review } from '../types/review'

const API_URL = 'https://fl-store-backend.onrender.com/api'

type ProductApiResponse = Partial<Product> & { _id?: string }
type ReviewApiResponse = Partial<Review> & { _id?: string }

interface PublicReviewsResponse {
  reviews: ReviewApiResponse[]
  stats?: Partial<PublicReviewStats>
}

interface PublicMetricsResponse {
  totalVisits?: number
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
  }
}

const normalizeReview = (item: ReviewApiResponse): Review => {
  return {
    id: String(item.id ?? item._id ?? ''),
    customerName: item.customerName ?? '',
    productId: item.productId ?? '',
    productName: item.productName ?? '',
    category: item.category ?? '',
    rating: Number(item.rating ?? 0),
    comment: item.comment ?? '',
    recommend: Boolean(item.recommend),
    likeCount: Number(item.likeCount ?? 0),
    likedByVisitor: Boolean(item.likedByVisitor),
    status: (item.status as Review['status']) ?? 'pending',
    createdAt: item.createdAt ?? '',
  }
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
      const response = await axios.post<ProductApiResponse>(`${API_URL}/products`, product)
      return normalizeProduct(response.data)
    } catch (error) {
      console.error('Error adding product:', error)
      return null
    }
  },

  async updateProduct(id: string, product: Product): Promise<Product | null> {
    try {
      const response = await axios.put<ProductApiResponse>(`${API_URL}/products/${id}`, product)
      return normalizeProduct(response.data)
    } catch (error) {
      console.error('Error updating product:', error)
      return null
    }
  },

  async deleteProduct(id: string): Promise<boolean> {
    try {
      await axios.delete(`${API_URL}/products/${id}`)
      return true
    } catch (error) {
      console.error('Error deleting product:', error)
      return false
    }
  },

  async uploadImage(file: File): Promise<string | null> {
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await axios.post<{ url: string }>(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      return response.data.url
    } catch (error) {
      console.error('Error uploading image:', error)
      return null
    }
  },

  async login(username: string, password: string): Promise<boolean> {
    try {
      const response = await axios.post<{ success: boolean }>(`${API_URL}/login`, {
        username,
        password,
      })
      return response.data.success
    } catch (error) {
      console.error('Error in login:', error)
      return false
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
      return {
        reviews: (response.data.reviews ?? []).map(normalizeReview),
        stats: {
          totalReviews: Number(response.data.stats?.totalReviews ?? 0),
          averageRating: Number(response.data.stats?.averageRating ?? 0),
          totalLikes: Number(response.data.stats?.totalLikes ?? 0),
        },
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
      const response = await axios.get<ReviewApiResponse[]>(`${API_URL}/reviews/admin`)
      return response.data.map(normalizeReview)
    } catch (error) {
      console.error('Error loading admin reviews:', error)
      return []
    }
  },

  async updateReviewStatus(id: string, status: Review['status']): Promise<Review | null> {
    try {
      const response = await axios.patch<ReviewApiResponse>(`${API_URL}/reviews/${id}/status`, { status })
      return normalizeReview(response.data)
    } catch (error) {
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

  async getPublicMetrics(): Promise<{ totalVisits: number }> {
    try {
      const response = await axios.get<PublicMetricsResponse>(`${API_URL}/metrics/public`)
      return {
        totalVisits: Number(response.data.totalVisits ?? 0),
      }
    } catch (error) {
      console.error('Error loading public metrics:', error)
      return { totalVisits: 0 }
    }
  },

  async registerVisit(visitorId: string): Promise<{ totalVisits: number } | null> {
    try {
      const response = await axios.post<PublicMetricsResponse>(`${API_URL}/metrics/visit`, { visitorId })
      return {
        totalVisits: Number(response.data.totalVisits ?? 0),
      }
    } catch (error) {
      console.error('Error registering visit:', error)
      return null
    }
  },
}
