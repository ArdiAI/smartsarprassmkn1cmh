export const brandConfig = {
  // ============================================
  // KONFIGURASI NAMA SISTEM DAN BRANDING
  // ============================================
  system: {
    name: 'SARPRAS SMKN1CIMAHI',                    // Nama sistem (ubah sesuai kebutuhan)
    fullName: 'Smart Sarana Prasarana SMKN 1 CIMAHI',       // Nama lengkap
    tagline: 'Platform Terintegrasi Sarana Prasarana dan Administrasi Kegiatan Sekolah SMKN 1 Cimahi',  // Tagline
    description: 'Platform digital terintegrasi untuk pengelolaan sarana dan prasarana sekolah yang modern dan efisien',
    version: '2.0',
  },

  // ============================================
  // KONFIGURASI SEKOLAH
  // ============================================
  school: {
    name: 'SMK Negeri 1 Cimahi',              // Nama sekolah
    address: 'Jl. Mahar Martanegara No. 48, Kelurahan Leuwigajah, Kecamatan Cimahi Selatan, Kota Cimahi, Jawa Barat 40533',
  },

  // ============================================
  // KONFIGURASI LOGO
  // ============================================
  // Logo ditampilkan di komponen berikut:
  // - Navbar (pojok kiri atas)
  // - Landing page (hero section)
  //
  // Cara mengganti logo:
  // 1. Jika ingin menggunakan icon Lucide (default):
  //    - Buka file: src/components/Navbar.tsx
  //    - Cari <Building2 /> di dalam logo container
  //    - Ganti dengan icon lain, misal: <School />, <Home />, dll
  //
  // 2. Jika ingin menggunakan gambar kustom:
  //    - Upload logo ke folder public/ atau gunakan URL eksternal
  //    - Di Navbar.tsx dan LandingPage.tsx, ganti:
  //      <Building2 className="..." />
  //    - Menjadi:
  //      <img src="/logo-anda.png" alt="Logo" className="w-5 h-5" />
  //
  // 3. Jika ingin menggunakan inisial huruf:
  //    - Ganti <Building2 /> dengan:
  //      <span className="text-white font-bold text-2xl">S</span>
  //      (dimana S adalah inisial nama sistem)
  // ============================================

  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },
    accent: {
      400: '#22d3ee',
      500: '#06b6d4',
    },
  },
};

// ============================================
// TIPE FASILITAS
// ============================================
export const facilityTypes = [
  { id: 'classroom', name: 'Ruang Kelas', icon: 'school' },
  { id: 'lab', name: 'Laboratorium', icon: 'beaker' },
  { id: 'workshop', name: 'Workshop', icon: 'wrench' },
  { id: 'office', name: 'Ruang Guru', icon: 'briefcase' },
  { id: 'library', name: 'Perpustakaan', icon: 'book' },
  { id: 'sport', name: 'Fasilitas Olahraga', icon: 'activity' },
  { id: 'hall', name: 'Aula', icon: 'users' },
  { id: 'toilet', name: 'Toilet', icon: 'home' },
  { id: 'parking', name: 'Parkir', icon: 'car' },
];

// ============================================
// KONDISI INVENTARIS
// ============================================
export const inventoryConditions = [
  { value: 'good', label: 'Baik', color: 'green', description: 'Kondisi optimal, siap digunakan' },
  { value: 'fair', label: 'Cukup', color: 'yellow', description: 'Masih berfungsi, perlu perawatan' },
  { value: 'poor', label: 'Rusak', color: 'red', description: 'Tidak dapat digunakan, perlu perbaikan' },
];

// ============================================
// STATUS PEMINJAMAN
// ============================================
export const borrowingStatuses = [
  { value: 'pending', label: 'Menunggu', color: 'yellow' },
  { value: 'approved', label: 'Disetujui', color: 'green' },
  { value: 'rejected', label: 'Ditolak', color: 'red' },
  { value: 'returned', label: 'Dikembalikan', color: 'blue' },
];

// ============================================
// TINGKAT KERUSAKAN
// ============================================
export const reportSeverities = [
  { value: 'minor', label: 'Ringan', color: 'yellow' },
  { value: 'moderate', label: 'Sedang', color: 'orange' },
  { value: 'severe', label: 'Berat', color: 'red' },
];
