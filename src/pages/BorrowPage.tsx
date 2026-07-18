import { useEffect, useState, useMemo, FormEvent } from 'react';
import {
  ClipboardList, Search, Package, Building2, Plus, Minus, Trash2, X,
  User, Mail, Phone, Calendar, Clock, FileText, Send, Loader2, CheckCircle2,
  ShoppingCart, AlertCircle,
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

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

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

const fallbackImages = [
  'https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=400',
];

function getFallbackImage(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return fallbackImages[hash % fallbackImages.length];
}

export default function BorrowPage() {
  const [tab, setTab] = useState<'barang' | 'fasilitas'>('barang');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState<BorrowerForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [invRes, facRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)')
            .order('created_at', { ascending: false }),
          supabase.from('facilities').select('*').order('created_at', { ascending: false }),
        ]);
        if (invRes.error) throw invRes.error;
        setInventory((invRes.data as unknown as InventoryItem[]) || []);
        setFacilities((facRes.data as unknown as Facility[]) || []);
      } catch (e) {
        console.error('Failed to load data:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Only show items with available_quantity > 0 and condition = 'good'
  const availableInventory = useMemo(
    () => inventory.filter((i) => (i.available_quantity ?? 0) > 0 && i.condition === 'good'),
    [inventory],
  );

  const filteredInventory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableInventory;
    return availableInventory.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.code?.toLowerCase().includes(q) ||
        i.location?.toLowerCase().includes(q) ||
        i.categories?.name?.toLowerCase().includes(q),
    );
  }, [availableInventory, search]);

  const filteredFacilities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter(
      (f) =>
        f.name?.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q) ||
        f.location?.toLowerCase().includes(q),
    );
  }, [facilities, search]);

  const addToCart = (item: InventoryItem | Facility, type: 'barang' | 'fasilitas') => {
    const cartId = `${type}-${item.id}`;
    if (cart.some((c) => c.id === cartId)) {
      showToast('Item sudah ada di keranjang', 'info');
      return;
    }
    const maxQty = type === 'barang' ? (item as InventoryItem).available_quantity : 1;
    const name = item.name;
    setCart((prev) => [...prev, { id: cartId, type, name, quantity: 1, maxQuantity: maxQty }]);
    showToast(`${name} ditambahkan ke keranjang`, 'success');
  };

  const updateQty = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.id !== cartId) return c;
        const newQty = c.quantity + delta;
        if (newQty < 1) return c;
        if (newQty > c.maxQuantity) {
          showToast('Jumlah melebihi stok tersedia', 'warning');
          return c;
        }
        return { ...c, quantity: newQty };
      }),
    );
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((c) => c.id !== cartId));
  };

  const update = (field: keyof BorrowerForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): string | null => {
    if (cart.length === 0) return 'Keranjang masih kosong. Pilih minimal satu item.';
    if (!form.borrower_name.trim()) return 'Nama peminjam wajib diisi.';
    if (!form.borrower_class.trim()) return 'Kelas/Unit wajib diisi.';
    if (!form.borrower_email.trim()) return 'Email wajib diisi.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.borrower_email)) return 'Format email tidak valid.';
    if (!form.borrow_date) return 'Tanggal pinjam wajib diisi.';
    if (!form.return_date) return 'Tanggal kembali wajib diisi.';
    if (form.return_date < form.borrow_date) return 'Tanggal kembali harus setelah tanggal pinjam.';
    if (!form.purpose.trim()) return 'Keperluan/Tujuan wajib diisi.';
    if (form.purpose.trim().length < 10) return 'Keperluan/Tujuan minimal 10 karakter.';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      showToast(err, 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // Fetch default workflow
      const workflow = await getDefaultWorkflow();

      // Determine primary item_type from cart
      const primaryType = cart.some((c) => c.type === 'fasilitas') && !cart.some((c) => c.type === 'barang')
        ? 'fasilitas'
        : 'barang';

      // Insert into borrowings
      const borrowingPayload = {
        borrower_name: form.borrower_name.trim(),
        borrower_class: form.borrower_class.trim(),
        borrower_email: form.borrower_email.trim(),
        borrower_phone: form.borrower_phone.trim() || null,
        borrow_date: form.borrow_date,
        return_date: form.return_date,
        start_time: form.start_time,
        end_time: form.end_time,
        purpose: form.purpose.trim(),
        notes: form.notes.trim() || null,
        status: 'pending' as const,
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        item_type: primaryType,
        workflow_template_id: workflow?.id ?? null,
      };

      const { data: borrowingData, error: borrowingError } = await supabase
        .from('borrowings')
        .insert(borrowingPayload)
        .select('id')
        .single();

      if (borrowingError || !borrowingData) throw borrowingError || new Error('Gagal membuat peminjaman');
      const borrowingId = (borrowingData as any).id;

      // Insert each cart item into borrowing_items
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

      // Send email notification via edge function
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
        // Non-blocking: submission still succeeds
      }

      setSuccess({ id: borrowingId, name: form.borrower_name.trim() });
      showToast('Peminjaman berhasil diajukan!', 'success');
      setCart([]);
      setForm(initialForm);
    } catch (e) {
      console.error('Failed to submit borrowing:', e);
      showToast('Gagal mengajukan peminjaman. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-lg w-full rounded-2xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Peminjaman Berhasil Diajukan!</h2>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Halo <span className="font-semibold">{success.name}</span>, pengajuan peminjaman Anda telah berhasil dikirim.
              Tim akan meninjau dan menyetujui permintaan Anda. Anda akan menerima notifikasi via email.
            </p>
            <div className="mt-6 rounded-xl bg-slate-50 dark:bg-slate-700/30 p-4 text-left text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">ID Peminjaman</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">{success.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">Menunggu Persetujuan</span>
              </div>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              Buat Peminjaman Lain
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Ajukan Peminjaman</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Pilih barang atau fasilitas, isi data peminjam, lalu kirim pengajuan.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Selection panel */}
            <div className="lg:col-span-2 space-y-4">
              {/* Tabs */}
              <div className="flex gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setTab('barang')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    tab === 'barang'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                  )}
                >
                  <Package className="w-4 h-4" />
                  Barang
                </button>
                <button
                  type="button"
                  onClick={() => setTab('fasilitas')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    tab === 'fasilitas'
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tab === 'barang' ? 'Cari barang...' : 'Cari fasilitas...'}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Grid */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
                      <div className="h-32 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse mb-3" />
                      <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : tab === 'barang' ? (
                filteredInventory.length === 0 ? (
                  <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <EmptyState icon={Package} title="Tidak ada barang tersedia" description="Hanya barang dengan kondisi baik dan stok tersedia yang ditampilkan." />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredInventory.map((item) => {
                      const img = item.image_url || getFallbackImage(item.id);
                      return (
                        <div
                          key={item.id}
                          className="flex gap-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                        >
                          <img
                            src={img}
                            alt={item.name}
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0 bg-slate-100 dark:bg-slate-700"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).src = getFallbackImage(item.id); }}
                          />
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <h3 className="font-medium text-slate-900 dark:text-white line-clamp-1">{item.name}</h3>
                              {item.categories?.name && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.categories.name}</p>
                              )}
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                Tersedia: {item.available_quantity}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addToCart(item, 'barang')}
                              className="self-end inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Tambah
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : filteredFacilities.length === 0 ? (
                <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <EmptyState icon={Building2} title="Tidak ada fasilitas ditemukan" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredFacilities.map((f) => {
                    const img = f.image_url || getFallbackImage(f.id);
                    return (
                      <div
                        key={f.id}
                        className="flex gap-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                      >
                        <img
                          src={img}
                          alt={f.name}
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0 bg-slate-100 dark:bg-slate-700"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).src = getFallbackImage(f.id); }}
                        />
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h3 className="font-medium text-slate-900 dark:text-white line-clamp-1">{f.name}</h3>
                            {f.location && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{f.location}</p>
                            )}
                            {f.capacity != null && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kapasitas: {f.capacity} orang</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => addToCart(f, 'fasilitas')}
                            className="self-end inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Tambah
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Cart + form (sticky) */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-4">
                {/* Cart */}
                <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ShoppingCart className="w-5 h-5 text-blue-500" />
                    <h2 className="font-semibold text-slate-900 dark:text-white">Keranjang</h2>
                    {cart.length > 0 && (
                      <span className="ml-auto px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                        {cart.length} item
                      </span>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <div className="py-8 text-center">
                      <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">Keranjang kosong</p>
                      <p className="text-xs text-slate-400 mt-1">Pilih item dari panel kiri</p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {cart.map((c) => (
                        <li key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                          {c.type === 'fasilitas' ? (
                            <Building2 className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                          ) : (
                            <Package className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                            <p className="text-xs text-slate-400 capitalize">{c.type}</p>
                          </div>
                          {/* Quantity stepper */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateQty(c.id, -1)}
                              className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-slate-900 dark:text-white">{c.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(c.id, 1)}
                              className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(c.id)}
                            className="p-1 text-red-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Borrower form */}
                <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                  <h2 className="font-semibold text-slate-900 dark:text-white">Data Peminjam</h2>

                  <div>
                    <label className={labelClass}>
                      Nama Peminjam <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" value={form.borrower_name} onChange={(e) => update('borrower_name', e.target.value)} placeholder="Nama lengkap" className={cn(inputClass, 'pl-10')} required />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Kelas/Unit <span className="text-red-500">*</span>
                    </label>
                    <input type="text" value={form.borrower_class} onChange={(e) => update('borrower_class', e.target.value)} placeholder="Contoh: XII IPA 1" className={inputClass} required />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="email" value={form.borrower_email} onChange={(e) => update('borrower_email', e.target.value)} placeholder="email@sekolah.id" className={cn(inputClass, 'pl-10')} required />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>No. Telepon</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" value={form.borrower_phone} onChange={(e) => update('borrower_phone', e.target.value)} placeholder="08xxxxxxxxxx (opsional)" className={cn(inputClass, 'pl-10')} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>
                        Tgl Pinjam <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="date" value={form.borrow_date} onChange={(e) => update('borrow_date', e.target.value)} className={cn(inputClass, 'pl-10')} required />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>
                        Tgl Kembali <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="date" value={form.return_date} min={form.borrow_date} onChange={(e) => update('return_date', e.target.value)} className={cn(inputClass, 'pl-10')} required />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Waktu Mulai</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="time" value={form.start_time} onChange={(e) => update('start_time', e.target.value)} className={cn(inputClass, 'pl-10')} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Waktu Selesai</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="time" value={form.end_time} onChange={(e) => update('end_time', e.target.value)} className={cn(inputClass, 'pl-10')} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Keperluan/Tujuan <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <textarea
                        value={form.purpose}
                        onChange={(e) => update('purpose', e.target.value)}
                        placeholder="Jelaskan keperluan peminjaman (min. 10 karakter)..."
                        rows={3}
                        className={cn(inputClass, 'pl-10 resize-none')}
                        required
                      />
                    </div>
                    {form.purpose.length > 0 && form.purpose.length < 10 && (
                      <p className="text-xs text-amber-500 mt-1">Minimal 10 karakter ({form.purpose.length}/10)</p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Catatan Tambahan</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => update('notes', e.target.value)}
                      placeholder="Catatan tambahan (opsional)..."
                      rows={2}
                      className={cn(inputClass, 'resize-none')}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || cart.length === 0}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

                  {cart.length === 0 && (
                    <p className="text-xs text-center text-slate-400 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Pilih minimal satu item untuk mengajukan
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
