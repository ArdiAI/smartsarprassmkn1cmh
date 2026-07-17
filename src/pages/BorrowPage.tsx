import { useEffect, useState, useMemo } from 'react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Package, Building2,
  Loader2, CheckCircle2, Send, Calendar, Clock, Mail, Phone, User,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { getDefaultWorkflow } from '../lib/workflow';
import { showToast } from '../components/Toast';
import { cn } from '../utils/cn';

interface Category {
  name: string;
}

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
  category_id: string | null;
  quantity: number;
  condition: 'good' | 'fair' | 'poor';
  location: string | null;
  image_url: string | null;
  available_quantity: number;
  categories: Category | null;
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

type TabType = 'barang' | 'fasilitas';

interface CartItem {
  id: string;
  type: TabType;
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

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

const emptyForm: FormState = {
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
  const [tab, setTab] = useState<TabType>('barang');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const [inv, fac] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)')
            .order('created_at', { ascending: false }),
          supabase.from('facilities').select('*').order('created_at', { ascending: false }),
        ]);
        setInventory((inv.data as unknown as InventoryItem[]) || []);
        setFacilities((fac.data as unknown as Facility[]) || []);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Only show good condition items with available quantity
  const availableInventory = useMemo(
    () => inventory.filter((it) => it.condition === 'good' && (it.available_quantity ?? 0) > 0),
    [inventory]
  );

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return availableInventory;
    return availableInventory.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        (it.code || '').toLowerCase().includes(q) ||
        (it.categories?.name || '').toLowerCase().includes(q)
    );
  }, [availableInventory, search]);

  const filteredFacilities = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return facilities;
    return facilities.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description || '').toLowerCase().includes(q) ||
        (f.location || '').toLowerCase().includes(q)
    );
  }, [facilities, search]);

  const addToCart = (item: InventoryItem | Facility, type: TabType) => {
    const id = item.id;
    const name = item.name;
    const maxAvailable = type === 'barang' ? (item as InventoryItem).available_quantity : 1;
    setCart((prev) => {
      const existing = prev.find((c) => c.id === id && c.type === type);
      if (existing) {
        return prev.map((c) =>
          c.id === id && c.type === type
            ? { ...c, quantity: Math.min(c.maxAvailable, c.quantity + 1) }
            : c
        );
      }
      return [...prev, { id, type, name, quantity: 1, maxAvailable }];
    });
  };

  const updateQty = (id: string, type: TabType, delta: number) => {
    setCart((prev) =>
      prev.map((c) =>
        c.id === id && c.type === type
          ? { ...c, quantity: Math.max(1, Math.min(c.maxAvailable, c.quantity + delta)) }
          : c
      )
    );
  };

  const setQty = (id: string, type: TabType, value: number) => {
    setCart((prev) =>
      prev.map((c) =>
        c.id === id && c.type === type
          ? { ...c, quantity: Math.max(1, Math.min(c.maxAvailable, value)) }
          : c
      )
    );
  };

  const removeFromCart = (id: string, type: TabType) => {
    setCart((prev) => prev.filter((c) => !(c.id === id && c.type === type)));
  };

  const inCart = (id: string, type: TabType) =>
    cart.some((c) => c.id === id && c.type === type);

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): string | null => {
    if (cart.length === 0) return 'Keranjang masih kosong, pilih minimal satu item';
    if (!form.borrower_name.trim()) return 'Nama peminjam wajib diisi';
    if (!form.borrower_class.trim()) return 'Kelas/Unit wajib diisi';
    if (!form.borrower_email.trim()) return 'Email wajib diisi';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.borrower_email)) return 'Format email tidak valid';
    if (!form.borrow_date) return 'Tanggal pinjam wajib diisi';
    if (!form.return_date) return 'Tanggal kembali wajib diisi';
    if (form.return_date < form.borrow_date) return 'Tanggal kembali harus setelah tanggal pinjam';
    if (!form.purpose.trim()) return 'Keperluan wajib diisi';
    if (form.purpose.trim().length < 10) return 'Keperluan minimal 10 karakter';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      showToast(error, 'warning');
      return;
    }
    setSubmitting(true);
    try {
      // 1. Fetch default workflow
      const workflow = await getDefaultWorkflow();

      // 2. Determine item_type based on cart contents (use majority or first item)
      const hasBarang = cart.some((c) => c.type === 'barang');
      const hasFasilitas = cart.some((c) => c.type === 'fasilitas');
      const itemType: 'barang' | 'fasilitas' = hasBarang ? 'barang' : 'fasilitas';

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
        .select()
        .single();
      if (borrowingError) throw borrowingError;
      const borrowingId = (borrowingData as any).id;

      // 4. Insert each cart item into borrowing_items
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
        workflow_template_id: workflow?.id || null,
      }));
      const { error: itemsError } = await supabase.from('borrowing_items').insert(itemsPayload);
      if (itemsError) throw itemsError;

      // 5. Send email notification via edge function
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
        // Email failure should not block the submission
        console.warn('Failed to send email notification:', emailErr);
      }

      // 6. Success state
      setSuccess({
        borrowing_id: borrowingId,
        borrower_name: form.borrower_name.trim(),
        borrower_class: form.borrower_class.trim(),
        borrow_date: form.borrow_date,
        return_date: form.return_date,
        purpose: form.purpose.trim(),
        items: cart,
      });
      showToast('Pengajuan peminjaman berhasil dikirim!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengajukan peminjaman', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCart([]);
    setForm(emptyForm);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Ajukan Peminjaman</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Pilih barang atau fasilitas, lalu isi data peminjam untuk mengajukan peminjaman.
          </p>
        </div>

        {success ? (
          /* Success State */
          <div className="card p-8 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pengajuan Berhasil!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Pengajuan peminjaman Anda telah dikirim dan sedang menunggu persetujuan.
            </p>
            <div className="mt-6 text-left bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Nama</span>
                <span className="font-medium text-slate-900 dark:text-white">{success.borrower_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Kelas/Unit</span>
                <span className="font-medium text-slate-900 dark:text-white">{success.borrower_class}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Tanggal Pinjam</span>
                <span className="font-medium text-slate-900 dark:text-white">{success.borrow_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Tanggal Kembali</span>
                <span className="font-medium text-slate-900 dark:text-white">{success.return_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Keperluan</span>
                <span className="font-medium text-slate-900 dark:text-white text-right max-w-[60%]">{success.purpose}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400 mb-1">Item Dipinjam:</p>
                <ul className="space-y-1">
                  {success.items.map((it: CartItem, i: number) => (
                    <li key={i} className="text-slate-700 dark:text-slate-300">
                      • {it.name} × {it.quantity}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={resetForm}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Buat Peminjaman Lain
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left panel: selection */}
            <div className="lg:col-span-2 space-y-4">
              {/* Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setTab('barang')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors',
                    tab === 'barang'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  )}
                >
                  <Package className="w-4 h-4" />
                  Barang
                </button>
                <button
                  onClick={() => setTab('fasilitas')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors',
                    tab === 'fasilitas'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tab === 'barang' ? 'Cari barang...' : 'Cari fasilitas...'}
                  className="input pl-10"
                />
              </div>

              {/* Grid */}
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : tab === 'barang' ? (
                filteredItems.length === 0 ? (
                  <div className="card">
                    <EmptyState icon={Package} title="Tidak ada barang tersedia" description="Belum ada barang dengan kondisi baik dan stok tersedia." />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredItems.map((it) => (
                      <div key={it.id} className="card p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-white truncate">{it.name}</h3>
                          {it.categories?.name && (
                            <p className="text-xs text-blue-600 dark:text-blue-400">{it.categories.name}</p>
                          )}
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Tersedia: {it.available_quantity} / {it.quantity}
                          </p>
                        </div>
                        <button
                          onClick={() => addToCart(it, 'barang')}
                          disabled={inCart(it.id, 'barang')}
                          className={cn(
                            'flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap',
                            inCart(it.id, 'barang')
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          )}
                        >
                          {inCart(it.id, 'barang') ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Dipilih
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Tambah
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )
              ) : filteredFacilities.length === 0 ? (
                <div className="card">
                  <EmptyState icon={Building2} title="Tidak ada fasilitas" description="Belum ada data fasilitas." />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredFacilities.map((f) => (
                    <div key={f.id} className="card p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-medium text-slate-900 dark:text-white truncate">{f.name}</h3>
                        {f.location && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{f.location}</p>
                        )}
                        {f.capacity != null && (
                          <p className="text-xs text-slate-400 dark:text-slate-500">Kapasitas: {f.capacity}</p>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(f, 'fasilitas')}
                        disabled={inCart(f.id, 'fasilitas')}
                        className={cn(
                          'flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap',
                          inCart(f.id, 'fasilitas')
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        )}
                      >
                        {inCart(f.id, 'fasilitas') ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Dipilih
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Tambah
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right panel: cart + form */}
            <div className="lg:col-span-1">
              <form onSubmit={handleSubmit} className="card p-5 space-y-5 lg:sticky lg:top-20">
                {/* Cart */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingCart className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-slate-900 dark:text-white">Keranjang</h3>
                    {cart.length > 0 && (
                      <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{cart.length} item</span>
                    )}
                  </div>
                  {cart.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">
                      Belum ada item dipilih.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {cart.map((c) => (
                        <div key={`${c.type}-${c.id}`} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{c.type}</p>
                          </div>
                          {c.type === 'barang' ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateQty(c.id, c.type, -1)}
                                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                value={c.quantity}
                                onChange={(e) => setQty(c.id, c.type, parseInt(e.target.value) || 1)}
                                min={1}
                                max={c.maxAvailable}
                                className="w-12 text-center text-sm bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg py-1"
                              />
                              <button
                                type="button"
                                onClick={() => updateQty(c.id, c.type, 1)}
                                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">×1</span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFromCart(c.id, c.type)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Borrower form */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Data Peminjam</h3>
                  <div>
                    <label className="label">Nama Peminjam <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" value={form.borrower_name} onChange={(e) => update('borrower_name', e.target.value)} className="input pl-9" required />
                    </div>
                  </div>
                  <div>
                    <label className="label">Kelas/Unit <span className="text-red-500">*</span></label>
                    <input type="text" value={form.borrower_class} onChange={(e) => update('borrower_class', e.target.value)} className="input" required />
                  </div>
                  <div>
                    <label className="label">Email <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="email" value={form.borrower_email} onChange={(e) => update('borrower_email', e.target.value)} className="input pl-9" required />
                    </div>
                  </div>
                  <div>
                    <label className="label">No. Telepon</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" value={form.borrower_phone} onChange={(e) => update('borrower_phone', e.target.value)} className="input pl-9" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Tanggal Pinjam <span className="text-red-500">*</span></label>
                      <input type="date" value={form.borrow_date} onChange={(e) => update('borrow_date', e.target.value)} className="input" required />
                    </div>
                    <div>
                      <label className="label">Tanggal Kembali <span className="text-red-500">*</span></label>
                      <input type="date" value={form.return_date} min={form.borrow_date} onChange={(e) => update('return_date', e.target.value)} className="input" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Waktu Mulai</label>
                      <input type="time" value={form.start_time} onChange={(e) => update('start_time', e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="label">Waktu Selesai</label>
                      <input type="time" value={form.end_time} onChange={(e) => update('end_time', e.target.value)} className="input" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Keperluan/Tujuan <span className="text-red-500">*</span></label>
                    <textarea value={form.purpose} onChange={(e) => update('purpose', e.target.value)} rows={3} minLength={10} className="input resize-none" placeholder="Minimal 10 karakter..." required />
                  </div>
                  <div>
                    <label className="label">Catatan Tambahan</label>
                    <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} className="input resize-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Mengirim...
                    </>
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
        )}
      </main>
      <Footer />
    </div>
  );
}
