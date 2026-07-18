import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { getDefaultWorkflow } from '../lib/workflow';
import type { WorkflowTemplate } from '../lib/workflow';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import {
  Search, Package, Building2, Plus, Minus, X, Loader2, ShoppingCart,
  CheckCircle, Send, User, Mail, Phone, Calendar, Clock, FileText, PlusCircle,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
  quantity: number;
  available_quantity: number;
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
  category: string | null;
}

interface CartItem {
  key: string;
  inventory_id: string | null;
  facility_id: string | null;
  item_type: 'barang' | 'fasilitas';
  item_name: string;
  quantity: number;
  is_custom: boolean;
}

const pexelsFallback = (seed: string) =>
  `https://images.pexels.com/photos/4226119/pexels-photo-4226119.jpeg?auto=compress&cs=tinysrgb&w=300&dpr=1&seed=${encodeURIComponent(seed)}`;

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function BorrowPage() {
  const [tab, setTab] = useState<'barang' | 'fasilitas'>('barang');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Lainnya... custom item form
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState(1);

  // Borrower form
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
  const [submitted, setSubmitted] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const [invRes, facRes] = await Promise.all([
        supabase
          .from('inventory')
          .select('*, categories!category_id(name)')
          .gt('available_quantity', 0)
          .eq('condition', 'good')
          .order('name', { ascending: true }),
        supabase.from('facilities').select('*').order('name', { ascending: true }),
      ]);
      setInventory((invRes.data as unknown as InventoryItem[]) || []);
      setFacilities((facRes.data as unknown as Facility[]) || []);
      setLoading(false);
    })();
  }, []);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (search) {
        const q = search.toLowerCase();
        return (
          item.name?.toLowerCase().includes(q) ||
          item.code?.toLowerCase().includes(q) ||
          item.location?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [inventory, search]);

  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      if (search) {
        const q = search.toLowerCase();
        return (
          f.name?.toLowerCase().includes(q) ||
          f.location?.toLowerCase().includes(q) ||
          f.category?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [facilities, search]);

  const addToCart = (item: InventoryItem | Facility, type: 'barang' | 'fasilitas') => {
    const key = type === 'barang'
      ? `inv-${(item as InventoryItem).id}`
      : `fac-${(item as Facility).id}`;
    const existing = cart.find((c) => c.key === key);
    if (existing) {
      if (type === 'fasilitas') {
        showToast('Fasilitas sudah ada di keranjang', 'info');
        return;
      }
      if (type === 'barang' && existing.quantity >= (item as InventoryItem).available_quantity) {
        showToast('Jumlah melebihi stok tersedia', 'warning');
        return;
      }
      setCart(cart.map((c) => (c.key === key ? { ...c, quantity: c.quantity + 1 } : c)));
    } else {
      setCart([
        ...cart,
        {
          key,
          inventory_id: type === 'barang' ? (item as InventoryItem).id : null,
          facility_id: type === 'fasilitas' ? (item as Facility).id : null,
          item_type: type,
          item_name: item.name,
          quantity: 1,
          is_custom: false,
        },
      ]);
    }
  };

  const addCustomItem = () => {
    if (!customName.trim()) {
      showToast('Masukkan nama barang/fasilitas', 'error');
      return;
    }
    const key = `custom-${tab}-${Date.now()}`;
    setCart([
      ...cart,
      {
        key,
        inventory_id: null,
        facility_id: null,
        item_type: tab,
        item_name: customName.trim(),
        quantity: tab === 'fasilitas' ? 1 : customQty,
        is_custom: true,
      },
    ]);
    setCustomName('');
    setCustomQty(1);
    setShowCustomForm(false);
    showToast('Item ditambahkan ke keranjang', 'success');
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c;
        if (c.item_type === 'fasilitas') return c; // fixed at 1
        const newQty = Math.max(1, c.quantity + delta);
        if (!c.is_custom) {
          const invItem = inventory.find((i) => i.id === c.inventory_id);
          if (invItem && newQty > invItem.available_quantity) {
            showToast('Jumlah melebihi stok tersedia', 'warning');
            return c;
          }
        }
        return { ...c, quantity: newQty };
      }),
    );
  };

  const removeFromCart = (key: string) => {
    setCart(cart.filter((c) => c.key !== key));
  };

  const validateForm = (): boolean => {
    if (cart.length === 0) {
      showToast('Keranjang masih kosong', 'error');
      return false;
    }
    if (!form.borrower_name || !form.borrower_class || !form.borrower_email) {
      showToast('Lengkapi data peminjam', 'error');
      return false;
    }
    if (!form.borrow_date || !form.return_date) {
      showToast('Tanggal pinjam dan kembali wajib diisi', 'error');
      return false;
    }
    if (new Date(form.return_date) <= new Date(form.borrow_date)) {
      showToast('Tanggal kembali harus setelah tanggal pinjam', 'error');
      return false;
    }
    if (form.purpose.trim().length < 10) {
      showToast('Keperluan minimal 10 karakter', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      // 1. Fetch default workflow
      const workflow = await getDefaultWorkflow();

      // 2. Insert into borrowings
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
        item_type: tab,
        workflow_template_id: workflow?.id || null,
      };

      const { data: borrowing, error: bwrError } = await supabase
        .from('borrowings')
        .insert(borrowingPayload)
        .select('*')
        .single();

      if (bwrError || !borrowing) {
        showToast('Gagal membuat peminjaman: ' + (bwrError?.message || 'Unknown error'), 'error');
        setSubmitting(false);
        return;
      }

      const borrowing_id = (borrowing as any).id;

      // 3. Insert borrowing_items
      const itemPayloads = cart.map((c) => ({
        borrowing_id,
        inventory_id: c.inventory_id,
        facility_id: c.facility_id,
        item_type: c.item_type,
        item_name: c.item_name,
        quantity: c.quantity,
        status: 'pending',
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        workflow_template_id: workflow?.id || null,
      }));

      const { error: itemsError } = await supabase.from('borrowing_items').insert(itemPayloads);

      if (itemsError) {
        showToast('Gagal menyimpan item: ' + itemsError.message, 'error');
        setSubmitting(false);
        return;
      }

      // 4. Send email notification
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v2/send-borrowing-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_request',
            borrowing_id,
            borrower_name: form.borrower_name,
            borrower_email: form.borrower_email,
          }),
        });
      } catch (emailErr) {
        console.error('Email notification failed:', emailErr);
      }

      // 5. Success state
      showToast('Peminjaman berhasil diajukan!', 'success');
      setSubmitted({
        ...borrowing,
        items: cart,
      });
    } catch (err: any) {
      showToast('Terjadi kesalahan: ' + (err?.message || 'Unknown'), 'error');
    }
    setSubmitting(false);
  };

  const handleReset = () => {
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
    setSubmitted(null);
  };

  // ===== Success State =====
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Peminjaman Diajukan!</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Pengajuan peminjaman Anda berhasil dibuat. Anda akan menerima notifikasi via email saat status diperbarui.
            </p>

            <div className="text-left space-y-3 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Peminjam</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{submitted.borrower_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Kelas/Unit</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{submitted.borrower_class}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Tanggal</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {new Date(submitted.borrow_date).toLocaleDateString('id-ID')} → {new Date(submitted.return_date).toLocaleDateString('id-ID')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{submitted.current_status_label}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Item Dipinjam:</p>
                <div className="flex flex-wrap gap-2">
                  {submitted.items.map((item: CartItem) => (
                    <span key={item.key} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200">
                      {item.item_type === 'fasilitas' ? <Building2 className="w-3.5 h-3.5 text-slate-400" /> : <Package className="w-3.5 h-3.5 text-slate-400" />}
                      {item.item_name} ×{item.quantity}
                      {item.is_custom && <span className="text-xs text-blue-500">(Lainnya)</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all"
            >
              <PlusCircle className="w-5 h-5" />
              Buat Peminjaman Baru
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ===== Main Form =====
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Pinjam Barang/Fasilitas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Pilih barang atau fasilitas, lalu isi form peminjaman
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ===== LEFT PANEL: Item Selection ===== */}
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              <button
                onClick={() => setTab('barang')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'barang'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Package className="w-4 h-4" />
                Barang
              </button>
              <button
                onClick={() => setTab('fasilitas')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'fasilitas'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Fasilitas
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={tab === 'barang' ? 'Cari barang...' : 'Cari fasilitas...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Lainnya... card */}
            <div>
              <button
                onClick={() => setShowCustomForm(!showCustomForm)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-blue-600 dark:text-blue-400">Lainnya...</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pinjam barang/fasilitas yang belum terdaftar</p>
                </div>
              </button>

              {showCustomForm && (
                <div className="mt-2 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Nama {tab === 'barang' ? 'Barang' : 'Fasilitas'}
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder={tab === 'barang' ? 'Contoh: Kabel HDMI 5m' : 'Contoh: Ruang Rapat Lt.2'}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  {tab === 'barang' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Jumlah</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomQty(Math.max(1, customQty - 1))}
                          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-medium text-slate-900 dark:text-white">{customQty}</span>
                        <button
                          type="button"
                          onClick={() => setCustomQty(customQty + 1)}
                          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addCustomItem}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah ke Keranjang
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCustomForm(false); setCustomName(''); }}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Item grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : tab === 'barang' ? (
              filteredInventory.length === 0 ? (
                <EmptyState icon={Package} title="Tidak ada barang tersedia" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredInventory.map((item) => {
                    const inCart = cart.find((c) => c.inventory_id === item.id);
                    return (
                      <div key={item.id} className="card p-3 flex gap-3">
                        <img
                          src={item.image_url || pexelsFallback(item.name)}
                          alt={item.name}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = pexelsFallback(item.name); }}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-white text-sm line-clamp-1">{item.name}</h3>
                          {item.categories?.name && (
                            <p className="text-xs text-slate-400">{item.categories.name}</p>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              {item.available_quantity} tersedia
                            </span>
                            <button
                              onClick={() => addToCart(item, 'barang')}
                              disabled={!!inCart && inCart.quantity >= item.available_quantity}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <Plus className="w-3 h-3" />
                              {inCart ? `${inCart.quantity}` : 'Tambah'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredFacilities.length === 0 ? (
              <EmptyState icon={Building2} title="Tidak ada fasilitas tersedia" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredFacilities.map((f) => {
                  const inCart = cart.find((c) => c.facility_id === f.id);
                  return (
                    <div key={f.id} className="card p-3 flex gap-3">
                      <img
                        src={f.image_url || pexelsFallback(f.name)}
                        alt={f.name}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = pexelsFallback(f.name); }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 dark:text-white text-sm line-clamp-1">{f.name}</h3>
                        {f.location && (
                          <p className="text-xs text-slate-400 line-clamp-1">{f.location}</p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-400">
                            {f.capacity ? `Kapasitas ${f.capacity}` : ''}
                          </span>
                          <button
                            onClick={() => addToCart(f, 'fasilitas')}
                            disabled={!!inCart}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            <Plus className="w-3 h-3" />
                            {inCart ? 'Dipilih' : 'Tambah'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== RIGHT PANEL: Cart + Form ===== */}
          <div className="space-y-4">
            {/* Cart */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingCart className="w-5 h-5 text-blue-500" />
                <h2 className="font-semibold text-slate-900 dark:text-white">Keranjang ({cart.length})</h2>
              </div>
              {cart.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Keranjang masih kosong</p>
              ) : (
                <div className="space-y-2">
                  {cart.map((c) => (
                    <div key={c.key} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">
                          {c.item_name}
                          {c.is_custom && <span className="ml-1.5 text-xs text-blue-500">(Lainnya)</span>}
                        </p>
                        <p className="text-xs text-slate-400">
                          {c.item_type === 'fasilitas' ? 'Fasilitas' : 'Barang'}
                        </p>
                      </div>
                      {c.item_type === 'barang' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQty(c.key, -1)}
                            className="p-1 rounded-md bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-slate-900 dark:text-white">{c.quantity}</span>
                          <button
                            onClick={() => updateQty(c.key, 1)}
                            className="p-1 rounded-md bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => removeFromCart(c.key)}
                        className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Borrower Form */}
            <form onSubmit={handleSubmit} className="card p-5 space-y-4">
              <h2 className="font-semibold text-slate-900 dark:text-white">Data Peminjam</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Peminjam <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={form.borrower_name}
                      onChange={(e) => setForm({ ...form, borrower_name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Kelas/Unit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.borrower_class}
                    onChange={(e) => setForm({ ...form, borrower_class: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={form.borrower_email}
                      onChange={(e) => setForm({ ...form, borrower_email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    No. Telepon
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.borrower_phone}
                      onChange={(e) => setForm({ ...form, borrower_phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Tanggal Pinjam <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={form.borrow_date}
                      onChange={(e) => setForm({ ...form, borrow_date: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Tanggal Kembali <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={form.return_date}
                      min={form.borrow_date}
                      onChange={(e) => setForm({ ...form, return_date: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Waktu Mulai
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Waktu Selesai
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Keperluan/Tujuan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    required
                    minLength={10}
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    rows={3}
                    placeholder="Jelaskan keperluan peminjaman (min. 10 karakter)..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Catatan Tambahan
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Catatan opsional..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || cart.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
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
      </main>
      <Footer />
    </div>
  );
}
