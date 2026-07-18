import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ClipboardList, Search, Plus, Minus, Trash2, Package, Building2,
  Loader2, Send, CheckCircle, User, Mail, Phone, Calendar, Clock,
  FileText, ShoppingCart, ArrowLeft, AlertCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { getDefaultWorkflow } from '../lib/workflow';
import { cn } from '../utils/cn';

interface Category {
  name: string;
}

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
  category_id: string | null;
  quantity: number;
  condition: 'good' | 'fair' | 'poor' | null;
  location: string | null;
  image_url: string | null;
  available_quantity: number | null;
  categories: Category | null;
}

interface Facility {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  image_url: string | null;
  status: string | null;
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

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/4226119/pexels-photo-4226119.jpeg?auto=compress&cs=tinysrgb&w=800';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

const emptyForm: BorrowerForm = {
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
  const [tab, setTab] = useState<'barang' | 'fasilitas'>('barang');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState<BorrowerForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ id: string; name: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, facRes] = await Promise.all([
        supabase.from('inventory').select('*, categories!category_id(name)').order('name', { ascending: true }),
        supabase.from('facilities').select('*').order('name', { ascending: true }),
      ]);
      setInventory((invRes.data as unknown as InventoryItem[]) || []);
      setFacilities((facRes.data as unknown as Facility[]) || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Only show available, good-condition inventory items
  const availableInventory = useMemo(() => {
    return inventory.filter((item) => (item.available_quantity ?? 0) > 0 && item.condition === 'good');
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    if (!search.trim()) return availableInventory;
    const q = search.toLowerCase();
    return availableInventory.filter(
      (item) => item.name.toLowerCase().includes(q) || (item.code?.toLowerCase().includes(q) ?? false),
    );
  }, [availableInventory, search]);

  const filteredFacilities = useMemo(() => {
    if (!search.trim()) return facilities;
    const q = search.toLowerCase();
    return facilities.filter(
      (f) => f.name.toLowerCase().includes(q) || (f.location?.toLowerCase().includes(q) ?? false),
    );
  }, [facilities, search]);

  const addToCart = (item: InventoryItem | Facility, type: 'barang' | 'fasilitas') => {
    const cartId = `${type}-${item.id}`;
    if (cart.some((c) => c.id === cartId)) {
      showToast('Item sudah ada di keranjang', 'info');
      return;
    }
    const maxQty = type === 'barang' ? (item as InventoryItem).available_quantity ?? 1 : 1;
    setCart((prev) => [...prev, { id: cartId, type, name: item.name, quantity: 1, maxQuantity: maxQty }]);
    showToast(`${item.name} ditambahkan ke keranjang`, 'success');
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.id !== cartId) return c;
        const newQty = Math.max(1, Math.min(c.maxQuantity, c.quantity + delta));
        return { ...c, quantity: newQty };
      }),
    );
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((c) => c.id !== cartId));
  };

  const handleChange = (field: keyof BorrowerForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): boolean => {
    if (cart.length === 0) { showToast('Keranjang masih kosong', 'error'); return false; }
    if (!form.borrower_name.trim()) { showToast('Nama peminjam wajib diisi', 'error'); return false; }
    if (!form.borrower_class.trim()) { showToast('Kelas/Unit wajib diisi', 'error'); return false; }
    if (!form.borrower_email.trim()) { showToast('Email wajib diisi', 'error'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.borrower_email)) { showToast('Format email tidak valid', 'error'); return false; }
    if (!form.borrow_date) { showToast('Tanggal pinjam wajib diisi', 'error'); return false; }
    if (!form.return_date) { showToast('Tanggal kembali wajib diisi', 'error'); return false; }
    if (new Date(form.return_date) < new Date(form.borrow_date)) { showToast('Tanggal kembali harus setelah tanggal pinjam', 'error'); return false; }
    if (form.purpose.trim().length < 10) { showToast('Keperluan minimal 10 karakter', 'error'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      // 1. Fetch default workflow
      const workflow = await getDefaultWorkflow();

      // 2. Determine item_type
      const hasBarang = cart.some((c) => c.type === 'barang');
      const hasFasilitas = cart.some((c) => c.type === 'fasilitas');
      const itemType = hasBarang && hasFasilitas ? 'barang' : hasFasilitas ? 'fasilitas' : 'barang';

      // 3. Insert borrowing
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
        .select()
        .single();

      if (borrowingError) throw borrowingError;
      const borrowingId = (borrowingData as unknown as { id: string }).id;

      // 4. Insert borrowing_items
      const itemsPayload = cart.map((c) => {
        const inventoryId = c.type === 'barang' ? c.id.replace('barang-', '') : null;
        const facilityId = c.type === 'fasilitas' ? c.id.replace('fasilitas-', '') : null;
        return {
          borrowing_id: borrowingId,
          inventory_id: inventoryId,
          facility_id: facilityId,
          item_type: c.type,
          item_name: c.name,
          quantity: c.quantity,
          status: 'pending',
          current_step: 1,
          current_status_label: 'Menunggu Persetujuan',
          workflow_template_id: workflow?.id ?? null,
        };
      });

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
      setSuccess({ id: borrowingId, name: form.borrower_name.trim() });
      setCart([]);
      setForm(emptyForm);
      showToast('Peminjaman berhasil diajukan!', 'success');
    } catch (err) {
      console.error('Error submitting borrowing:', err);
      showToast('Gagal mengajukan peminjaman. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-16 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm text-center w-full">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Peminjaman Berhasil Diajukan!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Halo <span className="font-semibold">{success.name}</span>, pengajuan peminjaman Anda telah berhasil dikirim.
            </p>
            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-2xl p-4 mb-6 text-left text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-slate-500 dark:text-slate-400">ID Peminjaman</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">{success.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">Menunggu Persetujuan</span>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Anda akan menerima notifikasi via email setelah pengajuan diproses. Pantau status di halaman Riwayat.
            </p>
            <button
              onClick={() => setSuccess(null)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Kembali ke Form
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Ajukan Peminjaman</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-13">
            Pilih barang atau fasilitas, isi formulir, dan ajukan peminjaman
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                onClick={() => setTab('barang')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                  tab === 'barang' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400',
                )}
              >
                <Package className="w-4 h-4" />
                Barang
              </button>
              <button
                onClick={() => setTab('fasilitas')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                  tab === 'fasilitas' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400',
                )}
              >
                <Building2 className="w-4 h-4" />
                Fasilitas
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={tab === 'barang' ? 'Cari barang...' : 'Cari fasilitas...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : tab === 'barang' ? (
              filteredInventory.length === 0 ? (
                <EmptyState icon={Package} title="Tidak ada barang tersedia" description="Semua barang sedang dipinjam atau tidak tersedia" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredInventory.map((item) => {
                    const inCart = cart.some((c) => c.id === `barang-${item.id}`);
                    return (
                      <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {item.categories?.name && (
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{item.categories.name}</span>
                            )}
                            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{item.name}</h3>
                            {item.location && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.location}</p>}
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                              Tersedia: {item.available_quantity ?? 0}
                            </p>
                          </div>
                          <button
                            onClick={() => addToCart(item, 'barang')}
                            disabled={inCart}
                            className={cn(
                              'flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex-shrink-0',
                              inCart ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white',
                            )}
                          >
                            {inCart ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {inCart ? 'Dipilih' : 'Tambah'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredFacilities.length === 0 ? (
              <EmptyState icon={Building2} title="Tidak ada fasilitas tersedia" description="Coba ubah kata kunci pencarian" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredFacilities.map((facility) => {
                  const inCart = cart.some((c) => c.id === `fasilitas-${facility.id}`);
                  return (
                    <div key={facility.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{facility.name}</h3>
                          {facility.location && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{facility.location}</p>}
                          {facility.capacity != null && <p className="text-xs text-slate-400 mt-0.5">Kapasitas: {facility.capacity} orang</p>}
                        </div>
                        <button
                          onClick={() => addToCart(facility, 'fasilitas')}
                          disabled={inCart}
                          className={cn(
                            'flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex-shrink-0',
                            inCart ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white',
                          )}
                        >
                          {inCart ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          {inCart ? 'Dipilih' : 'Tambah'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Cart + Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              {/* Cart */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-5 h-5 text-blue-500" />
                  <h2 className="font-bold text-slate-900 dark:text-white">Keranjang</h2>
                  {cart.length > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                      {cart.length} item
                    </span>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Keranjang masih kosong</p>
                    <p className="text-xs text-slate-400 mt-1">Pilih barang atau fasilitas untuk dipinjam</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                          <p className="text-xs text-slate-400 capitalize">{item.type}</p>
                        </div>
                        {item.type === 'barang' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-600"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold text-slate-900 dark:text-white">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              disabled={item.quantity >= item.maxQuantity}
                              className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
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
                <h2 className="font-bold text-slate-900 dark:text-white">Data Peminjam</h2>

                <div>
                  <label className={labelClass}>Nama Peminjam <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" value={form.borrower_name} onChange={(e) => handleChange('borrower_name', e.target.value)} placeholder="Nama lengkap" className={cn(inputClass, 'pl-12')} required />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Kelas/Unit <span className="text-red-500">*</span></label>
                  <input type="text" value={form.borrower_class} onChange={(e) => handleChange('borrower_class', e.target.value)} placeholder="Contoh: XII IPA 1" className={inputClass} required />
                </div>

                <div>
                  <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="email" value={form.borrower_email} onChange={(e) => handleChange('borrower_email', e.target.value)} placeholder="email@contoh.com" className={cn(inputClass, 'pl-12')} required />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>No. Telepon <span className="text-slate-400 text-xs">(opsional)</span></label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" value={form.borrower_phone} onChange={(e) => handleChange('borrower_phone', e.target.value)} placeholder="08xxxxxxxxxx" className={cn(inputClass, 'pl-12')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Tgl Pinjam <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="date" value={form.borrow_date} onChange={(e) => handleChange('borrow_date', e.target.value)} className={cn(inputClass, 'pl-12')} required />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Tgl Kembali <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="date" value={form.return_date} min={form.borrow_date} onChange={(e) => handleChange('return_date', e.target.value)} className={cn(inputClass, 'pl-12')} required />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Waktu Mulai</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="time" value={form.start_time} onChange={(e) => handleChange('start_time', e.target.value)} className={cn(inputClass, 'pl-12')} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Waktu Selesai</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="time" value={form.end_time} onChange={(e) => handleChange('end_time', e.target.value)} className={cn(inputClass, 'pl-12')} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Keperluan/Tujuan <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                    <textarea value={form.purpose} onChange={(e) => handleChange('purpose', e.target.value)} placeholder="Jelaskan keperluan peminjaman (min. 10 karakter)" rows={3} className={cn(inputClass, 'pl-12 resize-none')} required minLength={10} />
                  </div>
                  {form.purpose.length > 0 && form.purpose.length < 10 && (
                    <p className="text-xs text-amber-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{10 - form.purpose.length} karakter lagi</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Catatan Tambahan <span className="text-slate-400 text-xs">(opsional)</span></label>
                  <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Catatan tambahan untuk admin" rows={2} className={cn(inputClass, 'resize-none')} />
                </div>

                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {submitting ? 'Mengirim...' : 'Ajukan Peminjaman'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
