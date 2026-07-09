import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Borrowing, BORROWING_STATUS_LABELS, BORROWING_STATUS_COLORS } from '../../types';
import { Search, Check, X, Eye, AlertTriangle, Package, Building2, Clock, RotateCcw, MessageSquare, Download, User } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function BorrowingsAdminPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(null);
  const [conflictWarning, setConflictWarning] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [approverName, setApproverName] = useState('');
  const [approverPosition, setApproverPosition] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('borrowings')
      .select('*, inventory(name, code), facilities(name)')
      .order('created_at', { ascending: false });
    if (error) console.error('Fetch borrowings error:', error);
    if (data) setBorrowings(data as Borrowing[]);
    setLoading(false);
  };

  const checkConflict = async (b: Borrowing): Promise<string | null> => {
    if (!b.borrow_date || !b.return_date || b.item_type !== 'ruangan') return null;
    if (!b.facility_id) return null;

    const { data, error } = await supabase
      .from('borrowings')
      .select('id, borrower_name, borrow_date, return_date, start_time, end_time')
      .eq('facility_id', b.facility_id)
      .in('status', ['approved', 'completed'])
      .neq('id', b.id)
      .lte('borrow_date', b.return_date)
      .gte('return_date', b.borrow_date);

    if (error) return null;

    if (data && data.length > 0) {
      for (const existing of data) {
        const dateOverlap = b.borrow_date <= existing.return_date && b.return_date >= existing.borrow_date;
        if (dateOverlap) {
          const newStart = b.start_time || '08:00';
          const newEnd = b.end_time || '16:00';
          const exStart = existing.start_time || '08:00';
          const exEnd = existing.end_time || '16:00';
          const timeOverlap = newStart < exEnd && newEnd > exStart;
          if (timeOverlap) {
            return `Jadwal tidak tersedia karena sudah digunakan oleh ${existing.borrower_name} pada tanggal ${new Date(existing.borrow_date).toLocaleDateString('id-ID')} jam ${exStart.slice(0, 5)} - ${exEnd.slice(0, 5)}`;
          }
        }
      }
    }
    return null;
  };

  const checkInventoryAvailability = async (b: Borrowing): Promise<{ available: boolean; message: string }> => {
    if (b.item_type !== 'barang' || !b.inventory_id) return { available: true, message: '' };

    const { data: inv } = await supabase.from('inventory').select('quantity').eq('id', b.inventory_id).single();
    if (!inv) return { available: false, message: 'Barang tidak ditemukan' };

    const { data: activeBorrowings } = await supabase
      .from('borrowings')
      .select('borrowed_units')
      .eq('inventory_id', b.inventory_id)
      .in('status', ['approved', 'pending'])
      .neq('id', b.id)
      .lte('borrow_date', b.return_date)
      .gte('return_date', b.borrow_date);

    const borrowedOnDate = (activeBorrowings || []).reduce((sum: number, x: any) => sum + (x.borrowed_units || 1), 0);
    const availableUnits = inv.quantity - borrowedOnDate;

    if ((b.borrowed_units || 1) > availableUnits) {
      return { available: false, message: `Unit tidak tersedia. Tersedia: ${availableUnits} unit` };
    }
    return { available: true, message: '' };
  };

  const sendEmailNotification = async (b: Borrowing, status: 'approved' | 'rejected') => {
    if (!b.borrower_email) return;
    const itemName = b.item_type === 'ruangan' ? b.facilities?.name : b.inventory?.name;
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v1/send-borrowing-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrower_name: b.borrower_name,
          borrower_email: b.borrower_email,
          item_name: itemName || '-',
          borrow_date: b.borrow_date,
          return_date: b.return_date || b.borrow_date,
          status,
        }),
      });
    } catch (err) {
      console.error('Email notification error:', err);
    }
  };

  const updateStatus = async (id: string, status: Borrowing['status'], notes?: string) => {
    setProcessing(true);
    setConflictWarning('');
    setActionError('');

    const borrowing = borrowings.find(b => b.id === id);
    if (!borrowing) {
      setProcessing(false);
      return;
    }

    if (status === 'approved') {
      const conflict = await checkConflict(borrowing);
      if (conflict) {
        setConflictWarning(conflict);
        setProcessing(false);
        return;
      }

      if (borrowing.item_type === 'barang') {
        const availability = await checkInventoryAvailability(borrowing);
        if (!availability.available) {
          setConflictWarning(availability.message);
          setProcessing(false);
          return;
        }
      }
    }

    const updateData: any = { status };
    if (notes !== undefined) updateData.admin_notes = notes;
    if (status === 'completed') updateData.actual_return_date = new Date().toISOString().split('T')[0];

    // Approval audit trail
    if (status === 'approved' || status === 'rejected') {
      if (approverName) updateData.approved_by = approverName;
      if (approverPosition) updateData.approver_position = approverPosition;
      updateData.approved_at = new Date().toISOString();
    }

    const { error } = await supabase.from('borrowings').update(updateData).eq('id', id);

    if (error) {
      setActionError(`Gagal mengubah status: ${error.message}`);
      setProcessing(false);
      return;
    }

    // Update inventory available_quantity if completed or approved
    if (borrowing.item_type === 'barang' && borrowing.inventory_id) {
      const { data: inv } = await supabase.from('inventory').select('quantity').eq('id', borrowing.inventory_id).single();
      if (inv) {
        const { data: activeBorrowings } = await supabase
          .from('borrowings')
          .select('borrowed_units')
          .eq('inventory_id', borrowing.inventory_id)
          .in('status', ['approved', 'pending']);
        const totalBorrowed = (activeBorrowings || []).reduce((sum: number, x: any) => sum + (x.borrowed_units || 1), 0);
        await supabase.from('inventory').update({ available_quantity: inv.quantity - totalBorrowed }).eq('id', borrowing.inventory_id);
      }
    }

    if (status === 'approved' || status === 'rejected') {
      await sendEmailNotification(borrowing, status as 'approved' | 'rejected');
    }

    setSelectedBorrowing(null);
    setAdminNotes('');
    fetchData();
    setProcessing(false);
  };

  const filtered = borrowings.filter(b => {
    const matchesSearch =
      b.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.borrower_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.inventory?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.facilities?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
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
        <p className="text-slate-600 dark:text-slate-400">Setujui atau tolak permintaan peminjaman</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Menunggu', value: pendingCount, icon: Clock, color: 'amber' },
          { label: 'Disetujui', value: approvedCount, icon: Check, color: 'emerald' },
          { label: 'Total', value: borrowings.length, icon: Package, color: 'blue' },
          { label: 'Ditolak', value: borrowings.filter(b => b.status === 'rejected').length, icon: X, color: 'red' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2">
              <s.icon className={cn('w-4 h-4', s.color === 'amber' ? 'text-amber-500' : s.color === 'emerald' ? 'text-emerald-500' : s.color === 'blue' ? 'text-blue-500' : 'text-red-500')} />
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
          <option value="pending">Menunggu Persetujuan</option>
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-200/50 dark:border-slate-700/50">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Peminjam</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Barang/Ruangan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tanggal & Jam</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Keperluan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm">
                          {b.borrower_name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-slate-900 dark:text-white">{b.borrower_name}</div>
                          <div className="text-xs text-slate-500">{b.borrower_class} &middot; {b.borrower_email || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {b.item_type === 'ruangan' ? <Building2 className="w-4 h-4 text-cyan-500" /> : <Package className="w-4 h-4 text-blue-500" />}
                        <div>
                          <div className="font-medium text-sm text-slate-900 dark:text-white">
                            {b.item_type === 'ruangan' ? b.facilities?.name : b.inventory?.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {b.item_type === 'barang' ? `${b.inventory?.code} | ${b.borrowed_units || 1} unit` : b.facilities?.location}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-900 dark:text-white">{formatDate(b.borrow_date)}</div>
                      <div className="text-xs text-slate-500">
                        {(b.start_time || '08:00').slice(0, 5)} - {b.return_date ? formatDate(b.return_date) : '-'} {(b.end_time || '16:00').slice(0, 5)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{b.purpose || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap', BORROWING_STATUS_COLORS[b.status])}>
                        {BORROWING_STATUS_LABELS[b.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setSelectedBorrowing(b); setAdminNotes(b.admin_notes || ''); setConflictWarning(''); setActionError(''); }}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400"><Eye className="w-4 h-4" /></button>
                        {b.status === 'pending' && (
                          <>
                            <button onClick={() => updateStatus(b.id, 'approved')}
                              className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-lg text-emerald-600"><Check className="w-4 h-4" /></button>
                            <button onClick={() => updateStatus(b.id, 'rejected')}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-red-600"><X className="w-4 h-4" /></button>
                          </>
                        )}
                        {b.status === 'approved' && (
                          <>
                            <button onClick={() => updateStatus(b.id, 'completed')}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 text-xs font-medium">Selesai</button>
                            <button onClick={() => updateStatus(b.id, 'cancelled')}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500"><RotateCcw className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedBorrowing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedBorrowing(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Detail Peminjaman</h3>
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', BORROWING_STATUS_COLORS[selectedBorrowing.status])}>
                    {BORROWING_STATUS_LABELS[selectedBorrowing.status]}
                  </span>
                </div>

                <div className="space-y-2.5">
                  <DetailRow label="Peminjam" value={`${selectedBorrowing.borrower_name} (${selectedBorrowing.borrower_class})`} />
                  <DetailRow label="Email" value={selectedBorrowing.borrower_email || '-'} />
                  <DetailRow label="No. HP" value={selectedBorrowing.borrower_phone || '-'} />
                  <DetailRow label="Barang/Ruangan" value={selectedBorrowing.item_type === 'ruangan' ? selectedBorrowing.facilities?.name || '-' : selectedBorrowing.inventory?.name || '-'} />
                  <DetailRow label="Jenis" value={selectedBorrowing.item_type === 'ruangan' ? 'Ruangan' : 'Barang'} />
                  {selectedBorrowing.item_type === 'barang' && <DetailRow label="Jumlah Unit" value={`${selectedBorrowing.borrowed_units || 1} unit`} />}
                  <DetailRow label="Tanggal Mulai" value={`${formatDate(selectedBorrowing.borrow_date)} jam ${(selectedBorrowing.start_time || '08:00').slice(0, 5)}`} />
                  <DetailRow label="Tanggal Selesai" value={`${selectedBorrowing.return_date ? formatDate(selectedBorrowing.return_date) : '-'} jam ${(selectedBorrowing.end_time || '16:00').slice(0, 5)}`} />
                  <DetailRow label="Keperluan" value={selectedBorrowing.purpose || '-'} />
                  <DetailRow label="Catatan Peminjam" value={selectedBorrowing.notes || '-'} />
                  {selectedBorrowing.document_url && (
                    <div className="pt-2">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Dokumen Pendukung</label>
                      <a href={selectedBorrowing.document_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30">
                        <Download className="w-4 h-4" /> {selectedBorrowing.document_name || 'Unduh Dokumen'}
                      </a>
                    </div>
                  )}
                </div>

                {/* Approval Trail */}
                {selectedBorrowing.approved_by && (
                  <div className="mt-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Disetujui Oleh:</span>
                    </div>
                    <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">{selectedBorrowing.approved_by}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">{selectedBorrowing.approver_position}</p>
                    <p className="text-xs text-emerald-500 dark:text-emerald-500 mt-1">
                      {selectedBorrowing.approved_at ? formatDate(selectedBorrowing.approved_at.split('T')[0]) : '-'}
                    </p>
                    {selectedBorrowing.admin_notes && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 italic">"{selectedBorrowing.admin_notes}"</p>
                    )}
                  </div>
                )}

                <AnimatePresence>
                  {conflictWarning && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700 dark:text-red-400">{conflictWarning}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {actionError && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700 dark:text-red-400">{actionError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {selectedBorrowing.status === 'pending' && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nama Penyetuju</label>
                        <input type="text" value={approverName} onChange={e => setApproverName(e.target.value)} placeholder="Contoh: Andri Rahmadi, S.ST."
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Jabatan</label>
                        <input type="text" value={approverPosition} onChange={e => setApproverPosition(e.target.value)} placeholder="Contoh: Wakasek Sarpras"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" /> Catatan
                      </label>
                      <textarea rows={2} value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                        placeholder="Tambahkan catatan..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
                    </div>
                  </div>
                )}

                {selectedBorrowing.admin_notes && selectedBorrowing.status !== 'pending' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" /> Catatan Admin
                    </label>
                    <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">{selectedBorrowing.admin_notes}</p>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  {selectedBorrowing.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(selectedBorrowing.id, 'approved', adminNotes)} disabled={processing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50">
                        <Check className="w-4 h-4" /> Setujui
                      </button>
                      <button onClick={() => updateStatus(selectedBorrowing.id, 'rejected', adminNotes)} disabled={processing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50">
                        <X className="w-4 h-4" /> Tolak
                      </button>
                    </>
                  )}
                  {selectedBorrowing.status === 'approved' && (
                    <>
                      <button onClick={() => updateStatus(selectedBorrowing.id, 'completed')} disabled={processing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50">
                        <Check className="w-4 h-4" /> Tandai Selesai
                      </button>
                      <button onClick={() => updateStatus(selectedBorrowing.id, 'cancelled')} disabled={processing}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50">
                        <RotateCcw className="w-4 h-4" /> Batalkan
                      </button>
                    </>
                  )}
                  <button onClick={() => setSelectedBorrowing(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700">
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-white text-right max-w-[60%]">{value}</span>
    </div>
  );
}
