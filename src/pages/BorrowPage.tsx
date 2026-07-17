import { useEffect, useState, useMemo } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, Send, CheckCircle, Loader2, Package, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { getDefaultWorkflow, type WorkflowTemplate } from '../lib/workflow';
import { cn } from '../utils/cn';

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  condition: string;
  category_id: string | null;
  categories: { name: string } | null;
}

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  maxQuantity: number;
}

interface BorrowerForm {
  borrower_name: string;
  borrower_class: string;
  borrower_email: string;
  borrower_phone: string;
  borrow_date: string;
  return_date: string;
  purpose: string;
}

const inputClass =
  'w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all';

export default function BorrowPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [workflowTemplate, setWorkflowTemplate] = useState<WorkflowTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BorrowerForm>({
    borrower_name: '',
    borrower_class: '',
    borrower_email: '',
    borrower_phone: '',
    borrow_date: '',
    return_date: '',
    purpose: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [invRes, wf] = await Promise.all([
        supabase
          .from('inventory')
          .select('id, name, description, quantity, condition, category_id, categories (name)')
          .order('name', { ascending: true }),
        getDefaultWorkflow(),
      ]);
      setItems((invRes.data as unknown as InventoryItem[]) || []);
      setWorkflowTemplate(wf);
      setLoading(false);
    };
    fetchData();
  }, []);

  const availableItems = useMemo(() => {
    return items.filter((item) => {
      const condition = (item.condition || '').toLowerCase();
      return condition === 'good' && item.quantity > 0;
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return availableItems;
    const q = search.toLowerCase();
    return availableItems.filter(
      (item) => item.name?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q)
    );
  }, [availableItems, search]);

  const addToCart = (item: InventoryItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        if (existing.quantity >= item.quantity) return prev;
        return prev.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { id: item.id, name: item.name, quantity: 1, maxQuantity: item.quantity }];
    });
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.id !== id) return c;
          const newQty = c.quantity + delta;
          if (newQty < 1) return c;
          if (newQty > c.maxQuantity) return c;
          return { ...c, quantity: newQty };
        })
    );
  };

  const setCartQuantity = (id: string, qty: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const clamped = Math.max(1, Math.min(qty, c.maxQuantity));
        return { ...c, quantity: clamped };
      })
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError('Keranjang masih kosong. Pilih minimal satu barang.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      // 1. Create borrowing record
      const { data: borrowing, error: borrowingError } = await supabase
        .from('borrowings')
        .insert({
          borrower_name: form.borrower_name,
          borrower_class: form.borrower_class,
          borrower_email: form.borrower_email,
          borrower_phone: form.borrower_phone,
          borrow_date: form.borrow_date,
          return_date: form.return_date,
          purpose: form.purpose,
          status: 'pending',
          current_step: 1,
          current_status_label: 'Menunggu Persetujuan',
        })
        .select('id')
        .single();

      if (borrowingError || !borrowing) throw borrowingError || new Error('Gagal membuat peminjaman');

      // 2. Create borrowing_items for each cart item
      const borrowingItems = cart.map((item) => ({
        borrowing_id: borrowing.id,
        item_name: item.name,
        item_type: 'inventory',
        quantity: item.quantity,
        status: 'pending',
        current_step: 1,
        current_status_label: 'Menunggu Persetujuan',
        workflow_template_id: workflowTemplate?.id || null,
      }));

      const { error: itemsError } = await supabase.from('borrowing_items').insert(borrowingItems);
      if (itemsError) throw itemsError;

      // 3. Send email notification via edge function
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v2/send-borrowing-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_request',
            borrowing_id: borrowing.id,
            borrower_name: form.borrower_name,
            borrower_email: form.borrower_email,
            items: cart.map((c) => ({ name: c.name, quantity: c.quantity })),
          }),
        });
      } catch {
        // Email failure is non-blocking
      }

      setSuccess(true);
      setCart([]);
      setForm({
        borrower_name: '',
        borrower_class: '',
        borrower_email: '',
        borrower_phone: '',
        borrow_date: '',
        return_date: '',
        purpose: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengajukan peminjaman.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200/50 dark:border-slate-700/50 text-center max-w-md w-full animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Peminjaman Berhasil Diajukan!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Permintaan peminjaman Anda telah dikirim. Anda akan menerima notifikasi
              setelah permintaan ditinjau. Pantau status di halaman Riwayat.
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="px-6 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
            >
              Ajukan Peminjaman Lain
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-6 h-6 text-blue-500" />
            <h1 className="text-3xl font-bold">Ajukan Peminjaman</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            Pilih barang dari inventaris, isi formulir, lalu kirim permintaan peminjaman.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Item selection */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari barang..."
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Items */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <EmptyState icon={Package} title="Tidak ada barang tersedia" description="Coba ubah kata kunci pencarian." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredItems.map((item) => {
                    const inCart = cart.find((c) => c.id === item.id);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-center justify-between gap-3 p-4 rounded-xl border transition-all',
                          inCart
                            ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-700'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.categories?.name || 'Tanpa kategori'} &middot; {item.quantity} unit
                          </p>
                        </div>
                        <button
                          onClick={() => addToCart(item)}
                          disabled={!!inCart && inCart.quantity >= item.quantity}
                          className={cn(
                            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0',
                            inCart
                              ? 'bg-blue-500 text-white'
                              : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                          )}
                        >
                          {inCart ? (
                            <>{inCart.quantity} di Keranjang</>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Tambah
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Cart + form */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 sticky top-20">
              {/* Cart */}
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="w-5 h-5 text-blue-500" />
                <h2 className="font-semibold text-lg">Keranjang</h2>
                {cart.length > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                    {cart.length} item
                  </span>
                )}
              </div>

              {cart.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Keranjang kosong. Pilih barang di sebelah kiri.</p>
              ) : (
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-slate-400">Max: {item.maxQuantity}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => updateCartQuantity(item.id, -1)}
                          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => setCartQuantity(item.id, parseInt(e.target.value) || 1)}
                          min={1}
                          max={item.maxQuantity}
                          className="w-12 text-center text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => updateCartQuantity(item.id, 1)}
                          disabled={item.quantity >= item.maxQuantity}
                          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Borrower form */}
              <form onSubmit={handleSubmit} className="space-y-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <input
                  type="text"
                  name="borrower_name"
                  value={form.borrower_name}
                  onChange={handleFormChange}
                  required
                  placeholder="Nama peminjam"
                  className={inputClass + ' text-sm'}
                />
                <input
                  type="text"
                  name="borrower_class"
                  value={form.borrower_class}
                  onChange={handleFormChange}
                  required
                  placeholder="Kelas / unit"
                  className={inputClass + ' text-sm'}
                />
                <input
                  type="email"
                  name="borrower_email"
                  value={form.borrower_email}
                  onChange={handleFormChange}
                  required
                  placeholder="Email"
                  className={inputClass + ' text-sm'}
                />
                <input
                  type="tel"
                  name="borrower_phone"
                  value={form.borrower_phone}
                  onChange={handleFormChange}
                  required
                  placeholder="No. telepon"
                  className={inputClass + ' text-sm'}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Tgl Pinjam</label>
                    <input
                      type="date"
                      name="borrow_date"
                      value={form.borrow_date}
                      onChange={handleFormChange}
                      required
                      className={inputClass + ' text-sm'}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Tgl Kembali</label>
                    <input
                      type="date"
                      name="return_date"
                      value={form.return_date}
                      onChange={handleFormChange}
                      required
                      className={inputClass + ' text-sm'}
                    />
                  </div>
                </div>
                <textarea
                  name="purpose"
                  value={form.purpose}
                  onChange={handleFormChange}
                  required
                  rows={2}
                  placeholder="Keperluan"
                  className={inputClass + ' text-sm resize-none'}
                />

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Ajukan Peminjaman
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
