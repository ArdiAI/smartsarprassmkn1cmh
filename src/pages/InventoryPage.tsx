import { useEffect, useState } from 'react';
import { Package, MapPin, Search, Loader2, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';

interface Category { id: string; name: string; }
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
  categories: { name: string } | null;
}

const conditionConfig: Record<string, { label: string; color: string; icon: any }> = {
  good: { label: 'Baik', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle },
  fair: { label: 'Cukup', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: AlertCircle },
  poor: { label: 'Buruk', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const [inv, cats] = await Promise.all([
        supabase
          .from('inventory')
          .select('*, categories!category_id(name)')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').order('name', { ascending: true }),
      ]);
      if (!inv.error) setItems((inv.data as unknown as InventoryItem[]) || []);
      if (!cats.error) setCategories((cats.data as unknown as Category[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = items.filter(it => {
    if (categoryFilter !== 'all' && it.category_id !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        it.name?.toLowerCase().includes(q) ||
        it.code?.toLowerCase().includes(q) ||
        it.location?.toLowerCase().includes(q) ||
        it.categories?.name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inventaris</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Daftar barang yang tersedia untuk peminjaman</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari barang, kode, atau lokasi..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">Semua Kategori</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Package} title="Tidak ada barang ditemukan" description="Coba ubah kata kunci atau filter pencarian." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(it => {
              const cond = it.condition ? conditionConfig[it.condition] : null;
              const CondIcon = cond?.icon;
              const available = it.available_quantity ?? 0;
              const total = it.quantity ?? 0;
              const isAvailable = available > 0;
              return (
                <div key={it.id} className="card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-blue-500" />
                    </div>
                    {cond && CondIcon && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cond.color}`}>
                        <CondIcon className="w-3 h-3" />
                        {cond.label}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1 line-clamp-1">{it.name}</h3>
                  {it.code && <p className="text-xs text-slate-400 mb-2">Kode: {it.code}</p>}
                  {it.categories?.name && (
                    <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 mb-3">
                      {it.categories.name}
                    </span>
                  )}
                  <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                    {it.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="line-clamp-1">{it.location}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Tersedia</span>
                      <span className={`text-xs font-medium ${isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {available} / {total} unit
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
