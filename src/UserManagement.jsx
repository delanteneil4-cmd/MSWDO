import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, Bell, Search, LogOut, Menu, UserPlus, Settings,
  Database, Fingerprint, BarChart2, Gift, FileText, XCircle,
  X, Eye, Trash2, Edit3, Lock, ChevronDown, Check,
  AlertCircle, Loader2, ImagePlus, Shield, ArrowLeft, RefreshCw,
  Calendar, Clock, Hash, Phone, Mail, CreditCard, ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db, firebaseConfig } from './firebase';
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { initializeApp, getApp } from 'firebase/app';
import {
  collection, getDocs, doc, setDoc, updateDoc, deleteDoc,
  serverTimestamp, getDoc
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useCloudinaryUpload } from './hooks/useCloudinaryUpload';
import { CATEGORY_OPTIONS, getAssignedCategories, getCategoryDisplayName } from './utils/approvalWorkflow';
import { COLLECTIONS, MEMBER_STATUS } from './utils/dataModel';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ROLES = ['Admin', 'Staff'];

const POSITION_MAP = {
  Admin: ['IT Staff'],
  Staff: ['Senior Citizen', 'PWD', "Women's", 'Youth'],
};

const STATUS_OPTIONS = [MEMBER_STATUS.active, MEMBER_STATUS.inactive];
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ACCEPTED_EXT = '.jpg,.jpeg,.png,.webp';

const createdAtMillis = (user) => user.createdAt?.toMillis?.() || 0;

let secondaryApp;
let secondaryAuth;
try {
  secondaryApp = initializeApp(firebaseConfig, 'UserManagementSecondary');
} catch {
  secondaryApp = getApp('UserManagementSecondary');
}
secondaryAuth = getAuth(secondaryApp);

// ─── SIDEBAR NAV ITEM ─────────────────────────────────────────────────────────
const NavItem = ({ icon: Icon, label, active, badge, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    title={!onClick ? `${label} is not available yet` : undefined}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1 transition-all ${
      active
        ? 'bg-teal-400/10 text-teal-300 border-l-2 border-teal-300'
        : onClick ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200' : 'text-slate-600/70 cursor-not-allowed'
    }`}
  >
    <div className="flex items-center space-x-3">
      <Icon size={18} className={active ? 'text-teal-300' : 'text-slate-500'} />
      <span className="text-sm font-semibold">{label}</span>
    </div>
    {badge && (
      <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
        {badge}
      </span>
    )}
  </button>
);

// ─── IMAGE UPLOAD FIELD ───────────────────────────────────────────────────────
const ImageUploadField = ({ label, value, onChange, error, id }) => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef(null);
  const { uploadImage } = useCloudinaryUpload();

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError('Only JPG, PNG, or WEBP images are accepted.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be under 10MB.');
      return;
    }
    setUploadError('');
    setUploading(true);
    setProgress(0);
    try {
      const url = await uploadImage(file, 'mswdo/users', setProgress);
      onChange(url);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [onChange, uploadImage]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleInputChange = (e) => {
    handleFile(e.target.files[0]);
    e.target.value = '';
  };

  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
        {label} <span className="text-red-500">*</span>
      </label>

      {value ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-blue-200 bg-slate-50 group">
          <img src={value} alt={label} loading="lazy" decoding="async" className="w-full h-40 object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button type="button" onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 bg-white text-slate-800 text-xs font-bold px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
              <RefreshCw size={13} /> Replace
            </button>
            <button type="button" onClick={() => { onChange(null); setUploadError(''); }}
              className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-red-600 transition-colors">
              <Trash2 size={13} /> Remove
            </button>
          </div>
          <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Check size={10} /> Uploaded
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[140px] ${
            dragging ? 'border-blue-500 bg-blue-50 scale-[1.02]'
              : error || uploadError ? 'border-red-300 bg-red-50'
              : 'border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3 w-full px-4">
              <Loader2 size={28} className="text-blue-500 animate-spin" />
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs font-bold text-blue-600">Uploading… {progress}%</p>
            </div>
          ) : (
            <>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${error || uploadError ? 'bg-red-100' : 'bg-blue-50'}`}>
                <ImagePlus size={22} className={error || uploadError ? 'text-red-400' : 'text-blue-500'} />
              </div>
              <p className="text-xs font-bold text-slate-700 text-center">
                Drag & drop or <span className="text-blue-600">browse</span>
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-1">JPG, PNG, WEBP · Max 10MB</p>
            </>
          )}
        </div>
      )}

      <input ref={inputRef} id={id} type="file" accept={ACCEPTED_EXT}
        onChange={handleInputChange} className="hidden" disabled={uploading} />

      {(error || uploadError) && (
        <p className="text-red-500 text-[11px] font-semibold mt-1.5 flex items-center gap-1">
          <AlertCircle size={11} /> {uploadError || error}
        </p>
      )}
    </div>
  );
};

