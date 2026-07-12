import React, { useEffect, useMemo, useState } from 'react';
import { BarChart2, Bell, ChevronDown, ClipboardList, Database, Download, FileText, Fingerprint, Gift, Loader2, LogOut, Menu, Search, Settings, UserPlus, UserX, Users } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { CATEGORY_OPTIONS, COLLECTIONS } from './utils/dataModel';
import { getAssignedCategories } from './utils/approvalWorkflow';

const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
  <button type="button" onClick={onClick} disabled={!onClick} title={!onClick ? `${label} is not available yet` : undefined} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1 transition-all ${active ? 'bg-teal-400/10 text-teal-300 border-l-2 border-teal-300' : onClick ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200' : 'text-slate-600/70 cursor-not-allowed'}`}>
    <span className="flex items-center gap-3"><Icon size={18} /><span className="text-sm font-semibold">{label}</span></span>
    {badge && <span className="text-[9px] font-bold text-indigo-400">{badge}</span>}
  </button>
);

const timestampValue = (value) => value?.toMillis?.() || (value ? new Date(value).getTime() : 0);
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestampValue(value))) : 'Pending';
const csvValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const AuditMonitoring = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [assignedCategories, setAssignedCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLogs = async (categories) => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.activityLogs));
      const visibleLogs = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => categories.includes(item.categoryId))
        .sort((a, b) => timestampValue(b.timestamp) - timestampValue(a.timestamp));
      setLogs(visibleLogs);
    } catch (error) {
      console.error('Error loading audit records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/'); return; }
      const profile = await getDoc(doc(db, COLLECTIONS.users, user.uid));
      const categories = getAssignedCategories(profile.exists() ? profile.data() : {});
      setAssignedCategories(categories);
      await loadLogs(categories);
    });
    return () => unsubscribe();
  }, [navigate]);

  const actionOptions = useMemo(() => [...new Set(logs.map((item) => item.action).filter(Boolean))].sort(), [logs]);
  const filteredLogs = useMemo(() => logs.filter((item) => {
    const haystack = [item.action, item.type, item.details, item.adminName, item.adminEmail, item.applicantName, item.memberId].join(' ').toLowerCase();
    const time = timestampValue(item.timestamp);
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : 0;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
    return (actionFilter === 'All' || item.action === actionFilter)
      && (categoryFilter === 'All' || item.categoryId === categoryFilter)
      && haystack.includes(searchTerm.toLowerCase())
      && time >= from && time <= to;
  }), [logs, actionFilter, categoryFilter, searchTerm, dateFrom, dateTo]);

  const exportCsv = () => {
    const rows = [
      ['Date', 'Action', 'Type', 'Category', 'Member', 'Member ID', 'Staff', 'Details'],
      ...filteredLogs.map((item) => [formatDate(item.timestamp), item.action, item.type, item.category, item.applicantName, item.memberId, item.adminName || item.adminEmail, item.details]),
    ];
    const blob = new Blob([rows.map((row) => row.map(csvValue).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mswdo-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <aside className="w-64 bg-[#102a43] flex flex-col shadow-xl shrink-0">
        <div className="p-6"><h1 className="text-white font-bold tracking-wide text-sm">MSWDO</h1><p className="text-blue-400 text-[10px] uppercase font-bold tracking-widest">Admin Panel</p></div>
        <div className="px-6 py-2 flex-1 overflow-y-auto"><p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4">Navigation</p>
          <NavItem icon={Menu} label="Dashboard" onClick={() => navigate('/dashboard')} /><NavItem icon={Users} label="Membership" onClick={() => navigate('/membership')} /><NavItem icon={ClipboardList} label="Applications" onClick={() => navigate('/applications')} /><NavItem icon={Gift} label="Benefits" onClick={() => navigate('/benefits')} /><NavItem icon={UserX} label="Termination" onClick={() => navigate('/termination')} /><NavItem icon={FileText} label="Record Tracking" active />
          <NavItem icon={Bell} label="Announcements" onClick={() => navigate('/announcements')} /><NavItem icon={BarChart2} label="Reports" />
          <div className="my-6 h-px bg-white/5" /><NavItem icon={Database} label="CMS" badge="SA" /><NavItem icon={Fingerprint} label="Audit & Monitoring" active badge="SA" onClick={() => navigate('/audit')} /><NavItem icon={UserPlus} label="User Management" badge="SA" onClick={() => navigate('/user-management')} /><NavItem icon={Settings} label="Settings" badge="SA" />
        </div>
        <button onClick={() => signOut(auth).then(() => navigate('/'))} className="m-6 flex items-center gap-3 text-slate-400 hover:text-red-400"><LogOut size={18} /><span className="text-sm font-semibold">Logout</span></button>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8"><div><h2 className="text-lg font-bold text-slate-800">Audit &amp; Monitoring</h2><p className="text-xs text-slate-500 font-medium">Review staff actions and beneficiary record history</p></div><button onClick={exportCsv} disabled={!filteredLogs.length} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50"><Download size={15} />Export CSV</button></header>
        <div className="p-4 sm:p-8 space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-3 items-center"><div className="relative w-full md:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search actions, members, or staff..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" /></div><label className="relative"><select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="appearance-none pl-4 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"><option>All</option>{actionOptions.map((action) => <option key={action}>{action}</option>)}</select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" /></label><label className="relative"><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="appearance-none pl-4 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"><option value="All">All Categories</option>{CATEGORY_OPTIONS.filter(({ id }) => assignedCategories.includes(id)).map(({ id, label }) => <option key={id} value={id}>{label}</option>)}</select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" /></label><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /><span className="text-xs text-slate-400">to</span><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"><h3 className="font-bold text-slate-800">Activity Records</h3><span className="text-xs font-semibold text-slate-400">{filteredLogs.length} records</span></div><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-50 border-b border-slate-100"><th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Date</th><th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Action</th><th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Member / Record</th><th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Staff</th><th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Details</th></tr></thead><tbody className="divide-y divide-slate-50">{loading ? <tr><td colSpan="5" className="p-10 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" size={20} />Loading audit records...</td></tr> : filteredLogs.length === 0 ? <tr><td colSpan="5" className="p-10 text-center text-slate-500">No activity records match the current filters.</td></tr> : filteredLogs.map((item) => <tr key={item.id} className="hover:bg-slate-50/50 align-top"><td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">{formatDate(item.timestamp)}</td><td className="px-6 py-4"><p className="text-sm font-bold text-slate-800">{item.action || item.type || 'Activity'}</p><p className="text-[10px] text-slate-400">{item.category || 'General'}</p></td><td className="px-6 py-4"><p className="text-sm font-semibold text-slate-700">{item.applicantName || 'System record'}</p><p className="text-[10px] text-slate-400">{item.memberId || item.applicationId || ''}</p></td><td className="px-6 py-4 text-xs text-slate-600">{item.adminName || item.adminEmail || 'System'}</td><td className="px-6 py-4 text-xs text-slate-500 max-w-sm">{item.details || 'No details recorded'}</td></tr>)}</tbody></table></div></div>
        </div>
      </main>
    </div>
  );
};

export default AuditMonitoring;
