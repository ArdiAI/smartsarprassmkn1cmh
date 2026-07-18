import { useEffect, useState, useMemo, FormEvent } from 'react';
import {
  Package, Building2, Search, Plus, Minus, Trash2, ShoppingCart,
  User, Mail, Phone, Calendar, Clock, FileText, StickyNote, Loader2,
  CheckCircle2, Send, X, ClipboardList, AlertCircle,
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
  code: string | null;
  name: string;
  category_id: string | null;
  quantity: number;
  condition: 'good' | 'fair' | 'poor';
  location: string | null;
  image_url: string | null;
  available_quantity: number;
  categories: { name: string } | null;
}

interface Facility {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  image_url: string | null;
  facility_type: string | null;
}

interface CartItem {
  id: string;
  type: 'barang' | 'fasilitas';
  name: string;
  quantity: number;
  maxQuantity: number;
}

interface BorrowerForm {
  borrower_name: string;
  borrower_class: string;
  borrower_email: string;
  borrower_phone: string;
  borrow_date: string;
  return_date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  notes: string;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const initialForm: BorrowerForm = {
  borrower_name: '',
  borrower_class: '',
  borrower_email: '',
  borrower_phone: '',
  borrow_date: todayStr(),
  return_date: '',
  start_time: '08:00',
  end_time: '16:00',
  purpose: '',
  notes: '',
};

export default function BorrowPage() {
  const [activeTab, setActiveTab] = useState<'barang' | 'fasilitas'>('barang');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState<BorrowerForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string; name: string; itemCount: number } | null>(null);

