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

export const ClientPackages: React.FC = () => {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')

  const categories = ['All', 'Basic', 'Standard', 'Premium', 'Add-on']

  useEffect(() => {
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
        console.error('Packages catalog load error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [])

  const filtered = services.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Detailing Packages & Pricing</h1>
        <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5 font-medium">Explore all available detailing solutions and current price catalogs.</p>
      </div>

      {/* Filter Options */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search detailing packages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-semibold"
          />
        </div>

        <div className="flex overflow-x-auto gap-1.5 pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
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
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Wrench className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">No services found matching selection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <div key={s.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-md transition-all group">
              <div>
                <div className="h-44 bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <Car className="h-10 w-10 text-slate-400 dark:text-slate-600 stroke-1" />
                  )}
                  <span className="absolute top-3 left-3 bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/10">
                    {s.category || 'Basic'}
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{s.name}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed line-clamp-3 font-medium">
                    {s.description || 'No description provided.'}
                  </p>

                  <ul className="pt-2 space-y-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    {s.features ? (
                      s.features.split('\n').map((f) => f.trim()).filter(Boolean).map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary-600 dark:text-amber-400 flex-shrink-0" />
                          {feature}
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary-600 dark:text-amber-400 flex-shrink-0" />
                          Hand washed with eco shampoo
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary-600 dark:text-amber-400 flex-shrink-0" />
                          Interior detailed & polished
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* Price & Action */}
              <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Cost</span>
                  <span className="text-xl font-black text-primary-600 dark:text-white">₹{parseFloat(s.price.toString()).toFixed(2)}</span>
                </div>
                <Link
                  to={`/dashboard/book?serviceId=${s.id}`}
                  className="flex items-center gap-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-[10px] uppercase rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <span>Book Package</span>
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
