import { useEffect, useState, useMemo } from 'react';
import {
  ClipboardList, Search, Plus, Minus, Trash2, Package, Building2,
  Loader2, CheckCircle2, RotateCcw, ShoppingCart, Calendar, Clock,
  User, Mail, Phone, FileText, AlertCircle, Send,
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
  name: string;
  description: string | null;
  quantity: number;
  available_quantity: number;
  condition: string;
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

interface BorrowingResult {
  id: string;
  borrower_name: string;
  borrow_date: string;
  return_date: string;
  items: CartItem[];
}

type Tab = 'barang' | 'fasilitas';

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

const emptyForm: FormState = {
  borrower_name: '',
  borrower_class: '',
  borrower_email: '',
  borrower_phone: '',
  borrow_date: new Date().toISOString().split('T')[0],
  return_date: '',
  start_time: '08:00',
  end_time: '16:00',
  purpose: '',
  notes: '',
};

export default function BorrowPage() {
  const [tab, setTab] = useState<Tab>('barang');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<BorrowingResult | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [invRes, facRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('id, name, description, quantity, available_quantity, condition, location')
            .order('name', { ascending: true }),
          supabase
            .from('facilities')
            .select('id, name, description, location, capacity')
            .order('name', { ascending: true }),
        ]);
        setInventory((invRes.data ?? []) as unknown as InventoryItem[]);
        setFacilities((facRes.data ?? []) as unknown as Facility[]);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  const availableInventory = useMemo(
    () => inventory.filter(i => i.available_quantity > 0 && i.condition === 'good'),
    [inventory],
  );

  const filteredInventory = useMemo(
    () => availableInventory.filter(i => i.name.toLowerCase().includes(search.toLowerCase())),
    [availableInventory, search],
  );

  const filteredFacilities = useMemo(
    () => facilities.filter(f => f.name.toLowerCase().includes(search.toLowerCase())),
    [facilities, search],
  );

  const update = (field: keyof FormState, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const addToCart = (item: InventoryItem | Facility, type: Tab) => {
    const id = item.id;
    const maxQty = type === 'barang' ? (item as InventoryItem).available_quantity : 1;
    setCart(prev => {
      const existing = prev.find(c => c.id === id && c.type === type);
      if (existing) {
        return prev.map(c => c.id === id && c.type === type ? { ...c, quantity: Math.min(c.quantity + 1, c.maxQuantity) } : c);
      }
      return [...prev, { id, name: item.name, type, quantity: 1, maxQuantity: maxQty }];
    });
  };

  const updateQty = (id: string, type: Tab, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.id === id && c.type === type) {
        const next = Math.max(1, Math.min(c.maxQuantity, c.quantity + delta));
        return { ...c, quantity: next };
      }
      return c;
    }));
  };

  const removeFromCart = (id: string, type: Tab) => {
    setCart(prev => prev.filter(c => !(c.id === id && c.type === type)));
  };

  const inCart = (id: string, type: Tab) => cart.some(c => c.id === id && c.type === type);

  const cartCount = cart.length;

  const validate = (): string | null => {
    if (cart.length === 0) return 'Keranjang masih kosong';
    if (!form.borrower_name.trim()) return 'Nama peminjam wajib diisi';
    if (!form.borrower_class.trim()) return 'Kelas/Unit wajib diisi';
    if (!form.borrower_email.trim()) return 'Email wajib diisi';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.borrower_email)) return 'Format email tidak valid';
    if (!form.borrow_date) return 'Tanggal pinjam wajib diisi';
    if (!form.return_date) return 'Tanggal kembali wajib diisi';
    if (new Date(form.return_date) < new Date(form.borrow_date)) return 'Tanggal kembali harus setelah tanggal pinjam';
    if (form.purpose.trim().length < 10) return 'Keperluan minimal 10 karakter';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { showToast(err, 'error'); return; }

    setSubmitting(true);
    try {
      // 1. Fetch default workflow
      const workflow = await getDefaultWorkflow();
      const workflowId = workflow?.id ?? null;

      // 2. Determine item_type from cart
      const itemType = cart.some(c => c.type === 'fasilitas') && !cart.some(c => c.type === 'barang') ? 'fasilitas' : 'barang';

      // 3. Create borrowing record
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
        status: 'pending',
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        item_type: itemType,
      };
      const { data: brwData, error: brwError } = await supabase
        .from('borrowings')
        .insert(borrowingPayload)
        .select('id')
        .single();
      if (brwError) throw brwError;
      const borrowingId = (brwData as unknown as { id: string }).id;

      // 4. Create borrowing_items
      const itemsPayload = cart.map(c => ({
        borrowing_id: borrowingId,
        item_name: c.name,
        item_type: c.type,
        quantity: c.quantity,
        status: 'pending',
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        workflow_template_id: workflowId,
      }));
      const { error: itemsError } = await supabase.from('borrowing_items').insert(itemsPayload);
      if (itemsError) throw itemsError;

      // 5. Send email notification
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v2/send-borrowing-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_request',
            borrowing_id: borrowingId,
            borrower_name: form.borrower_name.trim(),
            borrower_email: form.borrower_email.trim(),
          }),
        });
      } catch {
        /* email failure is non-blocking */
      }

      // 6. Success state
      setSuccess({
        id: borrowingId,
        borrower_name: form.borrower_name.trim(),
        borrow_date: form.borrow_date,
        return_date: form.return_date,
        items: cart,
      });
      showToast('Peminjaman berhasil diajukan!', 'success');
      setCart([]);
      setForm(emptyForm);
    } catch (err: any) {
      showToast(err?.message ?? 'Gagal mengajukan peminjaman', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => { setSuccess(null); setCart([]); setForm(emptyForm); setTab('barang'); };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Peminjaman Diajukan!</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Permintaan peminjaman Anda telah berhasil dikirim dan menunggu persetujuan.</p>

            <div className="mt-6 text-left space-y-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5">
              <div className="flex justify-between"><span className="text-sm text-slate-500">Peminjam</span><span className="text-sm font-medium text-slate-900 dark:text-white">{success.borrower_name}</span></div>
              <div className="flex justify-between"><span className="text-sm text-slate-500">Tanggal Pinjam</span><span className="text-sm font-medium text-slate-900 dark:text-white">{new Date(success.borrow_date).toLocaleDateString('id-ID')}</span></div>
              <div className="flex justify-between"><span className="text-sm text-slate-500">Tanggal Kembali</span><span className="text-sm font-medium text-slate-900 dark:text-white">{new Date(success.return_date).toLocaleDateString('id-ID')}</span></div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 mb-2">Item Dipinjam</p>
                <div className="space-y-1">
                  {success.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-200">{item.name}</span>
                      <span className="text-slate-500">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={resetForm} className="btn-primary mt-6 inline-flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Pinjam Lagi
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ajukan Peminjaman</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Pilih barang/fasilitas dan isi formulir peminjaman</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setTab('barang')}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  tab === 'barang' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700')}
              >
                <Package className="w-4 h-4" /> Barang
              </button>
              <button
                onClick={() => setTab('fasilitas')}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  tab === 'fasilitas' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700')}
              >
                <Building2 className="w-4 h-4" /> Fasilitas
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`Cari ${tab === 'barang' ? 'barang' : 'fasilitas'}...`} className="input pl-10" />
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card p-4 animate-pulse space-y-2">
                    <div className="w-2/3 h-5 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="w-20 h-8 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            ) : tab === 'barang' ? (
              filteredInventory.length === 0 ? (
                <EmptyState icon={Package} title="Tidak ada barang tersedia" description="Belum ada barang yang bisa dipinjam." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredInventory.map(item => (
                    <div key={item.id} className="card p-4 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 dark:text-white truncate">{item.name}</h3>
                        {item.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{item.description}</p>}
                        <p className="text-xs text-slate-400 mt-2">Tersedia: {item.available_quantity}</p>
                      </div>
                      <button
                        onClick={() => addToCart(item, 'barang')}
                        disabled={inCart(item.id, 'barang')}
                        className={cn('flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                          inCart(item.id, 'barang') ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-blue-500 text-white hover:bg-blue-600')}
                      >
                        {inCart(item.id, 'barang') ? <><CheckCircle2 className="w-4 h-4" /> Ditambah</> : <><Plus className="w-4 h-4" /> Tambah</>}
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : filteredFacilities.length === 0 ? (
              <EmptyState icon={Building2} title="Tidak ada fasilitas tersedia" description="Belum ada fasilitas terdaftar." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredFacilities.map(fac => (
                  <div key={fac.id} className="card p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 dark:text-white truncate">{fac.name}</h3>
                      {fac.location && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{fac.location}</p>}
                      {fac.capacity != null && <p className="text-xs text-slate-400 mt-1">Kapasitas: {fac.capacity}</p>}
                    </div>
                    <button
                      onClick={() => addToCart(fac, 'fasilitas')}
                      disabled={inCart(fac.id, 'fasilitas')}
                      className={cn('flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        inCart(fac.id, 'fasilitas') ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-blue-500 text-white hover:bg-blue-600')}
                    >
                      {inCart(fac.id, 'fasilitas') ? <><CheckCircle2 className="w-4 h-4" /> Ditambah</> : <><Plus className="w-4 h-4" /> Tambah</>}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: cart + form */}
          <div className="lg:col-span-1">
            <div className="card p-5 lg:sticky lg:top-20">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="w-5 h-5 text-blue-500" />
                <h2 className="font-bold text-slate-900 dark:text-white">Keranjang</h2>
                {cartCount > 0 && <span className="ml-auto px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">{cartCount}</span>}
              </div>

              {/* Cart items */}
              {cart.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Keranjang kosong. Pilih item dari daftar.</p>
              ) : (
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {cart.map(item => (
                    <div key={`${item.type}-${item.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{item.type}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.id, item.type, -1)} className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-slate-900 dark:text-white">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.type, 1)} disabled={item.quantity >= item.maxQuantity} className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeFromCart(item.id, item.type)} className="w-6 h-6 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Borrower form */}
              <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><User className="w-4 h-4" /> Data Peminjam</h3>

                <div>
                  <label className="label text-xs">Nama Peminjam <span className="text-red-500">*</span></label>
                  <input type="text" value={form.borrower_name} onChange={e => update('borrower_name', e.target.value)} className="input text-sm" placeholder="Nama lengkap" />
                </div>
                <div>
                  <label className="label text-xs">Kelas/Unit <span className="text-red-500">*</span></label>
                  <input type="text" value={form.borrower_class} onChange={e => update('borrower_class', e.target.value)} className="input text-sm" placeholder="Kelas atau unit" />
                </div>
                <div>
                  <label className="label text-xs">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={form.borrower_email} onChange={e => update('borrower_email', e.target.value)} className="input text-sm" placeholder="email@contoh.com" />
                </div>
                <div>
                  <label className="label text-xs">No. Telepon (opsional)</label>
                  <input type="text" value={form.borrower_phone} onChange={e => update('borrower_phone', e.target.value)} className="input text-sm" placeholder="08xx..." />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Tgl Pinjam <span className="text-red-500">*</span></label>
                    <input type="date" value={form.borrow_date} onChange={e => update('borrow_date', e.target.value)} className="input text-sm" />
                  </div>
                  <div>
                    <label className="label text-xs">Tgl Kembali <span className="text-red-500">*</span></label>
                    <input type="date" value={form.return_date} onChange={e => update('return_date', e.target.value)} className="input text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Waktu Mulai</label>
                    <input type="time" value={form.start_time} onChange={e => update('start_time', e.target.value)} className="input text-sm" />
                  </div>
                  <div>
                    <label className="label text-xs">Waktu Selesai</label>
                    <input type="time" value={form.end_time} onChange={e => update('end_time', e.target.value)} className="input text-sm" />
                  </div>
                </div>

                <div>
                  <label className="label text-xs">Keperluan/Tujuan <span className="text-red-500">*</span></label>
                  <textarea value={form.purpose} onChange={e => update('purpose', e.target.value)} rows={2} className="input text-sm resize-none" placeholder="Minimal 10 karakter..." />
                </div>
                <div>
                  <label className="label text-xs">Catatan Tambahan (opsional)</label>
                  <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} className="input text-sm resize-none" placeholder="Catatan..." />
                </div>

                <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full inline-flex items-center justify-center gap-2 text-sm">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</> : <><Send className="w-4 h-4" /> Ajukan Peminjaman</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
