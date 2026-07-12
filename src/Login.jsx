import React, { useState } from 'react';
import { 
  Eye, EyeOff, Lock, ShieldCheck, Shield,
  Users, Mail, MapPin, Gift, FileText, ChevronRight, UserPlus,
  ChevronLeft, CheckCircle2, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import { COLLECTIONS, isBeneficiaryUser } from './utils/dataModel';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 'selection' | 'admin' | 'beneficiary'
  const [viewMode, setViewMode] = useState('selection'); 
  const [adminType, setAdminType] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(location.state?.message || '');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingUser, setPendingUser] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const formattedEmail = email.includes('@') ? email : `${email}@mswdo.gov.ph`;

      if (viewMode === 'admin') {
        const userCredential = await signInWithEmailAndPassword(auth, formattedEmail, password);
        const user = userCredential.user;
        
        // Connect to Firestore and get user document
        const userDocRef = doc(db, COLLECTIONS.users, user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const roleName = String(userData.role || '').toLowerCase();
          
          if (adminType === 'admin' && !['admin', 'staff'].includes(roleName)) {
            await auth.signOut();
            throw new Error("Access denied. Admin credentials required.");
          }
          if (adminType === 'super' && !roleName.includes('super')) {
            await auth.signOut();
            throw new Error("Access denied. Super Admin credentials required.");
          }
          if (userData.requiresPasswordChange) {
            setPendingUser({ user, userData });
            setShowPasswordChangeModal(true);
            setLoading(false);
            return;
          }
          
          setSuccessData({ email: userData.email, role: userData.role || 'Staff Member' });
          setShowSuccessModal(true);
        } else {
          // If not in 'users', fallback to 'staff' or throw error
          const adminDocRef = doc(db, 'admins', user.uid);
          const adminDocSnap = await getDoc(adminDocRef);
          
          if (adminDocSnap.exists()) {
            const adminData = adminDocSnap.data();
            const roleName = String(adminData.role || '').toLowerCase();
            
            if (adminType === 'admin' && !['admin', 'staff'].includes(roleName)) {
              await auth.signOut();
              throw new Error("Access denied. Admin credentials required.");
            }
            if (adminType === 'super' && !roleName.includes('super')) {
              await auth.signOut();
              throw new Error("Access denied. Super Admin credentials required.");
            }
            if (adminData.requiresPasswordChange) {
              setPendingUser({ user, userData: adminData });
              setShowPasswordChangeModal(true);
              setLoading(false);
              return;
            }
            
            setSuccessData({ email: adminData.email || email, role: adminData.role || 'Administrator' });
            setShowSuccessModal(true);
          } else {
            await auth.signOut();
            throw new Error("No user record found in the database.");
          }
        }
      } else {
        // Beneficiary logic — login with registered email address
        const formattedEmail = email.trim().toLowerCase();
        if (!formattedEmail.includes('@')) {
          throw new Error('Please enter your registered email address.');
        }

        const userCredential = await signInWithEmailAndPassword(auth, formattedEmail, password);
        const user = userCredential.user;
        
        const userDocRef = doc(db, COLLECTIONS.users, user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (!isBeneficiaryUser(userData)) {
            await auth.signOut();
            throw new Error("Access denied. Applicant credentials required.");
          }
          if (userData.requiresPasswordChange) {
            setPendingUser({ user, userData });
            setShowPasswordChangeModal(true);
            setLoading(false);
            return;
          }
        } else {
          // If user document doesn't exist, we might still want to deny them
          // since they don't explicitly have the applicant role.
          await auth.signOut();
          throw new Error("No user record found. Applicant credentials required.");
        }
        
        setSuccessData({ email: userCredential.user.email, role: 'Registered Applicant' });
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError('');
    setShowPassword(false);
  };

  const handleBack = () => {
    setViewMode('selection');
    resetForm();
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await updatePassword(pendingUser.user, newPassword);
      await updateDoc(doc(db, COLLECTIONS.users, pendingUser.user.uid), {
        requiresPasswordChange: false
      });
      setShowPasswordChangeModal(false);
      setSuccessData({
        email: pendingUser.user.email,
        role: isBeneficiaryUser(pendingUser.userData)
          ? 'Registered Applicant'
          : pendingUser.userData?.role || 'Staff Member',
      });
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Password change error:", err);
      setError("Failed to update password: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] font-sans">
      
      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col relative w-[45%] bg-[#102a43] overflow-hidden">
        {/* Abstract Background Elements */}
        <div 
          className="absolute inset-0 z-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(29, 78, 216, 0.4), transparent 25%), radial-gradient(circle at 85% 30%, rgba(29, 78, 216, 0.4), transparent 25%)'
          }}
        />
        <div 
          className="absolute inset-0 z-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 100%, rgba(59, 130, 246, 0.4), transparent 40%)'
          }}
        />
        <div 
          className="absolute inset-0 z-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <div className="relative z-10 flex-grow flex flex-col p-12 pr-16 justify-between">
          
          {/* Top Header */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-white/10 bg-white/5">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm leading-tight tracking-wide">MSWDO</h2>
              <p className="text-blue-400 text-[9px] uppercase font-bold tracking-widest">Municipal Social Welfare</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="mt-16 mb-auto">
            <p className="text-blue-500 font-black text-[10px] tracking-[0.2em] uppercase mb-4">
              Republic of the Philippines
            </p>
            <h1 className="text-5xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
              Digital<br/>Information<br/>Management
            </h1>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-10 font-normal">
              A unified welfare management platform serving Senior Citizens, PWDs, Youth, and Women beneficiaries across all barangays.
            </p>

            {/* Grid Stats */}
            <div className="grid grid-cols-2 gap-4 max-w-md mb-8">
              <div className="bg-[#122444] rounded-xl p-5 border border-white/5 hover:bg-[#162a4e] transition-colors">
                <Users size={18} className="text-slate-400 mb-2" />
                <h3 className="text-white font-bold text-2xl">950+</h3>
                <p className="text-slate-400 text-[11px] mt-1">Beneficiaries</p>
              </div>
              <div className="bg-[#122444] rounded-xl p-5 border border-white/5 hover:bg-[#162a4e] transition-colors">
                <MapPin size={18} className="text-slate-400 mb-2" />
                <h3 className="text-white font-bold text-2xl">24</h3>
                <p className="text-slate-400 text-[11px] mt-1">Barangays</p>
              </div>
              <div className="bg-[#122444] rounded-xl p-5 border border-white/5 hover:bg-[#162a4e] transition-colors">
                <Gift size={18} className="text-slate-400 mb-2" />
                <h3 className="text-white font-bold text-2xl">₱3.8M+</h3>
                <p className="text-slate-400 text-[11px] mt-1">Benefits Paid</p>
              </div>
              <div className="bg-[#122444] rounded-xl p-5 border border-white/5 hover:bg-[#162a4e] transition-colors">
                <FileText size={18} className="text-slate-400 mb-2" />
                <h3 className="text-white font-bold text-2xl">64</h3>
                <p className="text-slate-400 text-[11px] mt-1">Reports</p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center space-x-2 bg-[#122444] px-3 py-1.5 rounded-full border border-white/5">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-slate-300 text-[11px] font-medium">Senior Citizen</span>
              </span>
              <span className="flex items-center space-x-2 bg-[#122444] px-3 py-1.5 rounded-full border border-white/5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-slate-300 text-[11px] font-medium">PWD</span>
              </span>
              <span className="flex items-center space-x-2 bg-[#122444] px-3 py-1.5 rounded-full border border-white/5">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-slate-300 text-[11px] font-medium">Youth</span>
              </span>
              <span className="flex items-center space-x-2 bg-[#122444] px-3 py-1.5 rounded-full border border-white/5">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-slate-300 text-[11px] font-medium">Women</span>
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-slate-500 text-[10px] mt-8">
            <p>© 2024 MSWDO · Republic of the Philippines</p>
            <div className="flex items-center space-x-1.5 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20 text-green-400">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-semibold tracking-wider">System Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div className="w-full max-w-[420px]">
          
          <AnimatePresence mode="wait">
            {viewMode === 'selection' ? (
              <motion.div
                key="selection"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-slate-100 ring-1 ring-slate-900/5 relative"
              >
                {/* Visual Top Border */}
                <div className="h-1.5 w-full bg-[#3b66df] rounded-t-2xl"></div>

                <div className="p-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Sign in</h2>
                  <p className="text-sm text-slate-500 mb-8 font-medium">Choose your access portal to continue</p>

                  <div className="space-y-4">
                    {/* Admin Portal Button */}
                    <button 
                      onClick={() => setViewMode('admin')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-left group transition-all duration-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-[#3b66df] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                          <Shield size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">Staff Portal</h3>
                          <p className="text-xs text-slate-500 mt-0.5">For MSWDO staff and administrators</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                    </button>

                    {/* Beneficiary Portal Button */}
                    <button 
                      onClick={() => setViewMode('beneficiary')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-left group transition-all duration-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                          <UserPlus size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">Applicant Portal</h3>
                          <p className="text-xs text-slate-500 mt-0.5">For registered welfare beneficiaries</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-500 transform group-hover:translate-x-1 transition-all" />
                    </button>

                    {/* Apply for Benefits Button */}
                    <button 
                      onClick={() => navigate('/apply')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50 text-left group transition-all duration-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                          <FileText size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-purple-700 transition-colors">Applicant Registration</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Apply for social welfare programs</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-purple-500 transform group-hover:translate-x-1 transition-all" />
                    </button>
                  </div>

                  <div className="mt-8 flex items-center">
                    <div className="flex-1 h-px bg-slate-100"></div>
                    <span className="px-3 text-[10px] uppercase text-slate-400 font-bold tracking-widest bg-white">secure government system</span>
                    <div className="flex-1 h-px bg-slate-100"></div>
                  </div>
                </div>
              </motion.div>
            ) : viewMode === 'admin' ? (
              <motion.div
                key="admin-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-slate-100 ring-1 ring-slate-900/5 relative"
              >
                <div className="h-1.5 w-full bg-[#3b66df] rounded-t-2xl"></div>

                <div className="p-8">
                  {/* Breadcrumbs */}
                  <div className="flex items-center space-x-1.5 text-[11px] font-semibold mb-6">
                    <button onClick={handleBack} className="text-slate-400 hover:text-slate-600 flex items-center">
                      <ChevronLeft size={14} className="mr-0.5" />
                      Back
                    </button>
                    <span className="text-slate-300">/</span>
                    <span className="text-blue-600">Staff Portal</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-500">{adminType === 'super' ? 'Super Admin' : 'Admin Staff'}</span>
                  </div>

                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Staff Sign In</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Select your role and enter your credentials</p>
                  </div>

                  {error && (
                    <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-medium rounded-r">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Admin Staff Box */}
                    <button 
                      type="button"
                      onClick={() => setAdminType('admin')}
                      className={`relative flex flex-col p-4 rounded-xl border text-left transition-all ${
                        adminType === 'admin' 
                          ? 'border-blue-500 bg-blue-50/50' 
                          : 'border-slate-100 hover:border-slate-200 shadow-sm'
                      }`}
                    >
                      {adminType === 'admin' && (
                        <div className="absolute top-3 right-3 text-blue-600">
                          <CheckCircle2 size={18} className="fill-blue-600 text-white" />
                        </div>
                      )}
                      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center mb-3 ${adminType === 'admin' ? 'bg-[#3b66df] text-white' : 'bg-slate-100 text-slate-400 border border-slate-200/50'}`}>
                        <Users size={18} />
                      </div>
                      <h3 className={`text-sm font-bold ${adminType === 'admin' ? 'text-[#3b66df]' : 'text-slate-700'}`}>Admin Staff</h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">Standard access</p>
                    </button>

                    {/* Super Admin Box */}
                    <button 
                      type="button"
                      onClick={() => setAdminType('super')}
                      className={`relative flex flex-col p-4 rounded-xl border text-left transition-all ${
                        adminType === 'super' 
                          ? 'border-blue-500 bg-blue-50/50' 
                          : 'border-slate-100 hover:border-slate-200 shadow-sm'
                      }`}
                    >
                      {adminType === 'super' && (
                        <div className="absolute top-3 right-3 text-blue-600">
                          <CheckCircle2 size={18} className="fill-blue-600 text-white" />
                        </div>
                      )}
                      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center mb-3 ${adminType === 'super' ? 'bg-[#3b66df] text-white' : 'bg-slate-100 text-slate-400 border border-slate-200/50'}`}>
                        <Shield size={18} />
                      </div>
                      <h3 className={`text-sm font-bold ${adminType === 'super' ? 'text-[#3b66df]' : 'text-slate-700'}`}>Super Admin</h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">Full system access</p>
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    
                    <div className="space-y-1.5 text-left">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        EMAIL / USERNAME
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail size={16} />
                        </div>
                        <input
                          type={adminType === 'admin' ? "email" : "text"}
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="staff@mswdo.gov.ph"
                          className="w-full rounded-xl py-3 pl-10 pr-3 text-slate-900 border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm font-medium focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <div className="flex justify-between items-center">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">PASSWORD</label>
                        <button type="button" className="text-[11px] text-[#3b66df] hover:underline font-bold">Forgot password?</button>
                      </div>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock size={16} />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••"
                          className="w-full rounded-xl py-3 pl-10 pr-10 text-slate-900 border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm font-medium focus:ring-blue-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5 pt-1 pb-2">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          id="keep-signed-in" 
                          className="w-4 h-4 rounded border-slate-300 text-[#3b66df] focus:ring-[#3b66df]" 
                        />
                      </div>
                      <label htmlFor="keep-signed-in" className="text-xs text-slate-600 font-medium cursor-pointer">
                        Keep me signed in for 30 days
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full text-white font-bold py-3.5 rounded-xl shadow-[0_8px_20px_rgba(59,102,223,0.3)] flex items-center justify-center space-x-2 transition-all duration-200 active:scale-[0.98] bg-[#3b66df] hover:bg-[#2b4cbf] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-[15px]">{loading ? 'Authenticating...' : 'Sign In'}</span>
                    </button>

                  </form>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="beneficiary-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-slate-100 ring-1 ring-slate-900/5 relative"
              >
                <div className="h-1.5 w-full bg-[#057a55] rounded-t-2xl"></div>

                <div className="p-8">
                  {/* Breadcrumbs */}
                  <div className="flex items-center space-x-1.5 text-[11px] font-semibold mb-6">
                    <button onClick={handleBack} className="text-slate-400 hover:text-slate-600 flex items-center">
                      <ChevronLeft size={14} className="mr-0.5" />
                      Back
                    </button>
                    <span className="text-slate-300">/</span>
                    <span className="text-[#057a55]">Applicant Portal</span>
                  </div>

                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Applicant Sign In</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Track your application and benefits</p>
                  </div>

                  {error && (
                    <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-medium rounded-r">
                      {error}
                    </div>
                  )}

                  <div className="bg-[#f0fdf4] rounded-xl p-4 border border-emerald-100 flex items-start space-x-3 mb-6">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#057a55] flex items-center justify-center shrink-0">
                      <CheckCircle2 size={14} className="stroke-[3]" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-bold text-emerald-900">Applicant Portal Access</h3>
                      <p className="text-[11px] font-medium text-emerald-700/90 mt-1 leading-relaxed">
                        Use the email address from your application and the temporary password sent upon approval. You will be required to change your password on first login.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    
                    <div className="space-y-1.5 text-left">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        EMAIL ADDRESS
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail size={16} />
                        </div>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your.email@example.com"
                          className="w-full rounded-xl py-3 pl-10 pr-3 text-slate-900 border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm font-medium focus:ring-[#057a55]/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <div className="flex justify-between items-center">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">PASSWORD</label>
                        <button type="button" className="text-[11px] text-[#057a55] hover:underline font-bold">Need help?</button>
                      </div>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock size={16} />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••"
                          className="w-full rounded-xl py-3 pl-10 pr-10 text-slate-900 border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm font-medium focus:ring-[#057a55]/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className={`w-full text-white font-bold py-3.5 rounded-xl shadow-[0_8px_20px_rgba(5,122,85,0.3)] flex items-center justify-center transition-all duration-200 active:scale-[0.98] bg-[#057a55] hover:bg-[#046c4b] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <span className="text-[15px]">{loading ? 'Authenticating...' : 'Access Portal'}</span>
                      </button>
                    </div>

                    <div className="text-center pt-3">
                      <p className="text-[11px] text-slate-500 font-medium">
                        Not registered yet? <button type="button" onClick={() => navigate('/apply')} className="text-[#057a55] font-bold hover:underline">Applicant Registration</button>
                      </p>
                    </div>

                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center mt-8 space-y-2">
            <p className="text-xs text-slate-400 font-medium">
              For access issues, contact your <span className="text-blue-500 cursor-pointer hover:underline">System Administrator</span>
            </p>
            <p className="text-[10px] text-slate-400/80 font-medium">
              Republic of the Philippines · Municipal Government · © 2026
            </p>
          </div>

        </div>
      </div>

      {/* Success Modal OVERLAY */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            key="success-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-[24px] shadow-2xl p-8 max-w-[340px] w-full text-center relative overflow-hidden"
            >
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                <Check size={32} className="text-emerald-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Login Successful!</h3>
              
              <div className="text-sm text-slate-500 mb-8 font-medium">
                Welcome back, securely authenticated as
                <br/>
                <div className="text-slate-800 font-bold mt-1 text-[13px]">{successData?.email}</div>
                <div className="mt-2.5 inline-block px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-bold uppercase tracking-widest border border-emerald-100">
                  {successData?.role}
                </div>
              </div>
              
              {/* Progress bar loader simulating redirect wait */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, ease: "linear" }}
                  className="h-full bg-emerald-500"
                  onAnimationComplete={() => {
                      const finalRole = successData?.role?.toLowerCase() || '';
                      if (finalRole.includes('applicant')) {
                        navigate('/applicant-dashboard', { state: { role: finalRole, email: successData?.email } });
                      } else {
                        navigate('/dashboard', { state: { role: finalRole, email: successData?.email } });
                      }
                  }}
                />
              </div>
              
              <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest animate-pulse">
                Redirecting to dashboard...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordChangeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm p-8"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={32} className="text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">Update Password</h3>
              <p className="text-sm text-slate-500 mb-6 text-center">
                For your security, please update your temporary password before accessing the system.
              </p>
              
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-[11px] font-semibold border border-red-100 flex items-start gap-2">
                  <Shield size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full mt-4 py-3 bg-[#057a55] text-white rounded-xl font-bold text-sm hover:bg-[#046c4b] transition-all shadow-md flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}
                >
                  {loading ? 'Updating...' : 'Update Password & Continue'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Login;
