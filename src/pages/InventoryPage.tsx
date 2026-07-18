import { useEffect, useState } from 'react';
import { Search, Package, MapPin, Tag, Boxes } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category_id: string;
  quantity: number;
  available_quantity: number;
  condition: 'good' | 'fair' | 'poor';
  location: string;
  image_url: string;
  purchase_date: string;
  price: number;
  description: string;
  created_at: string;
  manager_name: string;
  manager_role: string;
  categories: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

const conditionConfig: Record<string, { label: string; color: string; dot: string }> = {
  good: { label: 'Baik', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dot: 'bg-emerald-500' },
  fair: { label: 'Cukup', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dot: 'bg-amber-500' },
  poor: { label: 'Rusak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', dot: 'bg-red-500' },
};

const fallbackImages = [
  'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/279949/pexels-photo-279949.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/3781338/pexels-photo-3781338.jpeg?auto=compress&cs=tinysrgb&w=400',
];

function InventorySkeleton() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4" />
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2" />
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-3" />
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, catRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)')
            .order('created_at', { ascending: false }),
          supabase.from('categories').select('id, name').order('name', { ascending: true }),
        ]);

        if (invRes.error) throw invRes.error;
        setItems((invRes.data as unknown as InventoryItem[]) || []);
        setCategories((catRes.data as unknown as Category[]) || []);
      } catch (e) {
        console.error('Failed to fetch inventory:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || item.category_id === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventaris</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-13">
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
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <InventorySkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Tidak ada barang ditemukan"
            description={search || categoryFilter ? 'Coba filter lain.' : 'Barang akan muncul di sini.'}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item, idx) => {
              const cond = conditionConfig[item.condition] || conditionConfig.good;
              const available = item.available_quantity ?? item.quantity ?? 0;
              const total = item.quantity ?? 0;
              const img = item.image_url || fallbackImages[idx % fallbackImages.length];
              return (
                <div key={item.id} className="card p-5 hover:shadow-md transition-all">
                  <div className="h-32 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden mb-4">
                    <img
                      src={img}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = fallbackImages[idx % fallbackImages.length];
                      }}
                    />
                  </div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">{item.name}</h3>
                    <span className={cn('px-2 py-0.5 rounded-lg text-xs font-medium flex items-center gap-1 flex-shrink-0', cond.color)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', cond.dot)} />
                      {cond.label}
                    </span>
                  </div>
                  {item.code && (
                    <p className="text-xs text-slate-400 mb-2 font-mono">{item.code}</p>
                  )}
                  {item.categories?.name && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-2">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{item.categories.name}</span>
                    </div>
                  )}
                  {item.location && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-3">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="line-clamp-1">{item.location}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Boxes className="w-4 h-4 text-blue-500" />
                      <span className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{available}</span>
                        <span className="text-slate-400"> / {total}</span>
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">tersedia</span>
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
