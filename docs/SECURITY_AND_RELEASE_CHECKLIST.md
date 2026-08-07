# Security and Release Checklist

## Before production release

1. Run `npm.cmd run lint` and `npm.cmd run build`.
2. Deploy rules and indexes with `firebase deploy --only firestore` from an authenticated Firebase CLI session.
3. Test these access paths with separate accounts:
   - Super Admin can manage all categories.
   - Staff can only read and change records in assigned categories.
   - Applicants can only see active benefits in their own category.
   - Applicants can only create pending claims for themselves.
   - Inactive and terminated profiles cannot access the portal.
4. Confirm an already-open inactive account is signed out after the profile status changes.
5. Verify a staff account cannot write a different category by changing the browser request payload.

## Legacy status migration

The rules currently allow records with no `status` field so existing data remains readable. Before removing that compatibility fallback, add `status: "Active"` to legacy active records in `users`, `benefits`, and `announcements`. Use an Admin SDK script or a controlled Firebase console batch process. Do not run a client-side migration with an ordinary staff account.

After the migration is verified, change `activeRecord` in `firestore.rules` to require `data.status == 'Active'` and redeploy the rules.

## Account deactivation

The portal blocks inactive profiles in Firestore and live route monitoring signs out open sessions. Firebase Authentication accounts are not disabled by a browser client. For a stronger guarantee, add a trusted Cloud Function using the Firebase Admin SDK that disables the Auth user whenever a staff profile changes to `Inactive` or `Terminated`.

## Manual workflow smoke test

Register an applicant, approve the application, sign in as the applicant, submit a claim, review and process it as staff, print the voucher, terminate the beneficiary, and confirm the applicant session is redirected out of the portal. Repeat once with a staff member assigned to a different category to verify the denial path.
