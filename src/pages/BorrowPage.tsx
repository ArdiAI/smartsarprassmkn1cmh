import { useEffect, useState, useMemo } from 'react';
import {
  ClipboardList, Search, Plus, Minus, Trash2, Package, Building2,
  Loader2, CheckCircle2, ShoppingCart, Send, Calendar, Clock, User,
  Mail, Phone, AlertCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { getDefaultWorkflow, WorkflowTemplate } from '../lib/workflow';
import { cn } from '../utils/cn';

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
  quantity: number;
  condition: 'good' | 'fair' | 'poor';
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
  facility_type: string | null;
}

interface CartItem {
  id: string;
  type: 'barang' | 'fasilitas';
  name: string;
  quantity: number;
  maxAvailable: number;
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

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/4226119/pexels-photo-4226119.jpeg?auto=compress&cs=tinysrgb&w=400';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

const emptyForm: FormState = {
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

export default function BorrowPage() {
  const [tab, setTab] = useState<'barang' | 'fasilitas'>('barang');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string; name: string; email: string; items: CartItem[] } | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [invRes, facRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('id, code, name, quantity, condition, location, image_url, available_quantity, categories!category_id(name)')
            .eq('condition', 'good')
            .gt('available_quantity', 0),
          supabase
            .from('facilities')
            .select('id, name, description, location, capacity, image_url, facility_type'),
        ]);
        if (invRes.error) throw invRes.error;
        if (facRes.error) throw facRes.error;
        setInventory((invRes.data as unknown as InventoryItem[]) || []);
        setFacilities((facRes.data as unknown as Facility[]) || []);
      } catch (err) {
        console.error('Failed to fetch borrow data:', err);
        showToast('Gagal memuat data. Muat ulang halaman.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filteredInventory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter((it) => it.name?.toLowerCase().includes(q) || it.code?.toLowerCase().includes(q));
  }, [inventory, search]);

  const filteredFacilities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter((f) => f.name?.toLowerCase().includes(q) || f.location?.toLowerCase().includes(q));
  }, [facilities, search]);

  const addToCart = (item: { id: string; name: string; available_quantity?: number | null; quantity?: number; capacity?: number | null }, type: 'barang' | 'fasilitas') => {
    const maxAvailable = type === 'barang' ? (item.available_quantity ?? item.quantity ?? 1) : (item.capacity ?? 1);
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id && c.type === type);
      if (existing) {
        if (existing.quantity >= maxAvailable) {
          showToast('Mencapai batas maksimum tersedia', 'warning');
          return prev;
        }
        return prev.map((c) => (c.id === item.id && c.type === type ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { id: item.id, type, name: item.name, quantity: 1, maxAvailable }];
    });
  };

  const updateQty = (id: string, type: 'barang' | 'fasilitas', delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.id === id && c.type === type) {
          const next = c.quantity + delta;
          if (next < 1) return c;
          if (next > c.maxAvailable) {
            showToast('Mencapai batas maksimum tersedia', 'warning');
            return c;
          }
          return { ...c, quantity: next };
        }
        return c;
      })
    );
  };

  const removeFromCart = (id: string, type: 'barang' | 'fasilitas') => {
    setCart((prev) => prev.filter((c) => !(c.id === id && c.type === type)));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.borrower_name.trim()) e.borrower_name = 'Nama wajib diisi';
    if (!form.borrower_class.trim()) e.borrower_class = 'Kelas/Unit wajib diisi';
    if (!form.borrower_email.trim()) e.borrower_email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.borrower_email)) e.borrower_email = 'Format email tidak valid';
    if (!form.borrow_date) e.borrow_date = 'Tanggal pinjam wajib diisi';
    if (!form.return_date) e.return_date = 'Tanggal kembali wajib diisi';
    else if (form.borrow_date && form.return_date < form.borrow_date) e.return_date = 'Tanggal kembali harus setelah tanggal pinjam';
    if (!form.purpose.trim()) e.purpose = 'Keperluan wajib diisi';
    else if (form.purpose.trim().length < 10) e.purpose = 'Keperluan minimal 10 karakter';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('Keranjang masih kosong. Pilih minimal 1 item.', 'warning');
      return;
    }
    if (!validate()) {
      showToast('Mohon lengkapi semua field yang wajib diisi', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      // 1. Fetch default workflow
      const workflow: WorkflowTemplate | null = await getDefaultWorkflow();
      const workflowId = workflow?.id ?? null;

      // 2. Determine item_type from cart (use first item's type or 'barang' if mixed)
      const primaryType: 'barang' | 'fasilitas' = cart[0]?.type ?? 'barang';

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
        status: 'pending' as const,
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        item_type: primaryType,
        workflow_template_id: workflowId,
      };
      const { data: borrowingData, error: borrowingError } = await supabase
        .from('borrowings')
        .insert(borrowingPayload)
        .select('id')
        .single();
      if (borrowingError) throw borrowingError;
      const borrowingId = (borrowingData as unknown as { id: string }).id;

      // 4. Insert each cart item into borrowing_items
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
        workflow_template_id: workflowId,
      }));
      const { error: itemsError } = await supabase
        .from('borrowing_items')
        .insert(itemPayloads);
      if (itemsError) throw itemsError;

      // 5. POST to edge function for email
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
        console.warn('Email notification failed (non-blocking):', emailErr);
      }

      // 6. Success state
      setSubmitted({
        id: borrowingId,
        name: form.borrower_name.trim(),
        email: form.borrower_email.trim(),
        items: cart,
      });
      setCart([]);
      setForm(emptyForm);
      setErrors({});
      showToast('Pengajuan peminjaman berhasil dikirim!', 'success');
    } catch (err) {
      console.error('Failed to submit borrowing:', err);
      showToast('Gagal mengirim pengajuan. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleAnother = () => {
    setSubmitted(null);
  };

  const cartCount = cart.length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            Ajukan Peminjaman
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 ml-13">
            Pilih barang atau fasilitas, isi data, lalu kirim pengajuan.
          </p>
        </div>

        {/* Success state */}
        {submitted ? (
          <div className="max-w-xl mx-auto card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pengajuan Terkirim!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Pengajuan peminjaman Anda telah berhasil dikirim dan sedang menunggu persetujuan. Notifikasi akan dikirim ke email Anda.
            </p>
            <div className="text-left bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">ID Pengajuan</span><span className="font-mono text-xs text-slate-700 dark:text-slate-200">{submitted.id.slice(0, 8)}...</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Peminjam</span><span className="font-medium text-slate-700 dark:text-slate-200">{submitted.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium text-slate-700 dark:text-slate-200">{submitted.email}</span></div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                <p className="text-slate-500 mb-1">Item:</p>
                {submitted.items.map((it, i) => (
                  <p key={i} className="text-slate-700 dark:text-slate-200">• {it.name} × {it.quantity}</p>
                ))}
              </div>
            </div>
            <button onClick={handleAnother} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Buat Pengajuan Lain
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Selection */}
            <div className="lg:col-span-2 space-y-4">
              {/* Tabs */}
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                <button
                  onClick={() => setTab('barang')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2',
                    tab === 'barang' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  <Package className="w-4 h-4" /> Barang
                </button>
                <button
                  onClick={() => setTab('fasilitas')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2',
                    tab === 'fasilitas' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  <Building2 className="w-4 h-4" /> Fasilitas
                </button>
              </div>

              {/* Search */}
              <div className="relative max-w-md">
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
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="card p-4 animate-pulse">
                      <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3" />
                      <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                      <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                  ))}
                </div>
              ) : tab === 'barang' ? (
                filteredInventory.length === 0 ? (
                  <div className="card p-8">
                    <EmptyState icon={Package} title="Tidak ada barang tersedia" description="Belum ada barang dengan kondisi baik dan stok tersedia." />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredInventory.map((it) => {
                      const inCart = cart.find((c) => c.id === it.id && c.type === 'barang');
                      const available = it.available_quantity ?? it.quantity;
                      return (
                        <div key={it.id} className="card p-4 flex items-center gap-3">
                          <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                            <img src={it.image_url || FALLBACK_IMAGE} alt={it.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-slate-900 dark:text-white text-sm truncate">{it.name}</h3>
                            {it.categories?.name && <p className="text-xs text-slate-400">{it.categories.name}</p>}
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tersedia: {available} unit</p>
                          </div>
                          <button
                            onClick={() => addToCart(it, 'barang')}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 inline-flex items-center gap-1',
                              inCart ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-blue-500 text-white hover:bg-blue-600'
                            )}
                          >
                            {inCart ? <><CheckCircle2 className="w-3.5 h-3.5" /> {inCart.quantity}</> : <><Plus className="w-3.5 h-3.5" /> Tambah</>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : filteredFacilities.length === 0 ? (
                <div className="card p-8">
                  <EmptyState icon={Building2} title="Tidak ada fasilitas tersedia" description="Belum ada fasilitas yang terdaftar." />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredFacilities.map((f) => {
                    const inCart = cart.find((c) => c.id === f.id && c.type === 'fasilitas');
                    return (
                      <div key={f.id} className="card p-4 flex items-center gap-3">
                        <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                          <img src={f.image_url || FALLBACK_IMAGE} alt={f.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-white text-sm truncate">{f.name}</h3>
                          {f.location && <p className="text-xs text-slate-400 truncate">{f.location}</p>}
                          {f.capacity != null && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kapasitas: {f.capacity}</p>}
                        </div>
                        <button
                          onClick={() => addToCart(f, 'fasilitas')}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 inline-flex items-center gap-1',
                            inCart ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-blue-500 text-white hover:bg-blue-600'
                          )}
                        >
                          {inCart ? <><CheckCircle2 className="w-3.5 h-3.5" /> Dipilih</> : <><Plus className="w-3.5 h-3.5" /> Pilih</>}
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
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-blue-500" /> Keranjang
                      {cartCount > 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500 text-white">{cartCount}</span>}
                    </h3>
                    {cart.length > 0 && (
                      <button onClick={() => setCart([])} className="text-xs text-red-500 hover:underline">Kosongkan</button>
                    )}
                  </div>
                  {cart.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Keranjang kosong. Pilih item dari kiri.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {cart.map((c) => (
                        <div key={`${c.type}-${c.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                            <p className="text-xs text-slate-400 capitalize">{c.type}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateQty(c.id, c.type, -1)} className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-slate-700 dark:text-slate-200">{c.quantity}</span>
                            <button onClick={() => updateQty(c.id, c.type, 1)} className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600">
                              <Plus className="w-3 h-3" />
                            </button>
                            <button onClick={() => removeFromCart(c.id, c.type)} className="w-6 h-6 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center ml-1">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Borrower form */}
                <form onSubmit={handleSubmit} className="card p-4 space-y-3">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Data Peminjam</h3>

                  <div>
                    <label className="label text-xs">Nama Peminjam <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" value={form.borrower_name} onChange={(e) => handleChange('borrower_name', e.target.value)} className={cn('input pl-9 text-sm', errors.borrower_name && 'border-red-400')} placeholder="Nama lengkap" />
                    </div>
                    {errors.borrower_name && <p className="text-xs text-red-500 mt-0.5">{errors.borrower_name}</p>}
                  </div>

                  <div>
                    <label className="label text-xs">Kelas/Unit <span className="text-red-500">*</span></label>
                    <input type="text" value={form.borrower_class} onChange={(e) => handleChange('borrower_class', e.target.value)} className={cn('input text-sm', errors.borrower_class && 'border-red-400')} placeholder="Contoh: XII IPA 1" />
                    {errors.borrower_class && <p className="text-xs text-red-500 mt-0.5">{errors.borrower_class}</p>}
                  </div>

                  <div>
                    <label className="label text-xs">Email <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="email" value={form.borrower_email} onChange={(e) => handleChange('borrower_email', e.target.value)} className={cn('input pl-9 text-sm', errors.borrower_email && 'border-red-400')} placeholder="email@contoh.com" />
                    </div>
                    {errors.borrower_email && <p className="text-xs text-red-500 mt-0.5">{errors.borrower_email}</p>}
                  </div>

                  <div>
                    <label className="label text-xs">No. Telepon <span className="text-slate-400 text-[10px]">(opsional)</span></label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" value={form.borrower_phone} onChange={(e) => handleChange('borrower_phone', e.target.value)} className="input pl-9 text-sm" placeholder="08xxxxxxxxxx" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label text-xs">Tanggal Pinjam <span className="text-red-500">*</span></label>
                      <input type="date" value={form.borrow_date} onChange={(e) => handleChange('borrow_date', e.target.value)} className={cn('input text-sm', errors.borrow_date && 'border-red-400')} />
                      {errors.borrow_date && <p className="text-xs text-red-500 mt-0.5">{errors.borrow_date}</p>}
                    </div>
                    <div>
                      <label className="label text-xs">Tanggal Kembali <span className="text-red-500">*</span></label>
                      <input type="date" value={form.return_date} min={form.borrow_date} onChange={(e) => handleChange('return_date', e.target.value)} className={cn('input text-sm', errors.return_date && 'border-red-400')} />
                      {errors.return_date && <p className="text-xs text-red-500 mt-0.5">{errors.return_date}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label text-xs">Waktu Mulai</label>
                      <input type="time" value={form.start_time} onChange={(e) => handleChange('start_time', e.target.value)} className="input text-sm" />
                    </div>
                    <div>
                      <label className="label text-xs">Waktu Selesai</label>
                      <input type="time" value={form.end_time} onChange={(e) => handleChange('end_time', e.target.value)} className="input text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="label text-xs">Keperluan/Tujuan <span className="text-red-500">*</span></label>
                    <textarea value={form.purpose} onChange={(e) => handleChange('purpose', e.target.value)} rows={3} className={cn('input text-sm resize-none', errors.purpose && 'border-red-400')} placeholder="Jelaskan keperluan peminjaman (min. 10 karakter)" />
                    {errors.purpose && <p className="text-xs text-red-500 mt-0.5">{errors.purpose}</p>}
                  </div>

                  <div>
                    <label className="label text-xs">Catatan Tambahan <span className="text-slate-400 text-[10px]">(opsional)</span></label>
                    <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={2} className="input text-sm resize-none" placeholder="Catatan tambahan..." />
                  </div>

                  <button type="submit" disabled={submitting || cart.length === 0} className="btn-primary w-full inline-flex items-center justify-center gap-2 text-sm">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</> : <><Send className="w-4 h-4" /> Kirim Pengajuan</>}
                  </button>
                  {cart.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 text-center inline-flex items-center justify-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Pilih minimal 1 item untuk mengirim
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1" />
      <Footer />
    </div>
  );
}
