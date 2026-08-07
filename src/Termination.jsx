import React, { useEffect, useMemo, useState } from 'react';
import { Search, ChevronDown, Loader2, Menu, Users, ClipboardList, Gift, UserX, Bell, BarChart2, Database, Fingerprint, UserPlus, Settings, LogOut, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { CATEGORY_OPTIONS, COLLECTIONS, MEMBER_STATUS, getMemberCategory, isBeneficiaryUser } from './utils/dataModel';
import { getAssignedCategories, getCategoryDisplayName, getStaffInfo, logActivity, sendWorkflowEmailAndTrack } from './utils/approvalWorkflow';

const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
  <button type="button" onClick={onClick} disabled={!onClick} title={!onClick ? `${label} is not available yet` : undefined} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1 transition-all ${active ? 'bg-teal-400/10 text-teal-300 border-l-2 border-teal-300' : onClick ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200' : 'text-slate-600/70 cursor-not-allowed'}`}>
    <span className="flex items-center gap-3"><Icon size={18} /><span className="text-sm font-semibold">{label}</span></span>
    {badge && <span className="text-[9px] font-bold text-indigo-400">{badge}</span>}
  </button>
);

const statusClass = (status) => status === MEMBER_STATUS.active
  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
  : status === MEMBER_STATUS.terminated
    ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-slate-50 text-slate-600 border-slate-200';

const Termination = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [history, setHistory] = useState([]);
  const [assignedCategories, setAssignedCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [staff, setStaff] = useState({ uid: '', email: '', name: 'Staff' });
  const [reasonDialog, setReasonDialog] = useState({ open: false, member: null, action: '', reason: '' });

  const loadData = async (categories = assignedCategories) => {
    setLoading(true);
    try {
      const [usersSnap, historySnap] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.users)),
        getDocs(collection(db, COLLECTIONS.terminations)),
      ]);
      const visible = usersSnap.docs.map((item) => ({ id: item.id, ...item.data() }))
        .filter(isBeneficiaryUser)
        .filter((member) => categories.includes(getMemberCategory(member)))
        .sort((a, b) => (b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0));
      setMembers(visible);
      setHistory(historySnap.docs.map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => categories.includes(item.categoryId))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
    } catch (error) {
      console.error('Error loading termination records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/'); return; }
      const snap = await getDoc(doc(db, COLLECTIONS.users, user.uid));
      const data = snap.exists() ? snap.data() : {};
      const categories = getAssignedCategories(data);
      setAssignedCategories(categories);
      setStaff(await getStaffInfo(db, user));
      await loadData(categories);
    });
    return () => unsubscribe();
  }, [navigate]);

  const filteredMembers = useMemo(() => members.filter((member) => {
    const name = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();
    const term = searchTerm.toLowerCase();
    return (categoryFilter === 'All' || getMemberCategory(member) === categoryFilter)
      && (statusFilter === 'All' || (member.status || MEMBER_STATUS.active) === statusFilter)
      && (!term || name.includes(term) || String(member.idNumber || '').toLowerCase().includes(term) || String(member.email || '').toLowerCase().includes(term));
  }), [members, categoryFilter, statusFilter, searchTerm]);

  const changeStatus = (member) => {
    const currentStatus = member.status || MEMBER_STATUS.active;
    const nextStatus = currentStatus === MEMBER_STATUS.terminated ? MEMBER_STATUS.active : MEMBER_STATUS.terminated;
    const action = nextStatus === MEMBER_STATUS.terminated ? 'terminate' : 'restore';
    setReasonDialog({ open: true, member, action, reason: '' });
  };

  const confirmStatusChange = async () => {
    const { member, reason } = reasonDialog;
    if (!member || !reason.trim()) return;
    const currentStatus = member.status || MEMBER_STATUS.active;
    const nextStatus = currentStatus === MEMBER_STATUS.terminated ? MEMBER_STATUS.active : MEMBER_STATUS.terminated;

    setBusyId(member.id);
    try {
      const categoryId = getMemberCategory(member);
      const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
      const record = {
        memberId: member.id,
        memberName,
        memberIdNumber: member.idNumber || '',
        categoryId,
        status: nextStatus,
        previousStatus: currentStatus,
        reason: reason.trim(),
        createdAt: serverTimestamp(),
        createdBy: staff,
      };
      const historyRef = await addDoc(collection(db, COLLECTIONS.terminations), record);
      const update = {
        status: nextStatus,
        updatedAt: serverTimestamp(),
        ...(nextStatus === MEMBER_STATUS.terminated
          ? { terminatedAt: serverTimestamp(), terminatedBy: staff, terminationReason: reason.trim(), terminationId: historyRef.id }
          : { restoredAt: serverTimestamp(), restoredBy: staff, restoreReason: reason.trim() }),
      };
      await updateDoc(doc(db, COLLECTIONS.users, member.id), update);
      await logActivity(db, {
        type: nextStatus === MEMBER_STATUS.terminated ? 'member_terminated' : 'member_restored',
        action: nextStatus === MEMBER_STATUS.terminated ? 'Member Terminated' : 'Member Restored',
        details: `${memberName}: ${reason.trim()}`,
        memberId: member.id,
        applicantName: memberName,
        category: getCategoryDisplayName(categoryId),
        categoryId,
        adminUid: staff.uid,
        adminEmail: staff.email,
        adminName: staff.name,
      });
      void sendWorkflowEmailAndTrack({
        db,
        collectionName: COLLECTIONS.terminations,
        recordId: historyRef.id,
        email: member.email,
        applicantName: memberName,
        status: nextStatus,
        categoryName: getCategoryDisplayName(categoryId),
        subject: nextStatus === MEMBER_STATUS.terminated ? 'Your MSWDO account was terminated' : 'Your MSWDO account was restored',
        message: nextStatus === MEMBER_STATUS.terminated
          ? `Your MSWDO beneficiary account was terminated. Reason: ${reason.trim()}`
          : `Your MSWDO beneficiary account was restored. Reason: ${reason.trim()}`,
      }).catch((error) => console.error('Member status email error:', error));
      await loadData(assignedCategories);
    } catch (error) {
      console.error('Error changing member status:', error);
      window.alert('The status could not be changed. Please try again.');
    } finally {
      setBusyId('');
      setReasonDialog({ open: false, member: null, action: '', reason: '' });
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <aside className="w-64 bg-[#102a43] flex flex-col shadow-xl shrink-0">
        <div className="p-6"><h1 className="text-white font-bold tracking-wide text-sm">MSWDO</h1><p className="text-blue-400 text-[10px] uppercase font-bold tracking-widest">Admin Panel</p></div>
        <div className="px-6 py-2 flex-1 overflow-y-auto"><p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4">Navigation</p>
          <NavItem icon={Menu} label="Dashboard" onClick={() => navigate('/dashboard')} />
          <NavItem icon={Users} label="Membership" onClick={() => navigate('/membership')} />
          <NavItem icon={ClipboardList} label="Applications" onClick={() => navigate('/applications')} />
          <NavItem icon={Gift} label="Benefits" onClick={() => navigate('/benefits')} />
          <NavItem icon={UserX} label="Termination" active />
          <NavItem icon={Bell} label="Announcements" onClick={() => navigate('/announcements')} /><NavItem icon={BarChart2} label="Reports" onClick={() => navigate('/reports')} />
          <div className="my-6 h-px bg-white/5" /><NavItem icon={Database} label="CMS" badge="SA" /><NavItem icon={Fingerprint} label="Audit & Monitoring" badge="SA" onClick={() => navigate('/audit')} /><NavItem icon={UserPlus} label="User Management" badge="SA" onClick={() => navigate('/user-management')} /><NavItem icon={Settings} label="Settings" badge="SA" />
        </div>
        <button onClick={() => signOut(auth).then(() => navigate('/'))} className="m-6 flex items-center gap-3 text-slate-400 hover:text-red-400"><LogOut size={18} /><span className="text-sm font-semibold">Logout</span></button>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center px-8"><div><h2 className="text-lg font-bold text-slate-800">Termination</h2><p className="text-xs text-slate-500 font-medium">Manage beneficiary status and termination history</p></div></header>
        <div className="p-4 sm:p-8 space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="relative w-full md:w-80"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search name, ID, or email..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" /></div>
            <div className="flex gap-3"><label className="relative"><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="appearance-none pl-4 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"><option value="All">All Categories</option>{CATEGORY_OPTIONS.filter(({ id }) => assignedCategories.includes(id)).map(({ id, label }) => <option key={id} value={id}>{label}</option>)}</select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" /></label><label className="relative"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="appearance-none pl-4 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"><option>All</option><option>{MEMBER_STATUS.active}</option><option>{MEMBER_STATUS.inactive}</option><option>{MEMBER_STATUS.terminated}</option></select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" /></label></div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-50 border-b border-slate-100"><th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Beneficiary</th><th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Category</th><th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Status</th><th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-50">{loading ? <tr><td colSpan="4" className="p-10 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" size={20} />Loading members...</td></tr> : filteredMembers.length === 0 ? <tr><td colSpan="4" className="p-10 text-center text-slate-500">No beneficiary records found.</td></tr> : filteredMembers.map((member) => { const status = member.status || MEMBER_STATUS.active; return <tr key={member.id} className="hover:bg-slate-50/50"><td className="px-6 py-4"><p className="text-sm font-bold text-slate-800">{member.firstName} {member.lastName}</p><p className="text-[11px] text-slate-400">{member.idNumber || member.email}</p></td><td className="px-6 py-4 text-xs font-semibold text-slate-700">{getCategoryDisplayName(getMemberCategory(member))}</td><td className="px-6 py-4"><span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase ${statusClass(status)}`}>{status}</span></td><td className="px-6 py-4 text-right"><button disabled={busyId === member.id} onClick={() => changeStatus(member)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 ${status === MEMBER_STATUS.terminated ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'text-red-700 bg-red-50 hover:bg-red-100'}`}>{busyId === member.id ? <Loader2 size={14} className="animate-spin" /> : status === MEMBER_STATUS.terminated ? <RotateCcw size={14} /> : <UserX size={14} />}{status === MEMBER_STATUS.terminated ? 'Restore' : 'Terminate'}</button></td></tr>; })}</tbody></table></div></div>
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><div className="px-6 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-800">Recent Status History</h3></div><div className="divide-y divide-slate-50">{history.slice(0, 8).map((item) => <div key={item.id} className="px-6 py-3 flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-slate-700">{item.memberName}</p><p className="text-xs text-slate-400">{item.reason}</p></div><span className={`text-[10px] font-bold uppercase ${item.status === MEMBER_STATUS.terminated ? 'text-red-600' : 'text-emerald-600'}`}>{item.status}</span></div>)}{history.length === 0 && <p className="px-6 py-6 text-sm text-slate-400">No status history yet.</p>}</div></section>
        </div>
        </main>
        {reasonDialog.open && (
          <div className="fixed inset-0 z-50 bg-slate-950/45 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="status-dialog-title">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6">
              <h3 id="status-dialog-title" className="text-lg font-bold text-slate-800">{reasonDialog.action === 'terminate' ? 'Terminate beneficiary' : 'Restore beneficiary'}</h3>
              <p className="text-sm text-slate-500 mt-1">Enter a reason for {reasonDialog.member?.firstName} {reasonDialog.member?.lastName}. This will be stored in the status history.</p>
              <textarea autoFocus rows="4" value={reasonDialog.reason} onChange={(event) => setReasonDialog((value) => ({ ...value, reason: event.target.value }))} placeholder="Reason is required" className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-400 resize-none" />
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setReasonDialog({ open: false, member: null, action: '', reason: '' })} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={confirmStatusChange} disabled={!reasonDialog.reason.trim() || Boolean(busyId)} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50">{busyId ? 'Saving...' : 'Save status'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default Termination;
