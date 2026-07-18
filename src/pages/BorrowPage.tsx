import { useEffect, useState, useMemo, type FormEvent } from 'react';
import {
  ClipboardList,
  Search,
  Loader2,
  Plus,
  Minus,
  X,
  Package,
  Building2,
  CheckCircle2,
  Mail,
  Phone,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Send,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getDefaultWorkflow, type WorkflowTemplate } from '../lib/workflow';
import { showToast } from '../components/Toast';
import { cn } from '../utils/cn';

type Tab = 'barang' | 'fasilitas';

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
  available_quantity: number | null;
  condition: string | null;
  image_url: string | null;
  categories: { name: string } | null;
}

interface FacilityItem {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
  image_url: string | null;
}

interface CartItem {
  key: string;
  inventory_id: string | null;
  facility_id: string | null;
  item_type: Tab;
  item_name: string;
  quantity: number;
}

const FALLBACK_INV = 'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=400';
const FALLBACK_FAC = 'https://images.pexels.com/photos/2074130/pexels-photo-2074130.jpeg?auto=compress&cs=tinysrgb&w=400';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function plusDaysStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

export default function BorrowPage() {
  const [tab, setTab] = useState<Tab>('barang');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lainnyaOpen, setLainnyaOpen] = useState(false);
  const [lainnyaName, setLainnyaName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ id: string } | null>(null);

  const [form, setForm] = useState({
    borrower_name: '',
    borrower_class: '',
    borrower_email: '',
    borrower_phone: '',
    borrow_date: todayStr(),
    return_date: plusDaysStr(1),
    start_time: '08:00',
    end_time: '16:00',
    purpose: '',
    notes: '',
  });

  const update = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [invRes, facRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('id, code, name, available_quantity, condition, image_url, categories!category_id(name)')
            .gt('available_quantity', 0)
            .eq('condition', 'good')
            .order('name', { ascending: true }),
          supabase
            .from('facilities')
            .select('id, name, location, capacity, image_url')
            .order('name', { ascending: true }),
        ]);
        setInventory((invRes.data as unknown as InventoryItem[]) ?? []);
        setFacilities((facRes.data as unknown as FacilityItem[]) ?? []);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredInventory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        (it.code ?? '').toLowerCase().includes(q) ||
        (it.categories?.name ?? '').toLowerCase().includes(q),
    );
  }, [inventory, search]);

  const filteredFacilities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.location ?? '').toLowerCase().includes(q),
    );
  }, [facilities, search]);

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.key === item.key);
      if (existing) {
        return prev.map((c) =>
          c.key === item.key ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, item];
    });
  };

  const changeQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.key === key ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c))
        .filter((c) => c.quantity > 0),
    );
  };

  const removeFromCart = (key: string) =>
    setCart((prev) => prev.filter((c) => c.key !== key));

  const addLainnya = () => {
    const name = lainnyaName.trim();
    if (!name) {
      showToast('Masukkan nama barang/fasilitas', 'error');
      return;
    }
    const key = `lainnya-${tab}-${name}`;
    addToCart({
      key,
      inventory_id: null,
      facility_id: null,
      item_type: tab,
      item_name: name,
      quantity: 1,
    });
    setLainnyaName('');
    setLainnyaOpen(false);
    showToast(`${name} ditambahkan ke keranjang`, 'success');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('Keranjang masih kosong', 'error');
      return;
    }
    if (!form.borrower_name || !form.borrower_class || !form.borrower_email || !form.borrow_date || !form.return_date || !form.start_time || !form.end_time || !form.purpose) {
      showToast('Mohon lengkapi semua field wajib', 'error');
      return;
    }
    if (form.return_date < form.borrow_date) {
      showToast('Tanggal kembali harus setelah tanggal pinjam', 'error');
      return;
    }
    if (form.purpose.trim().length < 10) {
      showToast('Keperluan minimal 10 karakter', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const workflow = await getDefaultWorkflow();
      const itemType: Tab = cart.some((c) => c.item_type === 'fasilitas') && !cart.some((c) => c.item_type === 'barang')
        ? 'fasilitas'
        : 'barang';

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
        workflow_template_id: workflow?.id ?? null,
      };
      const { data: brwData, error: brwError } = await supabase
        .from('borrowings')
        .insert(borrowingPayload)
        .select('id')
        .single();
      if (brwError || !brwData) {
        showToast('Gagal menyimpan peminjaman: ' + (brwError?.message ?? ''), 'error');
        return;
      }
      const borrowingId = (brwData as unknown as { id: string }).id;

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
      const { error: itemsError } = await supabase.from('borrowing_items').insert(itemsPayload);
      if (itemsError) {
        showToast('Gagal menyimpan item: ' + itemsError.message, 'error');
        return;
      }

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
      } catch {
        /* email failure is non-blocking */
      }

      showToast('Pengajuan peminjaman berhasil dikirim', 'success');
      setSuccess({ id: borrowingId });
      setCart([]);
      setForm({
        borrower_name: '',
        borrower_class: '',
        borrower_email: '',
        borrower_phone: '',
        borrow_date: todayStr(),
        return_date: plusDaysStr(1),
        start_time: '08:00',
        end_time: '16:00',
        purpose: '',
        notes: '',
      });
    } catch (err) {
      showToast('Terjadi kesalahan saat mengirim pengajuan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pengajuan Berhasil Dikirim</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pengajuan peminjaman Anda telah berhasil dikirim dan menunggu persetujuan.
          </p>
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800/50">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">ID Pengajuan</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">{success.id.slice(0, 8)}...</span>
            </div>
            <div className="mt-2 flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Nama</span>
              <span className="font-semibold text-slate-900 dark:text-white">{form.borrower_name || '-'}</span>
            </div>
            <div className="mt-2 flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Status</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">Menunggu Persetujuan</span>
            </div>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="btn-primary mt-6"
          >
            <Plus className="h-4 w-4" />
            Buat Pengajuan Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengajuan Peminjaman</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pilih barang atau fasilitas, lalu isi formulir peminjam.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: selection */}
        <div className="lg:col-span-3">
          {/* Tabs */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setTab('barang')}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                tab === 'barang'
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700',
              )}
            >
              <Package className="h-4 w-4" />
              Barang
            </button>
            <button
              onClick={() => setTab('fasilitas')}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                tab === 'fasilitas'
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700',
              )}
            >
              <Building2 className="h-4 w-4" />
              Fasilitas
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input pl-10"
              placeholder={tab === 'barang' ? 'Cari barang...' : 'Cari fasilitas...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Lainnya card */}
          <button
            onClick={() => setLainnyaOpen((o) => !o)}
            className={cn(
              'mb-4 flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 px-4 py-3 text-left transition hover:border-brand-500 hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20 dark:hover:bg-brand-900/30',
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-700 dark:text-brand-300">Lainnya...</p>
              <p className="text-xs text-brand-600/70 dark:text-brand-400/70">
                Pilih jika barang/fasilitas tidak ada di daftar
              </p>
            </div>
          </button>

          {lainnyaOpen && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <label className="label">Nama {tab === 'barang' ? 'Barang' : 'Fasilitas'}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder={`Ketik nama ${tab === 'barang' ? 'barang' : 'fasilitas'}...`}
                  value={lainnyaName}
                  onChange={(e) => setLainnyaName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLainnya();
                    }
                  }}
                />
                <button onClick={addLainnya} className="btn-primary">
                  <Plus className="h-4 w-4" />
                  Tambah
                </button>
              </div>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="mb-3 h-24 rounded-xl bg-slate-200 dark:bg-slate-800" />
                  <div className="mb-2 h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          ) : tab === 'barang' ? (
            filteredInventory.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Tidak ada barang tersedia.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredInventory.map((it) => (
                  <div key={it.id} className="card flex items-center gap-3">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                      <img
                        src={it.image_url || FALLBACK_INV}
                        alt={it.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_INV; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{it.name}</h3>
                      {it.categories?.name && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{it.categories.name}</p>
                      )}
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        Tersedia: {it.available_quantity ?? 0}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        addToCart({
                          key: `inv-${it.id}`,
                          inventory_id: it.id,
                          facility_id: null,
                          item_type: 'barang',
                          item_name: it.name,
                          quantity: 1,
                        })
                      }
                      className="rounded-lg bg-brand-600 p-2 text-white hover:bg-brand-700"
                      aria-label="Tambah ke keranjang"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : filteredFacilities.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Tidak ada fasilitas tersedia.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredFacilities.map((f) => (
                <div key={f.id} className="card flex items-center gap-3">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                    <img
                      src={f.image_url || FALLBACK_FAC}
                      alt={f.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_FAC; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{f.name}</h3>
                    {f.location && (
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{f.location}</p>
                    )}
                    {f.capacity != null && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Kapasitas: {f.capacity}</p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      addToCart({
                        key: `fac-${f.id}`,
                        inventory_id: null,
                        facility_id: f.id,
                        item_type: 'fasilitas',
                        item_name: f.name,
                        quantity: 1,
                      })
                    }
                    className="rounded-lg bg-brand-600 p-2 text-white hover:bg-brand-700"
                    aria-label="Tambah ke keranjang"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: cart + form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Cart */}
            <div className="card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <ClipboardList className="h-5 w-5 text-brand-600" />
                  Keranjang ({cart.length})
                </h2>
              </div>
              {cart.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">Keranjang kosong. Pilih item di sebelah kiri.</p>
              ) : (
                <ul className="space-y-2">
                  {cart.map((c) => (
                    <li
                      key={c.key}
                      className="flex items-center gap-2 rounded-xl border border-slate-100 p-2 dark:border-slate-800"
                    >
                      <span className={cn('rounded-lg px-2 py-0.5 text-xs font-medium', c.item_type === 'barang' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300')}>
                        {c.item_type === 'barang' ? 'Barang' : 'Fasilitas'}
                      </span>
                      <span className="flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                        {c.item_name}
                        {!c.inventory_id && !c.facility_id && (
                          <span className="ml-1 text-xs text-slate-400">(lainnya)</span>
                        )}
                      </span>
                      {c.item_type === 'barang' && (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => changeQty(c.key, -1)} className="rounded-md bg-slate-100 p-1 dark:bg-slate-800">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{c.quantity}</span>
                          <button type="button" onClick={() => changeQty(c.key, 1)} className="rounded-md bg-slate-100 p-1 dark:bg-slate-800">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <button type="button" onClick={() => removeFromCart(c.key)} className="rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Borrower info */}
            <div className="card">
              <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Data Peminjam</h2>
              <div className="grid gap-4">
                <div>
                  <label className="label">Nama Peminjam <span className="text-red-500">*</span></label>
                  <input className="input" type="text" value={form.borrower_name} onChange={(e) => update('borrower_name', e.target.value)} required />
                </div>
                <div>
                  <label className="label">Kelas / Unit <span className="text-red-500">*</span></label>
                  <input className="input" type="text" value={form.borrower_class} onChange={(e) => update('borrower_class', e.target.value)} required />
                </div>
                <div>
                  <label className="label"><Mail className="mr-1 inline h-3.5 w-3.5" />Email <span className="text-red-500">*</span></label>
                  <input className="input" type="email" value={form.borrower_email} onChange={(e) => update('borrower_email', e.target.value)} required />
                </div>
                <div>
                  <label className="label"><Phone className="mr-1 inline h-3.5 w-3.5" />No. Telepon <span className="text-slate-400 font-normal">(opsional)</span></label>
                  <input className="input" type="text" value={form.borrower_phone} onChange={(e) => update('borrower_phone', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label"><Calendar className="mr-1 inline h-3.5 w-3.5" />Tanggal Pinjam <span className="text-red-500">*</span></label>
                    <input className="input" type="date" value={form.borrow_date} onChange={(e) => update('borrow_date', e.target.value)} required />
                  </div>
                  <div>
                    <label className="label"><Calendar className="mr-1 inline h-3.5 w-3.5" />Tanggal Kembali <span className="text-red-500">*</span></label>
                    <input className="input" type="date" value={form.return_date} onChange={(e) => update('return_date', e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label"><Clock className="mr-1 inline h-3.5 w-3.5" />Waktu Mulai <span className="text-red-500">*</span></label>
                    <input className="input" type="time" value={form.start_time} onChange={(e) => update('start_time', e.target.value)} required />
                  </div>
                  <div>
                    <label className="label"><Clock className="mr-1 inline h-3.5 w-3.5" />Waktu Selesai <span className="text-red-500">*</span></label>
                    <input className="input" type="time" value={form.end_time} onChange={(e) => update('end_time', e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="label"><FileText className="mr-1 inline h-3.5 w-3.5" />Keperluan / Tujuan <span className="text-red-500">*</span></label>
                  <textarea className="input min-h-[80px] resize-y" value={form.purpose} onChange={(e) => update('purpose', e.target.value)} placeholder="Min. 10 karakter" required />
                </div>
                <div>
                  <label className="label">Catatan Tambahan <span className="text-slate-400 font-normal">(opsional)</span></label>
                  <textarea className="input min-h-[60px] resize-y" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={submitting || cart.length === 0}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Kirim Pengajuan
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
