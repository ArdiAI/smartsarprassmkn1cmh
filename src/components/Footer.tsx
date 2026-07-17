import { Building2 } from 'lucide-react';
import { brandConfig } from '../brand/config';
export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"><Building2 className="w-4 h-4 text-white" /></div><span className="font-semibold text-white">{brandConfig.system.name}</span></div>
          <p className="text-sm">{brandConfig.system.fullName} &middot; {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}
