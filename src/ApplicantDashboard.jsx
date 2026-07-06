import React, { useEffect, useState } from 'react';
import { 
  Home, FileText, UploadCloud, Gift, Bell, CheckCircle2, 
  LogOut, Menu, ArrowRight, CheckCircle, ShieldCheck
} from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';

const NavItem = ({ icon: Icon, label, active }) => (
  <button className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl mb-1 transition-all ${
    active ? 'bg-blue-600/10 text-blue-500' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
  }`}>
    <Icon size={18} className={active ? 'text-blue-500' : 'text-slate-500'} />
    <span className="text-sm font-semibold">{label}</span>
  </button>
);

const StatCard = ({ title, value, subtitle, icon: Icon, color }) => (
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

const ApplicantDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
         if (!email) setEmail(user.email);
      } else {
         navigate('/');
      }
    });
    return () => unsub();
  }, [email, navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-[#0a1128] flex flex-col shadow-xl z-20 shrink-0">
        
        {/* Branding */}
        <div className="p-6 flex items-center space-x-3 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold tracking-wide text-sm">Applicant Portal</h1>
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest mt-0.5">MSWDO Digital System</p>
          </div>
        </div>

        {/* Profile Card Sidebar */}
        <div className="p-4">
          <div className="bg-[#121e42] rounded-xl p-4 border border-blue-900/40">
             <h2 className="text-sm font-bold text-white mb-0.5">Maria Santos</h2>
             <p className="text-[10px] text-slate-300 font-medium mb-3 opacity-80">SC-2024-001 • Senior Citizen</p>
             <div className="inline-flex items-center space-x-1.5 bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Active</span>
             </div>
          </div>
        </div>

        <div className="px-6 py-2 mt-2">
          <div className="space-y-0.5">
            <NavItem icon={Home} label="My Dashboard" active />
            <NavItem icon={FileText} label="My Application" />
            <NavItem icon={UploadCloud} label="Documents" />
            <NavItem icon={Gift} label="Apply Benefits" />
            <NavItem icon={Bell} label="Announcements" />
            <NavItem icon={Bell} label="Notifications" />
          </div>
        </div>

        <div className="mt-auto p-6">
          <button onClick={handleLogout} className="flex items-center space-x-3 text-slate-400 hover:text-red-400 transition-colors w-full">
            <LogOut size={18} />
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 z-10 shrink-0">
          <div>
             <h2 className="text-lg font-bold text-slate-800">My Dashboard</h2>
             <p className="text-xs text-slate-500 font-medium tracking-wide mt-0.5">MSWDO Applicant Portal — Senior Citizen</p>
          </div>

          <div className="flex items-center space-x-6">
            <button className="relative text-slate-400 hover:text-slate-600">
              <Bell size={20} />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[8px] font-bold text-white flex items-center justify-center">2</span>
            </button>

            <div className="flex items-center space-x-3 pl-6 border-l border-slate-100">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center shadow-sm">
                MS
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-bold text-slate-800">Maria Santos</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Applicant - Poblacion</span>
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-auto p-8">
          
          {/* WELCOME BANNER */}
          <div className="w-full bg-[#1e3a8a] rounded-2xl p-8 shadow-lg shadow-blue-900/10 mb-6 relative overflow-hidden flex flex-col justify-center">
             <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none">
                <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white scale-[2.5] translate-x-12 translate-y-12"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
             </div>
             
             <p className="text-blue-100/80 font-semibold mb-1">Welcome back,</p>
             <h2 className="text-3xl font-extrabold text-white mb-2">Maria Santos</h2>
             <p className="text-sm text-blue-200 mt-1">Senior Citizen • Barangay Poblacion • SC-2024-001</p>
             
             <div className="mt-8 flex items-center space-x-2 text-emerald-400 bg-emerald-400/10 w-max px-4 py-2 rounded-lg border border-emerald-400/20">
               <CheckCircle2 size={16} className="shrink-0" />
               <span className="text-[13px] font-medium text-emerald-50">Your membership is <strong>Active</strong> and in good standing.</span>
             </div>
          </div>

          {/* STATS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard title="Application Status" value="Active" icon={CheckCircle2} color="emerald" />
            <StatCard title="Documents Submitted" value="5/5" icon={FileText} color="blue" />
            <StatCard title="Benefits Claimed" value="3" icon={Gift} color="purple" />
            <StatCard title="Pending Notifications" value="2" icon={Bell} color="orange" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* APPLICATION PROGRESS */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-8">Application Progress</h3>
              
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-100 before:to-transparent">
                 {[
                   { title: 'Application Submitted', desc: 'Application form received by MSWDO', date: 'Jan 15, 2024' },
                   { title: 'Documents Verified', desc: 'All 5 required documents verified', date: 'Jan 20, 2024' },
                   { title: 'Interview Conducted', desc: 'Interview completed at MSWDO office', date: 'Jan 22, 2024' },
                   { title: 'LGU Validation', desc: 'Validated by LGU San Isidro', date: 'Jan 25, 2024' },
                   { title: 'RO7 Validation', desc: 'Approved by Regional Office VII', date: 'Feb 1, 2024' },
                 ].map((step, i) => (
                   <div key={i} className="relative flex items-center justify-between group">
                      <div className="flex items-center space-x-4 z-10 w-full">
                         <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-[0_0_0_4px_#fff]">
                            <CheckCircle size={14} />
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
                 ))}
              </div>
            </div>

            {/* RECENT ANNOUNCEMENTS */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-50 mb-4">
                <h3 className="text-sm font-bold text-slate-800">Recent Announcements</h3>
                <button className="text-[11px] font-bold text-blue-600 hover:underline">View All</button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 hover:border-slate-300 transition-colors">
                   <div className="flex items-center space-x-1.5 text-orange-500 mb-2 font-bold text-[10px] uppercase tracking-wide">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                      <span>Pinned</span>
                   </div>
                   <h4 className="text-[13px] font-bold text-slate-800 mb-2 leading-snug">2nd Quarter Social Pension Disbursement Schedule</h4>
                   <p className="text-[11px] text-slate-500 leading-relaxed font-medium mb-3">
                      The 2nd Quarter Social Pension disbursement for Senior Citizens will be held on June 15-20, 2024. Please bring your OSCA ID and passbook.
                   </p>
                   <div className="text-[10px] font-bold text-slate-400 flex items-center">
                     <span>May 28, 2024</span>
                   </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicantDashboard;
