import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { Search, Package, MapPin, Loader2, Tag, Layers } from 'lucide-react';

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
  quantity: number;
  available_quantity: number;
  condition: 'good' | 'fair' | 'poor';
  location: string | null;
  image_url: string | null;
  description: string | null;
  categories: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

const conditionConfig: Record<string, { label: string; color: string }> = {
  good: { label: 'Baik', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  fair: { label: 'Layak', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  poor: { label: 'Rusak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const pexelsFallback = (seed: string) =>
  `https://images.pexels.com/photos/4226119/pexels-photo-4226119.jpeg?auto=compress&cs=tinysrgb&w=600&dpr=1&seed=${encodeURIComponent(seed)}`;

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const [invRes, catRes] = await Promise.all([
        supabase
          .from('inventory')
          .select('*, categories!category_id(name)')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').order('name', { ascending: true }),
      ]);
      if (!invRes.error) setItems((invRes.data as unknown as InventoryItem[]) || []);
      if (!catRes.error) setCategories((catRes.data as unknown as Category[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter !== 'all') {
        const catName = item.categories?.name || '';
        if (catName !== categoryFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          item.name?.toLowerCase().includes(q) ||
          item.code?.toLowerCase().includes(q) ||
          item.location?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, search, categoryFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inventaris</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Daftar barang dan stok yang tersedia
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, kode, atau lokasi barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Package} title="Tidak ada barang ditemukan" description="Coba ubah kata kunci atau filter pencarian" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item) => {
              const cond = conditionConfig[item.condition] || conditionConfig.fair;
              const isAvailable = item.available_quantity > 0;
              return (
                <div key={item.id} className="card overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-40 bg-slate-100 dark:bg-slate-700 overflow-hidden relative">
                    <img
                      src={item.image_url || pexelsFallback(item.name)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = pexelsFallback(item.name);
                      }}
                    />
                    <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium ${cond.color}`}>
                      {cond.label}
                    </span>
                  </div>
                  <div className="p-4">
                    {item.code && (
                      <p className="text-xs text-slate-400 mb-1">{item.code}</p>
                    )}
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1 line-clamp-1">{item.name}</h3>
                    {item.categories?.name && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2">
                        <Tag className="w-3.5 h-3.5" />
                        {item.categories.name}
                      </div>
                    )}
                    {item.location && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2">
                        <MapPin className="w-3.5 h-3.5" />
                        {item.location}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Layers className="w-4 h-4 text-slate-400" />
                        <span className={`font-semibold ${isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                          {item.available_quantity}
                        </span>
                        <span className="text-slate-400">/ {item.quantity} tersedia</span>
                      </div>
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
