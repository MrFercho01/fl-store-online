export interface Review {
  id: string
  customerName: string
  productId: string
  productName: string
  category: string
  rating: number
  comment: string
  recommend: boolean
  likeCount: number
  likedByVisitor: boolean
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export interface PublicReviewStats {
  totalReviews: number
  averageRating: number
  totalLikes: number
}

export interface CreateReviewPayload {
  customerName: string
  productId: string
  productName: string
  category: string
  rating: number
  comment: string
  recommend: boolean
}
