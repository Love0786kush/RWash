import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, Search, Wrench, Sparkles, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SkeletonLoader } from '../components/Spinner'

interface Service {
  id: string;
  name: string;
  price: number;
  description: string | null;
  category: string | null;
  image_url: string | null;
  features?: string | null;
}

export const PublicServices: React.FC = () => {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [dbCategories, setDbCategories] = useState<string[]>([])

  const categories = ['All', ...dbCategories]

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await supabase.from('service_categories').select('name').order('name')
        if (data && data.length > 0) setDbCategories(data.map((c: any) => c.name))
      } catch (err) { console.error('Category load:', err) }
    }

    const fetchServices = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('price', { ascending: true })

        if (error) throw error
        setServices((data as Service[]) || [])
      } catch (err) {
        console.error('Services catalog load error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
    fetchServices()

    // Realtime listener for live service & image updates
    const channel = supabase
      .channel('client-services-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        fetchServices()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_categories' }, () => {
        fetchCategories()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered = services.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-12 animate-fade-in">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <h1 className="text-3xl font-black text-[#221105] dark:text-white tracking-tight uppercase">Our Wash & Detailing Services</h1>
        <p className="text-slate-700 dark:text-amber-200/80 text-xs md:text-sm font-semibold">Select from our range of packages. Dynamic price updates from settings.</p>
      </div>

      {/* Filter Options */}
      <div className="bg-white dark:bg-[#221105] p-4 rounded-2xl border border-amber-900/10 dark:border-amber-500/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#724628]">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search detailing packages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-amber-50/50 dark:bg-[#140903] border border-amber-900/10 dark:border-amber-800/30 rounded-xl text-[#221105] dark:text-amber-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#724628] transition-all text-xs font-semibold"
          />
        </div>

        <div className="flex overflow-x-auto gap-1.5 pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#724628] text-white shadow-xs'
                  : 'bg-amber-100/50 dark:bg-amber-950/60 text-[#221105] dark:text-amber-200 hover:bg-amber-200/60 dark:hover:bg-amber-900/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <SkeletonLoader rows={4} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#221105] border border-amber-900/10 dark:border-amber-800/30 rounded-3xl">
          <Wrench className="h-8 w-8 text-[#724628] mx-auto mb-2" />
          <p className="text-slate-700 dark:text-amber-200/80 font-semibold text-sm">No services found matching selection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
          {filtered.map((s) => (
            <div key={s.id} className="bg-white dark:bg-[#221105] rounded-2xl border border-amber-900/10 dark:border-amber-500/20 overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-xl transition-all group">
              <div>
                <div className="h-48 bg-amber-950/20 relative overflow-hidden flex items-center justify-center border-b border-amber-900/10 dark:border-amber-800/30">
                  <img
                    src={s.image_url || 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80'}
                    alt={s.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.dataset.failed) {
                        img.dataset.failed = 'true';
                        img.src = 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80';
                      }
                    }}
                  />
                  <span className="absolute top-3 left-3 bg-[#221105]/80 backdrop-blur-xs text-amber-100 text-[10px] font-bold px-3 py-1 rounded-full border border-amber-500/20">
                    {s.category || 'Standard'}
                  </span>
                </div>
                <div className="p-5 space-y-3">
                  <h3 className="font-extrabold text-[#221105] dark:text-white text-lg">{s.name}</h3>
                  <p className="text-slate-700 dark:text-amber-200/70 text-xs leading-relaxed line-clamp-3 font-semibold">
                    {s.description || 'No description provided.'}
                  </p>

                  {/* Detailing Features Checklist */}
                  <ul className="pt-2 space-y-1.5 text-[11px] font-bold text-slate-800 dark:text-amber-100">
                    {s.features ? (
                      s.features.split('\n').map((f) => f.trim()).filter(Boolean).map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#724628] dark:text-amber-400 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#724628] dark:text-amber-400 flex-shrink-0" />
                          <span>Hand washed with eco shampoo</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#724628] dark:text-amber-400 flex-shrink-0" />
                          <span>Interior detailed & polished</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* Price & Action */}
              <div className="px-5 pb-5 pt-4 border-t border-amber-900/10 dark:border-amber-800/30 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-amber-300/70 uppercase">Total Cost</span>
                  <span className="text-2xl font-black text-[#724628] dark:text-amber-300">₹{parseFloat(s.price.toString()).toFixed(2)}</span>
                </div>
                <Link
                  to={`/book?serviceId=${s.id}`}
                  className="flex items-center gap-1.5 px-5 py-3 bg-[#724628] hover:bg-[#553118] text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <span>Book Slot</span>
                  <Sparkles className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
