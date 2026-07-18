import { useEffect, useState, useMemo } from 'react';
import {
  Package,
  Building2,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Send,
  CheckCircle2,
  RotateCcw,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
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
  quantity: number;
  available_quantity: number | null;
  condition: 'good' | 'fair' | 'poor';
  location: string | null;
  image_url: string | null;
  categories: { name: string } | null;
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
  const [activeTab, setActiveTab] = useState<'barang' | 'fasilitas'>('barang');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState<BorrowerForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ id: string; name: string; email: string } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [invResult, facResult] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)')
            .order('name', { ascending: true }),
          supabase.from('facilities').select('*').order('name', { ascending: true }),
        ]);

        if (invResult.error) throw invResult.error;
        setInventory((invResult.data as unknown as InventoryItem[]) || []);

        if (facResult.error) throw facResult.error;
        setFacilities((facResult.data as unknown as Facility[]) || []);
      } catch (err) {
        console.error('Error fetching borrow data:', err);
        showToast('Gagal memuat data. Silakan refresh halaman.', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Only show available good-condition inventory
  const availableInventory = useMemo(() => {
    return inventory.filter(
      (i) => (i.available_quantity ?? 0) > 0 && i.condition === 'good',
    );
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    if (!search.trim()) return availableInventory;
    const q = search.toLowerCase();
    return availableInventory.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.code?.toLowerCase().includes(q) ||
        i.categories?.name?.toLowerCase().includes(q),
    );
  }, [availableInventory, search]);

  const filteredFacilities = useMemo(() => {
    if (!search.trim()) return facilities;
    const q = search.toLowerCase();
    return facilities.filter(
      (f) =>
        f.name?.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q) ||
        f.location?.toLowerCase().includes(q),
    );
  }, [facilities, search]);

  const addToCart = (item: InventoryItem | Facility, type: 'barang' | 'fasilitas') => {
    const name = type === 'barang' ? (item as InventoryItem).name : (item as Facility).name;
    const maxQuantity =
      type === 'barang'
        ? (item as InventoryItem).available_quantity ?? (item as InventoryItem).quantity
        : 1;

    const existing = cart.find((c) => c.id === item.id && c.type === type);
    if (existing) {
      if (existing.quantity < maxQuantity) {
        setCart(cart.map((c) => (c.id === item.id && c.type === type ? { ...c, quantity: c.quantity + 1 } : c)));
        showToast(`Jumlah ${name} ditambah`, 'info');
      } else {
        showToast('Jumlah maksimum tercapai', 'warning');
      }
    } else {
      setCart([...cart, { id: item.id, type, name, quantity: 1, maxQuantity }]);
      showToast(`${name} ditambahkan ke keranjang`, 'success');
    }
  };

  const updateQuantity = (id: string, type: 'barang' | 'fasilitas', delta: number) => {
    setCart(
      cart.map((c) => {
        if (c.id === id && c.type === type) {
          const newQty = c.quantity + delta;
          if (newQty < 1) return c;
          if (newQty > c.maxQuantity) {
            showToast('Jumlah maksimum tercapai', 'warning');
            return c;
          }
          return { ...c, quantity: newQty };
        }
        return c;
      }),
    );
  };

  const removeFromCart = (id: string, type: 'barang' | 'fasilitas') => {
    setCart(cart.filter((c) => !(c.id === id && c.type === type)));
    showToast('Item dihapus dari keranjang', 'info');
  };

  const validateForm = (): string | null => {
    if (cart.length === 0) return 'Keranjang masih kosong. Tambahkan minimal satu item.';
    if (!form.borrower_name.trim()) return 'Nama peminjam wajib diisi';
    if (!form.borrower_class.trim()) return 'Kelas/Unit wajib diisi';
    if (!form.borrower_email.trim()) return 'Email wajib diisi';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.borrower_email)) return 'Format email tidak valid';
    if (!form.borrow_date) return 'Tanggal pinjam wajib diisi';
    if (!form.return_date) return 'Tanggal kembali wajib diisi';
    if (form.return_date < form.borrow_date) return 'Tanggal kembali harus setelah tanggal pinjam';
    if (!form.purpose.trim()) return 'Keperluan/Tujuan wajib diisi';
    if (form.purpose.trim().length < 10) return 'Keperluan/Tujuan minimal 10 karakter';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      showToast(error, 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Fetch default workflow
      const workflow = await getDefaultWorkflow();

      // 2. Determine primary item_type from cart
      const primaryType = cart.some((c) => c.type === 'fasilitas') && !cart.some((c) => c.type === 'barang')
        ? 'fasilitas'
        : 'barang';

      // 3. Insert into borrowings
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
        .select()
        .single();

      if (borrowingError) throw borrowingError;

      const borrowingId = (borrowingData as any).id as string;

      // 4. Insert borrowing_items for each cart item
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
        // Non-blocking; submission still succeeds
      }

      // 6. Success state
      setSuccess({
        id: borrowingId,
        name: form.borrower_name.trim(),
        email: form.borrower_email.trim(),
      });
      showToast('Peminjaman berhasil diajukan!', 'success');
    } catch (err) {
      console.error('Error submitting borrowing:', err);
      showToast('Gagal mengajukan peminjaman. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setCart([]);
    setForm(emptyForm);
    setSuccess(null);
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Peminjaman Berhasil Diajukan!</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Permohonan peminjaman Anda telah dikirim dan menunggu persetujuan.
            </p>

            <div className="mt-6 space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">ID Peminjaman</span>
                <span className="font-mono text-xs text-slate-900 dark:text-white">{success.id.slice(0, 8)}…</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Peminjam</span>
                <span className="font-medium text-slate-900 dark:text-white">{success.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Email</span>
                <span className="font-medium text-slate-900 dark:text-white">{success.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  Menunggu Persetujuan
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Total Item</span>
                <span className="font-medium text-slate-900 dark:text-white">{cart.length} item</span>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-left">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Catatan:</strong> Anda akan menerima notifikasi via email setelah peminjaman disetujui atau ditolak.
                Cek status peminjaman Anda di halaman Riwayat.
              </p>
            </div>

            <button
              onClick={resetAll}
              className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              Ajukan Peminjaman Lain
            </button>
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Ajukan Peminjaman</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Pilih barang atau fasilitas, isi data peminjam, lalu kirim pengajuan.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setActiveTab('barang')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
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
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'barang' ? 'Cari barang...' : 'Cari fasilitas...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 animate-pulse">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : activeTab === 'barang' ? (
              filteredInventory.length === 0 ? (
                <EmptyState icon={Package} title="Tidak ada barang tersedia" description="Belum ada barang yang bisa dipinjam." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredInventory.map((item) => {
                    const available = item.available_quantity ?? item.quantity;
                    const inCart = cart.find((c) => c.id === item.id && c.type === 'barang');
                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <Package className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{item.name}</h3>
                            {item.categories?.name && (
                              <p className="text-xs text-blue-600 dark:text-blue-400">{item.categories.name}</p>
                            )}
                            {item.location && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.location}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            Tersedia: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{available}</span>
                          </span>
                          <button
                            onClick={() => addToCart(item, 'barang')}
                            disabled={inCart != null}
                            className={cn(
                              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                              inCart
                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 cursor-default'
                                : 'bg-blue-600 hover:bg-blue-700 text-white',
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
              <EmptyState icon={Building2} title="Tidak ada fasilitas tersedia" description="Belum ada fasilitas yang bisa dipinjam." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredFacilities.map((fac) => {
                  const inCart = cart.find((c) => c.id === fac.id && c.type === 'fasilitas');
                  return (
                    <div
                      key={fac.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{fac.name}</h3>
                          {fac.location && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{fac.location}</p>
                          )}
                          {fac.capacity != null && (
                            <p className="text-xs text-slate-400 dark:text-slate-500">Kapasitas: {fac.capacity} orang</p>
                          )}
                        </div>
                      </div>
                      {fac.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{fac.description}</p>
                      )}
                      <button
                        onClick={() => addToCart(fac, 'fasilitas')}
                        disabled={inCart != null}
                        className={cn(
                          'w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                          inCart
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 cursor-default'
                            : 'bg-blue-600 hover:bg-blue-700 text-white',
                        )}
                      >
                        {inCart ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {inCart ? 'Dipilih' : 'Tambah'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Cart + Form */}
          <div className="lg:col-span-1">
            <form onSubmit={handleSubmit} className="sticky top-20 space-y-4">
              {/* Cart */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">Keranjang</h3>
                  {cart.length > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-medium">
                      {cart.length} item
                    </span>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Keranjang kosong</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Pilih item dari panel kiri</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {cart.map((c) => (
                      <div key={`${c.type}-${c.id}`} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                        <div className="flex-shrink-0">
                          {c.type === 'fasilitas' ? (
                            <Building2 className="w-4 h-4 text-indigo-500" />
                          ) : (
                            <Package className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{c.type}</p>
                        </div>
                        {/* Quantity stepper */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQuantity(c.id, c.type, -1)}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-500 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{c.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(c.id, c.type, 1)}
                            disabled={c.quantity >= c.maxQuantity}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(c.id, c.type)}
                          className="flex-shrink-0 p-1 text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Borrower Form */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Data Peminjam</h3>

                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Nama Peminjam <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.borrower_name}
                      onChange={(e) => setForm({ ...form, borrower_name: e.target.value })}
                      placeholder="Nama lengkap"
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Class */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Kelas/Unit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.borrower_class}
                    onChange={(e) => setForm({ ...form, borrower_class: e.target.value })}
                    placeholder="Contoh: Kelas 10A"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={form.borrower_email}
                      onChange={(e) => setForm({ ...form, borrower_email: e.target.value })}
                      placeholder="email@contoh.com"
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    No. Telepon <span className="text-slate-400">(opsional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.borrower_phone}
                      onChange={(e) => setForm({ ...form, borrower_phone: e.target.value })}
                      placeholder="08xxxxxxxxxx"
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Tgl Pinjam <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={form.borrow_date}
                        onChange={(e) => setForm({ ...form, borrow_date: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Tgl Kembali <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={form.return_date}
                        min={form.borrow_date}
                        onChange={(e) => setForm({ ...form, return_date: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Waktu Mulai
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="time"
                        value={form.start_time}
                        onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Waktu Selesai
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="time"
                        value={form.end_time}
                        onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Keperluan/Tujuan <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <textarea
                      value={form.purpose}
                      onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                      placeholder="Jelaskan keperluan peminjaman (min. 10 karakter)..."
                      rows={3}
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    />
                  </div>
                  {form.purpose.length > 0 && form.purpose.length < 10 && (
                    <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Minimal 10 karakter ({form.purpose.length}/10)
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Catatan Tambahan <span className="text-slate-400">(opsional)</span>
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Catatan tambahan..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Ajukan Peminjaman
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
