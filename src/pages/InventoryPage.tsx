import { useEffect, useState, useMemo } from 'react';
import { Search, Package, Tag } from 'lucide-react';
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
  condition: string;
  category_id: string | null;
  categories: Category | null;
}

const CONDITION_STYLES: Record<string, string> = {
  good: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  damaged: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const CONDITION_LABELS: Record<string, string> = {
  good: 'Baik',
  damaged: 'Rusak',
  maintenance: 'Perawatan',
};

function InventorySkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50">
      <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-3" />
      <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
      <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [invRes, catRes] = await Promise.all([
        supabase
          .from('inventory')
          .select('id, name, description, quantity, condition, category_id, categories (id, name)')
          .order('name', { ascending: true }),
        supabase.from('categories').select('id, name').order('name', { ascending: true }),
      ]);
      setItems((invRes.data as unknown as InventoryItem[]) || []);
      setCategories((catRes.data as unknown as Category[]) || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (selectedCategory !== 'all') {
      result = result.filter((item) => item.category_id === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, search, selectedCategory]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-6 h-6 text-blue-500" />
            <h1 className="text-3xl font-bold">Inventaris</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400">Daftar barang inventaris yang tersedia.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari barang..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="relative">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-12 pr-10 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer min-w-[200px]"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <InventorySkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Package} title="Tidak ada barang ditemukan" description="Coba ubah filter pencarian Anda." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item, i) => {
              const conditionKey = (item.condition || '').toLowerCase();
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all animate-slide-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-lg leading-tight">{item.name}</h3>
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap',
                        CONDITION_STYLES[conditionKey] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      )}
                    >
                      {CONDITION_LABELS[conditionKey] || item.condition || 'N/A'}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">
                      Kategori: <span className="font-medium text-slate-700 dark:text-slate-300">{item.categories?.name || '-'}</span>
                    </span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{item.quantity} unit</span>
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
