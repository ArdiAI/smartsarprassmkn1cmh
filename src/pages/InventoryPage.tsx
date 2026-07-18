import { useEffect, useState, useMemo } from 'react';
import {
  Package,
  Search,
  MapPin,
  Loader2,
  Boxes,
  AlertCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

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
  category: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

const conditionStyles: Record<string, { badge: string; label: string }> = {
  good: {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    label: 'Baik',
  },
  fair: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    label: 'Layak',
  },
  poor: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    label: 'Rusak',
  },
};

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/4226119/pexels-photo-4226119.jpeg?auto=compress&cs=tinysrgb&w=800';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const [{ data: invData, error: invErr }, { data: catData, error: catErr }] = await Promise.all([
          supabase
            .from('inventory')
            .select('id, code, name, quantity, available_quantity, condition, location, image_url, description, categories!category_id(name)')
            .order('name', { ascending: true }),
          supabase.from('categories').select('id, name').order('name', { ascending: true }),
        ]);
        if (invErr) throw invErr;
        if (catErr) throw catErr;
        setItems((invData as unknown as InventoryItem[]) ?? []);
        setCategories((catData as unknown as Category[]) ?? []);
      } catch {
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
        categoryFilter === 'all' ||
        (item.category?.name ?? 'Tidak Berkategori') === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [items, search, categoryFilter]);

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="relative mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <Package className="h-7 w-7 text-brand-600" />
            Inventaris Barang
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Daftar barang yang tersedia untuk dipinjam.
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
            className="input sm:w-48"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
            <option value="Tidak Berkategori">Tidak Berkategori</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="mb-4 h-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-2 h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Boxes className="h-8 w-8 text-slate-400" />}
            title="Tidak ada barang"
            description="Coba ubah kata kunci atau filter pencarian."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => {
              const cond = conditionStyles[item.condition] ?? conditionStyles.fair;
              const available = item.available_quantity ?? 0;
              const total = item.quantity ?? 0;
              const isAvailable = available > 0;
              return (
                <div key={item.id} className="card group overflow-hidden p-0">
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={item.image_url || FALLBACK_IMAGE}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                      }}
                    />
                    <span
                      className={cn(
                        'absolute right-2 top-2 rounded-full px-2.5 py-1 text-xs font-semibold',
                        cond.badge,
                      )}
                    >
                      {cond.label}
                    </span>
                  </div>
                  <div className="p-4">
                    {item.code && (
                      <p className="text-xs font-medium text-slate-400">{item.code}</p>
                    )}
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</h3>
                    {item.category?.name && (
                      <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                        {item.category.name}
                      </span>
                    )}
                    {item.location && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <MapPin className="h-3.5 w-3.5 text-brand-500" />
                        {item.location}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                      <span className="text-xs text-slate-400">Tersedia</span>
                      <span
                        className={cn(
                          'text-sm font-bold',
                          isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500',
                        )}
                      >
                        {available} / {total}
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
