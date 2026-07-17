import { useEffect, useState, useMemo } from 'react';
import { Search, Package, MapPin, Filter, Layers } from 'lucide-react';
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
  condition: string;
  location: string;
  image_url: string;
  description: string;
  categories: { name: string }[] | null;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');

  useEffect(() => {
    Promise.all([
      supabase.from('inventory').select('*, categories(name)').order('name'),
      supabase.from('categories').select('id, name').order('name'),
    ]).then(([invRes, catRes]) => {
      setItems((invRes.data as InventoryItem[]) || []);
      setCategories((catRes.data as { id: string; name: string }[]) || []);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return items.filter(i => {
      const matchSearch = !search ||
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.code?.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryId === 'all' || i.category_id === categoryId;
      return matchSearch && matchCat;
    });
  }, [items, search, categoryId]);

  const conditionColor: Record<string, string> = {
    good: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    fair: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    poor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const conditionLabel: Record<string, string> = { good: 'Baik', fair: 'Layak', poor: 'Rusak' };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="relative z-10 pt-20 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inventaris</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Daftar barang yang tersedia untuk dipinjam</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari barang atau kode..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="pl-10 pr-8 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="all">Semua Kategori</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-56 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Tidak ada inventaris" message="Coba ubah kata kunci atau kategori" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(item => {
              const available = (item.available_quantity ?? item.quantity) > 0;
              return (
                <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
                      <Package className="w-10 h-10 text-cyan-400 dark:text-slate-500" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{item.name}</h3>
                      {item.condition && (
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', conditionColor[item.condition] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400')}>
                          {conditionLabel[item.condition] || item.condition}
                        </span>
                      )}
                    </div>
                    {item.code && <p className="text-xs text-slate-400 mb-2">Kode: {item.code}</p>}
                    {item.categories?.[0]?.name && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-400 mb-2">
                        <Layers className="w-3 h-3" />{item.categories[0].name}
                      </span>
                    )}
                    <div className="flex items-center justify-between mt-2 text-xs">
                      {item.location && (
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><MapPin className="w-3.5 h-3.5" />{item.location}</span>
                      )}
                      <span className={cn('font-medium', available ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
                        {available ? `${item.available_quantity ?? item.quantity} tersedia` : 'Habis'}
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
