import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { StoreFooter } from '../components/StoreFooter'
import { StoreHeader } from '../components/StoreHeader'
import { apiService } from '../services/api'
import type { Product } from '../types/product'
import { getProductBannerFlag, setProductBannerFlag } from '../utils/bannerSettings'

const NEW_CATEGORY_VALUE = '__new_category__'

const sortCategories = (items: string[]) => {
  return [...items].sort((first, second) => first.localeCompare(second, 'es', { sensitivity: 'base' }))
}

export const EditProductPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [showInBanner, setShowInBanner] = useState(false)

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) {
        setLoading(false)
        return
      }

      setLoading(true)
      const [fetchedProduct, fetchedProducts] = await Promise.all([
        apiService.getProductById(id),
        apiService.getProducts(),
      ])

      const categoryMap = new Map<string, string>()
      fetchedProducts.forEach((item) => {
        const categoryValue = item.category.trim()
        if (!categoryValue) return

        const key = categoryValue.toLowerCase()
        if (!categoryMap.has(key)) {
          categoryMap.set(key, categoryValue)
        }
      })

      setCategories(sortCategories(Array.from(categoryMap.values())))

      setProduct(fetchedProduct)
      if (fetchedProduct) {
        setName(fetchedProduct.name)
        setDescription(fetchedProduct.description)
        setPrice(String(fetchedProduct.price))
        setSelectedCategory(fetchedProduct.category.trim())
        setPreview(fetchedProduct.image)
        setIsNew(fetchedProduct.isNew)
        setShowInBanner(getProductBannerFlag(fetchedProduct))
      }
      setLoading(false)
    }

    void loadProduct()
  }, [id])

  useEffect(() => {
    if (imageFile) {
      const objectUrl = URL.createObjectURL(imageFile)
      setPreview(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }
    return
  }, [imageFile])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!id || !product) return

    const categoryValue = selectedCategory === NEW_CATEGORY_VALUE ? newCategory : selectedCategory
    const normalizedCategory = categoryValue.trim()

    if (!name || !description || !price || !normalizedCategory) {
      window.alert('Por favor completa todos los campos')
      return
    }

    const priceNumber = Number(price)
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      window.alert('El precio debe ser un número válido')
      return
    }

    setSaving(true)

    let finalImage = product.image
    if (imageFile) {
      const uploadedImage = await apiService.uploadImage(imageFile)
      if (!uploadedImage) {
        setSaving(false)
        window.alert('No se pudo subir la imagen')
        return
      }
      finalImage = uploadedImage
    }

    const updatedProduct: Product = {
      id: product.id,
      name,
      description,
      price: priceNumber,
      category: normalizedCategory,
      image: finalImage,
      isNew,
    }

    const response = await apiService.updateProduct(id, updatedProduct)
    setSaving(false)

    if (!response) {
      window.alert('No se pudo actualizar el producto')
      return
    }

    setCategories((prev) => {
      const alreadyExists = prev.some((item) => item.trim().toLowerCase() === normalizedCategory.toLowerCase())
      if (alreadyExists) return prev
      return sortCategories([...prev, normalizedCategory])
    })

    setProductBannerFlag(product.id, showInBanner)

    window.alert('Producto actualizado correctamente')
    navigate('/admin/productos')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 via-primary-700 to-primary-500">
      <StoreHeader subtitle="Editar producto" />

      <main className="mx-auto w-full max-w-4xl px-4 pb-10 pt-32 md:px-8">
        <section className="rounded-3xl bg-white p-6 shadow-2xl md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Editar Producto</h1>
            <button
              type="button"
              onClick={() => navigate('/admin/productos')}
              className="rounded-xl border border-primary-500 px-4 py-2 text-sm font-semibold text-primary-700"
            >
              ← Cancelar
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-600">Cargando producto...</div>
          ) : !product ? (
            <div className="py-16 text-center">
              <p className="text-lg font-semibold text-gray-800">No se encontró el producto</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Cambiar foto</span>
                <input
                  id="edit-image-file"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                  className="hidden"
                />
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="edit-image-file"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
                    >
                      📸 Seleccionar imagen
                    </label>
                    {preview ? (
                      <img
                        src={preview}
                        alt="Miniatura"
                        className="h-11 w-11 rounded-full border border-primary-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-gray-300 text-lg text-gray-400">
                        🖼️
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{imageFile ? imageFile.name : 'Sin cambios de imagen'}</p>
                </div>
              </label>

              {preview ? (
                <img src={preview} alt="Preview" className="h-56 w-full rounded-2xl object-cover" />
              ) : null}

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Nombre del producto</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none ring-primary-200 focus:ring"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Descripción</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none ring-primary-200 focus:ring"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-gray-700">Precio ($)</span>
                  <input
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none ring-primary-200 focus:ring"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-gray-700">Categoría</span>
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none ring-primary-200 focus:ring"
                  >
                    <option value="">Selecciona una categoría</option>
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                    <option value={NEW_CATEGORY_VALUE}>+ Nueva categoría</option>
                  </select>
                </label>
              </div>

              {selectedCategory === NEW_CATEGORY_VALUE ? (
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-gray-700">Nueva categoría</span>
                  <input
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    placeholder="Ej: Accesorios"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none ring-primary-200 focus:ring"
                  />
                </label>
              ) : null}

              <label className="flex items-center gap-3 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3">
                <input type="checkbox" checked={isNew} onChange={() => setIsNew((prev) => !prev)} />
                <span className="text-sm font-semibold text-gray-700">Marcar como nuevo</span>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={showInBanner}
                  onChange={() => setShowInBanner((prev) => !prev)}
                />
                <span className="text-sm font-semibold text-amber-800">Mostrar en banner de novedades</span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-primary-600 px-4 py-3 text-base font-bold text-white transition hover:bg-primary-700 disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          )}
        </section>
      </main>

      <StoreFooter />
    </div>
  )
}
