import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  Package,
  Building2,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Loader2,
  CheckCircle2,
  Send,
  X,
  MapPin,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getDefaultWorkflow } from '../lib/workflow';
import { showToast } from '../components/Toast';
import { cn } from '../utils/cn';

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
  quantity: number;
  condition: string;
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
  category: string | null;
  status: string | null;
}

interface CartItem {
  key: string;
  inventory_id: string | null;
  facility_id: string | null;
  item_type: 'barang' | 'fasilitas';
  item_name: string;
  quantity: number;
  maxQty?: number;
  isCustom: boolean;
}

const pexelsFallback = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/300`;

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
  const [success, setSuccess] = useState<any>(null);

  // Borrower form
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerClass, setBorrowerClass] = useState('');
  const [borrowerEmail, setBorrowerEmail] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [borrowDate, setBorrowDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [invRes, facRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)')
            .gt('available_quantity', 0)
            .eq('condition', 'good')
            .order('name', { ascending: true }),
          supabase
            .from('facilities')
            .select('id, name, description, location, capacity, image_url, category, status')
            .order('name', { ascending: true }),
        ]);
        setInventory((invRes.data as unknown as InventoryItem[]) ?? []);
        setFacilities((facRes.data as unknown as Facility[]) ?? []);
      } catch {
        showToast('Gagal memuat data', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredInventory = useMemo(() => {
    return inventory.filter(
      (item) =>
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.code ?? '').toLowerCase().includes(search.toLowerCase()),
    );
  }, [inventory, search]);

  const filteredFacilities = useMemo(() => {
    return facilities.filter(
      (f) =>
        !search ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        (f.location ?? '').toLowerCase().includes(search.toLowerCase()),
    );
  }, [facilities, search]);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.key === item.key);
      if (existing) {
        if (item.maxQty && existing.quantity >= item.maxQty) return prev;
        return prev.map((c) =>
          c.key === item.key ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeFromCart = useCallback((key: string) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  }, []);

  const updateQty = useCallback((key: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c;
        const newQty = c.quantity + delta;
        if (newQty < 1) return c;
        if (c.maxQty && newQty > c.maxQty) return c;
        return { ...c, quantity: newQty };
      }),
    );
  }, []);

  function addCustomItem() {
    if (!customName.trim()) {
      showToast('Nama barang/fasilitas tidak boleh kosong', 'error');
      return;
    }
    const key = `custom-${tab}-${customName.trim()}`;
    if (cart.some((c) => c.key === key)) {
      showToast('Item sudah ada di keranjang', 'warning');
      return;
    }
    addToCart({
      key,
      inventory_id: null,
      facility_id: null,
      item_type: tab,
      item_name: customName.trim(),
      quantity: 1,
      isCustom: true,
    });
    setCustomName('');
    setShowCustom(false);
    showToast('Item custom ditambahkan', 'success');
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (cart.length === 0) e.cart = 'Keranjang masih kosong';
    if (!borrowerName.trim()) e.borrowerName = 'Nama wajib diisi';
    if (!borrowerClass.trim()) e.borrowerClass = 'Kelas/Unit wajib diisi';
    if (!borrowerEmail.trim()) e.borrowerEmail = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(borrowerEmail)) e.borrowerEmail = 'Format email tidak valid';
    if (!borrowDate) e.borrowDate = 'Tanggal pinjam wajib diisi';
    if (!returnDate) e.returnDate = 'Tanggal kembali wajib diisi';
    if (borrowDate && returnDate && returnDate < borrowDate) e.returnDate = 'Tanggal kembali harus setelah tanggal pinjam';
    if (startTime && endTime && endTime <= startTime) e.endTime = 'Waktu selesai harus setelah waktu mulai';
    if (purpose.trim().length < 10) e.purpose = 'Keperluan minimal 10 karakter';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      showToast('Mohon lengkapi semua field yang wajib diisi', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const workflow = await getDefaultWorkflow();
      const { data: borrowing, error: borError } = await supabase
        .from('borrowings')
        .insert({
          borrower_name: borrowerName.trim(),
          borrower_class: borrowerClass.trim(),
          borrower_email: borrowerEmail.trim(),
          borrower_phone: borrowerPhone.trim() || null,
          borrow_date: borrowDate,
          return_date: returnDate,
          start_time: startTime,
          end_time: endTime,
          purpose: purpose.trim(),
          notes: notes.trim() || null,
          status: 'pending',
          current_step: 1,
          current_status_label: 'Menunggu Persetujuan',
          item_type: tab,
          workflow_template_id: workflow?.id ?? null,
        })
        .select()
        .single();

      if (borError) throw borError;
      const borrowingId = (borrowing as any).id;

      const itemInserts = cart.map((c) => ({
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

      const { error: itemsError } = await supabase.from('borrowing_items').insert(itemInserts);
      if (itemsError) throw itemsError;

      // Send email notification
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v2/send-borrowing-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_request',
            borrowing_id: borrowingId,
            borrower_name: borrowerName.trim(),
            borrower_email: borrowerEmail.trim(),
          }),
        });
      } catch {
        /* email is best-effort */
      }

      showToast('Pengajuan peminjaman berhasil dikirim', 'success');
      setSuccess({
        id: borrowingId,
        borrower_name: borrowerName.trim(),
        borrower_class: borrowerClass.trim(),
        borrow_date: borrowDate,
        return_date: returnDate,
        items: cart,
        purpose: purpose.trim(),
      });

      // Reset form
      setCart([]);
      setBorrowerName('');
      setBorrowerClass('');
      setBorrowerEmail('');
      setBorrowerPhone('');
      setBorrowDate('');
      setReturnDate('');
      setPurpose('');
      setNotes('');
      setErrors({});
    } catch (err: any) {
      showToast(err?.message ?? 'Gagal mengirim pengajuan', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pengajuan Terkirim!</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Pengajuan peminjaman Anda telah berhasil dikirim dan sedang menunggu persetujuan.
          </p>
          <div className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-left dark:bg-slate-800/50">
            <div className="flex justify-between gap-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Peminjam</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{success.borrower_name} ({success.borrower_class})</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Tanggal</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{success.borrow_date} → {success.return_date}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Keperluan</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white text-right">{success.purpose}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
              <p className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-400">Item Dipinjam:</p>
              <ul className="space-y-1">
                {success.items.map((it: CartItem, i: number) => (
                  <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
                    • {it.item_name} ({it.item_type}) × {it.quantity}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button onClick={() => setSuccess(null)} className="btn-primary mt-6">
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengajuan Peminjaman</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Pilih barang atau fasilitas yang ingin dipinjam, lalu isi formulir pengajuan.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Item Selection */}
        <div className="lg:col-span-3">
          <div className="card">
            {/* Tabs */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setTab('barang')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                  tab === 'barang'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
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
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
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
                placeholder={`Cari ${tab === 'barang' ? 'barang' : 'fasilitas'}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Lainnya... Card */}
            <button
              onClick={() => setShowCustom((s) => !s)}
              className="mb-4 flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-3 text-left transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20 dark:hover:bg-brand-900/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-brand-700 dark:text-brand-300">Lainnya...</p>
                <p className="text-xs text-brand-600/70 dark:text-brand-400/70">
                  Masukkan nama barang/fasilitas secara manual
                </p>
              </div>
            </button>

            {/* Custom Item Form */}
            {showCustom && (
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <label className="label">Nama {tab === 'barang' ? 'Barang' : 'Fasilitas'}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input"
                    placeholder={`Ketik nama ${tab === 'barang' ? 'barang' : 'fasilitas'}...`}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomItem(); } }}
                  />
                  <button onClick={addCustomItem} className="btn-primary shrink-0">
                    <Plus className="h-4 w-4" />
                    Tambah
                  </button>
                  <button onClick={() => { setShowCustom(false); setCustomName(''); }} className="btn-secondary shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Item Grid */}
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                ))}
              </div>
            ) : tab === 'barang' ? (
              filteredInventory.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Tidak ada barang tersedia.</p>
              ) : (
                <div className="grid max-h-[500px] gap-3 overflow-y-auto sm:grid-cols-2">
                  {filteredInventory.map((item) => {
                    const key = `inv-${item.id}`;
                    const inCart = cart.find((c) => c.key === key);
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                          <img
                            src={item.image_url || pexelsFallback(item.name)}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = pexelsFallback(item.name); }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Tersedia: {item.available_quantity}
                          </p>
                        </div>
                        <button
                          onClick={() => addToCart({
                            key,
                            inventory_id: item.id,
                            facility_id: null,
                            item_type: 'barang',
                            item_name: item.name,
                            quantity: 1,
                            maxQty: item.available_quantity,
                            isCustom: false,
                          })}
                          className="btn-primary shrink-0 px-3 py-1.5 text-xs"
                        >
                          {inCart ? <Plus className="h-3.5 w-3.5" /> : 'Tambah'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredFacilities.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Tidak ada fasilitas tersedia.</p>
            ) : (
              <div className="grid max-h-[500px] gap-3 overflow-y-auto sm:grid-cols-2">
                {filteredFacilities.map((f) => {
                  const key = `fac-${f.id}`;
                  const inCart = cart.find((c) => c.key === key);
                  return (
                    <div key={f.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                        <img
                          src={f.image_url || pexelsFallback(f.name)}
                          alt={f.name}
                          className="h-full w-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = pexelsFallback(f.name); }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900 dark:text-white">{f.name}</p>
                        {f.location && (
                          <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <MapPin className="h-3 w-3" />
                            {f.location}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart({
                          key,
                          inventory_id: null,
                          facility_id: f.id,
                          item_type: 'fasilitas',
                          item_name: f.name,
                          quantity: 1,
                          maxQty: 1,
                          isCustom: false,
                        })}
                        disabled={!!inCart}
                        className="btn-primary shrink-0 px-3 py-1.5 text-xs"
                      >
                        {inCart ? '✓' : 'Tambah'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart + Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Cart */}
            <div className="card">
              <div className="mb-3 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                <h2 className="font-semibold text-slate-900 dark:text-white">Keranjang ({cart.length})</h2>
              </div>
              {cart.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  {errors.cart ? <span className="text-red-500">{errors.cart}</span> : 'Keranjang kosong. Pilih item di sebelah kiri.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {cart.map((c) => (
                    <div key={c.key} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{c.item_name}</p>
                        <p className="text-xs text-slate-400">
                          {c.isCustom ? 'Custom' : c.item_type === 'barang' ? 'Barang' : 'Fasilitas'}
                        </p>
                      </div>
                      {c.item_type === 'barang' && (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => updateQty(c.key, -1)} className="rounded-lg bg-slate-100 p-1 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-slate-900 dark:text-white">{c.quantity}</span>
                          <button type="button" onClick={() => updateQty(c.key, 1)} className="rounded-lg bg-slate-100 p-1 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <button type="button" onClick={() => removeFromCart(c.key)} className="rounded-lg p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Borrower Info */}
            <div className="card">
              <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Data Peminjam</h2>
              <div className="grid gap-3">
                <div>
                  <label className="label">Nama Peminjam <span className="text-red-500">*</span></label>
                  <input className={cn('input', errors.borrowerName && 'border-red-500')} value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} placeholder="Nama lengkap" />
                </div>
                <div>
                  <label className="label">Kelas/Unit <span className="text-red-500">*</span></label>
                  <input className={cn('input', errors.borrowerClass && 'border-red-500')} value={borrowerClass} onChange={(e) => setBorrowerClass(e.target.value)} placeholder="Contoh: XII RPL 1" />
                </div>
                <div>
                  <label className="label">Email <span className="text-red-500">*</span></label>
                  <input type="email" className={cn('input', errors.borrowerEmail && 'border-red-500')} value={borrowerEmail} onChange={(e) => setBorrowerEmail(e.target.value)} placeholder="email@sekolah.sch.id" />
                </div>
                <div>
                  <label className="label">No. Telepon (Opsional)</label>
                  <input className="input" value={borrowerPhone} onChange={(e) => setBorrowerPhone(e.target.value)} placeholder="08xx-xxxx-xxxx" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Tanggal Pinjam <span className="text-red-500">*</span></label>
                    <input type="date" className={cn('input', errors.borrowDate && 'border-red-500')} value={borrowDate} onChange={(e) => setBorrowDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Tanggal Kembali <span className="text-red-500">*</span></label>
                    <input type="date" className={cn('input', errors.returnDate && 'border-red-500')} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Waktu Mulai</label>
                    <input type="time" className={cn('input', errors.endTime && 'border-red-500')} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Waktu Selesai</label>
                    <input type="time" className={cn('input', errors.endTime && 'border-red-500')} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">Keperluan/Tujuan <span className="text-red-500">*</span></label>
                  <textarea rows={2} className={cn('input resize-none', errors.purpose && 'border-red-500')} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Jelaskan keperluan (min. 10 karakter)" />
                  {errors.purpose && <p className="mt-1 text-xs text-red-500">{errors.purpose}</p>}
                </div>
                <div>
                  <label className="label">Catatan Tambahan (Opsional)</label>
                  <textarea rows={2} className="input resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan tambahan..." />
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
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
