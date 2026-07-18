import { useEffect, useState, useMemo } from 'react';
import { Package, Search, Loader2, MapPin, Tag, Boxes } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EmptyState from '../components/EmptyState';
import { cn } from '../utils/cn';

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
  quantity: number | null;
  available_quantity: number | null;
  condition: 'good' | 'fair' | 'poor' | null;
  location: string | null;
  image_url: string | null;
  description: string | null;
  categories: { name: string } | null;
}

const conditionStyles: Record<string, string> = {
  good: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  fair: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  poor: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const conditionLabels: Record<string, string> = {
  good: 'Baik',
  fair: 'Cukup',
  poor: 'Rusak',
};

const FALLBACK_IMAGES = [
  'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2280549/pexels-photo-2280549.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=800',
];

function fallbackImage(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return FALLBACK_IMAGES[Math.abs(hash) % FALLBACK_IMAGES.length];
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [invRes, catRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('id, code, name, quantity, available_quantity, condition, location, image_url, description, categories!category_id(name)')
            .order('name', { ascending: true }),
          supabase.from('categories').select('id, name').order('name', { ascending: true }),
        ]);
        if (invRes.error) throw invRes.error;
        setItems((invRes.data as unknown as InventoryItem[]) ?? []);
        setCategories((catRes.data as unknown as { id: string; name: string }[]) ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      const matchSearch =
        !q ||
        it.name.toLowerCase().includes(q) ||
        (it.code ?? '').toLowerCase().includes(q) ||
        (it.location ?? '').toLowerCase().includes(q);
      const matchCat = !categoryFilter || it.categories?.name === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [items, search, categoryFilter]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Package className="h-6 w-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventaris Barang</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Daftar barang yang tersedia di sekolah.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Cari nama, kode, atau lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-56"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="mb-4 h-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="mb-2 h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mb-2 h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada barang"
          description="Belum ada barang yang sesuai dengan filter."
          icon={<Package className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((it) => {
            const available = it.available_quantity ?? 0;
            const total = it.quantity ?? 0;
            const cond = it.condition ?? 'good';
            return (
              <div key={it.id} className="card overflow-hidden p-0">
                <div className="relative h-32 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={it.image_url || fallbackImage(it.id)}
                    alt={it.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackImage(it.id);
                    }}
                  />
                  <span
                    className={cn(
                      'absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      conditionStyles[cond] ?? conditionStyles.good,
                    )}
                  >
                    {conditionLabels[cond] ?? cond}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{it.name}</h3>
                    {it.code && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {it.code}
                      </span>
                    )}
                  </div>
                  {it.categories?.name && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Tag className="h-3.5 w-3.5" />
                      {it.categories.name}
                    </div>
                  )}
                  {it.location && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin className="h-3.5 w-3.5" />
                      {it.location}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-1.5 text-xs">
                    <Boxes className="h-3.5 w-3.5 text-slate-400" />
                    <span className={cn('font-semibold', available > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                      {available}
                    </span>
                    <span className="text-slate-400">/ {total} tersedia</span>
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
