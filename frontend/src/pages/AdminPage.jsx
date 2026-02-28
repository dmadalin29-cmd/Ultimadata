import { useState, useEffect, useRef } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  FileText,
  Image,
  Settings,
  BarChart3,
  ChevronLeft,
  Search,
  Check,
  X,
  Eye,
  Trash2,
  Plus,
  Edit,
  Menu,
  Ban,
  Upload,
  Video,
  Image as ImageIcon,
  KeyRound,
  TrendingUp,
  Download,
  Calendar,
  Star,
  Eye as EyeIcon,
  MessageSquare,
  Trophy,
  Pin,
  Flag,
  AlertTriangle
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Mini chart component
function MiniChart({ data, color = "#3B82F6", height = 60 }) {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data.map(d => d.count), 1);
  const width = 100 / data.length;
  
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.slice(-14).map((d, i) => (
        <div
          key={i}
          className="flex-1 rounded-t transition-all hover:opacity-80"
          style={{
            height: `${(d.count / max) * 100}%`,
            minHeight: d.count > 0 ? 4 : 0,
            backgroundColor: color
          }}
          title={`${d.date}: ${d.count}`}
        />
      ))}
    </div>
  );
}

// Dashboard Overview - Advanced
function DashboardOverview() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/stats`, { withCredentials: true }),
        axios.get(`${API_URL}/api/admin/analytics/dashboard`, { withCredentials: true })
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/export/${type}`, {
        withCredentials: true,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Export ${type} descărcat!`);
    } catch (error) {
      toast.error("Eroare la export");
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-[#121212] rounded-xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="h-80 bg-[#121212] rounded-xl" />
        <div className="h-80 bg-[#121212] rounded-xl" />
      </div>
    </div>;
  }

  const overview = analytics?.overview || {};
  const growth = analytics?.growth || {};
  const trends = analytics?.trends || {};
  const distribution = analytics?.distribution || {};

  const statCards = [
    { 
      label: "Total Utilizatori", 
      value: overview.total_users || 0, 
      change: growth.users?.week || 0,
      color: "text-blue-500", 
      bg: "bg-blue-500/10",
      icon: Users
    },
    { 
      label: "Anunțuri Active", 
      value: overview.active_ads || 0, 
      change: growth.ads?.week || 0,
      color: "text-emerald-500", 
      bg: "bg-emerald-500/10",
      icon: FileText
    },
    { 
      label: "Vizualizări Total", 
      value: overview.total_views?.toLocaleString() || 0, 
      color: "text-purple-500", 
      bg: "bg-purple-500/10",
      icon: EyeIcon
    },
    { 
      label: "Rating Platformă", 
      value: overview.avg_platform_rating || "0.0", 
      extra: `${overview.total_reviews || 0} recenzii`,
      color: "text-yellow-500", 
      bg: "bg-yellow-500/10",
      icon: Star
    },
  ];

  return (
    <div data-testid="admin-dashboard">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard Avansat</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('users')}
            className="border-white/10 text-white hover:bg-white/5"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Utilizatori
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('ads')}
            className="border-white/10 text-white hover:bg-white/5"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Anunțuri
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <div
            key={i}
            className={`${stat.bg} rounded-xl p-5 border border-white/5`}
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              {stat.change > 0 && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +{stat.change} săpt.
                </span>
              )}
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
            {stat.extra && <p className="text-xs text-slate-500">{stat.extra}</p>}
          </div>
        ))}
      </div>

      {/* Trends Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Ads Chart */}
        <div className="bg-[#0A0A0A] rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Anunțuri Noi (30 zile)</h3>
            <span className="text-sm text-emerald-400">
              +{growth.ads?.month || 0} luna aceasta
            </span>
          </div>
          <MiniChart data={trends.daily_ads} color="#10B981" height={120} />
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>Acum 30 zile</span>
            <span>Azi</span>
          </div>
        </div>

        {/* Daily Users Chart */}
        <div className="bg-[#0A0A0A] rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Utilizatori Noi (30 zile)</h3>
            <span className="text-sm text-blue-400">
              +{growth.users?.month || 0} luna aceasta
            </span>
          </div>
          <MiniChart data={trends.daily_users} color="#3B82F6" height={120} />
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>Acum 30 zile</span>
            <span>Azi</span>
          </div>
        </div>
      </div>

      {/* Distribution */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Categories Distribution */}
        <div className="bg-[#0A0A0A] rounded-xl p-6 border border-white/5">
          <h3 className="text-lg font-semibold text-white mb-4">Distribuție Categorii</h3>
          <div className="space-y-3">
            {distribution.categories?.slice(0, 8).map((cat, i) => {
              const total = distribution.categories.reduce((acc, c) => acc + c.count, 0);
              const percentage = total > 0 ? (cat.count / total) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: cat.category_color }}
                  />
                  <span className="text-sm text-slate-300 flex-1">{cat.category_name}</span>
                  <span className="text-sm text-slate-500">{cat.count}</span>
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ width: `${percentage}%`, backgroundColor: cat.category_color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cities Distribution */}
        <div className="bg-[#0A0A0A] rounded-xl p-6 border border-white/5">
          <h3 className="text-lg font-semibold text-white mb-4">Top Orașe</h3>
          <div className="space-y-3">
            {distribution.cities?.map((city, i) => {
              const maxCount = distribution.cities[0]?.count || 1;
              const percentage = (city.count / maxCount) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-slate-500 w-5">{i + 1}.</span>
                  <span className="text-sm text-slate-300 flex-1">{city.city_name}</span>
                  <span className="text-sm text-slate-500">{city.count}</span>
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Ads */}
      <div className="bg-[#0A0A0A] rounded-xl p-6 border border-white/5">
        <h3 className="text-lg font-semibold text-white mb-4">Top Anunțuri (după vizualizări)</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5">
                <TableHead className="text-slate-400">#</TableHead>
                <TableHead className="text-slate-400">Titlu</TableHead>
                <TableHead className="text-slate-400">Vizualizări</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics?.top_ads?.map((ad, i) => (
                <TableRow key={ad.ad_id} className="border-white/5">
                  <TableCell className="text-slate-500">{i + 1}</TableCell>
                  <TableCell className="text-white">{ad.title?.substring(0, 50)}...</TableCell>
                  <TableCell className="text-emerald-400">{ad.views?.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// Users Management
function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [passwordModal, setPasswordModal] = useState({ open: false, userId: null, userName: "" });
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/users`, {
        withCredentials: true
      });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Ești sigur că vrei să ștergi acest utilizator? Toate anunțurile sale vor fi șterse!")) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/users/${userId}`, {
        withCredentials: true
      });
      toast.success("Utilizator și anunțurile sale au fost șterse");
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la ștergere");
    }
  };

  const handleBlockUser = async (userId, currentlyBlocked) => {
    const action = currentlyBlocked ? "debloca" : "bloca";
    if (!window.confirm(`Ești sigur că vrei să ${action} acest utilizator?`)) return;
    
    try {
      await axios.put(
        `${API_URL}/api/admin/users/${userId}`,
        { is_blocked: !currentlyBlocked },
        { withCredentials: true }
      );
      toast.success(`Utilizator ${currentlyBlocked ? "deblocat" : "blocat"}`);
      fetchUsers();
    } catch (error) {
      toast.error("Eroare la actualizare");
    }
  };

  const handleUpdateRole = async (userId, role) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/users/${userId}`,
        { role },
        { withCredentials: true }
      );
      toast.success("Rol actualizat");
      fetchUsers();
    } catch (error) {
      toast.error("Eroare la actualizare");
    }
  };
  
  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 5) {
      toast.error("Parola trebuie să aibă cel puțin 5 caractere");
      return;
    }
    
    setChangingPassword(true);
    try {
      await axios.put(
        `${API_URL}/api/admin/users/${passwordModal.userId}/password`,
        { new_password: newPassword },
        { withCredentials: true }
      );
      toast.success("Parola a fost schimbată cu succes");
      setPasswordModal({ open: false, userId: null, userName: "" });
      setNewPassword("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la schimbarea parolei");
    } finally {
      setChangingPassword(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div data-testid="admin-users">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Utilizatori</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută utilizatori..."
            className="pl-10 bg-[#121212] border-white/10 text-white"
          />
        </div>
      </div>

      <div className="rounded-xl bg-[#0A0A0A] border border-white/5 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-slate-400">Nume</TableHead>
              <TableHead className="text-slate-400">Email</TableHead>
              <TableHead className="text-slate-400">Rol</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Data creării</TableHead>
              <TableHead className="text-slate-400 text-right">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell colSpan={6}>
                    <div className="h-10 bg-[#121212] rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.user_id} className="border-white/5 hover:bg-white/5">
                  <TableCell className="text-white font-medium">{user.name}</TableCell>
                  <TableCell className="text-slate-400">{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleUpdateRole(user.user_id, value)}
                    >
                      <SelectTrigger className="w-32 h-8 bg-transparent border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121212] border-white/10">
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {user.is_blocked ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-500/10 text-red-400">
                        Blocat
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400">
                        Activ
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-400">
                    {new Date(user.created_at).toLocaleDateString("ro-RO")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        onClick={() => setPasswordModal({ open: true, userId: user.user_id, userName: user.name })}
                        title="Schimbă parola"
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={user.is_blocked 
                          ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" 
                          : "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"}
                        onClick={() => handleBlockUser(user.user_id, user.is_blocked)}
                        title={user.is_blocked ? "Deblochează" : "Blochează"}
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => handleDeleteUser(user.user_id)}
                        title="Șterge utilizator"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                  Nu s-au găsit utilizatori
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Password Change Modal */}
      {passwordModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0A0A0A] rounded-2xl p-6 w-full max-w-md border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-4">
              Schimbă parola pentru {passwordModal.userName}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Parolă nouă</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minim 5 caractere"
                  className="bg-[#121212] border-white/10 text-white"
                  data-testid="admin-new-password-input"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                  onClick={() => {
                    setPasswordModal({ open: false, userId: null, userName: "" });
                    setNewPassword("");
                  }}
                >
                  Anulează
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-500"
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  data-testid="admin-change-password-btn"
                >
                  {changingPassword ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Schimbă parola"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Ads Management
function AdsManagement() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    if (status) setStatusFilter(status);
  }, [location]);

  useEffect(() => {
    fetchAds();
  }, [statusFilter]);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const response = await axios.get(`${API_URL}/api/admin/ads${params}`, {
        withCredentials: true
      });
      setAds(response.data.ads || []);
    } catch (error) {
      console.error("Error fetching ads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (adId, status) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/ads/${adId}/status`,
        { status },
        { withCredentials: true }
      );
      toast.success(`Anunț ${status === "active" ? "aprobat" : status === "rejected" ? "respins" : "actualizat"}`);
      fetchAds();
    } catch (error) {
      toast.error("Eroare la actualizare");
    }
  };

  const handleDeleteAd = async (adId) => {
    if (!window.confirm("Sigur vrei să ștergi acest anunț? Acțiunea este ireversibilă.")) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/api/ads/${adId}`, {
        withCredentials: true
      });
      toast.success("Anunț șters cu succes");
      fetchAds();
    } catch (error) {
      toast.error("Eroare la ștergere");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: "bg-emerald-500/10 text-emerald-400",
      pending: "bg-yellow-500/10 text-yellow-400",
      rejected: "bg-red-500/10 text-red-400",
      expired: "bg-slate-500/10 text-slate-400"
    };
    const labels = {
      active: "Activ",
      pending: "În așteptare",
      rejected: "Respins",
      expired: "Expirat"
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div data-testid="admin-ads">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Anunțuri</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-[#121212] border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#121212] border-white/10">
            <SelectItem value="all">Toate</SelectItem>
            <SelectItem value="pending">În așteptare</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="rejected">Respinse</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl bg-[#0A0A0A] border border-white/5 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-slate-400">Titlu</TableHead>
              <TableHead className="text-slate-400">Categorie</TableHead>
              <TableHead className="text-slate-400">Preț</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Data</TableHead>
              <TableHead className="text-slate-400 text-right">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell colSpan={6}>
                    <div className="h-10 bg-[#121212] rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : ads.length > 0 ? (
              ads.map((ad) => (
                <TableRow key={ad.ad_id} className="border-white/5 hover:bg-white/5">
                  <TableCell className="text-white font-medium max-w-[200px] truncate">
                    {ad.title}
                  </TableCell>
                  <TableCell className="text-slate-400">{ad.category_id}</TableCell>
                  <TableCell className="text-white">
                    {ad.price ? `${ad.price} €` : "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(ad.status)}</TableCell>
                  <TableCell className="text-slate-400">
                    {new Date(ad.created_at).toLocaleDateString("ro-RO")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/ad/${ad.ad_id}`} target="_blank">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/5">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      {ad.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                            onClick={() => handleUpdateStatus(ad.ad_id, "active")}
                            title="Aprobă"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => handleUpdateStatus(ad.ad_id, "rejected")}
                            title="Respinge"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => handleDeleteAd(ad.ad_id)}
                        title="Șterge anunț"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  Nu s-au găsit anunțuri
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Banners Management
function BannersManagement() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: "",
    media_url: "",
    media_type: "image",
    link_url: "",
    position: "homepage",
    is_active: true,
    order: 0
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/banners?position=homepage`, {
        withCredentials: true
      });
      setBanners(response.data || []);
    } catch (error) {
      console.error("Error fetching banners:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tip de fișier invalid. Acceptate: JPG, PNG, WebP, GIF, MP4, WebM");
      return;
    }

    // Check file size
    const maxSize = file.type.startsWith('video') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Fișierul este prea mare. Max: ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const response = await axios.post(
        `${API_URL}/api/upload/banner`,
        uploadData,
        { 
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      setFormData(prev => ({
        ...prev,
        media_url: `${API_URL}${response.data.url}`,
        media_type: response.data.is_video ? "video" : "image"
      }));
      toast.success("Fișier încărcat cu succes");
    } catch (error) {
      toast.error("Eroare la încărcare");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.media_url) {
      toast.error("Te rog încarcă o imagine sau video");
      return;
    }
    try {
      if (editingBanner) {
        await axios.put(
          `${API_URL}/api/admin/banners/${editingBanner.banner_id}`,
          formData,
          { withCredentials: true }
        );
        toast.success("Banner actualizat");
      } else {
        await axios.post(
          `${API_URL}/api/admin/banners`,
          formData,
          { withCredentials: true }
        );
        toast.success("Banner creat");
      }
      setShowForm(false);
      setEditingBanner(null);
      setFormData({ title: "", media_url: "", media_type: "image", link_url: "", position: "homepage", is_active: true, order: 0 });
      fetchBanners();
    } catch (error) {
      toast.error("Eroare la salvare");
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      media_url: banner.media_url || banner.image_url,
      media_type: banner.media_type || "image",
      link_url: banner.link_url || "",
      position: banner.position,
      is_active: banner.is_active,
      order: banner.order
    });
    setShowForm(true);
  };

  const handleDelete = async (bannerId) => {
    if (!window.confirm("Ești sigur că vrei să ștergi acest banner?")) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/banners/${bannerId}`, {
        withCredentials: true
      });
      toast.success("Banner șters");
      fetchBanners();
    } catch (error) {
      toast.error("Eroare la ștergere");
    }
  };

  return (
    <div data-testid="admin-banners">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Bannere & Reclame</h1>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingBanner(null);
            setFormData({ title: "", media_url: "", media_type: "image", link_url: "", position: "homepage", is_active: true, order: 0 });
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adaugă Banner
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 p-6 rounded-xl bg-[#0A0A0A] border border-white/5">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editingBanner ? "Editează Banner" : "Banner Nou"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Titlu</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Titlu banner"
                  className="bg-[#121212] border-white/10 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Ordine</label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) }))}
                  className="bg-[#121212] border-white/10 text-white"
                />
              </div>
            </div>
            
            {/* File Upload Section */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Imagine sau Video (max 15 sec)</label>
              <div className="flex gap-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  {uploading ? (
                    <>Se încarcă...</>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Încarcă fișier
                    </>
                  )}
                </Button>
                {formData.media_url && (
                  <div className="flex items-center gap-2 text-emerald-400">
                    {formData.media_type === "video" ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                    <span className="text-sm">Fișier încărcat</span>
                  </div>
                )}
              </div>
              
              {/* Preview */}
              {formData.media_url && (
                <div className="mt-4 rounded-lg overflow-hidden border border-white/10 max-w-md">
                  {formData.media_type === "video" ? (
                    <video 
                      src={formData.media_url} 
                      controls 
                      className="w-full aspect-video object-cover"
                    />
                  ) : (
                    <img 
                      src={formData.media_url} 
                      alt="Preview" 
                      className="w-full aspect-video object-cover"
                    />
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Link (opțional)</label>
              <Input
                value={formData.link_url}
                onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                placeholder="https://..."
                className="bg-[#121212] border-white/10 text-white"
              />
            </div>
            <div className="flex gap-4">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white">
                {editingBanner ? "Salvează" : "Creează"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/10 text-white hover:bg-white/5"
                onClick={() => {
                  setShowForm(false);
                  setEditingBanner(null);
                }}
              >
                Anulează
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="aspect-video bg-[#0A0A0A] rounded-xl animate-pulse" />
          ))
        ) : banners.length > 0 ? (
          banners.map((banner) => (
            <div key={banner.banner_id} className="relative rounded-xl overflow-hidden border border-white/5 group">
              {(banner.media_type === "video" || banner.image_url?.endsWith('.mp4') || banner.image_url?.endsWith('.webm')) ? (
                <video 
                  src={banner.media_url || banner.image_url} 
                  className="w-full aspect-video object-cover"
                  muted
                  loop
                  onMouseEnter={(e) => e.target.play()}
                  onMouseLeave={(e) => e.target.pause()}
                />
              ) : (
                <img src={banner.media_url || banner.image_url} alt={banner.title} className="w-full aspect-video object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center gap-2 mb-1">
                  {(banner.media_type === "video" || banner.image_url?.endsWith('.mp4')) && (
                    <Video className="w-4 h-4 text-blue-400" />
                  )}
                  <h3 className="text-white font-medium">{banner.title}</h3>
                </div>
                <p className="text-slate-400 text-sm">Ordine: {banner.order}</p>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  className="w-8 h-8 bg-white/20 backdrop-blur-sm hover:bg-white/30"
                  onClick={() => handleEdit(banner)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  className="w-8 h-8 bg-red-500/80 hover:bg-red-500"
                  onClick={() => handleDelete(banner.banner_id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-slate-500">
            Nu există bannere. Adaugă primul banner.
          </div>
        )}
      </div>
    </div>
  );
}

// Forum Moderation
function ForumModeration() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/forum/threads`, { withCredentials: true });
      setThreads(res.data.threads || []);
    } catch (error) {
      // Fallback to public endpoint
      const res = await axios.get(`${API_URL}/api/forum/threads?limit=100`);
      setThreads(res.data.threads || []);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (threadId) => {
    if (!confirm("Sigur vrei să ștergi această discuție?")) return;
    
    try {
      await axios.delete(`${API_URL}/api/forum/threads/${threadId}`, { withCredentials: true });
      toast.success("Discuție ștearsă");
      fetchThreads();
    } catch (error) {
      toast.error("Eroare la ștergere");
    }
  };

  const handlePin = async (threadId, isPinned) => {
    try {
      await axios.put(`${API_URL}/api/admin/forum/threads/${threadId}/pin`, 
        { is_pinned: !isPinned }, 
        { withCredentials: true }
      );
      toast.success(isPinned ? "Thread unfixat" : "Thread fixat");
      fetchThreads();
    } catch (error) {
      toast.error("Eroare");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Moderare Forum</h1>
          <p className="text-slate-400">{threads.length} discuții</p>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-white/5 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-slate-400">Titlu</TableHead>
              <TableHead className="text-slate-400">Autor</TableHead>
              <TableHead className="text-slate-400">Categorie</TableHead>
              <TableHead className="text-slate-400">Răspunsuri</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400 text-right">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {threads.map((thread) => (
              <TableRow key={thread.thread_id} className="border-white/5">
                <TableCell className="text-white font-medium">
                  <div className="flex items-center gap-2">
                    {thread.is_pinned && <Pin className="w-4 h-4 text-yellow-400" />}
                    <span className="truncate max-w-[200px]">{thread.title}</span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-400">{thread.user_name}</TableCell>
                <TableCell className="text-slate-400">{thread.category}</TableCell>
                <TableCell className="text-slate-400">{thread.reply_count || 0}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    thread.status === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {thread.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`w-8 h-8 ${thread.is_pinned ? "text-yellow-400" : "text-slate-400"}`}
                      onClick={() => handlePin(thread.thread_id, thread.is_pinned)}
                      title={thread.is_pinned ? "Unfixează" : "Fixează"}
                    >
                      <Pin className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => handleDelete(thread.thread_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {threads.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            Nu există discuții în forum
          </div>
        )}
      </div>
    </div>
  );
}

// Stories Moderation
function StoriesModeration() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    fetchStories();
  }, [filter]);

  const fetchStories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/stories?status=${filter}`, { withCredentials: true });
      setStories(res.data.stories || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (storyId) => {
    try {
      await axios.put(`${API_URL}/api/stories/${storyId}/status`, 
        { status: "approved" }, 
        { withCredentials: true }
      );
      toast.success("Poveste aprobată!");
      fetchStories();
    } catch (error) {
      toast.error("Eroare la aprobare");
    }
  };

  const handleReject = async (storyId) => {
    try {
      await axios.put(`${API_URL}/api/stories/${storyId}/status`, 
        { status: "rejected" }, 
        { withCredentials: true }
      );
      toast.success("Poveste respinsă");
      fetchStories();
    } catch (error) {
      toast.error("Eroare");
    }
  };

  const handleDelete = async (storyId) => {
    if (!confirm("Sigur vrei să ștergi această poveste?")) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/stories/${storyId}`, { withCredentials: true });
      toast.success("Poveste ștearsă");
      fetchStories();
    } catch (error) {
      toast.error("Eroare la ștergere");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Moderare Povești de Succes</h1>
          <p className="text-slate-400">{stories.length} povești</p>
        </div>
        
        <div className="flex gap-2">
          {["pending", "approved", "rejected"].map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status)}
              className={filter === status ? "bg-blue-600" : "border-white/10 text-slate-400"}
            >
              {status === "pending" ? "În așteptare" : status === "approved" ? "Aprobate" : "Respinse"}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {stories.map((story) => (
          <div key={story.story_id} className="bg-[#0A0A0A] border border-white/5 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{story.title}</h3>
                <p className="text-slate-500 text-sm">
                  De: {story.user_name} • {new Date(story.created_at).toLocaleDateString("ro-RO")}
                </p>
              </div>
              
              <span className={`px-3 py-1 rounded-full text-xs ${
                story.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                story.status === "approved" ? "bg-green-500/20 text-green-400" :
                "bg-red-500/20 text-red-400"
              }`}>
                {story.status === "pending" ? "În așteptare" : story.status === "approved" ? "Aprobat" : "Respins"}
              </span>
            </div>
            
            {(story.sold_item || story.sold_price || story.days_to_sell) && (
              <div className="flex flex-wrap gap-2 mb-3">
                {story.sold_item && (
                  <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-sm">
                    {story.sold_item}
                  </span>
                )}
                {story.sold_price && (
                  <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm">
                    {story.sold_price} €
                  </span>
                )}
                {story.days_to_sell && (
                  <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-sm">
                    {story.days_to_sell} zile
                  </span>
                )}
              </div>
            )}
            
            <p className="text-slate-400 mb-4">{story.content}</p>
            
            <div className="flex items-center gap-2">
              {story.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-500"
                    onClick={() => handleApprove(story.story_id)}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Aprobă
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => handleReject(story.story_id)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Respinge
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:bg-red-500/10"
                onClick={() => handleDelete(story.story_id)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Șterge
              </Button>
            </div>
          </div>
        ))}
        
        {stories.length === 0 && (
          <div className="text-center py-12 text-slate-500 bg-[#0A0A0A] border border-white/5 rounded-xl">
            Nu există povești {filter === "pending" ? "în așteptare" : filter === "approved" ? "aprobate" : "respinse"}
          </div>
        )}
      </div>
    </div>
  );
}

// Reports Management
function ReportsManagement() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/admin/reports?status=${filter}`,
        { withCredentials: true }
      );
      setReports(response.data.reports);
      setStats(response.data.stats);
    } catch (error) {
      toast.error("Eroare la încărcarea rapoartelor");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (reportId, status, action) => {
    const adminNotes = action === "none" ? "" : prompt("Note admin (opțional):");
    
    setProcessing(reportId);
    try {
      await axios.put(
        `${API_URL}/api/admin/reports/${reportId}`,
        { status, action, admin_notes: adminNotes || "" },
        { withCredentials: true }
      );
      toast.success("Raport actualizat!");
      fetchReports();
    } catch (error) {
      toast.error("Eroare la actualizare");
    } finally {
      setProcessing(null);
    }
  };

  const statusColors = {
    pending: "bg-yellow-500/20 text-yellow-400",
    reviewed: "bg-blue-500/20 text-blue-400",
    dismissed: "bg-slate-500/20 text-slate-400",
    action_taken: "bg-green-500/20 text-green-400"
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-24 bg-[#121212] rounded-xl" />
      ))}
    </div>;
  }

  return (
    <div className="space-y-6" data-testid="reports-management">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Rapoarte Anunțuri</h1>
          <p className="text-slate-400">Gestionează rapoartele utilizatorilor</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: "pending", label: "În Așteptare", color: "yellow" },
          { key: "reviewed", label: "Verificate", color: "blue" },
          { key: "action_taken", label: "Acțiune Luată", color: "green" },
          { key: "dismissed", label: "Respinse", color: "slate" }
        ].map((item) => (
          <div 
            key={item.key}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              filter === item.key 
                ? `bg-${item.color}-500/20 border-${item.color}-500/50` 
                : 'bg-[#0A0A0A] border-white/5 hover:border-white/10'
            }`}
            onClick={() => setFilter(item.key)}
          >
            <p className={`text-2xl font-bold ${filter === item.key ? `text-${item.color}-400` : 'text-white'}`}>
              {stats[item.key] || 0}
            </p>
            <p className="text-sm text-slate-400">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {reports.map((report) => (
          <div 
            key={report.report_id}
            className="bg-[#0A0A0A] border border-white/5 rounded-xl p-5"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${statusColors[report.status]}`}>
                    {report.status === "pending" ? "În Așteptare" : 
                     report.status === "reviewed" ? "Verificat" :
                     report.status === "dismissed" ? "Respins" : "Acțiune Luată"}
                  </span>
                  <span className="text-slate-500 text-xs">
                    {new Date(report.created_at).toLocaleString("ro-RO")}
                  </span>
                </div>
                
                <h3 className="text-white font-medium mb-1">
                  Anunț: <Link to={`/ad/${report.ad_id}`} className="text-blue-400 hover:underline" target="_blank">
                    {report.ad_title}
                  </Link>
                </h3>
                
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 font-medium">{report.reason_label}</span>
                </div>
                
                {report.description && (
                  <p className="text-slate-400 text-sm bg-white/5 p-3 rounded-lg mt-2">
                    "{report.description}"
                  </p>
                )}
                
                {report.admin_notes && (
                  <p className="text-slate-500 text-sm mt-2 italic">
                    Admin: {report.admin_notes}
                  </p>
                )}
              </div>
              
              {/* Actions */}
              {report.status === "pending" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(report.report_id, "dismissed", "none")}
                    disabled={processing === report.report_id}
                    className="border-slate-500/30 text-slate-400 hover:bg-slate-500/10"
                  >
                    Respinge
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(report.report_id, "action_taken", "warn")}
                    disabled={processing === report.report_id}
                    className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                  >
                    Avertizează
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(report.report_id, "action_taken", "suspend")}
                    disabled={processing === report.report_id}
                    className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                  >
                    Suspendă
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAction(report.report_id, "action_taken", "delete")}
                    disabled={processing === report.report_id}
                    className="bg-red-600 hover:bg-red-500"
                  >
                    Șterge Anunț
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {reports.length === 0 && (
          <div className="text-center py-12 text-slate-500 bg-[#0A0A0A] border border-white/5 rounded-xl">
            <Flag className="w-12 h-12 mx-auto mb-3 opacity-50" />
            Nu există rapoarte {filter === "pending" ? "în așteptare" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// Main Admin Page
export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/users", icon: Users, label: "Utilizatori" },
    { path: "/admin/ads", icon: FileText, label: "Anunțuri" },
    { path: "/admin/reports", icon: Flag, label: "Rapoarte" },
    { path: "/admin/banners", icon: Image, label: "Bannere" },
    { path: "/admin/forum", icon: MessageSquare, label: "Forum" },
    { path: "/admin/stories", icon: Trophy, label: "Povești" },
  ];

  const isActive = (path) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="admin-page">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/5">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold">X</span>
          </div>
          <span className="text-lg font-bold text-white">Admin</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-white"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? "block" : "hidden"} lg:block fixed lg:sticky top-0 left-0 w-64 h-screen bg-[#0A0A0A] border-r border-white/5 z-50`}>
          <div className="p-6">
            <Link to="/" className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">X</span>
              </div>
              <div>
                <span className="text-xl font-bold text-white">X67</span>
                <span className="text-xs text-slate-500 block -mt-1">Admin Panel</span>
              </div>
            </Link>

            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive(item.path)
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/5">
            <Link to="/">
              <Button variant="outline" className="w-full border-white/10 text-slate-400 hover:text-white hover:bg-white/5">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Înapoi la site
              </Button>
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          <Routes>
            <Route index element={<DashboardOverview />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="ads" element={<AdsManagement />} />
            <Route path="banners" element={<BannersManagement />} />
            <Route path="forum" element={<ForumModeration />} />
            <Route path="stories" element={<StoriesModeration />} />
          </Routes>
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
