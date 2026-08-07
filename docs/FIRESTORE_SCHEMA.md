# MSWDO Firestore Schema

This document records the current data contracts used by the MSWDO portal. Field names should stay stable because the approval flow copies application data into member records and multiple dashboards read the same records.

## Shared Enums

Source: `src/utils/dataModel.js`

### Collections

| Key | Firestore collection |
| --- | --- |
| `applications` | `applications` |
| `users` | `users` |
| `activityLogs` | `activity_logs` |
| `benefits` | `benefits` |
| `announcements` | `announcements` |
| `claims` | `claims` |
| `reports` | `reports` |
| `terminations` | `terminations` |

### Application Status

| Value | Meaning |
| --- | --- |
| `Pending` | Submitted by applicant, awaiting staff review |
| `Approved` | Approved by staff and migrated into a member account |
| `Rejected` | Rejected by staff with a rejection reason |

### Member Status

| Value | Meaning |
| --- | --- |
| `Active` | Beneficiary/member is active |
| `Inactive` | Account or membership is disabled |
| `Terminated` | Benefits or membership have been formally terminated |

### Benefit Status

| Value | Meaning |
| --- | --- |
| `Active` | Benefit program can be claimed/processed |
| `Inactive` | Benefit program is hidden from new processing |

### Claim Status

| Value | Meaning |
| --- | --- |
| `Processed` | Claim/disbursement was recorded by staff |
| `Pending` | Claim is prepared but not completed |
| `Under Review` | Staff has started reviewing applicant request |
| `Approved` | Claim request is approved but not yet released |
| `Rejected` | Claim request was denied with a reason |
| `Cancelled` | Claim was voided or cancelled |

### Categories

| ID | Label |
| --- | --- |
| `senior` | Senior Citizen |
| `pwd` | Person with Disability (PWD) |
| `women` | Women |
| `youth` | Youth |

## `applications/{applicationId}`

Created by public applicant registration. Reviewed by assigned staff.

Required core fields:

| Field | Type | Notes |
| --- | --- | --- |
| `applicationRef` | string | Stable applicant-facing reference, e.g. `MSWDO-2026-123456` |
| `category` | string | One of `senior`, `pwd`, `women`, `youth` |
| `status` | string | `Pending`, `Approved`, or `Rejected` |
| `submissionDate` | timestamp | Set with `serverTimestamp()` |
| `firstName` | string | Applicant first name |
| `lastName` | string | Applicant last name |
| `email` | string | Required for approval/account creation |
| `contactNumber` | string | Applicant contact number |
| `address` | string | Applicant complete address |
| `documents` | map | Upload key to Cloudinary URL |
| `documentVerification` | map | Per-document review records: `status`, `reason`, `verifiedAt`, and `verifiedBy` |

Approval fields:

| Field | Type | Notes |
| --- | --- | --- |
| `approvedAt` | timestamp | Set when approved |
| `approvedBy` | map | `{ uid, email, name }` of approving staff |
| `memberId` | string | Firebase Auth UID/member user document ID |
| `memberIdNumber` | string | MSWDO member ID |
| `migratedToMembers` | boolean | True after approval migration |

Rejection fields:

| Field | Type | Notes |
| --- | --- | --- |
| `rejectionReason` | string | Staff-entered reason |
| `rejectedAt` | timestamp | Set when rejected |

## `users/{uid}`

Stores staff, admins, super admins, and approved beneficiary accounts.

Common fields:

| Field | Type | Notes |
| --- | --- | --- |
| `email` | string | Lowercase email address |
| `role` | string | `Super Admin`, `Admin`, `Staff`, or `applicant` |
| `firstName` | string | Given name |
| `lastName` | string | Family name |
| `status` | string | Usually `Active` or `Inactive` |
| `createdAt` | timestamp | Creation timestamp |
| `updatedAt` | timestamp | Last update timestamp |
| `requiresPasswordChange` | boolean | Temporary-password gate |

Staff/admin fields:

| Field | Type | Notes |
| --- | --- | --- |
| `position` | string | Staff assignment label |
| `assignedCategories` | string[] | Categories this staff account can review |
| `idNumber` | string | Internal staff/member ID number |
| `governmentIdUrl` | string | Uploaded ID URL |
| `selfieUrl` | string | Uploaded selfie URL |

Beneficiary/member fields:

| Field | Type | Notes |
| --- | --- | --- |
| `memberType` | string | `beneficiary` |
| `memberCategory` | string | One of the category IDs |
| `memberCategoryName` | string | Human-readable category name |
| `idNumber` | string | MSWDO member ID number |
| `applicationId` | string | Source application document ID |
| `applicationData` | map | Snapshot of approved application data |
| `documents` | map | Copied application document URLs |
| `approvedAt` | timestamp | Approval timestamp, when present |
| `approvedBy` | map | Approving staff, when present |

## `activity_logs/{logId}`

Created by staff workflows. Read by staff dashboards.

