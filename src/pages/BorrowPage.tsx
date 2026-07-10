import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Send, User, Package, Calendar, Mail, Phone, Building2,
  FileText, MessageSquare, AlertCircle, CheckCircle2, Clock, Upload, X,
  Download, GitBranch, ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { Inventory, Facility, Borrowing, BORROWING_STATUS_LABELS, BORROWING_STATUS_COLORS } from '../types';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { cn } from '../utils/cn';
import { validateFile } from '../utils/fileUpload';

const EXTENDED_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  in_use: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
};

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
};

export default function BorrowPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [conflictError, setConflictError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any | null>(null);
  const [historyEmail, setHistoryEmail] = useState('');
  const [historyBorrowings, setHistoryBorrowings] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearched, setHistorySearched] = useState(false);

  useEffect(() => { fetchAllData(); }, []);

  async function fetchAllData() {
    setLoading(true);
    const [invRes, facRes, wfRes] = await Promise.all([
      supabase.from('inventory').select('*, categories(name)').eq('condition', 'good').order('name'),
      supabase.from('facilities').select('*, workflow_templates(id, name)').eq('status', 'aktif').order('name'),
      supabase.from('workflow_templates').select('*, workflow_steps(*, roles(name))').eq('is_active', true),
    ]);
    if (invRes.data) setInventory(invRes.data);
    if (facRes.data) setFacilities(facRes.data as any);
    setLoading(false);
  }

  async function fetchWorkflowForItem() {
    const facilityId = formData.facility_id;
    const facility = facilities.find(f => f.id === facilityId);
    if (facility && (facility as any).workflow_templates) {
      const wf = (facility as any).workflow_templates;
      setSelectedWorkflow(wf);
      const { data: steps } = await supabase
        .from('workflow_steps')
        .select('*, roles(name)')
        .eq('workflow_template_id', wf.id)
        .order('step_order');
      setWorkflowSteps(steps || []);
    } else {
      // Use default workflow
      const { data: defaultWf } = await supabase
        .from('workflow_templates')
        .select('*, workflow_steps(*, roles(name))')
        .eq('name', 'Workflow Sarpras')
        .eq('is_active', true)
        .maybeSingle();
      if (defaultWf) {
        setSelectedWorkflow(defaultWf);
        const steps = (defaultWf as any).workflow_steps || [];
        setWorkflowSteps(steps.sort((a: any, b: any) => a.step_order - b.step_order));
      }
    }
  }

  useEffect(() => {
    if (formData.item_type === 'ruangan' && formData.facility_id) {
      fetchWorkflowForItem();
    } else if (formData.item_type === 'barang') {
      setSelectedWorkflow(null);
      setWorkflowSteps([]);
    }
  }, [formData.facility_id, formData.item_type]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setFileError('');
    if (!file) { setSelectedDocument(null); return; }
    const err = validateFile(file);
    if (err) { setFileError(err.message); setSelectedDocument(null); return; }
    setSelectedDocument(file);
  }

  async function checkAvailability(): Promise<{ available: boolean; message: string }> {
    if (formData.item_type === 'barang' && formData.inventory_id) {
      const item = inventory.find(i => i.id === formData.inventory_id);
      if (!item) return { available: false, message: 'Barang tidak ditemukan' };
      const { data: active } = await supabase
        .from('borrowings')
        .select('borrowed_units')
        .eq('inventory_id', formData.inventory_id)
        .in('status', ['pending', 'approved']);
      const usedUnits = (active || []).reduce((sum: number, b: any) => sum + (b.borrowed_units || 0), 0);
      const available = item.available_quantity - usedUnits;
      if (formData.borrowed_units > available) {
        return { available: false, message: `Hanya tersedia ${available} unit (diminta: ${formData.borrowed_units})` };
      }
      return { available: true, message: '' };
    }
    if (formData.item_type === 'ruangan' && formData.facility_id) {
      const { data: conflicts } = await supabase
        .from('borrowings')
        .select('id, borrow_date, start_time, end_time, borrower_name')
        .eq('facility_id', formData.facility_id)
        .eq('borrow_date', formData.borrow_date)
        .in('status', ['pending', 'approved']);
      const conflict = (conflicts || []).find(b => {
        return formData.start_time < b.end_time && formData.end_time > b.start_time;
      });
      if (conflict) {
        return { available: false, message: `Jadwal bentrok dengan peminjaman ${conflict.borrower_name} (${conflict.start_time}–${conflict.end_time})` };
      }
      return { available: true, message: '' };
    }
    return { available: true, message: '' };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.inventory_id && !formData.facility_id) {
      setSubmitError('Pilih barang atau ruangan terlebih dahulu');
      return;
    }
    setSubmitting(true);
    setConflictError('');
    setSubmitError('');
    try {
      const avail = await checkAvailability();
      if (!avail.available) { setConflictError(avail.message); setSubmitting(false); return; }

      // Determine initial status label from workflow
      const firstStep = workflowSteps[0];
      const initialStatusLabel = firstStep
        ? `Menunggu ${firstStep.step_label}`
        : 'Menunggu Persetujuan';

      const insertData: any = {
        inventory_id: formData.inventory_id || null,
        facility_id: formData.facility_id || null,
        borrower_name: formData.borrower_name,
        borrower_class: formData.borrower_class,
        borrower_email: formData.borrower_email,
        borrower_phone: formData.borrower_phone,
        item_type: formData.item_type,
        borrowed_units: formData.borrowed_units,
        borrow_date: formData.borrow_date,
        return_date: formData.return_date || null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        purpose: formData.purpose,
        notes: formData.notes,
        status: 'pending',
        workflow_template_id: selectedWorkflow?.id || null,
        current_step: 0,
        current_status_label: initialStatusLabel,
      };

      const { error } = await supabase.from('borrowings').insert(insertData);
      if (error) throw new Error(error.message);

      setSubmitSuccess(true);
      setFormData(initialFormData);
      setSelectedDocument(null);
      setWorkflowSteps([]);
      setSelectedWorkflow(null);
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err: any) {
      setSubmitError(err.message || 'Terjadi kesalahan saat mengirim pengajuan');
    } finally {
      setSubmitting(false);
    }
  }

  async function searchHistory() {
    if (!historyEmail.trim()) return;
    setHistoryLoading(true);
    setHistorySearched(true);
    const { data } = await supabase
      .from('borrowings')
      .select('*, inventory(name, code), facilities(name)')
      .eq('borrower_email', historyEmail.trim())
      .order('created_at', { ascending: false });
    setHistoryBorrowings(data || []);
    setHistoryLoading(false);
  }

  const filteredInventory = inventory.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFacilities = facilities.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Peminjaman</h1>
          <p className="text-slate-500 dark:text-slate-400">Ajukan peminjaman fasilitas dan inventaris sekolah</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-xs">
          {([['form', 'Form Peminjaman'], ['history', 'Riwayat']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-all', activeTab === key
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              )}>{label}</button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'form' ? (
            <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              {submitSuccess && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-6 flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-800 dark:text-emerald-200">Pengajuan berhasil dikirim!</p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {workflowSteps[0] ? `Status awal: Menunggu ${workflowSteps[0].step_label}` : 'Menunggu persetujuan admin.'}
                    </p>
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Item selection */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Type toggle */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Jenis Peminjaman</h2>
                    <div className="flex gap-3">
                      {([['barang', 'Barang/Inventaris', Package], ['ruangan', 'Ruangan/Fasilitas', Building2]] as const).map(([val, label, Icon]) => (
                        <button key={val} type="button"
                          onClick={() => { setFormData(p => ({ ...p, item_type: val, inventory_id: null, facility_id: null })); setSearchQuery(''); }}
                          className={cn('flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                            formData.item_type === val
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                              : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          )}>
                          <Icon className="w-4 h-4" />{label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Item search & selection */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="font-semibold text-slate-900 dark:text-white mb-4">
                      Pilih {formData.item_type === 'barang' ? 'Barang' : 'Ruangan'}
                    </h2>
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder={`Cari ${formData.item_type === 'barang' ? 'barang' : 'ruangan'}...`}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    {loading ? (
                      <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                        {(formData.item_type === 'barang' ? filteredInventory : filteredFacilities).map((item: any) => (
                          <button key={item.id} type="button"
                            onClick={() => setFormData(p => ({
                              ...p,
                              inventory_id: formData.item_type === 'barang' ? item.id : null,
                              facility_id: formData.item_type === 'ruangan' ? item.id : null,
                            }))}
                            className={cn('text-left p-3 rounded-xl border-2 transition-all',
                              (formData.item_type === 'barang' ? formData.inventory_id : formData.facility_id) === item.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-slate-200 dark:border-slate-600 hover:border-blue-300'
                            )}>
                            <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">{item.name}</p>
                            {item.code && <p className="text-xs text-slate-400 mt-0.5">{item.code}</p>}
                            {formData.item_type === 'barang' && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                Tersedia: {item.available_quantity ?? item.quantity}
                              </p>
                            )}
                            {formData.item_type === 'ruangan' && (item as any).workflow_templates && (
                              <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                                <GitBranch className="w-3 h-3" />{(item as any).workflow_templates.name}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Workflow preview */}
                  {workflowSteps.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center gap-2 mb-3">
                        <GitBranch className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                          Alur Persetujuan: {selectedWorkflow?.name}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">
                          <User className="w-3 h-3" /> Pengaju
                        </div>
                        {workflowSteps.map((step, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <div className={cn('px-3 py-1.5 rounded-full text-xs font-medium',
                              step.is_info_only
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 italic'
                                : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300')}>
                              {step.roles?.name || step.step_label}
                              {step.is_info_only && ' (Mengetahui)'}
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center gap-2">
                          <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                          <div className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium">
                            Disetujui
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Borrower Info */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="font-semibold text-slate-900 dark:text-white mb-5">Data Peminjam</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { label: 'Nama Lengkap', key: 'borrower_name', icon: User, placeholder: 'Nama lengkap', required: true },
                        { label: 'Kelas/Unit', key: 'borrower_class', icon: FileText, placeholder: 'Contoh: XI TKJ 1', required: true },
                        { label: 'Email', key: 'borrower_email', icon: Mail, placeholder: 'email@siswa.sch.id', required: true, type: 'email' },
                        { label: 'No. HP', key: 'borrower_phone', icon: Phone, placeholder: '08xxxxxxxxxx', required: false },
                      ].map(field => (
                        <div key={field.key}>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{field.label}</label>
                          <div className="relative">
                            <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type={(field as any).type || 'text'}
                              value={(formData as any)[field.key]}
                              onChange={e => setFormData(p => ({ ...p, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              required={field.required}
                              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Date/Time */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="font-semibold text-slate-900 dark:text-white mb-5">Waktu Peminjaman</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tanggal</label>
                        <input type="date" value={formData.borrow_date}
                          onChange={e => setFormData(p => ({ ...p, borrow_date: e.target.value }))} required
                          className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      {formData.item_type === 'barang' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tanggal Kembali</label>
                          <input type="date" value={formData.return_date}
                            onChange={e => setFormData(p => ({ ...p, return_date: e.target.value }))}
                            min={formData.borrow_date}
                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Jam Mulai</label>
                        <input type="time" value={formData.start_time}
                          onChange={e => setFormData(p => ({ ...p, start_time: e.target.value }))} required
                          className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Jam Selesai</label>
                        <input type="time" value={formData.end_time}
                          onChange={e => setFormData(p => ({ ...p, end_time: e.target.value }))} required
                          className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      {formData.item_type === 'barang' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Jumlah</label>
                          <input type="number" min={1} value={formData.borrowed_units}
                            onChange={e => setFormData(p => ({ ...p, borrowed_units: parseInt(e.target.value) || 1 }))} required
                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Purpose + Notes */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="font-semibold text-slate-900 dark:text-white mb-5">Detail Kegiatan</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tujuan/Kegiatan <span className="text-red-500">*</span></label>
                        <textarea value={formData.purpose} onChange={e => setFormData(p => ({ ...p, purpose: e.target.value }))}
                          placeholder="Jelaskan tujuan peminjaman..." rows={3} required
                          className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Catatan</label>
                        <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                          placeholder="Informasi tambahan..." rows={2}
                          className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      </div>

                      {/* File upload */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Dokumen Pendukung <span className="text-slate-400 font-normal">(JPG, PNG, PDF — maks 10 MB)</span>
                        </label>
                        <label className={cn('flex items-center gap-3 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                          selectedDocument
                            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                            : fileError
                              ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                              : 'border-slate-200 dark:border-slate-600 hover:border-blue-400 bg-slate-50 dark:bg-slate-700'
                        )}>
                          <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} />
                          <Upload className={cn('w-5 h-5 flex-shrink-0', selectedDocument ? 'text-emerald-500' : fileError ? 'text-red-400' : 'text-slate-400')} />
                          <span className={cn('text-sm', selectedDocument ? 'text-emerald-700 dark:text-emerald-300' : fileError ? 'text-red-600 dark:text-red-400' : 'text-slate-500')}>
                            {selectedDocument ? selectedDocument.name : fileError || 'Klik untuk upload dokumen'}
                          </span>
                          {selectedDocument && (
                            <button type="button" onClick={e => { e.preventDefault(); setSelectedDocument(null); }}
                              className="ml-auto p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg text-emerald-600">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </label>
                        {fileError && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fileError}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Info className="w-3 h-3" />File disimpan dengan aman di sistem
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Errors */}
                  {(conflictError || submitError) && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-300">{conflictError || submitError}</p>
                    </div>
                  )}

                  <button type="submit" disabled={submitting || !!(fileError)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-blue-500/30 disabled:opacity-60 transition-all">
                    {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                    {submitting ? 'Mengirim...' : 'Ajukan Peminjaman'}
                  </button>
                </div>

                {/* Right: Info panel */}
                <div className="space-y-4">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-500" />Ketentuan Peminjaman
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span>Pengajuan akan melalui alur persetujuan sesuai fasilitas</li>
                      <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span>Peminjam wajib mengisi data dengan benar</li>
                      <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span>Barang dikembalikan tepat waktu dalam kondisi baik</li>
                      <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span>File dokumen maks 10 MB (JPG, PNG, PDF)</li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-700">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />Alur Status
                    </h3>
                    <div className="space-y-2 text-sm">
                      {[
                        'Draft',
                        'Menunggu Persetujuan Pembina',
                        'Menunggu Wakasek Kesiswaan',
                        'Menunggu PJ Fasilitas',
                        'Menunggu Wakasek Sarpras',
                        'Disetujui',
                        'Sedang Dipinjam',
                        'Sudah Dikembalikan',
                      ].map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300 flex-shrink-0">{i + 1}</div>
                          <span className="text-blue-700 dark:text-blue-300">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          ) : (
            /* History tab */
            <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Cari Riwayat Peminjaman</h2>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={historyEmail} onChange={e => setHistoryEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && searchHistory()}
                      placeholder="Masukkan email peminjam..."
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <button onClick={searchHistory} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                    Cari
                  </button>
                </div>
              </div>

              {historyLoading && <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}

              {historySearched && !historyLoading && historyBorrowings.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Tidak ada riwayat peminjaman untuk email tersebut</p>
                </div>
              )}

              <div className="space-y-3">
                {historyBorrowings.map(b => (
                  <BorrowingHistoryCard key={b.id} borrowing={b} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}

function BorrowingHistoryCard({ borrowing: b }: { borrowing: any }) {
  const [expanded, setExpanded] = useState(false);
  const statusLabel = b.current_status_label || BORROWING_STATUS_LABELS[b.status as keyof typeof BORROWING_STATUS_LABELS] || b.status;
  const statusColor = EXTENDED_STATUS_COLORS[b.status] || 'bg-slate-100 text-slate-600';
  const itemName = b.inventory?.name || b.facilities?.name || '-';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          b.item_type === 'ruangan' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-cyan-100 dark:bg-cyan-900/30')}>
          {b.item_type === 'ruangan' ? <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <Package className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{itemName}</p>
          <p className="text-xs text-slate-500">{new Date(b.borrow_date || b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0', statusColor)}>{statusLabel}</span>
        <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-400">Tujuan</span><p className="text-slate-700 dark:text-slate-200">{b.purpose || '-'}</p></div>
              <div><span className="text-slate-400">Jam</span><p className="text-slate-700 dark:text-slate-200">{b.start_time} – {b.end_time}</p></div>
              {b.admin_notes && <div className="col-span-2"><span className="text-slate-400">Catatan Admin</span><p className="text-slate-700 dark:text-slate-200">{b.admin_notes}</p></div>}
              {b.drive_file_url && (
                <div className="col-span-2">
                  <a href={b.drive_file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline text-xs">
                    <Download className="w-3.5 h-3.5" />Lihat Dokumen
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
