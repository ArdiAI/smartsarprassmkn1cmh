import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import type { Aspirasi, AspirasiStatus } from '../../types';
import { ASPIRASI_STATUS_LABELS, ASPIRASI_STATUS_COLORS, ASPIRASI_KATEGORI_OPTIONS } from '../../types';
import {
  Search, MessageSquare, Eye, Trash2, X, ChevronLeft, ChevronRight, FileText, Download,
  Calendar, User, Filter, Loader2, RefreshCw, Send, CheckCircle, Clock, Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../../utils/cn';

type FilterStatus = 'all' | AspirasiStatus;
type FilterKategori = 'all' | typeof ASPIRASI_KATEGORI_OPTIONS[number];

export default function AspirasiAdminPage() {
  const [aspirasiData, setAspirasiData] = useState<Aspirasi[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [kategoriFilter, setKategoriFilter] = useState<FilterKategori>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Aspirasi | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [tanggapan, setTanggapan] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAspirasiData();
  }, []);

  const fetchAspirasiData = async () => {
    try {
      const { data, error } = await supabase
        .from('aspirasi')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAspirasiData(data || []);
    } catch (error) {
      console.error('Error fetching aspirasi data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return aspirasiData.filter(a => {
      const matchesSearch = searchQuery === '' ||
        a.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.isi.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      const matchesKategori = kategoriFilter === 'all' || a.kategori === kategoriFilter;

      const matchesDateFrom = !dateFrom || new Date(a.created_at) >= new Date(dateFrom);
      const matchesDateTo = !dateTo || new Date(a.created_at) <= new Date(dateTo + 'T23:59:59');

      return matchesSearch && matchesStatus && matchesKategori && matchesDateFrom && matchesDateTo;
    });
  }, [aspirasiData, searchQuery, statusFilter, kategoriFilter, dateFrom, dateTo]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const updateStatus = async (id: string, status: AspirasiStatus) => {
    setUpdating(true);
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (status === 'Selesai' && tanggapan.trim()) {
        updateData.tanggapan = tanggapan.trim();
      }
      const { error } = await supabase.from('aspirasi').update(updateData).eq('id', id);
      if (error) throw error;
      await fetchAspirasiData();
      setShowDetailModal(false);
      setSelectedItem(null);
      setTanggapan('');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Gagal mengupdate status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('aspirasi').delete().eq('id', id);
      if (error) throw error;
      await fetchAspirasiData();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting aspirasi:', error);
      alert('Gagal menghapus data');
    } finally {
      setDeleting(false);
    }
  };

  const openDetailModal = (item: Aspirasi) => {
    setSelectedItem(item);
    setTanggapan(item.tanggapan || '');
    setShowDetailModal(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: id });
    } catch {
      return '-';
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setKategoriFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const getStatusIcon = (status: AspirasiStatus) => {
    switch (status) {
      case 'Menunggu': return Clock;
      case 'Dibaca': return Eye;
      case 'Diproses': return RefreshCw;
      case 'Selesai': return CheckCircle;
      default: return Clock;
    }
  };

  // Export functions
  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = ['No', 'Nama', 'Unit/Kelas', 'Email', 'Kategori', 'Judul', 'Isi', 'Status', 'Tanggal'];
      const rows = filteredData.map((a, i) => [
        i + 1,
        a.nama,
        a.kelas_unit,
        a.email || '-',
        a.kategori,
        a.judul,
        a.isi.replace(/"/g, '""'),
        a.status,
        format(new Date(a.created_at), 'dd/MM/yyyy HH:mm'),
      ]);

      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `aspirasi-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
    } catch (error) {
      console.error('Export error:', error);
      alert('Gagal mengekspor data');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = () => {
    setExporting(true);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Popup blocked. Please allow popups for this site.');
        setExporting(false);
        return;
      }

      const tableRows = filteredData.map((a, i) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${i + 1}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${a.nama}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${a.kelas_unit}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${a.kategori}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${a.judul}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${a.status}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${format(new Date(a.created_at), 'dd MMM yyyy', { locale: id })}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Aspirasi Sarana Prasarana - SMART SARPRAS</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; margin-bottom: 5px; }
            h2 { text-align: center; margin-top: 0; color: #666; }
            .meta { margin-bottom: 20px; font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #7c3aed; color: white; padding: 10px 8px; text-align: left; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 30px; text-align: right; font-size: 11px; color: #666; }
          </style>
        </head>
        <body>
          <h1>SMART SARPRAS</h1>
          <h2>Daftar Aspirasi</h2>
          <div class="meta">
            <p>Tanggal Cetak: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: id })}</p>
            <p>Total Data: ${filteredData.length} aspirasi</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">No</th>
                <th>Nama</th>
                <th>Unit/Kelas</th>
                <th>Kategori</th>
                <th>Judul</th>
                <th style="width: 80px;">Status</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="footer">
            <p>Dicetak oleh: Admin SMART SARPRAS</p>
            <p>SMKN 1 Cimahi</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Gagal mengekspor PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kelola Aspirasi</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Total {filteredData.length} dari {aspirasiData.length} aspirasi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAspirasiData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <Filter className="w-4 h-4" />
          Filter & Pencarian
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, judul, atau isi aspirasi..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as FilterStatus); setCurrentPage(1); }}
            className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="all">Semua Status</option>
            <option value="Menunggu">Menunggu</option>
            <option value="Dibaca">Dibaca</option>
            <option value="Diproses">Diproses</option>
            <option value="Selesai">Selesai</option>
          </select>
          <select
            value={kategoriFilter}
            onChange={e => { setKategoriFilter(e.target.value as FilterKategori); setCurrentPage(1); }}
            className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="all">Semua Kategori</option>
            {ASPIRASI_KATEGORI_OPTIONS.map(kat => (
              <option key={kat} value={kat}>{kat}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={exportToCSV}
              disabled={exporting || filteredData.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={exportToPDF}
              disabled={exporting || filteredData.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">No.</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Pelapor</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Kategori</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Judul</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Status</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Tanggal</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                      <p className="text-slate-500">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <MessageSquare className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">Tidak ada aspirasi ditemukan</p>
                      <p className="text-sm text-slate-400">Coba ubah filter pencarian</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => {
                  const StatusIcon = getStatusIcon(item.status);
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                            {item.nama.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{item.nama}</p>
                            <p className="text-xs text-slate-500">{item.kelas_unit}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">{item.judul}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{item.isi}</p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                          ASPIRASI_STATUS_COLORS[item.status]
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openDetailModal(item)}
                            className="p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 transition-colors"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(item.id)}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      'w-10 h-10 rounded-lg font-medium transition-colors',
                      currentPage === pageNum
                        ? 'bg-purple-500 text-white'
                        : 'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowDetailModal(false); setSelectedItem(null); setTanggapan(''); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Detail Aspirasi</h2>
                      <p className="text-sm text-slate-500">Informasi lengkap aspirasi</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowDetailModal(false); setSelectedItem(null); setTanggapan(''); }}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold',
                    ASPIRASI_STATUS_COLORS[selectedItem.status]
                  )}>
                    {(() => {
                      const StatusIcon = getStatusIcon(selectedItem.status);
                      return <StatusIcon className="w-4 h-4" />;
                    })()}
                    {selectedItem.status}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                    {selectedItem.kategori}
                  </span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <User className="w-3.5 h-3.5" />
                      Pelapor
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedItem.nama}</p>
                    <p className="text-sm text-slate-500">{selectedItem.kelas_unit}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <Mail className="w-3.5 h-3.5" />
                      Email
                    </div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">{selectedItem.email || 'Tidak diisi'}</p>
                  </div>
                </div>

                {/* Judul */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div className="text-xs text-slate-500 mb-2">Judul Aspirasi</div>
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedItem.judul}</p>
                </div>

                {/* Isi */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div className="text-xs text-slate-500 mb-2">Isi Aspirasi</div>
                  <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{selectedItem.isi}</p>
                </div>

                {/* Tanggapan */}
                {selectedItem.status === 'Selesai' && selectedItem.tanggapan && (
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Tanggapan</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedItem.tanggapan}</p>
                  </div>
                )}

                <div className="text-xs text-slate-500 text-center">
                  Dikirim pada: {formatDate(selectedItem.created_at)}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  {selectedItem.status === 'Menunggu' && (
                    <button
                      onClick={() => updateStatus(selectedItem.id, 'Dibaca')}
                      disabled={updating}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
                      Tandai Sudah Dibaca
                    </button>
                  )}

                  {selectedItem.status === 'Dibaca' && (
                    <button
                      onClick={() => updateStatus(selectedItem.id, 'Diproses')}
                      disabled={updating}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 text-white font-medium hover:bg-cyan-600 disabled:opacity-50 transition-colors"
                    >
                      {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                      Tandai Sedang Diproses
                    </button>
                  )}

                  {(selectedItem.status === 'Diproses' || selectedItem.status === 'Dibaca') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tanggapan</label>
                        <textarea
                          value={tanggapan}
                          onChange={e => setTanggapan(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Tulis tanggapan untuk aspirasi ini..."
                        />
                      </div>
                      <button
                        onClick={() => updateStatus(selectedItem.id, 'Selesai')}
                        disabled={updating}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:shadow-lg disabled:opacity-50 transition-all"
                      >
                        {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                        Tandai Selesai
                      </button>
                    </>
                  )}

                  {selectedItem.status === 'Selesai' && (
                    <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                      <CheckCircle className="w-5 h-5" />
                      Aspirasi Telah Selesai
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full shadow-2xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Aspirasi?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Tindakan ini tidak dapat dibatalkan. Data akan dihapus secara permanen.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleDelete(showDeleteConfirm)}
                    disabled={deleting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Menghapus...
                      </>
                    ) : (
                      'Hapus'
                    )}
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
