import { useEffect, useState, useMemo } from 'react';
import { Package, Search, MapPin, Loader2, Boxes } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import { cn } from '../utils/cn';

interface Category {
  id: string;
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
  price: number | null;
  description: string | null;
  available_quantity: number;
  manager_name: string | null;
  categories: { name: string } | null;
}

const conditionStyles: Record<string, { label: string; badge: string; dot: string }> = {
  good: { label: 'Baik', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  fair: { label: 'Cukup', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-500' },
  poor: { label: 'Buruk', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', dot: 'bg-red-500' },
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const [invRes, catRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)')
            .order('name', { ascending: true }),
          supabase.from('categories').select('id, name').order('name', { ascending: true }),
        ]);

        if (invRes.error) {
          showToast('Gagal memuat data inventaris', 'error');
        } else {
          setItems((invRes.data as unknown as InventoryItem[]) ?? []);
        }

        if (!catRes.error) {
          setCategories((catRes.data as unknown as Category[]) ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.code?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, categoryFilter]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-white">
          <Package className="h-7 w-7 text-brand-600 dark:text-brand-400" />
          Inventaris
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Daftar barang dan inventaris yang tersedia di sekolah.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari barang berdasarkan nama, kode, atau lokasi..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="all">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="h-40 animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="p-4">
                <div className="mb-3 h-5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada inventaris"
          description={search || categoryFilter !== 'all' ? 'Tidak ada hasil untuk filter Anda.' : 'Belum ada inventaris yang terdaftar.'}
          icon={<Boxes className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => {
            const cond = conditionStyles[item.condition] ?? conditionStyles.good;
            const available = item.available_quantity ?? 0;
            const total = item.quantity ?? 0;
            const availabilityPct = total > 0 ? Math.round((available / total) * 100) : 0;

            return (
              <div
                key={item.id}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Image */}
                <div className="relative h-40 overflow-hidden bg-slate-200 dark:bg-slate-800">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                    </div>
                  )}
                  <span
                    className={cn(
                      'absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold',
                      cond.badge,
                    )}
                  >
                    {cond.label}
                  </span>
                </div>

                {/* Body */}
                <div className="p-4">
                  {item.code && (
                    <p className="text-xs font-medium text-slate-400">{item.code}</p>
                  )}
                  <h3 className="mt-0.5 line-clamp-1 font-semibold text-slate-900 dark:text-white">
                    {item.name}
                  </h3>
                  {item.categories?.name && (
                    <span className="mt-1 inline-block rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                      {item.categories.name}
                    </span>
                  )}

                  {item.location && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  )}

                  {/* Availability bar */}
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Tersedia</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {available} / {total}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          availabilityPct > 50 ? 'bg-emerald-500' : availabilityPct > 20 ? 'bg-amber-500' : 'bg-red-500',
                        )}
                        style={{ width: `${availabilityPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="mt-6 text-center text-sm text-slate-400">
          Menampilkan {filtered.length} barang
        </p>
      )}
    </div>
  );
}
