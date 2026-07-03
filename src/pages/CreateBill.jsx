import React, { useEffect, useState } from 'react';
import { Plus, Trash2, User, FileText, Building, List, DollarSign, Calendar, Phone, MapPin, Mail, Printer, Eye, Save, ChevronDown, LayoutDashboard } from 'lucide-react';
import { getPathologyTests, TESTS_STORAGE_KEY } from '../data/pathologyTests';

const SERIAL_KEY = 'bill_si_next';
const getPreviewSerial = () => {
  const raw = localStorage.getItem(SERIAL_KEY);
  const next = raw ? Number(raw) : 1;
  return String(next).padStart(4, '0');
};
const allocateSerial = () => {
  const raw = localStorage.getItem(SERIAL_KEY);
  const next = raw ? Number(raw) : 1;
  localStorage.setItem(SERIAL_KEY, String(next + 1));
  return String(next).padStart(4, '0');
};

function generateBillId() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const y = String(now.getFullYear()).slice(2)
  const m = pad(now.getMonth() + 1)
  const d = pad(now.getDate())
  const hh = pad(now.getHours())
  const mm = pad(now.getMinutes())
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `RJ-${y}${m}${d}-${hh}${mm}-${rand}`
}

function formatDateTimeLocal(d) {
  const pad = (n) => String(n).padStart(2, '0')
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const CreateBill = ({ onSubmit, onDashboard }) => {
  const [pathologyTests, setPathologyTests] = useState(() => getPathologyTests())
  const [patient, setPatient] = useState({
    name: '',
    age: '',
    sex: 'Male',
    mobile: '',
    refBy: ''
  })
  const [meta, setMeta] = useState({
    id: generateBillId(),
    siNo: getPreviewSerial(),
    collectionDateTime: formatDateTimeLocal(new Date()),
    billingDateTime: formatDateTimeLocal(new Date()),
    reportingTime: formatDateTimeLocal(new Date())
  })
  const [lab, setLab] = useState({
    name: 'Radha Jyoti Diagnostics',
    addressLine1: 'Roy Complex, Infront of ML Academy School, VIP Road, Laheriasarai, Darbhanga',
    addressLine2: 'District: Darbhanga, PIN: 846001, State: Bihar',
    contact1: '8084930463',
    contact2: '8873867062',
    email: 'radhajyotidiagnostics@gmail.com',
  })
  const [discount, setDiscount] = useState('')
  const [receivedAmt, setReceivedAmt] = useState('')
  const [narration, setNarration] = useState('')
  const [items, setItems] = useState([])
  const [openSuggestionIdx, setOpenSuggestionIdx] = useState(null)
  const displayName = (t) => {
    const m = t.name.match(/\(([^)]+)\)/)
    return m ? m[1] : t.name
  }

  useEffect(() => {
    const handleStorage = (event) => {
      if (event?.key !== TESTS_STORAGE_KEY) return
      setPathologyTests(getPathologyTests())
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const addItem = () => setItems([...items, { name: '', amount: '' }])
  const updateItem = (idx, field, value) => {
    setItems((prev) => {
      const next = [...prev]
      if (field === 'name') {
        next[idx] = { ...next[idx], name: value }
      } else {
        next[idx] = { ...next[idx], [field]: field === 'amount' ? (value === '' ? '' : Number(value)) : value }
      }
      return next
    })
  }
  const selectTest = (idx, test) => {
    setItems((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], name: test.name, amount: test.amount }
      return next
    })
  }
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx))

  const handleSubmit = (e) => {
    e.preventDefault()
    const siFinal = allocateSerial()
    const payload = { patient, meta: { ...meta, siNo: siFinal }, lab, items, discount, receivedAmt, narration }
    onSubmit(payload)
    setMeta((m) => ({ ...m, siNo: getPreviewSerial() }))
  }

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    return subtotal - (Number(discount) || 0);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Medical Laboratory Billing System</h1>
          <p className="text-gray-600">Create and manage patient billing records</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center mb-4 md:mb-0">
                <FileText className="h-8 w-8 mr-3" />
                <div>
                  <h2 className="text-2xl font-bold">Create New Bill</h2>
                  <p className="text-blue-100">Fill in the details below to generate a bill</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onDashboard}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </button>
                <button 
                  type="button" 
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-white text-blue-700 hover:bg-blue-50 rounded-lg font-semibold flex items-center transition-colors"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview & Generate
                </button>
              </div>
            </div>
          </div>

          {/* Main Form Content */}
          <div className="p-4">
            {/* Patient and Meta Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Patient Details Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Patient Details</h3>
                </div>
                
                <div className="grid grid-cols-12 gap-3">
                  <div className="space-y-1 col-span-12 md:col-span-6">
                    <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                    <input 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="Enter patient name"
                      value={patient.name} 
                      onChange={(e)=>setPatient({...patient, name:e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-1 col-span-12 md:col-span-6">
                    <label className="block text-sm font-medium text-gray-700">Age *</label>
                    <input 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      type="number"
                      min="0"
                      placeholder="Enter age"
                      value={patient.age} 
                      onChange={(e)=>setPatient({...patient, age:e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-1 col-span-12 md:col-span-6">
                    <label className="block text-sm font-medium text-gray-700">Sex *</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      value={patient.sex}
                      onChange={(e)=>setPatient({...patient, sex:e.target.value})}
                      required
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1 col-span-12 md:col-span-6">
                    <label className="block text-sm font-medium text-gray-700">Mobile *</label>
                    <div className="flex">
                      <div className="flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50">
                        <Phone className="h-4 w-4 text-gray-500" />
                      </div>
                      <input 
                        className="w-full border border-gray-300 rounded-r-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="Phone number"
                        value={patient.mobile} 
                        onChange={(e)=>setPatient({...patient, mobile:e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  
                  
                  <div className="space-y-1 col-span-12 md:col-span-6">
                    <label className="block text-sm font-medium text-gray-700">Referred By</label>
                    <input 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="Doctor's name"
                      value={patient.refBy} 
                      onChange={(e)=>setPatient({...patient, refBy:e.target.value})}
                    />
                  </div>
                  
                </div>
              </div>

              {/* Bill Meta Card */}
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-gray-100 rounded-lg mr-3">
                    <Calendar className="h-5 w-5 text-gray-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Bill Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Bill ID</label>
                    <input 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      readOnly
                      value={meta.id} 
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">SI No</label>
                    <input 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      readOnly
                      value={meta.siNo}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Collection Date & Time</label>
                    <input 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      type="datetime-local"
                      value={meta.collectionDateTime} 
                      onChange={(e)=>setMeta({...meta, collectionDateTime:e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Billing Date & Time</label>
                    <input 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      type="datetime-local"
                      value={meta.billingDateTime} 
                      onChange={(e)=>setMeta({...meta, billingDateTime:e.target.value})}
                    />
                  </div>
                  
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Reporting Date & Time</label>
                    <input 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      type="datetime-local"
                      value={meta.reportingTime} 
                      onChange={(e)=>setMeta({...meta, reportingTime:e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Lab Details Card */}
            <div className="mb-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                  <Building className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Laboratory Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Lab Name *</label>
                  <input 
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="Laboratory name"
                    value={lab.name} 
                    onChange={(e)=>setLab({...lab, name:e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Contact 1</label>
                  <div className="flex">
                    <div className="flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50">
                      <Phone className="h-4 w-4 text-gray-500" />
                    </div>
                    <input 
                      className="w-full border border-gray-300 rounded-r-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      placeholder="Primary contact number"
                      value={lab.contact1} 
                      onChange={(e)=>setLab({...lab, contact1:e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Contact 2</label>
                  <div className="flex">
                    <div className="flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50">
                      <Phone className="h-4 w-4 text-gray-500" />
                    </div>
                    <input 
                      className="w-full border border-gray-300 rounded-r-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      placeholder="Secondary contact number"
                      value={lab.contact2} 
                      onChange={(e)=>setLab({...lab, contact2:e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Address Line 1</label>
                  <div className="flex">
                    <div className="flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50">
                      <MapPin className="h-4 w-4 text-gray-500" />
                    </div>
                    <input 
                      className="w-full border border-gray-300 rounded-r-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      placeholder="Street address"
                      value={lab.addressLine1} 
                      onChange={(e)=>setLab({...lab, addressLine1:e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Address Line 2</label>
                  <input 
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="City, State, ZIP"
                    value={lab.addressLine2} 
                    onChange={(e)=>setLab({...lab, addressLine2:e.target.value})}
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="flex">
                    <div className="flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50">
                      <Mail className="h-4 w-4 text-gray-500" />
                    </div>
                    <input 
                      className="w-full border border-gray-300 rounded-r-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      placeholder="lab@example.com"
                      type="email"
                      value={lab.email} 
                      onChange={(e)=>setLab({...lab, email:e.target.value})}
                    />
                  </div>
                </div>
                
                
              </div>
            </div>

            {/* Test Items Card */}
            <div className="mb-4 bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <List className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Test Items</h3>
                </div>
                <button 
                  type="button" 
                  onClick={addItem} 
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Test
                </button>
              </div>
              
              {items.length > 0 ? (
                <div className="space-y-1">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <div className="col-span-8 font-medium text-gray-700">Test Name</div>
                    <div className="col-span-3 font-medium text-gray-700">Amount (₹)</div>
                    <div className="col-span-1 font-medium text-gray-700">Action</div>
                  </div>
                  
                  {/* Items List */}
                  {items.map((item, idx)=>(
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50/50 hover:bg-blue-50/50 rounded-lg transition-colors">
                      <div className="col-span-8">
                        <div className="relative">
                          <input 
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            placeholder="Enter test name"
                            value={item.name} 
                            onFocus={() => {
                              setPathologyTests(getPathologyTests())
                              setOpenSuggestionIdx(idx)
                            }}
                            onBlur={()=>setTimeout(()=>setOpenSuggestionIdx(null),150)}
                            onChange={(e)=>updateItem(idx,'name',e.target.value)}
                          />
                          {openSuggestionIdx === idx && (
                            <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto z-10">
                              {pathologyTests
                                .filter(t => {
                                  const q = (item.name || '').toLowerCase()
                                  return t.name.toLowerCase().includes(q) || displayName(t).toLowerCase().includes(q)
                                })
                                .map((t, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-sm"
                                    onMouseDown={()=>{
                                      selectTest(idx, t)
                                      setOpenSuggestionIdx(null)
                                    }}
                                  >
                                    {t.name.includes('(') ? t.name : (displayName(t) !== t.name ? `${t.name} (${displayName(t)})` : t.name)}
                                  </button>
                                ))}
                            </div>
                          )}
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-gray-600 hover:text-gray-900"
                            onMouseDown={()=>{
                              setPathologyTests(getPathologyTests())
                              setOpenSuggestionIdx(idx)
                            }}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500">₹</span>
                          </div>
                          <input 
                            className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            type="number" 
                            placeholder="Amount"
                            value={item.amount} 
                            onChange={(e)=>updateItem(idx,'amount',e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button 
                          type="button" 
                          onClick={()=>removeItem(idx)} 
                          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Total Calculation */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-800">Bill Summary</h4>
                        <p className="text-sm text-gray-600">{items.length} test(s) added</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-600 mr-4">Subtotal:</span>
                          <span className="font-medium">₹{items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)}</span>
                        </div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-600 mr-4">Discount:</span>
                          <span className="font-medium text-red-600">-₹{discount || 0}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-300">
                          <span className="font-semibold text-gray-800">Total Amount:</span>
                          <span className="text-xl font-bold text-blue-700">₹{calculateTotal()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-xl">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <List className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-700 mb-2">No tests added yet</h4>
                  <p className="text-gray-500 mb-6">Click "Add Test" to start adding test items to the bill</p>
                  <button 
                    type="button" 
                    onClick={addItem} 
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center mx-auto transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Test
                  </button>
                </div>
              )}
            </div>
            {/* Discount and Narration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Narration Card */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Narration / Remarks</h3>
                </div>
                
                <div className="space-y-2">
                  <textarea 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    rows={3} 
                    placeholder="Add any additional notes, remarks, or instructions here..."
                    value={narration} 
                    onChange={(e)=>setNarration(e.target.value)}
                  />
                  <p className="text-sm text-gray-500">This information will appear on the printed bill.</p>
                </div>
              </div>

              {/* Discount Card */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-amber-100 rounded-lg mr-3">
                    <DollarSign className="h-5 w-5 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Discount & Final Amount</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount (₹)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">₹</span>
                      </div>
                      <input 
                        className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                        type="number" 
                        placeholder="Enter discount amount"
                        value={discount} 
                        onChange={(e)=>setDiscount(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Received Amount (₹)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">₹</span>
                      </div>
                      <input 
                        className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                        type="number" 
                        placeholder="Enter received amount"
                        value={receivedAmt} 
                        onChange={(e)=>setReceivedAmt(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                    <h4 className="font-semibold text-gray-800 mb-2">Final Bill Summary</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tests Subtotal:</span>
                        <span className="font-medium">₹{items.reduce((sum, item) => sum + (item.amount || 0), 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount Applied:</span>
                        <span className="font-medium text-red-600">-₹{discount}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-amber-200 mt-2">
                        <span className="font-bold text-gray-800">Final Payable Amount:</span>
                        <span className="text-xl font-bold text-amber-700">₹{calculateTotal()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-gray-200">
              <div className="mb-4 sm:mb-0">
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">Note:</span> All fields marked with * are required.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onDashboard}
                  className="px-6 py-3 border border-blue-200 hover:bg-blue-50 text-blue-700 rounded-lg font-medium transition-colors flex items-center"
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </button>
                <button 
                  type="button" 
                  className="px-6 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors flex items-center"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Clear Form
                </button>
                <button 
                  type="submit" 
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-lg font-semibold transition-all flex items-center shadow-md hover:shadow-lg"
                >
                  <Printer className="h-5 w-5 mr-2" />
                  Preview & Print Bill
                </button>
              </div>
            </div>
          </div>
        </form>
        
        {/* Footer Note */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>This billing system is designed for medical laboratories. All data is securely processed.</p>
        </div>
      </div>
    </div>
  )
}

export default CreateBill;
