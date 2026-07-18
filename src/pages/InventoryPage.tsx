import { useEffect, useState } from 'react';
import { Boxes, Search, Package, MapPin, Tag } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
  category_id: string | null;
  quantity: number;
  condition: 'good' | 'fair' | 'poor' | null;
  location: string | null;
  image_url: string | null;
  purchase_date: string | null;
  price: number | null;
  description: string | null;
  created_at: string;
  available_quantity: number;
  manager_name: string | null;
  manager_role: string | null;
  categories: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

const conditionConfig: Record<string, { label: string; badge: string }> = {
  good: { label: 'Baik', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  fair: { label: 'Sedang', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  poor: { label: 'Rusak', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        const [invRes, catRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)')
            .order('created_at', { ascending: false }),
          supabase.from('categories').select('id, name').order('name', { ascending: true }),
        ]);

        if (invRes.error) throw invRes.error;
        setItems((invRes.data as unknown as InventoryItem[]) || []);
        setCategories((catRes.data as unknown as Category[]) || []);
      } catch (err) {
        console.error('Error fetching inventory:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filtered = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.location || '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'all' || item.category_id === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventaris</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Daftar barang inventaris yang tersedia</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari barang berdasarkan nama, kode, atau lokasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
                <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-700 mb-4" />
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Boxes} title="Tidak ada barang ditemukan" description="Coba ubah kata kunci atau filter pencarian" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((item) => {
              const cond = item.condition ? conditionConfig[item.condition] : null;
              return (
                <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-8 h-8 text-blue-500" />
                      )}
                    </div>
                    {cond && (
                      <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', cond.badge)}>
                        {cond.label}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1 line-clamp-1">{item.name}</h3>
                  {item.code && <p className="text-xs text-slate-400 mb-2">Kode: {item.code}</p>}
                  {item.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{item.description}</p>
                  )}
                  <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                    {item.categories?.name && (
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 flex-shrink-0" />
                        <span>{item.categories.name}</span>
                      </div>
                    )}
                    {item.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span>{item.location}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                      <span className="text-xs text-slate-400">Tersedia</span>
                      <span className={cn(
                        'text-sm font-semibold',
                        item.available_quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                      )}>
                        {item.available_quantity} / {item.quantity} unit
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
