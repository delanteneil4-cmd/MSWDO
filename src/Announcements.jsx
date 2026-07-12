import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart2, Bell, ClipboardList, Database, Eye, Fingerprint, Gift,
  Loader2, LogOut, Menu, Pencil, Plus, Search, Settings, UserPlus,
  UserX, Users, X,
} from 'lucide-react';
import {
  addDoc, collection, doc, getDoc, getDocs, serverTimestamp, updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { CATEGORY_OPTIONS, COLLECTIONS } from './utils/dataModel';
import {
  getAssignedCategories,
  getCategoryDisplayName,
  getStaffInfo,
  logActivity,
} from './utils/approvalWorkflow';

const EMPTY_FORM = {
  title: '',
  body: '',
  targetCategories: [],
  pinned: false,
  published: true,
  expiresAt: '',
};

const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    title={!onClick ? `${label} is not available yet` : undefined}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1 transition-all ${
      active
        ? 'bg-teal-400/10 text-teal-300 border-l-2 border-teal-300'
        : onClick
          ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          : 'text-slate-600/70 cursor-not-allowed'
    }`}
  >
    <span className="flex items-center gap-3"><Icon size={18} /><span className="text-sm font-semibold">{label}</span></span>
    {badge && <span className="text-[9px] font-bold text-indigo-400">{badge}</span>}
  </button>
);

const dateText = (value) => {
  if (!value) return 'No expiry';
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 'No expiry' : date.toLocaleDateString('en-PH', { dateStyle: 'medium' });
};

const splitIntoChunks = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
};

const AnnouncementForm = ({ form, setForm, assignedCategories, editing, saving, onSubmit, onCancel }) => {
  const toggleCategory = (id) => setForm((current) => ({
    ...current,
    targetCategories: current.targetCategories.includes(id)
      ? current.targetCategories.filter((value) => value !== id)
      : [...current.targetCategories, id],
  }));

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-slate-800">{editing ? 'Edit Announcement' : 'Create Announcement'}</h3>
        {editing && <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-700"><X size={17} /></button>}
      </div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Title</label>
      <input required maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full mb-4 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500" placeholder="Announcement title" />
      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Message</label>
      <textarea required maxLength={4000} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} rows="6" className="w-full mb-4 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-teal-500" placeholder="Write the message for beneficiaries..." />
      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Audience</label>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {CATEGORY_OPTIONS.filter(({ id }) => assignedCategories.includes(id)).map(({ id, label }) => (
          <label key={id} className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer ${form.targetCategories.includes(id) ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600'}`}>
            <input type="checkbox" checked={form.targetCategories.includes(id)} onChange={() => toggleCategory(id)} className="accent-teal-600" />{label}
          </label>
        ))}
      </div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Expiry date</label>
      <input type="date" min={new Date().toISOString().slice(0, 10)} value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} className="w-full mb-4 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500" />
      <div className="flex flex-wrap gap-4 mb-5">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={form.pinned} onChange={(event) => setForm({ ...form, pinned: event.target.checked })} className="accent-teal-600" />Pin announcement</label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} className="accent-teal-600" />Published</label>
      </div>
      <button disabled={saving} className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Save Changes' : 'Publish Announcement'}</button>
    </form>
  );
};

