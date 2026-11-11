import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Eye, EyeOff, Upload, Image as ImageIcon, Edit2, Link, Tag, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { Spinner, SkeletonLoader } from '../components/Spinner'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { compressImageWithStats } from '../utils/imageCompressor'

interface BannerItem {
  id: string;
  image_url: string;
  title: string | null;
  is_visible: boolean;
  coupon_code: string | null;
  redirect_url: string | null;
  created_at: string;
}

// Client-side pages available for redirect
const CLIENT_PAGES = [
  { label: 'Home', value: '/' },
  { label: 'Services', value: '/services' },
  { label: 'Book Now', value: '/book' },
  { label: 'About Us', value: '/about' },
  { label: 'Contact', value: '/contact' },
  { label: 'Packages (Dashboard)', value: '/dashboard/packages' },
  { label: 'Bookings (Dashboard)', value: '/dashboard/bookings' },
  { label: 'Subscriptions (Dashboard)', value: '/dashboard/subscriptions' },
  { label: 'Custom URL…', value: '__custom__' },
]

export const Banners: React.FC = () => {
  const [banners, setBanners] = useState<BannerItem[]>([])
  const [loading, setLoading] = useState(true)
  const initialLoadDone = useRef(false)
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [currentBanner, setCurrentBanner] = useState<BannerItem | null>(null)

  // Form states
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isVisible, setIsVisible] = useState(true)
  const [couponCode, setCouponCode] = useState('')
  const [redirectPage, setRedirectPage] = useState('/')
  const [customUrl, setCustomUrl] = useState('')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bannerToDelete, setBannerToDelete] = useState<BannerItem | null>(null)

  const { showToast } = useToast()

  const getFinalRedirectUrl = () => {
    if (redirectPage === '__custom__') return customUrl.trim() || null
    return redirectPage || null
  }

  const fetchBanners = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setBanners((data as BannerItem[]) || [])
    } catch (err: any) {
      if (!silent) showToast('Failed to load banners: ' + err.message, 'error')
    } finally {
      setLoading(false)
      initialLoadDone.current = true
    }
  }

  useEffect(() => {
    fetchBanners()

    const channel = supabase
      .channel('banners-realtime-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => {
        fetchBanners(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      showToast('Unsupported format! Please upload JPG, PNG or WEBP.', 'warning')
      return
    }

    setUploadingFile(true)
    setUploadProgress(15)

    try {
      // 1. Client-side smart compression strictly under 1MB
      setUploadProgress(35)
      const result = await compressImageWithStats(file, { maxWidth: 1400, maxHeight: 800, maxSizeMB: 0.95 })
      const compressed = result.file
      setUploadProgress(65)

      let finalUrl = ''

      // 2. Primary: Upload to Supabase Storage (upsert: false avoids RLS UPDATE policy rejection)
      try {
        const fileExt = compressed.name.split('.').pop() || 'webp'
        const fileName = `banner_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`
        const filePath = `banners/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('rwash-images')
          .upload(filePath, compressed, {
            contentType: compressed.type,
            cacheControl: '3600',
            upsert: false,
          })

        if (!uploadError) {
          const { data } = supabase.storage
            .from('rwash-images')
            .getPublicUrl(filePath)
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
      showToast(`Banner ready! Compressed: ${result.originalFormatted} ➔ ${result.compressedFormatted} (${result.savingsPercent}% saved)`, 'success')
    } catch (err: any) {
      showToast('Upload error: ' + err.message, 'error')
      setUploadProgress(null)
    } finally {
      setUploadingFile(false)
      e.target.value = ''
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageUrl) {
      showToast('Image is required', 'warning')
      return
    }

    setSubmitting(true)
    const finalRedirect = getFinalRedirectUrl()
    const bannerData = {
      title: title.trim() || null,
      image_url: imageUrl,
      is_visible: isVisible,
      coupon_code: couponCode.trim().toUpperCase() || null,
      redirect_url: finalRedirect,
    }

    try {
      if (currentBanner) {
        const { error } = await supabase
          .from('banners')
          .update(bannerData)
          .eq('id', currentBanner.id)

        if (error) throw error
        showToast('Banner updated successfully', 'success')
      } else {
        const { error } = await supabase
          .from('banners')
          .insert([bannerData])

        if (error) throw error
        showToast('Banner created successfully', 'success')
      }
      setIsFormOpen(false)
      fetchBanners()
    } catch (err: any) {
      showToast('Failed to save banner: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleVisibility = async (id: string, currentVal: boolean) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_visible: !currentVal })
        .eq('id', id)

      if (error) throw error

      setBanners((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_visible: !currentVal } : b))
      )
      showToast(`Banner visibility updated`, 'success')
    } catch (err: any) {
      showToast('Failed to update visibility: ' + err.message, 'error')
    }
  }

  const openAddModal = () => {
    setCurrentBanner(null)
    setTitle('')
    setImageUrl('')
    setIsVisible(true)
    setCouponCode('')
    setRedirectPage('/')
    setCustomUrl('')
    setUploadProgress(null)
    setIsFormOpen(true)
  }

  const openEditModal = (banner: BannerItem) => {
    setCurrentBanner(banner)
    setTitle(banner.title || '')
    setImageUrl(banner.image_url)
    setIsVisible(banner.is_visible)
    setCouponCode(banner.coupon_code || '')
    // Detect if redirect_url is a preset page or custom
    const existingUrl = banner.redirect_url || '/'
    const presetMatch = CLIENT_PAGES.find(p => p.value === existingUrl && p.value !== '__custom__')
    if (presetMatch) {
      setRedirectPage(existingUrl)
      setCustomUrl('')
    } else {
      setRedirectPage('__custom__')
      setCustomUrl(existingUrl === '/' ? '' : existingUrl)
    }
    setUploadProgress(null)
    setIsFormOpen(true)
  }

  const triggerDelete = (banner: BannerItem) => {
    setBannerToDelete(banner)
    setIsConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!bannerToDelete) return
    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('banners')
        .delete()
        .eq('id', bannerToDelete.id)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        const { error: retryError } = await supabase
          .from('banners')
          .delete()
          .match({ id: bannerToDelete.id })
        
        if (retryError) throw retryError
      }

      if (bannerToDelete.image_url && bannerToDelete.image_url.includes('rwash-images')) {
        try {
          const parts = bannerToDelete.image_url.split('/rwash-images/')
          if (parts[1]) {
            const rawPath = parts[1].split('?')[0]
            await supabase.storage.from('rwash-images').remove([decodeURIComponent(rawPath)])
          }
        } catch (stErr) {
          console.warn('Storage image deletion note:', stErr)
        }
      }

      showToast('Banner permanently deleted!', 'success')
      setIsConfirmOpen(false)
      setBannerToDelete(null)
      fetchBanners()
    } catch (err: any) {
      showToast('Failed to delete banner: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Banner Management</h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">Upload banners with coupon codes & page redirects.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white font-semibold rounded-2xl transition-all shadow-md shadow-primary-600/15"
        >
          <Plus className="h-5 w-5" />
          <span>Upload Banner</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
          <SkeletonLoader rows={3} />
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 py-16 text-center shadow-xs">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4 border border-slate-100">
            <ImageIcon className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Banners Found</h3>
          <p className="text-slate-450 text-sm mt-1 max-w-xs mx-auto">
            Upload banners to highlight promotions, coupons or page links.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
            >
              <div className="h-48 bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                <img
                  src={banner.image_url}
                  alt={banner.title || 'Banner'}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    banner.is_visible ? 'opacity-100' : 'opacity-40 blur-[1px]'
                  }`}
                />
                <span
                  className={`absolute top-4 left-4 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs text-white ${
                    banner.is_visible ? 'bg-emerald-600/80 border border-emerald-500/20' : 'bg-slate-700/80 border border-slate-600/20'
                  }`}
                >
                  {banner.is_visible ? 'Active' : 'Disabled'}
                </span>
                {/* Coupon badge */}
                {banner.coupon_code && (
                  <span className="absolute top-4 right-4 text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-500/90 text-white border border-amber-400/20 backdrop-blur-xs">
                    🏷️ {banner.coupon_code}
                  </span>
                )}
              </div>

              <div className="p-4 flex flex-col gap-2 bg-white">
                {/* Title + meta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-800 truncate text-sm">
                      {banner.title || 'Banner Image'}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Added {new Date(banner.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(banner)}
                      className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-500 hover:text-primary-600"
                      title="Edit Banner"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleVisibility(banner.id, banner.is_visible)}
                      className={`p-2 border border-slate-200 rounded-xl transition-all hover:bg-slate-50 ${
                        banner.is_visible ? 'text-slate-500 hover:text-amber-500' : 'text-slate-400 hover:text-primary-600'
                      }`}
                      title={banner.is_visible ? 'Disable Banner' : 'Enable Banner'}
                    >
                      {banner.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => triggerDelete(banner)}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-xl transition-colors"
                      title="Delete Banner"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Coupon + Redirect info */}
                <div className="flex flex-wrap gap-2 mt-1">
                  {banner.coupon_code && (
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                      <Tag className="h-3 w-3 text-amber-600" />
                      <span className="text-[10px] font-black text-amber-700">{banner.coupon_code}</span>
                    </div>
                  )}
                  {banner.redirect_url && (
                    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 max-w-full overflow-hidden">
                      <Link className="h-3 w-3 text-blue-600 flex-shrink-0" />
                      <span className="text-[10px] font-semibold text-blue-700 truncate">{banner.redirect_url}</span>
                    </div>
                  )}
                  {!banner.coupon_code && !banner.redirect_url && (
                    <span className="text-[10px] text-slate-300 italic">No coupon or redirect set</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload/Edit Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={currentBanner ? 'Edit Banner' : 'Upload Banner'}>
        <form onSubmit={handleFormSubmit} className="space-y-5">
          {/* Size Guide */}
          <div className="p-4 bg-[#FDF0E6] dark:bg-[#2A1307] rounded-2xl border border-[#E6CBB2] dark:border-[#52270D] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black text-[#8C471E] dark:text-[#E69D62] uppercase tracking-wide">
              <span>📐 Recommended Banner Size:</span>
            </div>
            <p className="text-xs text-[#542E16] dark:text-[#E8C8AE] font-bold leading-relaxed">
              • <strong>1920 × 1080 px</strong> or <strong>1600 × 900 px</strong> (16:9 Aspect Ratio)
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Banner Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Monsoon Special Offer"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Banner Image File * (1920 × 1080 px recommended)
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-300 dark:border-slate-800 rounded-xl cursor-pointer text-xs font-bold text-slate-800 dark:text-white transition-colors">
                  <Upload className="h-4 w-4 text-[#8C471E] dark:text-[#E69D62]" />
                  <span>{uploadingFile ? 'Uploading & Compressing...' : 'Upload & Compress Image'}</span>
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

              {uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-550">
                    <span>Compressing & uploading</span>
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

              {imageUrl && (
                <div className="relative h-32 w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <img src={imageUrl} alt="Banner Preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 right-2 bg-slate-900/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-slate-900 transition-colors"
                  >
                    Delete Image
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Coupon Code */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              🏷️ Coupon Code (optional)
            </label>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="e.g. WASH20, MONSOON50"
              maxLength={20}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all uppercase placeholder:uppercase placeholder:font-sans"
            />
            <p className="text-[10px] text-slate-400 mt-1">Will be shown on the banner card on client screen.</p>
          </div>

          {/* Redirect Page */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              🔗 On-Click Redirect Page (optional)
            </label>
            <select
              value={redirectPage}
              onChange={(e) => setRedirectPage(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            >
              {CLIENT_PAGES.map((page) => (
                <option key={page.value} value={page.value}>
                  {page.label} {page.value !== '__custom__' ? `(${page.value})` : ''}
                </option>
              ))}
            </select>
            {redirectPage === '__custom__' && (
              <div className="mt-2 flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com or /custom-path"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm"
                />
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1">Clicking the banner will navigate to this page.</p>
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="isVisible"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isVisible" className="text-sm font-semibold text-slate-700 select-none">
              Publish immediately (Active on client screen)
            </label>
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
              {submitting ? 'Saving...' : 'Save Banner'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Delete Banner?"
        message={`Are you sure you want to delete this promotional banner?`}
        onConfirm={handleDelete}
        onCancel={() => {
          setIsConfirmOpen(false)
          setBannerToDelete(null)
        }}
        isLoading={submitting}
      />
    </div>
  )
}
