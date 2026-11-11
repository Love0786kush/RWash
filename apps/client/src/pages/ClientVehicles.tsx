import React, { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Car, Upload, Image as ImageIcon, Globe, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useClientAuth } from '../context/ClientAuthContext'
import { useToast } from '../context/ToastContext'
import { SkeletonLoader } from '../components/Spinner'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { compressImageWithStats } from '../utils/imageCompressor'

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  vehicle_type: string;
  vehicle_number: string;
  color: string;
  image_url?: string | null;
  created_at?: string;
}

export const ClientVehicles: React.FC = () => {
  const { user } = useClientAuth()
  const { showToast } = useToast()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null)
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [vehicleType, setVehicleType] = useState('Sedan')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [color, setColor] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Confirm delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchVehicles = async () => {
    if (!user) return
    try {
      setLoading(true)

      const { data: custData } = await supabase
        .from('customers')
        .select('id')
        .or(`profile_id.eq.${user.id},id.eq.${user.id}${user.phone ? `,phone.eq.${user.phone}` : ''}`)
        .maybeSingle()

      if (!custData) {
        setVehicles([])
        return
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('customer_id', custData.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setVehicles((data as Vehicle[]) || [])
    } catch (err: any) {
      console.error('Fetch vehicles error:', err)
      showToast('Error loading vehicles: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVehicles()
  }, [user])

  const openAddModal = () => {
    setCurrentVehicle(null)
    setBrand('')
    setModel('')
    setVehicleType('Sedan')
    setVehicleNumber('')
    setColor('')
    setImageUrl('')
    setIsFormOpen(true)
  }

  const openEditModal = (v: Vehicle) => {
    setCurrentVehicle(v)
    setBrand(v.brand)
    setModel(v.model)
    setVehicleType(v.vehicle_type || 'Sedan')
    setVehicleNumber(v.vehicle_number)
    setColor(v.color)
    setImageUrl(v.image_url || '')
    setIsFormOpen(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (!file) return

      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size should be less than 5MB', 'warning')
        return
      }

      setUploading(true)
      showToast('Compressing & uploading vehicle image...', 'info')

      let publicUrl = ''

      // 1. Compress vehicle image strictly < 1MB
      const result = await compressImageWithStats(file, { maxWidth: 1000, maxHeight: 1000, maxSizeMB: 0.85 })
      const compressed = result.file

      // Attempt 1: Upload to Supabase Storage bucket 'rwash-images'
      try {
        const fileExt = compressed.name.split('.').pop() || 'webp'
        const fileName = `${user?.id || 'guest'}_${Date.now()}.${fileExt}`
        const filePath = `vehicle-photos/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('rwash-images')
          .upload(filePath, compressed, { 
            contentType: compressed.type,
            upsert: false 
          })

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('rwash-images')
            .getPublicUrl(filePath)
          publicUrl = publicUrlData?.publicUrl || ''
        }
      } catch (storageErr) {
        console.warn('Storage bucket upload notice:', storageErr)
      }

      // Attempt 2: Fallback to Base64 Data URL if storage bucket is missing
      if (!publicUrl) {
        publicUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = (err) => reject(err)
          reader.readAsDataURL(compressed)
        })
      }

      if (publicUrl) {
        setImageUrl(publicUrl)
        showToast('Vehicle image uploaded successfully!', 'success')
      }
    } catch (err: any) {
      console.error('Image upload error:', err)
      showToast('Upload failed: ' + (err?.message || 'Unable to upload image'), 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setSubmitting(true)

      const { data: custData } = await supabase
        .from('customers')
        .select('id')
        .or(`profile_id.eq.${user.id},id.eq.${user.id}${user.phone ? `,phone.eq.${user.phone}` : ''}`)
        .maybeSingle()

      if (!custData) {
        showToast('Customer record not found. Please log in again.', 'error')
        return
      }

      const payload = {
        customer_id: custData.id,
        brand: brand.trim(),
        model: model.trim(),
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        color: color.trim(),
        image_url: imageUrl.trim() || null
      }

      if (currentVehicle) {
        const { error } = await supabase
          .from('vehicles')
          .update(payload)
          .eq('id', currentVehicle.id)

        if (error) throw error
        showToast('Vehicle updated successfully!', 'success')
      } else {
        const { error } = await supabase
          .from('vehicles')
          .insert(payload)

        if (error) throw error
        showToast('Vehicle added successfully!', 'success')
      }

      setIsFormOpen(false)
      fetchVehicles()
    } catch (err: any) {
      showToast('Save failed: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const triggerDelete = (v: Vehicle) => {
    setDeleteTarget(v)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', deleteTarget.id)

      if (error) throw error
      showToast('Vehicle removed from garage', 'info')
      setDeleteTarget(null)
      fetchVehicles()
    } catch (err: any) {
      showToast('Failed to delete: ' + err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const bodyPresets: Record<string, string> = {
    Sedan: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80',
    SUV: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
    Truck: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=600&q=80',
    Hatchback: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80',
    Motorcycle: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80'
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">My Vehicles Garage</h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5 font-medium">Manage and monitor cars registered to your dashboard profiles.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer uppercase tracking-wider"
        >
          <Plus className="h-4 w-4" />
          <span>Add Vehicle</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <SkeletonLoader rows={3} />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 py-16 text-center shadow-xs">
          <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4 border border-slate-200 dark:border-slate-700">
            <Car className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Vehicles Registered</h3>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 max-w-xs mx-auto font-medium">
            Add your car details here to speed up detailing slot bookings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => {
            const finalImage = v.image_url || bodyPresets[v.vehicle_type] || bodyPresets.Sedan
            return (
              <div
                key={v.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                {/* Vehicle Thumbnail Cover */}
                <div className="h-40 w-full overflow-hidden relative bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                  <img 
                    src={finalImage} 
                    alt={`${v.brand} ${v.model}`} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent z-10" />
                  
                  {/* Floating type badge */}
                  <span className="absolute top-3 left-3 z-20 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-white/10 tracking-wider">
                    {v.vehicle_type}
                  </span>
                  
                  {/* Overlaid Brand title */}
                  <div className="absolute bottom-3 left-4 z-20 text-left">
                    <div className="font-extrabold text-base leading-tight drop-shadow-sm text-white">
                      {v.brand} {v.model}
                    </div>
                  </div>
                </div>

                {/* Details list */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-bold uppercase">License Plate</span>
                      <span className="text-slate-900 dark:text-white font-black uppercase bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        {v.vehicle_number}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-bold uppercase">Body Color</span>
                      <span className="text-slate-900 dark:text-white font-bold">{v.color}</span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => openEditModal(v)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-200 font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit details</span>
                    </button>
                    <button
                      onClick={() => triggerDelete(v)}
                      className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 dark:text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                      title="Delete vehicle"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={currentVehicle ? 'Edit Vehicle Profile' : 'Register New Vehicle'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-5 text-left">
          
          {/* Photo Uploader Container */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Vehicle Photo
            </label>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-24 h-16 rounded-xl bg-slate-100 dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center flex-shrink-0">
                {imageUrl ? (
                  <img src={imageUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-slate-400" />
                )}
              </div>
              
              <div className="flex-1 w-full">
                <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-600 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Brand / Manufacturer *
              </label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Tesla, Toyota"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Model Name *
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Model Y, Fortuner"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                License Plate Number *
              </label>
              <input
                type="text"
                required
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. HR-26-AB-1234"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Vehicle Color *
              </label>
              <input
                type="text"
                required
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Metallic Black"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Body Type
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-semibold"
              >
                <option value="Sedan">Sedan / Coupe</option>
                <option value="SUV">SUV / Crossover</option>
                <option value="Truck">Truck / Pickup</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Van">Van / Minivan</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all shadow-md cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Remove Vehicle"
        message={`Are you sure you want to remove ${deleteTarget?.brand} ${deleteTarget?.model} (${deleteTarget?.vehicle_number}) from your registered garage?`}
        confirmText={deleting ? 'Removing...' : 'Yes, Delete Vehicle'}
        isDanger
      />
    </div>
  )
}
