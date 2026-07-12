import React, { useState, useEffect } from 'react';
import { 
  Search, ChevronDown, CheckCircle2, XCircle, 
  Eye, FileText, X, Loader2,
  Menu, Users, Gift, Bell, BarChart2, LogOut,
  ClipboardList, Database, Fingerprint, UserPlus, Settings, UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, firebaseConfig } from './firebase';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, query, serverTimestamp, where } from 'firebase/firestore';
import { initializeApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import {
  getCategoryDisplayName,
  CATEGORY_OPTIONS,
  APPLICATION_STATUS,
  COLLECTIONS,
  canAccessCategory,
  getAssignedCategories,
  generateSecurePassword,
  normalizeEmail,
  checkExistingMemberByEmail,
  buildMemberRecord,
  sendApprovalEmail,
  logApprovalActivities,
  logActivity,
  getStaffInfo,
  EMAILJS_CONFIG,
} from './utils/approvalWorkflow';
import emailjs from '@emailjs/browser';

// Initialize a secondary Firebase App for creating users without logging out the Admin
let secondaryApp;
let secondaryAuth;
try {
  secondaryApp = initializeApp(firebaseConfig, 'Secondary');
} catch {
  secondaryApp = getApp('Secondary');
}
secondaryAuth = getAuth(secondaryApp);

const NavItem = ({ icon: Icon, label, active, badge, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    title={!onClick ? `${label} is not available yet` : undefined}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1 transition-all ${
      active
        ? 'bg-teal-400/10 text-teal-300 border-l-2 border-teal-300'
        : onClick ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200' : 'text-slate-600/70 cursor-not-allowed'
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

const ApplicationManagement = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [userName, setUserName] = useState('Admin');
  const [userInitials, setUserInitials] = useState('A');
  const [userRole, setUserRole] = useState('Admin');
  const [adminProfile, setAdminProfile] = useState(null);
  const [assignedCategories, setAssignedCategories] = useState([]);
  
  const [selectedApp, setSelectedApp] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/'); return; }
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.users, user.uid));
        if (snap.exists()) {
          const d = snap.data();
          const profile = { id: snap.id, ...d };
          const categories = getAssignedCategories(profile);
          const name = [d.firstName, d.lastName].filter(Boolean).join(' ') || user.email;
          setUserName(name);
          setUserInitials(((d.firstName?.[0] || '') + (d.lastName?.[0] || '')).toUpperCase() || 'A');
          setUserRole(d.role || 'Admin');
          setAdminProfile(profile);
          setAssignedCategories(categories);
          await fetchApplications(categories);
        } else {
          setAdminProfile(null);
          setAssignedCategories([]);
          setApplications([]);
          setLoading(false);
        }
      } catch(e) { console.error(e); }
    });
    return () => unsub();
  }, [navigate]);

  const fetchApplications = async (categories = assignedCategories) => {
    setLoading(true);
    try {
      if (categories.length === 0) {
        setApplications([]);
        return;
      }

      const q = query(
        collection(db, COLLECTIONS.applications),
        where('category', 'in', categories)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const aTime = a.submissionDate?.toMillis?.() || 0;
          const bTime = b.submissionDate?.toMillis?.() || 0;
          return bTime - aTime;
        });
      setApplications(data);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredApps = applications.filter(app => {
    const matchesSearch = 
      app.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      app.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || app.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case APPLICATION_STATUS.pending: return 'bg-orange-50 text-orange-600 border-orange-200';
      case APPLICATION_STATUS.approved: return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case APPLICATION_STATUS.rejected: return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getCategoryName = getCategoryDisplayName;

  const ensureCategoryAccess = (application) => {
    if (!application || !adminProfile || !canAccessCategory(adminProfile, application.category)) {
      alert('Access denied. This application belongs to a category that is not assigned to your account.');
      return false;
    }
    return true;
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    if (!ensureCategoryAccess(selectedApp)) return;

    const email = normalizeEmail(selectedApp.email);
    if (!email) {
      alert('Cannot approve: applicant has no registered email address. Email is required to create a member account and send login credentials.');
      return;
    }

    setActionLoading(true);
    let accountCreated = false;
    let emailSent = false;

    try {
      const existingMember = await checkExistingMemberByEmail(db, email);
      if (existingMember.exists && existingMember.isActiveMember) {
        alert(`An active member account already exists for ${email}. Duplicate accounts are not allowed.`);
        setActionLoading(false);
        return;
      }

      const tempPassword = generateSecurePassword();
      const categoryName = getCategoryName(selectedApp.category);
      const staff = await getStaffInfo(db, auth.currentUser);
      staff.applicantEmail = email;

      let uid;

      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);
        uid = userCredential.user.uid;
        accountCreated = true;
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          alert(`An account already exists for ${email}. Duplicate accounts are not allowed.`);
          setActionLoading(false);
          return;
        }
        throw authError;
      }

      const idNumber = `MSWDO-${Math.floor(10000 + Math.random() * 90000)}`;
      const memberData = {
        ...buildMemberRecord({
          application: selectedApp,
          categoryName,
          email,
          idNumber,
        }),
        approvedAt: serverTimestamp(),
        approvedBy: {
          uid: staff.uid,
          email: staff.email,
          name: staff.name,
        },
      };

      await setDoc(doc(db, COLLECTIONS.users, uid), memberData, { merge: true });

      const approvalRecord = {
        status: APPLICATION_STATUS.approved,
        approvedAt: serverTimestamp(),
        approvedBy: {
          uid: staff.uid,
          email: staff.email,
          name: staff.name,
        },
        memberId: uid,
        memberIdNumber: idNumber,
        migratedToMembers: true,
      };

      await updateDoc(doc(db, COLLECTIONS.applications, selectedApp.id), approvalRecord);

      try {
        await sendApprovalEmail({
          email,
          applicantName: `${selectedApp.firstName} ${selectedApp.lastName}`,
          categoryName,
          tempPassword,
          loginUrl: window.location.origin,
        });
        emailSent = true;
      } catch (emailErr) {
        console.error('Failed to send approval email:', emailErr);
        alert(`Account created successfully, but the approval email could not be sent. Please provide credentials manually.\nEmail: ${email}\nTemporary Password: ${tempPassword}`);
      }

      await logApprovalActivities(db, {
        applicantName: `${selectedApp.firstName} ${selectedApp.lastName}`,
        applicationId: selectedApp.id,
        memberId: uid,
        categoryName,
        categoryId: selectedApp.category,
        staff,
        emailSent,
        accountCreated,
        idNumber,
      });

      setApplications((apps) =>
        apps.map((a) => (a.id === selectedApp.id ? { ...a, status: APPLICATION_STATUS.approved, ...approvalRecord } : a))
      );
      setSelectedApp(null);
      alert(
        emailSent
          ? `Application approved! Member account created, categorized as ${categoryName}, and login credentials sent to ${email}.`
          : `Application approved! Member account created and categorized as ${categoryName}.`
      );
    } catch (error) {
      console.error('Approval Error:', error);
      alert('An error occurred during approval: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason.trim()) return;
    if (!ensureCategoryAccess(selectedApp)) return;
    setActionLoading(true);
    try {
      // 1. Update Application Status
      const appRef = doc(db, COLLECTIONS.applications, selectedApp.id);
      await updateDoc(appRef, {
        status: APPLICATION_STATUS.rejected,
        rejectionReason: rejectionReason,
        rejectedAt: serverTimestamp()
      });

      // 2. Send Email via EmailJS
      if (selectedApp.email) {
        try {
          await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            {
              to_email: selectedApp.email,
              to_name: `${selectedApp.firstName} ${selectedApp.lastName}`,
              status: APPLICATION_STATUS.rejected,
              message: `We regret to inform you that your application was rejected for the following reason: ${rejectionReason}`
            },
            { publicKey: EMAILJS_CONFIG.publicKey }
          );
        } catch (emailErr) {
          console.error("Failed to send rejection email:", emailErr);
        }
      }

      const staff = await getStaffInfo(db, auth.currentUser);
      await logActivity(db, {
        action: 'Application Rejected',
        type: 'application_rejected',
        applicantName: `${selectedApp.firstName} ${selectedApp.lastName}`,
        applicationId: selectedApp.id,
        category: getCategoryName(selectedApp.category),
        adminEmail: staff.email,
        adminUid: staff.uid,
        adminName: staff.name,
        details: rejectionReason,
      });

      // Update UI
      setApplications(apps => apps.map(a => a.id === selectedApp.id ? { ...a, status: APPLICATION_STATUS.rejected, rejectionReason } : a));
      setShowRejectInput(false);
      setRejectionReason('');
      setSelectedApp(null);
      alert('Application rejected.');

    } catch (error) {
      console.error("Rejection Error:", error);
      alert("An error occurred during rejection.");
    } finally {
      setActionLoading(false);
    }
  };


  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* SIDEBAR */}
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
            <NavItem icon={Users} label="Membership" onClick={() => navigate('/membership')} />
            <NavItem icon={ClipboardList} label="Applications" active />
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

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 z-10 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Application Management</h2>
            <p className="text-xs text-slate-500 font-medium">Review and process applicant registrations</p>
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
        
        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search name or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-medium"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative">
              <select 
                value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-blue-400 transition-all">
                <option value="All">All Status</option>
                <option value={APPLICATION_STATUS.pending}>Pending</option>
                <option value={APPLICATION_STATUS.approved}>Approved</option>
                <option value={APPLICATION_STATUS.rejected}>Rejected</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select 
                value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-blue-400 transition-all">
                <option value="All">All Categories</option>
                {CATEGORY_OPTIONS
                  .filter(({ id }) => assignedCategories.includes(id))
                  .map(({ id, label }) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Applicant Name</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date Submitted</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" size={20}/> Loading applications...</td></tr>
                ) : filteredApps.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500 font-medium">No applications found.</td></tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {app.firstName?.[0]}{app.lastName?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{app.firstName} {app.lastName}</p>
                            <p className="text-[11px] text-slate-400 font-medium">{app.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-slate-700">{getCategoryName(app.category)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-500">
                          {app.submissionDate?.toDate ? app.submissionDate.toDate().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => ensureCategoryAccess(app) && setSelectedApp(app)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedApp(null)} />
            
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden z-10">
              
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white"><FileText size={20} /></div>
                  <div>
                    <h2 className="text-white font-bold text-base">Application Details</h2>
                    <p className="text-blue-100 text-[11px] font-medium">Ref: {selectedApp.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-white ${selectedApp.status === APPLICATION_STATUS.approved ? 'text-emerald-600 border-emerald-200' : selectedApp.status === APPLICATION_STATUS.rejected ? 'text-red-600 border-red-200' : 'text-orange-600 border-orange-200'}`}>
                    {selectedApp.status}
                  </span>
                  <button onClick={() => setSelectedApp(null)} className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"><X size={18} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Left Column: Data */}
                <div className="md:col-span-2 space-y-8">
                  {/* Personal Info */}
                  <section>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                      <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Full Name</p><p className="text-sm font-bold text-slate-800">{selectedApp.firstName} {selectedApp.middleName} {selectedApp.lastName}</p></div>
                      <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Date of Birth</p><p className="text-sm font-semibold text-slate-700">{selectedApp.dob}</p></div>
                      <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Gender</p><p className="text-sm font-semibold text-slate-700">{selectedApp.gender}</p></div>
                      <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Civil Status</p><p className="text-sm font-semibold text-slate-700">{selectedApp.civilStatus}</p></div>
                      <div className="col-span-2"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Address</p><p className="text-sm font-semibold text-slate-700">{selectedApp.address}</p></div>
                    </div>
                  </section>

                  {/* Contact Info */}
                  <section>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Contact Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Contact Number</p><p className="text-sm font-semibold text-slate-700">{selectedApp.contactNumber}</p></div>
                      <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Email</p><p className="text-sm font-semibold text-slate-700">{selectedApp.email || 'N/A'}</p></div>
                    </div>
                  </section>

                  {/* Category Details (Condensed) */}
                  <section>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Category Details: {getCategoryName(selectedApp.category)}</h3>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {selectedApp.category === 'pwd' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div><p className="text-[10px] text-slate-400 font-bold mb-1">Disability Type</p><p className="text-xs font-semibold text-slate-700">{selectedApp.disabilityType}</p></div>
                          <div><p className="text-[10px] text-slate-400 font-bold mb-1">Cause</p><p className="text-xs font-semibold text-slate-700">{selectedApp.disabilityCause}</p></div>
                        </div>
                      )}
                      {selectedApp.category === 'senior' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div><p className="text-[10px] text-slate-400 font-bold mb-1">Pension Source</p><p className="text-xs font-semibold text-slate-700">{selectedApp.pensionSource || 'None'}</p></div>
                          <div><p className="text-[10px] text-slate-400 font-bold mb-1">Living Arrangement</p><p className="text-xs font-semibold text-slate-700">{selectedApp.livingArrangement}</p></div>
                        </div>
                      )}
                      {selectedApp.category === 'women' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div><p className="text-[10px] text-slate-400 font-bold mb-1">Solo Parent</p><p className="text-xs font-semibold text-slate-700">{selectedApp.isSoloParent}</p></div>
                          <div><p className="text-[10px] text-slate-400 font-bold mb-1">Children</p><p className="text-xs font-semibold text-slate-700">{selectedApp.numberOfChildren}</p></div>
                        </div>
                      )}
                      {selectedApp.category === 'youth' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div><p className="text-[10px] text-slate-400 font-bold mb-1">Attainment</p><p className="text-xs font-semibold text-slate-700">{selectedApp.educationalAttainment}</p></div>
                          <div><p className="text-[10px] text-slate-400 font-bold mb-1">Out of School</p><p className="text-xs font-semibold text-slate-700">{selectedApp.outOfSchool}</p></div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Right Column: Documents & Actions */}
                <div className="space-y-6 border-l border-slate-100 pl-6">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Uploaded Documents</h3>
                  
                  {selectedApp.documents && Object.entries(selectedApp.documents).map(([key, url]) => (
                    <div key={key} className="mb-4">
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="block group relative rounded-xl overflow-hidden border border-slate-200">
                          <img src={url} alt={key} loading="lazy" decoding="async" className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-bold px-3 py-1 bg-black/50 rounded-lg">View Full Size</span>
                          </div>
                        </a>
                      ) : (
                        <div className="h-20 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400">No Document</div>
                      )}
                    </div>
                  ))}

                  {/* Actions */}
                  {selectedApp.status === APPLICATION_STATUS.approved && selectedApp.approvedBy && (
                    <div className="mt-8 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Approval Record</p>
                      <p className="text-sm font-semibold text-emerald-800">Approved by {selectedApp.approvedBy.name || selectedApp.approvedBy.email}</p>
                      {selectedApp.approvedAt?.toDate && (
                        <p className="text-xs text-emerald-600 mt-1">
                          {selectedApp.approvedAt.toDate().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {selectedApp.memberIdNumber && (
                        <p className="text-xs text-emerald-700 mt-1 font-medium">Member ID: {selectedApp.memberIdNumber}</p>
                      )}
                    </div>
                  )}

                  {selectedApp.status === APPLICATION_STATUS.pending && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                      {!showRejectInput ? (
                        <div className="space-y-3">
                          <button 
                            onClick={handleApprove} disabled={actionLoading || !selectedApp.email?.trim()}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            Approve & Create Account
                          </button>
                          {!selectedApp.email?.trim() && (
                            <p className="text-[10px] text-orange-600 font-semibold text-center">Email address required to approve and send credentials.</p>
                          )}
                          <button 
                            onClick={() => setShowRejectInput(true)} disabled={actionLoading}
                            className="w-full bg-white hover:bg-red-50 text-red-500 border border-red-200 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                            <XCircle size={16} /> Reject Application
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 bg-red-50 p-4 rounded-xl border border-red-100">
                          <p className="text-xs font-bold text-red-700 uppercase">Reason for Rejection</p>
                          <textarea 
                            value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="State the reason (this will be emailed)..."
                            className="w-full rounded-lg border-red-200 p-2 text-sm focus:ring-red-500 outline-none resize-none" rows="3"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setShowRejectInput(false)} className="flex-1 py-2 bg-white text-slate-600 font-bold rounded-lg border border-slate-200 text-xs">Cancel</button>
                            <button onClick={handleReject} disabled={actionLoading || !rejectionReason.trim()} className="flex-1 py-2 bg-red-500 text-white font-bold rounded-lg text-xs disabled:opacity-50">Confirm Reject</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedApp.status === APPLICATION_STATUS.rejected && selectedApp.rejectionReason && (
                    <div className="mt-8 bg-red-50 p-4 rounded-xl border border-red-100">
                      <p className="text-[10px] font-bold text-red-700 uppercase mb-1">Rejection Reason</p>
                      <p className="text-sm font-semibold text-red-800">{selectedApp.rejectionReason}</p>
                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default ApplicationManagement;