  useEffect(() => {
    async function fetchItems() {
      try {
        const [invRes, facRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)')
            .gt('available_quantity', 0)
            .eq('condition', 'good')
            .order('name', { ascending: true }),
          supabase
            .from('facilities')
            .select('id, name, description, location, capacity, image_url, facility_type')
            .order('name', { ascending: true }),
        ]);
        setInventory((invRes.data as unknown as InventoryItem[]) || []);
        setFacilities((facRes.data as unknown as Facility[]) || []);
      } catch (err) {
        console.error('Error fetching items:', err);
      } finally {
        setLoadingItems(false);
      }
    }
    fetchItems();
  }, []);

  const filteredInventory = useMemo(() =>
    inventory.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())),
    [inventory, search],
  );
  const filteredFacilities = useMemo(() =>
    facilities.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())),
    [facilities, search],
  );

  function addToCart(item: InventoryItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id && c.type === 'barang');
      if (existing) {
        showToast('Item sudah ada di keranjang', 'info');
        return prev;
      }
      return [...prev, { id: item.id, type: 'barang' as const, name: item.name, quantity: 1, maxQuantity: item.available_quantity }];
    });
  }

  function addFacilityToCart(fac: Facility) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === fac.id && c.type === 'fasilitas');
      if (existing) {
        showToast('Fasilitas sudah ada di keranjang', 'info');
        return prev;
      }
      return [...prev, { id: fac.id, type: 'fasilitas' as const, name: fac.name, quantity: 1, maxQuantity: 1 }];
    });
  }

  function updateQty(id: string, type: string, delta: number) {
    setCart((prev) =>
      prev.map((c) => {
        if (c.id === id && c.type === type) {
          const newQty = Math.max(1, Math.min(c.maxQuantity, c.quantity + delta));
          return { ...c, quantity: newQty };
        }
        return c;
      }),
    );
  }

  function removeFromCart(id: string, type: string) {
    setCart((prev) => prev.filter((c) => !(c.id === id && c.type === type)));
  }

  function handleChange(field: keyof BorrowerForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate(): boolean {
    if (cart.length === 0) {
      showToast('Keranjang masih kosong', 'error');
      return false;
    }
    if (!form.borrower_name.trim()) { showToast('Nama peminjam wajib diisi', 'error'); return false; }
    if (!form.borrower_class.trim()) { showToast('Kelas/Unit wajib diisi', 'error'); return false; }
    if (!form.borrower_email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.borrower_email)) {
      showToast('Email tidak valid', 'error'); return false;
    }
    if (!form.borrow_date) { showToast('Tanggal pinjam wajib diisi', 'error'); return false; }
    if (!form.return_date) { showToast('Tanggal kembali wajib diisi', 'error'); return false; }
    if (form.return_date <= form.borrow_date) {
      showToast('Tanggal kembali harus setelah tanggal pinjam', 'error'); return false;
    }
    if (form.purpose.trim().length < 10) {
      showToast('Keperluan minimal 10 karakter', 'error'); return false;
    }
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      // 1. Fetch default workflow
      const workflow = await getDefaultWorkflow();

      // 2. Determine item_type from cart (use first item's type, or 'barang' if mixed)
      const itemType = cart[0]?.type || 'barang';

      // 3. Insert into borrowings
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
        workflow_template_id: workflow?.id ?? null,
      };
      const { data: borrowingData, error: borrowingError } = await supabase
        .from('borrowings')
        .insert(borrowingPayload)
        .select('id')
        .single();
      if (borrowingError) throw borrowingError;
      const borrowingId = (borrowingData as unknown as { id: string }).id;

      // 4. Insert borrowing_items
      const itemsPayload = cart.map((c) => ({
        borrowing_id: borrowingId,
        inventory_id: c.type === 'barang' ? c.id : null,
        facility_id: c.type === 'fasilitas' ? c.id : null,
        item_type: c.type,
        item_name: c.name,
        quantity: c.quantity,
        status: 'pending',
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        workflow_template_id: workflow?.id ?? null,
      }));
      const { error: itemsError } = await supabase.from('borrowing_items').insert(itemsPayload);
      if (itemsError) throw itemsError;

      // 5. Send email notification
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v2/send-borrowing-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_request',
            borrowing_id: borrowingId,
            borrower_name: form.borrower_name.trim(),
            borrower_email: form.borrower_email.trim(),
          }),
        });
      } catch (emailErr) {
        console.error('Failed to send email notification:', emailErr);
      }

      // 6. Success state
      setSuccessData({ id: borrowingId, name: form.borrower_name.trim(), itemCount: cart.length });
      setSuccess(true);
      showToast('Peminjaman berhasil diajukan!', 'success');
    } catch (err) {
      console.error('Error submitting borrowing:', err);
      showToast('Gagal mengajukan peminjaman. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setCart([]);
    setForm(initialForm);
    setSuccess(false);
    setSuccessData(null);
  }

  const inputClasses =
    'w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Ajukan Peminjaman</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Pilih barang/fasilitas dan isi data peminjam</p>
            </div>
          </div>
        </div>

        {success && successData ? (
          /* Success State */
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 text-center max-w-xl mx-auto animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Peminjaman Berhasil Diajukan!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Pengajuan peminjaman Anda telah dikirim dan sedang menunggu persetujuan. Anda akan mendapat notifikasi melalui email.
            </p>
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/30 p-5 mb-6 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Nama Peminjam:</span>
                <span className="font-medium text-slate-900 dark:text-white">{successData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Jumlah Item:</span>
                <span className="font-medium text-slate-900 dark:text-white">{successData.itemCount} item</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Status:</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">Menunggu Persetujuan</span>
              </div>
            </div>
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              Buat Peminjaman Baru
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Item Selection */}
            <div className="lg:col-span-2 space-y-4">
              {/* Tabs */}
              <div className="flex gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
                <button
                  onClick={() => setActiveTab('barang')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                    activeTab === 'barang'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                  )}
                >
                  <Package className="w-4 h-4" />
                  Barang
                </button>
                <button
                  onClick={() => setActiveTab('fasilitas')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                    activeTab === 'fasilitas'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                  )}
                >
                  <Building2 className="w-4 h-4" />
                  Fasilitas
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Cari ${activeTab === 'barang' ? 'barang' : 'fasilitas'}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={cn(inputClasses, 'pl-10')}
                />
              </div>

              {/* Items Grid */}
              {loadingItems ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                          <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-700/50 rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeTab === 'barang' ? (
                filteredInventory.length === 0 ? (
                  <EmptyState icon={Package} title="Tidak ada barang tersedia" description="Belum ada barang yang tersedia untuk dipinjam" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredInventory.map((item) => {
                      const inCart = cart.some((c) => c.id === item.id && c.type === 'barang');
                      return (
                        <div
                          key={item.id}
                          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center flex-shrink-0">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-xl" loading="lazy" />
                              ) : (
                                <Package className="w-6 h-6 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm text-slate-900 dark:text-white truncate">{item.name}</h3>
                              {item.categories?.name && (
                                <span className="inline-block mt-0.5 text-xs text-blue-600 dark:text-blue-400">{item.categories.name}</span>
                              )}
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Tersedia: {item.available_quantity} / {item.quantity}
                              </p>
                            </div>
                            <button
                              onClick={() => addToCart(item)}
                              disabled={inCart}
                              className={cn(
                                'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex-shrink-0',
                                inCart
                                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-default'
                                  : 'bg-blue-500 text-white hover:bg-blue-600',
                              )}
                            >
                              {inCart ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                              {inCart ? 'Dipilih' : 'Tambah'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : filteredFacilities.length === 0 ? (
                <EmptyState icon={Building2} title="Tidak ada fasilitas tersedia" description="Belum ada fasilitas yang terdaftar" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredFacilities.map((fac) => {
                    const inCart = cart.some((c) => c.id === fac.id && c.type === 'fasilitas');
                    return (
                      <div
                        key={fac.id}
                        className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-6 h-6 text-cyan-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm text-slate-900 dark:text-white truncate">{fac.name}</h3>
                            {fac.location && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{fac.location}</p>}
                            {fac.capacity != null && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kapasitas: {fac.capacity} orang</p>}
                          </div>
                          <button
                            onClick={() => addFacilityToCart(fac)}
                            disabled={inCart}
                            className={cn(
                              'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex-shrink-0',
                              inCart
                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-default'
                                : 'bg-cyan-500 text-white hover:bg-cyan-600',
                            )}
                          >
                            {inCart ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {inCart ? 'Dipilih' : 'Tambah'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Panel: Cart + Form */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                {/* Cart Header */}
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-500" />
                    Keranjang ({cart.length})
                  </h2>
                  {cart.length > 0 && (
                    <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-600">Kosongkan</button>
                  )}
                </div>

                {/* Cart Items */}
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Keranjang kosong</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cart.map((c) => (
                      <div key={`${c.type}-${c.id}`} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                        <div className="flex-shrink-0">
                          {c.type === 'barang' ? <Package className="w-4 h-4 text-blue-500" /> : <Building2 className="w-4 h-4 text-cyan-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                          <p className="text-xs text-slate-400 capitalize">{c.type}</p>
                        </div>
                        {/* Stepper */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => updateQty(c.id, c.type, -1)}
                            disabled={c.quantity <= 1}
                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-500"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-medium w-6 text-center text-slate-900 dark:text-white">{c.quantity}</span>
                          <button
                            onClick={() => updateQty(c.id, c.type, 1)}
                            disabled={c.quantity >= c.maxQuantity}
                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-500"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button onClick={() => removeFromCart(c.id, c.type)} className="text-red-400 hover:text-red-500 flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-3">Data Peminjam</h3>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nama Peminjam *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" value={form.borrower_name} onChange={(e) => handleChange('borrower_name', e.target.value)} required className={cn(inputClasses, 'pl-9 py-2 text-sm')} placeholder="Nama lengkap" />
                      </div>
                    </div>
                    {/* Class */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Kelas/Unit *</label>
                      <input type="text" value={form.borrower_class} onChange={(e) => handleChange('borrower_class', e.target.value)} required className={cn(inputClasses, 'py-2 text-sm')} placeholder="Contoh: XII IPA 1" />
                    </div>
                    {/* Email */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="email" value={form.borrower_email} onChange={(e) => handleChange('borrower_email', e.target.value)} required className={cn(inputClasses, 'pl-9 py-2 text-sm')} placeholder="email@sekolah.sch.id" />
                      </div>
                    </div>
                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">No. Telepon <span className="text-slate-400">(opsional)</span></label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" value={form.borrower_phone} onChange={(e) => handleChange('borrower_phone', e.target.value)} className={cn(inputClasses, 'pl-9 py-2 text-sm')} placeholder="08xxxxxxxxxx" />
                      </div>
                    </div>
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tgl Pinjam *</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="date" value={form.borrow_date} onChange={(e) => handleChange('borrow_date', e.target.value)} required className={cn(inputClasses, 'pl-9 py-2 text-sm')} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tgl Kembali *</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="date" value={form.return_date} min={form.borrow_date} onChange={(e) => handleChange('return_date', e.target.value)} required className={cn(inputClasses, 'pl-9 py-2 text-sm')} />
                        </div>
                      </div>
                    </div>
                    {/* Times */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Waktu Mulai</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="time" value={form.start_time} onChange={(e) => handleChange('start_time', e.target.value)} className={cn(inputClasses, 'pl-9 py-2 text-sm')} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Waktu Selesai</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="time" value={form.end_time} onChange={(e) => handleChange('end_time', e.target.value)} className={cn(inputClasses, 'pl-9 py-2 text-sm')} />
                        </div>
                      </div>
                    </div>
                    {/* Purpose */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Keperluan/Tujuan * <span className="text-slate-400">(min 10 karakter)</span></label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <textarea value={form.purpose} onChange={(e) => handleChange('purpose', e.target.value)} required rows={3} className={cn(inputClasses, 'pl-9 py-2 text-sm resize-none')} placeholder="Jelaskan keperluan peminjaman..." />
                      </div>
                    </div>
                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Catatan Tambahan <span className="text-slate-400">(opsional)</span></label>
                      <div className="relative">
                        <StickyNote className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={2} className={cn(inputClasses, 'pl-9 py-2 text-sm resize-none')} placeholder="Catatan tambahan..." />
                      </div>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={submitting || cart.length === 0}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Mengirim...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Ajukan Peminjaman
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
