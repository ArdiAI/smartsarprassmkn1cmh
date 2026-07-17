import { useEffect, useState, useMemo } from 'react';
import { Search, Package, MapPin, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface Category {
  name: string;
}

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
  manager_role: string | null;
  categories: Category | null;
}

const conditionConfig: Record<string, { label: string; classes: string }> = {
  good: { label: 'Baik', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  fair: { label: 'Cukup', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  poor: { label: 'Rusak', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

function ItemSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="w-1/3 h-5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
      <div className="w-full h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
      <div className="w-1/2 h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
      <div className="w-1/4 h-6 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const [inv, cats] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)')
            .order('created_at', { ascending: false }),
          supabase.from('categories').select('id, name').order('name', { ascending: true }),
        ]);
        if (inv.error) throw inv.error;
        setItems((inv.data as unknown as InventoryItem[]) || []);
        setCategories((cats.data as unknown as { id: string; name: string }[]) || []);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((it) => {
      const matchSearch =
        !q ||
        it.name.toLowerCase().includes(q) ||
        (it.code || '').toLowerCase().includes(q) ||
        (it.description || '').toLowerCase().includes(q);
      const matchCat = categoryFilter === 'all' || it.category_id === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [items, search, categoryFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inventaris</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Daftar barang inventaris yang tersedia.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari barang..."
              className="input pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input sm:w-56"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <ItemSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Package}
              title="Tidak ada barang ditemukan"
              description={search || categoryFilter !== 'all' ? 'Coba filter lain.' : 'Belum ada data inventaris.'}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((it) => {
              const cond = conditionConfig[it.condition] || conditionConfig.good;
              const available = it.available_quantity ?? 0;
              const total = it.quantity ?? 0;
              return (
                <div key={it.id} className="card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{it.name}</h3>
                      {it.code && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Kode: {it.code}</p>
                      )}
                    </div>
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap', cond.classes)}>
                      {cond.label}
                    </span>
                  </div>

                  {it.categories?.name && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">{it.categories.name}</p>
                  )}
                  {it.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{it.description}</p>
                  )}

                  {it.location && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 mt-3">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{it.location}</span>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Tersedia</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {available} <span className="text-slate-400 font-normal">/ {total}</span>
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        style={{ width: `${total > 0 ? Math.min(100, (available / total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>

                  {it.manager_name && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                      PJ: <span className="font-medium text-slate-700 dark:text-slate-300">{it.manager_name}</span>
                      {it.manager_role && ` (${it.manager_role})`}
                    </p>
                  )}
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
