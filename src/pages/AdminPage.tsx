import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { StoreFooter } from '../components/StoreFooter'
import { StoreHeader } from '../components/StoreHeader'
import { apiService } from '../services/api'
import { setProductBannerFlag } from '../utils/bannerSettings'

const NEW_CATEGORY_VALUE = '__new_category__'

const sortCategories = (items: string[]) => {
  return [...items].sort((first, second) => first.localeCompare(second, 'es', { sensitivity: 'base' }))
}

export const AdminPage = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [isNew, setIsNew] = useState(true)
  const [showInBanner, setShowInBanner] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadCategories = async () => {
      const fetchedProducts = await apiService.getProducts()
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
    }

    void loadCategories()
  }, [])

  useEffect(() => {
    if (imageFile) {
      const objectUrl = URL.createObjectURL(imageFile)
      setPreview(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }
    setPreview('')
    return
  }, [imageFile])

  const resetForm = () => {
    setName('')
    setDescription('')
    setPrice('')
    setSelectedCategory('')
    setNewCategory('')
    setImageFile(null)
    setPreview('')
    setIsNew(true)
    setShowInBanner(true)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const categoryValue = selectedCategory === NEW_CATEGORY_VALUE ? newCategory : selectedCategory
    const normalizedCategory = categoryValue.trim()

    if (!name || !description || !price || !normalizedCategory || !imageFile) {
      window.alert('Por favor completa todos los campos')
      return
    }

    const priceNumber = Number(price)
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      window.alert('El precio debe ser un número válido')
      return
    }

    setLoading(true)
    const uploadedImage = await apiService.uploadImage(imageFile)
    if (!uploadedImage) {
      setLoading(false)
      window.alert('No se pudo subir la imagen')
      return
    }

    const response = await apiService.addProduct({
      name,
      description,
      price: priceNumber,
      category: normalizedCategory,
      image: uploadedImage,
      isNew,
    })

    setLoading(false)
    if (!response) {
      window.alert('No se pudo agregar el producto')
      return
    }

    setCategories((prev) => {
      const alreadyExists = prev.some((item) => item.trim().toLowerCase() === normalizedCategory.toLowerCase())
      if (alreadyExists) return prev
      return sortCategories([...prev, normalizedCategory])
    })

    setProductBannerFlag(response.id, showInBanner)

    window.alert('Producto agregado correctamente')
    resetForm()
  }

  const logout = () => {
    localStorage.removeItem('@fl_store_auth')
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 via-primary-700 to-primary-500">
      <StoreHeader subtitle="Panel de administrador" />

      <main className="mx-auto w-full max-w-4xl px-4 pb-10 pt-32 md:px-8">
        <section className="rounded-3xl bg-white p-6 shadow-2xl md:p-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Agregar Producto</h1>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Cerrar sesión
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Foto del producto</span>
              <input
                id="admin-image-file"
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                className="hidden"
              />
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="admin-image-file"
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
                <p className="text-xs text-gray-600">{imageFile ? imageFile.name : 'Ningún archivo seleccionado'}</p>
              </div>
            </label>

            {preview ? (
              <img src={preview} alt="Preview" className="h-56 w-full rounded-2xl object-cover" />
            ) : (
              <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-gray-300 text-gray-500">
                Sin imagen seleccionada
              </div>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Nombre del producto</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej: iPhone 15 Pro"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none ring-primary-200 focus:ring"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Descripción</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe el producto..."
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
                  placeholder="299.99"
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
              disabled={loading}
              className="w-full rounded-xl bg-primary-600 px-4 py-3 text-base font-bold text-white transition hover:bg-primary-700 disabled:opacity-60"
            >
              {loading ? 'Publicando...' : 'Publicar Producto'}
            </button>
          </form>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate('/admin/productos')}
              className="rounded-xl border border-primary-500 px-4 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-50"
            >
              Gestionar Productos
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Ver Tienda
            </button>
          </div>
        </section>
      </main>

      <StoreFooter />
    </div>
  )
}
