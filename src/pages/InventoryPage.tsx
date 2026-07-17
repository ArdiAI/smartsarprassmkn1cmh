import { useEffect, useState } from 'react';
import { Search, Package, MapPin, Tag, Loader2, Boxes } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  quantity: number;
  available_quantity: number;
  condition: string;
  location: string;
  image_url: string;
  category_id: string;
  categories: { name: string } | null;
}

const conditionColors: Record<string, string> = {
  good: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  damaged: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  repair: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const conditionLabels: Record<string, string> = {
  good: 'Baik',
  damaged: 'Rusak',
  repair: 'Perbaikan',
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const [invRes, catRes] = await Promise.all([
        supabase
          .from('inventory')
          .select('id, code, name, quantity, available_quantity, condition, location, image_url, category_id, categories(name)')
          .order('name'),
        supabase.from('categories').select('id, name').order('name'),
      ]);
      setItems((invRes.data as any) || []);
      setCategories(catRes.data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.code || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || item.category_id === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Inventaris</h1>
          <p className="text-slate-500 dark:text-slate-400">Daftar barang inventaris yang tersedia di sekolah</p>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari barang atau kode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Kategori</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Tidak ada inventaris" message="Coba ubah kata kunci pencarian" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-36 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 flex items-center justify-center">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-10 h-10 text-cyan-400" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</h3>
                    {item.condition && (
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', conditionColors[item.condition] || 'bg-slate-100 text-slate-600')}>
                        {conditionLabels[item.condition] || item.condition}
                      </span>
                    )}
                  </div>
                  {item.code && <p className="text-xs text-slate-400 mb-3">Kode: {item.code}</p>}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Boxes className="w-3.5 h-3.5 text-slate-400" />
                      Tersedia: {item.available_quantity ?? 0} / {item.quantity ?? 0}
                    </div>
                    {item.location && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {item.location}
                      </div>
                    )}
                    {item.categories?.name && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Tag className="w-3.5 h-3.5 text-slate-400" /> {item.categories.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
