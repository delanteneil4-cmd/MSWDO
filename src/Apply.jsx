import React, { useState } from 'react';
import { 
  User, MapPin, Calendar, Phone, Mail, FileText, Upload, 
  ChevronRight, ChevronLeft, CheckCircle2, ShieldCheck, 
  Heart, Users, AlertCircle, Briefcase, GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Apply = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Common Fields
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', middleName: '', dob: '', gender: '', civilStatus: '', address: '', contactNumber: '', email: '',
    placeOfBirth: '', occupation: '',
    // Senior Specific
    citizenship: '', religion: '', nameOfBenefactor: '', pensionSource: '', livingArrangement: '', rentedYears: '', annualIncome: '', regularSupport: 'no', typeOfSupport: '', howOftenSupport: '', withDisability: 'no', disabilityDetails: '', hasExistingIllness: 'no', illnessDetails: '', familyComposition: [{ name: '', relation: '', age: '', status: '', occupation: '', income: '' }],
    // PWD Specific
    applicationType: 'new', pwdNumber: '', dateApplied: '',
    disabilityType: '', disabilityCause: '',
    statusOfEmployment: '', categoryOfEmployment: '', typeOfEmployment: '', occupationCategory: '',
    organizationAffiliated: '', contactPerson: '', officeAddress: '', officeTelNo: '',
    sssNo: '', gsisNo: '', pagIbigNo: '', philHealthNo: '',
    guardianName: '', accomplishedBy: 'applicant', certifyingPhysician: '',
    // Women Specific
    dateOfRegistration: '', spouseName: '', fatherName: '', motherName: '', isSoloParent: 'no', numberOfChildren: '', sector: '',
    // Youth Specific
    educationalAttainment: '', schoolName: '', outOfSchool: 'no',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const categories = [
    { id: 'senior', name: 'Senior Citizen', icon: User, color: 'blue', desc: 'Aged 60 years and above' },
    { id: 'pwd', name: 'Person with Disability', icon: Heart, color: 'green', desc: 'Physical or mental impairment' },
    { id: 'women', name: "Women's Welfare", icon: Users, color: 'purple', desc: 'Maternal, solo parents, and women in need' },
    { id: 'youth', name: 'Youth Welfare', icon: GraduationCap, color: 'orange', desc: 'Aged 15 to 30 years old' }
  ];

  const handleNext = () => {
    if (step === 1 && !category) {
      alert("Please select a category first.");
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setShowSuccess(true);
    }, 2000);
  };

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Basic Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase">First Name *</label>
          <input required type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase">Middle Name</label>
          <input type="text" name="middleName" value={formData.middleName} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase">Last Name *</label>
          <input required type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase">Date of Birth *</label>
          <input required type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase">Gender *</label>
          <select required name="gender" value={formData.gender} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase">Civil Status *</label>
          <select required name="civilStatus" value={formData.civilStatus} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
            <option value="">Select Status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widowed">Widowed</option>
            <option value="Separated">Separated</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold text-slate-500 uppercase">Complete Address *</label>
        <textarea required rows="2" name="address" value={formData.address} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"></textarea>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase">Contact Number *</label>
          <input required type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase">Email Address (Optional)</label>
          <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
        </div>
      </div>
    </div>
  );

  const renderCategorySpecificInfo = () => {
    switch (category) {
      case 'senior':
        return (
          <div className="space-y-8">
            {/* I. General Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800 border-b pb-2">I. General Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Citizenship</label>
                  <input type="text" name="citizenship" value={formData.citizenship} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Religion</label>
                  <input type="text" name="religion" value={formData.religion} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Birthplace</label>
                  <input type="text" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Name of Benefactor</label>
                  <input type="text" name="nameOfBenefactor" value={formData.nameOfBenefactor} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Receiving Pension From?</label>
                  <select name="pensionSource" value={formData.pensionSource} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                    <option value="">None / Select</option>
                    <option value="gsis">GSIS</option>
                    <option value="sss">SSS</option>
                    <option value="pvao">PVAO</option>
                    <option value="others">Others</option>
                    <option value="on_process">On Process</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Living Arrangement</label>
                  <div className="flex gap-2">
                    <select name="livingArrangement" value={formData.livingArrangement} onChange={handleInputChange} className="flex-1 rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                      <option value="">Select Arrangement</option>
                      <option value="alone">Living Alone</option>
                      <option value="relatives">Living with Relatives</option>
                      <option value="owned">Owned House</option>
                      <option value="rented">Rented</option>
                    </select>
                    {formData.livingArrangement === 'rented' && (
                      <input type="number" name="rentedYears" placeholder="Yrs" value={formData.rentedYears} onChange={handleInputChange} className="w-20 rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* II. Economic Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800 border-b pb-2">II. Economic Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Occupation</label>
                  <input type="text" name="occupation" value={formData.occupation} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Annual Income</label>
                  <input type="text" name="annualIncome" value={formData.annualIncome} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Regular Support from Family?</label>
                  <select name="regularSupport" value={formData.regularSupport} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
                {formData.regularSupport === 'yes' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">Type of Support</label>
                      <select name="typeOfSupport" value={formData.typeOfSupport} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                        <option value="">Select Type</option>
                        <option value="cash">Cash</option>
                        <option value="in_kind">In-Kind</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">How Often?</label>
                      <input type="text" name="howOftenSupport" value={formData.howOftenSupport} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* III. Health Condition */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800 border-b pb-2">III. Health Condition</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">With Disability?</label>
                  <div className="flex gap-2">
                    <select name="withDisability" value={formData.withDisability} onChange={handleInputChange} className="w-24 rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                    {formData.withDisability === 'yes' && (
                      <input type="text" name="disabilityDetails" placeholder="Please specify" value={formData.disabilityDetails} onChange={handleInputChange} className="flex-1 rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Has Existing Illness?</label>
                  <div className="flex gap-2">
                    <select name="hasExistingIllness" value={formData.hasExistingIllness} onChange={handleInputChange} className="w-24 rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                    {formData.hasExistingIllness === 'yes' && (
                      <input type="text" name="illnessDetails" placeholder="Please specify" value={formData.illnessDetails} onChange={handleInputChange} className="flex-1 rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* IV. Family Composition */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800 border-b pb-2 flex justify-between items-center">
                <span>IV. Family Composition</span>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, familyComposition: [...prev.familyComposition, { name: '', relation: '', age: '', status: '', occupation: '', income: '' }] }))} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold hover:bg-blue-100">+ Add Row</button>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse border border-slate-200">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="border p-2 font-bold min-w-[120px]">Name</th>
                      <th className="border p-2 font-bold min-w-[80px]">Relation</th>
                      <th className="border p-2 font-bold w-16">Age</th>
                      <th className="border p-2 font-bold min-w-[80px]">Status</th>
                      <th className="border p-2 font-bold min-w-[100px]">Occupation</th>
                      <th className="border p-2 font-bold min-w-[80px]">Income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.familyComposition.map((member, index) => (
                      <tr key={index}>
                        <td className="border p-1"><input type="text" value={member.name} onChange={(e) => { const newFam = [...formData.familyComposition]; newFam[index].name = e.target.value; setFormData(prev => ({...prev, familyComposition: newFam})) }} className="w-full text-xs p-1 outline-none" /></td>
                        <td className="border p-1"><input type="text" value={member.relation} onChange={(e) => { const newFam = [...formData.familyComposition]; newFam[index].relation = e.target.value; setFormData(prev => ({...prev, familyComposition: newFam})) }} className="w-full text-xs p-1 outline-none" /></td>
                        <td className="border p-1"><input type="text" value={member.age} onChange={(e) => { const newFam = [...formData.familyComposition]; newFam[index].age = e.target.value; setFormData(prev => ({...prev, familyComposition: newFam})) }} className="w-full text-xs p-1 outline-none" /></td>
                        <td className="border p-1"><input type="text" value={member.status} onChange={(e) => { const newFam = [...formData.familyComposition]; newFam[index].status = e.target.value; setFormData(prev => ({...prev, familyComposition: newFam})) }} className="w-full text-xs p-1 outline-none" /></td>
                        <td className="border p-1"><input type="text" value={member.occupation} onChange={(e) => { const newFam = [...formData.familyComposition]; newFam[index].occupation = e.target.value; setFormData(prev => ({...prev, familyComposition: newFam})) }} className="w-full text-xs p-1 outline-none" /></td>
                        <td className="border p-1"><input type="text" value={member.income} onChange={(e) => { const newFam = [...formData.familyComposition]; newFam[index].income = e.target.value; setFormData(prev => ({...prev, familyComposition: newFam})) }} className="w-full text-xs p-1 outline-none" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'pwd':
        return (
          <div className="space-y-8">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">PWD Application Details (DOH Form 4.0)</h3>
            
            {/* I. Application Info */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-700">Application Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Application Type *</label>
                  <select required name="applicationType" value={formData.applicationType} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                    <option value="new">New Applicant</option>
                    <option value="renewal">Renewal</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">PWD Number (If Renewal)</label>
                  <input type="text" name="pwdNumber" value={formData.pwdNumber} onChange={handleInputChange} placeholder="RR-PPMM-BBB-NNNNNNN" className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Date Applied</label>
                  <input type="date" name="dateApplied" value={formData.dateApplied} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
              </div>
            </div>

            {/* II. Disability Info */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-700">Disability Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Type of Disability *</label>
                  <select required name="disabilityType" value={formData.disabilityType} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                    <option value="">Select Disability Type</option>
                    <option value="deaf">Deaf/Hard of Hearing</option>
                    <option value="intellectual">Intellectual Disability</option>
                    <option value="learning">Learning Disability</option>
                    <option value="mental">Mental Disability</option>
                    <option value="physical">Physical Disability (Orthopedic)</option>
                    <option value="psychosocial">Psychosocial Disability</option>
                    <option value="speech">Speech and Language Impairment</option>
                    <option value="visual">Visual Disability</option>
                    <option value="cancer">Cancer (RA11215)</option>
                    <option value="rare_disease">Rare Disease (RA10747)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Cause of Disability *</label>
                  <select required name="disabilityCause" value={formData.disabilityCause} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                    <option value="">Select Cause</option>
                    <optgroup label="Congenital / Inborn">
                      <option value="congenital_adhd">ADHD</option>
                      <option value="congenital_cp">Cerebral Palsy</option>
                      <option value="congenital_down">Down Syndrome</option>
                      <option value="congenital_others">Others</option>
                    </optgroup>
                    <optgroup label="Acquired">
                      <option value="acquired_chronic">Chronic Illness</option>
                      <option value="acquired_cp">Cerebral Palsy</option>
                      <option value="acquired_injury">Injury</option>
                      <option value="acquired_others">Others</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>

            {/* III. Employment & Occupation */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-700">Employment & Occupation</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Educational Attainment</label>
                  <select name="educationalAttainment" value={formData.educationalAttainment} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                    <option value="">Select Attainment</option>
                    <option value="none">None</option>
                    <option value="kindergarten">Kindergarten</option>
                    <option value="elementary">Elementary</option>
                    <option value="jhs">Junior High School</option>
                    <option value="shs">Senior High School</option>
                    <option value="college">College</option>
                    <option value="vocational">Vocational</option>
                    <option value="postgrad">Post Graduate Program</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Status of Employment</label>
                  <select name="statusOfEmployment" value={formData.statusOfEmployment} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                    <option value="">Select Status</option>
                    <option value="employed">Employed</option>
                    <option value="unemployed">Unemployed</option>
                    <option value="self_employed">Self-employed</option>
                  </select>
                </div>
                {formData.statusOfEmployment === 'employed' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">Category of Employment</label>
                      <select name="categoryOfEmployment" value={formData.categoryOfEmployment} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                        <option value="">Select Category</option>
                        <option value="government">Government</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">Types of Employment</label>
                      <select name="typeOfEmployment" value={formData.typeOfEmployment} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                        <option value="">Select Type</option>
                        <option value="permanent">Permanent/Regular</option>
                        <option value="seasonal">Seasonal</option>
                        <option value="casual">Casual</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Occupation Category</label>
                  <select name="occupationCategory" value={formData.occupationCategory} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                    <option value="">Select Occupation</option>
                    <option value="managers">Managers</option>
                    <option value="professionals">Professionals</option>
                    <option value="technical">Technical and Associate Professionals</option>
                    <option value="clerical">Clerical Support Workers</option>
                    <option value="service_sales">Service and Sales Workers</option>
                    <option value="agricultural">Skilled Agricultural, Forestry and Fishery Workers</option>
                    <option value="trade">Craft and Related Trade Workers</option>
                    <option value="plant_machine">Plant and Machine Operators and Assemblers</option>
                    <option value="elementary">Elementary Occupations</option>
                    <option value="armed_forces">Armed Forces Occupations</option>
                    <option value="others">Others</option>
                  </select>
                </div>
              </div>
            </div>

            {/* IV. Organization Info */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-700">Organization Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Organization Affiliated</label>
                  <input type="text" name="organizationAffiliated" value={formData.organizationAffiliated} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Contact Person</label>
                  <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Office Address</label>
                  <input type="text" name="officeAddress" value={formData.officeAddress} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Tel. Nos.</label>
                  <input type="text" name="officeTelNo" value={formData.officeTelNo} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
              </div>
            </div>

            {/* V. ID Reference No. */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-700">ID Reference Numbers</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">SSS No.</label>
                  <input type="text" name="sssNo" value={formData.sssNo} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">GSIS No.</label>
                  <input type="text" name="gsisNo" value={formData.gsisNo} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Pag-IBIG No.</label>
                  <input type="text" name="pagIbigNo" value={formData.pagIbigNo} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">PhilHealth No.</label>
                  <input type="text" name="philHealthNo" value={formData.philHealthNo} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
              </div>
            </div>

            {/* VI. Family Background & Signatories */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-700">Family Background & Accomplishment</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Father's Name (Last, First, Middle)</label>
                  <input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Mother's Name (Last, First, Middle)</label>
                  <input type="text" name="motherName" value={formData.motherName} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Guardian's Name (If applicable)</label>
                  <input type="text" name="guardianName" value={formData.guardianName} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Accomplished By</label>
                  <select name="accomplishedBy" value={formData.accomplishedBy} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                    <option value="applicant">Applicant</option>
                    <option value="guardian">Guardian</option>
                    <option value="representative">Representative</option>
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Name of Certifying Physician</label>
                  <input type="text" name="certifyingPhysician" value={formData.certifyingPhysician} onChange={handleInputChange} placeholder="Physician Name & License No." className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
              </div>
            </div>
          </div>
        );
      case 'women':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Women's Welfare Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Date of Registration</label>
                <input type="date" name="dateOfRegistration" value={formData.dateOfRegistration} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Place of Birth</label>
                <input type="text" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Educational Attainment</label>
                <input type="text" name="educationalAttainment" value={formData.educationalAttainment} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Name of Spouse</label>
                <input type="text" name="spouseName" value={formData.spouseName} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Name of Father</label>
                <input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Name of Mother</label>
                <input type="text" name="motherName" value={formData.motherName} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Are you a Solo Parent? *</label>
                <select required name="isSoloParent" value={formData.isSoloParent} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Number of Children</label>
                <input type="number" name="numberOfChildren" value={formData.numberOfChildren} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" min="0" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Current Occupation / Livelihood</label>
                <input type="text" name="occupation" value={formData.occupation} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
            </div>
          </div>
        );
      case 'youth':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Youth Welfare Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Educational Attainment *</label>
                <select required name="educationalAttainment" value={formData.educationalAttainment} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                  <option value="">Select Attainment</option>
                  <option value="elementary">Elementary Level</option>
                  <option value="highschool">High School Level</option>
                  <option value="college">College Level</option>
                  <option value="graduate">College Graduate</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Are you out-of-school? *</label>
                <select required name="outOfSchool" value={formData.outOfSchool} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
                  <option value="no">No, Currently Enrolled</option>
                  <option value="yes">Yes, Out of School Youth (OSY)</option>
                </select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Name of School (If applicable)</label>
                <input type="text" name="schoolName" value={formData.schoolName} onChange={handleInputChange} className="w-full rounded-lg py-2.5 px-3 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderDocumentUpload = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Documentary Requirements</h3>
      <p className="text-sm text-slate-500 mb-4">Please upload clear photos or scanned copies of the following documents. Formats allowed: JPG, PNG, PDF. Max size: 5MB per file.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {category === 'senior' ? (
          <>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer group">
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Upload size={20} />
              </div>
              <h4 className="font-bold text-slate-700 text-sm">1 Photocopy of Voter's I.D.</h4>
              <p className="text-xs text-slate-400 mt-1">Click to browse files</p>
            </div>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer group">
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Upload size={20} />
              </div>
              <h4 className="font-bold text-slate-700 text-sm">1 Photocopy of Birth Certificate</h4>
              <p className="text-xs text-slate-400 mt-1">(PSA/NSO)</p>
            </div>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer group md:col-span-2">
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Upload size={20} />
              </div>
              <h4 className="font-bold text-slate-700 text-sm">3 pcs 1x1 I.D. Picture (Latest)</h4>
              <p className="text-xs text-slate-400 mt-1">Upload clear photo</p>
            </div>
          </>
        ) : (
          <>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer group">
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Upload size={20} />
              </div>
              <h4 className="font-bold text-slate-700 text-sm">Valid ID (Any Govt ID)</h4>
              <p className="text-xs text-slate-400 mt-1">Click to browse files</p>
            </div>
            
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer group">
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Upload size={20} />
              </div>
              <h4 className="font-bold text-slate-700 text-sm">Barangay Clearance</h4>
              <p className="text-xs text-slate-400 mt-1">Click to browse files</p>
            </div>
          </>
        )}

        {category === 'pwd' && (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer group md:col-span-2">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Upload size={20} />
            </div>
            <h4 className="font-bold text-slate-700 text-sm">Medical Certificate / Assessment</h4>
            <p className="text-xs text-slate-400 mt-1">Proof of disability signed by a physician</p>
          </div>
        )}
      </div>

      <div className="mt-6 bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start space-x-3">
        <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-amber-800">Data Privacy Consent</h4>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            By submitting this form, you consent to the collection, processing, and storage of your personal data by the Municipal Social Welfare and Development Office for the purpose of welfare benefit assessment in accordance with the Data Privacy Act of 2012.
          </p>
          <div className="mt-3 flex items-center space-x-2">
            <input required type="checkbox" id="consent" className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500" />
            <label htmlFor="consent" className="text-xs font-medium text-amber-800">I have read and agree to the terms.</label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col items-center py-10 px-4">
      
      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-[24px] shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden"
            >
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h3>
              <p className="text-sm text-slate-500 mb-6">
                Your benefits application has been successfully submitted to the MSWDO. We will review your documents and notify you of the status.
              </p>
              <div className="bg-slate-50 rounded-xl p-4 mb-8 text-left border border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reference Number</p>
                <p className="text-lg font-mono font-bold text-slate-800">MSWDO-{Math.floor(100000 + Math.random() * 900000)}</p>
                <p className="text-xs text-slate-500 mt-2">Please save this reference number for tracking purposes.</p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="w-full bg-[#3b66df] text-white font-bold py-3.5 rounded-xl hover:bg-[#2b4cbf] transition-colors"
              >
                Return to Login
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#3b66df] text-white shadow-md">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">MSWDO Benefits Application</h1>
              <p className="text-xs text-slate-500 font-medium">Municipal Social Welfare Portal</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center"
          >
            Cancel
          </button>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10 rounded-full"></div>
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#3b66df] -z-10 rounded-full transition-all duration-500`} style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
            
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                  step >= num ? 'bg-[#3b66df] text-white shadow-md ring-4 ring-blue-50' : 'bg-white text-slate-400 border-2 border-slate-200'
                }`}>
                  {step > num ? <CheckCircle2 size={20} /> : num}
                </div>
                <span className={`text-[11px] font-bold mt-2 uppercase tracking-wider ${step >= num ? 'text-[#3b66df]' : 'text-slate-400'}`}>
                  {num === 1 ? 'Category' : num === 2 ? 'Details' : 'Documents'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
          <div className="h-1.5 w-full bg-[#3b66df]"></div>
          
          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="p-8">
            
            {/* Step 1: Category Selection */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">Select Beneficiary Category</h2>
                  <p className="text-slate-500 text-sm mt-2">Choose the primary program you are applying for</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-6 rounded-xl border-2 text-left transition-all ${
                          isSelected 
                            ? 'border-[#3b66df] bg-blue-50/50 shadow-sm ring-4 ring-blue-50' 
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start space-x-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-[#3b66df] text-white shadow-md' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Icon size={24} />
                          </div>
                          <div>
                            <h3 className={`font-bold text-lg ${isSelected ? 'text-[#3b66df]' : 'text-slate-800'}`}>
                              {cat.name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium">{cat.desc}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2: Form Details */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="mb-6 flex items-center space-x-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#3b66df] shadow-sm">
                    {category === 'senior' ? <User size={20} /> : category === 'pwd' ? <Heart size={20} /> : category === 'women' ? <Users size={20} /> : <GraduationCap size={20} />}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#3b66df] uppercase tracking-wider">Applying For</h2>
                    <p className="text-lg font-bold text-slate-900">{categories.find(c => c.id === category)?.name}</p>
                  </div>
                </div>

                {renderBasicInfo()}
                <div className="my-8 h-px bg-slate-100"></div>
                {renderCategorySpecificInfo()}
              </motion.div>
            )}

            {/* Step 3: Documents */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                {renderDocumentUpload()}
              </motion.div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center"
                >
                  <ChevronLeft size={16} className="mr-2" />
                  Back
                </button>
              ) : (
                <div></div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`px-8 py-3 rounded-xl bg-[#3b66df] text-white font-bold text-sm hover:bg-[#2b4cbf] transition-all shadow-md flex items-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {step === 3 ? (
                  loading ? 'Submitting...' : 'Submit Application'
                ) : (
                  <>
                    Continue <ChevronRight size={16} className="ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-8 font-medium">
          Republic of the Philippines · Municipal Social Welfare and Development Office
        </p>
      </div>
    </div>
  );
};

export default Apply;
