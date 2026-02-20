import axios from 'axios'
import type { Product } from '../types/product'

const API_URL = 'https://fl-store-backend.onrender.com/api'

type ProductApiResponse = Partial<Product> & { _id?: string }

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
}
