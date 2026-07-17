import { useEffect, useState, FormEvent, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { getDefaultWorkflow } from '../lib/workflow';
import { showToast } from '../components/Toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import {
  ClipboardList,
  Search,
  Loader2,
  Plus,
  Minus,
  Trash2,
  Package,
  Building2,
  CheckCircle2,
  ShoppingCart,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  FileText,
  StickyNote,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  available_quantity: number;
  condition: string;
  code: string | null;
  location: string | null;
}

interface Facility {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
}

interface CartItem {
  id: string;
  name: string;
  type: 'barang' | 'fasilitas';
  quantity: number;
  maxQuantity: number;
}

interface SubmittedBorrowing {
  id: string;
  borrower_name: string;
  borrower_email: string;
  borrow_date: string;
  return_date: string;
  purpose: string;
  items: CartItem[];
}

const todayStr = () => new Date().toISOString().split('T')[0];

export default function BorrowPage() {
  const [tab, setTab] = useState<'barang' | 'fasilitas'>('barang');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SubmittedBorrowing | null>(null);

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

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [invRes, facRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('id, name, description, quantity, available_quantity, condition, code, location')
            .order('name', { ascending: true }),
          supabase
            .from('facilities')
            .select('id, name, description, location, capacity')
            .order('name', { ascending: true }),
        ]);

        const invData = (invRes.data as unknown as InventoryItem[]) ?? [];
        // Only show items with available_quantity > 0 and condition = 'good'
        setInventory(invData.filter((i) => i.available_quantity > 0 && i.condition === 'good'));
        setFacilities((facRes.data as unknown as Facility[]) ?? []);
      } catch {
        setInventory([]);
        setFacilities([]);
      } finally {
        setLoadingItems(false);
      }
    };
    fetchAll();
  }, []);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return tab === 'barang' ? inventory : facilities;
    const q = search.toLowerCase();
    if (tab === 'barang') {
      return inventory.filter((i) => i.name.toLowerCase().includes(q) || (i.code ?? '').toLowerCase().includes(q));
    }
    return facilities.filter((f) => f.name.toLowerCase().includes(q) || (f.location ?? '').toLowerCase().includes(q));
  }, [inventory, facilities, search, tab]);

  const addToCart = (item: InventoryItem | Facility, type: 'barang' | 'fasilitas') => {
    const id = item.id;
    const name = item.name;
    const maxQuantity = type === 'barang' ? (item as InventoryItem).available_quantity : 1;

    setCart((prev) => {
      if (prev.some((c) => c.id === id && c.type === type)) {
        showToast('Item sudah ada di keranjang', 'info');
        return prev;
      }
      showToast(`${name} ditambahkan ke keranjang`, 'success');
      return [...prev, { id, name, type, quantity: 1, maxQuantity }];
    });
  };

  const updateQty = (id: string, type: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.id === id && c.type === type) {
          const newQty = Math.max(1, Math.min(c.maxQuantity, c.quantity + delta));
          return { ...c, quantity: newQty };
        }
        return c;
      })
    );
  };

  const removeFromCart = (id: string, type: string) => {
    setCart((prev) => prev.filter((c) => !(c.id === id && c.type === type)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      showToast('Keranjang masih kosong', 'warning');
      return;
    }
    if (form.purpose.length < 10) {
      showToast('Keperluan minimal 10 karakter', 'warning');
      return;
    }
    if (form.return_date && form.borrow_date && form.return_date <= form.borrow_date) {
      showToast('Tanggal kembali harus setelah tanggal pinjam', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Fetch default workflow
      const workflow = await getDefaultWorkflow();
      const workflowTemplateId = workflow?.id ?? null;

      // 2. Create borrowing record
      const borrowingPayload = {
        borrower_name: form.borrower_name,
        borrower_class: form.borrower_class,
        borrower_email: form.borrower_email,
        borrower_phone: form.borrower_phone || null,
        borrow_date: form.borrow_date,
        return_date: form.return_date || null,
        start_time: form.start_time,
        end_time: form.end_time,
        purpose: form.purpose,
        notes: form.notes || null,
        status: 'pending',
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        item_type: tab,
      };

      const { data: borrowingData, error: borrowingError } = await supabase
        .from('borrowings')
        .insert(borrowingPayload)
        .select('id')
        .single();

      if (borrowingError) throw borrowingError;
      const borrowingId = (borrowingData as unknown as { id: string }).id;

      // 3. Create borrowing_items records
      const itemsPayload = cart.map((item) => ({
        borrowing_id: borrowingId,
        item_name: item.name,
        item_type: item.type,
        quantity: item.quantity,
        status: 'pending',
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        workflow_template_id: workflowTemplateId,
      }));

      const { error: itemsError } = await supabase.from('borrowing_items').insert(itemsPayload);
      if (itemsError) throw itemsError;

      // 4. Send email notification
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v2/send-borrowing-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_request',
            borrowing_id: borrowingId,
            borrower_name: form.borrower_name,
            borrower_email: form.borrower_email,
          }),
        });
      } catch {
        // Email is best-effort; don't fail the submission
      }

      // 5. Show success state
      setSuccess({
        id: borrowingId,
        borrower_name: form.borrower_name,
        borrower_email: form.borrower_email,
        borrow_date: form.borrow_date,
        return_date: form.return_date,
        purpose: form.purpose,
        items: cart,
      });
      showToast('Peminjaman berhasil diajukan!', 'success');
    } catch (err: any) {
      showToast(err.message ?? 'Gagal mengajukan peminjaman', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
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
    setSuccess(null);
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Peminjaman Berhasil Diajukan!</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Permohonan peminjaman Anda telah dikirim dan sedang menunggu persetujuan.
            </p>

            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-2xl p-6 text-left space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Peminjam</span>
                <span className="font-semibold text-slate-900 dark:text-white">{success.borrower_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Email</span>
                <span className="font-semibold text-slate-900 dark:text-white text-sm">{success.borrower_email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Tanggal Pinjam</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {new Date(success.borrow_date).toLocaleDateString('id-ID')}
                </span>
              </div>
              {success.return_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Tanggal Kembali</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {new Date(success.return_date).toLocaleDateString('id-ID')}
                  </span>
                </div>
              )}
              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Keperluan</span>
                <p className="text-sm text-slate-700 dark:text-slate-300">{success.purpose}</p>
              </div>
              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400 block mb-2">Barang Dipinjam</span>
                <div className="space-y-2">
                  {success.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800">
                      <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        {item.type === 'barang' ? <Package className="w-4 h-4 text-blue-500" /> : <Building2 className="w-4 h-4 text-cyan-500" />}
                        {item.name}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Pinjam Lagi
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
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-blue-500" />
            Ajukan Peminjaman
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Pilih barang atau fasilitas, isi formulir, dan ajukan peminjaman
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: item selection */}
          <div className="lg:col-span-2">
            {/* Tab switch */}
            <div className="flex gap-2 mb-4 bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1">
              <button
                onClick={() => setTab('barang')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'barang'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                <Package className="w-4 h-4" />
                Barang
              </button>
              <button
                onClick={() => setTab('fasilitas')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'fasilitas'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Fasilitas
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Cari ${tab === 'barang' ? 'barang' : 'fasilitas'}...`}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Grid */}
            {loadingItems ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 animate-pulse">
                    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-full mb-2" />
                    <div className="h-8 bg-slate-100 dark:bg-slate-700/50 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <EmptyState
                  icon={tab === 'barang' ? Package : Building2}
                  title="Tidak ada item tersedia"
                  description="Coba kata kunci lain atau ubah tab"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredItems.map((item) => {
                  const inCart = cart.some((c) => c.id === item.id && c.type === tab);
                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            {tab === 'barang' ? <Package className="w-5 h-5 text-blue-500" /> : <Building2 className="w-5 h-5 text-cyan-500" />}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{item.name}</h3>
                            {tab === 'barang' && (item as InventoryItem).code && (
                              <p className="text-xs text-slate-400 dark:text-slate-500">Kode: {(item as InventoryItem).code}</p>
                            )}
                            {tab === 'fasilitas' && (item as Facility).location && (
                              <p className="text-xs text-slate-400 dark:text-slate-500">{(item as Facility).location}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {item.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{item.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        {tab === 'barang' && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            {(item as InventoryItem).available_quantity} tersedia
                          </span>
                        )}
                        {tab === 'fasilitas' && (item as Facility).capacity != null && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Kapasitas: {(item as Facility).capacity} orang
                          </span>
                        )}
                        <button
                          onClick={() => addToCart(item, tab)}
                          disabled={inCart}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            inCart
                              ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {inCart ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          {inCart ? 'Ditambahkan' : 'Tambah'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: cart + form */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              {/* Cart */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-5 h-5 text-blue-500" />
                  <h2 className="font-semibold text-slate-900 dark:text-white">Keranjang</h2>
                  {cart.length > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      {cart.length}
                    </span>
                  )}
                </div>

                {cart.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
                    Keranjang masih kosong. Pilih item untuk dipinjam.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{item.type}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQty(item.id, item.type, -1)}
                            disabled={item.quantity <= 1}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-slate-900 dark:text-white tabular-nums">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.id, item.type, 1)}
                            disabled={item.quantity >= item.maxQuantity}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id, item.type)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Borrower form */}
              <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
                <h2 className="font-semibold text-slate-900 dark:text-white">Informasi Peminjam</h2>

                <div>
                  <label className={labelClass}>Nama Peminjam <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" required value={form.borrower_name} onChange={(e) => setForm({ ...form, borrower_name: e.target.value })} placeholder="Nama lengkap" className={inputClass + ' pl-11'} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Kelas/Unit <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.borrower_class} onChange={(e) => setForm({ ...form, borrower_class: e.target.value })} placeholder="Kelas atau unit" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="email" required value={form.borrower_email} onChange={(e) => setForm({ ...form, borrower_email: e.target.value })} placeholder="email@example.com" className={inputClass + ' pl-11'} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>No. Telepon (opsional)</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="tel" value={form.borrower_phone} onChange={(e) => setForm({ ...form, borrower_phone: e.target.value })} placeholder="08xxxxxxxxxx" className={inputClass + ' pl-11'} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Tanggal Pinjam <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="date" required value={form.borrow_date} onChange={(e) => setForm({ ...form, borrow_date: e.target.value })} className={inputClass + ' pl-11'} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Tanggal Kembali <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="date" required min={form.borrow_date} value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} className={inputClass + ' pl-11'} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Waktu Mulai</label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={inputClass + ' pl-11'} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Waktu Selesai</label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={inputClass + ' pl-11'} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Keperluan/Tujuan <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs text-slate-400">({form.purpose.length}/10 min.)</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                    <textarea required minLength={10} rows={3} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Jelaskan keperluan peminjaman (min. 10 karakter)" className={inputClass + ' pl-11 resize-none'} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Catatan Tambahan (opsional)</label>
                  <div className="relative">
                    <StickyNote className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                    <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Catatan tambahan" className={inputClass + ' pl-11 resize-none'} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Mengajukan...
                    </>
                  ) : (
                    <>
                      <ClipboardList className="w-5 h-5" />
                      Ajukan Peminjaman
                    </>
                  )}
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
