import { useEffect, useState, useMemo } from 'react';
import { Search, Package, MapPin, Tag, Boxes } from 'lucide-react';
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
  condition: 'good' | 'fair' | 'poor';
  location: string | null;
  image_url: string | null;
  purchase_date: string | null;
  price: number | null;
  description: string | null;
  created_at: string;
  available_quantity: number | null;
  manager_name: string | null;
  categories: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

const conditionConfig: Record<string, { label: string; badge: string; dot: string }> = {
  good: {
    label: 'Baik',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  fair: {
    label: 'Cukup',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  poor: {
    label: 'Rusak',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    dot: 'bg-red-500',
  },
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
        const [invResult, catResult] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)')
            .order('created_at', { ascending: false }),
          supabase.from('categories').select('id, name').order('name', { ascending: true }),
        ]);

        if (invResult.error) throw invResult.error;
        setItems((invResult.data as unknown as InventoryItem[]) || []);

        if (catResult.error) throw catResult.error;
        setCategories((catResult.data as unknown as Category[]) || []);
      } catch (err) {
        console.error('Error fetching inventory:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (categoryFilter !== 'all') {
      result = result.filter((i) => i.category_id === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.code?.toLowerCase().includes(q) ||
          i.location?.toLowerCase().includes(q) ||
          i.categories?.name?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [items, search, categoryFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inventaris</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Daftar barang inventaris beserta ketersediaannya.
          </p>
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
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="relative sm:w-56">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 animate-pulse">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="Tidak ada barang ditemukan"
            description={search || categoryFilter !== 'all' ? "Coba filter lain." : "Belum ada barang inventaris."}
          />
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Menampilkan {filtered.length} barang
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((item) => {
                const cond = conditionConfig[item.condition] || conditionConfig.fair;
                const available = item.available_quantity ?? item.quantity;
                const isAvailable = available > 0;
                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <Package className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">{item.name}</h3>
                        {item.code && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{item.code}</p>
                        )}
                      </div>
                    </div>

                    {item.categories?.name && (
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-xs font-medium">
                          <Tag className="w-3 h-3" />
                          {item.categories.name}
                        </span>
                      </div>
                    )}

                    {item.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium', cond.badge)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', cond.dot)} />
                        {cond.label}
                      </span>
                      {item.location && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </span>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Tersedia</span>
                        <span className={cn(
                          'font-semibold tabular-nums',
                          isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
                        )}>
                          {available} / {item.quantity}
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            isAvailable ? 'bg-emerald-500' : 'bg-red-500',
                          )}
                          style={{ width: `${item.quantity > 0 ? (available / item.quantity) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
