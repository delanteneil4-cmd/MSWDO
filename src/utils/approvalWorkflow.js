import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import {
  APPLICATION_STATUS,
  CATEGORY_IDS,
  CATEGORY_OPTIONS,
  COLLECTIONS,
  MEMBER_CATEGORIES,
  MEMBER_STATUS,
  MEMBER_TYPE,
  POSITION_CATEGORY_MAP,
  USER_ROLES,
  getCategoryDisplayName,
} from './dataModel';

export {
  APPLICATION_STATUS,
  CATEGORY_IDS,
  CATEGORY_OPTIONS,
  COLLECTIONS,
  MEMBER_CATEGORIES,
  MEMBER_STATUS,
  MEMBER_TYPE,
  USER_ROLES,
  getCategoryDisplayName,
};

export const EMAILJS_CONFIG = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_qvc8npd',
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_51cxyho',
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'q9RN6Ns1_Gi5N21B1',
};

export const isSuperAdminUser = (userData = {}) => {
  const role = String(userData.role || '').toLowerCase();
  return role === 'super' || role === 'super admin' || role.includes('super');
};

export const getAssignedCategories = (userData = {}) => {
  if (isSuperAdminUser(userData)) return CATEGORY_IDS;

  if (Array.isArray(userData.assignedCategories)) {
    return userData.assignedCategories.filter((category) => CATEGORY_IDS.includes(category));
  }

  const categoryFromPosition = POSITION_CATEGORY_MAP[userData.position];
  return categoryFromPosition ? [categoryFromPosition] : [];
};

export const canAccessCategory = (userData = {}, category) =>
  getAssignedCategories(userData).includes(category);

export const generateSecurePassword = (length = 12) => {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => charset[byte % charset.length]).join('');
};

export const normalizeEmail = (email) => email?.trim().toLowerCase() || '';

export const checkExistingMemberByEmail = async (db, email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return { exists: false };

  const userQuery = query(collection(db, COLLECTIONS.users), where('email', '==', normalized));
  const userDocs = await getDocs(userQuery);

  if (userDocs.empty) return { exists: false };

  const docSnap = userDocs.docs[0];
  const data = docSnap.data();
  return {
    exists: true,
    id: docSnap.id,
    data,
    isActiveMember: data.role === USER_ROLES.applicant && data.status === MEMBER_STATUS.active,
  };
};

export const buildMemberRecord = ({ application, categoryName, email, idNumber }) => ({
  firstName: application.firstName || '',
  lastName: application.lastName || '',
  middleInitial: application.middleName ? application.middleName.charAt(0) : '',
  idNumber: idNumber || `MSWDO-${Math.floor(10000 + Math.random() * 90000)}`,
  contactNumber: application.contactNumber || '',
  email: normalizeEmail(email),
  birthDate: application.dob || '',
  role: USER_ROLES.applicant,
  memberType: MEMBER_TYPE.beneficiary,
  memberCategory: application.category,
  memberCategoryName: categoryName,
  position: categoryName,
  status: MEMBER_STATUS.active,
  governmentIdUrl: application.documents?.validId || application.documents?.votersId || '',
  selfieUrl: application.documents?.selfie || '',
  documents: application.documents || {},
  requiresPasswordChange: true,
  civilStatus: application.civilStatus || '',
  address: application.address || '',
  gender: application.gender || '',
  occupation: application.occupation || '',
  applicationId: application.id,
  applicationData: { ...application, id: application.id },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

export const sendApprovalEmail = async ({ email, applicantName, categoryName, tempPassword, loginUrl }) => {
  await emailjs.send(
    EMAILJS_CONFIG.serviceId,
    EMAILJS_CONFIG.templateId,
    {
      to_email: email,
      to_name: applicantName,
      status: APPLICATION_STATUS.approved,
      category: categoryName,
      temp_password: tempPassword,
      login_url: loginUrl,
      message:
        `Congratulations! Your application for the ${categoryName} program has been approved. ` +
        `Your member account has been created. Please log in using the credentials below and change your password immediately on first login.`,
    },
    { publicKey: EMAILJS_CONFIG.publicKey }
  );
};

export const logActivity = async (db, entry) => {
  await addDoc(collection(db, COLLECTIONS.activityLogs), {
    ...entry,
    timestamp: serverTimestamp(),
  });
};

export const logApprovalActivities = async (db, {
  applicantName,
  applicationId,
  memberId,
  categoryName,
  categoryId,
  staff,
  emailSent,
  accountCreated,
  idNumber,
}) => {
  const base = {
    applicationId,
    memberId,
    applicantName,
    adminEmail: staff.email,
    adminUid: staff.uid,
    adminName: staff.name,
  };

  const entries = [
    {
      ...base,
      action: 'Application Approved',
      type: 'application_approved',
      category: categoryName,
      details: `Application approved and member record created (Ref: ${idNumber})`,
    },
    {
      ...base,
      action: 'Member Category Assigned',
      type: 'category_assigned',
      category: categoryName,
      categoryId,
      details: `Assigned to ${categoryName} program`,
    },
  ];

  if (accountCreated) {
    entries.push({
      ...base,
      action: 'Member Account Created',
      type: 'account_created',
      category: categoryName,
      details: `Firebase account created for ${applicantName}`,
    });
  }

  if (emailSent) {
    entries.push({
      ...base,
      action: 'Approval Email Sent',
      type: 'email_sent',
      category: categoryName,
      details: `Login credentials emailed to ${staff.applicantEmail}`,
    });
  }

  await Promise.all(entries.map((entry) => logActivity(db, entry)));
};

export const getStaffInfo = async (db, authUser) => {
  if (!authUser) {
    return { uid: '', email: 'System Admin', name: 'System Admin' };
  }
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.users, authUser.uid));
    const staffData = snap.exists() ? snap.data() : {};
    const name =
      [staffData.firstName, staffData.lastName].filter(Boolean).join(' ') ||
      authUser.displayName ||
      authUser.email;
    return { uid: authUser.uid, email: authUser.email, name };
  } catch {
    return { uid: authUser.uid, email: authUser.email, name: authUser.email };
  }
};