| Field | Type | Notes |
| --- | --- | --- |
| `type` | string | Machine-friendly event type |
| `action` | string | Human-friendly action label |
| `details` | string | Extra event details |
| `timestamp` | timestamp | Set with `serverTimestamp()` |
| `adminUid` | string | Staff user UID |
| `adminEmail` | string | Staff email |
| `adminName` | string | Staff display name |
| `applicationId` | string | Related application, when applicable |
| `memberId` | string | Related member, when applicable |
| `applicantName` | string | Related applicant/member name |
| `category` | string | Human-readable category |
| `categoryId` | string | Category ID, when applicable |

## Planned Collections

These collections are reserved in `dataModel.js` for later phases.

## `terminations/{terminationId}`

History records for beneficiary termination and restoration actions.

| Field | Type | Notes |
| --- | --- | --- |
| `memberId` | string | Beneficiary user document ID |
| `memberName` | string | Name copied from the member record |
| `categoryId` | string | One of the category IDs |
| `status` | string | `Terminated` or `Restored` |
| `reason` | string | Staff-entered reason |
| `createdAt` | timestamp | Action timestamp |
| `createdBy` | map | Staff identity `{ uid, email, name }` |
| `previousStatus` | string | Status before the action |

## `benefits/{benefitId}`

Catalog of benefit programs.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Benefit/program name |
| `category` | string | One of the category IDs |
| `description` | string | Program description |
| `defaultAmount` | number | Suggested amount/value for claims |
| `requirements` | string | Free-text requirements |
| `status` | string | `Active` or `Inactive` |
| `createdAt` | timestamp | Set with `serverTimestamp()` |
| `createdBy` | map | `{ uid, email, name }` staff record |
| `updatedAt` | timestamp | Last update timestamp |

## `announcements/{announcementId}`

Staff-published messages shown to matching beneficiary categories.

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | Announcement heading |
| `body` | string | Message content |
| `targetCategories` | string[] | Category IDs that can view the message |
| `targetLabels` | string[] | Display labels copied at publish time |
| `published` | boolean | Whether applicants can view the message |
| `pinned` | boolean | Sorts the message ahead of other announcements |
| `expiresAt` | string | Optional expiry date |
| `createdAt` | timestamp | Creation timestamp |
| `createdBy` | map | Staff identity |
| `updatedAt` | timestamp | Last edit timestamp |

## `notifications/{notificationId}`

Reserved for future per-user notification events. Applicant reads and updates are restricted to the owning `memberId`; staff creates notification records.

## `claims/{claimId}`

Benefit claim/disbursement records.

| Field | Type | Notes |
| --- | --- | --- |
| `memberId` | string | User/member document ID |
| `memberName` | string | Display name copied from member |
| `memberIdNumber` | string | MSWDO member ID |
| `benefitId` | string | Source benefit document ID |
| `benefitName` | string | Benefit name copied at processing time |
| `category` | string | Benefit/member category |
| `amount` | number | Claimed amount/value |
| `status` | string | `Pending`, `Under Review`, `Approved`, `Processed`, `Rejected`, or `Cancelled` |
| `requestedAt` | timestamp | Set when applicant or staff creates the request |
| `requestedBy` | map | Applicant identity when submitted from applicant portal |
| `documents` | map | Optional claim-specific supporting document URLs |
| `claimedAt` | timestamp | Set when staff processes the claim |
| `processedAt` | timestamp | Set when staff completes/release the claim |
| `releaseDate` | string | Optional official release date from staff form |
| `releaseMethod` | string | Cash, Check, Bank Transfer, Goods/In-kind, or Service Referral |
| `referenceNumber` | string | Voucher, OR, or release reference number |
| `processedBy` | map | `{ uid, email, name }` staff record when processed |
| `reviewedAt` | timestamp | Set when staff marks request under review |
| `reviewedBy` | map | Staff identity that started review |
| `rejectionReason` | string | Reason visible to applicant when rejected |
| `rejectedAt` | timestamp | Set when staff rejects the claim |
| `rejectedBy` | map | Staff identity that rejected the claim |
| `cancelReason` | string | Cancellation reason visible to applicant/staff |
| `cancelledAt` | timestamp | Set when applicant or staff cancels the claim |
| `cancelledBy` | map | Identity of user who cancelled the claim |
| `remarks` | string | Staff notes |
| `timeline` | array | Status history items: `{ status, at, by, role, note }` |

Applicant flow:

1. Applicant reads active `benefits` matching their `memberCategory`.
2. Applicant creates a `claims` record with status `Pending`, `memberId` equal to their own user document ID, `requestedAt`, and an initial `timeline` entry.
3. Applicant can cancel their own `Pending` claim with a cancellation reason.
4. Staff sees open claims in the Benefits module and may mark them `Under Review`, `Processed`, `Rejected`, or `Cancelled`.
5. Staff processing sets `claimedAt`, `processedAt`, release details, `processedBy`, and appends to `timeline`.

### `announcements/{announcementId}`

Staff-created announcements shown by category.

Recommended fields: `title`, `body`, `targetCategories`, `pinned`, `published`, `createdAt`, `createdBy`, `expiresAt`.

### `reports/{reportId}`

Generated report metadata.

Recommended fields: `type`, `dateRange`, `filters`, `generatedAt`, `generatedBy`, `downloadUrl`.
