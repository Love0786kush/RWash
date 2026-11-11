import React, { useState, useEffect, useRef } from 'react'
import {
  Bell,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Send,
  Eye,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Tag,
  Radio,
  Layers,
  Volume2,
  VolumeX,
  Vibrate,
  Calendar,
  Check,
  Percent,
  X
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { Spinner, SkeletonLoader } from '../components/Spinner'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { compressImageWithStats } from '../utils/imageCompressor'

// Campaign Model
export interface ActionButton {
  id: string
  text: string
  action_type: 'deep_link' | 'url' | 'dismiss'
  action_url: string
}

export interface CampaignItem {
  id: string
  name: string
  description: string | null
  title: string
  body: string
  image_url: string | null
  small_icon: string | null
  action_buttons: ActionButton[]
  deep_link: string | null
  timer_expiry: string | null
  category: 'Promotional' | 'Transactional' | 'Alert' | 'Reminder' | 'Update'
  priority: 'Normal' | 'High'
  sound: boolean
  vibration: boolean
  target_audience: 'all' | 'selected_users' | 'segments' | 'topics'
  target_user_ids: string[]
  target_segment: string | null
  target_topic: string | null
  scheduled_time: string | null
  status: 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Failed'
  total_targeted: number
  successfully_sent: number
  failed_send: number
  clicked: number
  error_log: string | null
  created_at: string
  sent_at: string | null
}

export interface CustomerTarget {
  id: string
  name: string
  phone: string | null
  email: string | null
}


const DEFAULT_SAMPLE_CAMPAIGNS: CampaignItem[] = [
  {
    id: 'sample-1',
    name: 'Monsoon Special Car Wash Alert',
    description: 'Promotional blast for monsoon ceramic foam bath',
    title: '🌧️ Monsoon Car Care Alert: Flat 20% OFF!',
    body: 'Keep your car paint protected from acid rain & swirl marks. Book an express foam wash with coupon code MONSOON20.',
    image_url: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=1200&q=80',
    small_icon: 'car',
    action_buttons: [
      { id: 'b1', text: 'BOOK WASH NOW', action_type: 'deep_link', action_url: '/book' },
      { id: 'b2', text: 'VIEW OFFERS', action_type: 'deep_link', action_url: '/services' }
    ],
    deep_link: '/book',
    timer_expiry: null,
    category: 'Promotional',
    priority: 'High',
    sound: true,
    vibration: true,
    target_audience: 'all',
    target_user_ids: [],
    target_segment: 'all_customers',
    target_topic: 'all_users',
    scheduled_time: null,
    status: 'Sent',
    total_targeted: 150,
    successfully_sent: 148,
    failed_send: 2,
    clicked: 34,
    error_log: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    sent_at: new Date(Date.now() - 82000000).toISOString()
  }
]

export const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(DEFAULT_SAMPLE_CAMPAIGNS)
  const [customers, setCustomers] = useState<CustomerTarget[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 8

  // Modal States
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [isConfirmSendOpen, setIsConfirmSendOpen] = useState(false)
  const [campaignToDelete, setCampaignToDelete] = useState<CampaignItem | null>(null)
  const [campaignToSend, setCampaignToSend] = useState<CampaignItem | null>(null)
  const [previewCampaign, setPreviewCampaign] = useState<CampaignItem | null>(null)
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)

  // Composer Form States
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [smallIcon, setSmallIcon] = useState('car')
  const [actionButtons, setActionButtons] = useState<ActionButton[]>([])
  const [deepLink, setDeepLink] = useState('/book')
  const [timerExpiry, setTimerExpiry] = useState('')
  const [category, setCategory] = useState<'Promotional' | 'Transactional' | 'Alert' | 'Reminder' | 'Update'>('Promotional')
  const [priority, setPriority] = useState<'Normal' | 'High'>('High')
  const [sound, setSound] = useState(true)
  const [vibration, setVibration] = useState(true)
  const [targetAudience, setTargetAudience] = useState<'all' | 'selected_users' | 'segments' | 'topics'>('all')
  const [targetUserIds, setTargetUserIds] = useState<string[]>([])
  const [targetSegment, setTargetSegment] = useState('active_users')
  const [targetTopic, setTargetTopic] = useState('all_users')
  const [deliveryMode, setDeliveryMode] = useState<'now' | 'schedule'>('now')
  const [scheduledTime, setScheduledTime] = useState('')

  // Upload & submission states
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)

  // Live Android Preview interactive controls
  const [previewMode, setPreviewMode] = useState<'expanded' | 'collapsed'>('expanded')
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark')
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')

  const { showToast } = useToast()
  const initialLoadDone = useRef(false)

  // Fetch campaigns from Supabase
  const fetchCampaigns = async (silent = false) => {
    if (!silent && !initialLoadDone.current) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notification_campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        // Table might not exist yet if migration pending
        console.warn('notification_campaigns notice:', error.message)
      } else if (data && data.length > 0) {
        setCampaigns(data as CampaignItem[])
      }
    } catch (err: any) {
      console.warn('Campaign fetch notice:', err)
    } finally {
      setLoading(false)
      initialLoadDone.current = true
    }
  }

  // Fetch customers for user selection
  const fetchCustomers = async () => {
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .order('name', { ascending: true })
      if (data && data.length > 0) setCustomers(data)
    } catch (e) {
      console.warn('Customer list fetch notice:', e)
    }
  }

  useEffect(() => {
    fetchCampaigns()
    fetchCustomers()

    // Realtime updates
    try {
      const channel = supabase
        .channel('campaigns-live-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_campaigns' }, () => {
          fetchCampaigns(true)
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (e) {
      console.warn('Realtime subscription notice:', e)
    }
  }, [])

  // File Upload with Image Compression strictly under 1MB
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
      setUploadProgress(40)
      const result = await compressImageWithStats(file, { maxWidth: 1200, maxHeight: 800, maxSizeMB: 0.95 })
      const compressed = result.file
      setUploadProgress(70)

      let finalUrl = ''

      // Upload to Supabase Storage
      try {
        const fileExt = compressed.name.split('.').pop() || 'webp'
        const fileName = `campaign_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
        const filePath = `campaigns/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('rwash-images')
          .upload(filePath, compressed, {
            contentType: compressed.type,
            cacheControl: '3600',
            upsert: false,
          })

        if (!uploadError) {
          const { data } = supabase.storage.from('rwash-images').getPublicUrl(filePath)
          if (data?.publicUrl) {
            finalUrl = data.publicUrl
          }
        }
      } catch (storageErr) {
        console.warn('Storage notice:', storageErr)
      }

      // Fail-safe Data URL fallback if storage RLS or bucket is unavailable
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
      showToast(`Banner image ready! Compressed: ${result.originalFormatted} ➔ ${result.compressedFormatted}`, 'success')
    } catch (err: any) {
      showToast('Upload error: ' + err.message, 'error')
    } finally {
      setUploadingFile(false)
      setUploadProgress(null)
      e.target.value = ''
    }
  }

  // Open Composer in Add Mode
  const handleOpenAdd = () => {
    setEditingCampaignId(null)
    setName('')
    setDescription('')
    setTitle('')
    setBody('')
    setImageUrl('')
    setSmallIcon('car')
    setActionButtons([
      { id: 'btn_1', text: 'BOOK NOW', action_type: 'deep_link', action_url: '/book' },
      { id: 'btn_2', text: 'VIEW DETAILS', action_type: 'deep_link', action_url: '/services' },
    ])
    setDeepLink('/book')
    setTimerExpiry('')
    setCategory('Promotional')
    setPriority('High')
    setSound(true)
    setVibration(true)
    setTargetAudience('all')
    setTargetUserIds([])
    setTargetSegment('active_users')
    setTargetTopic('all_users')
    setDeliveryMode('now')
    setScheduledTime('')
    setIsComposerOpen(true)
  }

  // Open Composer in Edit Mode
  const handleOpenEdit = (c: CampaignItem) => {
    setEditingCampaignId(c.id)
    setName(c.name || '')
    setDescription(c.description || '')
    setTitle(c.title || '')
    setBody(c.body || '')
    setImageUrl(c.image_url || '')
    setSmallIcon(c.small_icon || 'car')
    setActionButtons(Array.isArray(c.action_buttons) ? c.action_buttons : [])
    setDeepLink(c.deep_link || '/book')
    setTimerExpiry(c.timer_expiry ? c.timer_expiry.substring(0, 16) : '')
    setCategory(c.category || 'Promotional')
    setPriority(c.priority || 'High')
    setSound(c.sound !== false)
    setVibration(c.vibration !== false)
    setTargetAudience(c.target_audience || 'all')
    setTargetUserIds(Array.isArray(c.target_user_ids) ? c.target_user_ids : [])
    setTargetSegment(c.target_segment || 'active_users')
    setTargetTopic(c.target_topic || 'all_users')
    setDeliveryMode(c.scheduled_time ? 'schedule' : 'now')
    setScheduledTime(c.scheduled_time ? c.scheduled_time.substring(0, 16) : '')
    setIsComposerOpen(true)
  }

  // 1-Click Duplicate Campaign
  const handleDuplicate = async (c: CampaignItem) => {
    try {
      const duplicateData = {
        name: `${c.name} (Copy)`,
        description: c.description,
        title: c.title,
        body: c.body,
        image_url: c.image_url,
        small_icon: c.small_icon,
        action_buttons: c.action_buttons,
        deep_link: c.deep_link,
        timer_expiry: c.timer_expiry,
        category: c.category,
        priority: c.priority,
        sound: c.sound,
        vibration: c.vibration,
        target_audience: c.target_audience,
        target_user_ids: c.target_user_ids,
        target_segment: c.target_segment,
        target_topic: c.target_topic,
        status: 'Draft',
        total_targeted: 0,
        successfully_sent: 0,
        failed_send: 0,
        clicked: 0,
      }

      const { error } = await supabase.from('notification_campaigns').insert([duplicateData])
      if (error) throw error
      showToast('Campaign duplicated as Draft!', 'success')
      fetchCampaigns()
    } catch (err: any) {
      showToast('Failed to duplicate: ' + err.message, 'error')
    }
  }

  // Save / Update Campaign
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !title.trim() || !body.trim()) {
      showToast('Campaign Name, Notification Title and Message Body are required', 'warning')
      return
    }

    setSubmitting(true)
    try {
      const campaignPayload: any = {
        name: name.trim(),
        description: description.trim() || null,
        title: title.trim(),
        body: body.trim(),
        image_url: imageUrl || null,
        small_icon: smallIcon,
        action_buttons: actionButtons,
        deep_link: deepLink.trim() || '/',
        timer_expiry: timerExpiry ? new Date(timerExpiry).toISOString() : null,
        category,
        priority,
        sound,
        vibration,
        target_audience: targetAudience,
        target_user_ids: targetAudience === 'selected_users' ? targetUserIds : [],
        target_segment: targetAudience === 'segments' ? targetSegment : null,
        target_topic: targetAudience === 'topics' ? targetTopic.trim() : null,
        scheduled_time: deliveryMode === 'schedule' && scheduledTime ? new Date(scheduledTime).toISOString() : null,
        status: deliveryMode === 'schedule' ? 'Scheduled' : 'Draft',
        updated_at: new Date().toISOString(),
      }

      if (editingCampaignId) {
        const { error } = await supabase
          .from('notification_campaigns')
          .update(campaignPayload)
          .eq('id', editingCampaignId)
        if (error) throw error
        showToast('Campaign updated successfully!', 'success')
      } else {
        const { error } = await supabase
          .from('notification_campaigns')
          .insert([campaignPayload])
        if (error) throw error
        showToast('Campaign created successfully!', 'success')
      }

      setIsComposerOpen(false)
      fetchCampaigns()
    } catch (err: any) {
      showToast('Error saving campaign: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Campaign
  const handleDeleteConfirm = async () => {
    if (!campaignToDelete) return
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('notification_campaigns')
        .delete()
        .eq('id', campaignToDelete.id)

      if (error) throw error
      showToast('Campaign deleted permanently', 'success')
      setIsConfirmDeleteOpen(false)
      setCampaignToDelete(null)
      fetchCampaigns()
    } catch (err: any) {
      showToast('Delete failed: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Dispatch / Send Campaign Immediately via Supabase Edge Function
  const handleSendConfirm = async () => {
    if (!campaignToSend) return
    setSendingId(campaignToSend.id)
    setIsConfirmSendOpen(false)

    try {
      // Update campaign status to Sending first
      await supabase
        .from('notification_campaigns')
        .update({ status: 'Sending', updated_at: new Date().toISOString() })
        .eq('id', campaignToSend.id)

      // Determine FCM type and targeting
      let fcmType: 'broadcast' | 'topic' | 'user' = 'broadcast'
      let fcmTopic: string | undefined
      let fcmUserIds: string[] | undefined

      if (campaignToSend.target_audience === 'topics' && campaignToSend.target_topic) {
        fcmType = 'topic'
        fcmTopic = campaignToSend.target_topic
      } else if (campaignToSend.target_audience === 'selected_users' && campaignToSend.target_user_ids?.length) {
        fcmType = 'user'
        fcmUserIds = campaignToSend.target_user_ids
      } else if (campaignToSend.target_audience === 'segments') {
        // segments map to topic
        fcmType = 'topic'
        fcmTopic = campaignToSend.target_segment ?? 'all_users'
      } else {
        fcmType = 'broadcast'
      }

      // Call Supabase Edge Function (Firebase Admin SDK on server-side — no credentials in frontend)
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY

      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`

      const payload = {
        type: fcmType,
        topic: fcmTopic,
        userIds: fcmUserIds,
        title: campaignToSend.title,
        body: campaignToSend.body,
        imageUrl: campaignToSend.image_url ?? undefined,
        deepLink: campaignToSend.deep_link ?? '/',
        campaignId: campaignToSend.id,
        actionButtons: campaignToSend.action_buttons ?? [],
        sound: campaignToSend.sound,
        vibration: campaignToSend.vibration,
        priority: campaignToSend.priority,
        timerExpiry: campaignToSend.timer_expiry ?? undefined,
        category: campaignToSend.category,
      }

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const result = await response.json()
        const sentCount = result.success ?? 0
        const failedCount = result.failed ?? 0
        showToast(
          `🚀 Campaign sent! Delivered: ${sentCount}, Failed: ${failedCount}`,
          sentCount > 0 ? 'success' : 'warning'
        )
      } else {
        const errData = await response.json().catch(() => ({}))
        // Edge Function returned error — mark campaign as Failed
        await supabase
          .from('notification_campaigns')
          .update({
            status: 'Failed',
            error_log: errData.error ?? 'Edge Function returned an error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaignToSend.id)
        showToast('Send failed: ' + (errData.error ?? 'Unknown error'), 'error')
      }

      fetchCampaigns(true)
    } catch (err: any) {
      // Network / unexpected error — mark as Failed
      await supabase
        .from('notification_campaigns')
        .update({
          status: 'Failed',
          error_log: err.message ?? 'Network error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignToSend.id)
      showToast('Failed to dispatch campaign: ' + err.message, 'error')
      fetchCampaigns(true)
    } finally {
      setSendingId(null)
      setCampaignToSend(null)
    }
  }

  // Action button builder helpers
  const addActionButton = () => {
    if (actionButtons.length >= 3) {
      showToast('Android supports maximum 3 action buttons per notification', 'info')
      return
    }
    const newId = `btn_${Date.now()}`
    setActionButtons(prev => [...prev, { id: newId, text: 'ACTION', action_type: 'deep_link', action_url: '/book' }])
  }

  const updateActionButton = (idx: number, field: keyof ActionButton, val: any) => {
    setActionButtons(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: val }
      return copy
    })
  }

  const removeActionButton = (idx: number) => {
    setActionButtons(prev => prev.filter((_, i) => i !== idx))
  }

  // Toggle user in targetUserIds
  const toggleCustomerSelection = (id: string) => {
    setTargetUserIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  // Filter & Search Calculations
  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.body.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Pagination calculation
  const totalPages = Math.ceil(filteredCampaigns.length / ITEMS_PER_PAGE) || 1
  const paginatedCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Analytics Metrics
  const totalCampaignsCount = campaigns.length
  const sentCampaignsCount = campaigns.filter(c => c.status === 'Sent').length
  const scheduledCount = campaigns.filter(c => c.status === 'Scheduled').length
  const totalTargetedSum = campaigns.reduce((acc, c) => acc + (c.total_targeted || 0), 0)
  const totalSentSum = campaigns.reduce((acc, c) => acc + (c.successfully_sent || 0), 0)
  const totalClicksSum = campaigns.reduce((acc, c) => acc + (c.clicked || 0), 0)

  // Filtered customer list for user picker
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearchTerm)) ||
    (c.email && c.email.toLowerCase().includes(customerSearchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumbs & Action Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-[#8C471E] dark:text-[#E69D62]">Push Notifications</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <Bell className="h-6 w-6 text-[#8C471E] dark:text-[#E69D62]" />
            <span>Push Notifications</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-medium">
            Compose and broadcast rich push notifications with banner media, deep links & live Android preview.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-[#8C471E] hover:bg-[#6F3717] dark:bg-[#A65D2E] dark:hover:bg-[#8C471E] text-white font-bold text-sm rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Plus className="h-5 w-5" />
          <span>New Notification</span>
        </button>
      </div>

      {/* 2. Campaign Analytics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white dark:bg-[#1E0F07] p-4 rounded-2xl border border-slate-200 dark:border-[#52270D] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Total Notifications</span>
            <Layers className="h-4 w-4 text-[#8C471E] dark:text-[#E69D62]" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
            {totalCampaignsCount}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
            {scheduledCount} scheduled
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E0F07] p-4 rounded-2xl border border-slate-200 dark:border-[#52270D] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Dispatched</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {sentCampaignsCount}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
            Delivered successfully
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E0F07] p-4 rounded-2xl border border-slate-200 dark:border-[#52270D] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Audience Targeted</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
            {totalTargetedSum.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Total recipient pool
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E0F07] p-4 rounded-2xl border border-slate-200 dark:border-[#52270D] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Total Delivered</span>
            <Send className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {totalSentSum.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
            FCM push deliveries
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-white dark:bg-[#1E0F07] p-4 rounded-2xl border border-slate-200 dark:border-[#52270D] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Interactions</span>
            <Percent className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {totalClicksSum}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Notification deep clicks
          </div>
        </div>
      </div>

      {/* 3. Search and Status Filter Bar */}
      <div className="bg-white dark:bg-[#1E0F07] p-4 rounded-2xl border border-slate-200 dark:border-[#52270D] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search campaign name, title or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8C471E]"
          />
        </div>

        {/* Status Pills */}
        <div className="flex overflow-x-auto gap-1.5 pb-1 md:pb-0 scrollbar-none">
          {['All', 'Draft', 'Scheduled', 'Sending', 'Sent', 'Failed'].map((st) => (
            <button
              key={st}
              onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#8C471E] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Campaigns Listing Table / Cards */}
      {loading ? (
        <div className="bg-white dark:bg-[#1E0F07] p-8 rounded-2xl border border-slate-200 dark:border-[#52270D]">
          <SkeletonLoader rows={4} />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="bg-white dark:bg-[#1E0F07] rounded-3xl border border-slate-200 dark:border-[#52270D] py-16 text-center shadow-xs">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Bell className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Campaigns Found</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'All'
              ? 'No notifications match your current filter criteria.'
              : 'Create your first push notification campaign to engage customers.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-[#8C471E] hover:bg-[#6F3717] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1E0F07] rounded-2xl border border-slate-200 dark:border-[#52270D] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-black text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Campaign</th>
                  <th className="py-3.5 px-4">Notification Content</th>
                  <th className="py-3.5 px-4">Audience</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Delivery Performance</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedCampaigns.map((c) => {
                  const percent = c.total_targeted > 0 ? Math.round((c.successfully_sent / c.total_targeted) * 100) : 0
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      {/* Campaign Meta */}
                      <td className="py-4 px-4 align-top">
                        <div className="flex items-start gap-3">
                          {c.image_url ? (
                            <img
                              src={c.image_url}
                              alt="Banner"
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-800 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#FDF0E6] dark:bg-[#2A1408] border border-[#E6CBB2] dark:border-[#52270D] flex items-center justify-center text-[#8C471E] dark:text-[#E69D62] flex-shrink-0">
                              <Bell className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 dark:text-white truncate text-sm max-w-[180px]">
                              {c.name}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(c.created_at).toLocaleDateString()}
                            </div>
                            <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {c.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Content Preview */}
                      <td className="py-4 px-4 align-top max-w-[280px]">
                        <div className="font-bold text-slate-800 dark:text-white truncate text-xs">
                          {c.title}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 line-clamp-2 text-[11px] mt-0.5 leading-relaxed font-normal">
                          {c.body}
                        </p>
                        {c.action_buttons && c.action_buttons.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {c.action_buttons.map((btn, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200/50"
                              >
                                {btn.text}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Audience */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                            {c.target_audience === 'all' && '🌐 All Users'}
                            {c.target_audience === 'selected_users' && `👥 ${c.target_user_ids?.length || 0} Custom Users`}
                            {c.target_audience === 'segments' && `🎯 Segment: ${c.target_segment}`}
                            {c.target_audience === 'topics' && `📢 Topic: ${c.target_topic}`}
                          </span>
                          {c.timer_expiry && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Expires: {new Date(c.timer_expiry).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            c.status === 'Sent'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                              : c.status === 'Sending'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900 animate-pulse'
                              : c.status === 'Scheduled'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                              : c.status === 'Failed'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {c.status === 'Sent' && <CheckCircle2 className="h-3 w-3" />}
                          {c.status === 'Sending' && <Spinner size="small" />}
                          {c.status === 'Scheduled' && <Clock className="h-3 w-3" />}
                          {c.status === 'Failed' && <XCircle className="h-3 w-3" />}
                          <span>{c.status}</span>
                        </span>
                        {c.sent_at && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            {new Date(c.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>

                      {/* Delivery Performance */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            <span>{c.successfully_sent} sent</span>
                            <span className="text-slate-400">{percent}%</span>
                          </div>
                          <div className="w-28 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Targeted: {c.total_targeted} • Clicks: {c.clicked || 0}
                          </div>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send Now Button */}
                          {c.status !== 'Sent' && (
                            <button
                              onClick={() => { setCampaignToSend(c); setIsConfirmSendOpen(true); }}
                              disabled={sendingId === c.id}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900 dark:text-emerald-300 rounded-lg transition-colors cursor-pointer"
                              title="Send Immediately"
                            >
                              {sendingId === c.id ? <Spinner size="small" /> : <Send className="h-4 w-4" />}
                            </button>
                          )}

                          {/* Preview Button */}
                          <button
                            onClick={() => { setPreviewCampaign(c); setIsPreviewModalOpen(true); }}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Live Android Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-slate-500 hover:text-[#8C471E] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Campaign"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(c)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer"
                            title="Duplicate Campaign"
                          >
                            <Copy className="h-4 w-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => { setCampaignToDelete(c); setIsConfirmDeleteOpen(true); }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors cursor-pointer"
                            title="Delete Campaign"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-semibold">
                Showing Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4 inline" /> Prev
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  Next <ChevronRight className="h-4 w-4 inline" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. COMPOSER MODAL (Full 2-Column Responsive Layout) */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        title={editingCampaignId ? 'Edit Push Notification' : 'Create Push Notification'}
        size="xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[80vh] overflow-y-auto pr-1">
          {/* Left Column: Composer Form (7 cols) */}
          <form onSubmit={handleSaveCampaign} className="lg:col-span-7 space-y-5">
            {/* 1. Campaign Name & Category */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                1. Campaign Identity
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Internal Campaign Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Monsoon Special Foam Bath Alert"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8C471E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Notification Category
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white"
                  >
                    <option value="Promotional">Promotional Offer</option>
                    <option value="Transactional">Transactional / Order</option>
                    <option value="Alert">Important Alert</option>
                    <option value="Reminder">Service Reminder</option>
                    <option value="Update">App / Service Update</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white"
                  >
                    <option value="High">High (Heads-up alert)</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Message Title and Body */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                2. Notification Content
              </span>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Push Notification Title *
                  </label>
                  <span className="text-[10px] text-slate-400">{title.length}/65</span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 🌧️ Monsoon Special: Flat 20% OFF Ceramic Wash"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#8C471E]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Push Message Body *
                  </label>
                  <span className="text-[10px] text-slate-400">{body.length}/240</span>
                </div>
                <textarea
                  required
                  rows={3}
                  maxLength={300}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Keep your car paint protected from acid rain & swirl marks. Book an express detailing session today!"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8C471E]"
                />
              </div>
            </div>

            {/* 3. Media & Banner Upload */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  3. Banner Image Media (Optional)
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Max 1MB (auto-compressed)</span>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center justify-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors">
                  <Upload className="h-4 w-4 text-[#8C471E]" />
                  <span>{uploadingFile ? 'Compressing & Uploading...' : 'Upload Banner'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-xs text-rose-600 hover:underline cursor-pointer font-semibold"
                  >
                    Remove Image
                  </button>
                )}
                {uploadingFile && <Spinner size="small" />}
              </div>

              {uploadProgress !== null && (
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#8C471E] h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              {imageUrl && (
                <div className="relative h-28 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
                  <img src={imageUrl} alt="Banner Preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>

            {/* 4. Action Buttons & Deep Link */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  4. Action Buttons & Deep Links
                </span>
                <button
                  type="button"
                  onClick={addActionButton}
                  disabled={actionButtons.length >= 3}
                  className="text-xs text-[#8C471E] dark:text-[#E69D62] font-bold hover:underline disabled:opacity-40 cursor-pointer"
                >
                  + Add Action Button
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Tap Route / Deep Link
                </label>
                <input
                  type="text"
                  value={deepLink}
                  onChange={(e) => setDeepLink(e.target.value)}
                  placeholder="/book or /services or https://..."
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              {actionButtons.map((btn, idx) => (
                <div key={btn.id || idx} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-2">
                  <input
                    type="text"
                    value={btn.text}
                    onChange={(e) => updateActionButton(idx, 'text', e.target.value.toUpperCase())}
                    placeholder="BUTTON TEXT"
                    className="w-1/3 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                  />
                  <input
                    type="text"
                    value={btn.action_url}
                    onChange={(e) => updateActionButton(idx, 'action_url', e.target.value)}
                    placeholder="Route e.g. /book"
                    className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeActionButton(idx)}
                    className="text-slate-400 hover:text-rose-500 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* 5. Target Audience */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                5. Target Audience Selection
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'all', label: 'All Users', icon: Users },
                  { id: 'segments', label: 'Segments', icon: Layers },
                  { id: 'selected_users', label: 'Custom Users', icon: Tag },
                  { id: 'topics', label: 'FCM Topic', icon: Radio },
                ].map(item => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setTargetAudience(item.id as any)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      targetAudience === item.id
                        ? 'bg-[#8C471E] text-white border-[#8C471E] shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <item.icon className="h-4 w-4 mx-auto mb-1" />
                    <span className="text-[11px] font-bold block">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Specific Users Picker */}
              {targetAudience === 'selected_users' && (
                <div className="mt-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Selected: {targetUserIds.length} users</span>
                    <button
                      type="button"
                      onClick={() => setTargetUserIds(customers.map(c => c.id))}
                      className="text-[#8C471E] hover:underline"
                    >
                      Select All ({customers.length})
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Filter customer by name or phone..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCustomers.map(c => (
                      <label key={c.id} className="flex items-center gap-2 py-1.5 px-1 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={targetUserIds.includes(c.id)}
                          onChange={() => toggleCustomerSelection(c.id)}
                          className="rounded text-[#8C471E]"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</span>
                        <span className="text-slate-400 text-[10px]">({c.phone || c.email || 'No phone'})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Segments Picker */}
              {targetAudience === 'segments' && (
                <select
                  value={targetSegment}
                  onChange={(e) => setTargetSegment(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                >
                  <option value="active_users">Active Customers (At least 1 booking)</option>
                  <option value="inactive_users">Inactive Customers (Registered but 0 bookings)</option>
                  <option value="high_spenders">VIP Members / High Spenders (₹1,500+)</option>
                  <option value="subscription_users">Active Car Wash Plan Subscribers</option>
                </select>
              )}

              {/* FCM Topic */}
              {targetAudience === 'topics' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    FCM Topic Name
                  </label>
                  <input
                    type="text"
                    value={targetTopic}
                    onChange={(e) => setTargetTopic(e.target.value)}
                    placeholder="e.g. all_users, monsoon_offers, car_care_tips"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                  />
                </div>
              )}
            </div>

            {/* 6. Timing & Offer Expiry */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                6. Schedule & Offer Expiry
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Dispatch Time
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryMode('now')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                        deliveryMode === 'now'
                          ? 'bg-[#8C471E] text-white border-[#8C471E]'
                          : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200'
                      }`}
                    >
                      Immediate
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMode('schedule')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                        deliveryMode === 'schedule'
                          ? 'bg-[#8C471E] text-white border-[#8C471E]'
                          : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200'
                      }`}
                    >
                      Schedule
                    </button>
                  </div>
                  {deliveryMode === 'schedule' && (
                    <input
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="mt-2 w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Offer Expiry Timer (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={timerExpiry}
                    onChange={(e) => setTimerExpiry(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Shows countdown in push notification</p>
                </div>
              </div>

              {/* Sound and Vibration */}
              <div className="flex items-center gap-6 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={sound}
                    onChange={(e) => setSound(e.target.checked)}
                    className="rounded text-[#8C471E]"
                  />
                  <Volume2 className="h-4 w-4 text-[#8C471E]" />
                  <span>Play Notification Sound</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={vibration}
                    onChange={(e) => setVibration(e.target.checked)}
                    className="rounded text-[#8C471E]"
                  />
                  <Vibrate className="h-4 w-4 text-[#8C471E]" />
                  <span>Vibrate Device</span>
                </label>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || uploadingFile}
                className="px-6 py-2 text-xs font-bold text-white bg-[#8C471E] hover:bg-[#6F3717] rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Spinner size="small" /> : <Check className="h-4 w-4" />}
                <span>{editingCampaignId ? 'Update Campaign' : 'Save Campaign'}</span>
              </button>
            </div>
          </form>

          {/* Right Column: Live Android Notification Shade Preview (5 cols) */}
          <div className="lg:col-span-5 sticky top-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-[#8C471E]" />
                <span>Live Android Preview</span>
              </span>

              {/* Mode & Theme Toggles */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewTheme(t => t === 'dark' ? 'light' : 'dark')}
                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  {previewTheme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode(m => m === 'expanded' ? 'collapsed' : 'expanded')}
                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  {previewMode === 'expanded' ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>

            {/* Android Device Shell */}
            <div className={`p-4 rounded-3xl border shadow-xl transition-all ${
              previewTheme === 'dark'
                ? 'bg-[#121212] border-slate-800 text-white'
                : 'bg-[#F2F2F2] border-slate-300 text-slate-900'
            }`}>
              {/* Android Status Bar */}
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pb-3 border-b border-white/5">
                <span>9:41</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span>5G</span>
                  <span>📶</span>
                  <span>🔋 92%</span>
                </div>
              </div>

              {/* Android Notification Shade Card */}
              <div className={`mt-3 rounded-2xl p-3.5 shadow-md transition-all ${
                previewTheme === 'dark'
                  ? 'bg-[#2A2A2A] text-white border border-white/10'
                  : 'bg-white text-slate-900 border border-slate-200'
              }`}>
                {/* Header: App Icon, Name, Timestamp */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#8C471E] flex items-center justify-center text-white text-[10px] font-black">
                      RW
                    </div>
                    <span className="text-[11px] font-black tracking-wide">RWASH</span>
                    <span className="text-[9px] text-slate-400">• Just now</span>
                  </div>
                  <span className="text-[10px] text-slate-400 cursor-pointer">
                    {previewMode === 'expanded' ? '▲' : '▼'}
                  </span>
                </div>

                {/* Notification Content */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black tracking-tight leading-snug">
                    {title || 'Monsoon Special Car Wash Alert'}
                  </h4>

                  <p className={`text-[11px] leading-relaxed text-slate-300 dark:text-slate-300 ${
                    previewMode === 'collapsed' ? 'line-clamp-1' : ''
                  }`}>
                    {body || 'Keep your car clean & protected. Tap to view special offers and book an express wash!'}
                  </p>
                </div>

                {/* Expanded View Elements: Banner Image + Timer + Action Buttons */}
                {previewMode === 'expanded' && (
                  <div className="mt-2.5 space-y-2.5">
                    {/* Large Banner Image */}
                    {imageUrl && (
                      <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-900 border border-white/10">
                        <img src={imageUrl} alt="Notification Banner" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Expiry Badge */}
                    {timerExpiry && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                        <Clock className="h-3 w-3" />
                        <span>Offer expires: {new Date(timerExpiry).toLocaleDateString()}</span>
                      </div>
                    )}

                    {/* Action Buttons as Android Action Pills */}
                    {actionButtons.length > 0 && (
                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                        {actionButtons.map((btn, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="px-3 py-1.5 text-[10px] font-black rounded-lg bg-[#8C471E] text-white hover:bg-[#6F3717] transition-all uppercase tracking-wider shadow-xs"
                          >
                            {btn.text}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* 6. INDEPENDENT LIVE PREVIEW MODAL */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Android Notification Live Preview"
        size="md"
      >
        {previewCampaign && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>{previewCampaign.name}</span>
              <button
                onClick={() => setPreviewTheme(t => t === 'dark' ? 'light' : 'dark')}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]"
              >
                Toggle {previewTheme === 'dark' ? '☀️ Light' : '🌙 Dark'}
              </button>
            </div>

            <div className={`p-4 rounded-3xl border shadow-xl ${
              previewTheme === 'dark' ? 'bg-[#121212] border-slate-800 text-white' : 'bg-[#F2F2F2] border-slate-300 text-slate-900'
            }`}>
              <div className="flex justify-between text-[11px] text-slate-400 pb-2">
                <span>9:41 AM</span>
                <span>📶 🔋 98%</span>
              </div>

              <div className={`p-3.5 rounded-2xl shadow-md ${
                previewTheme === 'dark' ? 'bg-[#2A2A2A] text-white' : 'bg-white text-slate-900'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-[#8C471E] flex items-center justify-center text-white text-[10px] font-black">
                    RW
                  </div>
                  <span className="text-[11px] font-black">RWASH</span>
                  <span className="text-[9px] text-slate-400">• Just now</span>
                </div>

                <h4 className="text-xs font-black mb-1">{previewCampaign.title}</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed mb-2">{previewCampaign.body}</p>

                {previewCampaign.image_url && (
                  <div className="w-full h-40 rounded-xl overflow-hidden mb-2">
                    <img src={previewCampaign.image_url} alt="Banner" className="w-full h-full object-cover" />
                  </div>
                )}

                {previewCampaign.action_buttons && previewCampaign.action_buttons.length > 0 && (
                  <div className="flex gap-2 pt-2 border-t border-white/10">
                    {previewCampaign.action_buttons.map((btn, idx) => (
                      <span key={idx} className="px-3 py-1 bg-[#8C471E] text-white text-[10px] font-bold rounded-lg uppercase">
                        {btn.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 7. Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        title="Delete Notification Campaign?"
        message={`Are you sure you want to delete "${campaignToDelete?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setIsConfirmDeleteOpen(false); setCampaignToDelete(null); }}
        isLoading={submitting}
      />

      {/* 8. Send Immediately Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmSendOpen}
        title="Dispatch Notification Campaign Now?"
        message={`Broadcast "${campaignToSend?.name}" immediately to targeted users? This will trigger FCM push notifications to active devices.`}
        confirmText="Send Now"
        onConfirm={handleSendConfirm}
        onCancel={() => { setIsConfirmSendOpen(false); setCampaignToSend(null); }}
        isLoading={Boolean(sendingId)}
      />
    </div>
  )
}
export default Campaigns
