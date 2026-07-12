import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'; 

const Login = lazy(() => import('./Login'));
const Dashboard = lazy(() => import('./Dashboard'));
const ApplicantDashboard = lazy(() => import('./ApplicantDashboard'));
const UserManagement = lazy(() => import('./UserManagement'));
const Apply = lazy(() => import('./Apply'));
const ApplicationManagement = lazy(() => import('./ApplicationManagement'));
const Membership = lazy(() => import('./Membership'));
const Benefits = lazy(() => import('./Benefits'));
const ProtectedRoute = lazy(() => import('./ProtectedRoute'));
const Termination = lazy(() => import('./Termination'));
const AuditMonitoring = lazy(() => import('./AuditMonitoring'));
const Announcements = lazy(() => import('./Announcements'));

const RouteFallback = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
    <div className="h-10 w-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/dashboard" element={<ProtectedRoute allowed="staff"><Dashboard /></ProtectedRoute>} />
          <Route path="/applicant-dashboard" element={<ProtectedRoute allowed="applicant"><ApplicantDashboard /></ProtectedRoute>} />
          <Route path="/user-management" element={<ProtectedRoute allowed="super"><UserManagement /></ProtectedRoute>} />
          <Route path="/applications" element={<ProtectedRoute allowed="staff"><ApplicationManagement /></ProtectedRoute>} />
          <Route path="/membership" element={<ProtectedRoute allowed="staff"><Membership /></ProtectedRoute>} />
          <Route path="/benefits" element={<ProtectedRoute allowed="staff"><Benefits /></ProtectedRoute>} />
          <Route path="/termination" element={<ProtectedRoute allowed="staff"><Termination /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute allowed="staff"><AuditMonitoring /></ProtectedRoute>} />
          <Route path="/announcements" element={<ProtectedRoute allowed="staff"><Announcements /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
