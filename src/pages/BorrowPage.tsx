import { useEffect, useState, FormEvent } from 'react';
import {
  ClipboardList,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Loader2,
  CheckCircle,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  FileText,
  Building2,
  Boxes,
  Send,
  Package,
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
  condition: 'good' | 'fair' | 'poor' | null;
  location: string | null;
  image_url: string | null;
  available_quantity: number | null;
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

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/270557/pexels-photo-270557.jpeg?auto=compress&cs=tinysrgb&w=800';
const FALLBACK_FACILITY_IMAGE = 'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=800';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

const initialForm: BorrowerForm = {
  borrower_name: '',
  borrower_class: '',
  borrower_email: '',
  borrower_phone: '',
  borrow_date: todayISO(),
  return_date: '',
  start_time: '08:00',
  end_time: '16:00',
  purpose: '',
  notes: '',
};

const inputClass =
  'w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all';

const bareInputClass =
  'w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all';

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
    (async () => {
      try {
        const [invRes, facRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)')
            .order('name', { ascending: true }),
          supabase.from('facilities').select('*').order('name', { ascending: true }),
        ]);
        setInventory((invRes.data as unknown as InventoryItem[]) || []);
        setFacilities((facRes.data as unknown as Facility[]) || []);
      } catch (e) {
        console.error('Failed to load borrow data:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Only show available good-condition inventory
  const availableInventory = inventory.filter(
    (it) => (it.available_quantity ?? 0) > 0 && it.condition === 'good',
  );

  const filteredInventory = availableInventory.filter((it) =>
    it.name.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredFacilities = facilities.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.location ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const addToCart = (item: InventoryItem | Facility, type: 'barang' | 'fasilitas') => {
    const id = type === 'barang' ? (item as InventoryItem).id : (item as Facility).id;
    const name = item.name;
    const maxQuantity = type === 'barang' ? (item as InventoryItem).available_quantity ?? 1 : 1;
    setCart((prev) => {
      if (prev.some((c) => c.id === id && c.type === type)) return prev;
      return [...prev, { id, type, name, quantity: 1, maxQuantity }];
    });
    showToast(`${name} ditambahkan ke keranjang`, 'success');
  };

  const updateQty = (id: string, type: 'barang' | 'fasilitas', delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.id === id && c.type === type) {
          const next = Math.max(1, Math.min(c.maxQuantity, c.quantity + delta));
          return { ...c, quantity: next };
        }
        return c;
      }),
    );
  };

  const removeFromCart = (id: string, type: 'barang' | 'fasilitas') => {
    setCart((prev) => prev.filter((c) => !(c.id === id && c.type === type)));
  };

  const validate = (): string | null => {
    if (cart.length === 0) return 'Keranjang masih kosong. Tambahkan minimal satu item.';
    if (!form.borrower_name.trim()) return 'Nama peminjam wajib diisi.';
    if (!form.borrower_class.trim()) return 'Kelas/Unit wajib diisi.';
    if (!form.borrower_email.trim()) return 'Email wajib diisi.';
    if (!form.borrow_date) return 'Tanggal pinjam wajib diisi.';
    if (!form.return_date) return 'Tanggal kembali wajib diisi.';
    if (form.return_date < form.borrow_date) return 'Tanggal kembali harus setelah tanggal pinjam.';
    if (form.purpose.trim().length < 10) return 'Keperluan minimal 10 karakter.';
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
      // 1. Fetch default workflow
      const workflow = await getDefaultWorkflow();

      // 2. Determine item_type (prefer the first cart item's type)
      const itemType = cart[0].type; // 'barang' or 'fasilitas'

      // 3. Insert borrowing
      const borrowingPayload = {
        borrower_name: form.borrower_name,
        borrower_class: form.borrower_class,
        borrower_email: form.borrower_email,
        borrower_phone: form.borrower_phone || null,
        borrow_date: form.borrow_date,
        return_date: form.return_date,
        start_time: form.start_time,
        end_time: form.end_time,
        purpose: form.purpose,
        notes: form.notes || null,
        status: 'pending',
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        item_type: itemType,
        workflow_template_id: workflow?.id ?? null,
      };
      const { data: borrowing, error: bErr } = await supabase
        .from('borrowings')
        .insert(borrowingPayload)
        .select()
        .single();
      if (bErr) throw bErr;

      const borrowingId = (borrowing as any).id;

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
      const { error: itemsErr } = await supabase.from('borrowing_items').insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      // 5. Send email notification
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
        console.error('Email notification failed:', emailErr);
      }

      // 6. Success state
      setSuccess({ id: borrowingId, name: form.borrower_name });
      showToast('Pengajuan peminjaman berhasil dikirim!', 'success');
      setCart([]);
      setForm(initialForm);
    } catch (err) {
      console.error('Submit error:', err);
      showToast('Gagal mengajukan peminjaman. Silakan coba lagi.', 'error');
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
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pengajuan Berhasil!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Pengajuan peminjaman oleh <span className="font-medium text-slate-900 dark:text-white">{success.name}</span> telah dikirim dan sedang menunggu persetujuan.
            </p>
            <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-5 text-left text-sm space-y-2 mb-6">
              <div className="flex justify-between"><span className="text-slate-500">ID Peminjaman</span><span className="font-mono text-slate-900 dark:text-white text-xs">{success.id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="font-medium text-amber-600 dark:text-amber-400">Menunggu Persetujuan</span></div>
            </div>
            <button
              onClick={resetSuccess}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> Buat Peminjaman Lain
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-blue-500" /> Ajukan Peminjaman
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Pilih barang atau fasilitas, lalu isi data peminjam.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: selection */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-2 mb-4 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-full sm:w-auto">
              <button
                onClick={() => setTab('barang')}
                className={cn(
                  'flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  tab === 'barang' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500',
                )}
              >
                <Boxes className="w-4 h-4" /> Barang
              </button>
              <button
                onClick={() => setTab('fasilitas')}
                className={cn(
                  'flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  tab === 'fasilitas' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500',
                )}
              >
                <Building2 className="w-4 h-4" /> Fasilitas
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === 'barang' ? 'Cari barang...' : 'Cari fasilitas...'}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                    <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-3" />
                    <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : tab === 'barang' ? (
              filteredInventory.length === 0 ? (
                <EmptyState icon={Boxes} title="Tidak ada barang tersedia" description="Semua barang sedang dipinjam atau tidak layak." />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredInventory.map((it) => {
                    const inCart = cart.some((c) => c.id === it.id && c.type === 'barang');
                    return (
                      <div key={it.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <div className="h-24 bg-slate-200 dark:bg-slate-700">
                          <img src={it.image_url || FALLBACK_IMAGE} alt={it.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="p-3">
                          <h3 className="font-medium text-sm text-slate-900 dark:text-white line-clamp-2">{it.name}</h3>
                          {it.categories?.name && <span className="text-xs text-slate-400">{it.categories.name}</span>}
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tersedia: {it.available_quantity}</p>
                          <button
                            onClick={() => addToCart(it, 'barang')}
                            disabled={inCart}
                            className={cn(
                              'mt-2 w-full flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors',
                              inCart
                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 cursor-default'
                                : 'bg-blue-500 text-white hover:bg-blue-600',
                            )}
                          >
                            {inCart ? <CheckCircle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            {inCart ? 'Ditambahkan' : 'Tambah'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredFacilities.length === 0 ? (
              <EmptyState icon={Building2} title="Tidak ada fasilitas" description="Tidak ada fasilitas yang cocok." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredFacilities.map((f) => {
                  const inCart = cart.some((c) => c.id === f.id && c.type === 'fasilitas');
                  return (
                    <div key={f.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                      <div className="h-24 bg-slate-200 dark:bg-slate-700">
                        <img src={f.image_url || FALLBACK_FACILITY_IMAGE} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-sm text-slate-900 dark:text-white line-clamp-2">{f.name}</h3>
                        {f.location && <p className="text-xs text-slate-400 mt-0.5">{f.location}</p>}
                        <button
                          onClick={() => addToCart(f, 'fasilitas')}
                          disabled={inCart}
                          className={cn(
                            'mt-2 w-full flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors',
                            inCart
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 cursor-default'
                              : 'bg-blue-500 text-white hover:bg-blue-600',
                          )}
                        >
                          {inCart ? <CheckCircle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          {inCart ? 'Ditambahkan' : 'Tambah'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: cart + form */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              {/* Cart */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <ShoppingCart className="w-5 h-5 text-blue-500" /> Keranjang ({cart.length})
                </h2>
                {cart.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">Keranjang kosong</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {cart.map((c) => (
                      <div key={`${c.type}-${c.id}`} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/40">
                        <Package className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                          <p className="text-xs text-slate-400 capitalize">{c.type}</p>
                        </div>
                        {c.type === 'barang' && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateQty(c.id, c.type, -1)} className="p-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-medium w-6 text-center text-slate-900 dark:text-white">{c.quantity}</span>
                            <button onClick={() => updateQty(c.id, c.type, 1)} className="p-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <button onClick={() => removeFromCart(c.id, c.type)} className="p-1 text-red-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Borrower form */}
              <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
                <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" /> Data Peminjam
                </h2>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Peminjam <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" required value={form.borrower_name} onChange={(e) => setForm({ ...form, borrower_name: e.target.value })} placeholder="Nama lengkap" className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Kelas/Unit <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" required value={form.borrower_class} onChange={(e) => setForm({ ...form, borrower_class: e.target.value })} placeholder="Kelas / unit" className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="email" required value={form.borrower_email} onChange={(e) => setForm({ ...form, borrower_email: e.target.value })} placeholder="email@example.com" className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">No. Telepon <span className="text-slate-400 font-normal">(opsional)</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" value={form.borrower_phone} onChange={(e) => setForm({ ...form, borrower_phone: e.target.value })} placeholder="08xxxxxxxxxx" className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tgl Pinjam <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="date" required value={form.borrow_date} onChange={(e) => setForm({ ...form, borrow_date: e.target.value })} className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tgl Kembali <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="date" required min={form.borrow_date} value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Waktu Mulai</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Waktu Selesai</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Keperluan/Tujuan <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
                    <textarea required minLength={10} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Jelaskan keperluan (min 10 karakter)..." rows={3} className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Catatan Tambahan <span className="text-slate-400 font-normal">(opsional)</span></label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Catatan tambahan..." rows={2} className={cn(bareInputClass, 'resize-none')} />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Mengirim...' : 'Ajukan Peminjaman'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
