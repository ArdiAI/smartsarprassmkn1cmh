import { useEffect, useState, FormEvent } from 'react';
import {
  ClipboardList, Search, Plus, Minus, Trash2, Loader2,
  CheckCircle2, ArrowLeft, Package, Building2, User, Mail,
  Phone, Calendar, Clock, FileText, ShoppingCart, X,
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
  available_quantity: number;
  condition: 'good' | 'fair' | 'poor' | null;
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
  facility_type: string | null;
}

interface CartItem {
  id: string;
  type: 'barang' | 'fasilitas';
  name: string;
  quantity: number;
  maxQuantity: number;
}

interface BorrowingResult {
  id: string;
  borrower_name: string;
  borrower_class: string;
  borrow_date: string;
  return_date: string;
  purpose: string;
  item_type: string;
  items: { name: string; quantity: number }[];
}

const todayStr = () => new Date().toISOString().split('T')[0];

const initialForm = {
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
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<BorrowingResult | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [invRes, facRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('id, code, name, quantity, available_quantity, condition, location, image_url, categories!category_id(name)')
            .gt('available_quantity', 0)
            .eq('condition', 'good')
            .order('name', { ascending: true }),
          supabase
            .from('facilities')
            .select('id, name, description, location, capacity, image_url, facility_type')
            .order('name', { ascending: true }),
        ]);

        if (invRes.error) throw invRes.error;
        if (facRes.error) throw facRes.error;
        setInventory((invRes.data as unknown as InventoryItem[]) || []);
        setFacilities((facRes.data as unknown as Facility[]) || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredInventory = inventory.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.code || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.location || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredFacilities = facilities.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.location || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.facility_type || '').toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (item: InventoryItem | Facility, type: 'barang' | 'fasilitas') => {
    const maxQty = type === 'barang' ? (item as InventoryItem).available_quantity : 1;
    const existing = cart.find((c) => c.id === item.id && c.type === type);
    if (existing) {
      showToast('Item sudah ada di keranjang', 'info');
      return;
    }
    setCart((prev) => [...prev, {
      id: item.id,
      type,
      name: item.name,
      quantity: 1,
      maxQuantity: maxQty,
    }]);
    showToast(`${item.name} ditambahkan ke keranjang`, 'success');
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

  const handleChange = (field: keyof typeof initialForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): string | null => {
    if (cart.length === 0) return 'Keranjang masih kosong. Pilih minimal satu item.';
    if (!form.borrower_name.trim()) return 'Nama peminjam wajib diisi';
    if (!form.borrower_class.trim()) return 'Kelas/Unit wajib diisi';
    if (!form.borrower_email.trim()) return 'Email wajib diisi';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.borrower_email)) return 'Format email tidak valid';
    if (!form.borrow_date) return 'Tanggal pinjam wajib diisi';
    if (!form.return_date) return 'Tanggal kembali wajib diisi';
    if (new Date(form.return_date) < new Date(form.borrow_date)) return 'Tanggal kembali harus setelah tanggal pinjam';
    if (!form.purpose.trim()) return 'Keperluan wajib diisi';
    if (form.purpose.trim().length < 10) return 'Keperluan minimal 10 karakter';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      showToast(error, 'error');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Fetch default workflow
      const workflow = await getDefaultWorkflow();

      // Determine item_type based on cart contents
      const hasBarang = cart.some((c) => c.type === 'barang');
      const hasFasilitas = cart.some((c) => c.type === 'fasilitas');
      const itemType = hasBarang && hasFasilitas ? 'barang' : hasBarang ? 'barang' : 'fasilitas';

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
        workflow_template_id: workflow?.id ?? null,
      };

      const { data: borrowingData, error: borrowingError } = await supabase
        .from('borrowings')
        .insert(borrowingPayload)
        .select('id')
        .single();

      if (borrowingError) throw borrowingError;
      const borrowingId = (borrowingData as any).id;

      // 3. Insert borrowing_items
      const itemPayloads = cart.map((c) => ({
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

      const { error: itemsError } = await supabase
        .from('borrowing_items')
        .insert(itemPayloads);

      if (itemsError) throw itemsError;

      // 4. Send email notification
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

      // 5. Show success state
      setSuccess({
        id: borrowingId,
        borrower_name: form.borrower_name.trim(),
        borrower_class: form.borrower_class.trim(),
        borrow_date: form.borrow_date,
        return_date: form.return_date,
        purpose: form.purpose.trim(),
        item_type: itemType,
        items: cart.map((c) => ({ name: c.name, quantity: c.quantity })),
      });

      showToast('Peminjaman berhasil diajukan!', 'success');
      setCart([]);
      setForm(initialForm);
    } catch (err) {
      console.error('Error submitting borrowing:', err);
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
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Peminjaman Berhasil Diajukan!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Pengajuan Anda akan ditinjau oleh penanggung jawab. Anda akan mendapatkan notifikasi via email.
            </p>

            <div className="text-left bg-slate-50 dark:bg-slate-700/30 rounded-xl p-5 mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Nama</span>
                <span className="font-medium text-slate-900 dark:text-white">{success.borrower_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Kelas/Unit</span>
                <span className="font-medium text-slate-900 dark:text-white">{success.borrower_class}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Tanggal Pinjam</span>
                <span className="font-medium text-slate-900 dark:text-white">{new Date(success.borrow_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Tanggal Kembali</span>
                <span className="font-medium text-slate-900 dark:text-white">{new Date(success.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Keperluan</span>
                <span className="font-medium text-slate-900 dark:text-white text-right max-w-[60%]">{success.purpose}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-600">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Item Dipinjam:</p>
                <div className="flex flex-wrap gap-2">
                  {success.items.map((item, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-300">
                      {item.name} ×{item.quantity}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={resetSuccess}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Buat Peminjaman Lain
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
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ajukan Peminjaman</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Pilih barang atau fasilitas yang ingin dipinjam</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Selection */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-2 mb-4 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
              <button
                onClick={() => setTab('barang')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  tab === 'barang'
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                <Package className="w-4 h-4" /> Barang
              </button>
              <button
                onClick={() => setTab('fasilitas')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  tab === 'fasilitas'
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                <Building2 className="w-4 h-4" /> Fasilitas
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={`Cari ${tab === 'barang' ? 'barang' : 'fasilitas'}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
                    <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl mb-3" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : tab === 'barang' ? (
              filteredInventory.length === 0 ? (
                <EmptyState icon={Package} title="Tidak ada barang tersedia" description="Tidak ada barang dengan kondisi baik dan stok tersedia" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredInventory.map((item) => {
                    const inCart = cart.some((c) => c.id === item.id && c.type === 'barang');
                    return (
                      <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-3">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-7 h-7 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-white text-sm line-clamp-1">{item.name}</h3>
                          {item.code && <p className="text-xs text-slate-400 mb-1">Kode: {item.code}</p>}
                          {item.location && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{item.location}</p>}
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Tersedia: {item.available_quantity} unit</p>
                        </div>
                        <button
                          onClick={() => addToCart(item, 'barang')}
                          disabled={inCart}
                          className={cn(
                            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0',
                            inCart
                              ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                          )}
                        >
                          {inCart ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          {inCart ? 'Dipilih' : 'Tambah'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredFacilities.length === 0 ? (
              <EmptyState icon={Building2} title="Tidak ada fasilitas tersedia" description="Tidak ada fasilitas yang dapat dipinjam saat ini" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredFacilities.map((f) => {
                  const inCart = cart.some((c) => c.id === f.id && c.type === 'fasilitas');
                  return (
                    <div key={f.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-3">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-100 to-teal-100 dark:from-cyan-900/30 dark:to-teal-900/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {f.image_url ? (
                          <img src={f.image_url} alt={f.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-7 h-7 text-cyan-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 dark:text-white text-sm line-clamp-1">{f.name}</h3>
                        {f.facility_type && <p className="text-xs text-blue-500 mb-1">{f.facility_type}</p>}
                        {f.location && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{f.location}</p>}
                        {f.capacity != null && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Kapasitas: {f.capacity} orang</p>}
                      </div>
                      <button
                        onClick={() => addToCart(f, 'fasilitas')}
                        disabled={inCart}
                        className={cn(
                          'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0',
                          inCart
                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        )}
                      >
                        {inCart ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
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
            <div className="sticky top-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              {/* Cart Header */}
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="w-5 h-5 text-blue-500" />
                <h2 className="font-semibold text-slate-900 dark:text-white">Keranjang</h2>
                {cart.length > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {cart.length} item
                  </span>
                )}
              </div>

              {/* Cart Items */}
              {cart.length === 0 ? (
                <div className="text-center py-8 mb-4">
                  <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Keranjang kosong</p>
                </div>
              ) : (
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {cart.map((c) => (
                    <div key={`${c.type}-${c.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{c.type}</p>
                      </div>
                      {c.type === 'barang' && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => updateQty(c.id, c.type, -1)}
                            className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-medium w-6 text-center text-slate-900 dark:text-white">{c.quantity}</span>
                          <button
                            onClick={() => updateQty(c.id, c.type, 1)}
                            disabled={c.quantity >= c.maxQuantity}
                            className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => removeFromCart(c.id, c.type)}
                        className="p-1 text-red-400 hover:text-red-500 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Borrower Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Data Peminjam</h3>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Nama Peminjam <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={form.borrower_name}
                      onChange={(e) => handleChange('borrower_name', e.target.value)}
                      placeholder="Nama lengkap"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Kelas/Unit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.borrower_class}
                    onChange={(e) => handleChange('borrower_class', e.target.value)}
                    placeholder="Contoh: Kelas 10A"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="email"
                      value={form.borrower_email}
                      onChange={(e) => handleChange('borrower_email', e.target.value)}
                      placeholder="email@contoh.com"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    No. Telepon <span className="text-slate-400 text-[10px]">(opsional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={form.borrower_phone}
                      onChange={(e) => handleChange('borrower_phone', e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Tgl Pinjam <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="date"
                        value={form.borrow_date}
                        onChange={(e) => handleChange('borrow_date', e.target.value)}
                        className="w-full pl-9 pr-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Tgl Kembali <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="date"
                        value={form.return_date}
                        onChange={(e) => handleChange('return_date', e.target.value)}
                        min={form.borrow_date}
                        className="w-full pl-9 pr-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Waktu Mulai
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="time"
                        value={form.start_time}
                        onChange={(e) => handleChange('start_time', e.target.value)}
                        className="w-full pl-9 pr-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Waktu Selesai
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="time"
                        value={form.end_time}
                        onChange={(e) => handleChange('end_time', e.target.value)}
                        className="w-full pl-9 pr-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Keperluan/Tujuan <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
                    <textarea
                      value={form.purpose}
                      onChange={(e) => handleChange('purpose', e.target.value)}
                      placeholder="Jelaskan keperluan peminjaman (min. 10 karakter)"
                      rows={3}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Catatan Tambahan <span className="text-slate-400 text-[10px]">(opsional)</span>
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Catatan tambahan untuk peminjam"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-900/50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</>
                  ) : (
                    <><ClipboardList className="w-4 h-4" /> Ajukan Peminjaman</>
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
