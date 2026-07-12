import React, { useState, useEffect } from 'react';
import {
  Search, ChevronDown, Eye, X, Loader2, Menu, Users, Gift, Bell,
  BarChart2, LogOut, ClipboardList, Database, Fingerprint, UserPlus, Settings, UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { MEMBER_CATEGORIES, getCategoryDisplayName } from './utils/approvalWorkflow';
import {
  COLLECTIONS,
  MEMBER_STATUS,
  getMemberCategory,
  isBeneficiaryUser,
} from './utils/dataModel';

const NavItem = ({ icon: Icon, label, active, badge, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    title={!onClick ? `${label} is not available yet` : undefined}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1 transition-all ${
      active ? 'bg-teal-400/10 text-teal-300 border-l-2 border-teal-300' : onClick ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200' : 'text-slate-600/70 cursor-not-allowed'
    }`}
  >
    <div className="flex items-center space-x-3">
      <Icon size={18} className={active ? 'text-teal-300' : 'text-slate-500'} />
      <span className="text-sm font-semibold">{label}</span>
    </div>
    {badge && (
      <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
        {badge}
      </span>
    )}
  </button>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

const Membership = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedMember, setSelectedMember] = useState(null);
  const [userName, setUserName] = useState('Admin');
  const [userInitials, setUserInitials] = useState('A');
  const [userRole, setUserRole] = useState('Admin');

  useEffect(() => {
    fetchMembers();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/'); return; }
      try {
          const snap = await getDoc(doc(db, COLLECTIONS.users, user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setUserName([d.firstName, d.lastName].filter(Boolean).join(' ') || user.email);
          setUserInitials(((d.firstName?.[0] || '') + (d.lastName?.[0] || '')).toUpperCase() || 'A');
          setUserRole(d.role || 'Admin');
        }
      } catch (e) { console.error(e); }
    });
    return () => unsub();
  }, [navigate]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.users));
      const data = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(isBeneficiaryUser)
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.idNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const cat = getMemberCategory(m);
    const matchesCategory = categoryFilter === 'All' || cat === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categoryStats = Object.keys(MEMBER_CATEGORIES).map((key) => ({
    key,
    label: MEMBER_CATEGORIES[key],
    count: members.filter((m) => getMemberCategory(m) === key).length,
  }));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <div className="w-64 bg-[#102a43] flex flex-col shadow-xl z-20 shrink-0">
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <ShieldIcon />
          </div>
          <div>
            <h1 className="text-white font-bold tracking-wide text-sm">MSWDO</h1>
            <p className="text-blue-400 text-[10px] uppercase font-bold tracking-widest">Admin Panel</p>
          </div>
        </div>
        <div className="px-6 py-2 flex-1 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4">Navigation</p>
          <div className="space-y-0.5">
            <NavItem icon={Menu} label="Dashboard" onClick={() => navigate('/dashboard')} />
            <NavItem icon={Users} label="Membership" active />
            <NavItem icon={ClipboardList} label="Applications" onClick={() => navigate('/applications')} />
            <NavItem icon={Gift} label="Benefits" onClick={() => navigate('/benefits')} />
            <NavItem icon={UserX} label="Termination" onClick={() => navigate('/termination')} />
            <NavItem icon={Bell} label="Announcements" onClick={() => navigate('/announcements')} />
            <NavItem icon={BarChart2} label="Reports" />
          </div>
          <div className="mt-8 mb-4 h-px w-full bg-white/5" />
          <div className="space-y-0.5">
            <NavItem icon={Database} label="CMS" badge="SA" />
            <NavItem icon={Fingerprint} label="Audit & Monitoring" badge="SA" onClick={() => navigate('/audit')} />
            <NavItem icon={UserPlus} label="User Management" badge="SA" onClick={() => navigate('/user-management')} />
            <NavItem icon={Settings} label="Settings" badge="SA" />
          </div>
        </div>
        <div className="p-6">
          <button onClick={() => signOut(auth).then(() => navigate('/'))} className="flex items-center space-x-3 text-slate-400 hover:text-red-400 transition-colors w-full">
            <LogOut size={18} />
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 z-10 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Membership</h2>
            <p className="text-xs text-slate-500 font-medium">Approved beneficiaries and member records</p>
          </div>
          <div className="flex items-center space-x-3 pl-6 border-l border-slate-100">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-slate-800">{userName}</span>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{userRole}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center border-2 border-blue-100 shadow-sm">
              {userInitials}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {categoryStats.map((stat) => (
              <div key={stat.key} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <p className="text-2xl font-extrabold text-blue-600">{stat.count}</p>
                <p className="text-xs font-bold text-slate-600 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-medium"
              />
            </div>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-blue-400 transition-all"
              >
                <option value="All">All Categories</option>
                {Object.entries(MEMBER_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Member ID</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" size={20}/> Loading members...</td></tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500 font-medium">No members found. Approved applications appear here automatically.</td></tr>
                  ) : (
                    filteredMembers.map((member) => {
                      const cat = getMemberCategory(member);
                      return (
                        <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                                {member.firstName?.[0]}{member.lastName?.[0]}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{member.firstName} {member.lastName}</p>
                                <p className="text-[11px] text-slate-400 font-medium">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-slate-700">{member.idNumber || '—'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-semibold text-slate-700">{getCategoryDisplayName(cat)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                              member.status === MEMBER_STATUS.active ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                              {member.status || MEMBER_STATUS.active}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedMember(member)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedMember(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden z-10">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-white font-bold text-base">Member Record</h2>
                  <p className="text-emerald-100 text-[11px] font-medium">{selectedMember.idNumber}</p>
                </div>
                <button onClick={() => setSelectedMember(null)} className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-[10px] text-slate-400 font-bold mb-1">Full Name</p><p className="text-sm font-bold text-slate-800">{selectedMember.firstName} {selectedMember.lastName}</p></div>
                    <div><p className="text-[10px] text-slate-400 font-bold mb-1">Category</p><p className="text-sm font-semibold text-slate-700">{selectedMember.memberCategoryName || getCategoryDisplayName(selectedMember.memberCategory)}</p></div>
                    <div><p className="text-[10px] text-slate-400 font-bold mb-1">Email</p><p className="text-sm font-semibold text-slate-700">{selectedMember.email}</p></div>
                    <div><p className="text-[10px] text-slate-400 font-bold mb-1">Contact</p><p className="text-sm font-semibold text-slate-700">{selectedMember.contactNumber || '—'}</p></div>
                    <div className="col-span-2"><p className="text-[10px] text-slate-400 font-bold mb-1">Address</p><p className="text-sm font-semibold text-slate-700">{selectedMember.address || '—'}</p></div>
                  </div>
                </section>
                {selectedMember.documents && Object.keys(selectedMember.documents).length > 0 && (
                  <section>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Uploaded Documents</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(selectedMember.documents).map(([key, url]) => url && (
                        <div key={key}>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-slate-200">
                            <img src={url} alt={key} loading="lazy" decoding="async" className="w-full h-24 object-cover" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Membership;