// ─── FORM STATE ───────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  lastName: '',
  firstName: '',
  middleInitial: '',
  idNumber: '',
  contactNumber: '',
  email: '',
  tempPassword: '',
  birthDate: '',
  role: '',
  position: '',
  assignedCategories: [],
  status: MEMBER_STATUS.active,
  governmentIdUrl: null,
  selfieUrl: null,
};

const EMPTY_ERRORS = {
  lastName: '',
  firstName: '',
  middleInitial: '',
  idNumber: '',
  contactNumber: '',
  email: '',
  tempPassword: '',
  birthDate: '',
  role: '',
  position: '',
  assignedCategories: '',
  governmentIdUrl: '',
  selfieUrl: '',
};

// ─── TEXT INPUT COMPONENT ─────────────────────────────────────────────────────
const FormInput = ({ id, label, value, onChange, error, placeholder, type = 'text', icon: Icon, required = true, maxLength, readOnly = false, hint }) => (
  <div>
    <label htmlFor={id} className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
      {label} {required ? <span className="text-red-500">*</span> : <span className="text-slate-400 font-medium normal-case">(Optional)</span>}
    </label>
    <div className="relative">
      {Icon && <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        readOnly={readOnly}
        className={`w-full py-2.5 rounded-xl border text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 transition-all ${Icon ? 'pl-9 pr-4' : 'px-4'} ${
          readOnly
            ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
            : error
            ? 'border-red-300 bg-red-50 focus:ring-red-200'
            : 'border-slate-200 bg-slate-50 focus:border-blue-400 focus:ring-blue-100 focus:bg-white'
        }`}
      />
    </div>
    {hint && !error && <p className="text-slate-400 text-[11px] font-medium mt-1">{hint}</p>}
    {error && (
      <p className="text-red-500 text-[11px] font-semibold mt-1.5 flex items-center gap-1">
        <AlertCircle size={11} /> {error}
      </p>
    )}
  </div>
);

// ─── SECTION DIVIDER ─────────────────────────────────────────────────────────
const SectionDivider = ({ label }) => (
  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
    <span className="w-4 h-px bg-blue-200 inline-block" />
    {label}
    <span className="flex-1 h-px bg-blue-100 inline-block" />
  </p>
);

// ─── ADD / EDIT USER MODAL ────────────────────────────────────────────────────
const UserModal = ({ open, onClose, onSave, editData }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(editData);

  useEffect(() => {
    if (open) {
      setForm(editData ? {
        lastName:        editData.lastName        || '',
        firstName:       editData.firstName       || '',
        middleInitial:   editData.middleInitial   || '',
        idNumber:        editData.idNumber        || '',
        contactNumber:   editData.contactNumber   || '',
        email:           editData.email           || '',
        tempPassword:    '',
        birthDate:       editData.birthDate       || '',
        role:            editData.role            || '',
        position:        editData.position        || '',
        assignedCategories: getAssignedCategories(editData),
        status:          editData.status          || MEMBER_STATUS.active,
        governmentIdUrl: editData.governmentIdUrl || null,
        selfieUrl:       editData.selfieUrl       || null,
      } : EMPTY_FORM);
      setErrors(EMPTY_ERRORS);
    }
  }, [open, editData]);

  // Auto-set position when role is Admin
  useEffect(() => {
    if (form.role === 'Admin') {
      setForm((f) => ({ ...f, position: 'IT Staff' }));
    } else if (form.role === 'Staff' && form.position === 'IT Staff') {
      setForm((f) => ({ ...f, position: '' }));
    }
  }, [form.role, form.position]);

  const setField = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e = { ...EMPTY_ERRORS };
    let valid = true;

    if (!form.lastName.trim())     { e.lastName = 'Last Name is required.'; valid = false; }
    if (!form.firstName.trim())    { e.firstName = 'First Name is required.'; valid = false; }
    if (form.middleInitial && !/^[a-zA-Z]$/.test(form.middleInitial)) {
      e.middleInitial = 'Must be a single alphabetical character.'; valid = false;
    }
    if (!form.idNumber.trim())     { e.idNumber = 'ID Number is required.'; valid = false; }
    if (!form.contactNumber.trim()) { e.contactNumber = 'Contact Number is required.'; valid = false; }
    else if (!/^[0-9+\-\s()]{7,15}$/.test(form.contactNumber.trim())) {
      e.contactNumber = 'Enter a valid contact number.'; valid = false;
    }
    if (!form.email.trim())        { e.email = 'Email is required.'; valid = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Enter a valid email address.'; valid = false;
    }
    if (!isEdit && !form.tempPassword.trim()) {
      e.tempPassword = 'Temporary password is required.';
      valid = false;
    } else if (!isEdit && form.tempPassword.length < 6) {
      e.tempPassword = 'Password must be at least 6 characters.';
      valid = false;
    }
    if (!form.birthDate)           { e.birthDate = 'Birth Date is required.'; valid = false; }
    if (!form.role)                { e.role = 'Role is required.'; valid = false; }
    if (!form.position)            { e.position = 'Position is required.'; valid = false; }
    if (form.role !== 'applicant' && form.assignedCategories.length === 0) {
      e.assignedCategories = 'Assign at least one application category.';
      valid = false;
    }
    if (!form.governmentIdUrl)     { e.governmentIdUrl = 'Government ID upload is required.'; valid = false; }
    if (!form.selfieUrl)           { e.selfieUrl = 'Selfie upload is required.'; valid = false; }

    setErrors(e);
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSave(form, editData?.id);
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      alert(err.code === 'auth/email-already-in-use'
        ? 'An account already exists with this email address.'
        : `Failed to save user: ${err.message || 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const positionOptions = POSITION_MAP[form.role] || [];
  const isAdminRole = form.role === 'Admin';
  const toggleCategory = (categoryId) => {
    setField(
      'assignedCategories',
      form.assignedCategories.includes(categoryId)
        ? form.assignedCategories.filter((id) => id !== categoryId)
        : [...form.assignedCategories, categoryId]
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col z-10"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <UserPlus size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base">{isEdit ? 'Edit User' : 'Add New User'}</h2>
                  <p className="text-blue-100 text-[11px] font-medium">
                    {isEdit ? 'Update user information' : 'Fill in all required fields to create a user'}
                  </p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Progress pills */}
            <div className="px-6 pt-4 pb-2 bg-white border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                {[
                  { label: 'Personal', icon: Users },
                  { label: 'Contact', icon: Phone },
                  { label: 'Role', icon: Shield },
                  { label: 'Documents', icon: CreditCard },
                ].map(({ label, icon: Icon }, i) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
                      <Icon size={11} />
                      <span className="text-[10px] font-bold">{label}</span>
                    </div>
                    {i < 3 && <div className="w-4 h-px bg-slate-200" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              <form id="user-form" onSubmit={handleSubmit} noValidate>

                {/* ── PERSONAL INFO ── */}
                <div className="mb-6">
                  <SectionDivider label="Personal Information" />
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <FormInput id="lastName" label="Last Name" value={form.lastName}
                      onChange={(e) => setField('lastName', e.target.value)}
                      placeholder="e.g. Dela Cruz" error={errors.lastName} />
                    <FormInput id="firstName" label="First Name" value={form.firstName}
                      onChange={(e) => setField('firstName', e.target.value)}
                      placeholder="e.g. Juan" error={errors.firstName} />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* MI */}
                    <div>
                      <label htmlFor="middleInitial" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        MI <span className="text-slate-400 font-medium normal-case">(Optional)</span>
                      </label>
                      <input
                        id="middleInitial"
                        type="text"
                        maxLength={1}
                        value={form.middleInitial}
                        onChange={(e) => setField('middleInitial', e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 1))}
                        placeholder="A"
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 transition-all text-center uppercase ${
                          errors.middleInitial
                            ? 'border-red-300 bg-red-50 focus:ring-red-200'
                            : 'border-slate-200 bg-slate-50 focus:border-blue-400 focus:ring-blue-100 focus:bg-white'
                        }`}
                      />
                      {errors.middleInitial && (
                        <p className="text-red-500 text-[11px] font-semibold mt-1.5 flex items-center gap-1">
                          <AlertCircle size={11} /> {errors.middleInitial}
                        </p>
                      )}
                    </div>

                    {/* Birth Date */}
                    <div className="col-span-2">
                      <FormInput id="birthDate" label="Birth Date" type="date"
                        value={form.birthDate}
                        onChange={(e) => setField('birthDate', e.target.value)}
                        error={errors.birthDate} icon={Calendar} />
                    </div>
                  </div>
                </div>

                {/* ── CONTACT INFO ── */}
                <div className="mb-6">
                  <SectionDivider label="Contact Information" />
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <FormInput id="idNumber" label="ID Number" value={form.idNumber}
                      onChange={(e) => setField('idNumber', e.target.value)}
                      placeholder="e.g. 2024-00001" error={errors.idNumber} icon={Hash} />
                    <FormInput id="contactNumber" label="Active Contact Number" value={form.contactNumber}
                      onChange={(e) => setField('contactNumber', e.target.value.replace(/[^0-9+\-\s()]/g, ''))}
                      placeholder="e.g. 09171234567" error={errors.contactNumber} icon={Phone}
                      hint="Numbers, +, -, spaces, and parentheses only." />
                  </div>
                  <FormInput id="email" label="Email Address" type="email" value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="e.g. juan@mswdo.gov.ph" error={errors.email} icon={Mail} />
                  {!isEdit && (
                    <div className="mt-4">
                      <FormInput
                        id="tempPassword"
                        label="Temporary Password"
                        type="password"
                        value={form.tempPassword}
                        onChange={(e) => setField('tempPassword', e.target.value)}
                        placeholder="Minimum 6 characters"
                        error={errors.tempPassword}
                        icon={Lock}
                        hint="Used for the new account's first login. Do not store this password elsewhere."
                      />
                    </div>
                  )}
                </div>

                {/* ── ROLE & POSITION ── */}
                <div className="mb-6">
                  <SectionDivider label="Role & Position" />
                  <div className="grid grid-cols-2 gap-4">
                    {/* Role */}
                    <div>
                      <label htmlFor="role" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        Role <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select id="role" value={form.role}
                          onChange={(e) => setField('role', e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium appearance-none focus:outline-none focus:ring-2 transition-all pr-9 ${
                            errors.role ? 'border-red-300 bg-red-50 focus:ring-red-200 text-slate-800'
                              : 'border-slate-200 bg-slate-50 focus:border-blue-400 focus:ring-blue-100 focus:bg-white text-slate-800'
                          } ${!form.role ? 'text-slate-400' : ''}`}>
                          <option value="" disabled>Select role…</option>
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      {errors.role && (
                        <p className="text-red-500 text-[11px] font-semibold mt-1.5 flex items-center gap-1">
                          <AlertCircle size={11} /> {errors.role}
                        </p>
                      )}
                    </div>

                    {/* Position */}
                    <div>
                      <label htmlFor="position" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        Position <span className="text-red-500">*</span>
                      </label>
                      {isAdminRole ? (
                        <div className="relative">
                          <input id="position" type="text" value="IT Staff" readOnly
                            className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700 focus:outline-none cursor-not-allowed pr-16" />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Auto
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <select id="position" value={form.position}
                            onChange={(e) => setField('position', e.target.value)}
                            disabled={!form.role}
                            className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium appearance-none focus:outline-none focus:ring-2 transition-all pr-9 disabled:opacity-40 disabled:cursor-not-allowed ${
                              errors.position ? 'border-red-300 bg-red-50 focus:ring-red-200 text-slate-800'
                                : 'border-slate-200 bg-slate-50 focus:border-blue-400 focus:ring-blue-100 focus:bg-white text-slate-800'
                            } ${!form.position ? 'text-slate-400' : ''}`}>
                            <option value="" disabled>{form.role ? 'Select position…' : 'Select role first'}</option>
                            {positionOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      )}
                      {errors.position && (
                        <p className="text-red-500 text-[11px] font-semibold mt-1.5 flex items-center gap-1">
                          <AlertCircle size={11} /> {errors.position}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Role info callout */}
                  {form.role && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-start gap-2 ${
                        isAdminRole ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                      <Shield size={13} className="mt-0.5 shrink-0" />
                      {isAdminRole
                        ? 'Admin role is automatically assigned to IT Staff position.'
                        : "Staff role can be assigned to: Senior Citizen, PWD, Women's, or Youth."}
                    </motion.div>
                  )}
                </div>

                {/* ── DOCUMENT VERIFICATION ── */}
                <div className="mb-6">
                  <SectionDivider label="Application Category Access" />
                  <div className="grid grid-cols-2 gap-3">
                    {CATEGORY_OPTIONS.map(({ id, label }) => {
                      const checked = form.assignedCategories.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleCategory(id)}
                          className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                            checked
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/40'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {checked && <Check size={11} />}
                          </span>
                          <span className="text-xs font-bold">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.assignedCategories && (
                    <p className="text-red-500 text-[11px] font-semibold mt-1.5 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.assignedCategories}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 font-medium mt-2">
                    This controls which applications the account can view, approve, or reject.
                  </p>
                </div>

                <div className="mb-6">
                  <SectionDivider label="Document Verification" />
                  <div className="grid grid-cols-2 gap-4">
                    <ImageUploadField id="govId" label="Government ID"
                      value={form.governmentIdUrl}
                      onChange={(url) => setField('governmentIdUrl', url)}
                      error={errors.governmentIdUrl} />
                    <ImageUploadField id="selfie" label="Selfie Verification"
                      value={form.selfieUrl}
                      onChange={(url) => setField('selfieUrl', url)}
                      error={errors.selfieUrl} />
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-2 flex items-center gap-1.5">
                    <Shield size={11} className="text-green-500" />
                    Images are securely stored in Cloudinary. URLs are saved to Firestore.
                  </p>
                </div>

                {/* Status (edit only) */}
                {isEdit && (
                  <div className="mb-2">
                    <SectionDivider label="Account Status" />
                    <div className="flex items-center gap-3">
                      {STATUS_OPTIONS.map((s) => (
                        <button key={s} type="button" onClick={() => setField('status', s)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                            form.status === s
                              ? s === MEMBER_STATUS.active ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-red-400 bg-red-50 text-red-700'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                          }`}>
                          <span className={`w-2 h-2 rounded-full ${s === MEMBER_STATUS.active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0 rounded-b-2xl">
              <p className="text-[11px] text-slate-400 font-medium">
                <span className="text-red-400">*</span> Required fields
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" form="user-form" disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all shadow-md shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : <><Check size={14} /> {isEdit ? 'Save Changes' : 'Create User'}</>}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ─── VIEW DETAILS MODAL ───────────────────────────────────────────────────────
const ViewDetailsModal = ({ open, onClose, user }) => {
  if (!open || !user) return null;
  const fullName = [user.firstName, user.middleInitial ? user.middleInitial + '.' : '', user.lastName].filter(Boolean).join(' ');
  const categoryLabels = getAssignedCategories(user).map(getCategoryDisplayName).join(', ');

  const InfoItem = ({ label, value, className = '' }) => (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${className || 'text-slate-800'}`}>{value || '—'}</p>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', duration: 0.4 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-extrabold text-lg">
                  {((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-white font-bold text-base">{fullName}</h2>
                  <p className="text-indigo-200 text-[11px] font-medium">{user.position} · {user.role}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Personal Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Last Name" value={user.lastName} />
                  <InfoItem label="First Name" value={user.firstName} />
                  <InfoItem label="Middle Initial" value={user.middleInitial} />
                  <InfoItem label="Birth Date" value={user.birthDate ? new Date(user.birthDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'} />
                </div>
              </div>

              {/* Contact */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Contact Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="ID Number" value={user.idNumber} />
                  <InfoItem label="Contact Number" value={user.contactNumber} />
                  <div className="col-span-2">
                    <InfoItem label="Email Address" value={user.email} />
                  </div>
                </div>
              </div>

              {/* Role */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Role & Status</p>
                <div className="grid grid-cols-3 gap-4">
                  <InfoItem label="Role" value={user.role} />
                  <InfoItem label="Position" value={user.position} />
                  <InfoItem label="Status" value={user.status}
                    className={user.status === MEMBER_STATUS.active ? 'text-emerald-600' : 'text-red-500'} />
                </div>
                <div className="mt-4">
                  <InfoItem label="Application Category Access" value={categoryLabels} />
                </div>
              </div>

              {/* Dates */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Created</p>
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Calendar size={11} className="text-slate-400" />
                    {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Last Updated</p>
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock size={11} className="text-slate-400" />
                    {user.updatedAt?.toDate ? user.updatedAt.toDate().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </p>
                </div>
              </div>

              {/* Documents */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Verification Documents</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Government ID', url: user.governmentIdUrl },
                    { label: 'Selfie', url: user.selfieUrl },
                  ].map(({ label, url }) => (
                    <div key={label}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="block group">
                          <img src={url} alt={label} loading="lazy" decoding="async" className="w-full h-32 object-cover rounded-xl border border-slate-200 group-hover:opacity-80 transition-opacity" />
                          <p className="text-[10px] text-blue-500 font-semibold mt-1 text-center">Click to view full size ↗</p>
                        </a>
                      ) : (
                        <div className="w-full h-32 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200">
                          No file uploaded
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ─── DELETE DIALOG ────────────────────────────────────────────────────────────
const DeleteDialog = ({ open, onClose, onConfirm, user, loading }) => {
  if (!open) return null;
  const fullName = user ? `${user.firstName} ${user.lastName}` : '';
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2">Delete User?</h3>
              <p className="text-sm text-slate-500 font-medium mb-6">
                Are you sure you want to delete <span className="font-bold text-slate-700">{fullName}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={onConfirm} disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {loading ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ─── BADGES ───────────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const s = {
    'Admin':       'bg-blue-50 text-blue-700 border-blue-100',
    'Staff':       'bg-indigo-50 text-indigo-700 border-indigo-100',
    'Super Admin': 'bg-purple-50 text-purple-700 border-purple-100',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${s[role] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {role}
    </span>
  );
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
    status === MEMBER_STATUS.active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${status === MEMBER_STATUS.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
    {status}
  </span>
);

const StatCard = ({ label, count, color }) => {
  const c = { purple: 'text-purple-600', blue: 'text-blue-600', indigo: 'text-indigo-600', teal: 'text-teal-600', orange: 'text-orange-600' };
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <p className={`text-2xl font-extrabold ${c[color] || 'text-slate-800'}`}>{count}</p>
      <p className="text-xs font-bold text-slate-600 mt-1">{label}</p>
      <p className="text-[10px] text-slate-400 font-medium mt-0.5">users</p>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const UserManagement = () => {
  const navigate = useNavigate();
  const [userName, setUserName]     = useState('Admin');
  const [userInitials, setUserInitials] = useState('A');
  const [userRole, setUserRole]     = useState('');

  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser]         = useState(null);
  const [viewUser, setViewUser]         = useState(null);
  const [deleteUser, setDeleteUser]     = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/'); return; }
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.users, user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setUserRole(d.role || 'Admin');
          const name = [d.firstName, d.lastName].filter(Boolean).join(' ') || user.email;
          setUserName(name);
          setUserInitials(((d.firstName?.[0] || '') + (d.lastName?.[0] || '')).toUpperCase() || 'A');
        }
      } catch (e) { console.error(e); }
    });
    return () => unsub();
  }, [navigate]);

  // Fetch
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.users));
      setUsers(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => createdAtMillis(b) - createdAtMillis(a))
      );
    } catch (e) {
      console.error('Fetch users:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Save (add or edit)
  const handleSave = async (formData, id) => {
    const now = serverTimestamp();
    const payload = {
      lastName:        formData.lastName.trim(),
      firstName:       formData.firstName.trim(),
      middleInitial:   formData.middleInitial?.toUpperCase() || '',
      idNumber:        formData.idNumber.trim(),
      contactNumber:   formData.contactNumber.trim(),
      email:           formData.email.trim().toLowerCase(),
      birthDate:       formData.birthDate,
      role:            formData.role,
      position:        formData.position,
      assignedCategories: formData.assignedCategories,
      status:          formData.status || MEMBER_STATUS.active,
      governmentIdUrl: formData.governmentIdUrl || '',
      selfieUrl:       formData.selfieUrl || '',
      updatedAt:       now,
    };
    if (id) {
      await updateDoc(doc(db, COLLECTIONS.users, id), payload);
    } else {
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        payload.email,
        formData.tempPassword
      );

      await setDoc(doc(db, COLLECTIONS.users, credential.user.uid), {
        ...payload,
        authUid: credential.user.uid,
        requiresPasswordChange: true,
        createdAt: now,
      });
    }
    await fetchUsers();
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, COLLECTIONS.users, deleteUser.id));
      setDeleteUser(null);
      await fetchUsers();
    } catch (e) { console.error(e); }
    finally { setDeleteLoading(false); }
  };

  // Toggle Active / Inactive
  const handleToggleLock = async (user) => {
    const newStatus = user.status === MEMBER_STATUS.active ? MEMBER_STATUS.inactive : MEMBER_STATUS.active;
    try {
      await updateDoc(doc(db, COLLECTIONS.users, user.id), { status: newStatus, updatedAt: serverTimestamp() });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch (e) { console.error('Toggle lock error:', e); }
  };

  const handleLogout = async () => { await signOut(auth); navigate('/'); };

  const filtered = users.filter((u) => {
    const name = `${u.firstName || ''} ${u.lastName || ''} ${u.idNumber || ''} ${u.email || ''}`.toLowerCase();
    return (!search || name.includes(search.toLowerCase()))
      && (!roleFilter || u.role === roleFilter);
  });

  const stats = [
    { label: 'Super Admin', color: 'purple', count: users.filter((u) => u.role === 'Super Admin').length },
    { label: 'Admin Staff',  color: 'blue',   count: users.filter((u) => u.role === 'Admin').length },
    { label: 'MSWDO Staff',  color: 'indigo',  count: users.filter((u) => u.role === 'Staff').length },
    { label: 'Barangay/LGU', color: 'teal',   count: users.filter((u) => u.position === 'Barangay/LGU').length },
    { label: 'RO7',          color: 'orange',  count: users.filter((u) => u.position === 'RO7').length },
  ];

  const fmtDate = (ts) => {
    if (!ts) return '—';
    if (ts.toDate) return ts.toDate().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    return '—';
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

      {/* ── SIDEBAR ── */}
      <div className="w-64 bg-[#102a43] flex flex-col shadow-xl z-20 shrink-0">
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <ShieldIcon />
          </div>
          <div>
            <h1 className="text-white font-bold tracking-wide text-sm">MSWDO</h1>
            <p className="text-blue-400 text-[10px] uppercase font-bold tracking-widest">Admin Panel</p>
          </div>
        </div>

        <div className="px-6 py-2 flex-1 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4">Navigation</p>
          <div className="space-y-0.5">
            <NavItem icon={Menu}         label="Dashboard"       onClick={() => navigate('/dashboard')} />
            <NavItem icon={Users}        label="Membership" onClick={() => navigate('/membership')} />
            <NavItem icon={ClipboardList} label="Applications"   onClick={() => navigate('/applications')} />
            <NavItem icon={Gift}         label="Benefits" onClick={() => navigate('/benefits')} />
            <NavItem icon={FileText}     label="Record Tracking" onClick={() => navigate('/audit')} />
            <NavItem icon={XCircle}      label="Termination" onClick={() => navigate('/termination')} />
            <NavItem icon={Bell}         label="Announcements" onClick={() => navigate('/announcements')} />
            <NavItem icon={BarChart2}    label="Reports" />
          </div>
          <div className="mt-8 mb-4 h-px w-full bg-white/5" />
          <div className="space-y-0.5">
            <NavItem icon={Database}    label="CMS"                badge="SA" />
            <NavItem icon={Fingerprint} label="Audit & Monitoring" badge="SA" onClick={() => navigate('/audit')} />
            <NavItem icon={UserPlus}    label="User Management"    badge="SA" active onClick={() => navigate('/user-management')} />
            <NavItem icon={Settings}    label="Settings"           badge="SA" />
          </div>
        </div>

        <div className="p-6 shrink-0">
          <button onClick={handleLogout} className="flex items-center space-x-3 text-slate-400 hover:text-red-400 transition-colors w-full">
            <LogOut size={18} />
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-800">User Management</h2>
              <p className="text-xs text-slate-500 font-medium tracking-wide">Municipal Social Welfare and Development Office</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Quick search..."
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all w-64 font-medium" />
            </div>
            <button className="relative text-slate-400 hover:text-slate-600">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800">{userName}</span>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{userRole || 'Admin'}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center border-2 border-blue-100 shadow-sm">
                {userInitials}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-8">

          {/* Title + CTA */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">User Management</h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">Manage system access, roles, and permissions</p>
            </div>
            <button id="add-user-btn" onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all shadow-md shadow-blue-500/20">
              <UserPlus size={16} /> + Add User
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {stats.map((s) => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search by name, ID, or email…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" />
              </div>
              <div className="relative">
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                  <option value="">All Roles</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Name', 'ID No.', 'Contact', 'Role', 'Position', 'Status', 'Created', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-16">
                      <Loader2 size={24} className="animate-spin text-blue-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-400 font-medium">Loading users…</p>
                    </td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-16">
                      <Users size={32} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400 font-medium">No users found</p>
                      <button onClick={() => setShowAddModal(true)} className="mt-3 text-blue-500 text-xs font-bold hover:underline">
                        Add the first user →
                      </button>
                    </td></tr>
                  ) : (
                    filtered.map((u, i) => {
                      const initials = ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase() || '?';
                      const fullName = [u.firstName, u.middleInitial ? u.middleInitial + '.' : '', u.lastName].filter(Boolean).join(' ');
                      return (
                        <motion.tr key={u.id}
                          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-slate-50/80 transition-colors group">
                          {/* Name */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                                {initials}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{fullName}</p>
                                <p className="text-[11px] text-slate-400 font-medium">{u.email || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">{u.idNumber || '—'}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-semibold text-slate-600">{u.contactNumber || '—'}</span>
                          </td>
                          <td className="px-5 py-4"><RoleBadge role={u.role} /></td>
                          <td className="px-5 py-4"><span className="text-sm font-semibold text-slate-600">{u.position || '—'}</span></td>
                          <td className="px-5 py-4"><StatusBadge status={u.status || MEMBER_STATUS.active} /></td>
                          <td className="px-5 py-4"><span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{fmtDate(u.createdAt)}</span></td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button id={`view-${u.id}`} onClick={() => setViewUser(u)} title="View details"
                                className="w-8 h-8 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors">
                                <Eye size={14} />
                              </button>
                              <button id={`edit-${u.id}`} onClick={() => setEditUser(u)} title="Edit"
                                className="w-8 h-8 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 flex items-center justify-center transition-colors">
                                <Edit3 size={14} />
                              </button>
                              <button id={`lock-${u.id}`} onClick={() => handleToggleLock(u)}
                                title={u.status === MEMBER_STATUS.active ? 'Deactivate account' : 'Activate account'}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                  u.status === MEMBER_STATUS.active
                                    ? 'hover:bg-orange-50 text-slate-400 hover:text-orange-500'
                                    : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-500'
                                }`}>
                                <Lock size={14} />
                              </button>
                              <button id={`delete-${u.id}`} onClick={() => setDeleteUser(u)} title="Delete"
                                className="w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-400 font-medium">
                  Showing <span className="font-bold text-slate-600">{filtered.length}</span> of{' '}
                  <span className="font-bold text-slate-600">{users.length}</span> users
                </p>
              </div>
            )}
          </div>

          {/* Security Settings */}
          <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">Security Settings</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: 'Session Timeout',  value: '30 minutes',          icon: Clock },
                { title: 'Password Policy',  value: '8+ chars, mixed case', icon: Lock },
                { title: 'Two-Factor Auth',  value: 'Enabled for Admins',  icon: Shield },
              ].map(({ title, value, icon: Icon }) => (
                <div key={title} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Icon size={15} className="text-slate-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-700">{title}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{value}</p>
                    </div>
                  </div>
                  <button className="text-[11px] font-bold text-blue-500 hover:text-blue-700 transition-colors">Edit</button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── MODALS ── */}
      <UserModal open={showAddModal}       onClose={() => setShowAddModal(false)} onSave={handleSave} editData={null} />
      <UserModal open={Boolean(editUser)}  onClose={() => setEditUser(null)}      onSave={handleSave} editData={editUser} />
      <ViewDetailsModal open={Boolean(viewUser)}   onClose={() => setViewUser(null)}  user={viewUser} />
      <DeleteDialog     open={Boolean(deleteUser)} onClose={() => setDeleteUser(null)} onConfirm={handleDelete} user={deleteUser} loading={deleteLoading} />
    </div>
  );
};

// Mini icon
const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export default UserManagement;
