import { useEffect, useState, FormEvent } from 'react';
import {
  ClipboardList,
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
  CheckCircle2,
  ArrowLeft,
  Tag,
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
  category: string;
  status: string;
}

interface CartItem {
  id: string;
  type: 'barang' | 'fasilitas';
  name: string;
  quantity: number;
  maxQuantity: number;
}

interface FormState {
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

const todayStr = () => new Date().toISOString().split('T')[0];

const initialForm: FormState = {
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
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string; name: string; items: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, facRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)')
            .eq('condition', 'good')
            .order('created_at', { ascending: false }),
          supabase
            .from('facilities')
            .select('*')
            .order('created_at', { ascending: false }),
        ]);

        const invData = ((invRes.data as unknown as InventoryItem[]) || []).filter(
          (i) => (i.available_quantity ?? 0) > 0
        );
        setInventory(invData);
        setFacilities((facRes.data as unknown as Facility[]) || []);
      } catch (e) {
        console.error('Failed to fetch data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredInventory = inventory.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.code?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredFacilities = facilities.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.location?.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (item: InventoryItem | Facility, type: 'barang' | 'fasilitas') => {
    const cartId = `${type}-${item.id}`;
    const existing = cart.find((c) => c.id === cartId);
    if (existing) {
      showToast('Item sudah ada di keranjang', 'info');
      return;
    }
    const maxQty = type === 'barang' ? (item as InventoryItem).available_quantity : 1;
    setCart((prev) => [...prev, { id: cartId, type, name: item.name, quantity: 1, maxQuantity: maxQty }]);
    showToast(`${item.name} ditambahkan ke keranjang`, 'success');
  };

  const updateQty = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.id !== cartId) return c;
        const newQty = Math.max(1, Math.min(c.maxQuantity, c.quantity + delta));
        return { ...c, quantity: newQty };
      })
    );
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((c) => c.id !== cartId));
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): boolean => {
    if (cart.length === 0) {
      showToast('Keranjang masih kosong', 'warning');
      return false;
    }
    if (!form.borrower_name.trim()) {
      showToast('Nama peminjam wajib diisi', 'warning');
      return false;
    }
    if (!form.borrower_class.trim()) {
      showToast('Kelas/Unit wajib diisi', 'warning');
      return false;
    }
    if (!form.borrower_email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.borrower_email)) {
      showToast('Email tidak valid', 'warning');
      return false;
    }
    if (!form.borrow_date) {
      showToast('Tanggal pinjam wajib diisi', 'warning');
      return false;
    }
    if (!form.return_date) {
      showToast('Tanggal kembali wajib diisi', 'warning');
      return false;
    }
    if (form.return_date < form.borrow_date) {
      showToast('Tanggal kembali harus setelah tanggal pinjam', 'warning');
      return false;
    }
    if (form.purpose.trim().length < 10) {
      showToast('Keperluan minimal 10 karakter', 'warning');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      // Fetch default workflow
      const workflow = await getDefaultWorkflow();

      // Determine item_type based on cart contents (use first item's type or 'barang' if mixed)
      const itemType = cart.every((c) => c.type === 'fasilitas') ? 'fasilitas' : 'barang';

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
        status: 'pending' as const,
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        item_type: itemType,
        workflow_template_id: workflow?.id ?? null,
      };

      const { data: borrowingData, error: borrowingError } = await supabase
        .from('borrowings')
        .insert(borrowingPayload)
        .select('*')
        .single();

      if (borrowingError) throw borrowingError;

      const borrowingId = (borrowingData as unknown as { id: string }).id;

      // Insert borrowing_items
      const itemsToInsert = cart.map((c) => {
        const parts = c.id.split('-');
        const id = parts.slice(1).join('-');
        const isFacility = c.type === 'fasilitas';
        return {
          borrowing_id: borrowingId,
          inventory_id: isFacility ? null : id,
          facility_id: isFacility ? id : null,
          item_type: c.type,
          item_name: c.name,
          quantity: c.quantity,
          status: 'pending',
          current_step: 1,
          current_status_label: 'Menunggu Persetujuan',
          workflow_template_id: workflow?.id ?? null,
        };
      });

      const { error: itemsError } = await supabase
        .from('borrowing_items')
        .insert(itemsToInsert);

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
        console.error('Failed to send email:', emailErr);
      }

      setSuccessData({ id: borrowingId, name: form.borrower_name, items: cart.length });
      showToast('Pengajuan peminjaman berhasil dikirim!', 'success');
      setCart([]);
      setForm(initialForm);
    } catch (err) {
      console.error('Failed to submit borrowing:', err);
      showToast('Gagal mengirim pengajuan. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetSuccess = () => {
    setSuccessData(null);
  };

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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ajukan Peminjaman</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-13">
            Pilih barang atau fasilitas, lalu isi formulir peminjaman.
          </p>
        </div>

        {successData ? (
          /* Success State */
          <div className="card p-8 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pengajuan Berhasil!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Pengajuan peminjaman Anda telah berhasil dikirim dan sedang menunggu persetujuan.
            </p>
            <div className="text-left space-y-2 mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">ID Pengajuan:</span>
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{successData.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Peminjam:</span>
                <span className="font-medium text-slate-900 dark:text-white">{successData.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Jumlah Item:</span>
                <span className="font-medium text-slate-900 dark:text-white">{successData.items} item</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Status:</span>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  Menunggu Persetujuan
                </span>
              </div>
            </div>
            <button onClick={resetSuccess} className="btn-primary inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Buat Pengajuan Lain
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Selection */}
            <div className="lg:col-span-2 space-y-4">
              {/* Tabs */}
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  onClick={() => setTab('barang')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    tab === 'barang'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  )}
                >
                  <Package className="w-4 h-4" />
                  Barang
                </button>
                <button
                  onClick={() => setTab('fasilitas')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    tab === 'fasilitas'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  )}
                >
                  <Building2 className="w-4 h-4" />
                  Fasilitas
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder={tab === 'barang' ? 'Cari barang...' : 'Cari fasilitas...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>

              {/* Grid */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="card p-4 animate-pulse">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-3" />
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                    </div>
                  ))}
                </div>
              ) : tab === 'barang' ? (
                filteredInventory.length === 0 ? (
                  <EmptyState icon={Package} title="Tidak ada barang tersedia" description="Barang yang tersedia untuk dipinjam akan muncul di sini." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredInventory.map((item) => {
                      const inCart = cart.some((c) => c.id === `barang-${item.id}`);
                      return (
                        <div key={item.id} className="card p-4 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{item.name}</h3>
                            {item.categories?.name && (
                              <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                                <Tag className="w-3 h-3" />
                                <span>{item.categories.name}</span>
                              </div>
                            )}
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Tersedia: <span className="font-semibold text-blue-600 dark:text-blue-400">{item.available_quantity}</span>
                            </p>
                          </div>
                          <button
                            onClick={() => addToCart(item, 'barang')}
                            disabled={inCart}
                            className={cn(
                              'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium flex-shrink-0 transition-colors',
                              inCart
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            )}
                          >
                            {inCart ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {inCart ? 'Ditambah' : 'Tambah'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : filteredFacilities.length === 0 ? (
                <EmptyState icon={Building2} title="Tidak ada fasilitas tersedia" description="Fasilitas yang tersedia akan muncul di sini." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredFacilities.map((f) => {
                    const inCart = cart.some((c) => c.id === `fasilitas-${f.id}`);
                    return (
                      <div key={f.id} className="card p-4 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{f.name}</h3>
                          {f.location && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{f.location}</p>
                          )}
                          {f.capacity != null && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Kapasitas: {f.capacity} orang
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => addToCart(f, 'fasilitas')}
                          disabled={inCart}
                          className={cn(
                            'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium flex-shrink-0 transition-colors',
                            inCart
                              ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          )}
                        >
                          {inCart ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          {inCart ? 'Ditambah' : 'Tambah'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Panel: Cart + Form */}
            <div className="lg:col-span-1">
              <div className="card p-5 sticky top-20">
                {/* Cart Header */}
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-5 h-5 text-blue-500" />
                  <h2 className="font-bold text-slate-900 dark:text-white">Keranjang</h2>
                  {cart.length > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {cart.length} item
                    </span>
                  )}
                </div>

                {/* Cart Items */}
                {cart.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">Keranjang kosong</p>
                ) : (
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                    {cart.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                          <p className="text-xs text-slate-400 capitalize">{c.type}</p>
                        </div>
                        {c.type === 'barang' && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => updateQty(c.id, -1)}
                              className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-semibold w-6 text-center">{c.quantity}</span>
                            <button
                              onClick={() => updateQty(c.id, 1)}
                              disabled={c.quantity >= c.maxQuantity}
                              className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-40"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => removeFromCart(c.id)}
                          className="p-1 text-red-400 hover:text-red-500 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Borrower Form */}
                <form onSubmit={handleSubmit} className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                  <div>
                    <label className="label">Nama Peminjam <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={form.borrower_name}
                        onChange={(e) => handleChange('borrower_name', e.target.value)}
                        className="input pl-9"
                        placeholder="Nama lengkap"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Kelas/Unit <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={form.borrower_class}
                      onChange={(e) => handleChange('borrower_class', e.target.value)}
                      className="input"
                      placeholder="Kelas atau unit"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Email <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={form.borrower_email}
                        onChange={(e) => handleChange('borrower_email', e.target.value)}
                        className="input pl-9"
                        placeholder="email@contoh.com"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">No. Telepon</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={form.borrower_phone}
                        onChange={(e) => handleChange('borrower_phone', e.target.value)}
                        className="input pl-9"
                        placeholder="08xxxxxxxxxx (opsional)"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Tgl Pinjam <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          value={form.borrow_date}
                          onChange={(e) => handleChange('borrow_date', e.target.value)}
                          className="input pl-9"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Tgl Kembali <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          value={form.return_date}
                          min={form.borrow_date}
                          onChange={(e) => handleChange('return_date', e.target.value)}
                          className="input pl-9"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Waktu Mulai</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="time"
                          value={form.start_time}
                          onChange={(e) => handleChange('start_time', e.target.value)}
                          className="input pl-9"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Waktu Selesai</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="time"
                          value={form.end_time}
                          onChange={(e) => handleChange('end_time', e.target.value)}
                          className="input pl-9"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="label">Keperluan/Tujuan <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <textarea
                        value={form.purpose}
                        onChange={(e) => handleChange('purpose', e.target.value)}
                        className="input pl-9 min-h-[80px] resize-y"
                        placeholder="Jelaskan keperluan peminjaman (min. 10 karakter)"
                        required
                        minLength={10}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Catatan Tambahan</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      className="input min-h-[60px] resize-y"
                      placeholder="Catatan tambahan (opsional)"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || cart.length === 0}
                    className="btn-primary w-full inline-flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <ClipboardList className="w-4 h-4" />
                        Ajukan Peminjaman
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
