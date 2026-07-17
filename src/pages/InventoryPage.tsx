import { useState, useEffect } from 'react';
import { Search, Package, MapPin, Filter, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category_id: string;
  quantity: number;
  condition: 'good' | 'fair' | 'poor';
  location: string;
  image_url: string;
  purchase_date: string;
  price: number;
  description: string;
  created_at: string;
  available_quantity: number;
  manager_name: string;
  manager_role: string;
  categories: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

const conditionConfig: Record<string, { label: string; color: string; dot: string }> = {
  good: { label: 'Baik', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dot: 'bg-emerald-500' },
  fair: { label: 'Cukup', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dot: 'bg-amber-500' },
  poor: { label: 'Buruk', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', dot: 'bg-red-500' },
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

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
        if (catRes.error) throw catRes.error;

        setItems((invRes.data as unknown as InventoryItem[]) || []);
        setCategories((catRes.data as unknown as Category[]) || []);
      } catch (e) {
        console.error('Error fetching inventory:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filtered = items.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.code?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Inventaris</h1>
          <p className="text-slate-600 dark:text-slate-400">Daftar barang inventaris yang tersedia</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari barang atau kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-10 pr-8 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer min-w-[200px]"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-pulse">
                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4" />
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Package} title="Tidak ada barang ditemukan" description="Coba ubah filter atau kata kunci pencarian" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((item) => {
              const cond = conditionConfig[item.condition] || conditionConfig.good;
              const available = item.available_quantity ?? item.quantity ?? 0;
              const total = item.quantity ?? 0;
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5', cond.color)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', cond.dot)} />
                      {cond.label}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{item.name}</h3>
                  {item.code && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Kode: {item.code}</p>
                  )}
                  {item.categories?.name && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Kategori: {item.categories.name}</p>
                  )}
                  {item.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
                      <MapPin className="w-4 h-4" />
                      <span>{item.location}</span>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Tersedia</span>
                      <span className={cn(
                        'font-semibold',
                        available > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                      )}>
                        {available} / {total} unit
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          available > 0 ? 'bg-emerald-500' : 'bg-red-500'
                        )}
                        style={{ width: `${total > 0 ? (available / total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  {item.manager_name && (
                    <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                      PJ: {item.manager_name}{item.manager_role ? ` (${item.manager_role})` : ''}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400 dark:text-slate-500">
            <Loader2 className="w-4 h-4 opacity-0" />
            Menampilkan {filtered.length} barang
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
