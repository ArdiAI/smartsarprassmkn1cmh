import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold">SMART SARPRAS</span>
            </div>
            <p className="text-slate-400 text-sm">Sistem manajemen sarana dan prasarana sekolah modern.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Menu</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/facilities" className="text-slate-400 hover:text-blue-400">Fasilitas</Link></li>
              <li><Link to="/inventory" className="text-slate-400 hover:text-blue-400">Inventaris</Link></li>
              <li><Link to="/borrow" className="text-slate-400 hover:text-blue-400">Peminjaman</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Admin</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/admin" className="text-slate-400 hover:text-blue-400">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Kontak</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4" />JL. MAHAR MARTANEGARA NO.48 LEUWIGAJAH. RT, 8. RW, 3. Kelurahan, Utama. Kecamatan, Cimahi Selatan. Kota, Kota Cimahi. Provinsi, Jawa Barat</li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" />(021) 1234-5678</li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" />info@smartsarpras.sch.id</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} SMART SARPRAS SCHOOL. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
