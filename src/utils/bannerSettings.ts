import type { Product } from '../types/product'

const BANNER_STORAGE_KEY = '@fl_store_banner_products'

type BannerMap = Record<string, boolean>

const readBannerMap = (): BannerMap => {
  try {
    const raw = localStorage.getItem(BANNER_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as BannerMap
    return parsed ?? {}
  } catch {
    return {}
  }
}

const writeBannerMap = (data: BannerMap) => {
  localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(data))
}

export const getProductBannerFlag = (product: Product): boolean => {
  const map = readBannerMap()
  if (product.id in map) {
    return map[product.id]
  }
  return product.isNew
}

export const setProductBannerFlag = (productId: string, showInBanner: boolean) => {
  const map = readBannerMap()
  map[productId] = showInBanner
  writeBannerMap(map)
}

export const removeProductBannerFlag = (productId: string) => {
  const map = readBannerMap()
  if (productId in map) {
    delete map[productId]
    writeBannerMap(map)
  }
}
