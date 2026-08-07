import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BarChart2, Bell, ClipboardList, Database, Download, FileText, Fingerprint, Gift, Loader2, LogOut, Menu, Printer, Search, Settings, UserPlus, UserX, Users } from 'lucide-react';
import { collection, getDoc, getDocs, doc, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { CATEGORY_OPTIONS, COLLECTIONS, getMemberCategory, getCategoryDisplayName, isBeneficiaryUser } from './utils/dataModel';
import { getAssignedCategories, isSuperAdminUser } from './utils/approvalWorkflow';

const REPORT_TYPES = {
  applications: 'Applications',
  members: 'Beneficiary Members',
  claims: 'Benefit Claims',
  terminations: 'Terminations',
  announcements: 'Announcements',
  activity: 'Audit Activity',
};

const timestamp = (value) => value?.toMillis?.() || (value ? new Date(value).getTime() : 0);
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(timestamp(value))) : 'Pending';
const csv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const NavItem = ({ icon: Icon, label, active, onClick, badge }) => <button type="button" onClick={onClick} disabled={!onClick} title={!onClick ? `${label} is not available yet` : undefined} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1 transition-all ${active ? 'bg-teal-400/10 text-teal-300 border-l-2 border-teal-300' : onClick ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200' : 'text-slate-600/70 cursor-not-allowed'}`}><span className="flex items-center gap-3"><Icon size={18} /><span className="text-sm font-semibold">{label}</span></span>{badge && <span className="text-[9px] font-bold text-indigo-400">{badge}</span>}</button>;

const Reports = () => {
  const navigate = useNavigate();
  const [assignedCategories, setAssignedCategories] = useState([]);
  const [records, setRecords] = useState({});
  const [reportType, setReportType] = useState('applications');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/'); return; }
      const profile = await getDoc(doc(db, COLLECTIONS.users, user.uid));
      const profileData = profile.exists() ? profile.data() : {};
      const categories = getAssignedCategories(profileData);
      setAssignedCategories(categories);
      try {
        const scopedCollections = [
          ['applications', 'category'],
          ['claims', 'category'],
          ['terminations', 'categoryId'],
        ];
        const scopedSnapshots = await Promise.all(
          scopedCollections.map(([key, field]) => Promise.all(
            categories.map((category) => getDocs(
              query(collection(db, COLLECTIONS[key]), where(field, '==', category))
            ))
          ))
        );
        const unscopedKeys = ['users', 'announcements'];
        const unscopedSnapshots = await Promise.all(unscopedKeys.map((key) => getDocs(collection(db, COLLECTIONS[key]))));
        const activitySnapshots = isSuperAdminUser(profileData)
          ? [await getDocs(collection(db, COLLECTIONS.activityLogs))]
          : await Promise.all(
            categories.map((categoryId) => getDocs(
              query(collection(db, COLLECTIONS.activityLogs), where('categoryId', '==', categoryId))
            ))
          );
        const next = {};
        scopedCollections.forEach(([key], index) => {
          next[key] = scopedSnapshots[index].flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        });
        unscopedKeys.forEach((key, index) => {
          next[key] = unscopedSnapshots[index].docs.map((item) => ({ id: item.id, ...item.data() }));
        });
        next.activityLogs = activitySnapshots.flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setRecords(next);
      } catch (error) {
        console.error('Error loading reports:', error);
        window.alert('Reports could not be loaded. Please try again.');
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const rows = useMemo(() => {
    const source = reportType === 'members'
      ? (records.users || []).filter(isBeneficiaryUser)
      : reportType === 'activity'
        ? (records.activityLogs || [])
        : records[reportType] || [];
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : 0;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
    const term = searchTerm.toLowerCase();
    return source.filter((item) => {
      const categoryIds = Array.isArray(item.targetCategories)
        ? item.targetCategories
        : [item.categoryId || item.category || getMemberCategory(item)];
      const date = timestamp(item.submissionDate || item.requestedAt || item.createdAt || item.timestamp || item.terminatedAt);
      const text = [item.firstName, item.lastName, item.memberName, item.applicantName, item.email, item.action, item.status, item.details, item.title, item.name, item.idNumber].join(' ').toLowerCase();
      return categoryIds.some((categoryId) => assignedCategories.includes(categoryId))
        && (categoryFilter === 'All' || categoryIds.includes(categoryFilter))
        && date >= from && date <= to
        && text.includes(term);
    }).sort((a, b) => timestamp(b.submissionDate || b.requestedAt || b.createdAt || b.timestamp || b.terminatedAt) - timestamp(a.submissionDate || a.requestedAt || a.createdAt || a.timestamp || a.terminatedAt));
  }, [records, reportType, assignedCategories, categoryFilter, dateFrom, dateTo, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [reportType, categoryFilter, dateFrom, dateTo, searchTerm]);

  const scopedRecords = (source = []) => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : 0;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
    const term = searchTerm.toLowerCase();
    return source.filter((item) => {
      const categoryIds = Array.isArray(item.targetCategories) ? item.targetCategories : [item.categoryId || item.category || getMemberCategory(item)];
      const date = timestamp(item.submissionDate || item.requestedAt || item.createdAt || item.timestamp || item.terminatedAt);
      const text = [item.firstName, item.lastName, item.memberName, item.applicantName, item.email, item.action, item.status, item.details, item.title, item.name, item.idNumber].join(' ').toLowerCase();
      return categoryIds.some((categoryId) => assignedCategories.includes(categoryId))
        && (categoryFilter === 'All' || categoryIds.includes(categoryFilter))
        && date >= from && date <= to && text.includes(term);
    });
  };
  const scopedApplications = scopedRecords(records.applications);
  const scopedMembers = scopedRecords((records.users || []).filter(isBeneficiaryUser));
  const scopedClaims = scopedRecords(records.claims);
  const scopedTerminations = scopedRecords(records.terminations);
  const processedAmount = scopedClaims.reduce((total, item) => total + (item.status === 'Processed' ? Number(item.amount || 0) : 0), 0);
  const exportCsv = () => {
    const headers = ['Date', 'Name / Title', 'Category', 'Status', 'Reference', 'Amount', 'Details'];
    const content = [headers, ...rows.map((item) => [formatDate(item.submissionDate || item.requestedAt || item.createdAt || item.timestamp || item.terminatedAt), `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.memberName || item.applicantName || item.title || item.name || 'System record', getCategoryDisplayName(item.categoryId || item.category || getMemberCategory(item)), item.status || item.action || (item.published ? 'Published' : 'Draft'), item.applicationRef || item.memberId || item.id, item.amount || '', item.details || item.body || ''])].map((row) => row.map(csv).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `mswdo-${reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const counts = { applications: scopedApplications.length, members: scopedMembers.length, claims: scopedClaims.length, terminations: scopedTerminations.length };
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const printReport = () => window.print();
  return <div className="flex h-screen bg-slate-50 overflow-hidden font-sans"><aside className="w-64 bg-[#102a43] flex flex-col shadow-xl shrink-0"><div className="p-6"><h1 className="text-white font-bold tracking-wide text-sm">MSWDO</h1><p className="text-teal-300 text-[10px] uppercase font-bold tracking-widest">Admin Panel</p></div><div className="px-6 py-2 flex-1 overflow-y-auto"><p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4">Navigation</p><NavItem icon={Menu} label="Dashboard" onClick={() => navigate('/dashboard')} /><NavItem icon={Users} label="Membership" onClick={() => navigate('/membership')} /><NavItem icon={ClipboardList} label="Applications" onClick={() => navigate('/applications')} /><NavItem icon={Gift} label="Benefits" onClick={() => navigate('/benefits')} /><NavItem icon={UserX} label="Termination" onClick={() => navigate('/termination')} /><NavItem icon={FileText} label="Record Tracking" onClick={() => navigate('/audit')} /><NavItem icon={Bell} label="Announcements" onClick={() => navigate('/announcements')} /><NavItem icon={BarChart2} label="Reports" active /><div className="my-6 h-px bg-white/5" /><NavItem icon={Database} label="CMS" badge="SA" /><NavItem icon={Fingerprint} label="Audit & Monitoring" badge="SA" onClick={() => navigate('/audit')} /><NavItem icon={UserPlus} label="User Management" badge="SA" onClick={() => navigate('/user-management')} /><NavItem icon={Settings} label="Settings" badge="SA" /></div><button onClick={() => signOut(auth).then(() => navigate('/'))} className="m-6 flex items-center gap-3 text-slate-400 hover:text-red-400"><LogOut size={18} /><span className="text-sm font-semibold">Logout</span></button></aside><main className="flex-1 overflow-auto"><header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-8"><div><h2 className="text-lg font-bold text-slate-800">Reports</h2><p className="text-xs text-slate-500">Summaries and exports for MSWDO operations</p></div><div className="flex items-center gap-2"><button onClick={printReport} type="button" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50" title="Print report"><Printer size={15} />Print</button><button onClick={exportCsv} disabled={!rows.length} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 disabled:opacity-50"><Download size={15} />Export CSV</button></div></header><div className="p-4 sm:p-8 space-y-6"><div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{[['Applications', counts.applications], ['Members', counts.members], ['Claims', counts.claims], ['Released Amount', `PHP ${processedAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`]].map(([label, value]) => <div key={label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"><p className="text-2xl font-black text-slate-800">{loading ? '...' : value}</p><p className="text-[11px] font-bold text-slate-500 mt-1">{label}</p></div>)}</div><div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center"><div className="relative flex-1 min-w-56"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search report records..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400" /></div><select value={reportType} onChange={(event) => setReportType(event.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold">{Object.entries(REPORT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"><option value="All">All Categories</option>{CATEGORY_OPTIONS.filter(({ id }) => assignedCategories.includes(id)).map(({ id, label }) => <option key={id} value={id}>{label}</option>)}</select><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" /><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></div><div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"><h3 className="font-bold text-slate-800">{REPORT_TYPES[reportType]}</h3><span className="text-xs font-semibold text-slate-400">{rows.length} records</span></div><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-50 border-b border-slate-100"><th className="px-6 py-4 text-[11px] font-bold uppercase text-slate-500">Date</th><th className="px-6 py-4 text-[11px] font-bold uppercase text-slate-500">Name / Title</th><th className="px-6 py-4 text-[11px] font-bold uppercase text-slate-500">Category</th><th className="px-6 py-4 text-[11px] font-bold uppercase text-slate-500">Status</th><th className="px-6 py-4 text-[11px] font-bold uppercase text-slate-500">Reference</th><th className="px-6 py-4 text-[11px] font-bold uppercase text-slate-500">Amount</th></tr></thead><tbody className="divide-y divide-slate-50">{loading ? <tr><td colSpan="6" className="p-10 text-center text-slate-400"><Loader2 className="inline animate-spin mr-2" size={18} />Loading reports...</td></tr> : rows.length === 0 ? <tr><td colSpan="6" className="p-10 text-center text-slate-500">No records match these filters.</td></tr> : visibleRows.map((item) => <tr key={item.id} className="hover:bg-slate-50/50"><td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">{formatDate(item.submissionDate || item.requestedAt || item.createdAt || item.timestamp || item.terminatedAt)}</td><td className="px-6 py-4 text-sm font-semibold text-slate-700">{`${item.firstName || ''} ${item.lastName || ''}`.trim() || item.memberName || item.applicantName || item.title || item.name || 'System record'}</td><td className="px-6 py-4 text-xs text-slate-600">{getCategoryDisplayName(item.categoryId || item.category || getMemberCategory(item))}</td><td className="px-6 py-4 text-xs font-bold text-slate-600">{item.status || item.action || (item.published ? 'Published' : 'Draft')}</td><td className="px-6 py-4 text-xs text-slate-500">{item.applicationRef || item.memberId || item.id}</td><td className="px-6 py-4 text-xs font-semibold text-slate-700">{item.amount ? `PHP ${Number(item.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '-'}</td></tr>)}</tbody></table></div><div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100"><p className="text-xs text-slate-500">Showing {rows.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, rows.length)} of {rows.length}</p><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="p-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40" title="Previous page"><ArrowLeft size={15} /></button><span className="text-xs font-bold text-slate-600">Page {page} of {pageCount}</span><button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page === pageCount} className="p-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40" title="Next page"><ArrowRight size={15} /></button></div></div></div></div></main></div>;
};

export default Reports;
