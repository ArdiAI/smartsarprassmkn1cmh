import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Minus, Trash2, Package, Building2, X, Loader2,
  CheckCircle2, ShoppingCart, Send,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getDefaultWorkflow } from '../lib/workflow';
import { showToast } from '../components/Toast';
import { cn } from '../utils/cn';

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
  available_quantity: number;
  condition: string;
  location: string | null;
  categories: { name: string } | null;
}

interface Facility {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
  status: string | null;
}

interface CartItem {
  key: string;
  inventory_id: string | null;
  facility_id: string | null;
  item_type: 'barang' | 'fasilitas';
  item_name: string;
  quantity: number;
  max?: number;
}

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function BorrowPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'barang' | 'fasilitas'>('barang');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ id: string; nama: string } | null>(null);

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
      try {
        const [invRes, facRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('id, code, name, available_quantity, condition, location, categories!category_id(name)')
            .gt('available_quantity', 0)
            .eq('condition', 'good')
            .order('name', { ascending: true }),
          supabase.from('facilities').select('id, name, location, capacity, status').order('name', { ascending: true }),
        ]);
        if (invRes.error) throw invRes.error;
        setInventory((invRes.data as unknown as InventoryItem[]) ?? []);
        setFacilities((facRes.data as unknown as Facility[]) ?? []);
      } catch {
        showToast('Gagal memuat data', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setF = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const filtered = (() => {
    const q = search.toLowerCase().trim();
    if (tab === 'barang') {
      return inventory.filter((i) => !q || i.name.toLowerCase().includes(q) || (i.code ?? '').toLowerCase().includes(q));
    }
    return facilities.filter((f) => !q || f.name.toLowerCase().includes(q) || (f.location ?? '').toLowerCase().includes(q));
  })();

  const addToCart = (item: { id: string; name: string; type: 'barang' | 'fasilitas'; max?: number }) => {
    const key = `${item.type}-${item.id}`;
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        if (item.type === 'barang' && item.max && existing.quantity >= item.max) return prev;
        return prev.map((c) => c.key === key ? { ...c, quantity: item.type === 'fasilitas' ? 1 : c.quantity + 1 } : c);
      }
      return [...prev, {
        key,
        inventory_id: item.type === 'barang' ? item.id : null,
        facility_id: item.type === 'fasilitas' ? item.id : null,
        item_type: item.type,
        item_name: item.name,
        quantity: 1,
        max: item.max,
      }];
    });
  };

  const addCustom = () => {
    const name = customName.trim();
    if (!name) {
      showToast('Nama barang/fasilitas wajib diisi', 'error');
      return;
    }
    const key = `custom-${tab}-${Date.now()}`;
    setCart((prev) => [...prev, {
      key,
      inventory_id: null,
      facility_id: null,
      item_type: tab,
      item_name: name,
      quantity: 1,
    }]);
    setCustomName('');
    setCustomOpen(false);
    showToast('Item ditambahkan', 'success');
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.key !== key) return c;
      if (c.item_type === 'fasilitas') return c;
      const newQty = Math.max(1, c.quantity + delta);
      if (c.max && newQty > c.max) return c;
      return { ...c, quantity: newQty };
    }));
  };

  const removeFromCart = (key: string) => setCart((prev) => prev.filter((c) => c.key !== key));

  const validate = (): string | null => {
    if (cart.length === 0) return 'Keranjang masih kosong';
    if (!form.borrower_name.trim()) return 'Nama peminjam wajib diisi';
    if (!form.borrower_class.trim()) return 'Kelas/Unit wajib diisi';
    if (!form.borrower_email.trim()) return 'Email wajib diisi';
    if (!form.borrow_date) return 'Tanggal pinjam wajib diisi';
    if (!form.return_date) return 'Tanggal kembali wajib diisi';
    if (form.return_date < form.borrow_date) return 'Tanggal kembali harus setelah tanggal pinjam';
    if (form.purpose.trim().length < 10) return 'Keperluan minimal 10 karakter';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { showToast(err, 'error'); return; }
    setSubmitting(true);
    try {
      const workflow = await getDefaultWorkflow();
      const { data: borData, error: borErr } = await supabase.from('borrowings').insert({
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
        item_type: tab,
        workflow_template_id: workflow?.id ?? null,
      }).select('id').single();
      if (borErr || !borData) throw new Error('Gagal membuat peminjaman');
      const borrowingId = borData.id;

      const itemsPayload = cart.map((c) => ({
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
      const { error: itemsErr } = await supabase.from('borrowing_items').insert(itemsPayload);
      if (itemsErr) throw itemsErr;

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
      } catch { /* email best-effort */ }

      setSuccess({ id: borrowingId, nama: form.borrower_name.trim() });
      showToast('Pengajuan peminjaman berhasil dibuat', 'success');
    } catch {
      showToast('Gagal membuat pengajuan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pengajuan Berhasil</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pengajuan peminjaman oleh <strong>{success.nama}</strong> telah dibuat dan menunggu persetujuan.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => navigate('/history')} className="btn-secondary">Lihat Riwayat</button>
            <button onClick={() => { setSuccess(null); setCart([]); setForm({ ...form, borrower_name: '', borrower_class: '', borrower_email: '', borrower_phone: '', purpose: '', notes: '', return_date: '' }); }} className="btn-primary">
              Buat Pengajuan Lain
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengajuan Peminjaman</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Pilih barang atau fasilitas, lalu isi data peminjam.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: selection */}
        <div className="card">
          {/* Tabs */}
          <div className="mb-4 flex gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setTab('barang')}
              className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition', tab === 'barang' ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300' : 'text-slate-500')}
            >
              <Package className="h-4 w-4" /> Barang
            </button>
            <button
              onClick={() => setTab('fasilitas')}
              className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition', tab === 'fasilitas' ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300' : 'text-slate-500')}
            >
              <Building2 className="h-4 w-4" /> Fasilitas
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {/* Lainnya card */}
          <button
            onClick={() => setCustomOpen((o) => !o)}
            className="mb-3 flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-3 text-left transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20 dark:hover:bg-brand-900/30"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Lainnya...</p>
              <p className="text-xs text-brand-600/70 dark:text-brand-400/70">Masukkan nama barang/fasilitas secara manual</p>
            </div>
          </button>

          {customOpen && (
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <label className="label">Nama {tab === 'barang' ? 'Barang' : 'Fasilitas'}</label>
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder={`Ketik nama ${tab === 'barang' ? 'barang' : 'fasilitas'}...`}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                />
                <button onClick={addCustom} className="btn-primary shrink-0">
                  <Plus className="h-4 w-4" /> Tambah
                </button>
                <button onClick={() => setCustomOpen(false)} className="btn-secondary shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Tidak ada item tersedia.</p>
          ) : (
            <div className="grid max-h-[480px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {filtered.map((item) => {
                const id = (item as any).id as string;
                const name = (item as any).name as string;
                const inCart = cart.find((c) => c.inventory_id === id || c.facility_id === id);
                return (
                  <div key={id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
                    {tab === 'barang' && (
                      <p className="text-xs text-slate-500">Tersedia: {(item as InventoryItem).available_quantity}</p>
                    )}
                    {tab === 'fasilitas' && (item as Facility).location && (
                      <p className="text-xs text-slate-500">{(item as Facility).location}</p>
                    )}
                    <button
                      onClick={() => addToCart(tab === 'barang'
                        ? { id, name, type: 'barang', max: (item as InventoryItem).available_quantity }
                        : { id, name, type: 'fasilitas' })}
                      className={cn('mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-semibold transition', inCart ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-brand-600 text-white hover:bg-brand-700')}
                    >
                      {inCart ? '✓ Di Keranjang' : 'Tambah'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: cart + form */}
        <div className="space-y-4">
          <div className="card">
            <div className="mb-3 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-brand-600" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Keranjang ({cart.length})</h2>
            </div>
            {cart.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Keranjang kosong.</p>
            ) : (
              <div className="space-y-2">
                {cart.map((c) => (
                  <div key={c.key} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{c.item_name}</p>
                      <p className="text-xs text-slate-400 capitalize">{c.item_type}{c.inventory_id || c.facility_id ? '' : ' (custom)'}</p>
                    </div>
                    {c.item_type === 'barang' && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(c.key, -1)} className="rounded-md bg-slate-100 p-1 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-8 text-center text-sm font-semibold">{c.quantity}</span>
                        <button onClick={() => updateQty(c.key, 1)} className="rounded-md bg-slate-100 p-1 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                    <button onClick={() => removeFromCart(c.key)} className="rounded-md p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="card space-y-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">Data Peminjam</h2>
            <div>
              <label className="label">Nama Peminjam <span className="text-red-500">*</span></label>
              <input className="input" value={form.borrower_name} onChange={(e) => setF('borrower_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Kelas/Unit <span className="text-red-500">*</span></label>
              <input className="input" value={form.borrower_class} onChange={(e) => setF('borrower_class', e.target.value)} />
            </div>
            <div>
              <label className="label">Email <span className="text-red-500">*</span></label>
              <input type="email" className="input" value={form.borrower_email} onChange={(e) => setF('borrower_email', e.target.value)} />
            </div>
            <div>
              <label className="label">No. Telepon (opsional)</label>
              <input className="input" value={form.borrower_phone} onChange={(e) => setF('borrower_phone', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tanggal Pinjam <span className="text-red-500">*</span></label>
                <input type="date" className="input" value={form.borrow_date} onChange={(e) => setF('borrow_date', e.target.value)} />
              </div>
              <div>
                <label className="label">Tanggal Kembali <span className="text-red-500">*</span></label>
                <input type="date" className="input" value={form.return_date} onChange={(e) => setF('return_date', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Waktu Mulai</label>
                <input type="time" className="input" value={form.start_time} onChange={(e) => setF('start_time', e.target.value)} />
              </div>
              <div>
                <label className="label">Waktu Selesai</label>
                <input type="time" className="input" value={form.end_time} onChange={(e) => setF('end_time', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Keperluan/Tujuan <span className="text-red-500">*</span></label>
              <textarea className="input min-h-[80px]" value={form.purpose} onChange={(e) => setF('purpose', e.target.value)} placeholder="Min. 10 karakter" />
            </div>
            <div>
              <label className="label">Catatan Tambahan (opsional)</label>
              <textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => setF('notes', e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
