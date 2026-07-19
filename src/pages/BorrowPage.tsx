import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ClipboardList,
  Search,
  Plus,
  Minus,
  X,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Package,
  Building2,
  ShoppingCart,
  Mail,
  Phone,
  User,
  Calendar,
  Clock,
  FileText,
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
  item_type: 'barang' | 'fasilitas';
  inventory_id: string | null;
  facility_id: string | null;
  item_name: string;
  quantity: number;
  maxQuantity?: number;
}

interface BorrowForm {
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
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const emptyForm: BorrowForm = {
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
  const [form, setForm] = useState<BorrowForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showLainnya, setShowLainnya] = useState(false);
  const [lainnyaName, setLainnyaName] = useState('');
  const [savedSummary, setSavedSummary] = useState<{ id: string; items: CartItem[]; form: BorrowForm } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [invRes, facRes] = await Promise.all([
          supabase
            .from('inventory')
            .select('*, categories!category_id(name)')
            .gt('available_quantity', 0)
            .eq('condition', 'good')
            .order('name', { ascending: true }),
          supabase.from('facilities').select('*').order('name', { ascending: true }),
        ]);

        if (invRes.data) setInventory(invRes.data as unknown as InventoryItem[]);
        if (facRes.data) setFacilities(facRes.data as unknown as Facility[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return inventory;
    return inventory.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.code?.toLowerCase().includes(q) ||
        i.location?.toLowerCase().includes(q),
    );
  }, [inventory, search]);

  const filteredFacilities = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return facilities;
    return facilities.filter(
      (f) =>
        f.name?.toLowerCase().includes(q) ||
        f.location?.toLowerCase().includes(q) ||
        f.category?.toLowerCase().includes(q),
    );
  }, [facilities, search]);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.key === item.key);
      if (existing) {
        if (item.item_type === 'barang' && existing.maxQuantity && existing.quantity >= existing.maxQuantity) {
          showToast('Jumlah melebihi stok tersedia', 'warning');
          return prev;
        }
        return prev.map((c) =>
          c.key === item.key ? { ...c, quantity: c.quantity + item.quantity } : c,
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeFromCart = (key: string) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c;
        const newQty = c.quantity + delta;
        if (newQty < 1) return c;
        if (c.item_type === 'barang' && c.maxQuantity && newQty > c.maxQuantity) {
          showToast('Jumlah melebihi stok tersedia', 'warning');
          return c;
        }
        return { ...c, quantity: newQty };
      }),
    );
  };

  const handleAddLainnya = () => {
    const name = lainnyaName.trim();
    if (!name) {
      showToast('Nama barang/fasilitas tidak boleh kosong', 'error');
      return;
    }
    const key = `custom-${tab}-${name}`;
    addToCart({
      key,
      item_type: tab,
      inventory_id: null,
      facility_id: null,
      item_name: name,
      quantity: 1,
    });
    setLainnyaName('');
    setShowLainnya(false);
    showToast(`${tab === 'barang' ? 'Barang' : 'Fasilitas'} "${name}" ditambahkan`, 'success');
  };

  const validateForm = (): boolean => {
    if (cart.length === 0) {
      showToast('Keranjang masih kosong', 'error');
      return false;
    }
    if (!form.borrower_name.trim()) {
      showToast('Nama peminjam wajib diisi', 'error');
      return false;
    }
    if (!form.borrower_class.trim()) {
      showToast('Kelas/Unit wajib diisi', 'error');
      return false;
    }
    if (!form.borrower_email.trim()) {
      showToast('Email wajib diisi', 'error');
      return false;
    }
    if (!form.borrow_date) {
      showToast('Tanggal pinjam wajib diisi', 'error');
      return false;
    }
    if (!form.return_date) {
      showToast('Tanggal kembali wajib diisi', 'error');
      return false;
    }
    if (form.return_date < form.borrow_date) {
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
      const workflow = await getDefaultWorkflow();

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
        item_type: cart[0]?.item_type ?? 'barang',
        workflow_template_id: workflow?.id ?? null,
      };

      const { data: borrowingData, error: borrowingError } = await supabase
        .from('borrowings')
        .insert(borrowingPayload)
        .select('*')
        .single();

      if (borrowingError || !borrowingData) {
        showToast('Gagal membuat pengajuan: ' + (borrowingError?.message ?? 'Unknown error'), 'error');
        return;
      }

      const borrowingId = (borrowingData as any).id;

      // Insert borrowing items
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
        // Email failure is non-blocking
      }

      setSavedSummary({ id: borrowingId, items: [...cart], form: { ...form } });
      setSuccess(true);
      showToast('Pengajuan peminjaman berhasil dibuat!', 'success');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setCart([]);
    setSuccess(false);
    setSavedSummary(null);
    setShowLainnya(false);
    setLainnyaName('');
  };

  if (success && savedSummary) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center dark:border-emerald-800 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pengajuan Berhasil</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Pengajuan peminjaman Anda telah berhasil dibuat. Tim akan meninjau pengajuan ini.
          </p>

          <div className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800/50">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Peminjam</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{savedSummary.form.borrower_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Kelas/Unit</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{savedSummary.form.borrower_class}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Tanggal Pinjam</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{savedSummary.form.borrow_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Tanggal Kembali</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{savedSummary.form.return_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Keperluan</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{savedSummary.form.purpose}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
              <p className="mb-1 text-slate-500 dark:text-slate-400">Item:</p>
              <ul className="space-y-1">
                {savedSummary.items.map((item) => (
                  <li key={item.key} className="flex justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300">{item.item_name}</span>
                    <span className="font-medium text-slate-600 dark:text-slate-400">×{item.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={resetForm}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <RotateCcw className="h-4 w-4" />
            Buat Pengajuan Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-white">
          <ClipboardList className="h-7 w-7 text-brand-600 dark:text-brand-400" />
          Pengajuan Peminjaman
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Pilih barang atau fasilitas, isi data peminjam, lalu kirim pengajuan.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Item Selection */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            {/* Tabs */}
            <div className="mb-4 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                onClick={() => setTab('barang')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition',
                  tab === 'barang'
                    ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300'
                    : 'text-slate-500 dark:text-slate-400',
                )}
              >
                <Package className="h-4 w-4" />
                Barang
              </button>
              <button
                onClick={() => setTab('fasilitas')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition',
                  tab === 'fasilitas'
                    ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300'
                    : 'text-slate-500 dark:text-slate-400',
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Cari ${tab === 'barang' ? 'barang' : 'fasilitas'}...`}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Lainnya Card */}
            <div className="mb-4">
              {!showLainnya ? (
                <button
                  onClick={() => setShowLainnya(true)}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 p-4 text-left transition hover:border-brand-500 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/20 dark:hover:border-brand-500"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Lainnya...</p>
                    <p className="text-xs text-brand-600 dark:text-brand-400">
                      Tambah {tab === 'barang' ? 'barang' : 'fasilitas'} lain yang tidak ada di daftar
                    </p>
                  </div>
                </button>
              ) : (
                <div className="rounded-xl border-2 border-brand-300 bg-brand-50 p-4 dark:border-brand-700 dark:bg-brand-900/20">
                  <label className="mb-1.5 block text-sm font-medium text-brand-700 dark:text-brand-300">
                    Nama {tab === 'barang' ? 'Barang' : 'Fasilitas'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={lainnyaName}
                      onChange={(e) => setLainnyaName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLainnya())}
                      placeholder={`Ketik nama ${tab === 'barang' ? 'barang' : 'fasilitas'}...`}
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      autoFocus
                    />
                    <button
                      onClick={handleAddLainnya}
                      className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                      Tambah
                    </button>
                    <button
                      onClick={() => {
                        setShowLainnya(false);
                        setLainnyaName('');
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Item Grid */}
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                ))}
              </div>
            ) : tab === 'barang' ? (
              filteredItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Tidak ada barang tersedia.</p>
              ) : (
                <div className="grid max-h-[500px] gap-3 overflow-y-auto sm:grid-cols-2">
                  {filteredItems.map((item) => {
                    const inCart = cart.find((c) => c.key === item.id);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
                          {item.categories?.name && (
                            <span className="text-xs text-slate-400">{item.categories.name}</span>
                          )}
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            Tersedia: {item.available_quantity}
                            {item.location && ` • ${item.location}`}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            addToCart({
                              key: item.id,
                              item_type: 'barang',
                              inventory_id: item.id,
                              facility_id: null,
                              item_name: item.name,
                              quantity: 1,
                              maxQuantity: item.available_quantity,
                            })
                          }
                          disabled={inCart != null}
                          className={cn(
                            'ml-2 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                            inCart
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                              : 'bg-brand-600 text-white hover:bg-brand-700',
                          )}
                        >
                          {inCart ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          {inCart ? 'Ditambah' : 'Tambah'}
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
                {filteredFacilities.map((facility) => {
                  const inCart = cart.find((c) => c.key === facility.id);
                  return (
                    <div
                      key={facility.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{facility.name}</p>
                        {facility.category && <span className="text-xs text-slate-400">{facility.category}</span>}
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {facility.location ?? 'Lokasi tidak tersedia'}
                          {facility.capacity != null && ` • Kap: ${facility.capacity}`}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          addToCart({
                            key: facility.id,
                            item_type: 'fasilitas',
                            inventory_id: null,
                            facility_id: facility.id,
                            item_name: facility.name,
                            quantity: 1,
                          })
                        }
                        disabled={inCart != null}
                        className={cn(
                          'ml-2 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                          inCart
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : 'bg-brand-600 text-white hover:bg-brand-700',
                        )}
                      >
                        {inCart ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        {inCart ? 'Ditambah' : 'Tambah'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart & Form */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            {/* Cart */}
            <div className="mb-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-slate-400">
                <ShoppingCart className="h-4 w-4" />
                Keranjang ({cart.length})
              </h2>
              {cart.length === 0 ? (
                <p className="rounded-xl bg-slate-50 py-6 text-center text-sm text-slate-400 dark:bg-slate-800/50">
                  Keranjang kosong. Pilih item di sebelah kiri.
                </p>
              ) : (
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/50"
                    >
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                          {item.item_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {item.item_type === 'barang' ? 'Barang' : 'Fasilitas'}
                          {!item.inventory_id && !item.facility_id && ' (Lainnya)'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.item_type === 'barang' && (
                          <div className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-600">
                            <button
                              onClick={() => updateQty(item.key, -1)}
                              className="px-1.5 py-0.5 text-slate-500 hover:text-brand-600"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-[20px] text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQty(item.key, 1)}
                              className="px-1.5 py-0.5 text-slate-500 hover:text-brand-600"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => removeFromCart(item.key)}
                          className="rounded-lg p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Borrower Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Nama Peminjam <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.borrower_name}
                    onChange={(e) => setForm({ ...form, borrower_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Kelas/Unit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.borrower_class}
                  onChange={(e) => setForm({ ...form, borrower_class: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={form.borrower_email}
                      onChange={(e) => setForm({ ...form, borrower_email: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    No. Telepon <span className="text-slate-400">(opsional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={form.borrower_phone}
                      onChange={(e) => setForm({ ...form, borrower_phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Tgl Pinjam <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={form.borrow_date}
                      onChange={(e) => setForm({ ...form, borrow_date: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Tgl Kembali <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={form.return_date}
                      min={form.borrow_date}
                      onChange={(e) => setForm({ ...form, return_date: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Waktu Mulai <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Waktu Selesai <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Keperluan/Tujuan <span className="text-red-500">*</span>
                  <span className="ml-1 text-slate-400">(min. 10 karakter)</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    rows={2}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Catatan Tambahan <span className="text-slate-400">(opsional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || cart.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                Kirim Pengajuan
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
