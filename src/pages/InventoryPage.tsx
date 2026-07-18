import { useEffect, useState, useMemo } from 'react';
import { Search, Package, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
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

const conditionStyles: Record<string, { badge: string; label: string }> = {
  good: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Baik' },
  fair: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Cukup' },
  poor: { badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Rusak' },
};

const pexelsFallback = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/300`;

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [invRes, catRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)')
            .order('name', { ascending: true }),
          supabase.from('categories').select('id, name').order('name', { ascending: true }),
        ]);
        if (invRes.error) throw invRes.error;
        setItems((invRes.data as unknown as InventoryItem[]) ?? []);
        setCategories((catRes.data as unknown as Category[]) ?? []);
      } catch (err: any) {
        showToast('Gagal memuat data inventaris', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.code ?? '').toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        categoryFilter === 'all' || item.category_id === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [items, search, categoryFilter]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventaris Barang</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Daftar barang yang tersedia di sekolah. Gunakan menu Pengajuan untuk meminjam.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Cari nama atau kode barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-56"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="mb-3 h-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="mb-2 h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada barang"
          description="Tidak ada barang yang cocok dengan pencarian Anda."
          icon={<Package className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => {
            const cond = conditionStyles[item.condition] ?? conditionStyles.good;
            const available = item.available_quantity ?? 0;
            const isAvailable = available > 0;
            return (
              <div key={item.id} className="card group overflow-hidden p-0">
                <div className="relative h-32 overflow-hidden rounded-t-2xl bg-slate-100 dark:bg-slate-800">
                  <img
                    src={item.image_url || pexelsFallback(item.name)}
                    alt={item.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = pexelsFallback(item.name);
                    }}
                  />
                  <span
                    className={cn(
                      'absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      cond.badge,
                    )}
                  >
                    {cond.label}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{item.name}</h3>
                    {item.code && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {item.code}
                      </span>
                    )}
                  </div>
                  {item.categories?.name && (
                    <span className="mt-1 inline-block text-xs font-medium text-brand-600 dark:text-brand-400">
                      {item.categories.name}
                    </span>
                  )}
                  {item.description && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{item.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {item.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {item.location}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm">
                      <span className={cn('font-semibold', isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
                        {available}
                      </span>
                      <span className="text-slate-400"> / {item.quantity} tersedia</span>
                    </div>
                    {isAvailable ? (
                      <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Tersedia
                      </span>
                    ) : (
                      <span className="rounded-lg bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        Habis
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
