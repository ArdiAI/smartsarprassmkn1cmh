import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ClipboardList,
  Search,
  Plus,
  Minus,
  Trash2,
  Loader2,
  CheckCircle2,
  Package,
  Building2,
  MapPin,
  Mail,
  Phone,
  User,
  Calendar,
  Clock,
  AlignLeft,
  RotateCcw,
  X,
  Sparkles,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { getDefaultWorkflow } from '../lib/workflow';
import { cn } from '../utils/cn';

type Tab = 'barang' | 'fasilitas';

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
  quantity: number;
  available_quantity: number;
  condition: string;
  location: string | null;
  image_url: string | null;
  category: { name: string } | null;
}

interface FacilityItem {
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
  item_type: Tab;
  inventory_id: string | null;
  facility_id: string | null;
  item_name: string;
  quantity: number;
}

interface BorrowerForm {
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

const FALLBACK_IMG = 'https://images.pexels.com/photos/4226119/pexels-photo-4226119.jpeg?auto=compress&cs=tinysrgb&w=400';
const FACILITY_IMG = 'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=400';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyBorrower(): BorrowerForm {
  return {
    borrower_name: '',
    borrower_class: '',
    borrower_email: '',
    borrower_phone: '',
    borrow_date: todayStr(),
    return_date: todayStr(),
    start_time: '08:00',
    end_time: '16:00',
    purpose: '',
    notes: '',
  };
}

export default function BorrowPage() {
  const [tab, setTab] = useState<Tab>('barang');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [borrower, setBorrower] = useState<BorrowerForm>(emptyBorrower());
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<CartItem[] | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [{ data: invData, error: invErr }, { data: facData, error: facErr }] = await Promise.all([
          supabase
            .from('inventory')
            .select('id, code, name, quantity, available_quantity, condition, location, image_url, categories!category_id(name)')
            .order('name', { ascending: true }),
          supabase
            .from('facilities')
            .select('id, name, description, location, capacity, image_url, category')
            .order('name', { ascending: true }),
        ]);
        if (invErr) throw invErr;
        if (facErr) throw facErr;
        setInventory((invData as unknown as InventoryItem[]) ?? []);
        setFacilities((facData as unknown as FacilityItem[]) ?? []);
      } catch {
        showToast('Gagal memuat data', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const availableInventory = useMemo(
    () => inventory.filter((i) => (i.available_quantity ?? 0) > 0 && i.condition === 'good'),
    [inventory],
  );

  const filteredInventory = useMemo(
    () =>
      availableInventory.filter(
        (i) =>
          !search ||
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          (i.code ?? '').toLowerCase().includes(search.toLowerCase()),
      ),
    [availableInventory, search],
  );

  const filteredFacilities = useMemo(
    () =>
      facilities.filter(
        (f) =>
          !search ||
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          (f.location ?? '').toLowerCase().includes(search.toLowerCase()),
      ),
    [facilities, search],
  );

  const updateBorrower = useCallback((field: keyof BorrowerForm, value: string) => {
    setBorrower((b) => ({ ...b, [field]: value }));
  }, []);

  const addToCart = (item: {
    item_type: Tab;
    inventory_id?: string | null;
    facility_id?: string | null;
    item_name: string;
    quantity?: number;
  }) => {
    const key = `${item.item_type}-${item.inventory_id ?? item.facility_id ?? item.item_name}`;
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        return prev.map((c) =>
          c.key === key ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          key,
          item_type: item.item_type,
          inventory_id: item.inventory_id ?? null,
          facility_id: item.facility_id ?? null,
          item_name: item.item_name,
          quantity: item.quantity ?? 1,
        },
      ];
    });
  };

  const handleAddCustom = () => {
    if (!customName.trim()) {
      showToast('Masukkan nama barang/fasilitas', 'error');
      return;
    }
    addToCart({ item_type: tab, item_name: customName.trim(), quantity: 1 });
    setCustomName('');
    setShowCustom(false);
    showToast('Item kustom ditambahkan', 'success');
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.key !== key) return c;
          if (c.item_type === 'fasilitas') return c; // fixed at 1
          const newQty = c.quantity + delta;
          return newQty < 1 ? c : { ...c, quantity: newQty };
        })
        .filter((c) => c.quantity > 0),
    );
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  };

  const validate = (): string | null => {
    if (cart.length === 0) return 'Keranjang masih kosong. Tambahkan minimal satu item.';
    if (!borrower.borrower_name.trim()) return 'Nama peminjam wajib diisi';
    if (!borrower.borrower_class.trim()) return 'Kelas/Unit wajib diisi';
    if (!borrower.borrower_email.trim()) return 'Email wajib diisi';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(borrower.borrower_email)) return 'Format email tidak valid';
    if (!borrower.borrow_date) return 'Tanggal pinjam wajib diisi';
    if (!borrower.return_date) return 'Tanggal kembali wajib diisi';
    if (borrower.return_date < borrower.borrow_date) return 'Tanggal kembali harus setelah tanggal pinjam';
    if (!borrower.start_time) return 'Waktu mulai wajib diisi';
    if (!borrower.end_time) return 'Waktu selesai wajib diisi';
    if (borrower.purpose.trim().length < 10) return 'Keperluan minimal 10 karakter';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      showToast(err, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const workflow = await getDefaultWorkflow();
      const itemType = cart.some((c) => c.item_type === 'barang') ? 'barang' : 'fasilitas';

      const { data: borrowing, error: borErr } = await supabase
        .from('borrowings')
        .insert({
          borrower_name: borrower.borrower_name.trim(),
          borrower_class: borrower.borrower_class.trim(),
          borrower_email: borrower.borrower_email.trim(),
          borrower_phone: borrower.borrower_phone.trim() || null,
          borrow_date: borrower.borrow_date,
          return_date: borrower.return_date,
          start_time: borrower.start_time,
          end_time: borrower.end_time,
          purpose: borrower.purpose.trim(),
          notes: borrower.notes.trim() || null,
          status: 'pending',
          current_step: 1,
          current_status_label: 'Menunggu Persetujuan',
          item_type: itemType,
          workflow_template_id: workflow?.id ?? null,
        })
        .select('id')
        .maybeSingle();

      if (borErr || !borrowing) throw new Error(borErr?.message ?? 'Gagal membuat peminjaman');
      const borrowingId = (borrowing as unknown as { id: string }).id;

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

      const { error: itemsErr } = await supabase.from('borrowing_items').insert(itemInserts);
      if (itemsErr) throw itemsErr;

      // Send email notification (best-effort)
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v2/send-borrowing-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_request',
            borrowing_id: borrowingId,
            borrower_name: borrower.borrower_name.trim(),
            borrower_email: borrower.borrower_email.trim(),
          }),
        });
      } catch {
        /* best-effort */
      }

      showToast('Pengajuan peminjaman berhasil dikirim', 'success');
      setSuccess([...cart]);
      setCart([]);
      setBorrower(emptyBorrower());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengajukan peminjaman', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCart([]);
    setBorrower(emptyBorrower());
  };

  if (success) {
    return (
      <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <AnimatedBackground />
        <main className="relative mx-auto max-w-2xl px-4 py-12">
          <div className="card text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pengajuan Berhasil!</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Pengajuan peminjaman Anda telah dikirim dan sedang menunggu persetujuan.
            </p>
            <div className="mt-6 space-y-2 text-left">
              <p className="mb-2 font-semibold text-slate-700 dark:text-slate-300">Item yang diajukan:</p>
              {success.map((c) => (
                <div
                  key={c.key}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800"
                >
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{c.item_name}</span>
                  <span className="text-sm text-slate-500">×{c.quantity}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="btn-primary mt-6"
            >
              <RotateCcw className="h-4 w-4" />
              Ajukan Lagi
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <AnimatedBackground />
      <main className="relative mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <ClipboardList className="h-7 w-7 text-brand-600" />
            Pengajuan Peminjaman
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pilih barang atau fasilitas, isi formulir, lalu kirim pengajuan.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Left: Selection */}
          <div>
            {/* Tabs */}
            <div className="mb-4 flex gap-2 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
              <button
                onClick={() => { setTab('barang'); setSearch(''); }}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
                  tab === 'barang'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                <Package className="h-4 w-4" />
                Barang
              </button>
              <button
                onClick={() => { setTab('fasilitas'); setSearch(''); }}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
                  tab === 'fasilitas'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
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

            {/* Lainnya... Card */}
            <button
              onClick={() => setShowCustom(true)}
              className="mb-4 flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 px-4 py-3 text-left transition hover:border-brand-500 hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20 dark:hover:bg-brand-900/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/40">
                <Plus className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <p className="font-semibold text-brand-700 dark:text-brand-300">Lainnya...</p>
                <p className="text-xs text-brand-600 dark:text-brand-400">
                  Masukkan nama barang/fasilitas lain secara manual
                </p>
              </div>
            </button>

            {/* Custom form inline */}
            {showCustom && (
              <div className="mb-4 card border-brand-200 dark:border-brand-800">
                <div className="flex items-center justify-between">
                  <label className="label">Nama Barang/Fasilitas</label>
                  <button onClick={() => { setShowCustom(false); setCustomName(''); }} className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input"
                    placeholder="Ketik nama..."
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                    autoFocus
                  />
                  <button onClick={handleAddCustom} className="btn-primary shrink-0">
                    <Plus className="h-4 w-4" />
                    Tambah
                  </button>
                </div>
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              </div>
            ) : tab === 'barang' ? (
              filteredInventory.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Tidak ada barang tersedia.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {filteredInventory.map((item) => (
                    <div key={item.id} className="card flex flex-col p-3">
                      <img
                        src={item.image_url || FALLBACK_IMG}
                        alt={item.name}
                        className="mb-2 h-24 w-full rounded-lg object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                      />
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">{item.name}</h3>
                      {item.category?.name && (
                        <p className="text-xs text-slate-400">{item.category.name}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        Tersedia: <span className="font-semibold text-emerald-600">{item.available_quantity}</span>
                      </p>
                      <button
                        onClick={() =>
                          addToCart({
                            item_type: 'barang',
                            inventory_id: item.id,
                            item_name: item.name,
                            quantity: 1,
                          })
                        }
                        className="btn-primary mt-2 py-1.5 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Tambah
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : filteredFacilities.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Tidak ada fasilitas tersedia.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredFacilities.map((f) => (
                  <div key={f.id} className="card flex flex-col p-3">
                    <img
                      src={f.image_url || FACILITY_IMG}
                      alt={f.name}
                      className="mb-2 h-24 w-full rounded-lg object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = FACILITY_IMG; }}
                    />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">{f.name}</h3>
                    {f.location && (
                      <p className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" />
                        {f.location}
                      </p>
                    )}
                    <button
                      onClick={() =>
                        addToCart({
                          item_type: 'fasilitas',
                          facility_id: f.id,
                          item_name: f.name,
                          quantity: 1,
                        })
                      }
                      className="btn-primary mt-2 py-1.5 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Tambah
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Cart & Form */}
          <div>
            <form onSubmit={handleSubmit} className="card sticky top-20 space-y-4">
              {/* Cart */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <ClipboardList className="h-5 w-5 text-brand-600" />
                  Keranjang ({cart.length})
                </h3>
                {cart.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400 dark:border-slate-700">
                    Keranjang kosong
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cart.map((c) => (
                      <div
                        key={c.key}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                            {c.item_name}
                          </p>
                          <p className="text-xs text-slate-400 capitalize">{c.item_type}</p>
                        </div>
                        {c.item_type === 'barang' && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateQty(c.key, -1)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold">{c.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(c.key, 1)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFromCart(c.key)}
                          className="rounded p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Borrower Info */}
              <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Data Peminjam</h3>
                <div className="space-y-3">
                  <FormField icon={User} label="Nama Peminjam" required>
                    <input className="input" value={borrower.borrower_name} onChange={(e) => updateBorrower('borrower_name', e.target.value)} required />
                  </FormField>
                  <FormField icon={User} label="Kelas/Unit" required>
                    <input className="input" value={borrower.borrower_class} onChange={(e) => updateBorrower('borrower_class', e.target.value)} required />
                  </FormField>
                  <FormField icon={Mail} label="Email" required>
                    <input type="email" className="input" value={borrower.borrower_email} onChange={(e) => updateBorrower('borrower_email', e.target.value)} required />
                  </FormField>
                  <FormField icon={Phone} label="No. Telepon (opsional)">
                    <input className="input" value={borrower.borrower_phone} onChange={(e) => updateBorrower('borrower_phone', e.target.value)} />
                  </FormField>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField icon={Calendar} label="Tgl Pinjam" required>
                      <input type="date" className="input" value={borrower.borrow_date} onChange={(e) => updateBorrower('borrow_date', e.target.value)} required />
                    </FormField>
                    <FormField icon={Calendar} label="Tgl Kembali" required>
                      <input type="date" className="input" value={borrower.return_date} min={borrower.borrow_date} onChange={(e) => updateBorrower('return_date', e.target.value)} required />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField icon={Clock} label="Waktu Mulai" required>
                      <input type="time" className="input" value={borrower.start_time} onChange={(e) => updateBorrower('start_time', e.target.value)} required />
                    </FormField>
                    <FormField icon={Clock} label="Waktu Selesai" required>
                      <input type="time" className="input" value={borrower.end_time} onChange={(e) => updateBorrower('end_time', e.target.value)} required />
                    </FormField>
                  </div>
                  <FormField icon={AlignLeft} label="Keperluan/Tujuan" required>
                    <textarea rows={3} className="input resize-y" placeholder="Min. 10 karakter" value={borrower.purpose} onChange={(e) => updateBorrower('purpose', e.target.value)} required />
                  </FormField>
                  <FormField icon={AlignLeft} label="Catatan Tambahan (opsional)">
                    <textarea rows={2} className="input resize-y" value={borrower.notes} onChange={(e) => updateBorrower('notes', e.target.value)} />
                  </FormField>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Kirim Pengajuan
                    </>
                  )}
                </button>
                <button type="button" onClick={handleReset} className="btn-secondary" disabled={submitting}>
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function FormField({
  icon: Icon,
  label,
  required,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
