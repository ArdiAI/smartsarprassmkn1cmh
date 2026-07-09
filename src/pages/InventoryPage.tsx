import { useState, useEffect } from 'react';
import { Search, Filter, Package, MapPin, Calendar, DollarSign } from 'lucide-react';
import { Inventory, Category, ItemCondition } from '../types';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { cn } from '../utils/cn';

const conditionColors: Record<ItemCondition, string> = {
  good: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  fair: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  poor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('inventory').select('*, categories(*)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
    ]).then(([invRes, catRes]) => {
      if (invRes.data) setInventory(invRes.data);
      if (catRes.data) setCategories(catRes.data);
      setLoading(false);
    });
  }, []);

  const filtered = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  const formatDate = (date: string) => new Date(date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <section className="pt-24 pb-8 bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Inventaris Barang</h1>
          <p className="text-slate-600 dark:text-slate-400">Daftar lengkap inventaris sekolah</p>
        </div>
      </section>
      <section className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700 py-4">
        <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" placeholder="Cari barang..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700" />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
              className="pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700">
              <option value="">Semua Kategori</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
        </div>
      </section>
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map(item => (
                <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-xl transition-shadow">
                  <div className="relative h-40 bg-slate-100 dark:bg-slate-700">
                    {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <Package className="w-16 h-16 text-slate-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                    <span className={cn('absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium', conditionColors[item.condition])}>
                      {item.condition === 'good' ? 'Baik' : item.condition === 'fair' ? 'Cukup' : 'Rusak'}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-slate-400 mb-1">{item.code}</div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{item.name}</h3>
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2"><Package className="w-4 h-4" />{item.quantity} unit</div>
                      <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{item.location}</div>
                      {item.purchase_date && <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />{formatDate(item.purchase_date)}</div>}
                      {item.price > 0 && <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" />{formatCurrency(item.price)}</div>}
                    </div>
                    {item.categories && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600">{item.categories.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
