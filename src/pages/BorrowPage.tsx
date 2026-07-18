import { useEffect, useState, useMemo } from 'react';
import {
  Package, Building2, Search, Plus, Minus, X, Loader2, CheckCircle2, ShoppingCart,
  User, Calendar, Clock, FileText, Mail, Phone, RotateCcw, AlertCircle, Tag,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { getDefaultWorkflow } from '../lib/workflow';

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
  quantity: number;
  condition: 'good' | 'fair' | 'poor' | null;
  location: string | null;
  available_quantity: number;
  categories: { name: string } | null;
}

interface Facility {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
  category: string | null;
}

interface CartItem {
  key: string;
  item_type: 'barang' | 'fasilitas';
  inventory_id: string | null;
  facility_id: string | null;
  item_name: string;
  quantity: number;
  maxQuantity?: number;
  isCustom: boolean;
}

interface BorrowingResult {
  id: string;
  borrower_name: string;
  borrower_class: string;
  borrow_date: string;
  return_date: string;
  item_type: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function BorrowPage() {
  const [tab, setTab] = useState<'barang' | 'fasilitas'>('barang');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<BorrowingResult | null>(null);

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
    (async () => {
      const [inv, fac] = await Promise.all([
        supabase
          .from('inventory')
          .select('id, code, name, quantity, condition, location, available_quantity, categories!category_id(name)')
          .order('name', { ascending: true }),
        supabase.from('facilities').select('id, name, location, capacity, category').order('name', { ascending: true }),
      ]);
      if (!inv.error) {
        const items = ((inv.data as unknown as InventoryItem[]) || []).filter(
          it => it.available_quantity > 0 && it.condition === 'good',
        );
        setInventory(items);
      }
      if (!fac.error) setFacilities((fac.data as unknown as Facility[]) || []);
      setLoading(false);
    })();
  }, []);

  const filteredInventory = useMemo(() => {
    if (!search) return inventory;
    const q = search.toLowerCase();
    return inventory.filter(
      it => it.name?.toLowerCase().includes(q) || it.code?.toLowerCase().includes(q) || it.categories?.name?.toLowerCase().includes(q),
    );
  }, [inventory, search]);

  const filteredFacilities = useMemo(() => {
    if (!search) return facilities;
    const q = search.toLowerCase();
    return facilities.filter(f => f.name?.toLowerCase().includes(q) || f.location?.toLowerCase().includes(q) || f.category?.toLowerCase().includes(q));
  }, [facilities, search]);

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.key === item.key);
      if (existing) {
        if (existing.maxQuantity && existing.quantity >= existing.maxQuantity) {
          showToast('Jumlah melebihi batas tersedia', 'warning');
          return prev;
        }
        return prev.map(c => (c.key === item.key ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (key: string) => setCart(prev => prev.filter(c => c.key !== key));

  const updateQty = (key: string, delta: number) => {
    setCart(prev =>
      prev.map(c => {
        if (c.key !== key) return c;
        const newQty = c.quantity + delta;
        if (newQty < 1) return c;
        if (c.maxQuantity && newQty > c.maxQuantity) {
          showToast('Jumlah melebihi batas tersedia', 'warning');
          return c;
        }
        return { ...c, quantity: newQty };
      }),
    );
  };

  const handleAddInventory = (it: InventoryItem) => {
    addToCart({
      key: `barang-${it.id}`,
      item_type: 'barang',
      inventory_id: it.id,
      facility_id: null,
      item_name: it.name,
      quantity: 1,
      maxQuantity: it.available_quantity,
      isCustom: false,
    });
    showToast(`${it.name} ditambahkan`, 'success');
  };

  const handleAddFacility = (f: Facility) => {
    addToCart({
      key: `fasilitas-${f.id}`,
      item_type: 'fasilitas',
      inventory_id: null,
      facility_id: f.id,
      item_name: f.name,
      quantity: 1,
      isCustom: false,
    });
    showToast(`${f.name} ditambahkan`, 'success');
  };

  const handleConfirmCustom = () => {
    const name = customName.trim();
    if (!name) {
      showToast('Masukkan nama barang/fasilitas', 'warning');
      return;
    }
    const key = `custom-${tab}-${Date.now()}`;
    addToCart({
      key,
      item_type: tab,
      inventory_id: null,
      facility_id: null,
      item_name: name,
      quantity: 1,
      isCustom: true,
    });
    showToast(`${name} ditambahkan`, 'success');
    setCustomName('');
    setShowCustom(false);
  };

  const validateForm = (): string | null => {
    if (cart.length === 0) return 'Keranjang masih kosong. Tambahkan minimal satu item.';
    if (!form.borrower_name.trim()) return 'Nama peminjam wajib diisi.';
    if (!form.borrower_class.trim()) return 'Kelas/Unit wajib diisi.';
    if (!form.borrower_email.trim()) return 'Email wajib diisi.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.borrower_email)) return 'Format email tidak valid.';
    if (!form.borrow_date) return 'Tanggal pinjam wajib diisi.';
    if (!form.return_date) return 'Tanggal kembali wajib diisi.';
    if (new Date(form.return_date) < new Date(form.borrow_date)) return 'Tanggal kembali harus setelah tanggal pinjam.';
    if (form.purpose.trim().length < 10) return 'Keperluan minimal 10 karakter.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const err = validateForm();
    if (err) { showToast(err, 'error'); return; }

    setSubmitting(true);
    try {
      const workflow = await getDefaultWorkflow();
      const primaryType = cart.some(c => c.item_type === 'fasilitas') && !cart.some(c => c.item_type === 'barang') ? 'fasilitas' : 'barang';

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
        item_type: primaryType,
        workflow_template_id: workflow?.id ?? null,
      };

      const { data: borrowingData, error: borrowingError } = await supabase
        .from('borrowings')
        .insert(borrowingPayload)
        .select()
        .single();

      if (borrowingError || !borrowingData) {
        showToast('Gagal membuat peminjaman: ' + (borrowingError?.message || 'Unknown'), 'error');
        setSubmitting(false);
        return;
      }

      const borrowingId = (borrowingData as unknown as { id: string }).id;

      const itemsPayload = cart.map(c => ({
        borrowing_id: borrowingId,
        inventory_id: c.inventory_id,
        facility_id: c.facility_id,
        item_type: c.item_type,
        item_name: c.item_name,
        quantity: c.quantity,
        status: 'pending',
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        workflow_template_id: workflow?.id ?? null,
      }));

      const { error: itemsError } = await supabase.from('borrowing_items').insert(itemsPayload);
      if (itemsError) {
        showToast('Peminjaman dibuat, tapi gagal menambahkan item: ' + itemsError.message, 'warning');
      }

      // Send email notification
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
        console.error('Email send failed:', emailErr);
      }

      showToast('Peminjaman berhasil diajukan!', 'success');
      setSubmitted({
        id: borrowingId,
        borrower_name: form.borrower_name,
        borrower_class: form.borrower_class,
        borrow_date: form.borrow_date,
        return_date: form.return_date,
        item_type: primaryType,
      });
      setCart([]);
      setForm({
        borrower_name: '', borrower_class: '', borrower_email: '', borrower_phone: '',
        borrow_date: todayStr(), return_date: '', start_time: '08:00', end_time: '16:00',
        purpose: '', notes: '',
      });
    } catch (err: any) {
      showToast(err?.message || 'Terjadi kesalahan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(null);
    setCart([]);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Peminjaman Berhasil Diajukan</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Pengajuan peminjaman Anda telah berhasil dikirim. Anda akan menerima notifikasi melalui email setelah disetujui.
            </p>
            <div className="text-left space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 mb-6">
              <div className="flex justify-between text-sm"><span className="text-slate-500">ID</span><span className="font-mono text-xs text-slate-900 dark:text-white">{submitted.id.slice(0, 8)}...</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Peminjam</span><span className="font-medium text-slate-900 dark:text-white">{submitted.borrower_name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Kelas/Unit</span><span className="font-medium text-slate-900 dark:text-white">{submitted.borrower_class}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Tanggal Pinjam</span><span className="font-medium text-slate-900 dark:text-white">{new Date(submitted.borrow_date).toLocaleDateString('id-ID')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Tanggal Kembali</span><span className="font-medium text-slate-900 dark:text-white">{new Date(submitted.return_date).toLocaleDateString('id-ID')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Status</span><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Menunggu Persetujuan</span></div>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={resetForm} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition-colors">
                <RotateCcw className="w-4 h-4" /> Buat Peminjaman Lain
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Ajukan Peminjaman</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Pilih barang atau fasilitas yang ingin Anda pinjam</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl">
              <button
                onClick={() => { setTab('barang'); setSearch(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === 'barang' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              >
                <Package className="w-4 h-4" /> Barang
              </button>
              <button
                onClick={() => { setTab('fasilitas'); setSearch(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === 'fasilitas' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              >
                <Building2 className="w-4 h-4" /> Fasilitas
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={tab === 'barang' ? 'Cari barang...' : 'Cari fasilitas...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Lainnya... card */}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-white text-sm">Lainnya...</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Item tidak ada di daftar? Ketik nama sendiri</p>
              </div>
            </button>

            {showCustom && (
              <div className="card p-4 space-y-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nama {tab === 'barang' ? 'Barang' : 'Fasilitas'}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleConfirmCustom())}
                    placeholder={tab === 'barang' ? 'Contoh: Microphone wireless' : 'Contoh: Aula Lt. 3'}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <button
                    onClick={handleConfirmCustom}
                    className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Tambah
                  </button>
                </div>
                <button onClick={() => setShowCustom(false)} className="text-xs text-slate-400 hover:text-slate-600">Batal</button>
              </div>
            )}

            {/* Items grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
            ) : tab === 'barang' ? (
              filteredInventory.length === 0 ? (
                <EmptyState icon={Package} title="Tidak ada barang tersedia" description="Coba kata kunci lain atau gunakan opsi Lainnya..." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredInventory.map(it => {
                    const inCart = cart.find(c => c.key === `barang-${it.id}`);
                    return (
                      <div key={it.id} className="card p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-1">{it.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {it.categories?.name || 'Tanpa kategori'} • Tersedia: {it.available_quantity}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddInventory(it)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors flex-shrink-0"
                        >
                          {inCart ? <><Plus className="w-3.5 h-3.5" />Tambah</> : <><Plus className="w-3.5 h-3.5" />Tambah</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredFacilities.length === 0 ? (
              <EmptyState icon={Building2} title="Tidak ada fasilitas tersedia" description="Coba kata kunci lain atau gunakan opsi Lainnya..." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredFacilities.map(f => {
                  const inCart = cart.find(c => c.key === `fasilitas-${f.id}`);
                  return (
                    <div key={f.id} className="card p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-cyan-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-1">{f.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {f.location || '-'}{f.capacity ? ` • ${f.capacity} orang` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddFacility(f)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-medium transition-colors flex-shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Cart + Form */}
          <div className="lg:col-span-1">
            <div className="card p-5 sticky top-20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-500" />
                  <h2 className="font-semibold text-slate-900 dark:text-white">Keranjang</h2>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{cart.length} item</span>
              </div>

              {cart.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Keranjang kosong. Pilih item di sebelah kiri.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cart.map(c => (
                    <div key={c.key} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {c.isCustom && <Tag className="w-3 h-3 text-amber-500" />}
                          <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">{c.item_name}</p>
                        </div>
                        <p className="text-xs text-slate-400">{c.item_type === 'fasilitas' ? 'Fasilitas' : 'Barang'}{c.isCustom ? ' (Kustom)' : ''}</p>
                      </div>
                      {c.item_type === 'barang' && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => updateQty(c.key, -1)} className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-medium w-6 text-center">{c.quantity}</span>
                          <button onClick={() => updateQty(c.key, 1)} className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <button onClick={() => removeFromCart(c.key)} className="p-1 text-red-400 hover:text-red-500 flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Borrower form */}
              <form onSubmit={handleSubmit} className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Nama Peminjam *</label>
                    <input type="text" required value={form.borrower_name} onChange={e => setForm({ ...form, borrower_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Kelas/Unit *</label>
                    <input type="text" required value={form.borrower_class} onChange={e => setForm({ ...form, borrower_class: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Email *</label>
                    <input type="email" required value={form.borrower_email} onChange={e => setForm({ ...form, borrower_email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">No. Telepon</label>
                    <input type="text" value={form.borrower_phone} onChange={e => setForm({ ...form, borrower_phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Tgl Pinjam *</label>
                    <input type="date" required value={form.borrow_date} onChange={e => setForm({ ...form, borrow_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Tgl Kembali *</label>
                    <input type="date" required value={form.return_date} min={form.borrow_date} onChange={e => setForm({ ...form, return_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Waktu Mulai</label>
                    <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Waktu Selesai</label>
                    <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Keperluan/Tujuan * (min. 10 karakter)</label>
                    <textarea required value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Catatan Tambahan</label>
                    <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" />
                  </div>
                </div>

                <button type="submit" disabled={submitting || cart.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-60">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Ajukan Peminjaman</>}
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
