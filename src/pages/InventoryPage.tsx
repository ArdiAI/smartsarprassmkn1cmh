import { useEffect, useState, useMemo } from 'react';
import { Search, Package, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { cn } from '../utils/cn';

interface Category {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
  quantity: number;
  available_quantity: number;
  condition: 'good' | 'fair' | 'poor';
  location: string | null;
  image_url: string | null;
  price: number | null;
  categories: { name: string } | null;
}

const conditionStyles: Record<string, string> = {
  good: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  fair: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  poor: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const conditionLabel: Record<string, string> = {
  good: 'Baik',
  fair: 'Cukup Baik',
  poor: 'Rusak',
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [invRes, catRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('id, code, name, quantity, available_quantity, condition, location, image_url, price, categories!category_id(name)')
            .order('name', { ascending: true }),
          supabase.from('categories').select('id, name').order('name', { ascending: true }),
        ]);
        if (invRes.error) throw invRes.error;
        setItems((invRes.data as unknown as InventoryItem[]) ?? []);
        setCategories((catRes.data as unknown as Category[]) ?? []);
      } catch {
        showToast('Gagal memuat data inventaris', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((it) => {
      const matchSearch = !q || it.name.toLowerCase().includes(q) || (it.code ?? '').toLowerCase().includes(q);
      const catName = it.categories?.name ?? '';
      const matchCat = !categoryFilter || catName === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [items, search, categoryFilter]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventaris Sekolah</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Daftar barang yang tersedia untuk peminjaman.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Cari nama atau kode barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-56" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Semua Kategori</option>
          {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Tidak ada barang" description="Tidak ada barang yang cocok dengan pencarian." icon={<Package className="h-8 w-8 text-slate-400" />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((it) => (
            <div key={it.id} className="card flex flex-col">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-slate-900 dark:text-white">{it.name}</h3>
                  {it.code && <p className="text-xs text-slate-400">Kode: {it.code}</p>}
                </div>
                <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', conditionStyles[it.condition])}>
                  {conditionLabel[it.condition]}
                </span>
              </div>

              {it.categories?.name && (
                <span className="mb-3 inline-block w-fit rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                  {it.categories.name}
                </span>
              )}

              {it.location && (
                <div className="mb-3 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{it.location}</span>
                </div>
              )}

              <div className="mt-auto flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{it.available_quantity}</span>
                  <span className="text-slate-400"> / {it.quantity} unit</span>
                </div>
                <span className={cn('text-xs font-medium', it.available_quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                  {it.available_quantity > 0 ? 'Tersedia' : 'Habis'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
