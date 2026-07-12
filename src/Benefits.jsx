import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart2, Bell, ChevronDown, ClipboardList, Database,
  Eye, Fingerprint, Gift, Loader2, LogOut, Menu, Plus, Search, Settings,
  UserPlus, Users, X, UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { auth, db } from './firebase';
import {
  CATEGORY_OPTIONS,
  CLAIM_STATUS,
  COLLECTIONS,
  BENEFIT_STATUS,
  MEMBER_STATUS,
  OPEN_CLAIM_STATUSES,
  getCategoryDisplayName,
  getMemberCategory,
  isBeneficiaryUser,
} from './utils/dataModel';
import { getAssignedCategories, getStaffInfo, logActivity } from './utils/approvalWorkflow';

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
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const emptyBenefitForm = {
  name: '',
  category: '',
  description: '',
  defaultAmount: '',
  requirements: '',
};

const emptyClaimForm = {
  memberId: '',
  benefitId: '',
  amount: '',
  releaseDate: '',
  releaseMethod: 'Cash',
  referenceNumber: '',
  remarks: '',
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  });

const formatDate = (ts) => {
  if (!ts) return '-';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const timestampMillis = (claim) =>
  claim.processedAt?.toMillis?.()
  || claim.claimedAt?.toMillis?.()
  || claim.cancelledAt?.toMillis?.()
  || claim.rejectedAt?.toMillis?.()
  || claim.requestedAt?.toMillis?.()
  || 0;

const getFullName = (member) =>
  [member?.firstName, member?.middleInitial ? `${member.middleInitial}.` : '', member?.lastName]
    .filter(Boolean)
    .join(' ') || member?.email || 'Unnamed Member';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
    status === BENEFIT_STATUS.active || status === CLAIM_STATUS.processed || status === CLAIM_STATUS.approved
      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
      : status === CLAIM_STATUS.cancelled || status === CLAIM_STATUS.rejected
      ? 'bg-red-50 text-red-600 border-red-200'
      : status === CLAIM_STATUS.underReview
      ? 'bg-blue-50 text-blue-600 border-blue-200'
      : status === CLAIM_STATUS.pending
      ? 'bg-orange-50 text-orange-600 border-orange-200'
      : 'bg-slate-50 text-slate-500 border-slate-200'
  }`}>
    {status}
  </span>
);

const Benefits = () => {
  const navigate = useNavigate();
  const [benefits, setBenefits] = useState([]);
  const [claims, setClaims] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [benefitForm, setBenefitForm] = useState(emptyBenefitForm);
  const [claimForm, setClaimForm] = useState(emptyClaimForm);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [userName, setUserName] = useState('Admin');
  const [userInitials, setUserInitials] = useState('A');
  const [userRole, setUserRole] = useState('Admin');
  const [assignedCategories, setAssignedCategories] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/');
        return;
      }

      try {
        const snap = await getDoc(doc(db, COLLECTIONS.users, user.uid));
        if (!snap.exists()) {
          navigate('/');
          return;
        }

        const profile = snap.data();
        const categories = getAssignedCategories(profile);
        setAssignedCategories(categories);
        setUserName([profile.firstName, profile.lastName].filter(Boolean).join(' ') || user.email);
        setUserInitials(((profile.firstName?.[0] || '') + (profile.lastName?.[0] || '')).toUpperCase() || 'A');
        setUserRole(profile.role || 'Admin');
        await fetchData(categories);
      } catch (error) {
        console.error('Error loading benefits module:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [navigate]);

  const fetchData = async (categories = assignedCategories) => {
    setLoading(true);
    try {
      if (categories.length === 0) {
        setBenefits([]);
        setClaims([]);
        setMembers([]);
        return;
      }

      const benefitsQuery = query(
        collection(db, COLLECTIONS.benefits),
        where('category', 'in', categories)
      );
      const claimsQuery = query(
        collection(db, COLLECTIONS.claims),
        where('category', 'in', categories)
      );
      const usersQuery = collection(db, COLLECTIONS.users);

      const [benefitSnap, claimSnap, userSnap] = await Promise.all([
        getDocs(benefitsQuery),
        getDocs(claimsQuery),
        getDocs(usersQuery),
      ]);

      setBenefits(
        benefitSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      );
      setClaims(
        claimSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => timestampMillis(b) - timestampMillis(a))
      );
      setMembers(
        userSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((member) =>
            isBeneficiaryUser(member)
            && (member.status || MEMBER_STATUS.active) === MEMBER_STATUS.active
            && categories.includes(getMemberCategory(member))
          )
      );
    } catch (error) {
      console.error('Error fetching benefits data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBenefits = benefits.filter((benefit) => {
    const matchesSearch =
      benefit.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      benefit.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || benefit.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const visibleClaims = claims.filter((claim) => {
    const matchesSearch =
      claim.memberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.memberIdNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.benefitName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || claim.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const activeBenefits = benefits.filter((benefit) => benefit.status === BENEFIT_STATUS.active);
  const processedClaims = claims.filter((claim) => claim.status === CLAIM_STATUS.processed);
  const pendingClaims = claims.filter((claim) => claim.status === CLAIM_STATUS.pending);
  const openClaims = claims.filter((claim) => OPEN_CLAIM_STATUSES.includes(claim.status));
  const totalClaimed = processedClaims.reduce((sum, claim) => sum + Number(claim.amount || 0), 0);

  const claimBenefitOptions = useMemo(() => {
    const member = members.find((item) => item.id === claimForm.memberId);
    const category = getMemberCategory(member);
    return activeBenefits.filter((benefit) => benefit.category === category);
  }, [activeBenefits, claimForm.memberId, members]);

  useEffect(() => {
    const selectedBenefit = benefits.find((benefit) => benefit.id === claimForm.benefitId);
    if (selectedBenefit && !claimForm.amount) {
      setClaimForm((form) => ({ ...form, amount: String(selectedBenefit.defaultAmount || '') }));
    }
  }, [benefits, claimForm.amount, claimForm.benefitId]);

  const handleBenefitChange = (field, value) => {
    setBenefitForm((form) => ({ ...form, [field]: value }));
  };

  const handleClaimChange = (field, value) => {
    setClaimForm((form) => {
      const next = { ...form, [field]: value };
      if (field === 'memberId') {
        next.benefitId = '';
        next.amount = '';
      }
      if (field === 'benefitId') {
        const benefit = benefits.find((item) => item.id === value);
        next.amount = String(benefit?.defaultAmount || '');
      }
      return next;
    });
  };

  const handleCreateBenefit = async (event) => {
    event.preventDefault();
    if (!benefitForm.name.trim() || !benefitForm.category) return;

    setActionLoading(true);
    try {
      const staff = await getStaffInfo(db, auth.currentUser);
      await addDoc(collection(db, COLLECTIONS.benefits), {
        name: benefitForm.name.trim(),
        category: benefitForm.category,
        description: benefitForm.description.trim(),
        defaultAmount: Number(benefitForm.defaultAmount || 0),
        requirements: benefitForm.requirements.trim(),
        status: BENEFIT_STATUS.active,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: staff,
      });

      await logActivity(db, {
        action: 'Benefit Program Created',
        type: 'benefit_created',
        category: getCategoryDisplayName(benefitForm.category),
        categoryId: benefitForm.category,
        adminEmail: staff.email,
        adminUid: staff.uid,
        adminName: staff.name,
        details: benefitForm.name.trim(),
      });

      setBenefitForm(emptyBenefitForm);
      await fetchData();
    } catch (error) {
      console.error('Create benefit error:', error);
      alert('Failed to create benefit program.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBenefit = async (benefit) => {
    const nextStatus = benefit.status === BENEFIT_STATUS.active ? BENEFIT_STATUS.inactive : BENEFIT_STATUS.active;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.benefits, benefit.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      setBenefits((items) => items.map((item) => item.id === benefit.id ? { ...item, status: nextStatus } : item));
    } catch (error) {
      console.error('Toggle benefit error:', error);
      alert('Failed to update benefit status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateClaim = async (event) => {
    event.preventDefault();
    const member = members.find((item) => item.id === claimForm.memberId);
    const benefit = benefits.find((item) => item.id === claimForm.benefitId);
    if (!member || !benefit || !claimForm.amount) return;

    const amount = Number(claimForm.amount);
    if (Number.isNaN(amount) || amount < 0) {
      alert('Enter a valid claim amount.');
      return;
    }

    setActionLoading(true);
    try {
      const staff = await getStaffInfo(db, auth.currentUser);
      const memberName = getFullName(member);
      const category = getMemberCategory(member);
      const existingOpenClaim = claims.find((claim) =>
        claim.memberId === member.id
        && claim.benefitId === benefit.id
        && OPEN_CLAIM_STATUSES.includes(claim.status)
      );

      if (existingOpenClaim) {
        alert(`This member already has an open ${existingOpenClaim.status.toLowerCase()} request for this benefit.`);
        setActionLoading(false);
        return;
      }

      await addDoc(collection(db, COLLECTIONS.claims), {
        memberId: member.id,
        memberName,
        memberIdNumber: member.idNumber || '',
        benefitId: benefit.id,
        benefitName: benefit.name,
        category,
        amount,
        status: CLAIM_STATUS.processed,
        claimedAt: serverTimestamp(),
        processedAt: serverTimestamp(),
        requestedAt: serverTimestamp(),
        releaseDate: claimForm.releaseDate || '',
        releaseMethod: claimForm.releaseMethod,
        referenceNumber: claimForm.referenceNumber.trim(),
        processedBy: staff,
        remarks: claimForm.remarks.trim(),
        timeline: [
          {
            status: CLAIM_STATUS.processed,
            at: new Date().toISOString(),
            by: staff.name || staff.email,
            role: 'Staff',
            note: claimForm.remarks.trim() || 'Claim recorded and released by staff.',
          },
        ],
      });

      await logActivity(db, {
        action: 'Benefit Claim Processed',
        type: 'benefit_claim_processed',
        memberId: member.id,
        applicantName: memberName,
        category: getCategoryDisplayName(category),
        categoryId: category,
        adminEmail: staff.email,
        adminUid: staff.uid,
        adminName: staff.name,
        details: `${benefit.name} - ${formatCurrency(amount)}`,
      });

      setClaimForm(emptyClaimForm);
      await fetchData();
    } catch (error) {
      console.error('Create claim error:', error);
      alert('Failed to process benefit claim.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessPendingClaim = async (claim) => {
    const amountInput = window.prompt('Actual amount/value released:', String(claim.amount || ''));
    if (amountInput === null) return;
    const amount = Number(amountInput);
    if (Number.isNaN(amount) || amount < 0) {
      alert('Enter a valid amount.');
      return;
    }
    const releaseMethod = window.prompt('Release method:', claim.releaseMethod || 'Cash');
    if (!releaseMethod?.trim()) return;
    const referenceNumber = window.prompt('Reference / voucher number:', claim.referenceNumber || '');
    if (referenceNumber === null) return;
    const remarks = window.prompt('Processing remarks:', claim.remarks || '');
    if (remarks === null) return;

    setActionLoading(true);
    try {
      const staff = await getStaffInfo(db, auth.currentUser);
      const timeline = [
        ...(Array.isArray(claim.timeline) ? claim.timeline : []),
        {
          status: CLAIM_STATUS.processed,
          at: new Date().toISOString(),
          by: staff.name || staff.email,
          role: 'Staff',
          note: remarks.trim() || 'Benefit claim processed and released.',
        },
      ];
      await updateDoc(doc(db, COLLECTIONS.claims, claim.id), {
        status: CLAIM_STATUS.processed,
        amount,
        claimedAt: serverTimestamp(),
        processedAt: serverTimestamp(),
        releaseMethod: releaseMethod.trim(),
        referenceNumber: referenceNumber.trim(),
        remarks: remarks.trim(),
        processedBy: staff,
        timeline,
      });

      await logActivity(db, {
        action: 'Pending Benefit Request Approved',
        type: 'benefit_request_approved',
        memberId: claim.memberId,
        applicantName: claim.memberName,
        category: getCategoryDisplayName(claim.category),
        categoryId: claim.category,
        adminEmail: staff.email,
        adminUid: staff.uid,
        adminName: staff.name,
        details: `${claim.benefitName} - ${formatCurrency(amount)}`,
      });

      await fetchData();
    } catch (error) {
      console.error('Process pending claim error:', error);
      alert('Failed to process pending request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewClaim = async (claim) => {
    setActionLoading(true);
    try {
      const staff = await getStaffInfo(db, auth.currentUser);
      const timeline = [
        ...(Array.isArray(claim.timeline) ? claim.timeline : []),
        {
          status: CLAIM_STATUS.underReview,
          at: new Date().toISOString(),
          by: staff.name || staff.email,
          role: 'Staff',
          note: 'Request marked under review by staff.',
        },
      ];
      await updateDoc(doc(db, COLLECTIONS.claims, claim.id), {
        status: CLAIM_STATUS.underReview,
        reviewedAt: serverTimestamp(),
        reviewedBy: staff,
        timeline,
      });
      await fetchData();
    } catch (error) {
      console.error('Review claim error:', error);
      alert('Failed to mark claim under review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClaim = async (claim) => {
    const reason = window.prompt('Reason for rejecting this claim:');
    if (!reason?.trim()) return;

    setActionLoading(true);
    try {
      const staff = await getStaffInfo(db, auth.currentUser);
      const timeline = [
        ...(Array.isArray(claim.timeline) ? claim.timeline : []),
        {
          status: CLAIM_STATUS.rejected,
          at: new Date().toISOString(),
          by: staff.name || staff.email,
          role: 'Staff',
          note: reason.trim(),
        },
      ];
      await updateDoc(doc(db, COLLECTIONS.claims, claim.id), {
        status: CLAIM_STATUS.rejected,
        rejectionReason: reason.trim(),
        rejectedAt: serverTimestamp(),
        rejectedBy: staff,
        timeline,
      });

      await logActivity(db, {
        action: 'Benefit Request Rejected',
        type: 'benefit_request_rejected',
        memberId: claim.memberId,
        applicantName: claim.memberName,
        category: getCategoryDisplayName(claim.category),
        categoryId: claim.category,
        adminEmail: staff.email,
        adminUid: staff.uid,
        adminName: staff.name,
        details: `${claim.benefitName} - ${reason.trim()}`,
      });

      await fetchData();
    } catch (error) {
      console.error('Reject claim error:', error);
      alert('Failed to reject claim.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelClaim = async (claim) => {
    const reason = window.prompt('Reason for cancelling this claim:');
    if (!reason?.trim()) return;

    setActionLoading(true);
    try {
      const staff = await getStaffInfo(db, auth.currentUser);
      const timeline = [
        ...(Array.isArray(claim.timeline) ? claim.timeline : []),
        {
          status: CLAIM_STATUS.cancelled,
          at: new Date().toISOString(),
          by: staff.name || staff.email,
          role: 'Staff',
          note: reason.trim(),
        },
      ];
      await updateDoc(doc(db, COLLECTIONS.claims, claim.id), {
        status: CLAIM_STATUS.cancelled,
        cancelReason: reason.trim(),
        cancelledAt: serverTimestamp(),
        cancelledBy: { ...staff, role: 'Staff' },
        timeline,
      });

      await logActivity(db, {
        action: 'Benefit Claim Cancelled',
        type: 'benefit_claim_cancelled',
        memberId: claim.memberId,
        applicantName: claim.memberName,
        category: getCategoryDisplayName(claim.category),
        categoryId: claim.category,
        adminEmail: staff.email,
        adminUid: staff.uid,
        adminName: staff.name,
        details: `${claim.benefitName} - ${reason.trim()}`,
      });

      await fetchData();
    } catch (error) {
      console.error('Cancel claim error:', error);
      alert('Failed to cancel claim.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintVoucher = (claim) => {
    const voucherWindow = window.open('', '_blank', 'width=900,height=700');
    if (!voucherWindow) {
      alert('Please allow pop-ups to print the claim voucher.');
      return;
    }

    const processedBy = claim.processedBy?.name || claim.processedBy?.email || '';
    const voucherHtml = `
      <!doctype html>
      <html>
        <head>
          <title>MSWDO Claim Voucher</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 40px; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
            .header h1 { font-size: 20px; margin: 0; }
            .header p { font-size: 12px; margin: 4px 0 0; }
            .title { text-align: center; font-size: 16px; font-weight: 700; margin-bottom: 24px; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; }
            .field { border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
            .label { display: block; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px; }
            .value { font-size: 14px; font-weight: 700; }
            .remarks { margin-top: 24px; border: 1px solid #cbd5e1; padding: 14px; min-height: 70px; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; margin-top: 72px; }
            .signature { border-top: 1px solid #0f172a; text-align: center; padding-top: 8px; font-size: 12px; font-weight: 700; }
            @media print { button { display: none; } body { margin: 24px; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()" style="float:right;padding:8px 14px;font-weight:700;">Print / Save PDF</button>
          <div class="header">
            <h1>Municipal Social Welfare and Development Office</h1>
            <p>Benefit Claim Voucher</p>
          </div>
          <div class="title">${escapeHtml(claim.benefitName || 'Benefit Claim')}</div>
          <div class="grid">
            <div class="field"><span class="label">Member Name</span><span class="value">${escapeHtml(claim.memberName || '-')}</span></div>
            <div class="field"><span class="label">Member ID</span><span class="value">${escapeHtml(claim.memberIdNumber || '-')}</span></div>
            <div class="field"><span class="label">Category</span><span class="value">${escapeHtml(getCategoryDisplayName(claim.category))}</span></div>
            <div class="field"><span class="label">Status</span><span class="value">${escapeHtml(claim.status || '-')}</span></div>
            <div class="field"><span class="label">Amount / Value</span><span class="value">${formatCurrency(claim.amount)}</span></div>
            <div class="field"><span class="label">Release Method</span><span class="value">${escapeHtml(claim.releaseMethod || '-')}</span></div>
            <div class="field"><span class="label">Reference / Voucher No.</span><span class="value">${escapeHtml(claim.referenceNumber || '-')}</span></div>
            <div class="field"><span class="label">Processed Date</span><span class="value">${formatDate(claim.processedAt || claim.claimedAt)}</span></div>
          </div>
          <div class="remarks">
            <span class="label">Remarks</span>
            <div>${escapeHtml(claim.remarks || claim.rejectionReason || claim.cancelReason || '-')}</div>
          </div>
          <div class="signatures">
            <div class="signature">Beneficiary Signature</div>
            <div class="signature">${escapeHtml(processedBy || 'Authorized MSWDO Staff')}</div>
          </div>
        </body>
      </html>
    `;

    voucherWindow.document.open();
    voucherWindow.document.write(voucherHtml);
    voucherWindow.document.close();
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

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
            <NavItem icon={Users} label="Membership" onClick={() => navigate('/membership')} />
            <NavItem icon={ClipboardList} label="Applications" onClick={() => navigate('/applications')} />
            <NavItem icon={Gift} label="Benefits" active />
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
          <button onClick={handleLogout} className="flex items-center space-x-3 text-slate-400 hover:text-red-400 transition-colors w-full">
            <LogOut size={18} />
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 z-10 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Benefits & Claims</h2>
            <p className="text-xs text-slate-500 font-medium">Manage benefit programs and process member disbursements</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-2xl font-extrabold text-blue-600">{benefits.length}</p>
              <p className="text-xs font-bold text-slate-600 mt-1">Benefit Programs</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-2xl font-extrabold text-emerald-600">{activeBenefits.length}</p>
              <p className="text-xs font-bold text-slate-600 mt-1">Active Programs</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-2xl font-extrabold text-indigo-600">{processedClaims.length}</p>
              <p className="text-xs font-bold text-slate-600 mt-1">Claims Processed</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-2xl font-extrabold text-orange-600">{openClaims.length}</p>
              <p className="text-xs font-bold text-slate-600 mt-1">Open Requests</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-6">
            <p className="text-xl font-extrabold text-slate-800">{formatCurrency(totalClaimed)}</p>
            <p className="text-xs font-bold text-slate-600 mt-1">Total Processed Claim Value</p>
          </div>

          {pendingClaims.length > 0 && (
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-orange-900">Pending applicant benefit requests</p>
                <p className="text-xs text-orange-700 font-medium mt-0.5">{pendingClaims.length} request{pendingClaims.length === 1 ? '' : 's'} waiting for staff processing.</p>
              </div>
              <button onClick={() => setSearchTerm('')} className="text-xs font-bold text-orange-700 hover:underline">Review below</button>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            <form onSubmit={handleCreateBenefit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <Plus size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Create Benefit Program</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Program Name</label>
                  <input required value={benefitForm.name} onChange={(e) => handleBenefitChange('name', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
                    <select required value={benefitForm.category} onChange={(e) => handleBenefitChange('category', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-blue-400">
                      <option value="">Select</option>
                      {CATEGORY_OPTIONS
                        .filter(({ id }) => assignedCategories.includes(id))
                        .map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Default Amount</label>
                    <input type="number" min="0" step="0.01" value={benefitForm.defaultAmount} onChange={(e) => handleBenefitChange('defaultAmount', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-blue-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description</label>
                  <textarea rows="2" value={benefitForm.description} onChange={(e) => handleBenefitChange('description', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-blue-400 resize-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Requirements</label>
                  <textarea rows="2" value={benefitForm.requirements} onChange={(e) => handleBenefitChange('requirements', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-blue-400 resize-none" />
                </div>
                <button disabled={actionLoading} className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                  {actionLoading ? 'Saving...' : 'Save Program'}
                </button>
              </div>
            </form>

            <form onSubmit={handleCreateClaim} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 xl:col-span-2">
              <div className="flex items-center gap-2 mb-5">
                <Gift size={16} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800">Process Benefit Claim</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Member</label>
                  <select required value={claimForm.memberId} onChange={(e) => handleClaimChange('memberId', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-emerald-400">
                    <option value="">Select active member</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {getFullName(member)} - {member.idNumber || getCategoryDisplayName(getMemberCategory(member))}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Benefit</label>
                  <select required value={claimForm.benefitId} onChange={(e) => handleClaimChange('benefitId', e.target.value)}
                    disabled={!claimForm.memberId}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-emerald-400 disabled:opacity-60">
                    <option value="">Select benefit</option>
                    {claimBenefitOptions.map((benefit) => (
                      <option key={benefit.id} value={benefit.id}>{benefit.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Claim Amount / Value</label>
                  <input required type="number" min="0" step="0.01" value={claimForm.amount} onChange={(e) => handleClaimChange('amount', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Release Method</label>
                  <select value={claimForm.releaseMethod} onChange={(e) => handleClaimChange('releaseMethod', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-emerald-400">
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Goods / In-kind">Goods / In-kind</option>
                    <option value="Service Referral">Service Referral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Release Date</label>
                  <input type="date" value={claimForm.releaseDate} onChange={(e) => handleClaimChange('releaseDate', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reference / Voucher No.</label>
                  <input value={claimForm.referenceNumber} onChange={(e) => handleClaimChange('referenceNumber', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Remarks</label>
                  <input value={claimForm.remarks} onChange={(e) => handleClaimChange('remarks', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-emerald-400" />
                </div>
              </div>
              <button disabled={actionLoading} className="mt-5 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                {actionLoading ? 'Processing...' : 'Record Claim'}
              </button>
            </form>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search benefit, member, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-medium"
              />
            </div>
            <div className="relative">
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-blue-400 transition-all">
                <option value="All">All Categories</option>
                {CATEGORY_OPTIONS
                  .filter(({ id }) => assignedCategories.includes(id))
                  .map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Benefit Programs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Program</th>
                      <th className="px-5 py-3 font-bold">Category</th>
                      <th className="px-5 py-3 font-bold">Amount</th>
                      <th className="px-5 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan="5" className="py-10 text-center text-slate-400"><Loader2 className="inline animate-spin mr-2" size={18} /> Loading...</td></tr>
                    ) : filteredBenefits.length === 0 ? (
                      <tr><td colSpan="5" className="py-10 text-center text-slate-500 text-sm font-medium">No benefit programs found.</td></tr>
                    ) : filteredBenefits.map((benefit) => (
                      <tr key={benefit.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-slate-800">{benefit.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium line-clamp-1">{benefit.description || benefit.requirements || '-'}</p>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-600">{getCategoryDisplayName(benefit.category)}</td>
                        <td className="px-5 py-4 text-xs font-bold text-slate-700">{formatCurrency(benefit.defaultAmount)}</td>
                        <td className="px-5 py-4"><StatusBadge status={benefit.status} /></td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => handleToggleBenefit(benefit)} className="text-xs font-bold text-blue-600 hover:underline">
                            {benefit.status === BENEFIT_STATUS.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Recent Claims</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Member</th>
                      <th className="px-5 py-3 font-bold">Benefit</th>
                      <th className="px-5 py-3 font-bold">Amount</th>
                      <th className="px-5 py-3 font-bold">Date</th>
                      <th className="px-5 py-3 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan="5" className="py-10 text-center text-slate-400"><Loader2 className="inline animate-spin mr-2" size={18} /> Loading...</td></tr>
                    ) : visibleClaims.length === 0 ? (
                      <tr><td colSpan="5" className="py-10 text-center text-slate-500 text-sm font-medium">No claims recorded yet.</td></tr>
                    ) : visibleClaims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-slate-800">{claim.memberName}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{claim.memberIdNumber || getCategoryDisplayName(claim.category)}</p>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-600">{claim.benefitName}</td>
                        <td className="px-5 py-4 text-xs font-bold text-slate-700">{formatCurrency(claim.amount)}</td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-semibold text-slate-500">{formatDate(claim.claimedAt || claim.requestedAt)}</p>
                          <StatusBadge status={claim.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            {claim.status === CLAIM_STATUS.pending && (
                              <button onClick={() => handleReviewClaim(claim)} disabled={actionLoading} className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold hover:bg-blue-100 disabled:opacity-60">
                                Review
                              </button>
                            )}
                            {OPEN_CLAIM_STATUSES.includes(claim.status) && (
                              <button onClick={() => handleProcessPendingClaim(claim)} disabled={actionLoading} className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold hover:bg-emerald-100 disabled:opacity-60">
                                Process
                              </button>
                            )}
                            {OPEN_CLAIM_STATUSES.includes(claim.status) && (
                              <button onClick={() => handleRejectClaim(claim)} disabled={actionLoading} className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 text-[10px] font-bold hover:bg-red-100 disabled:opacity-60">
                                Reject
                              </button>
                            )}
                            {claim.status !== CLAIM_STATUS.cancelled && claim.status !== CLAIM_STATUS.processed && claim.status !== CLAIM_STATUS.rejected && (
                              <button onClick={() => handleCancelClaim(claim)} disabled={actionLoading} className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold hover:bg-slate-200 disabled:opacity-60">
                                Cancel
                              </button>
                            )}
                            <button onClick={() => setSelectedClaim(claim)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg inline-flex">
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedClaim(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden z-10">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-base">Claim Details</h2>
                  <p className="text-emerald-100 text-[11px] font-medium">{selectedClaim.benefitName}</p>
                </div>
                <button onClick={() => setSelectedClaim(null)} className="text-white hover:bg-white/20 p-1.5 rounded-lg"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Member</p><p className="font-bold text-slate-800">{selectedClaim.memberName}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Member ID</p><p className="font-semibold text-slate-700">{selectedClaim.memberIdNumber || '-'}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Category</p><p className="font-semibold text-slate-700">{getCategoryDisplayName(selectedClaim.category)}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Amount</p><p className="font-bold text-slate-800">{formatCurrency(selectedClaim.amount)}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Status</p><StatusBadge status={selectedClaim.status} /></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Claimed</p><p className="font-semibold text-slate-700">{formatDate(selectedClaim.claimedAt)}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Release Method</p><p className="font-semibold text-slate-700">{selectedClaim.releaseMethod || '-'}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Reference No.</p><p className="font-semibold text-slate-700">{selectedClaim.referenceNumber || '-'}</p></div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Remarks / Reason</p>
                  <p className="text-sm font-medium text-slate-700">{selectedClaim.rejectionReason || selectedClaim.cancelReason || selectedClaim.remarks || 'No remarks recorded.'}</p>
                </div>
                {selectedClaim.documents?.supportingDocument && (
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Supporting Document</p>
                    <a
                      href={selectedClaim.documents.supportingDocument}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-blue-600 hover:underline"
                    >
                      Open uploaded document
                    </a>
                  </div>
                )}
                {Array.isArray(selectedClaim.timeline) && selectedClaim.timeline.length > 0 && (
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                    <p className="text-[10px] text-blue-600 font-bold uppercase mb-3">Claim Timeline</p>
                    <div className="space-y-2">
                      {selectedClaim.timeline.map((item, index) => (
                        <div key={`claim-modal-timeline-${index}`} className="border-l-2 border-blue-200 pl-3">
                          <p className="text-xs font-bold text-slate-800">{item.status} <span className="font-medium text-slate-400">- {formatDate(item.at)}</span></p>
                          <p className="text-[11px] text-slate-500 font-medium">{item.note || 'No note.'}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{item.by || item.role || 'System'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Processed By</p>
                  <p className="text-sm font-semibold text-emerald-800">{selectedClaim.processedBy?.name || selectedClaim.processedBy?.email || selectedClaim.reviewedBy?.name || selectedClaim.rejectedBy?.name || selectedClaim.cancelledBy?.name || 'Not processed yet'}</p>
                </div>
                <button
                  onClick={() => handlePrintVoucher(selectedClaim)}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Print Claim Voucher
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Benefits;
