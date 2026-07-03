import React, { useCallback, useEffect, useMemo } from 'react'
import logo from '../assets/logo.png'

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value)
}

// formatRefBy removed from usage; keeping logic inline via label text

const formatDT = (value) => {
  if (!value) return ''
  try {
    const d = new Date(value)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    let hh = d.getHours()
    const min = String(d.getMinutes()).padStart(2, '0')
    const ampm = hh >= 12 ? 'PM' : 'AM'
    hh = hh % 12
    if (hh === 0) hh = 12
    const hhStr = String(hh).padStart(2, '0')
    return `${dd}-${mm}-${yyyy}/${hhStr}:${min}${ampm}`
  } catch {
    return String(value)
  }
}

const BillPreview = ({ data, onBack, onPrint, onDashboard, autoPrint = false, saveError }) => {
  const lab = data?.lab || {}
  const meta = data?.meta || {}
  const patient = data?.patient || {}
  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data])
  const discount = Number(data?.discount) || 0
  const narration = data?.narration || ''

  const subtotal = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  const netAmount = Math.max(0, subtotal - (Number(discount) || 0))
  const receivedAmt = Number(data?.receivedAmt) || 0
  const duesAmt = Math.max(0, netAmount - receivedAmt)
  const logoSrc = (data?.lab && data.lab.logoUrl) ? data.lab.logoUrl : logo

  // removed preview header, so currentDate/currentTime not needed

  // Function to handle print
  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank')
    
    const billContent = `
        <div class="bill-container">
          <div class="header">
            <div style="position:relative; text-align:center; min-height:80px;">
              ${logoSrc ? `<img src="${logoSrc}" alt="Logo" style="position:absolute; left:0; top:0; width:80px; height:80px; object-fit:contain;" />` : ''}
              <div>
                <div class="lab-name">${lab.name || 'RADHA JYOTI DIAGNOSTICS'}</div>
                ${lab.addressLine1 ? `<div class="address">${lab.addressLine1}</div>` : ''}
                ${lab.addressLine2 ? `<div class="address">${lab.addressLine2}</div>` : ''}
                <div class="contact-info">
                  ${lab.contact1 || lab.contact2 ? `Contact No.: ${[lab.contact1, lab.contact2].filter(Boolean).map(c => String(c).startsWith('8084') ? `<b>${c}</b>` : c).join(', ')}` : ''}
                  ${lab.email ? ` | Email: ${lab.email}` : ''}
                </div>
              </div>
            </div>
          </div>
          
          <div class="receipt-title">MONEY RECEIPT</div>
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 10px;">
            <div class="patient-section" style="flex: 1;">
              <div class="info-row-left">
                <span class="info-label-left">AID</span>
                <span class="colon-left">:</span>
                <span class="info-value-left">${meta.id || 'R25-010503'}</span>
              </div>
              <div class="info-row-left">
                <span class="info-label-left">NAME</span>
                <span class="colon-left">:</span>
                <span class="info-value-left">${patient.name || ''} ${patient.name ? '(E3)' : ''}</span>
              </div>
              <div class="info-row-left">
                <span class="info-label-left">AGE</span>
                <span class="colon-left">:</span>
                <span class="info-value-left">${patient.age || ''}</span>
              </div>
              <div class="info-row-left">
                <span class="info-label-left">SEX</span>
                <span class="colon-left">:</span>
                <span class="info-value-left">${patient.sex || ''}</span>
              </div>
              <div class="info-row-left">
                <span class="info-label-left">REF. BY DR</span>
                <span class="colon-left">:</span>
                <span class="info-value-left">${patient.refBy || ''}</span>
              </div>
            </div>
            
            <div class="meta-section" style="flex: 1; margin-left: 10px;">
              <div class="info-row-right">
                <span class="info-label-right">SI NO</span>
                <span class="colon-right">:</span>
                <span class="info-value-right">${meta.siNo || '04/1219'}</span>
              </div>
              <div class="info-row-right">
                <span class="info-label-right">COLLECTION DATE TIME</span>
                <span class="colon-right">:</span>
                <span class="info-value-right">${formatDT(meta.collectionDateTime) || '04-12-2025/1:26PM'}</span>
              </div>
              <div class="info-row-right">
                <span class="info-label-right">BILLING DATE TIME</span>
                <span class="colon-right">:</span>
                <span class="info-value-right">${formatDT(meta.billingDateTime) || '04-12-2025/1:28PM'}*</span>
              </div>
              <div class="info-row-right">
                <span class="info-label-right">REPORTING TIME</span>
                <span class="colon-right">:</span>
                <span class="info-value-right">${formatDT(meta.reportingTime) || '04-12-2025/2:00PM'}</span>
              </div>
              <div class="info-row-right">
                <span class="info-label-right">MOBILE</span>
                <span class="colon-right">:</span>
                <span class="info-value-right">${patient.mobile || ''}</span>
              </div>
            </div>
          </div>
          
          <div style="font-weight: bold; margin: 5px 0 2px 0; font-size: 11px;">TEST NAME</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>TEST NAME</th>
                <th style="width: 80px; text-align: right;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td>${item.name || ''}</td>
                  <td style="text-align: right;">${item.amount > 0 ? formatCurrency(item.amount || 0) : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="text-align: left; margin: 2px 0; font-weight: bold; font-size: 11px;">Test: ${items.length}</div>
          
          <div class="summary-section">
            <div style="width: 250px; margin-left: auto;">
              <div class="summary-row">
                <span>Sub Total:</span>
                <span><strong>${formatCurrency(subtotal)}</strong></span>
              </div>
              <div class="summary-row">
                <span>Discount:</span>
                <span><strong>${formatCurrency(discount)}</strong></span>
              </div>
              <div class="summary-row">
                <span>Received Amt:</span>
                <span><strong>${formatCurrency(receivedAmt)}</strong></span>
              </div>
              <div class="summary-row">
                <span>Dues Amt.:</span>
                <span><strong>${formatCurrency(duesAmt)}</strong></span>
              </div>
              <div class="summary-row" style="border-top: 1px solid #000; padding-top: 2px; margin-top: 2px;">
                <span><strong>Net Amount:</strong></span>
                <span><strong>${formatCurrency(netAmount)}</strong></span>
              </div>
            </div>
          </div>
          
          ${narration ? `
            <div style="margin: 5px 0; padding: 5px; border: 1px solid #ccc; font-size: 10px;">
              <strong>Narration:</strong> ${narration}
            </div>
          ` : ''}
          
          <div class="footer">
            <div class="footer-left">
              <div class="footer-note"><strong>Monday to Sunday, Time - 08 : 00 AM to 07 : 00 PM</strong></div>
              <div class="footer-note"><strong>Reports Can be taken after Full payment</strong></div>
            </div>
            
            <div class="signature">
              <div style="margin-top: 15px;">_______________________</div>
              <div>Authorised Signature</div>
            </div>
          </div>
        </div>
    `

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title> </title>
        <style>
          @page { margin: 0; size: A4 portrait; }
          body { 
            font-family: 'Arial', sans-serif; 
            margin: 0; 
            padding: 0; 
            background: #fff; 
            color: #000;
            line-height: 1.3;
            font-size: 11px;
          }
          .page-wrapper {
            width: 100%;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .bill-wrapper {
            flex: 0 0 auto;
            padding: 15px 25px;
            box-sizing: border-box;
            border-bottom: 1px dashed #ccc;
            overflow: visible;
          }
          .bill-wrapper:last-child {
            border-bottom: none;
          }
          .bill-container { 
            width: 100%; 
            border: 2px solid #000; 
            padding: 10px;
            position: relative;
            height: auto;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            page-break-inside: avoid;
          }
          .header { 
            text-align: center; 
            padding-bottom: 5px; 
            margin-bottom: 5px;
            border-bottom: 2px solid #000;
            flex-shrink: 0;
          }
          .lab-name { 
            font-size: 20px; 
            font-weight: bold; 
            color: #000; 
            margin-bottom: 2px;
            text-transform: uppercase;
          }
          .address { 
            font-size: 10px; 
            color: #000; 
            margin: 1px 0;
          }
          .contact-info { 
            font-size: 9px; 
            color: #000; 
            margin-top: 2px;
          }
          .receipt-title { 
            font-size: 16px; 
            font-weight: bold; 
            text-align: center; 
            margin: 5px 0;
            text-decoration: underline;
            text-transform: uppercase;
            flex-shrink: 0;
          }
          .patient-section, .meta-section { 
            margin-bottom: 5px;
          }
          .info-row-left { 
            margin: 1px 0; 
            padding: 0 2px;
            display: grid;
            grid-template-columns: 70px 5px auto;
            align-items: center;
          }
          .info-label-left { 
            font-weight: bold; 
            white-space: nowrap;
          }
          .colon-left { 
            display: inline-block; 
            width: 5px; 
            margin: 0;
            text-align: center; 
          }
          .info-value-left { 
            white-space: nowrap; 
          }
          .info-row-left span { white-space: nowrap; }

          .info-row-right { 
            margin: 1px 0; 
            padding: 0 2px;
            display: grid;
            grid-template-columns: 145px 5px auto;
            align-items: center;
          }
          .info-label-right { 
            font-weight: bold; 
            white-space: nowrap;
          }
          .colon-right { 
            display: inline-block; 
            width: 5px; 
            margin: 0;
            text-align: center; 
          }
          .info-value-right { 
            white-space: nowrap; 
          }
          .info-row-right span { white-space: nowrap; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 5px 0;
            border: 1px solid #000;
            table-layout: fixed;
          }
          th { 
            background: #f0f0f0; 
            color: #000; 
            padding: 3px 4px; 
            text-align: left;
            border: 1px solid #000;
            font-weight: bold;
            font-size: 10px;
          }
          td { 
            padding: 3px 4px; 
            border: 1px solid #000;
            font-size: 10px;
            vertical-align: top;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          .summary-section { 
            margin-top: 5px; 
            flex-shrink: 0;
          }
          .summary-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 1px 0;
          }
          .footer { 
            margin-top: 8px; 
            font-size: 9px; 
            color: #000;
            border-top: 1px solid #000;
            padding: 5px 0 3px;
            flex-shrink: 0;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .footer-left {
            text-align: left;
          }
          .footer-note { 
            margin: 1px 0;
          }
          .signature { 
            text-align: right;
            font-size: 10px;
            padding-top: 4px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="page-wrapper">
          <div class="bill-wrapper">
            ${billContent}
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }, [
    discount,
    duesAmt,
    items,
    lab.addressLine1,
    lab.addressLine2,
    lab.contact1,
    lab.contact2,
    lab.email,
    lab.name,
    logoSrc,
    meta.billingDateTime,
    meta.collectionDateTime,
    meta.id,
    meta.reportingTime,
    meta.siNo,
    narration,
    netAmount,
    patient.age,
    patient.mobile,
    patient.name,
    patient.refBy,
    patient.sex,
    receivedAmt,
    subtotal,
  ])

  useEffect(() => {
    if (!autoPrint) return
    handlePrint()
  }, [autoPrint, handlePrint])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Top page header removed as requested */}
        {saveError ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            This bill is showing in preview, but it was not saved to the dashboard: {saveError}
          </div>
        ) : null}

        {/* Bill Container - Matching Image Style */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-300">
          <div className="border-b border-gray-300 p-4 bg-gradient-to-r from-red-50 to-white">
            <div className="flex items-center">
              {logoSrc ? <img src={logoSrc} alt="Logo" className="w-24 h-24 object-contain mr-4" /> : null}
              <div className="flex-1 text-center">
                <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{lab.name || ''}</h1>
                <div className="mt-1 text-sm text-gray-700 space-y-0.5">
                  {lab.addressLine1 ? <div>{lab.addressLine1}</div> : null}
                  {lab.addressLine2 ? <div>{lab.addressLine2}</div> : null}
                  {(lab.contact1 || lab.contact2) ? (
                    <div>
                      <span className="font-bold">Contact No.: </span>
                      {[lab.contact1, lab.contact2].filter(Boolean).map((contact, idx, arr) => (
                        <span key={idx} className={String(contact).startsWith('8084') ? 'font-bold' : ''}>
                          {contact}{idx < arr.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {lab.email ? <div>Email: {lab.email}</div> : null}
                </div>
              </div>
            </div>
          </div>

          {/* Money Receipt Title */}
          <div className="border-b border-gray-300 py-3 bg-gray-50">
            <h2 className="text-xl font-bold text-center uppercase tracking-wider">MONEY RECEIPT</h2>
          </div>

          {/* Patient and Bill Info Grid */}
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Left Column - Patient Info */}
              <div className="space-y-1 text-sm">
                <div className="flex">
                  <span className="font-bold w-24">AID</span>
                  <span className="mx-1">:</span>
                  <span className="flex-1 whitespace-nowrap">{meta.id || 'R25-010503'}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-24">NAME</span>
                  <span className="mx-1">:</span>
                  <span className="flex-1 whitespace-nowrap">{patient.name || 'Mrs. SHANTI KUMARI'} {patient.name && '(E3)'}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-24">AGE</span>
                  <span className="mx-1">:</span>
                  <span className="flex-1 whitespace-nowrap">{patient.age || ''}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-24">SEX</span>
                  <span className="mx-1">:</span>
                  <span className="flex-1 whitespace-nowrap">{patient.sex || ''}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-24">REF. BY DR</span>
                  <span className="mx-1">:</span>
                  <span className="flex-1 whitespace-nowrap">{patient.refBy || 'AMAR NATH JHA , MD'}</span>
                </div>
              </div>

              {/* Right Column - Bill Info */}
              <div className="space-y-1 text-sm">
                <div className="flex">
                  <span className="font-bold w-48">SI NO</span>
                  <span className="mx-1">:</span>
                  <span className="flex-none whitespace-nowrap">{meta.siNo || '04/1219'}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-48">COLLECTION DATE TIME</span>
                  <span className="mx-1">:</span>
                  <span className="flex-none whitespace-nowrap">{formatDT(meta.collectionDateTime) || '04-12-2025/1:26PM'}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-48">BILLING DATE TIME</span>
                  <span className="mx-1">:</span>
                  <span className="flex-none whitespace-nowrap">{formatDT(meta.billingDateTime) || '04-12-2025/1:28PM'}*</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-48">REPORTING TIME</span>
                  <span className="mx-1">:</span>
                  <span className="flex-none whitespace-nowrap">{formatDT(meta.reportingTime) || '04-12-2025/2:00PM'}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-48">MOBILE</span>
                  <span className="mx-1">:</span>
                  <span className="flex-none whitespace-nowrap">{patient.mobile || ''}</span>
                </div>
              </div>
            </div>

            {/* Test Name Header */}
            <div className="mt-4 mb-2">
              <h3 className="font-bold text-lg">TEST NAME</h3>
            </div>

            {/* Test Items Table */}
            <div className="border border-gray-300 rounded-xl overflow-hidden mb-4">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 p-2 text-center w-10">#</th>
                    <th className="border border-gray-300 p-2 text-left">TEST NAME</th>
                    <th className="border border-gray-300 p-2 text-right w-28">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-200 p-2 text-center">{idx + 1}</td>
                      <td className="border border-gray-200 p-2">{item.name}</td>
                      <td className="border border-gray-200 p-2 text-right">
                        {item.amount > 0 ? formatCurrency(item.amount || 0) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right p-2 bg-gray-50 border-t border-gray-300">
                <span className="font-bold">Test: {items.length}</span>
              </div>
            </div>

            {/* Amount Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              {/* Left Column - Empty or Narration */}
              <div>
                {narration && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <div className="font-bold text-gray-700 mb-1">Narration:</div>
                    <div className="text-gray-600">{narration}</div>
                  </div>
                )}
              </div>

              {/* Right Column - Amount Summary */}
              <div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-bold">Sub Total:</span>
                    <span className="font-bold">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Discount:</span>
                    <span className="font-bold text-red-600">{discount > 0 ? formatCurrency(discount) : ''}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
                    <span className="font-bold text-lg">Net Amount:</span>
                    <span className="font-bold text-lg text-blue-700">{formatCurrency(netAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Received Amt:</span>
                    <span className="font-medium text-green-600">{receivedAmt > 0 ? formatCurrency(receivedAmt) : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Dues Amt.:</span>
                    <span className={`font-medium ${duesAmt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {duesAmt > 0 ? formatCurrency(duesAmt) : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Notes */}
            <div className="mt-6 pt-4 border-t border-gray-300">
              <div className="text-xs text-gray-700 space-y-1">
                <div className="font-bold">Monday to Sunday, Time - 08 : 00 AM to 07 : 00 PM</div>
                <div className="font-bold">Reports Can be taken after Full payment</div>
              </div>

              {/* Signature */}
              <div className="mt-2 text-right">
                <div className="inline-block text-center">
                  <div className="mt-2 text-gray-900">_______________________</div>
                  <div className="text-sm font-medium text-gray-700 mt-1">Authorised Signatory</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 bg-gray-100 border-t border-gray-300 flex justify-between">
            <div className="flex gap-3">
              <button
                onClick={onBack}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-medium flex items-center transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Edit Bill
              </button>
              <button
                onClick={onDashboard}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                </svg>
                Dashboard
              </button>
            </div>
            <button
              onClick={() => (onPrint ? onPrint() : handlePrint())}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium flex items-center transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Bill
            </button>
          </div>
        </div>

        {/* Preview Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="font-bold mb-1">Print Instructions:</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Click "Print Bill" to open a printer-friendly version</li>
                <li>The print layout matches the exact format of your sample image</li>
                <li>Use Ctrl+P (Windows) or Cmd+P (Mac) for additional print options</li>
                <li>For best results, print in portrait mode</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BillPreview
