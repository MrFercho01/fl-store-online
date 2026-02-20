const PRODUCT_STATUS_STORAGE_KEY = '@fl_store_product_status'

type ProductStatusMap = Record<string, boolean>

const readProductStatusMap = (): ProductStatusMap => {
  try {
    const raw = localStorage.getItem(PRODUCT_STATUS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ProductStatusMap
    return parsed ?? {}
  } catch {
    return {}
  }
}

const writeProductStatusMap = (data: ProductStatusMap) => {
  localStorage.setItem(PRODUCT_STATUS_STORAGE_KEY, JSON.stringify(data))
}

export const isProductEnabled = (productId: string): boolean => {
  const map = readProductStatusMap()
  if (productId in map) {
    return map[productId]
  }
  return true
}

export const setProductEnabledStatus = (productId: string, enabled: boolean) => {
  const map = readProductStatusMap()
  map[productId] = enabled
  writeProductStatusMap(map)
}
