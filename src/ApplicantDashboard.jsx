import React, { useEffect, useState } from 'react';
import {
  Home, FileText, UploadCloud, Gift, Bell, CheckCircle2,
  LogOut, CheckCircle, ShieldCheck, Clock
} from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCategoryDisplayName, sendWorkflowEmailAndTrack } from './utils/approvalWorkflow';
import { useCloudinaryUpload } from './hooks/useCloudinaryUpload';
import {
  APPLICATION_STATUS,
  BENEFIT_STATUS,
  CLAIM_STATUS,
  COLLECTIONS,
  MEMBER_STATUS,
  OPEN_CLAIM_STATUSES,
  isBeneficiaryUser,
  getMemberCategory,
} from './utils/dataModel';

const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button type="button" onClick={onClick} disabled={!onClick} title={!onClick ? `${label} is not available yet` : undefined} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl mb-1 transition-all ${
    active ? 'bg-teal-400/10 text-teal-300 border-l-2 border-teal-300' : onClick ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200' : 'text-slate-600/70 cursor-not-allowed'
  }`}>
    <Icon size={18} className={active ? 'text-teal-300' : 'text-slate-500'} />
    <span className="text-sm font-semibold">{label}</span>
  </button>
);

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}-50 text-${color}-600 mb-4`}>
       <Icon size={20} />
    </div>
    <div>
       <h3 className="text-xl font-black text-slate-800">{value}</h3>
       <p className="text-[11px] font-bold text-slate-400 mt-0.5">{title}</p>
    </div>
  </div>
);

const formatDate = (value) => {
  if (!value) return 'Pending';
  const date = value.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Pending';
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getInitials = (member, fallbackEmail) => {
  const initials = `${member?.firstName?.[0] || ''}${member?.lastName?.[0] || ''}`.toUpperCase();
  return initials || fallbackEmail?.[0]?.toUpperCase() || 'A';
};

const getRequiredDocumentCount = (category) => {
  if (category === 'pwd') return 4;
  return 3;
};

const REQUIRED_DOCUMENT_KEYS = {
  senior: ['votersId', 'birthCert', 'selfie'],
  pwd: ['validId', 'barangayClearance', 'selfie', 'medicalCert'],
  women: ['validId', 'barangayClearance', 'selfie'],
  youth: ['validId', 'barangayClearance', 'selfie'],
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  });

const claimStatusClass = (status) => {
  if (status === CLAIM_STATUS.processed || status === CLAIM_STATUS.approved) {
    return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  }
  if (status === CLAIM_STATUS.rejected || status === CLAIM_STATUS.cancelled) {
    return 'bg-red-50 text-red-600 border-red-100';
  }
  if (status === CLAIM_STATUS.underReview) {
    return 'bg-blue-50 text-blue-600 border-blue-100';
  }
  return 'bg-orange-50 text-orange-600 border-orange-100';
};

const ApplicantDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');
  const [member, setMember] = useState(null);
  const [application, setApplication] = useState(null);
  const [benefits, setBenefits] = useState([]);
  const [claims, setClaims] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeView, setActiveView] = useState('dashboard');
  const [actionLoading, setActionLoading] = useState(false);
  const [claimDocuments, setClaimDocuments] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancelDialog, setCancelDialog] = useState({ open: false, claim: null, reason: '' });
  const { uploadImage } = useCloudinaryUpload();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/');
        return;
      }

      setEmail(user.email || '');

      try {
        const userSnap = await getDoc(doc(db, COLLECTIONS.users, user.uid));
        if (!userSnap.exists()) {
          await signOut(auth);
          navigate('/');
          return;
        }

        const userData = { id: userSnap.id, ...userSnap.data() };
        if (!isBeneficiaryUser(userData)) {
          await signOut(auth);
          navigate('/');
          return;
        }

        if (userData.requiresPasswordChange) {
          await signOut(auth);
          navigate('/', { state: { message: 'Please change your temporary password before accessing the portal.' } });
          return;
        }

        setMember(userData);

        if (userData.applicationId) {
          try {
            const appSnap = await getDoc(doc(db, COLLECTIONS.applications, userData.applicationId));
            setApplication(appSnap.exists() ? { id: appSnap.id, ...appSnap.data() } : userData.applicationData || null);
          } catch {
            setApplication(userData.applicationData || null);
          }
        } else {
          setApplication(userData.applicationData || null);
        }
        await fetchApplicantBenefits(userData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [navigate]);

  const fetchApplicantBenefits = async (userData = member) => {
    const category = getMemberCategory(userData) || userData?.applicationData?.category;
    if (!category) return;

    try {
      const benefitsQuery = query(
        collection(db, COLLECTIONS.benefits),
        where('category', '==', category),
        where('status', '==', BENEFIT_STATUS.active)
      );
      const claimsQuery = query(
        collection(db, COLLECTIONS.claims),
        where('memberId', '==', userData.id)
      );
      const announcementsQuery = query(
        collection(db, COLLECTIONS.announcements),
        where('published', '==', true),
        where('targetCategories', 'array-contains', category)
      );
      const notificationsQuery = query(
        collection(db, COLLECTIONS.notifications),
        where('memberId', '==', userData.id)
      );
      const [benefitResult, claimResult, announcementResult, notificationResult] = await Promise.allSettled([
        getDocs(benefitsQuery),
        getDocs(claimsQuery),
        getDocs(announcementsQuery),
        getDocs(notificationsQuery),
      ]);
      const benefitSnap = benefitResult.status === 'fulfilled' ? benefitResult.value : null;
      const claimSnap = claimResult.status === 'fulfilled' ? claimResult.value : null;
      const announcementSnap = announcementResult.status === 'fulfilled' ? announcementResult.value : null;
      const notificationSnap = notificationResult.status === 'fulfilled' ? notificationResult.value : null;
      if (benefitResult.status === 'rejected') console.error('Error loading applicant benefits:', benefitResult.reason);
      if (claimResult.status === 'rejected') console.error('Error loading applicant claims:', claimResult.reason);
      if (announcementResult.status === 'rejected') console.error('Error loading announcements:', announcementResult.reason);
      if (notificationResult.status === 'rejected') console.error('Error loading notifications:', notificationResult.reason);
      setBenefits(
        (benefitSnap?.docs || [])
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      );
      setClaims(
        (claimSnap?.docs || [])
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const bTime = b.claimedAt?.toMillis?.() || b.requestedAt?.toMillis?.() || 0;
            const aTime = a.claimedAt?.toMillis?.() || a.requestedAt?.toMillis?.() || 0;
            return bTime - aTime;
          })
      );
      setAnnouncements(
        (announcementSnap?.docs || [])
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((item) => !item.expiresAt || new Date(item.expiresAt).getTime() >= Date.now())
          .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      );
      setNotifications((notificationSnap?.docs || []).map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
    } catch (error) {
      console.error('Error loading applicant benefits:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleOpenNotifications = async () => {
    setActiveView('notifications');
    const unread = notifications.filter((item) => !item.read);
    if (!unread.length) return;
    await Promise.all(unread.map((item) => updateDoc(doc(db, COLLECTIONS.notifications, item.id), { read: true, readAt: serverTimestamp() })));
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
  };

  const handleApplyBenefit = async (benefit) => {
    if (!member || !benefit) return;

    const existingOpenClaim = claims.find((claim) =>
      claim.benefitId === benefit.id && OPEN_CLAIM_STATUSES.includes(claim.status)
    );
    if (existingOpenClaim) {
      alert(`You already have an open ${existingOpenClaim.status.toLowerCase()} request for this benefit.`);
      return;
    }

    setActionLoading(true);
    try {
      const memberName = [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email || 'Applicant';
      const category = getMemberCategory(member) || benefit.category;
      const supportingFile = claimDocuments[benefit.id];
      const supportingDocumentUrl = supportingFile
        ? await uploadImage(supportingFile, 'mswdo/claim-documents', setUploadProgress)
        : '';
      const claimRef = await addDoc(collection(db, COLLECTIONS.claims), {
        memberId: member.id,
        memberName,
        memberIdNumber: member.idNumber || '',
        benefitId: benefit.id,
        benefitName: benefit.name,
        category,
        amount: Number(benefit.defaultAmount || 0),
        status: CLAIM_STATUS.pending,
        requestedAt: serverTimestamp(),
        claimedAt: null,
        requestedBy: {
          uid: member.id,
          email: member.email || email,
          name: memberName,
        },
        documents: {
          supportingDocument: supportingDocumentUrl,
        },
        remarks: 'Applicant submitted request from portal.',
        timeline: [
          {
            status: CLAIM_STATUS.pending,
            at: new Date().toISOString(),
            by: memberName,
            role: 'Applicant',
            note: 'Benefit request submitted from applicant portal.',
          },
        ],
      });
      void sendWorkflowEmailAndTrack({
        db,
        collectionName: COLLECTIONS.claims,
        recordId: claimRef.id,
        email: member.email || email,
        applicantName: memberName,
        status: CLAIM_STATUS.pending,
        categoryName,
        benefitName: benefit.name,
        amount: formatCurrency(benefit.defaultAmount || 0),
        subject: 'Your MSWDO benefit claim was submitted',
        message: `Your ${benefit.name} benefit request was submitted and is now pending staff review.`,
      }).catch((error) => console.error('Submitted claim email error:', error));
      setClaimDocuments((items) => ({ ...items, [benefit.id]: null }));
      setUploadProgress(0);
      await fetchApplicantBenefits(member);
      alert('Benefit request submitted.');
    } catch (error) {
      console.error('Apply benefit error:', error);
      alert('Failed to submit benefit request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelClaim = (claim) => {
    if (!member || !claim || claim.status !== CLAIM_STATUS.pending) return;
    setCancelDialog({ open: true, claim, reason: '' });
  };

  const confirmCancelClaim = async () => {
    const { claim, reason } = cancelDialog;
    if (!claim || !reason.trim()) return;

    setActionLoading(true);
    try {
      const memberName = [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email || 'Applicant';
      const timeline = [
        ...(Array.isArray(claim.timeline) ? claim.timeline : []),
        {
          status: CLAIM_STATUS.cancelled,
          at: new Date().toISOString(),
          by: memberName,
          role: 'Applicant',
          note: reason.trim(),
        },
      ];

      await updateDoc(doc(db, COLLECTIONS.claims, claim.id), {
        status: CLAIM_STATUS.cancelled,
        cancelReason: reason.trim(),
        cancelledAt: serverTimestamp(),
        cancelledBy: {
          uid: member.id,
          email: member.email || email,
          name: memberName,
          role: 'Applicant',
        },
        timeline,
      });

      await fetchApplicantBenefits(member);
      alert('Benefit request cancelled.');
    } catch (error) {
      console.error('Cancel claim error:', error);
      alert('Failed to cancel benefit request.');
    } finally {
      setActionLoading(false);
      setCancelDialog({ open: false, claim: null, reason: '' });
    }
  };

  const profile = member || {};
  const sourceApplication = application || profile.applicationData || {};
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || email || 'Applicant';
  const initials = getInitials(profile, email);
  const category = getMemberCategory(profile) || sourceApplication.category;
  const categoryName = profile.memberCategoryName || getCategoryDisplayName(category);
  const status = profile.status || sourceApplication.status || APPLICATION_STATUS.pending;
  const idNumber = profile.idNumber || sourceApplication.applicationRef || sourceApplication.id || 'Pending';
  const documents = profile.documents || sourceApplication.documents || {};
  const documentVerification = profile.documentVerification || sourceApplication.documentVerification || {};
  const requiredDocumentKeys = REQUIRED_DOCUMENT_KEYS[category] || [];
  const documentKeys = [...new Set([...requiredDocumentKeys, ...Object.keys(documents)])];
  const submittedDocuments = Object.values(documents).filter(Boolean).length;
  const requiredDocuments = Math.max(Object.keys(documents).length || 0, getRequiredDocumentCount(category));
  const address = profile.address || sourceApplication.address || 'Address not recorded';
  const isActive = status === MEMBER_STATUS.active;
  const processedClaims = claims.filter((claim) => claim.status === CLAIM_STATUS.processed);
  const pendingClaims = claims.filter((claim) => claim.status === CLAIM_STATUS.pending);

  const approved = sourceApplication.status === APPLICATION_STATUS.approved || Boolean(profile.approvedAt) || isActive;
  const progressSteps = [
    {
      title: 'Application Submitted',
      desc: sourceApplication.applicationRef
        ? `Reference ${sourceApplication.applicationRef}`
        : 'Application form received by MSWDO',
      date: formatDate(sourceApplication.submissionDate),
      done: Boolean(sourceApplication.submissionDate || sourceApplication.id),
    },
    {
      title: 'Application Review',
      desc: approved ? 'Application approved by MSWDO staff' : 'Awaiting MSWDO review',
      date: formatDate(sourceApplication.approvedAt || profile.approvedAt),
      done: approved,
    },
    {
      title: 'Member Account Created',
      desc: profile.id ? 'Applicant portal account is active' : 'Account creation pending approval',
      date: formatDate(profile.createdAt || profile.approvedAt),
      done: Boolean(profile.id),
    },
    {
      title: 'Membership Status',
      desc: isActive ? 'Membership is active and in good standing' : `Current status: ${status}`,
      date: isActive ? formatDate(profile.updatedAt || profile.approvedAt) : 'Pending',
      done: isActive,
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <div className="w-64 bg-[#102a43] flex flex-col shadow-xl z-20 shrink-0">
        <div className="p-6 flex items-center space-x-3 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold tracking-wide text-sm">Applicant Portal</h1>
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest mt-0.5">MSWDO Digital System</p>
          </div>
        </div>

        <div className="p-4">
          <div className="bg-[#121e42] rounded-xl p-4 border border-blue-900/40">
             <h2 className="text-sm font-bold text-white mb-0.5">{loading ? 'Loading...' : fullName}</h2>
             <p className="text-[10px] text-slate-300 font-medium mb-3 opacity-80">{idNumber} - {categoryName}</p>
             <div className={`inline-flex items-center space-x-1.5 px-2 py-1 rounded-full border ${
               isActive ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-orange-500/20 border-orange-500/30'
             }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-orange-400'}`}></div>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-emerald-400' : 'text-orange-300'}`}>{status}</span>
             </div>
          </div>
        </div>

        <div className="px-6 py-2 mt-2">
          <div className="space-y-0.5">
            <NavItem icon={Home} label="My Dashboard" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
            <NavItem icon={FileText} label="My Application" active={activeView === 'application'} onClick={() => setActiveView('application')} />
            <NavItem icon={UploadCloud} label="Documents" active={activeView === 'documents'} onClick={() => setActiveView('documents')} />
            <NavItem icon={Gift} label="Apply Benefits" active={activeView === 'benefits'} onClick={() => setActiveView('benefits')} />
            <NavItem icon={Bell} label="Announcements" active={activeView === 'announcements'} onClick={() => setActiveView('announcements')} />
            <NavItem icon={Bell} label="Notifications" active={activeView === 'notifications'} onClick={handleOpenNotifications} />
          </div>
        </div>

        <div className="mt-auto p-6">
          <button onClick={handleLogout} className="flex items-center space-x-3 text-slate-400 hover:text-red-400 transition-colors w-full">
            <LogOut size={18} />
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </div>
        {cancelDialog.open && (
          <div className="fixed inset-0 z-50 bg-slate-950/45 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="cancel-claim-title">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6">
              <h3 id="cancel-claim-title" className="text-lg font-bold text-slate-800">Cancel benefit request</h3>
              <p className="text-sm text-slate-500 mt-1">Enter a reason for cancelling {cancelDialog.claim?.benefitName || 'this request'}.</p>
              <textarea autoFocus rows="4" value={cancelDialog.reason} onChange={(event) => setCancelDialog((value) => ({ ...value, reason: event.target.value }))} placeholder="Reason is required" className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-400 resize-none" />
              <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setCancelDialog({ open: false, claim: null, reason: '' })} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Keep request</button><button type="button" onClick={confirmCancelClaim} disabled={!cancelDialog.reason.trim() || actionLoading} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50">{actionLoading ? 'Cancelling...' : 'Confirm cancellation'}</button></div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 z-10 shrink-0">
          <div>
             <h2 className="text-lg font-bold text-slate-800">My Dashboard</h2>
             <p className="text-xs text-slate-500 font-medium tracking-wide mt-0.5">MSWDO Applicant Portal - {categoryName}</p>
          </div>

          <div className="flex items-center space-x-6">
            <button onClick={handleOpenNotifications} className="relative text-slate-400 hover:text-slate-600">
              <Bell size={20} />
              {notifications.filter((item) => !item.read).length > 0 && <span className="absolute -right-2 -top-2 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">{notifications.filter((item) => !item.read).length > 9 ? '9+' : notifications.filter((item) => !item.read).length}</span>}
            </button>

            <div className="flex items-center space-x-3 pl-6 border-l border-slate-100">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center shadow-sm">
                {initials}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-bold text-slate-800">{fullName}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{address}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="w-full bg-[#1e3a8a] rounded-2xl p-8 shadow-lg shadow-blue-900/10 mb-6 relative overflow-hidden flex flex-col justify-center">
             <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none">
                <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white scale-[2.5] translate-x-12 translate-y-12"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
             </div>

             <p className="text-blue-100/80 font-semibold mb-1">Welcome back,</p>
             <h2 className="text-3xl font-extrabold text-white mb-2">{loading ? 'Loading your record...' : fullName}</h2>
             <p className="text-sm text-blue-200 mt-1">{categoryName} - {idNumber}</p>

             <div className="mt-8 flex items-center space-x-2 text-emerald-400 bg-emerald-400/10 w-max px-4 py-2 rounded-lg border border-emerald-400/20">
               <CheckCircle2 size={16} className="shrink-0" />
               <span className="text-[13px] font-medium text-emerald-50">Your membership status is <strong>{status}</strong>.</span>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard title="Application Status" value={status} icon={CheckCircle2} color="emerald" />
            <StatCard title="Documents Submitted" value={`${submittedDocuments}/${requiredDocuments}`} icon={FileText} color="blue" />
            <StatCard title="Benefits Claimed" value={processedClaims.length} icon={Gift} color="purple" />
            <StatCard title="Pending Requests" value={pendingClaims.length} icon={Bell} color="orange" />
          </div>

          {(activeView === 'announcements' || activeView === 'notifications') ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100"><h3 className="text-base font-bold text-slate-800">{activeView === 'notifications' ? 'Notifications' : 'Announcements'}</h3><p className="text-xs text-slate-400 mt-1">Updates for {categoryName}</p></div>
              <div className="divide-y divide-slate-50">
                {activeView === 'notifications' ? (notifications.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">You have no notifications.</div> : notifications.map((item) => <article key={item.id} className={`p-6 ${item.read ? '' : 'bg-amber-50/30'}`}><div className="flex items-start justify-between gap-4"><div><h4 className="text-sm font-bold text-slate-800">{item.title}</h4><p className="text-[10px] text-slate-400 mt-1">{formatDate(item.createdAt)}</p></div><Bell size={16} className={item.read ? 'text-slate-300 shrink-0' : 'text-amber-500 shrink-0'} /></div><p className="mt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-line">{item.body}</p></article>)) : (announcements.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">There are no announcements for your category right now.</div> : announcements.map((item) => <article key={item.id} className="p-6 hover:bg-slate-50/60 transition-colors"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h4 className="text-sm font-bold text-slate-800">{item.title}</h4>{item.pinned && <span className="text-[9px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">Pinned</span>}</div><p className="text-[10px] text-slate-400 mt-1">{formatDate(item.createdAt)}{item.expiresAt ? ` · Until ${formatDate(item.expiresAt)}` : ''}</p></div><Bell size={16} className="text-teal-500 shrink-0" /></div><p className="mt-4 text-sm text-slate-600 leading-relaxed whitespace-pre-line">{item.body}</p></article>))}
              </div>
            </div>
          ) : activeView === 'documents' ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100"><h3 className="text-base font-bold text-slate-800">My Documents</h3><p className="text-xs text-slate-400 mt-1">Review status for your submitted requirements</p></div>
              <div className="divide-y divide-slate-50">{documentKeys.map((key) => { const url = documents[key]; const review = documentVerification[key] || {}; const reviewStatus = url ? (review.status || 'Pending') : 'Missing'; return <div key={key} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="text-sm font-bold text-slate-800">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase()).trim()}</p>{review.reason && <p className="mt-1 text-xs text-red-600">Correction needed: {review.reason}</p>}</div><div className="flex items-center gap-3">{url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:underline">View document</a>}<span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${reviewStatus === 'Verified' ? 'bg-emerald-50 text-emerald-700' : reviewStatus === 'Rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{reviewStatus}</span></div></div>; })}</div>
            </div>
          ) : activeView === 'benefits' ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Available Benefits</h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">{categoryName}</p>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">{benefits.length} Active</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {loading ? (
                    <div className="p-8 text-sm text-slate-400">Loading benefits...</div>
                  ) : benefits.length === 0 ? (
                    <div className="p-8 text-sm text-slate-500 font-medium">No active benefit programs are available for your category yet.</div>
                  ) : benefits.map((benefit) => {
                    const openClaim = claims.find((claim) => claim.benefitId === benefit.id && OPEN_CLAIM_STATUSES.includes(claim.status));
                    return (
                      <div key={benefit.id} className="p-6 hover:bg-slate-50/60 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div>
                            <h4 className="text-base font-bold text-slate-800">{benefit.name}</h4>
                            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{benefit.description || 'No description recorded.'}</p>
                            {benefit.requirements && (
                              <p className="text-[11px] text-slate-400 font-semibold mt-3">Requirements: {benefit.requirements}</p>
                            )}
                            <div className="mt-4">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Supporting Document</label>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={Boolean(openClaim) || !isActive || actionLoading}
                                onChange={(event) => setClaimDocuments((items) => ({ ...items, [benefit.id]: event.target.files?.[0] || null }))}
                                className="block w-full text-[11px] font-medium text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[11px] file:font-bold file:text-slate-600 hover:file:bg-slate-200 disabled:opacity-60"
                              />
                              {actionLoading && claimDocuments[benefit.id] && uploadProgress > 0 && (
                                <p className="mt-1 text-[10px] font-bold text-blue-600">Uploading {uploadProgress}%</p>
                              )}
                            </div>
                          </div>
                          <div className="md:text-right shrink-0">
                            <p className="text-sm font-extrabold text-slate-800">{formatCurrency(benefit.defaultAmount)}</p>
                            <button
                              onClick={() => handleApplyBenefit(benefit)}
                              disabled={actionLoading || Boolean(openClaim) || !isActive}
                              className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {!isActive ? 'Unavailable' : openClaim ? openClaim.status : actionLoading ? 'Submitting...' : 'Apply'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">My Benefit Requests</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {claims.length === 0 ? (
                    <div className="p-6 text-sm text-slate-500 font-medium">No benefit requests yet.</div>
                  ) : claims.map((claim) => (
                    <div key={claim.id} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{claim.benefitName}</p>
                          <p className="text-[11px] text-slate-400 font-semibold mt-1">
                            {formatCurrency(claim.amount)} - {formatDate(claim.claimedAt || claim.requestedAt)}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${claimStatusClass(claim.status)}`}>
                          {claim.status}
                        </span>
                      </div>
                      {(claim.rejectionReason || claim.cancelReason || claim.remarks) && (
                        <p className="mt-3 text-[11px] font-medium text-slate-500 leading-relaxed">
                          {claim.rejectionReason || claim.cancelReason || claim.remarks}
                        </p>
                      )}
                      {Array.isArray(claim.timeline) && claim.timeline.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {claim.timeline.slice(-3).map((item, index) => (
                            <div key={`${claim.id}-timeline-${index}`} className="text-[10px] text-slate-400 font-semibold">
                              {item.status} - {formatDate(item.at)}{item.note ? ` - ${item.note}` : ''}
                            </div>
                          ))}
                        </div>
                      )}
                      {claim.status === CLAIM_STATUS.pending && (
                        <button
                          onClick={() => handleCancelClaim(claim)}
                          disabled={actionLoading}
                          className="mt-3 rounded-lg bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-100 disabled:opacity-60"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-8">Application Progress</h3>

              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-100 before:to-transparent">
                 {progressSteps.map((step, i) => {
                   const Icon = step.done ? CheckCircle : Clock;
                   return (
                     <div key={i} className="relative flex items-center justify-between group">
                        <div className="flex items-center space-x-4 z-10 w-full">
                           <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center shrink-0 shadow-[0_0_0_4px_#fff] ${step.done ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                              <Icon size={14} />
                           </div>
                           <div>
                              <h4 className="text-[13px] font-bold text-slate-800">{step.title}</h4>
                              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{step.desc}</p>
                           </div>
                        </div>
                        <div className="whitespace-nowrap text-[11px] font-bold text-slate-400 ml-4 hidden md:block">
                           {step.date}
                        </div>
                     </div>
                   );
                 })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-50 mb-4">
                <h3 className="text-sm font-bold text-slate-800">My Application</h3>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                   <h4 className="text-[13px] font-bold text-slate-800 mb-3 leading-snug">Record Summary</h4>
                   <div className="grid grid-cols-2 gap-4 text-xs">
                     <div>
                       <p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Reference</p>
                       <p className="font-semibold text-slate-700">{sourceApplication.applicationRef || idNumber}</p>
                     </div>
                     <div>
                       <p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Submitted</p>
                       <p className="font-semibold text-slate-700">{formatDate(sourceApplication.submissionDate)}</p>
                     </div>
                     <div>
                       <p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Category</p>
                       <p className="font-semibold text-slate-700">{categoryName}</p>
                     </div>
                     <div>
                       <p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Email</p>
                       <p className="font-semibold text-slate-700 break-all">{profile.email || email}</p>
                     </div>
                   </div>
                </div>
              </div>
            </div>

          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicantDashboard;
