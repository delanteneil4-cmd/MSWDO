import React from 'react';
import { 
  Users, Gift, FileText, XCircle, Bell, BarChart2, 
  Settings, UserPlus, Fingerprint, Database, CheckCircle2,
  Clock, DownloadCloud, Search, LogOut, Menu, ArrowUpRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';

const NavItem = ({ icon: Icon, label, active, badge, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1 transition-all ${
    active ? 'bg-blue-600/10 text-blue-500' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
  }`}>
    <div className="flex items-center space-x-3">
      <Icon size={18} className={active ? 'text-blue-500' : 'text-slate-500'} />
      <span className="text-sm font-semibold">{label}</span>
    </div>
    {badge && (
      <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
        {badge}
      </span>
    )}
  </button>
);

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}-50 text-${color}-600`}>
        <Icon size={20} />
      </div>
      {trend && (
        <span className="flex items-center space-x-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full">
          <ArrowUpRight size={12} />
          <span>{trend}</span>
        </span>
      )}
    </div>
    <h3 className="text-2xl font-extrabold text-slate-800">{value}</h3>
    <p className="text-xs font-bold text-slate-900 mt-1">{title}</p>
    <p className="text-[10px] text-slate-400 font-medium mt-1">{subtitle}</p>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = React.useState(location.state?.role?.toLowerCase() || '');
  const [email, setEmail] = React.useState(location.state?.email || '');

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
         if (!email) setEmail(user.email);
         if (!role) {
           try {
             const docRef = doc(db, 'users', user.uid);
             const snap = await getDoc(docRef);
             if (snap.exists() && snap.data().role) {
                setRole(snap.data().role.toLowerCase());
             } else {
               const adminRef = doc(db, 'admins', user.uid);
               const adminSnap = await getDoc(adminRef);
               if (adminSnap.exists() && adminSnap.data().role) {
                  setRole(adminSnap.data().role.toLowerCase());
               }
             }
           } catch(e) {
             console.error("Error fetching role", e);
           }
         }
      } else {
         navigate('/');
      }
    });
    return () => unsub();
  }, [email, role, navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isSuper = role === 'super' || role === 'super admin' || role.includes('super');
  
  const themeColor = isSuper ? 'indigo' : 'blue';
  const roleTitle = isSuper ? 'Super Admin' : 'Admin Staff';
  const userName = isSuper ? 'Admin Flores' : 'Maria Bautista';
  const userInitials = isSuper ? 'AF' : 'MB';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-[#0a1128] flex flex-col shadow-xl z-20 shrink-0">
        <div className="p-6 flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl bg-${themeColor}-600 flex items-center justify-center shadow-lg shadow-${themeColor}-600/20`}>
            <ShieldCheckIcon />
          </div>
          <div>
            <h1 className="text-white font-bold tracking-wide text-sm">MSWDO</h1>
            <p className={`text-${themeColor}-400 text-[10px] uppercase font-bold tracking-widest`}>{roleTitle}</p>
          </div>
        </div>

        <div className="px-6 py-2">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4">Navigation</p>
          <div className="space-y-0.5">
            <NavItem icon={Menu} label="Dashboard" active />
            <NavItem icon={Users} label="Membership" />
            <NavItem icon={Gift} label="Benefits" />
            <NavItem icon={FileText} label="Record Tracking" />
            <NavItem icon={XCircle} label="Termination" />
            <NavItem icon={Bell} label="Announcements" />
            <NavItem icon={BarChart2} label="Reports" />
          </div>
          
          {isSuper && (
            <>
              <div className="mt-8 mb-4 h-px w-full bg-white/5"></div>
              
              <div className="space-y-0.5">
                <NavItem icon={Database} label="CMS" badge="SA" />
                <NavItem icon={Fingerprint} label="Audit & Monitoring" badge="SA" />
                <NavItem icon={UserPlus} label="User Management" badge="SA" onClick={() => navigate('/user-management')} />
                <NavItem icon={Settings} label="Settings" badge="SA" />
              </div>
            </>
          )}
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
          <div className="flex items-center space-x-4">
            <button className="lg:hidden text-slate-400 hover:text-slate-600">
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Dashboard</h2>
              <p className="text-xs text-slate-500 font-medium tracking-wide">Municipal Social Welfare and Development Office</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="relative hidden md:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Quick search..." 
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all w-64 font-medium"
              />
            </div>
            
            <button className="relative text-slate-400 hover:text-slate-600">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>

            <div className="flex items-center space-x-3 pl-6 border-l border-slate-100">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800">{userName}</span>
                <span className={`text-[10px] font-bold text-${themeColor}-600 uppercase tracking-widest`}>{roleTitle}</span>
              </div>
              <div className={`w-10 h-10 rounded-full bg-${themeColor}-600 text-white font-bold flex items-center justify-center border-2 border-${themeColor}-100 shadow-sm`}>
                {userInitials}
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-auto p-8">
          
          {/* STATS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <StatCard title="Total Applicants" value="1,284" subtitle="All categories" icon={Users} color="blue" trend="+12%" />
            <StatCard title="Approved Members" value="950" subtitle="Verified & active" icon={CheckCircle2} color="emerald" trend="+8%" />
            <StatCard title="Pending Applications" value="87" subtitle="Awaiting review" icon={Clock} color="orange" />
            <StatCard title="Active Beneficiaries" value="842" subtitle="Receiving benefits" icon={Fingerprint} color="indigo" />
            <StatCard title="Terminated Benefits" value="108" subtitle="This year" icon={XCircle} color="red" />
            <StatCard title="Reports Generated" value="64" subtitle="This month" icon={FileText} color="purple" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* CHART PANEL */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Monthly Application Summary</h3>
                  <p className="text-xs text-slate-400 font-medium">January - June 2024</p>
                </div>
                <button className="flex items-center space-x-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                  <DownloadCloud size={14} />
                  <span>Export</span>
                </button>
              </div>

              {/* Mock Bar Chart using Flexbox (mimicking recharts structure) */}
              <div className="h-64 flex items-end justify-between px-4 pb-2 relative">
                {/* Horizontal Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 text-[11px] text-slate-300 font-medium pr-12">
                  <div className="border-b border-slate-100 w-full flex items-center justify-start"><span className="-ml-6 relative -top-2">60</span></div>
                  <div className="border-b border-slate-100 w-full flex items-center justify-start"><span className="-ml-6 relative -top-2">45</span></div>
                  <div className="border-b border-slate-100 w-full flex items-center justify-start"><span className="-ml-6 relative -top-2">30</span></div>
                  <div className="border-b border-slate-100 w-full flex items-center justify-start"><span className="-ml-6 relative -top-2">15</span></div>
                  <div className="border-b border-slate-100 w-full flex items-center justify-start"><span className="-ml-6 relative -top-2">0</span></div>
                </div>

                {/* Bars */}
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, i) => (
                  <div key={month} className="flex flex-col items-center justify-end h-full z-10 w-full">
                    <div className="flex items-end space-x-1.5 w-full justify-center pb-2">
                       <motion.div initial={{ height: 0 }} animate={{ height: `${[45, 60, 68, 62, 85, 80][i]}%` }} transition={{ delay: i*0.1, duration: 1 }} className="w-3.5 bg-blue-600 rounded-t-sm" />
                       <motion.div initial={{ height: 0 }} animate={{ height: `${[20, 15, 25, 20, 18, 15][i]}%` }} transition={{ delay: i*0.1, duration: 1 }} className="w-3.5 bg-orange-500 rounded-t-sm" />
                       <motion.div initial={{ height: 0 }} animate={{ height: `${[5, 4, 8, 3, 10, 6][i]}%` }} transition={{ delay: i*0.1, duration: 1 }} className="w-3.5 bg-red-500 rounded-t-sm" />
                       <motion.div initial={{ height: 0 }} animate={{ height: `${[2, 3, 2, 4, 1, 3][i]}%` }} transition={{ delay: i*0.1, duration: 1 }} className="w-3.5 bg-slate-400 rounded-t-sm" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 mt-2">{month}</span>
                  </div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="flex justify-center space-x-6 mt-4">
                <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-sm bg-blue-600"></div><span className="text-[11px] font-bold text-slate-600">Approved</span></div>
                <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-sm bg-orange-500"></div><span className="text-[11px] font-bold text-slate-600">Pending</span></div>
                <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-sm bg-red-500"></div><span className="text-[11px] font-bold text-slate-600">Rejected</span></div>
                <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-sm bg-slate-400"></div><span className="text-[11px] font-bold text-slate-600">Terminated</span></div>
              </div>
            </div>

            {/* NOTIFICATIONS PANEL */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                <span className="bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">4 New</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-start p-3.5 rounded-xl bg-orange-50 border border-orange-100/50">
                  <div className="max-w-[calc(100%-20px)]">
                    <p className="text-xs font-semibold text-orange-900 leading-snug">8 applications pending review for more than 5 days</p>
                    <p className="text-[10px] font-bold text-orange-600/70 mt-1 uppercase tracking-wider">Now</p>
                  </div>
                </div>
                <div className="flex items-start p-3.5 rounded-xl bg-blue-50 border border-blue-100/50">
                  <div className="max-w-[calc(100%-20px)]">
                    <p className="text-xs font-semibold text-blue-900 leading-snug">Monthly Social Pension disbursement due in 3 days</p>
                    <p className="text-[10px] font-bold text-blue-600/70 mt-1 uppercase tracking-wider">1 hr ago</p>
                  </div>
                </div>
                <div className="flex items-start p-3.5 rounded-xl bg-emerald-50 border border-emerald-100/50">
                  <div className="max-w-[calc(100%-20px)]">
                    <p className="text-xs font-semibold text-emerald-900 leading-snug">RC7 validation completed for 12 records</p>
                    <p className="text-[10px] font-bold text-emerald-600/70 mt-1 uppercase tracking-wider">2 hrs ago</p>
                  </div>
                </div>
                <div className="flex items-start p-3.5 rounded-xl bg-red-50 border border-red-100/50">
                  <div className="max-w-[calc(100%-20px)]">
                    <p className="text-xs font-semibold text-red-900 leading-snug">2 documents missing for PWD-2024-007</p>
                    <p className="text-[10px] font-bold text-red-600/70 mt-1 uppercase tracking-wider">5 hrs ago</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* RECENT ACTIVITIES */}
            <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-50 mb-4">
                <h3 className="text-sm font-bold text-slate-800">Recent Activities</h3>
                <button className="text-[11px] font-bold text-blue-600 hover:underline">View All</button>
              </div>
              <div className="space-y-5">
                {[
                  { icon: CheckCircle2, color: 'emerald', text: 'Application SC-2024-001 approved by Admin Flores', time: '10 mins ago' },
                  { icon: Gift, color: 'blue', text: 'Benefit claim CLM-2024-004 processed for Lorna dela Cruz', time: '32 mins ago' },
                  { icon: UserPlus, color: 'indigo', text: 'New applicant Mark Lim registered under Youth category', time: '1 hr ago' },
                  { icon: XCircle, color: 'red', text: 'Termination report TRM-2024-002 submitted by MSWDO Staff', time: '2 hrs ago' },
                  { icon: FileText, color: 'purple', text: 'Monthly report for April 2024 exported as PDF', time: '3 hrs ago' },
                ].map((act, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full bg-${act.color}-50 text-${act.color}-600 flex items-center justify-center shrink-0`}>
                      <act.icon size={14} />
                    </div>
                    <div>
                      <p className="text-xs border-slate-700 font-semibold text-slate-700">{act.text}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">{act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
               {/* QUICK ACTIONS */}
               <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                 <h3 className="text-sm font-bold text-slate-800 mb-4">Quick Actions</h3>
                 <div className="grid grid-cols-2 gap-3">
                   <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-blue-600 text-white font-bold text-[11px] tracking-wide hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/20">
                     <span className="text-lg mb-1">+</span>
                     New Application
                   </button>
                   <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-emerald-600 text-white font-bold text-[11px] tracking-wide hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-600/20">
                     <Gift size={18} className="mb-1" />
                     Process Claim
                   </button>
                   <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-purple-600 text-white font-bold text-[11px] tracking-wide hover:bg-purple-700 active:scale-95 transition-all shadow-md shadow-purple-600/20">
                     <FileText size={18} className="mb-1" />
                     Generate Report
                   </button>
                   <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-orange-500 text-white font-bold text-[11px] tracking-wide hover:bg-orange-600 active:scale-95 transition-all shadow-md shadow-orange-500/20">
                     <UserPlus size={18} className="mb-1" />
                     Add User
                   </button>
                 </div>
               </div>

               {/* CATEGORY DONUT */}
               <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center relative overflow-hidden">
                 <div className="w-full text-left mb-6">
                   <h3 className="text-sm font-bold text-slate-800">Beneficiaries by Category</h3>
                 </div>
                 {/* CSS Mock of a Donut Chart */}
                 <div className="relative w-36 h-36 rounded-full flex items-center justify-center mb-4" 
                      style={{ background: 'conic-gradient(#2563eb 0% 45%, #10b981 45% 70%, #8b5cf6 70% 85%, #f59e0b 85% 100%)' }}>
                    <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
                      <span className="font-extrabold text-slate-800 text-lg">950</span>
                    </div>
                 </div>
                 <div className="w-full flex justify-between text-[10px] font-bold text-slate-600 flex-wrap gap-2 px-2">
                   <div className="flex items-center space-x-1.5"><div className="w-2 h-2 rounded-sm bg-blue-600"></div><span>Senior (45%)</span></div>
                   <div className="flex items-center space-x-1.5"><div className="w-2 h-2 rounded-sm bg-emerald-500"></div><span>PWD (25%)</span></div>
                   <div className="flex items-center space-x-1.5"><div className="w-2 h-2 rounded-sm bg-purple-500"></div><span>Women (15%)</span></div>
                   <div className="flex items-center space-x-1.5"><div className="w-2 h-2 rounded-sm bg-orange-500"></div><span>Youth (15%)</span></div>
                 </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

// Mini Logo Component
const ShieldCheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
)

export default Dashboard;
