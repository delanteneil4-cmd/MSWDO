import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { COLLECTIONS, isBeneficiaryUser } from './utils/dataModel';

const routeAllows = (profile, allowed) => {
  const role = String(profile?.role || '').toLowerCase();
  const isSuper = role === 'super' || role === 'super admin' || role.includes('super');
  const isStaff = isSuper || role === 'admin' || role === 'staff';
  const isApplicant = isBeneficiaryUser(profile);

  if (allowed === 'staff') return isStaff;
  if (allowed === 'super') return isSuper;
  if (allowed === 'applicant') return isApplicant;
  return Boolean(profile);
};

const RouteFallback = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
    <div className="h-10 w-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
  </div>
);

const ProtectedRoute = ({ allowed, children }) => {
  const [state, setState] = useState({ loading: true, allowed: false, redirect: '/', message: '' });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ loading: false, allowed: false, redirect: '/', message: '' });
        return;
      }

      try {
        const snap = await getDoc(doc(db, COLLECTIONS.users, user.uid));
        const profile = snap.exists() ? snap.data() : null;

        if (!profile) {
          setState({ loading: false, allowed: false, redirect: '/', message: '' });
          return;
        }

        if (profile.requiresPasswordChange) {
          setState({
            loading: false,
            allowed: false,
            redirect: '/',
            message: 'Please sign in and change your temporary password before accessing the portal.',
          });
          return;
        }

        const hasAccess = routeAllows(profile, allowed);
        const fallback = routeAllows(profile, 'applicant') ? '/applicant-dashboard' : '/dashboard';
        setState({ loading: false, allowed: hasAccess, redirect: hasAccess ? '' : fallback, message: '' });
      } catch (error) {
        console.error('Route guard error:', error);
        setState({ loading: false, allowed: false, redirect: '/', message: '' });
      }
    });

    return () => unsub();
  }, [allowed]);

  if (state.loading) return <RouteFallback />;
  if (!state.allowed) return <Navigate to={state.redirect} replace state={state.message ? { message: state.message } : undefined} />;
  return children;
};

export default ProtectedRoute;
