import { useState, useEffect, useMemo } from 'react';
import {
  Search, Package, Building2, Plus, Minus, Trash2, ShoppingCart,
  Loader2, Send, CheckCircle, Calendar, Clock, User, Mail, Phone,
  ArrowLeft, FileText, AlertCircle
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { getDefaultWorkflow } from '../lib/workflow';
import { cn } from '../utils/cn';

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category_id: string;
  quantity: number;
  condition: 'good' | 'fair' | 'poor';
  location: string;
  image_url: string;
  description: string;
  available_quantity: number;
  categories: { name: string } | null;
}

interface Facility {
  id: string;
  name: string;
  description: string;
  location: string;
  capacity: number;
  image_url: string;
  facility_type: string;
  status: string;
}

interface CartItem {
  id: string;
  type: 'barang' | 'fasilitas';
  name: string;
  quantity: number;
  maxQuantity: number;
}

const FALLBACK_FACILITY_IMAGE = 'https://images.pexels.com/photos/2079249/pexels-photo-2079249.jpeg?auto=compress&cs=tinysrgb&w=600';

export default function BorrowPage() {
  const [tab, setTab] = useState<'barang' | 'fasilitas'>('barang');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ id: string; name: string; items: CartItem[] } | null>(null);

  const [form, setForm] = useState({
    borrower_name: '',
    borrower_class: '',
    borrower_email: '',
    borrower_phone: '',
    borrow_date: new Date().toISOString().split('T')[0],
    return_date: '',
    start_time: '08:00',
    end_time: '16:00',
    purpose: '',
    notes: '',
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [invRes, facRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)')
            .order('created_at', { ascending: false }),
          supabase
            .from('facilities')
            .select('id, name, description, location, capacity, image_url, facility_type, status')
            .order('created_at', { ascending: false }),
        ]);

        if (invRes.data) setInventory(invRes.data as unknown as InventoryItem[]);
        if (facRes.data) setFacilities(facRes.data as unknown as Facility[]);
      } catch (e) {
        console.error('Error fetching data:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Only show items with available_quantity > 0 and condition = 'good'
  const availableInventory = useMemo(
    () => inventory.filter((i) => (i.available_quantity ?? 0) > 0 && i.condition === 'good'),
    [inventory]
  );

  const filteredInventory = availableInventory.filter((i) =>
    i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.code?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFacilities = facilities.filter((f) =>
    f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.location?.toLowerCase().includes(search.toLowerCase())
  );

  function addToCart(item: InventoryItem | Facility, type: 'barang' | 'fasilitas') {
    const maxQty = type === 'barang' ? (item as InventoryItem).available_quantity ?? 0 : 1;
    if (maxQty <= 0) {
      showToast('Item tidak tersedia', 'warning');
      return;
    }
    const existing = cart.find((c) => c.id === item.id && c.type === type);
    if (existing) {
      showToast('Item sudah ada di keranjang', 'info');
      return;
    }
    setCart([...cart, { id: item.id, type, name: item.name, quantity: 1, maxQuantity: maxQty }]);
    showToast(`${item.name} ditambahkan ke keranjang`, 'success');
  }

  function updateQuantity(id: string, delta: number) {
    setCart((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const newQty = c.quantity + delta;
        if (newQty < 1) return c;
        if (newQty > c.maxQuantity) {
          showToast('Jumlah melebihi ketersediaan', 'warning');
          return c;
        }
        return { ...c, quantity: newQty };
      })
    );
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((c) => c.id !== id));
    showToast('Item dihapus dari keranjang', 'info');
  }

  function validate(): boolean {
    if (cart.length === 0) { showToast('Keranjang masih kosong', 'warning'); return false; }
    if (!form.borrower_name.trim()) { showToast('Nama peminjam wajib diisi', 'warning'); return false; }
    if (!form.borrower_class.trim()) { showToast('Kelas/Unit wajib diisi', 'warning'); return false; }
    if (!form.borrower_email.trim() || !form.borrower_email.includes('@')) { showToast('Email valid wajib diisi', 'warning'); return false; }
    if (!form.borrow_date) { showToast('Tanggal pinjam wajib diisi', 'warning'); return false; }
    if (!form.return_date) { showToast('Tanggal kembali wajib diisi', 'warning'); return false; }
    if (form.return_date < form.borrow_date) { showToast('Tanggal kembali harus setelah tanggal pinjam', 'warning'); return false; }
    if (!form.purpose.trim() || form.purpose.trim().length < 10) { showToast('Keperluan minimal 10 karakter', 'warning'); return false; }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      // 1. Fetch default workflow
      const workflow = await getDefaultWorkflow();

      // Determine item_type based on cart contents
      const hasBarang = cart.some((c) => c.type === 'barang');
      const hasFasilitas = cart.some((c) => c.type === 'fasilitas');
      const itemType = hasFasilitas && !hasBarang ? 'fasilitas' : 'barang';

      // 2. Insert into borrowings
      const borrowingPayload = {
        borrower_name: form.borrower_name.trim(),
        borrower_class: form.borrower_class.trim(),
        borrower_email: form.borrower_email.trim(),
        borrower_phone: form.borrower_phone.trim() || null,
        borrow_date: form.borrow_date,
        return_date: form.return_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        purpose: form.purpose.trim(),
        notes: form.notes.trim() || null,
        status: 'pending' as const,
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        item_type: itemType,
        workflow_template_id: workflow?.id || null,
      };

      const { data: borrowingData, error: borrowingError } = await supabase
        .from('borrowings')
        .insert(borrowingPayload)
        .select('id')
        .single();

      if (borrowingError) throw borrowingError;
      const borrowingId = borrowingData.id;

      // 3. Insert borrowing_items for each cart item
      const borrowingItemsPayload = cart.map((c) => ({
        borrowing_id: borrowingId,
        inventory_id: c.type === 'barang' ? c.id : null,
        facility_id: c.type === 'fasilitas' ? c.id : null,
        item_type: c.type,
        item_name: c.name,
        quantity: c.quantity,
        status: 'pending',
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        workflow_template_id: workflow?.id || null,
      }));

      const { error: itemsError } = await supabase
        .from('borrowing_items')
        .insert(borrowingItemsPayload);

      if (itemsError) throw itemsError;

      // 4. Send email notification
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v2/send-borrowing-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_request',
            borrowing_id: borrowingId,
            borrower_name: form.borrower_name,
            borrower_email: form.borrower_email,
          }),
        });
      } catch (emailErr) {
        console.error('Email send failed (non-fatal):', emailErr);
      }

      // 5. Success
      showToast('Peminjaman berhasil diajukan!', 'success');
      setSuccess({ id: borrowingId, name: form.borrower_name, items: [...cart] });
    } catch (e) {
      console.error('Error submitting borrowing:', e);
      showToast('Gagal mengajukan peminjaman. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSuccess(null);
    setCart([]);
    setForm({
      borrower_name: '',
      borrower_class: '',
      borrower_email: '',
      borrower_phone: '',
      borrow_date: new Date().toISOString().split('T')[0],
      return_date: '',
      start_time: '08:00',
      end_time: '16:00',
      purpose: '',
      notes: '',
    });
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Peminjaman Berhasil Diajukan!</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Pengajuan peminjaman Anda telah berhasil dikirim dan menunggu persetujuan.
            </p>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 text-left mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Peminjam</span>
                <span className="font-medium text-slate-900 dark:text-white">{success.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">ID Peminjaman</span>
                <span className="font-mono text-xs text-slate-900 dark:text-white">{success.id.slice(0, 8)}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Item Dipinjam:</p>
                <div className="space-y-1.5">
                  {success.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                      <span className="text-slate-500 dark:text-slate-400">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <Clock className="w-3.5 h-3.5" />
                  Menunggu Persetujuan
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={resetForm}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Buat Peminjaman Lain
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Ajukan Peminjaman</h1>
          <p className="text-slate-600 dark:text-slate-400">Pilih barang atau fasilitas, lisi form, dan ajukan peminjaman</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Selection */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTab('barang')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors',
                  tab === 'barang'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-blue-300'
                )}
              >
                <Package className="w-4 h-4" />
                Barang
              </button>
              <button
                onClick={() => setTab('fasilitas')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors',
                  tab === 'fasilitas'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-blue-300'
                )}
              >
                <Building2 className="w-4 h-4" />
                Fasilitas
              </button>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={tab === 'barang' ? 'Cari barang...' : 'Cari fasilitas...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 animate-pulse">
                    <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : tab === 'barang' ? (
              filteredInventory.length === 0 ? (
                <EmptyState icon={Package} title="Tidak ada barang tersedia" description="Semua barang sedang dipinjam atau tidak layak" />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filteredInventory.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3">
                        <Package className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-medium text-sm text-slate-900 dark:text-white mb-1 line-clamp-2">{item.name}</h3>
                      {item.categories?.name && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{item.categories.name}</p>
                      )}
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-3">
                        Tersedia: {item.available_quantity} unit
                      </p>
                      <button
                        onClick={() => addToCart(item, 'barang')}
                        className="mt-auto flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : filteredFacilities.length === 0 ? (
              <EmptyState icon={Building2} title="Tidak ada fasilitas tersedia" description="Coba ubah kata kunci pencarian" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {filteredFacilities.map((fac) => {
                  const inCart = cart.some((c) => c.id === fac.id && c.type === 'fasilitas');
                  return (
                    <div
                      key={fac.id}
                      className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col"
                    >
                      <div className="h-20 rounded-lg overflow-hidden mb-3 bg-slate-100 dark:bg-slate-700">
                        <img
                          src={fac.image_url || FALLBACK_FACILITY_IMAGE}
                          alt={fac.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_FACILITY_IMAGE; }}
                        />
                      </div>
                      <h3 className="font-medium text-sm text-slate-900 dark:text-white mb-1 line-clamp-2">{fac.name}</h3>
                      {fac.location && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">{fac.location}</p>
                      )}
                      <button
                        onClick={() => addToCart(fac, 'fasilitas')}
                        disabled={inCart}
                        className={cn(
                          'mt-auto flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          inCart
                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                        )}
                      >
                        {inCart ? (
                          <><CheckCircle className="w-4 h-4" /> Ditambahkan</>
                        ) : (
                          <><Plus className="w-4 h-4" /> Tambah</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Cart + Form */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-20 space-y-4">
              {/* Cart */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">Keranjang</h3>
                  {cart.length > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                      {cart.length} item
                    </span>
                  )}
                </div>

                {cart.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
                    Keranjang masih kosong. Pilih item dari daftar.
                  </p>
                ) : (
                  <div className="space-y-3 mb-4">
                    {cart.map((c) => (
                      <div key={`${c.type}-${c.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          c.type === 'barang' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-cyan-100 dark:bg-cyan-900/30'
                        )}>
                          {c.type === 'barang' ? <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <Building2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => updateQuantity(c.id, -1)}
                              className="w-6 h-6 rounded flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-6 text-center">{c.quantity}</span>
                            <button
                              onClick={() => updateQuantity(c.id, 1)}
                              className="w-6 h-6 rounded flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">/ {c.maxQuantity}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(c.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Borrower Form */}
              <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Data Peminjam
                </h3>

                <div>
                  <label className={labelClass}>Nama Peminjam <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={form.borrower_name} onChange={(e) => setForm({ ...form, borrower_name: e.target.value })} className={cn(inputClass, 'pl-10')} placeholder="Nama lengkap" required />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Kelas/Unit <span className="text-red-500">*</span></label>
                  <input type="text" value={form.borrower_class} onChange={(e) => setForm({ ...form, borrower_class: e.target.value })} className={inputClass} placeholder="Contoh: XII IPA 1" required />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="email" value={form.borrower_email} onChange={(e) => setForm({ ...form, borrower_email: e.target.value })} className={cn(inputClass, 'pl-10')} placeholder="email@sekolah.id" required />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>No. Telepon</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" value={form.borrower_phone} onChange={(e) => setForm({ ...form, borrower_phone: e.target.value })} className={cn(inputClass, 'pl-10')} placeholder="08xxxxxxxxxx (opsional)" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Tgl Pinjam <span className="text-red-500">*</span></label>
                    <input type="date" value={form.borrow_date} onChange={(e) => setForm({ ...form, borrow_date: e.target.value })} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Tgl Kembali <span className="text-red-500">*</span></label>
                    <input type="date" value={form.return_date} min={form.borrow_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} className={inputClass} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Waktu Mulai</label>
                    <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Waktu Selesai</label>
                    <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Keperluan/Tujuan <span className="text-red-500">*</span></label>
                  <textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} rows={3} className={inputClass} placeholder="Jelaskan keperluan (min 10 karakter)" required minLength={10} />
                </div>

                <div>
                  <label className={labelClass}>Catatan Tambahan</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass} placeholder="Catatan (opsional)" />
                </div>

                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Mengirim...</>
                  ) : (
                    <><Send className="w-5 h-5" /> Ajukan Peminjaman</>
                  )}
                </button>

                {cart.length === 0 && (
                  <p className="text-xs text-amber-500 dark:text-amber-400 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Tambahkan minimal 1 item ke keranjang
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
