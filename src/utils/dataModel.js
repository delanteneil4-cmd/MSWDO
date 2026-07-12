export const COLLECTIONS = {
  applications: 'applications',
  users: 'users',
  activityLogs: 'activity_logs',
  benefits: 'benefits',
  announcements: 'announcements',
  notifications: 'notifications',
  claims: 'claims',
  reports: 'reports',
  terminations: 'terminations',
};

export const APPLICATION_STATUS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const MEMBER_STATUS = {
  active: 'Active',
  inactive: 'Inactive',
  terminated: 'Terminated',
};

export const BENEFIT_STATUS = {
  active: 'Active',
  inactive: 'Inactive',
};

export const CLAIM_STATUS = {
  pending: 'Pending',
  underReview: 'Under Review',
  approved: 'Approved',
  processed: 'Processed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const OPEN_CLAIM_STATUSES = [
  CLAIM_STATUS.pending,
  CLAIM_STATUS.underReview,
  CLAIM_STATUS.approved,
];

export const USER_ROLES = {
  superAdmin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
  applicant: 'applicant',
};

export const MEMBER_TYPE = {
  beneficiary: 'beneficiary',
};

export const MEMBER_CATEGORIES = {
  senior: 'Senior Citizen',
  pwd: 'Person with Disability (PWD)',
  women: 'Women',
  youth: 'Youth',
};

export const CATEGORY_IDS = Object.keys(MEMBER_CATEGORIES);

export const CATEGORY_OPTIONS = CATEGORY_IDS.map((id) => ({
  id,
  label: MEMBER_CATEGORIES[id],
}));

export const POSITION_CATEGORY_MAP = {
  'Senior Citizen': 'senior',
  PWD: 'pwd',
  "Women's": 'women',
  Women: 'women',
  "Women's Welfare": 'women',
  Youth: 'youth',
  'Youth Welfare': 'youth',
};

export const getCategoryDisplayName = (categoryId) =>
  MEMBER_CATEGORIES[categoryId] || categoryId || 'General';

export const isBeneficiaryUser = (userData = {}) =>
  String(userData.role || '').toLowerCase() === USER_ROLES.applicant
  || userData.memberType === MEMBER_TYPE.beneficiary;

export const getMemberCategory = (member = {}) =>
  member.memberCategory || member.applicationData?.category || '';
