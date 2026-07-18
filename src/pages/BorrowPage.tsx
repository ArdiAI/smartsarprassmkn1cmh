import { useEffect, useState, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { getDefaultWorkflow } from '../lib/workflow';
import { showToast } from '../components/Toast';
import {
  ClipboardList, Search, Loader2, Package, Building2, Plus, Minus,
  Trash2, ShoppingCart, User, Mail, Phone, Calendar, Clock, FileText,
  CheckCircle, Send, ArrowLeft, AlertCircle,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
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
}

interface CartItem {
  id: string;
  type: 'barang' | 'fasilitas';
  name: string;
  quantity: number;
  maxQuantity: number;
  location: string | null;
}

interface BorrowingFormData {
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

const today = new Date().toISOString().split('T')[0];

const initialForm: BorrowingFormData = {
  borrower_name: '',
  borrower_class: '',
  borrower_email: '',
  borrower_phone: '',
  borrow_date: today,
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
  const [form, setForm] = useState<BorrowingFormData>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string; name: string; items: CartItem[] } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [invRes, facRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)')
            .order('created_at', { ascending: false }),
          supabase.from('facilities').select('*').order('created_at', { ascending: false }),
        ]);

        if (invRes.error) throw invRes.error;
        if (facRes.error) throw facRes.error;

        // Only show available, good condition items
        const availableInv = (invRes.data as unknown as InventoryItem[])?.filter(
          item => item.available_quantity > 0 && item.condition === 'good'
        ) || [];
        setInventory(availableInv);
        setFacilities((facRes.data as unknown as Facility[]) || []);
      } catch (e) {
        console.error(e);
        showToast('Gagal memuat data', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredInventory = useMemo(() =>
    inventory.filter(item =>
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code?.toLowerCase().includes(search.toLowerCase()) ||
      item.categories?.name?.toLowerCase().includes(search.toLowerCase())
    ), [inventory, search]);

  const filteredFacilities = useMemo(() =>
    facilities.filter(f =>
      !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.location?.toLowerCase().includes(search.toLowerCase()) ||
      f.facility_type?.toLowerCase().includes(search.toLowerCase())
    ), [facilities, search]);

  const addToCart = (item: InventoryItem | Facility, type: 'barang' | 'fasilitas') => {
    const id = item.id;
    const name = type === 'barang' ? (item as InventoryItem).name : (item as Facility).name;
    const maxQuantity = type === 'barang' ? (item as InventoryItem).available_quantity : 1;
    const location = type === 'barang' ? (item as InventoryItem).location : (item as Facility).location;

    setCart(prev => {
      const existing = prev.find(c => c.id === id && c.type === type);
      if (existing) {
        if (existing.quantity >= maxQuantity) {
          showToast('Jumlah sudah mencapai maksimum', 'warning');
          return prev;
        }
        return prev.map(c => c.id === id && c.type === type ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { id, type, name, quantity: 1, maxQuantity, location }];
    });
  };

  const updateQuantity = (id: string, type: 'barang' | 'fasilitas', delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.id === id && c.type === type) {
        const newQty = c.quantity + delta;
        if (newQty < 1) return c;
        if (newQty > c.maxQuantity) {
          showToast('Jumlah melebihi ketersediaan', 'warning');
          return c;
        }
        return { ...c, quantity: newQty };
      }
      return c;
    }));
  };

  const removeFromCart = (id: string, type: 'barang' | 'fasilitas') => {
    setCart(prev => prev.filter(c => !(c.id === id && c.type === type)));
  };

  const updateField = (field: keyof BorrowingFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (cart.length === 0) e.cart = 'Keranjang masih kosong';
    if (!form.borrower_name.trim()) e.borrower_name = 'Nama wajib diisi';
    if (!form.borrower_class.trim()) e.borrower_class = 'Kelas/Unit wajib diisi';
    if (!form.borrower_email.trim()) e.borrower_email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.borrower_email)) e.borrower_email = 'Format email tidak valid';
    if (!form.borrow_date) e.borrow_date = 'Tanggal pinjam wajib diisi';
    if (!form.return_date) e.return_date = 'Tanggal kembali wajib diisi';
    else if (form.borrow_date && form.return_date <= form.borrow_date) e.return_date = 'Tanggal kembali harus setelah tanggal pinjam';
    if (!form.purpose.trim()) e.purpose = 'Keperluan wajib diisi';
    else if (form.purpose.trim().length < 10) e.purpose = 'Keperluan minimal 10 karakter';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Mohon lengkapi semua field yang wajib diisi', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Fetch default workflow
      const workflow = await getDefaultWorkflow();

      // 2. Determine primary item type
      const primaryType = cart.some(c => c.type === 'fasilitas') && !cart.some(c => c.type === 'barang')
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
        .select('id')
        .single();

      if (borrowingError) throw borrowingError;
      const borrowingId = (borrowingData as any).id;

      // 4. Insert borrowing items
      const itemPayloads = cart.map(item => ({
        borrowing_id: borrowingId,
        inventory_id: item.type === 'barang' ? item.id : null,
        facility_id: item.type === 'fasilitas' ? item.id : null,
        item_type: item.type,
        item_name: item.name,
        quantity: item.quantity,
        status: 'pending',
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        workflow_template_id: workflow?.id ?? null,
      }));

      const { error: itemsError } = await supabase
        .from('borrowing_items')
        .insert(itemPayloads);

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
        console.error('Failed to send email:', emailErr);
      }

      // 6. Show success state
      setSuccessData({ id: borrowingId, name: form.borrower_name, items: [...cart] });
      showToast('Pengajuan peminjaman berhasil dikirim!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengirim pengajuan. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCart([]);
    setForm(initialForm);
    setErrors({});
    setSuccessData(null);
  };

  // Success state
  if (successData) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pengajuan Berhasil Dikirim!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Pengajuan peminjaman Anda telah dikirim dan menunggu persetujuan.
              Anda akan menerima notifikasi melalui email.
            </p>

            <div className="text-left max-w-md mx-auto space-y-3 p-5 rounded-xl bg-slate-50 dark:bg-slate-700/30 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Nama Peminjam</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{successData.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">ID Peminjaman</span>
                <span className="text-sm font-mono text-slate-900 dark:text-white truncate ml-2 max-w-[200px]">{successData.id}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Item Dipinjam:</p>
                <div className="space-y-1.5">
                  {successData.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-900 dark:text-white">{item.type === 'fasilitas' ? '🏢' : '📦'} {item.name}</span>
                      <span className="text-slate-500 dark:text-slate-400">× {item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" /> Buat Peminjaman Lain
            </button>
          </div>
        </div>
        <div className="flex-1" />
        <Footer />
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
          <p className="text-slate-500 dark:text-slate-400 mt-1">Pilih barang atau fasilitas yang ingin dipinjam</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              <button
                onClick={() => setActiveTab('barang')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'barang'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
              >
                <Package className="w-4 h-4" /> Barang
              </button>
              <button
                onClick={() => setActiveTab('fasilitas')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'fasilitas'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
              >
                <Building2 className="w-4 h-4" /> Fasilitas
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'barang' ? 'Cari barang...' : 'Cari fasilitas...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="card p-4 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                        <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'barang' ? (
              filteredInventory.length === 0 ? (
                <EmptyState icon={Package} title="Tidak ada barang tersedia" description="Semua barang sedang dipinjam atau tidak tersedia" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredInventory.map(item => {
                    const inCart = cart.find(c => c.id === item.id && c.type === 'barang');
                    return (
                      <div key={item.id} className="card p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-6 h-6 text-slate-300 dark:text-slate-500" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-slate-900 dark:text-white truncate">{item.name}</h3>
                            {item.categories?.name && (
                              <p className="text-xs text-slate-400 dark:text-slate-500">{item.categories.name}</p>
                            )}
                            {item.location && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">📍 {item.location}</p>
                            )}
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                              Tersedia: {item.available_quantity}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => addToCart(item, 'barang')}
                          disabled={inCart?.quantity === item.available_quantity}
                          className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {inCart ? (
                            <><CheckCircle className="w-4 h-4" /> Di Keranjang ({inCart.quantity})</>
                          ) : (
                            <><Plus className="w-4 h-4" /> Tambah</>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredFacilities.length === 0 ? (
              <EmptyState icon={Building2} title="Tidak ada fasilitas tersedia" description="Belum ada fasilitas yang dapat dipinjam" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredFacilities.map(facility => {
                  const inCart = cart.find(c => c.id === facility.id && c.type === 'fasilitas');
                  return (
                    <div key={facility.id} className="card p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                          {facility.image_url ? (
                            <img src={facility.image_url} alt={facility.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-slate-300 dark:text-slate-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-white truncate">{facility.name}</h3>
                          {facility.facility_type && (
                            <p className="text-xs text-slate-400 dark:text-slate-500">{facility.facility_type}</p>
                          )}
                          {facility.location && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">📍 {facility.location}</p>
                          )}
                          {facility.capacity != null && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">👥 Kapasitas: {facility.capacity}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => addToCart(facility, 'fasilitas')}
                        disabled={!!inCart}
                        className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {inCart ? (
                          <><CheckCircle className="w-4 h-4" /> Di Keranjang</>
                        ) : (
                          <><Plus className="w-4 h-4" /> Tambah</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Cart & Form */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-20 space-y-4">
              {/* Cart */}
              <div className="card p-5">
                <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-500" /> Keranjang ({cart.length})
                </h2>
                {cart.length === 0 ? (
                  <div className="text-center py-6">
                    <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Keranjang masih kosong</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Pilih item dari kiri untuk menambahkan</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {cart.map(item => (
                      <div key={`${item.type}-${item.id}`} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {item.type === 'fasilitas' ? '🏢' : '📦'} {item.name}
                          </p>
                          {item.location && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">📍 {item.location}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {item.type === 'barang' ? (
                            <>
                              <button
                                onClick={() => updateQuantity(item.id, item.type, -1)}
                                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-500 transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-sm font-medium text-slate-900 dark:text-white w-6 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.type, 1)}
                                disabled={item.quantity >= item.maxQuantity}
                                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 px-2">1 slot</span>
                          )}
                          <button
                            onClick={() => removeFromCart(item.id, item.type)}
                            className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {errors.cart && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.cart}
                  </p>
                )}
              </div>

              {/* Borrower Form */}
              <form onSubmit={handleSubmit} className="card p-5 space-y-4">
                <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" /> Data Peminjam
                </h2>

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Nama Peminjam <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.borrower_name}
                    onChange={e => updateField('borrower_name', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Nama lengkap"
                  />
                  {errors.borrower_name && <p className="text-xs text-red-500 mt-1">{errors.borrower_name}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Kelas/Unit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.borrower_class}
                    onChange={e => updateField('borrower_class', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Contoh: 10A, Unit TU"
                  />
                  {errors.borrower_class && <p className="text-xs text-red-500 mt-1">{errors.borrower_class}</p>}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.borrower_email}
                      onChange={e => updateField('borrower_email', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="email@example.com"
                    />
                    {errors.borrower_email && <p className="text-xs text-red-500 mt-1">{errors.borrower_email}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      No. Telepon <span className="text-slate-400 text-xs">(opsional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.borrower_phone}
                      onChange={e => updateField('borrower_phone', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Tgl Pinjam <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.borrow_date}
                      onChange={e => updateField('borrow_date', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    {errors.borrow_date && <p className="text-xs text-red-500 mt-1">{errors.borrow_date}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Tgl Kembali <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.return_date}
                      min={form.borrow_date}
                      onChange={e => updateField('return_date', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    {errors.return_date && <p className="text-xs text-red-500 mt-1">{errors.return_date}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Waktu Mulai
                    </label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={e => updateField('start_time', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Waktu Selesai
                    </label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={e => updateField('end_time', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Keperluan/Tujuan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.purpose}
                    onChange={e => updateField('purpose', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                    placeholder="Jelaskan keperluan peminjaman (min. 10 karakter)"
                  />
                  {errors.purpose && <p className="text-xs text-red-500 mt-1">{errors.purpose}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Catatan Tambahan <span className="text-slate-400 text-xs">(opsional)</span>
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={e => updateField('notes', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                    placeholder="Catatan tambahan (opsional)"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Mengirim...</>
                  ) : (
                    <><Send className="w-5 h-5" /> Ajukan Peminjaman</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1" />
      <Footer />
    </div>
  );
}
