import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Package,
  Building2,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  FileText,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Boxes,
  X,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { getDefaultWorkflow } from '../lib/workflow';
import { showToast } from '../components/Toast';
import { cn } from '../utils/cn';

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category_id: string;
  quantity: number;
  available_quantity: number;
  condition: 'good' | 'fair' | 'poor';
  location: string;
  image_url: string;
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
}

interface CartItem {
  id: string;
  type: 'barang' | 'fasilitas';
  name: string;
  maxQty: number;
  qty: number;
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

const FALLBACK_IMG = 'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=400';
const FALLBACK_FACILITY_IMG = 'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=400';

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
  const [success, setSuccess] = useState<{ id: string; name: string; email: string; items: CartItem[] } | null>(null);

  useEffect(() => {
    (async () => {
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
            .select('*')
            .order('name', { ascending: true }),
        ]);

        setInventory((invRes.data as unknown as InventoryItem[]) || []);
        setFacilities((facRes.data as unknown as Facility[]) || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredInventory = useMemo(() => {
    if (!search.trim()) return inventory;
    const q = search.toLowerCase();
    return inventory.filter(
      (i) => i.name?.toLowerCase().includes(q) || i.code?.toLowerCase().includes(q) || i.location?.toLowerCase().includes(q)
    );
  }, [inventory, search]);

  const filteredFacilities = useMemo(() => {
    if (!search.trim()) return facilities;
    const q = search.toLowerCase();
    return facilities.filter(
      (f) => f.name?.toLowerCase().includes(q) || f.location?.toLowerCase().includes(q) || f.facility_type?.toLowerCase().includes(q)
    );
  }, [facilities, search]);

  const addToCart = (item: Omit<CartItem, 'qty'>) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id && c.type === item.type);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id && c.type === item.type
            ? { ...c, qty: Math.min(c.qty + 1, c.maxQty) }
            : c
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id: string, type: string) => {
    setCart((prev) => prev.filter((c) => !(c.id === id && c.type === type)));
  };

  const updateQty = (id: string, type: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.id === id && c.type === type) {
          const newQty = Math.max(1, Math.min(c.qty + delta, c.maxQty));
          return { ...c, qty: newQty };
        }
        return c;
      })
    );
  };

  const cartCount = cart.length;

  const validateForm = (): string | null => {
    if (!form.borrower_name.trim()) return 'Nama peminjam wajib diisi';
    if (!form.borrower_class.trim()) return 'Kelas/Unit wajib diisi';
    if (!form.borrower_email.trim()) return 'Email wajib diisi';
    if (!/^\S+@\S+\.\S+$/.test(form.borrower_email)) return 'Format email tidak valid';
    if (!form.borrow_date) return 'Tanggal pinjam wajib diisi';
    if (!form.return_date) return 'Tanggal kembali wajib diisi';
    if (form.return_date < form.borrow_date) return 'Tanggal kembali harus setelah tanggal pinjam';
    if (!form.purpose.trim()) return 'Keperluan wajib diisi';
    if (form.purpose.trim().length < 10) return 'Keperluan minimal 10 karakter';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      showToast('Keranjang masih kosong. Pilih minimal 1 item.', 'warning');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      showToast(validationError, 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Fetch default workflow
      const workflow = await getDefaultWorkflow();

      // 2. Determine item_type from cart
      const itemType = cart.some((c) => c.type === 'fasilitas') && !cart.some((c) => c.type === 'barang')
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
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        purpose: form.purpose.trim(),
        notes: form.notes.trim() || null,
        status: 'pending',
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
      const borrowingId = (borrowingData as unknown as { id: string }).id;

      // 4. Insert borrowing_items
      const itemPayloads = cart.map((c) => ({
        borrowing_id: borrowingId,
        inventory_id: c.type === 'barang' ? c.id : null,
        facility_id: c.type === 'fasilitas' ? c.id : null,
        item_type: c.type,
        item_name: c.name,
        quantity: c.qty,
        status: 'pending',
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        workflow_template_id: workflow?.id || null,
      }));

      const { error: itemsError } = await supabase
        .from('borrowing_items')
        .insert(itemPayloads);

      if (itemsError) throw itemsError;

      // 5. Send email notification
      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v2/send-borrowing-email`;
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_request',
            borrowing_id: borrowingId,
            borrower_name: form.borrower_name.trim(),
            borrower_email: form.borrower_email.trim(),
          }),
        });
      } catch {
        // Email is best-effort; don't fail the submission
      }

      // 6. Success state
      setSuccess({
        id: borrowingId,
        name: form.borrower_name.trim(),
        email: form.borrower_email.trim(),
        items: [...cart],
      });
      setCart([]);
      setForm(emptyForm);
      showToast('Peminjaman berhasil diajukan!', 'success');
    } catch {
      showToast('Gagal mengajukan peminjaman. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccess(null);
  };

  const inputClass = 'w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Peminjaman Berhasil Diajukan!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Pengajuan peminjaman Anda telah berhasil dikirim dan sedang menunggu persetujuan.
            </p>

            <div className="text-left bg-slate-50 dark:bg-slate-700/30 rounded-2xl p-5 mb-6 space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Peminjam</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{success.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{success.email}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-2">Item Dipinjam</p>
                <div className="space-y-1.5">
                  {success.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        {item.type === 'fasilitas' ? (
                          <Building2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        ) : (
                          <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                        <span className="text-sm text-slate-700 dark:text-slate-300">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">×{item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Kembali ke Peminjaman
            </button>
          </div>
        </div>
        <div className="mt-auto">
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Ajukan Peminjaman</h1>
          <p className="text-slate-500 dark:text-slate-400">Pilih barang atau fasilitas yang ingin Anda pinjam</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-200 dark:bg-slate-700/50 rounded-xl">
              <button
                onClick={() => setTab('barang')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                  tab === 'barang'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                <Package className="w-4 h-4" />
                Barang
              </button>
              <button
                onClick={() => setTab('fasilitas')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                  tab === 'fasilitas'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
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
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-3" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : tab === 'barang' ? (
              filteredInventory.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <EmptyState icon={Package} title="Tidak ada barang tersedia" description="Belum ada barang yang bisa dipinjam" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredInventory.map((item) => {
                    const inCart = cart.find((c) => c.id === item.id && c.type === 'barang');
                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm"
                      >
                        <div className="h-24 bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <img
                            src={item.image_url || FALLBACK_IMG}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                          />
                        </div>
                        <div className="p-3">
                          <h3 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">{item.name}</h3>
                          {item.categories?.name && (
                            <p className="text-xs text-slate-400 mb-1">{item.categories.name}</p>
                          )}
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-2">
                            <Boxes className="w-3 h-3" />
                            {item.available_quantity} tersedia
                          </div>
                          <button
                            onClick={() => addToCart({ id: item.id, type: 'barang', name: item.name, maxQty: item.available_quantity })}
                            disabled={!!inCart}
                            className={cn(
                              'w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                              inCart
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 cursor-default'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            )}
                          >
                            {inCart ? (
                              <><CheckCircle2 className="w-3.5 h-3.5" /> Dipilih</>
                            ) : (
                              <><Plus className="w-3.5 h-3.5" /> Tambah</>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredFacilities.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <EmptyState icon={Building2} title="Tidak ada fasilitas tersedia" description="Belum ada fasilitas yang bisa dipinjam" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredFacilities.map((f) => {
                  const inCart = cart.find((c) => c.id === f.id && c.type === 'fasilitas');
                  return (
                    <div
                      key={f.id}
                      className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm flex"
                    >
                      <div className="w-24 h-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                        <img
                          src={f.image_url || FALLBACK_FACILITY_IMG}
                          alt={f.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_FACILITY_IMG; }}
                        />
                      </div>
                      <div className="p-3 flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">{f.name}</h3>
                        {f.location && (
                          <p className="text-xs text-slate-400 mb-2 truncate">{f.location}</p>
                        )}
                        <button
                          onClick={() => addToCart({ id: f.id, type: 'fasilitas', name: f.name, maxQty: 1 })}
                          disabled={!!inCart}
                          className={cn(
                            'w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                            inCart
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 cursor-default'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          )}
                        >
                          {inCart ? (
                            <><CheckCircle2 className="w-3.5 h-3.5" /> Dipilih</>
                          ) : (
                            <><Plus className="w-3.5 h-3.5" /> Tambah</>
                          )}
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
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-slate-900 dark:text-white">Keranjang</h3>
                    {cartCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {cartCount}
                      </span>
                    )}
                  </div>
                </div>

                {cart.length === 0 ? (
                  <div className="p-6 text-center">
                    <ShoppingCart className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Keranjang kosong</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                    {cart.map((c) => (
                      <div key={`${c.type}-${c.id}`} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                        {c.type === 'fasilitas' ? (
                          <Building2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                        ) : (
                          <Package className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{c.name}</p>
                        </div>
                        {/* Stepper */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQty(c.id, c.type, -1)}
                            className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 flex items-center justify-center text-slate-600 dark:text-slate-300"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-slate-700 dark:text-slate-300">{c.qty}</span>
                          <button
                            onClick={() => updateQty(c.id, c.type, 1)}
                            disabled={c.qty >= c.maxQty}
                            className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-600 dark:text-slate-300"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(c.id, c.type)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Borrower Form */}
              <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Data Peminjam</h3>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nama Peminjam <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={form.borrower_name} onChange={(e) => setForm({ ...form, borrower_name: e.target.value })} placeholder="Nama lengkap" className={inputClass} required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Kelas/Unit <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={form.borrower_class} onChange={(e) => setForm({ ...form, borrower_class: e.target.value })} placeholder="Contoh: XII IPA 1" className={inputClass} required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" value={form.borrower_email} onChange={(e) => setForm({ ...form, borrower_email: e.target.value })} placeholder="email@sekolah.sch.id" className={inputClass} required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">No. Telepon <span className="text-slate-400">(opsional)</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={form.borrower_phone} onChange={(e) => setForm({ ...form, borrower_phone: e.target.value })} placeholder="08xxxxxxxxxx" className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tgl Pinjam <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="date" value={form.borrow_date} onChange={(e) => setForm({ ...form, borrow_date: e.target.value })} className={inputClass} required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tgl Kembali <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="date" value={form.return_date} min={form.borrow_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} className={inputClass} required />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Waktu Mulai</label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Waktu Selesai</label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Keperluan/Tujuan <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Jelaskan keperluan (min 10 karakter)" rows={3} className={inputClass} required minLength={10} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Catatan Tambahan <span className="text-slate-400">(opsional)</span></label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Catatan tambahan" rows={2} className={inputClass} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Ajukan Peminjaman
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}
