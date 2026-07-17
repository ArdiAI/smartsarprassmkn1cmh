import { useEffect, useState, useMemo } from 'react';
import { Package, Search, MapPin, Tag, Loader2 } from 'lucide-react';
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
  code: string | null;
  name: string;
  category_id: string | null;
  quantity: number;
  condition: 'good' | 'fair' | 'poor';
  location: string | null;
  image_url: string | null;
  price: number | null;
  description: string | null;
  available_quantity: number | null;
  manager_name: string | null;
  categories: { name: string } | null;
}

const conditionConfig: Record<string, { label: string; classes: string }> = {
  good: { label: 'Baik', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  fair: { label: 'Cukup', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  poor: { label: 'Buruk', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/4226119/pexels-photo-4226119.jpeg?auto=compress&cs=tinysrgb&w=600';

function InventorySkeleton() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4" />
      <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
      <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded mb-3" />
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
        <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>
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
    const fetchAll = async () => {
      try {
        const [invRes, catRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)'),
          supabase.from('categories').select('id, name').order('name', { ascending: true }),
        ]);
        if (invRes.error) throw invRes.error;
        if (catRes.error) throw catRes.error;
        setItems((invRes.data as unknown as InventoryItem[]) || []);
        setCategories((catRes.data as unknown as Category[]) || []);
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      const matchesSearch = !q || it.name?.toLowerCase().includes(q) || it.code?.toLowerCase().includes(q);
      const matchesCat = categoryFilter === 'all' || it.category_id === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [items, search, categoryFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            Inventaris
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 ml-13">
            Daftar barang inventaris yang tersedia.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari barang atau kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <InventorySkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-8">
            <EmptyState icon={Package} title="Tidak ada inventaris ditemukan" description={search || categoryFilter !== 'all' ? 'Coba filter lain.' : 'Belum ada inventaris yang terdaftar.'} />
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Menampilkan {filtered.length} barang
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((it) => {
                const cond = conditionConfig[it.condition] ?? conditionConfig.fair;
                const available = it.available_quantity ?? it.quantity;
                return (
                  <div key={it.id} className="card p-5 hover:shadow-md transition-shadow">
                    <div className="h-32 rounded-xl bg-slate-100 dark:bg-slate-700 mb-4 overflow-hidden">
                      <img
                        src={it.image_url || FALLBACK_IMAGE}
                        alt={it.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                      />
                    </div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">{it.name}</h3>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0', cond.classes)}>
                        {cond.label}
                      </span>
                    </div>
                    {it.code && <p className="text-xs text-slate-400 mb-2">Kode: {it.code}</p>}
                    {it.categories?.name && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 mb-2">
                        <Tag className="w-3 h-3" /> {it.categories.name}
                      </p>
                    )}
                    {it.location && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 mb-3">
                        <MapPin className="w-3 h-3" /> {it.location}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {available} <span className="text-slate-400 font-normal">/ {it.quantity} unit</span>
                      </span>
                      <span className={cn('text-xs', available > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
                        {available > 0 ? 'Tersedia' : 'Habis'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />
      <Footer />
    </div>
  );
}
