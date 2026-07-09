import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Send, User, Package, Calendar, Mail, Phone, Building2, FileText, MessageSquare, AlertCircle, CheckCircle2, Clock, Upload, X, Download } from 'lucide-react';
import { Inventory, Facility, Borrowing, BORROWING_STATUS_LABELS, BORROWING_STATUS_COLORS } from '../types';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { cn } from '../utils/cn';

const initialFormData = {
  inventory_id: '' as string | null,
  facility_id: '' as string | null,
  borrower_name: '',
  borrower_class: '',
  borrower_email: '',
  borrower_phone: '',
  item_type: 'barang' as 'barang' | 'ruangan',
  borrowed_units: 1,
  borrow_date: new Date().toISOString().split('T')[0],
  return_date: '',
  start_time: '08:00',
  end_time: '16:00',
  purpose: '',
  notes: '',
  document_file: null as File | null,
};

export default function BorrowPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [conflictError, setConflictError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [uploading, setUploading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [invRes, facRes, borRes] = await Promise.all([
        supabase.from('inventory').select('*').eq('condition', 'good').order('name'),
        supabase.from('facilities').select('*').order('name'),
        supabase.from('borrowings').select('*, inventory(name, code), facilities(name)').order('created_at', { ascending: false }).limit(20),
      ]);
      if (invRes.data) setInventory(invRes.data);
      if (facRes.data) setFacilities(facRes.data);
      if (borRes.data) setBorrowings(borRes.data as Borrowing[]);
    } catch (err) {
      console.error('Fetch error:', err);
    }
    setLoading(false);
  };

  const fetchRecentBorrowings = async () => {
    const { data, error } = await supabase
      .from('borrowings')
      .select('*, inventory(name, code), facilities(name)')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data && !error) setBorrowings(data as Borrowing[]);
  };

  const checkAvailability = async (): Promise<{ available: boolean; message: string }> => {
    if (formData.item_type === 'barang' && formData.inventory_id) {
      const item = inventory.find(i => i.id === formData.inventory_id);
      if (!item) return { available: false, message: 'Barang tidak ditemukan' };

      const { data: activeBorrowings } = await supabase
        .from('borrowings')
        .select('borrowed_units')
        .eq('inventory_id', formData.inventory_id)
        .in('status', ['approved', 'pending'])
        .lte('borrow_date', formData.return_date)
        .gte('return_date', formData.borrow_date);

      const borrowedOnDate = (activeBorrowings || []).reduce((sum: number, b: any) => sum + (b.borrowed_units || 1), 0);
      const availableUnits = item.quantity - borrowedOnDate;

      if (formData.borrowed_units > availableUnits) {
        return { available: false, message: `Unit barang tidak tersedia untuk tanggal yang dipilih. Tersedia: ${availableUnits} unit` };
      }
    }
    return { available: true, message: '' };
  };

  const checkConflict = async (): Promise<string | null> => {
    if (!formData.borrow_date || !formData.return_date || !formData.start_time || !formData.end_time) return null;

    if (formData.start_time >= formData.end_time) {
      return 'Jam selesai harus lebih lambat dari jam mulai';
    }

    const targetId = formData.item_type === 'barang' ? formData.inventory_id : formData.facility_id;
    const targetField = formData.item_type === 'barang' ? 'inventory_id' : 'facility_id';

    if (!targetId) return null;

    if (formData.item_type === 'ruangan') {
      const { data, error } = await supabase
        .from('borrowings')
        .select('id, borrower_name, borrow_date, return_date, start_time, end_time')
        .eq(targetField, targetId)
        .in('status', ['approved', 'pending'])
        .lte('borrow_date', formData.return_date)
        .gte('return_date', formData.borrow_date);

      if (error) return null;

      if (data && data.length > 0) {
        for (const existing of data) {
          const exStartTime = existing.start_time || '08:00';
          const exEndTime = existing.end_time || '16:00';

          // Time overlap: new period overlaps with existing period
          // Overlap occurs when: new_start < existing_end AND new_end > existing_start
          const timeOverlap = formData.start_time < exEndTime && formData.end_time > exStartTime;

          if (timeOverlap) {
            const dateStr = new Date(existing.borrow_date).toLocaleDateString('id-ID');
            return `Jadwal tidak tersedia karena sudah digunakan oleh ${existing.borrower_name} pada ${dateStr} jam ${exStartTime.slice(0, 5)} - ${exEndTime.slice(0, 5)}`;
          }
        }
      }
    }

    return null;
  };

  const uploadDocument = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `documents/${fileName}`;

    const { error } = await supabase.storage.from('borrowing-documents').upload(filePath, file);
    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data } = supabase.storage.from('borrowing-documents').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setConflictError('');
    setSubmitError('');
    setSubmitSuccess(false);

    if (!formData.inventory_id && !formData.facility_id) {
      setSubmitError('Pilih barang atau ruangan terlebih dahulu');
      setSubmitting(false);
      return;
    }

    if (formData.start_time >= formData.end_time) {
      setSubmitError('Jam selesai harus lebih lambat dari jam mulai');
      setSubmitting(false);
      return;
    }

    if (formData.borrow_date > formData.return_date) {
      setSubmitError('Tanggal selesai harus sama atau setelah tanggal mulai');
      setSubmitting(false);
      return;
    }

    // Check availability for multi-unit items
    const availability = await checkAvailability();
    if (!availability.available) {
      setConflictError(availability.message);
      setSubmitting(false);
      return;
    }

    // Check time conflict for rooms
    const conflict = await checkConflict();
    if (conflict) {
      setConflictError(conflict);
      setSubmitting(false);
      return;
    }

    // Upload document if selected
    let documentUrl = '';
    let documentName = '';
    if (selectedDocument) {
      setUploading(true);
      const url = await uploadDocument(selectedDocument);
      if (url) {
        documentUrl = url;
        documentName = selectedDocument.name;
      }
      setUploading(false);
    }

    const insertData = {
      borrower_name: formData.borrower_name,
      borrower_class: formData.borrower_class,
      borrower_email: formData.borrower_email,
      borrower_phone: formData.borrower_phone,
      item_type: formData.item_type,
      borrowed_units: formData.item_type === 'barang' ? formData.borrowed_units : 1,
      borrow_date: formData.borrow_date,
      return_date: formData.return_date || formData.borrow_date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      purpose: formData.purpose,
      notes: formData.notes,
      status: 'pending',
      document_url: documentUrl,
      document_name: documentName,
      inventory_id: formData.item_type === 'barang' && formData.inventory_id ? formData.inventory_id : null,
      facility_id: formData.item_type === 'ruangan' && formData.facility_id ? formData.facility_id : null,
    };

    const { error } = await supabase.from('borrowings').insert([insertData]);

    if (error) {
      console.error('Insert error:', error);
      setSubmitError(`Gagal menyimpan: ${error.message}`);
    } else {
      setSubmitSuccess(true);
      setFormData(initialFormData);
      setSelectedItem('');
      setSelectedDocument(null);
      fetchRecentBorrowings();
      setTimeout(() => setSubmitSuccess(false), 5000);
    }
    setSubmitting(false);
  };

  const filteredItems = (formData.item_type === 'barang' ? inventory : facilities).filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ('code' in item && item.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (date: string) => new Date(date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

  const getAvailableUnits = (itemId: string): number => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return 0;
    // Simple calculation - in real time would need to check active borrowings
    return item.available_quantity || item.quantity;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <section className="pt-24 pb-8 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Peminjaman Sarana & Prasarana
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="text-slate-600 dark:text-slate-400">
            Ajukan peminjaman barang atau ruangan sekolah
          </motion.p>
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <div className="flex gap-2">
          {[
            { key: 'form' as const, label: 'Form Peminjaman' },
            { key: 'history' as const, label: 'Riwayat Peminjaman' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
                activeTab === tab.key
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              )}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'form' ? (
          <motion.section key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pb-8">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" /> Form Peminjaman
                  </h2>

                  {/* Success */}
                  <AnimatePresence>
                    {submitSuccess && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Pengajuan berhasil dikirim!</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-500">Status: Menunggu Persetujuan. Anda akan dihubungi via email.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Conflict/Error */}
                  <AnimatePresence>
                    {(conflictError || submitError) && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-400">{conflictError || submitError}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Item Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Jenis Peminjaman</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { type: 'barang' as const, label: 'Barang / Inventaris', icon: Package },
                          { type: 'ruangan' as const, label: 'Ruangan / Fasilitas', icon: Building2 },
                        ].map(opt => (
                          <button key={opt.type} type="button"
                            onClick={() => { setFormData({ ...formData, item_type: opt.type, inventory_id: null, facility_id: null }); setSelectedItem(''); }}
                            className={cn('flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left',
                              formData.item_type === opt.type ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            )}>
                            <opt.icon className={cn('w-6 h-6', formData.item_type === opt.type ? 'text-blue-500' : 'text-slate-400')} />
                            <span className={cn('text-sm font-medium', formData.item_type === opt.type ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400')}>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Search & Select Item */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {formData.item_type === 'barang' ? 'Pilih Barang' : 'Pilih Ruangan'} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative mb-3">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input type="text" placeholder={formData.item_type === 'barang' ? 'Cari barang...' : 'Cari ruangan...'} value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" />
                      </div>
                      {!loading && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-40 overflow-y-auto">
                          {filteredItems.map(item => {
                            const isItem = 'available_quantity' in item;
                            const available = isItem ? getAvailableUnits(item.id) : 1;
                            return (
                              <button key={item.id} type="button"
                                onClick={() => {
                                  setSelectedItem(item.id);
                                  if (formData.item_type === 'barang') {
                                    setFormData({ ...formData, inventory_id: item.id, facility_id: null, borrowed_units: 1 });
                                  } else {
                                    setFormData({ ...formData, facility_id: item.id, inventory_id: null });
                                  }
                                }}
                                className={cn('p-3 rounded-xl border-2 text-left transition-all',
                                  selectedItem === item.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                )}>
                                <div className="font-medium text-slate-900 dark:text-white text-sm truncate">{item.name}</div>
                                {'code' in item && <div className="text-xs text-slate-400">{item.code}</div>}
                                {isItem && (
                                  <div className={cn('text-xs mt-1', available > 0 ? 'text-green-600' : 'text-red-600')}>
                                    Tersedia: {available} unit
                                  </div>
                                )}
                                {'capacity' in item && <div className="text-xs text-slate-400">Kapasitas: {item.capacity}</div>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Borrower Info */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-4">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <User className="w-4 h-4" /> Data Peminjam
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="text" required placeholder="Nama Peminjam *" value={formData.borrower_name}
                            onChange={e => setFormData({ ...formData, borrower_name: e.target.value })}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        </div>
                        <input type="text" required placeholder="Kelas / Unit *" value={formData.borrower_class}
                          onChange={e => setFormData({ ...formData, borrower_class: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="email" required placeholder="Email Aktif *" value={formData.borrower_email}
                            onChange={e => setFormData({ ...formData, borrower_email: e.target.value })}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="tel" placeholder="Nomor HP" value={formData.borrower_phone}
                            onChange={e => setFormData({ ...formData, borrower_phone: e.target.value })}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Tanggal & Waktu <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="date" required value={formData.borrow_date}
                            onChange={e => setFormData({ ...formData, borrow_date: e.target.value })}
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
                          <span className="absolute -top-2 left-3 text-[10px] text-slate-500 bg-white dark:bg-slate-700 px-1">Tanggal Mulai</span>
                        </div>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="time" required value={formData.start_time}
                            onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
                          <span className="absolute -top-2 left-3 text-[10px] text-slate-500 bg-white dark:bg-slate-700 px-1">Jam Mulai</span>
                        </div>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="date" required value={formData.return_date}
                            onChange={e => setFormData({ ...formData, return_date: e.target.value })}
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
                          <span className="absolute -top-2 left-3 text-[10px] text-slate-500 bg-white dark:bg-slate-700 px-1">Tanggal Selesai</span>
                        </div>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="time" required value={formData.end_time}
                            onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
                          <span className="absolute -top-2 left-3 text-[10px] text-slate-500 bg-white dark:bg-slate-700 px-1">Jam Selesai</span>
                        </div>
                      </div>
                    </div>

                    {/* Units for Barang */}
                    {formData.item_type === 'barang' && selectedItem && (
                      <div className="max-w-xs">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Jumlah Unit yang Dipinjam <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="number" min="1" max={getAvailableUnits(selectedItem)} required value={formData.borrowed_units}
                            onChange={e => setFormData({ ...formData, borrowed_units: parseInt(e.target.value) || 1 })}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Tersedia: {getAvailableUnits(selectedItem)} unit</p>
                      </div>
                    )}

                    {/* Purpose */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Keperluan Peminjaman <span className="text-red-500">*</span>
                      </label>
                      <textarea rows={2} required placeholder="Jelaskan keperluan peminjaman..." value={formData.purpose}
                        onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Catatan Tambahan</label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <textarea rows={2} placeholder="Catatan tambahan (opsional)..." value={formData.notes}
                          onChange={e => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                      </div>
                    </div>

                    {/* Document Upload */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        <Upload className="w-4 h-4 inline mr-1" /> Dokumen Pendukung (opsional)
                      </label>
                      <p className="text-xs text-slate-500 mb-2">Surat permohonan, proposal, atau dokumen pendukung lainnya (PDF, DOC, JPG, PNG)</p>
                      <div className="flex items-center gap-3">
                        <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={e => setSelectedDocument(e.target.files?.[0] || null)}
                          className="hidden" id="document-upload" />
                        <label htmlFor="document-upload"
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 cursor-pointer hover:border-blue-400 transition-colors">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">{selectedDocument ? selectedDocument.name : 'Pilih file...'}</span>
                        </label>
                        {selectedDocument && (
                          <button type="button" onClick={() => setSelectedDocument(null)}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <button type="submit" disabled={submitting || uploading || !selectedItem}
                      className={cn('w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium transition-all',
                        submitting || uploading || !selectedItem
                          ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]'
                      )}>
                      <Send className="w-5 h-5" />
                      {uploading ? 'Mengunggah dokumen...' : submitting ? 'Memeriksa & Mengirim...' : 'Ajukan Peminjaman'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Sidebar */}
              <div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Riwayat Terbaru</h2>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {borrowings.length === 0 ? (
                      <p className="text-slate-500 text-center py-8 text-sm">Belum ada peminjaman</p>
                    ) : (
                      borrowings.map(b => (
                        <div key={b.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600/50">
                          <div className="flex items-start justify-between mb-1.5">
                            <div>
                              <div className="font-medium text-slate-900 dark:text-white text-sm">
                                {b.item_type === 'ruangan' ? b.facilities?.name : b.inventory?.name}
                              </div>
                              <div className="text-xs text-slate-500">{b.borrower_name} - {b.borrower_class}</div>
                            </div>
                            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', BORROWING_STATUS_COLORS[b.status])}>
                              {BORROWING_STATUS_LABELS[b.status]}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            {formatDate(b.borrow_date)} {(b.start_time || '').slice(0, 5)} - {b.return_date ? formatDate(b.return_date) : '-'} {(b.end_time || '').slice(0, 5)}
                            {b.item_type === 'barang' && ` | ${b.borrowed_units || 1} unit`}
                          </div>
                          {b.document_url && (
                            <a href={b.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1">
                              <Download className="w-3 h-3" /> {b.document_name || 'Dokumen'}
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        ) : (
          <motion.section key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pb-8">
            <HistorySearch />
          </motion.section>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

function HistorySearch() {
  const [email, setEmail] = useState('');
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setSearched(true);
    const { data, error } = await supabase
      .from('borrowings')
      .select('*, inventory(name, code), facilities(name)')
      .eq('borrower_email', email.trim().toLowerCase())
      .order('created_at', { ascending: false });
    if (error) console.error('History search error:', error);
    if (data) setBorrowings(data as Borrowing[]);
    setLoading(false);
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

  const grouped = {
    active: borrowings.filter(b => b.status === 'approved' || b.status === 'pending'),
    past: borrowings.filter(b => b.status === 'completed' || b.status === 'rejected' || b.status === 'cancelled'),
  };

  return (
    <div className="max-w-3xl mx-auto px-4 space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Riwayat Peminjaman Saya</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Masukkan email yang Anda gunakan saat mengajukan peminjaman</p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="email" placeholder="Masukkan email Anda..." value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" />
          </div>
          <button onClick={handleSearch} disabled={loading || !email.trim()}
            className={cn('px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2',
              loading || !email.trim() ? 'bg-slate-200 dark:bg-slate-700 text-slate-400' : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg'
            )}>
            <Search className="w-4 h-4" /> Cari
          </button>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && searched && borrowings.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-12 text-center">
          <Mail className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Tidak Ditemukan</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada riwayat peminjaman untuk email ini</p>
        </div>
      )}

      {!loading && borrowings.length > 0 && (
        <div className="space-y-6">
          {grouped.active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 px-1">Peminjaman Aktif ({grouped.active.length})</h2>
              <div className="space-y-3">
                {grouped.active.map(b => <BorrowingCard key={b.id} borrowing={b} expanded={expandedId === b.id} onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)} formatDate={formatDate} />)}
              </div>
            </div>
          )}
          {grouped.past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 px-1">Riwayat Sebelumnya ({grouped.past.length})</h2>
              <div className="space-y-3">
                {grouped.past.map(b => <BorrowingCard key={b.id} borrowing={b} expanded={expandedId === b.id} onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)} formatDate={formatDate} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BorrowingCard({ borrowing: b, expanded, onToggle, formatDate }: { borrowing: Borrowing; expanded: boolean; onToggle: () => void; formatDate: (d: string) => string }) {
  const itemName = b.item_type === 'ruangan' ? b.facilities?.name : b.inventory?.name;
  return (
    <motion.div layout className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
      <div className="p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors" onClick={onToggle}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center',
              b.item_type === 'ruangan' ? 'bg-cyan-100 dark:bg-cyan-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
            )}>
              {b.item_type === 'ruangan' ? <Building2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> : <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            </div>
            <div>
              <div className="font-medium text-slate-900 dark:text-white">{itemName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                <Calendar className="w-3 h-3" />
                {formatDate(b.borrow_date)} {(b.start_time || '08:00').slice(0, 5)} - {b.return_date ? formatDate(b.return_date) : '-'} {(b.end_time || '16:00').slice(0, 5)}
                {b.item_type === 'barang' && ` | ${b.borrowed_units || 1} unit`}
              </div>
            </div>
          </div>
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap', BORROWING_STATUS_COLORS[b.status])}>
            {BORROWING_STATUS_LABELS[b.status]}
          </span>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-5 pb-5 pt-0 border-t border-slate-100 dark:border-slate-700/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1"><FileText className="w-3 h-3" /> Keperluan</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{b.purpose || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1"><MessageSquare className="w-3 h-3" /> Catatan Admin</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{b.admin_notes || 'Belum ada catatan'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Kelas/Unit</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{b.borrower_class}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Catatan Peminjam</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{b.notes || '-'}</p>
                </div>
                {b.approved_by && (
                  <div className="col-span-full">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Disetujui Oleh</label>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {b.approved_by} ({b.approver_position}) - {b.approved_at ? formatDate(b.approved_at.split('T')[0]) : '-'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
