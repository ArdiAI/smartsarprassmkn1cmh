import { useEffect, useState } from 'react';
import { Search, Package, Filter } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number | null;
  condition: string | null;
  category_id: string | null;
  categories: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    Promise.all([
      supabase.from('inventory').select('id, name, description, quantity, condition, category_id, categories(name)').order('name'),
      supabase.from('categories').select('id, name').order('name'),
    ]).then(([inv, cat]) => {
      setItems((inv.data as unknown as InventoryItem[]) || []);
      setCategories(cat.data || []);
      setLoading(false);
    });
  }, []);

  const filtered = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || i.category_id === categoryFilter;
    return matchSearch && matchCat;
  });

  const conditionColors: Record<string, string> = {
    baik: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rusak: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    perlu_perbaikan: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Inventaris</h1>
          <p className="text-sm text-slate-500">Daftar barang inventaris sekolah.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari barang..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="all">Semua Kategori</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Tidak ada inventaris" message="Coba kata kunci atau filter lain." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-900/30">
                    <Package className="w-5 h-5 text-blue-500" />
                  </div>
                  {item.condition && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conditionColors[item.condition] || 'bg-slate-100 text-slate-600'}`}>
                      {item.condition}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{item.name}</h3>
                {item.description && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{item.description}</p>}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {item.categories?.name && <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700">{item.categories.name}</span>}
                  {item.quantity != null && <span>Stok: {item.quantity}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
