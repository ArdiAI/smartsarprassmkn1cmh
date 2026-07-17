import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { cn } from "../../utils/cn";
import {
  Package, Building2, Users, AlertTriangle, Megaphone, MessageSquare,
  ArrowRight, TrendingUp, Activity, Clock,
} from "lucide-react";

type Borrowing = {
  id: string;
  user_name: string | null;
  item_name: string | null;
  status: string;
  created_at: string;
};

export default function DashboardPage() {
  const [stats, setStats] = useState({
    inventory: 0,
    facilities: 0,
    users: 0,
    reports: 0,
    announcements: 0,
    aspirasi: 0,
  });
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [inv, fac, usr, rep, ann, asp, bor] = await Promise.all([
          supabase.from("inventory").select("id", { count: "exact", head: true }),
          supabase.from("facilities").select("id", { count: "exact", head: true }),
          supabase.from("admin_users").select("id", { count: "exact", head: true }),
          supabase.from("damage_reports").select("id", { count: "exact", head: true }),
          supabase.from("announcements").select("id", { count: "exact", head: true }),
          supabase.from("aspirasi").select("id", { count: "exact", head: true }),
          supabase
            .from("borrowings")
            .select("id, user_name, item_name, status, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);
        setStats({
          inventory: inv.count ?? 0,
          facilities: fac.count ?? 0,
          users: usr.count ?? 0,
          reports: rep.count ?? 0,
          announcements: ann.count ?? 0,
          aspirasi: asp.count ?? 0,
        });
        setBorrowings((bor.data ?? []) as Borrowing[]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cards = [
    { label: "Inventory", value: stats.inventory, icon: Package, color: "bg-blue-500", to: "/admin/inventory" },
    { label: "Facilities", value: stats.facilities, icon: Building2, color: "bg-emerald-500", to: "/admin/facilities" },
    { label: "Admin Users", value: stats.users, icon: Users, color: "bg-violet-500", to: "/admin/team" },
    { label: "Damage Reports", value: stats.reports, icon: AlertTriangle, color: "bg-amber-500", to: "/admin/reports" },
    { label: "Announcements", value: stats.announcements, icon: Megaphone, color: "bg-rose-500", to: "/admin/announcements" },
    { label: "Aspirasi", value: stats.aspirasi, icon: MessageSquare, color: "bg-cyan-500", to: "/admin/aspirasi" },
  ];

  const quickLinks = [
    { label: "Kelola Inventory", to: "/admin/inventory" },
    { label: "Kelola Facilities", to: "/admin/facilities" },
    { label: "Lihat Reports", to: "/admin/reports" },
    { label: "Kelola Tim", to: "/admin/team" },
    { label: "Buat Pengumuman", to: "/admin/announcements" },
    { label: "Tanggapi Aspirasi", to: "/admin/aspirasi" },
    { label: "Statistik", to: "/admin/statistics" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Ringkasan sistem SMART SARPRAS</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{c.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {loading ? "—" : c.value}
                </p>
              </div>
              <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", c.color)}>
                <c.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-900">Peminjaman Terbaru</h2>
          </div>
          {borrowings.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">Belum ada peminjaman</p>
          ) : (
            <div className="space-y-2">
              {borrowings.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{b.item_name ?? "—"}</p>
                    <p className="text-xs text-slate-500">{b.user_name ?? "Anonim"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(b.created_at).toLocaleDateString("id-ID")}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      b.status === "approved" && "bg-emerald-100 text-emerald-700",
                      b.status === "pending" && "bg-amber-100 text-amber-700",
                      b.status === "rejected" && "bg-red-100 text-red-700",
                      b.status === "returned" && "bg-blue-100 text-blue-700",
                      !["approved", "pending", "rejected", "returned"].includes(b.status) && "bg-slate-100 text-slate-700",
                    )}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-900">Quick Links</h2>
          </div>
          <div className="space-y-1.5">
            {quickLinks.map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700"
              >
                {q.label}
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
