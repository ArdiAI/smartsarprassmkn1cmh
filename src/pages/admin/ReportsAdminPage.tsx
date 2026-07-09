import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import type { DamageReport, DamageSeverity, DamageStatus } from '../../types';
import { DAMAGE_STATUS_LABELS, DAMAGE_STATUS_COLORS, DAMAGE_SEVERITY_LABELS, DAMAGE_SEVERITY_COLORS } from '../../types';
import {
  Search, AlertTriangle, Eye, Trash2, X, ChevronLeft, ChevronRight, FileText, Download,
  Calendar, MapPin, User, Wrench, CheckCircle, Clock, Filter, Loader2, Package, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../../utils/cn';

type FilterStatus = 'all' | DamageStatus;
type FilterSeverity = 'all' | DamageSeverity;

export default function ReportsAdminPage() {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('damage_reports')
        .select('*, inventory(*, categories(*))')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchesSearch = searchQuery === '' ||
        r.reporter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.inventory?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.inventory?.location?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || r.severity === severityFilter;

      const matchesDateFrom = !dateFrom || new Date(r.created_at) >= new Date(dateFrom);
      const matchesDateTo = !dateTo || new Date(r.created_at) <= new Date(dateTo + 'T23:59:59');

      return matchesSearch && matchesStatus && matchesSeverity && matchesDateFrom && matchesDateTo;
    });
  }, [reports, searchQuery, statusFilter, severityFilter, dateFrom, dateTo]);

  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReports, currentPage]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const updateStatus = async (id: string, status: DamageStatus) => {
    setUpdating(true);
    try {
      const updateData: any = { status };
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString().split('T')[0];
        updateData.resolution_notes = resolutionNotes;
      }
      const { error } = await supabase.from('damage_reports').update(updateData).eq('id', id);
      if (error) throw error;
      await fetchReports();
      setShowDetailModal(false);
      setSelectedReport(null);
      setResolutionNotes('');
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
      const { error } = await supabase.from('damage_reports').delete().eq('id', id);
      if (error) throw error;
      await fetchReports();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Gagal menghapus laporan');
    } finally {
      setDeleting(false);
    }
  };

  const openDetailModal = (report: DamageReport) => {
    setSelectedReport(report);
    setResolutionNotes(report.resolution_notes || '');
    setShowDetailModal(true);
  };

  const generateReportNumber = (index: number) => {
    const year = new Date().getFullYear();
    return `RPT-${year}-${String(index + 1).padStart(4, '0')}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: id });
    } catch {
      return '-';
    }
  };

  // Export functions
  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = ['No', 'Nomor Laporan', 'Nama Pelapor', 'Barang', 'Lokasi', 'Kategori', 'Tingkat', 'Status', 'Tanggal'];
      const rows = filteredReports.map((r, i) => [
        i + 1,
        generateReportNumber(i),
        r.reporter_name,
        r.inventory?.name || '-',
        r.inventory?.location || '-',
        r.inventory?.categories?.name || '-',
        DAMAGE_SEVERITY_LABELS[r.severity],
        DAMAGE_STATUS_LABELS[r.status],
        format(new Date(r.created_at), 'dd/MM/yyyy HH:mm'),
      ]);

      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `laporan-kerusakan-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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

      const tableRows = filteredReports.map((r, i) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${i + 1}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${generateReportNumber(i)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${r.reporter_name}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${r.inventory?.name || '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${r.inventory?.location || '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${DAMAGE_SEVERITY_LABELS[r.severity]}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${DAMAGE_STATUS_LABELS[r.status]}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${format(new Date(r.created_at), 'dd MMM yyyy', { locale: id })}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Laporan Kerusakan - SMART SARPRAS</title>
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
          <h2>Laporan Kerusakan Barang</h2>
          <div class="meta">
            <p>Tanggal Cetak: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: id })}</p>
            <p>Total Data: ${filteredReports.length} laporan</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">No</th>
                <th>No. Laporan</th>
                <th>Pelapor</th>
                <th>Barang</th>
                <th>Lokasi</th>
                <th style="width: 60px;">Tingkat</th>
                <th style="width: 80px;">Status</th>
                <th style="width: 100px;">Tanggal</th>
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

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSeverityFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Total {filteredReports.length} dari {reports.length} laporan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReports}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari pelapor, barang, lokasi..."
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
            <option value="pending">Menunggu</option>
            <option value="in_progress">Diproses</option>
            <option value="resolved">Selesai</option>
          </select>
          <select
            value={severityFilter}
            onChange={e => { setSeverityFilter(e.target.value as FilterSeverity); setCurrentPage(1); }}
            className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="all">Semua Tingkat</option>
            <option value="minor">Ringan</option>
            <option value="moderate">Sedang</option>
            <option value="severe">Berat</option>
          </select>
          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          </div>
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
              onClick={exportToCSV}
              disabled={exporting || filteredReports.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={exportToPDF}
              disabled={exporting || filteredReports.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">No. Laporan</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Pelapor</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Barang/Ruangan</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Lokasi</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Kategori</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Tingkat</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Status</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Tanggal</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      <p className="text-slate-500">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">Tidak ada laporan ditemukan</p>
                      <p className="text-sm text-slate-400">Coba ubah filter pencarian</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report, index) => {
                  const reportIndex = (currentPage - 1) * itemsPerPage + index;
                  return (
                    <motion.tr
                      key={report.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">
                          {generateReportNumber(reportIndex)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                            {report.reporter_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{report.reporter_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-900 dark:text-white font-medium">
                            {report.inventory?.name || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {report.inventory?.location || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {report.inventory?.categories?.name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={cn(
                          'inline-flex px-2.5 py-1 rounded-full text-xs font-semibold',
                          DAMAGE_SEVERITY_COLORS[report.severity]
                        )}>
                          {DAMAGE_SEVERITY_LABELS[report.severity]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={cn(
                          'inline-flex px-2.5 py-1 rounded-full text-xs font-semibold',
                          DAMAGE_STATUS_COLORS[report.status]
                        )}>
                          {DAMAGE_STATUS_LABELS[report.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(report.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openDetailModal(report)}
                            className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(report.id)}
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
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredReports.length)} dari {filteredReports.length}
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
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowDetailModal(false); setSelectedReport(null); setResolutionNotes(''); }}
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
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Detail Laporan</h2>
                      <p className="text-sm text-slate-500">Informasi lengkap laporan kerusakan</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowDetailModal(false); setSelectedReport(null); setResolutionNotes(''); }}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Status Badges */}
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-semibold',
                    DAMAGE_SEVERITY_COLORS[selectedReport.severity]
                  )}>
                    Tingkat: {DAMAGE_SEVERITY_LABELS[selectedReport.severity]}
                  </span>
                  <span className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-semibold',
                    DAMAGE_STATUS_COLORS[selectedReport.status]
                  )}>
                    {DAMAGE_STATUS_LABELS[selectedReport.status]}
                  </span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <User className="w-3.5 h-3.5" />
                      Pelapor
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedReport.reporter_name}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Tanggal Lapor
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">{formatDate(selectedReport.created_at)}</p>
                  </div>
                </div>

                {/* Barang */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Package className="w-3.5 h-3.5" />
                    Barang / Ruangan
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white mb-1">{selectedReport.inventory?.name}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{selectedReport.inventory?.location || '-'}</span>
                    <span>{selectedReport.inventory?.categories?.name || '-'}</span>
                  </div>
                </div>

                {/* Deskripsi */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div className="text-xs text-slate-500 mb-2">Deskripsi Kerusakan</div>
                  <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{selectedReport.description}</p>
                </div>

                {/* Resolution Notes (if resolved) */}
                {selectedReport.status === 'resolved' && selectedReport.resolution_notes && (
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Catatan Penyelesaian</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedReport.resolution_notes}</p>
                    {selectedReport.resolved_at && (
                      <p className="text-xs text-slate-500 mt-2">Selesai: {format(new Date(selectedReport.resolved_at), 'dd MMM yyyy', { locale: id })}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 space-y-3">
                  {selectedReport.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(selectedReport.id, 'in_progress')}
                      disabled={updating}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wrench className="w-5 h-5" />}
                      {updating ? 'Memproses...' : 'Mulai Proses Perbaikan'}
                    </button>
                  )}

                  {selectedReport.status === 'in_progress' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Catatan Penyelesaian
                        </label>
                        <textarea
                          value={resolutionNotes}
                          onChange={e => setResolutionNotes(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Tuliskan catatan penyelesaian..."
                        />
                      </div>
                      <button
                        onClick={() => updateStatus(selectedReport.id, 'resolved')}
                        disabled={updating || !resolutionNotes.trim()}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                        {updating ? 'Menyimpan...' : 'Tandai Selesai'}
                      </button>
                    </>
                  )}

                  {selectedReport.status === 'resolved' && (
                    <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                      <CheckCircle className="w-5 h-5" />
                      Laporan Telah Selesai
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Laporan?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Tindakan ini tidak dapat dibatalkan. Laporan akan dihapus secara permanen dari sistem.
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
