import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import type { Kavling } from '../types';
import { KAVLING_STATUS_LABELS, KAVLING_STATUS_COLORS } from '../types';
import {
  Search, FileBox, Eye, Trash2, X, ChevronLeft, ChevronRight, FileText, Download,
  Calendar, ExternalLink, Filter, Loader2, RefreshCw, File, Image, Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../utils/cn';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

type FilterStatus = 'all' | Kavling['status_verifikasi'];

export default function KavlingListPage() {
  const [kavlingData, setKavlingData] = useState<Kavling[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [kelasFilter, setKelasFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Kavling | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchKavlingData();
  }, []);

  const fetchKavlingData = async () => {
    try {
      const { data, error } = await supabase
        .from('kavling')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKavlingData(data || []);
    } catch (error) {
      console.error('Error fetching kavling data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return kavlingData.filter(k => {
      const matchesSearch = searchQuery === '' ||
        k.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.kelas_unit.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || k.status_verifikasi === statusFilter;
      const matchesKelas = kelasFilter === 'all' || k.kelas_unit.toLowerCase().includes(kelasFilter.toLowerCase());

      const matchesDateFrom = !dateFrom || new Date(k.tanggal) >= new Date(dateFrom);
      const matchesDateTo = !dateTo || new Date(k.tanggal) <= new Date(dateTo + 'T23:59:59');

      return matchesSearch && matchesStatus && matchesKelas && matchesDateFrom && matchesDateTo;
    });
  }, [kavlingData, searchQuery, statusFilter, kelasFilter, dateFrom, dateTo]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      // Get file URL before deleting
      const { data: item } = await supabase
        .from('kavling')
        .select('file_url')
        .eq('id', id)
        .single();

      // Delete from database
      const { error } = await supabase.from('kavling').delete().eq('id', id);
      if (error) throw error;

      // Delete file from storage if exists
      if (item?.file_url) {
        const filePath = item.file_url.split('/kavling-files/')[1];
        if (filePath) {
          await supabase.storage.from('kavling-files').remove([filePath]);
        }
      }

      await fetchKavlingData();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting kavling:', error);
      alert('Gagal menghapus data');
    } finally {
      setDeleting(false);
    }
  };

  const openDetailModal = (item: Kavling) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: id });
    } catch {
      return '-';
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setKelasFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png'].includes(ext || '')) return Image;
    return File;
  };

  // Export functions
  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = ['No', 'Nama', 'Kelas/Unit', 'Tanggal', 'Status Verifikasi', 'Tanggal Input'];
      const rows = filteredData.map((k, i) => [
        i + 1,
        k.nama,
        k.kelas_unit,
        format(new Date(k.tanggal), 'dd/MM/yyyy'),
        k.status_verifikasi,
        format(new Date(k.created_at), 'dd/MM/yyyy HH:mm'),
      ]);

      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `data-kavling-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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

      const tableRows = filteredData.map((k, i) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${i + 1}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${k.nama}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${k.kelas_unit}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${format(new Date(k.tanggal), 'dd MMM yyyy', { locale: id })}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${k.status_verifikasi}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${format(new Date(k.created_at), 'dd MMM yyyy', { locale: id })}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Data Kavling - SMART SARPRAS</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; margin-bottom: 5px; }
            h2 { text-align: center; margin-top: 0; color: #666; }
            .meta { margin-bottom: 20px; font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #3b82f6; color: white; padding: 10px 8px; text-align: left; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 30px; text-align: right; font-size: 11px; color: #666; }
          </style>
        </head>
        <body>
          <h1>SMART SARPRAS</h1>
          <h2>Data Kavling</h2>
          <div class="meta">
            <p>Tanggal Cetak: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: id })}</p>
            <p>Total Data: ${filteredData.length} kavling</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">No</th>
                <th>Nama</th>
                <th>Kelas/Unit</th>
                <th>Tanggal</th>
                <th style="width: 100px;">Status</th>
                <th>Tanggal Input</th>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      {/* Header Section */}
      <section className="pt-24 pb-8 bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <FileBox className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Daftar Data Kavling</h1>
            <p className="text-slate-600 dark:text-slate-400">Kelola dan lihat seluruh data kavling yang tersimpan</p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5 space-y-4"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Filter className="w-4 h-4" />
              Filter & Pencarian
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau kelas/unit..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value as FilterStatus); setCurrentPage(1); }}
                className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="all">Semua Status</option>
                <option value="Menunggu">Menunggu</option>
                <option value="Terverifikasi">Terverifikasi</option>
                <option value="Ditolak">Ditolak</option>
              </select>
              <input
                type="text"
                placeholder="Filter Kelas/Unit..."
                value={kelasFilter === 'all' ? '' : kelasFilter}
                onChange={e => { setKelasFilter(e.target.value || 'all'); setCurrentPage(1); }}
                className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
              />
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
                  onClick={fetchKavlingData}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={exporting || filteredData.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </button>
                <button
                  onClick={exportToPDF}
                  disabled={exporting || filteredData.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
              </div>
            </div>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">No.</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Nama</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Kelas/Unit</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Tanggal</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">File Bukti</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                          <p className="text-slate-500">Memuat data...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                            <FileBox className="w-8 h-8 text-slate-400" />
                          </div>
                          <p className="text-slate-500 font-medium">Tidak ada data kavling</p>
                          <p className="text-sm text-slate-400">Coba ubah filter pencarian</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item, index) => {
                      const FileIcon = getFileIcon(item.file_name);
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
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{item.nama}</span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-sm text-slate-600 dark:text-slate-400">{item.kelas_unit}</span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-sm text-slate-600 dark:text-slate-400">{formatDate(item.tanggal)}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <a
                              href={item.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              <FileIcon className="w-4 h-4" />
                              Lihat File
                            </a>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={cn(
                              'inline-flex px-2.5 py-1 rounded-full text-xs font-semibold',
                              KAVLING_STATUS_COLORS[item.status_verifikasi]
                            )}>
                              {item.status_verifikasi}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openDetailModal(item)}
                                className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
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
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          'w-10 h-10 rounded-lg font-medium transition-colors',
                          currentPage === pageNum
                            ? 'bg-blue-500 text-white'
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
          </motion.div>
        </div>
      </section>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowDetailModal(false); setSelectedItem(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <FileBox className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Detail Kavling</h2>
                      <p className="text-sm text-slate-500">Informasi lengkap data kavling</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowDetailModal(false); setSelectedItem(null); }}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Status Badge */}
                <div className="flex items-center justify-center">
                  <span className={cn(
                    'px-4 py-2 rounded-full text-sm font-semibold',
                    KAVLING_STATUS_COLORS[selectedItem.status_verifikasi]
                  )}>
                    Status: {selectedItem.status_verifikasi}
                  </span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <div className="text-xs text-slate-500 mb-1">Nama</div>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedItem.nama}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <div className="text-xs text-slate-500 mb-1">Kelas/Unit</div>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedItem.kelas_unit}</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Tanggal
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white">{formatDate(selectedItem.tanggal)}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div className="text-xs text-slate-500 mb-2">File Bukti Pendukung</div>
                  <a
                    href={selectedItem.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {(() => {
                      const FileIcon = getFileIcon(selectedItem.file_name);
                      return <FileIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400 truncate">{selectedItem.file_name}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-500">Klik untuk membuka file</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </a>
                </div>

                {selectedItem.catatan && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">Catatan</div>
                    <p className="text-slate-700 dark:text-slate-300">{selectedItem.catatan}</p>
                  </div>
                )}

                <div className="text-xs text-slate-500 text-center">
                  Diinput pada: {formatDate(selectedItem.created_at)}
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Data Kavling?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Tindakan ini tidak dapat dibatalkan. Data akan dihapus secara permanen termasuk file terkait.
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

      <Footer />
    </div>
  );
}
