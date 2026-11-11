import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Tag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Spinner, SkeletonLoader } from '../components/Spinner'

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#6366f1')

  const { showToast } = useToast()

  const PRESET_COLORS = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
    '#ef4444', '#ec4899', '#14b8a6', '#f97316',
    '#64748b', '#0ea5e9', '#84cc16', '#a855f7',
  ]

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      setCategories((data as Category[]) || [])
    } catch (err: any) {
      showToast('Failed to load categories: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
    const channel = supabase
      .channel('categories-realtime-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_categories' }, fetchCategories)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const openAddModal = () => {
    setCurrentCategory(null)
    setName('')
    setDescription('')
    setColor('#6366f1')
    setIsFormOpen(true)
  }

  const openEditModal = (cat: Category) => {
    setCurrentCategory(cat)
    setName(cat.name)
    setDescription(cat.description || '')
    setColor(cat.color || '#6366f1')
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      showToast('Category name is required', 'warning')
      return
    }
    setSubmitting(true)
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      color,
    }
    try {
      if (currentCategory) {
        const { error } = await supabase
          .from('service_categories')
          .update(payload)
          .eq('id', currentCategory.id)
        if (error) throw error
        showToast('Category updated successfully', 'success')
      } else {
        const { error } = await supabase
          .from('service_categories')
          .insert([payload])
        if (error) throw error
        showToast('Category added successfully', 'success')
      }
      setIsFormOpen(false)
      fetchCategories()
    } catch (err: any) {
      showToast('Error saving category: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const triggerDelete = (cat: Category) => {
    setCategoryToDelete(cat)
    setIsConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('service_categories')
        .delete()
        .eq('id', categoryToDelete.id)
      if (error) throw error
      showToast('Category deleted!', 'success')
      setIsConfirmOpen(false)
      setCategoryToDelete(null)
      fetchCategories()
    } catch (err: any) {
      showToast('Failed to delete: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Service Categories</h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">
            Manage service categories used in the catalog & client filters.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white font-semibold rounded-2xl transition-all shadow-md shadow-primary-600/15"
        >
          <Plus className="h-5 w-5" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
          <SkeletonLoader rows={4} />
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 py-16 text-center shadow-xs">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4 border border-slate-100">
            <Tag className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Categories Yet</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
            Add categories to organize services in the catalog.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex items-start gap-4"
            >
              {/* Color dot */}
              <div
                className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm"
                style={{ backgroundColor: cat.color || '#6366f1' + '22', border: `2px solid ${cat.color || '#6366f1'}33` }}
              >
                <Tag className="h-5 w-5" style={{ color: cat.color || '#6366f1' }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color || '#6366f1' }}
                  />
                  <h3 className="font-bold text-slate-800 text-sm truncate">{cat.name}</h3>
                </div>
                <p className="text-slate-400 text-xs mt-1 line-clamp-2">
                  {cat.description || 'No description'}
                </p>
                <p className="text-[10px] text-slate-300 font-semibold mt-2 uppercase tracking-wide">
                  Added {new Date(cat.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => openEditModal(cat)}
                  className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors border border-transparent hover:border-primary-100"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => triggerDelete(cat)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={currentCategory ? 'Edit Category' : 'Add New Category'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Premium, Basic, Add-on…"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Description (optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of this category…"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Label Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all border-2 ${color === c ? 'border-slate-700 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              {/* Custom color input */}
              <label
                className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-slate-400 transition-colors overflow-hidden"
                title="Custom color"
                style={{ backgroundColor: !PRESET_COLORS.includes(color) ? color : 'transparent' }}
              >
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="opacity-0 absolute w-0 h-0"
                />
                {PRESET_COLORS.includes(color) && (
                  <span className="text-slate-400 text-xs font-black">+</span>
                )}
              </label>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs font-mono text-slate-500">{color}</span>
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
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 active:scale-[0.98] rounded-xl transition-all shadow-md shadow-primary-600/10 flex items-center gap-1.5"
            >
              {submitting ? <><Spinner size="small" /> Saving...</> : (currentCategory ? 'Update Category' : 'Add Category')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Delete Category?"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? Services using this category will become uncategorized.`}
        onConfirm={handleDelete}
        onCancel={() => { setIsConfirmOpen(false); setCategoryToDelete(null) }}
        isLoading={submitting}
      />
    </div>
  )
}
