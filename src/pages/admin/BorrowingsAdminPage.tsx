import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Check, X, Eye, AlertTriangle, Package, Building2, Clock, RotateCcw, MessageSquare, User, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../utils/cn';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
  inventory_id: string | null;
  facility_id: string | null;
  item_type: string;
  item_name: string;
  quantity: number;
  status: string;
  current_status_label: string;
  assigned_approver_name: string;
  assigned_approver_role: string;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_class: string;
  borrower_email: string;
  borrower_phone: string;
  item_type: string;
  borrowed_units: number;
  borrow_date: string;
  return_date: string | null;
  start_time: string;
  end_time: string;
  purpose: string;
  notes: string;
  status: string;
  current_status_label: string;
  admin_notes: string;
  approved_by: string;
  approver_position: string;
  approved_at: string;
  inventory?: { name: string; code: string } | null;
  facilities?: { name: string; location: string } | null;
  borrowing_items?: BorrowingItem[];
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  in_use: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  returned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  in_use: 'Dipinjam',
  returned: 'Dikembalikan',
};

export default function BorrowingsAdminPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [approverName, setApproverName] = useState('');
  const [approverPosition, setApproverPosition] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('borrowings')
      .select('*, inventory(name, code), facilities(name, location), borrowing_items(*)')
      .order('created_at', { ascending: false });
    if (error) console.error('Fetch error:', error);
    if (data) setBorrowings(data as Borrowing[]);
    setLoading(false);
  }

  function toggleExpand(id: string) {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Per-item approval
  async function updateItemStatus(itemId: string, status: 'approved' | 'rejected', notes?: string) {
    setProcessing(true);
    setActionError('');
    const statusLabel = status === 'approved' ? 'Disetujui' : 'Ditolak';

    const updateData: any = {
      status,
      current_status_label: statusLabel,
      assigned_approver_name: approverName || '',
      assigned_approver_role: approverPosition || '',
    };

    const { error } = await supabase.from('borrowing_items').update(updateData).eq('id', itemId);
    if (error) { setActionError(error.message); setProcessing(false); return; }

    // Log to approval_history
    if (selectedBorrowing) {
      await supabase.from('approval_history').insert({
        borrowing_id: selectedBorrowing.id,
        borrowing_item_id: itemId,
        step_order: 1,
        step_label: statusLabel,
        approver_name: approverName || 'Admin',
        approver_role: approverPosition || 'Admin',
        status,
        notes: notes || '',
        acted_at: new Date().toISOString(),
      });
    }

    // Recalculate overall borrowing status
    if (selectedBorrowing) {
      const items = (selectedBorrowing.borrowing_items || []).map(i =>
        i.id === itemId ? { ...i, status, current_status_label: statusLabel } : i
      );
      const allApproved = items.every(i => i.status === 'approved' || i.status === 'returned');
      const anyRejected = items.some(i => i.status === 'rejected');
      const anyPending = items.some(i => i.status === 'pending');

      let overallStatus = 'pending';
      let overallLabel = 'Menunggu Persetujuan';
      if (anyRejected) { overallStatus = 'rejected'; overallLabel = 'Ditolak'; }
      else if (allApproved) { overallStatus = 'approved'; overallLabel = 'Disetujui'; }
      else if (!anyPending) { overallStatus = 'partially_approved'; overallLabel = 'Sebagian Disetujui'; }

      await supabase.from('borrowings').update({
        status: overallStatus,
        current_status_label: overallLabel,
        admin_notes: notes || adminNotes,
      }).eq('id', selectedBorrowing.id);

      // Send email notification
      if (selectedBorrowing.borrower_email) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          await fetch(`${supabaseUrl}/functions/v1/send-borrowing-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              borrower_name: selectedBorrowing.borrower_name,
              borrower_email: selectedBorrowing.borrower_email,
              item_name: items.find(i => i.id === itemId)?.item_name || '-',
              borrow_date: selectedBorrowing.borrow_date,
              return_date: selectedBorrowing.return_date || selectedBorrowing.borrow_date,
              status,
            }),
          });
        } catch (err) { console.error('Email error:', err); }
      }
    }

    setProcessing(false);
    fetchData();
    if (selectedBorrowing) {
      const updated = { ...selectedBorrowing };
      updated.borrowing_items = (updated.borrowing_items || []).map(i =>
        i.id === itemId ? { ...i, status, current_status_label: statusLabel } : i
      );
      setSelectedBorrowing(updated);
    }
  }

  async function updateBorrowingStatus(id: string, status: string, notes?: string) {
    setProcessing(true);
    setActionError('');
    const updateData: any = { status };
    if (notes !== undefined) updateData.admin_notes = notes;
    if (status === 'completed') updateData.actual_return_date = new Date().toISOString().split('T')[0];
    if (status === 'approved' || status === 'rejected') {
      if (approverName) updateData.approved_by = approverName;
      if (approverPosition) updateData.approver_position = approverPosition;
      updateData.approved_at = new Date().toISOString();
    }

    const { error } = await supabase.from('borrowings').update(updateData).eq('id', id);
    if (error) { setActionError(error.message); setProcessing(false); return; }

    // Also update all items
    if (selectedBorrowing?.borrowing_items?.length) {
      const itemStatus = status === 'completed' ? 'returned' : status;
      const itemLabel = STATUS_LABELS[itemStatus] || status;
      await supabase.from('borrowing_items')
        .update({ status: itemStatus, current_status_label: itemLabel })
        .eq('borrowing_id', id);
    }

    setProcessing(false);
    setSelectedBorrowing(null);
    setAdminNotes('');
    fetchData();
  }

  const filtered = borrowings.filter(b => {
    const matchesSearch = b.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.borrower_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.borrowing_items || []).some(i => i.item_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = !statusFilter || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: string) => new Date(date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

  const pendingCount = borrowings.filter(b => b.status === 'pending').length;
  const approvedCount = borrowings.filter(b => b.status === 'approved').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kelola Peminjaman</h1>
        <p className="text-slate-600 dark:text-slate-400">Setujui atau tolak permintaan peminjaman per item</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Menunggu', value: pendingCount, icon: Clock, color: 'text-amber-500' },
          { label: 'Disetujui', value: approvedCount, icon: Check, color: 'text-emerald-500' },
          { label: 'Total', value: borrowings.length, icon: Package, color: 'text-blue-500' },
          { label: 'Ditolak', value: borrowings.filter(b => b.status === 'rejected').length, icon: X, color: 'text-red-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2">
              <s.icon className={cn('w-4 h-4', s.color)} />
              <span className="text-lg font-bold text-slate-900 dark:text-white">{s.value}</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Cari peminjam, email, barang..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300">
          <option value="">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
          <option value="completed">Selesai</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada data peminjaman</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => {
            const items = b.borrowing_items || [];
            const isExpanded = expandedItems.has(b.id);
            const pendingItems = items.filter(i => i.status === 'pending').length;
            return (
              <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {b.borrower_name[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-slate-900 dark:text-white">{b.borrower_name}</p>
                      <span className="text-xs text-slate-500">{b.borrower_class}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{b.purpose || '-'} · {formatDate(b.borrow_date)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400 hidden sm:block">{items.length} item</span>
                    {pendingItems > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{pendingItems} menunggu</span>}
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap', STATUS_COLORS[b.status] || 'bg-slate-100')}>{b.current_status_label || STATUS_LABELS[b.status] || b.status}</span>
                    <button onClick={() => toggleExpand(b.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-700">
                    {/* Items list with per-item approval */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Item Peminjaman</span>
                      </div>
                      {items.map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg">
                          {item.item_type === 'ruangan' ? <Building2 className="w-4 h-4 text-blue-500" /> : <Package className="w-4 h-4 text-cyan-500" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.item_name}</p>
                            <p className="text-xs text-slate-400">×{item.quantity} · {item.item_type === 'ruangan' ? 'Ruangan' : 'Barang'}</p>
                          </div>
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0', STATUS_COLORS[item.status] || 'bg-slate-100')}>{item.current_status_label || STATUS_LABELS[item.status] || item.status}</span>
                          {item.status === 'pending' && (
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => updateItemStatus(item.id, 'approved')} disabled={processing}
                                className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-200 disabled:opacity-50"><Check className="w-3.5 h-3.5" /></button>
                              <button onClick={() => updateItemStatus(item.id, 'rejected')} disabled={processing}
                                className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 hover:bg-red-200 disabled:opacity-50"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Borrower details */}
                    <div className="px-4 pb-4 grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-slate-400">Email</span><p className="text-slate-700 dark:text-slate-200 truncate">{b.borrower_email || '-'}</p></div>
                      <div><span className="text-slate-400">No. HP</span><p className="text-slate-700 dark:text-slate-200">{b.borrower_phone || '-'}</p></div>
                      <div><span className="text-slate-400">Jam</span><p className="text-slate-700 dark:text-slate-200">{(b.start_time || '08:00').slice(0, 5)} - {(b.end_time || '16:00').slice(0, 5)}</p></div>
                      <div><span className="text-slate-400">Kembali</span><p className="text-slate-700 dark:text-slate-200">{b.return_date ? formatDate(b.return_date) : '-'}</p></div>
                      {b.notes && <div className="col-span-2"><span className="text-slate-400">Catatan</span><p className="text-slate-700 dark:text-slate-200">{b.notes}</p></div>}
                    </div>

                    {/* Approver info for pending */}
                    {b.status === 'pending' && (
                      <div className="px-4 pb-4">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Nama Penyetuju</label>
                            <input type="text" value={approverName} onChange={e => setApproverName(e.target.value)} placeholder="Nama..."
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Jabatan</label>
                            <input type="text" value={approverPosition} onChange={e => setApproverPosition(e.target.value)} placeholder="Jabatan..."
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => updateBorrowingStatus(b.id, 'approved', adminNotes)} disabled={processing}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50">
                            <Check className="w-4 h-4" /> Setujui Semua
                          </button>
                          <button onClick={() => updateBorrowingStatus(b.id, 'rejected', adminNotes)} disabled={processing}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50">
                            <X className="w-4 h-4" /> Tolak Semua
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Completed actions */}
                    {b.status === 'approved' && (
                      <div className="px-4 pb-4 flex gap-2">
                        <button onClick={() => updateBorrowingStatus(b.id, 'completed')} disabled={processing}
                          className="flex-1 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50">Tandai Selesai</button>
                        <button onClick={() => updateBorrowingStatus(b.id, 'cancelled')} disabled={processing}
                          className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"><RotateCcw className="w-4 h-4" /></button>
                      </div>
                    )}

                    {actionError && (
                      <div className="mx-4 mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-400">{actionError}</p>
                      </div>
                    )}

                    {b.admin_notes && b.status !== 'pending' && (
                      <div className="px-4 pb-4">
                        <div className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-1"><MessageSquare className="w-3.5 h-3.5" /> Catatan Admin</div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">{b.admin_notes}</p>
                      </div>
                    )}

                    {b.approved_by && (
                      <div className="mx-4 mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{b.approved_by}</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-500">{b.approver_position}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
