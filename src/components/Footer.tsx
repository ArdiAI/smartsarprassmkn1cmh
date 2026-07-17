import { brandConfig } from '../brand/config';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="font-bold text-white">{brandConfig.system.name}</span>
            </div>
            <p className="text-sm text-slate-400">{brandConfig.system.fullName}</p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-3">Tautan</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="hover:text-blue-400">Beranda</a></li>
              <li><a href="/fasilitas" className="hover:text-blue-400">Fasilitas</a></li>
              <li><a href="/inventaris" className="hover:text-blue-400">Inventaris</a></li>
              <li><a href="/tentang" className="hover:text-blue-400">Tentang</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-3">Kontak</h3>
            <p className="text-sm text-slate-400">{brandConfig.school.name}</p>
            <p className="text-sm text-slate-400">{brandConfig.school.address}</p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} {brandConfig.system.name}. Semua hak dilindungi.</p>
        </div>
      </div>
    </footer>
  );
}
