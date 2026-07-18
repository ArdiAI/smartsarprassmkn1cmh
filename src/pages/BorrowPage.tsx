import { useEffect, useMemo, useState, FormEvent } from 'react';
import {
  ClipboardList, Search, Plus, Minus, X, Loader2, Send, CheckCircle, Package, Building2,
  Calendar, Clock, Mail, Phone, User, FileText, RotateCcw, ShoppingCart,
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
  quantity: number;
  available_quantity: number;
  condition: 'good' | 'fair' | 'poor';
  location: string | null;
  categories: { name: string } | null;
}

interface Facility {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  facility_type: string | null;
}

interface CartEntry {
  key: string;
  itemId: string;
  name: string;
  max: number;
  quantity: number;
  itemType: 'barang' | 'fasilitas';
}

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all';
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export default function BorrowPage() {
  const [tab, setTab] = useState<'barang' | 'fasilitas'>('barang');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartEntry[]>([]);

  const [form, setForm] = useState({
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
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ id: string; name: string; email: string; items: CartEntry[] } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [invRes, facRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('id, code, name, quantity, available_quantity, condition, location, categories!category_id(name)')
            .order('name', { ascending: true }),
          supabase
            .from('facilities')
            .select('id, name, description, location, capacity, facility_type')
            .order('name', { ascending: true }),
        ]);
        // Only items with available_quantity > 0 and condition 'good'
        const inv = ((invRes.data as unknown as InventoryItem[]) ?? []).filter(
          (it) => it.available_quantity > 0 && it.condition === 'good',
        );
        setInventory(inv);
        setFacilities((facRes.data as unknown as Facility[]) ?? []);
      } catch (e) {
        console.error('Failed to fetch borrow data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (tab === 'barang') {
      return inventory.filter(
        (it) => !q || it.name.toLowerCase().includes(q) || it.code.toLowerCase().includes(q),
      );
    }
    return facilities.filter(
      (f) => !q || f.name.toLowerCase().includes(q) || (f.description || '').toLowerCase().includes(q),
    );
  }, [inventory, facilities, search, tab]);

  const addToCart = (item: InventoryItem | Facility, itemType: 'barang' | 'fasilitas') => {
    const key = `${itemType}-${item.id}`;
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        return prev.map((c) => (c.key === key ? { ...c, quantity: c.quantity + 1 } : c));
      }
      const max = itemType === 'barang' ? (item as InventoryItem).available_quantity : 1;
      return [
        ...prev,
        {
          key,
          itemId: item.id,
          name: item.name,
          max,
          quantity: 1,
          itemType,
        },
      ];
    });
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c;
        const next = c.quantity + delta;
        return { ...c, quantity: Math.max(1, Math.min(c.max, next)) };
      }),
    );
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  };

  const validate = (): string | null => {
    if (cart.length === 0) return 'Keranjang masih kosong. Pilih minimal satu item.';
    if (!form.borrower_name.trim()) return 'Nama peminjam wajib diisi.';
    if (!form.borrower_class.trim()) return 'Kelas/Unit wajib diisi.';
    if (!form.borrower_email.trim()) return 'Email wajib diisi.';
    if (!form.borrow_date) return 'Tanggal pinjam wajib diisi.';
    if (!form.return_date) return 'Tanggal kembali wajib diisi.';
    if (form.return_date < form.borrow_date) return 'Tanggal kembali harus setelah tanggal pinjam.';
    if (!form.purpose.trim() || form.purpose.trim().length < 10) return 'Keperluan minimal 10 karakter.';
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

      // Determine primary item_type from cart (first item)
      const primaryType = cart[0].itemType;

      // Insert borrowing
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
        item_type: primaryType,
        workflow_template_id: workflow?.id ?? null,
      };

      const { data: borrowingData, error: borrowingError } = await supabase
        .from('borrowings')
        .insert(borrowingPayload)
        .select('id')
        .single();

      if (borrowingError) throw borrowingError;
      const borrowingId = (borrowingData as unknown as { id: string }).id;

      // Insert borrowing_items
      const itemsPayload = cart.map((c) => ({
        borrowing_id: borrowingId,
        inventory_id: c.itemType === 'barang' ? c.itemId : null,
        facility_id: c.itemType === 'fasilitas' ? c.itemId : null,
        item_type: c.itemType,
        item_name: c.name,
        quantity: c.quantity,
        status: 'pending',
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        workflow_template_id: workflow?.id ?? null,
      }));

      const { error: itemsError } = await supabase.from('borrowing_items').insert(itemsPayload);
      if (itemsError) throw itemsError;

      // Send email notification
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
        console.error('Email notification failed:', emailErr);
      }

      setSuccess({
        id: borrowingId,
        name: form.borrower_name.trim(),
        email: form.borrower_email.trim(),
        items: cart,
      });
      showToast('Pengajuan peminjaman berhasil dikirim', 'success');

      // Reset
      setCart([]);
      setForm({
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
      });
    } catch (err) {
      console.error('Submit failed:', err);
      showToast('Gagal mengajukan peminjaman. Coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetSuccess = () => {
    setSuccess(null);
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pengajuan Berhasil!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Pengajuan peminjaman Anda telah dikirim dan menunggu persetujuan.
            </p>

            <div className="text-left bg-slate-50 dark:bg-slate-700/40 rounded-xl p-5 mb-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Nama</span><span className="font-medium text-slate-700 dark:text-slate-200">{success.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium text-slate-700 dark:text-slate-200">{success.email}</span></div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
                <p className="text-slate-500 mb-2">Item Dipinjam:</p>
                {success.items.map((it) => (
                  <div key={it.key} className="flex justify-between py-1">
                    <span className="text-slate-700 dark:text-slate-200">{it.name}</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">{it.quantity} unit</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={resetSuccess}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Buat Pengajuan Lain
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-500" /> Ajukan Peminjaman
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pilih barang atau fasilitas, isi data, lalu kirim pengajuan.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Selection */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-2 mb-4 bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1 w-full sm:w-80">
              <button
                onClick={() => { setTab('barang'); setSearch(''); }}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5',
                  tab === 'barang' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500',
                )}
              >
                <Package className="w-4 h-4" /> Barang
              </button>
              <button
                onClick={() => { setTab('fasilitas'); setSearch(''); }}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5',
                  tab === 'fasilitas' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500',
                )}
              >
                <Building2 className="w-4 h-4" /> Fasilitas
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === 'barang' ? 'Cari barang...' : 'Cari fasilitas...'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm animate-pulse">
                    <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                    <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <EmptyState icon={tab === 'barang' ? Package : Building2} title="Tidak ada item tersedia" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredItems.map((item) => {
                  const isFac = tab === 'fasilitas';
                  const id = item.id;
                  const name = item.name;
                  const max = isFac ? 1 : (item as InventoryItem).available_quantity;
                  const inCart = cart.find((c) => c.key === `${tab}-${id}`);
                  return (
                    <div
                      key={id}
                      className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">{name}</h3>
                        {!isFac && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Tersedia: <span className="font-semibold text-emerald-500">{(item as InventoryItem).available_quantity}</span>
                            {(item as InventoryItem).categories?.name && (
                              <span className="ml-2">• {(item as InventoryItem).categories!.name}</span>
                            )}
                          </p>
                        )}
                        {isFac && (item as Facility).location && (
                          <p className="text-xs text-slate-400 mt-0.5">{(item as Facility).location}</p>
                        )}
                        {inCart && (
                          <span className="inline-block mt-1 text-xs font-medium text-blue-500">
                            Di keranjang: {inCart.quantity}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(item as InventoryItem | Facility, tab)}
                        disabled={isFac && !!inCart}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4" /> Tambah
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Cart + Form */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-20 space-y-4">
              {/* Cart */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-500" /> Keranjang
                  </h2>
                  <span className="text-xs text-slate-400">{cart.length} item</span>
                </div>

                {cart.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Keranjang kosong</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {cart.map((c) => (
                      <div key={c.key} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/40">
                        {c.itemType === 'fasilitas' ? (
                          <Building2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        ) : (
                          <Package className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{c.name}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQty(c.key, -1)}
                            className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:text-blue-500"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-semibold w-6 text-center text-slate-700 dark:text-slate-200">{c.quantity}</span>
                          <button
                            onClick={() => updateQty(c.key, 1)}
                            disabled={c.quantity >= c.max}
                            className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:text-blue-500 disabled:opacity-30"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeFromCart(c.key)}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Borrower form */}
              <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <h2 className="font-bold text-slate-900 dark:text-white">Data Peminjam</h2>

                <div>
                  <label className={labelClass}>Nama Peminjam <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" required value={form.borrower_name} onChange={(e) => setForm({ ...form, borrower_name: e.target.value })} placeholder="Nama lengkap" className={cn(inputClass, 'pl-10')} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Kelas/Unit <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.borrower_class} onChange={(e) => setForm({ ...form, borrower_class: e.target.value })} placeholder="Contoh: XII IPA 1" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" required value={form.borrower_email} onChange={(e) => setForm({ ...form, borrower_email: e.target.value })} placeholder="email@example.com" className={cn(inputClass, 'pl-10')} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>No. Telepon</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={form.borrower_phone} onChange={(e) => setForm({ ...form, borrower_phone: e.target.value })} placeholder="08xxxxxxxxxx (opsional)" className={cn(inputClass, 'pl-10')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Tanggal Pinjam <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="date" required value={form.borrow_date} onChange={(e) => setForm({ ...form, borrow_date: e.target.value })} className={cn(inputClass, 'pl-10')} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Tanggal Kembali <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="date" required min={form.borrow_date} value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} className={cn(inputClass, 'pl-10')} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Waktu Mulai</label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={cn(inputClass, 'pl-10')} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Waktu Selesai</label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={cn(inputClass, 'pl-10')} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Keperluan/Tujuan <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <textarea required minLength={10} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Minimal 10 karakter" rows={3} className={cn(inputClass, 'pl-10 resize-none')} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Catatan Tambahan</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Opsional" rows={2} className={cn(inputClass, 'resize-none')} />
                </div>

                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
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
