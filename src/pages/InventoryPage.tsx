import { useEffect, useState, useMemo } from 'react';
import { Search, Package, MapPin, Boxes, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface Category {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  available_quantity: number;
  condition: string;
  category_id: string | null;
  code: string | null;
  location: string | null;
  categories: { name: string } | null;
}

const conditionConfig: Record<string, { label: string; color: string; icon: any }> = {
  good: { label: 'Baik', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2 },
  damaged: { label: 'Rusak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: AlertTriangle },
  maintenance: { label: 'Perbaikan', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Wrench },
};

function ConditionBadge({ condition }: { condition: string }) {
  const cfg = conditionConfig[condition] ?? conditionConfig.good;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium', cfg.color)}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

function InventoryCard({ item }: { item: InventoryItem }) {
  const avail = item.available_quantity;
  const total = item.quantity;
  const pct = total > 0 ? Math.round((avail / total) * 100) : 0;
  return (
    <div className="card p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{item.name}</h3>
          {item.code && <p className="text-xs text-slate-400 mt-0.5">Kode: {item.code}</p>}
        </div>
        <ConditionBadge condition={item.condition} />
      </div>

      {item.description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{item.description}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
        {item.categories?.name && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-medium">
            <Boxes className="w-3.5 h-3.5" /> {item.categories.name}
          </span>
        )}
        {item.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-blue-500" /> {item.location}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-500 dark:text-slate-400">Tersedia</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">{avail} / {total}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <div
            className={cn('h-full rounded-full', pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="w-1/2 h-5 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="w-16 h-5 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="w-1/3 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    (async () => {
      try {
        const [invRes, catRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('id, name, description, quantity, available_quantity, condition, category_id, code, location, categories(name)')
            .order('name', { ascending: true }),
          supabase.from('categories').select('id, name').order('name', { ascending: true }),
        ]);
        if (invRes.error) throw invRes.error;
        setItems((invRes.data ?? []) as unknown as InventoryItem[]);
        setCategories((catRes.data ?? []) as unknown as Category[]);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () => items.filter(i => {
      const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'all' || i.category_id === categoryFilter;
      return matchSearch && matchCat;
    }),
    [items, search, categoryFilter],
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventaris</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Daftar barang inventaris</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
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
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length === 0 ? (
            <div className="col-span-full">
              <EmptyState icon={Package} title="Barang tidak ditemukan" description={search || categoryFilter !== 'all' ? 'Coba filter lain.' : 'Belum ada barang terdaftar.'} />
            </div>
          ) : (
            filtered.map(item => <InventoryCard key={item.id} item={item} />)
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
