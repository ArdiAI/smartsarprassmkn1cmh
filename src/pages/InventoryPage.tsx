import { useEffect, useState, useMemo } from 'react';
import { Search, Package, MapPin, Tag, Loader2, Boxes } from 'lucide-react';
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
  available_quantity: number;
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
    label: 'Buruk',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    dot: 'bg-red-500',
  },
};

const fallbackImages = [
  'https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/356040/pexels-photo-356040.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2566581/pexels-photo-2566581.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=800',
];

function getFallbackImage(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return fallbackImages[hash % fallbackImages.length];
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
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
      } catch (e) {
        console.error('Failed to load inventory:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.code?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, categoryFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inventaris</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Daftar barang dan stok yang tersedia. Lihat ketersediaan dan kondisi setiap item.
          </p>
        </section>

        {/* Filters */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari barang berdasarkan nama atau kode..."
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[180px]"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="h-40 bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-4 w-1/2 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-4 w-2/3 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <EmptyState
                icon={Package}
                title="Tidak ada barang ditemukan"
                description={search || categoryFilter !== 'all' ? "Coba ubah filter pencarian." : "Belum ada barang yang ditambahkan."}
              />
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Menampilkan {filtered.length} barang
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map((item) => {
                  const cond = conditionConfig[item.condition] || conditionConfig.fair;
                  const img = item.image_url || getFallbackImage(item.id);
                  const available = item.available_quantity ?? 0;
                  const total = item.quantity ?? 0;
                  return (
                    <div
                      key={item.id}
                      className="group rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                    >
                      <div className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-700">
                        <img
                          src={img}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getFallbackImage(item.id);
                          }}
                        />
                        <span className={cn('absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', cond.badge)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', cond.dot)} />
                          {cond.label}
                        </span>
                      </div>
                      <div className="p-4">
                        {item.code && (
                          <p className="text-xs text-slate-400 font-mono mb-1">{item.code}</p>
                        )}
                        <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">{item.name}</h3>
                        {item.categories?.name && (
                          <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-500 dark:text-slate-400">
                            <Tag className="w-3.5 h-3.5" />
                            <span>{item.categories.name}</span>
                          </div>
                        )}
                        {item.location && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="line-clamp-1">{item.location}</span>
                          </div>
                        )}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Tersedia</span>
                            <span className={cn('font-semibold', available > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
                              {available} / {total}
                            </span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                available > 0 ? 'bg-emerald-500' : 'bg-red-400',
                              )}
                              style={{ width: `${total > 0 ? Math.min(100, (available / total) * 100) : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