const Announcements = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState({ uid: '', email: '', name: 'Staff' });
  const [assignedCategories, setAssignedCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadItems = async (categories) => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.announcements));
      setItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => (item.targetCategories || []).some((category) => categories.includes(category)))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/'); return; }
      const profile = await getDoc(doc(db, COLLECTIONS.users, user.uid));
      const categories = getAssignedCategories(profile.exists() ? profile.data() : {});
      setAssignedCategories(categories);
      setStaff(await getStaffInfo(db, user));
      await loadItems(categories);
    });
    return () => unsubscribe();
  }, [navigate]);

  const filteredItems = useMemo(() => items.filter((item) => `${item.title} ${item.body}`.toLowerCase().includes(searchTerm.toLowerCase())), [items, searchTerm]);
  const resetForm = () => { setForm(EMPTY_FORM); setEditing(null); };
  const startEdit = (item) => {
    setEditing(item.id);
    setForm({ title: item.title || '', body: item.body || '', targetCategories: item.targetCategories || [], pinned: Boolean(item.pinned), published: item.published !== false, expiresAt: item.expiresAt || '' });
  };

  const writeNotifications = async (announcementId, announcement) => {
    const usersSnapshot = await getDocs(collection(db, COLLECTIONS.users));
    const recipients = usersSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((user) => user.memberType === 'beneficiary' && announcement.targetCategories.includes(user.memberCategory));
    for (const chunk of splitIntoChunks(recipients, 450)) {
      const batch = writeBatch(db);
      chunk.forEach((user) => batch.set(doc(collection(db, COLLECTIONS.notifications)), { memberId: user.id, announcementId, title: announcement.title, body: announcement.body, categoryId: user.memberCategory, read: false, createdAt: serverTimestamp() }));
      if (chunk.length) await batch.commit();
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.targetCategories.length) { window.alert('Select at least one audience category.'); return; }
    setSaving(true);
    try {
      const announcement = { ...form, title: form.title.trim(), body: form.body.trim(), targetLabels: form.targetCategories.map(getCategoryDisplayName), updatedAt: serverTimestamp(), updatedBy: staff };
      let announcementId = editing;
      if (editing) await updateDoc(doc(db, COLLECTIONS.announcements, editing), announcement);
      else announcementId = (await addDoc(collection(db, COLLECTIONS.announcements), { ...announcement, createdAt: serverTimestamp(), createdBy: staff })).id;
      await Promise.all(form.targetCategories.map((categoryId) => logActivity(db, { type: editing ? 'announcement_updated' : 'announcement_published', action: editing ? 'Announcement Updated' : 'Announcement Published', details: form.title.trim(), announcementId, categoryId, category: getCategoryDisplayName(categoryId), adminUid: staff.uid, adminEmail: staff.email, adminName: staff.name })));
      if (!editing && form.published) await writeNotifications(announcementId, announcement);
      resetForm();
      await loadItems(assignedCategories);
    } catch (error) {
      console.error('Error saving announcement:', error);
      window.alert('The announcement could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (item) => {
    const published = !item.published;
    await updateDoc(doc(db, COLLECTIONS.announcements, item.id), { published, updatedAt: serverTimestamp(), updatedBy: staff });
    await Promise.all((item.targetCategories || []).map((categoryId) => logActivity(db, { type: published ? 'announcement_published' : 'announcement_unpublished', action: published ? 'Announcement Published' : 'Announcement Unpublished', details: item.title, announcementId: item.id, categoryId, category: getCategoryDisplayName(categoryId), adminUid: staff.uid, adminEmail: staff.email, adminName: staff.name })));
    await loadItems(assignedCategories);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <aside className="w-64 bg-[#102a43] flex flex-col shadow-xl shrink-0">
        <div className="p-6"><h1 className="text-white font-bold tracking-wide text-sm">MSWDO</h1><p className="text-teal-300 text-[10px] uppercase font-bold tracking-widest">Admin Panel</p></div>
        <div className="px-6 py-2 flex-1 overflow-y-auto"><p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4">Navigation</p>
          <NavItem icon={Menu} label="Dashboard" onClick={() => navigate('/dashboard')} /><NavItem icon={Users} label="Membership" onClick={() => navigate('/membership')} /><NavItem icon={ClipboardList} label="Applications" onClick={() => navigate('/applications')} /><NavItem icon={Gift} label="Benefits" onClick={() => navigate('/benefits')} /><NavItem icon={UserX} label="Termination" onClick={() => navigate('/termination')} /><NavItem icon={Bell} label="Announcements" active /><NavItem icon={BarChart2} label="Reports" />
          <div className="my-6 h-px bg-white/5" /><NavItem icon={Database} label="CMS" badge="SA" /><NavItem icon={Fingerprint} label="Audit & Monitoring" badge="SA" onClick={() => navigate('/audit')} /><NavItem icon={UserPlus} label="User Management" badge="SA" onClick={() => navigate('/user-management')} /><NavItem icon={Settings} label="Settings" badge="SA" />
        </div>
        <button onClick={() => signOut(auth).then(() => navigate('/'))} className="m-6 flex items-center gap-3 text-slate-400 hover:text-red-400"><LogOut size={18} /><span className="text-sm font-semibold">Logout</span></button>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-8"><div><h2 className="text-lg font-bold text-slate-800">Announcements</h2><p className="text-xs text-slate-500">Publish updates to beneficiary categories</p></div><button onClick={resetForm} className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold"><Plus size={15} />New Announcement</button></header>
        <div className="p-4 sm:p-8 grid grid-cols-1 xl:grid-cols-3 gap-6"><AnnouncementForm form={form} setForm={setForm} assignedCategories={assignedCategories} editing={editing} saving={saving} onSubmit={submit} onCancel={resetForm} /><section className="xl:col-span-2 space-y-4"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search announcements..." className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-xl shadow-sm text-sm focus:outline-none focus:border-teal-400" /></div>{loading ? <div className="bg-white rounded-2xl p-10 text-center text-slate-400"><Loader2 className="inline animate-spin mr-2" size={18} />Loading announcements...</div> : filteredItems.length === 0 ? <div className="bg-white rounded-2xl p-10 text-center text-slate-500">No announcements yet.</div> : filteredItems.map((item) => <article key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h3 className="font-bold text-slate-800">{item.title}</h3>{item.pinned && <span className="text-[9px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">Pinned</span>}</div><p className="text-xs text-slate-400 mt-1">{item.targetLabels?.join(', ') || (item.targetCategories || []).map(getCategoryDisplayName).join(', ')} · Expires {dateText(item.expiresAt)}</p></div><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${item.published ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>{item.published ? 'Published' : 'Draft'}</span></div><p className="mt-4 text-sm text-slate-600 leading-relaxed whitespace-pre-line">{item.body}</p><div className="mt-5 pt-4 border-t border-slate-100 flex gap-2"><button onClick={() => startEdit(item)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100"><Pencil size={13} />Edit</button><button onClick={() => togglePublished(item)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100"><Eye size={13} />{item.published ? 'Unpublish' : 'Publish'}</button></div></article>)}</section></div>
      </main>
    </div>
  );
};

export default Announcements;
