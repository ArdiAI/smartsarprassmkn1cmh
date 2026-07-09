import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Inventory, Category, ItemCondition } from '../../types';
import { Plus, Search, Edit, Trash2, X, Package, Upload, Check, QrCode, Eye, Filter, Download, Calendar, MapPin, DollarSign, Hash } from 'lucide-react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import EmptyState from '../../components/EmptyState';
import QRCodeGenerator from '../../components/QRCode';

const conditionColors: Record<ItemCondition, { bg: string; text: string }> = {
  good: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  fair: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  poor: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
};

const conditionLabels: Record<ItemCondition, string> = {
  good: 'Baik',
  fair: 'Cukup',
  poor: 'Rusak',
};

export default function InventoryAdminPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [formData, setFormData] = useState({
    code: '', name: '', category_id: '', quantity: 1, condition: 'good' as ItemCondition,
    location: '', image_url: '', purchase_date: '', price: 0, description: ''
  });

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

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      code: generateCode(), name: '', category_id: categories[0]?.id || '', quantity: 1, condition: 'good',
      location: '', image_url: '', purchase_date: new Date().toISOString().split('T')[0], price: 0, description: ''
    });
    setShowModal(true);
  };

  const openEditModal = (item: Inventory) => {
    setEditingItem(item);
    setFormData({
      code: item.code, name: item.name, category_id: item.category_id || '', quantity: item.quantity,
      condition: item.condition, location: item.location, image_url: item.image_url,
      purchase_date: item.purchase_date, price: item.price, description: item.description
    });
    setShowModal(true);
  };

  const openQRModal = (item: Inventory) => {
    setSelectedItem(item);
    setShowQRModal(true);
  };

  const generateCode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `INV-${timestamp.slice(-6)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editingItem) {
      await supabase.from('inventory').update(formData).eq('id', editingItem.id);
    } else {
      await supabase.from('inventory').insert([formData]);
    }
    setShowModal(false);
    fetchData();
    setSaving(false);
  };

  const fetchData = async () => {
    const { data } = await supabase.from('inventory').select('*, categories(*)').order('created_at', { ascending: false });
    if (data) setInventory(data);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin hapus item ini?')) return;
    await supabase.from('inventory').delete().eq('id', id);
    fetchData();
  };

  const filtered = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCondition = !filterCondition || item.condition === filterCondition;
    const matchesCategory = !filterCategory || item.category_id === filterCategory;
    return matchesSearch && matchesCondition && matchesCategory;
  });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kelola Inventaris</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manajemen barang dengan QR code tracking</p>
        </motion.div>
        <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-medium shadow-lg hover:shadow-xl transition-all">
          <Plus className="w-5 h-5" />Tambah Barang
        </motion.button>
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" placeholder="Cari nama atau kode..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div className="flex gap-3">
            <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white">
              <option value="">Semua Kondisi</option>
              <option value="good">Baik</option>
              <option value="fair">Cukup</option>
              <option value="poor">Rusak</option>
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white">
              <option value="">Semua Kategori</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Inventory Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-72 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="package" title="Tidak ada inventaris" description="Tambahkan barang pertama untuk memulai" action={{ label: 'Tambah Barang', onClick: openCreateModal }} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filtered.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.05 }}
                className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all">
                {/* Image */}
                <div className="relative h-40 bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                  <div className={cn('absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm', conditionColors[item.condition].bg, conditionColors[item.condition].text)}>
                    {conditionLabels[item.condition]}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-xs text-white font-mono">{item.code}</div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate mb-1">{item.name}</h3>
                  {item.categories && (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs mb-3">
                      {item.categories.name}
                    </span>
                  )}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />{item.quantity} unit</div>
                    <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{item.location}</div>
                    {item.price > 0 && <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />{formatCurrency(item.price)}</div>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={() => openQRModal(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                      <QrCode className="w-3.5 h-3.5" />QR
                    </button>
                    <button onClick={() => openEditModal(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                      <Edit className="w-3.5 h-3.5" />Edit
                    </button>
                    <button onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingItem ? 'Edit' : 'Tambah'} Inventaris</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1.5">Kode Barang</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1.5">Kategori</label>
                    <select value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white">
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1.5">Nama Barang</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1.5">Jumlah</label>
                    <input type="number" min="1" required value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1.5">Kondisi</label>
                    <select value={formData.condition} onChange={e => setFormData({ ...formData, condition: e.target.value as ItemCondition })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white">
                      <option value="good">Baik</option>
                      <option value="fair">Cukup</option>
                      <option value="poor">Rusak</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1.5">Harga</label>
                    <input type="number" min="0" value={formData.price} onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1.5">Lokasi</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1.5">Tanggal Beli</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="date" value={formData.purchase_date} onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1.5">URL Gambar</label>
                    <div className="relative">
                      <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="url" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi</label>
                  <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" />
                </div>
                <div className="flex gap-3 pt-4 sticky bottom-0 bg-white dark:bg-slate-800 pb-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Batal</button>
                  <button type="submit" disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-medium hover:shadow-lg transition-all">
                    <Check className="w-4 h-4" />{saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && selectedItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowQRModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedItem.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{selectedItem.code}</p>
              </div>
              <QRCodeGenerator value={selectedItem.code} title={selectedItem.name} size={200} />
              <button onClick={() => setShowQRModal(false)}
                className="w-full mt-6 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white font-medium hover:bg-slate-200 dark:hover:bg-slate-600">
                Tutup
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
