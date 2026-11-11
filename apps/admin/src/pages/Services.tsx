import React, { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, Search, Upload, Wrench, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Spinner, SkeletonLoader } from '../components/Spinner'
import { compressImageWithStats } from '../utils/imageCompressor'

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
  created_at: string;
}

export const Services: React.FC = () => {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const initialLoadDone = useRef(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [currentService, setCurrentService] = useState<ServiceItem | null>(null)
  
  // Form states
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [features, setFeatures] = useState('')
  
  // Upload States
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(null)

  // Categories from DB
  const [dbCategories, setDbCategories] = useState<string[]>([])

  const { showToast } = useToast()
  // 'All' + DB categories for filter display
  const categories = ['All', ...dbCategories]

  const fetchDbCategories = async () => {
    try {
      const { data } = await supabase
        .from('service_categories')
        .select('name')
        .order('name', { ascending: true })
      if (data) {
        const names = data.map((c: any) => c.name)
        setDbCategories(names)
        // Set default selected category for form if not set
        setCategory((prev) => prev || (names[0] || ''))
      }
    } catch (err) {
      console.error('Category fetch error:', err)
    }
  }

  const fetchServices = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      setServices((data as ServiceItem[]) || [])
    } catch (err: any) {
      if (!silent) showToast('Failed to load services: ' + err.message, 'error')
    } finally {
      setLoading(false)
      initialLoadDone.current = true
    }
  }

  useEffect(() => {
    fetchServices()
    fetchDbCategories()

    const channel = supabase
      .channel('services-realtime-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        fetchServices(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_categories' }, () => {
        fetchDbCategories()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const openAddModal = () => {
    setCurrentService(null)
    setName('')
    setDescription('')
    setPrice('')
    setCategory(dbCategories[0] || '')
    setImageUrl('')
    setFeatures('')
    setUploadProgress(null)
    setIsFormOpen(true)
  }

  const openEditModal = (service: any) => {
    setCurrentService(service)
    setName(service.name)
    setDescription(service.description || '')
    setPrice(service.price.toString())
    setCategory(service.category || 'Basic')
    setImageUrl(service.image_url || '')
    setFeatures(service.features || '')
    setUploadProgress(null)
    setIsFormOpen(true)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      showToast('Unsupported format! Please upload JPG, PNG or WEBP.', 'warning')
      return
    }

    setUploadingFile(true)
    setUploadProgress(20)

    try {
      // 1. Compress image client-side strictly under 1MB
      setUploadProgress(30)
      const result = await compressImageWithStats(file, { maxWidth: 1000, maxHeight: 1000, maxSizeMB: 0.85 })
      const compressed = result.file
      setUploadProgress(60)

      let finalUrl = ''

      // 2. Upload to Supabase Storage (upsert: false avoids RLS UPDATE policy rejection)
      try {
        const fileExt = compressed.name.split('.').pop() || 'webp'
        const fileName = `serv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
        const filePath = `services/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('rwash-images')
          .upload(filePath, compressed, { 
            contentType: compressed.type,
            cacheControl: '3600', 
            upsert: false 
          })

        if (!uploadError) {
          const { data } = supabase.storage.from('rwash-images').getPublicUrl(filePath)
          if (data?.publicUrl) {
            finalUrl = data.publicUrl
          }
        } else {
          console.warn('Storage bucket upload notice:', uploadError.message)
        }
      } catch (storageErr: any) {
        console.warn('Supabase storage notice:', storageErr)
      }

      // 3. 100% Fail-safe Fallback: If Storage has RLS restriction, fallback to compressed WebP Data URL
      if (!finalUrl) {
        finalUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = (err) => reject(err)
          reader.readAsDataURL(compressed)
        })
      }

      setImageUrl(finalUrl)
      setUploadProgress(100)
      showToast(`Image ready! Compressed: ${result.originalFormatted} ➔ ${result.compressedFormatted} (${result.savingsPercent}% saved)`, 'success')
    } catch (err: any) {
      showToast('Upload error: ' + err.message, 'error')
      setUploadProgress(null)
    } finally {
      setUploadingFile(false)
      e.target.value = ''
    }
  }

  const removeServiceImage = () => {
    setImageUrl('')
    setUploadProgress(null)
    showToast('Image removed from draft. Save to apply.', 'info')
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !price) {
      showToast('Name and Price are required', 'warning')
      return
    }

    setSubmitting(true)
    const serviceData: any = {
      name,
      description: description || null,
      price: parseFloat(price),
      category,
      image_url: imageUrl || null,
      duration: 30, // Default duration in minutes to satisfy database constraint
    }

    if (features) {
      serviceData.features = features
    }

    try {
      if (currentService) {
        let { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', currentService.id)

        // Automatic fallback if 'features' column is missing in Supabase schema
        if (error && error.message?.includes('features')) {
          delete serviceData.features
          const retryRes = await supabase
            .from('services')
            .update(serviceData)
            .eq('id', currentService.id)
          error = retryRes.error
        }

        if (error) throw error
        showToast('Service updated successfully', 'success')
      } else {
        let { error } = await supabase
          .from('services')
          .insert([serviceData])

        // Automatic fallback if 'features' column is missing in Supabase schema
        if (error && error.message?.includes('features')) {
          delete serviceData.features
          const retryRes = await supabase
            .from('services')
            .insert([serviceData])
          error = retryRes.error
        }

        if (error) throw error
        showToast('Service added successfully', 'success')
      }
      setIsFormOpen(false)
      fetchServices()
    } catch (err: any) {
      showToast('Error saving service: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const triggerDelete = (service: ServiceItem) => {
    setServiceToDelete(service)
    setIsConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!serviceToDelete) return
    setSubmitting(true)
    try {
      // 1. Hard delete row from Supabase database with .select() verification
      const { data, error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceToDelete.id)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        const { error: retryError } = await supabase
          .from('services')
          .delete()
          .match({ id: serviceToDelete.id })
        
        if (retryError) throw retryError
      }

      // 2. Hard delete image from storage if present
      if (serviceToDelete.image_url && serviceToDelete.image_url.includes('rwash-images')) {
        try {
          const parts = serviceToDelete.image_url.split('/rwash-images/')
          if (parts[1]) {
            const rawPath = parts[1].split('?')[0]
            await supabase.storage.from('rwash-images').remove([decodeURIComponent(rawPath)])
          }
        } catch (stErr) {
          console.warn('Storage image deletion note:', stErr)
        }
      }

      showToast('Service permanently deleted from database & storage!', 'success')
      setIsConfirmOpen(false)
      setServiceToDelete(null)
      fetchServices()
    } catch (err: any) {
      showToast('Failed to delete service: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Services Catalog</h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">Manage details and pricing of car wash offerings.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white font-semibold rounded-2xl transition-all shadow-md shadow-primary-600/15"
        >
          <Plus className="h-5 w-5" />
          <span>Add Service</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search service name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-750 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          />
        </div>

        <div className="flex overflow-x-auto gap-1.5 pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-primary-50 text-primary-700 border border-primary-100'
                  : 'bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-750'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services List Content */}
      {loading ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
          <SkeletonLoader rows={4} />
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 py-16 text-center shadow-xs">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4 border border-slate-100">
            <Wrench className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Services</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">Create catalog items to populate records.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
            >
              <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                {service.image_url ? (
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Wrench className="h-10 w-10 stroke-1 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">No Image</span>
                  </div>
                )}
                <span className="absolute top-3 left-3 bg-slate-900/60 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/10">
                  {service.category || 'Basic'}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 truncate mb-1">{service.name}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 h-9 mb-4">
                    {service.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-2xl font-black text-primary-600">
                    ₹{parseFloat(service.price.toString()).toFixed(2)}
                  </span>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => openEditModal(service)}
                      className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors border border-transparent hover:border-primary-100"
                    >
                      <Edit2 className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={() => triggerDelete(service)}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={currentService ? 'Edit Service' : 'Add New Service'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Service Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Deluxe Wash"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 29.99"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-855 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Category
              </label>
              {dbCategories.length > 0 ? (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                >
                  {dbCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Basic, Premium…"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              )}
              <p className="text-[10px] text-slate-400 mt-1">Manage categories from the Categories page in the sidebar.</p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detail overview..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Detailing Features (One per line - Press Enter for next)
            </label>
            <textarea
              rows={3}
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder="e.g.&#10;Hand washed with eco shampoo&#10;Interior vacuumed&#10;Tire shine applied"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>

          {/* Image Upload with Compression & Progress Bar */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Service Image (JPEG, PNG, WEBP)
            </label>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl cursor-pointer text-xs font-bold text-slate-750 transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>{uploadingFile ? 'Uploading & Compressing...' : 'Upload Image File'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                </label>
                {uploadingFile && <Spinner size="small" />}
              </div>

              {/* Progress Bar Indicator */}
              {uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-550">
                    <span>Compressing & uploading image</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Preview with Replace/Delete Option */}
              {imageUrl && (
                <div className="relative h-36 w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt="Service Preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeServiceImage}
                    className="absolute top-2 right-2 bg-slate-900/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-slate-900 transition-colors"
                  >
                    Delete Image
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingFile}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 active:scale-[0.98] rounded-xl transition-all shadow-md shadow-primary-600/10 flex items-center gap-1.5"
            >
              {submitting ? 'Saving...' : 'Save Service'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Delete Service?"
        message={`Are you sure you want to delete the service "${serviceToDelete?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => {
          setIsConfirmOpen(false)
          setServiceToDelete(null)
        }}
        isLoading={submitting}
      />
    </div>
  )
}
