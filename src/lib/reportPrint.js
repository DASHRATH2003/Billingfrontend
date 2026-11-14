import { LAB_DETAILS } from './ui.js'

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const lines = (s) => esc(s).replace(/\n/g, '<br>')

/** Interpretation is HTML typed by the admin in Test Entry; drop anything that could run code. */
const safeHtml = (html) =>
  String(html || '')
    .replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'>\s]*\2/gi, '')

const dt = (v) => {
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/)
  if (!m) return ''
  const [, y, mo, d, hh, mi] = m
  if (!hh) return `${d}/${mo}/${y}`
  const h = Number(hh)
  return `${d}/${mo}/${y} ${h % 12 || 12}:${mi} ${h >= 12 ? 'PM' : 'AM'}`
}

const nowLocal = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * Print the Patient Report (test results).
 * `groups` = sheet groups whose rows carry the current value / unit / range / flag.
 */
export const openReportWindow = () => {
  const win = window.open('', '_blank', 'width=900,height=1000')
  if (win) win.document.write('<p style="font-family:Arial;padding:20px">Preparing report…</p>')
  return win
}

export const printPatientReport = (bill, groups, comment = '', target = null) => {
  const win = target || window.open('', '_blank', 'width=900,height=1000')
  if (!win) {
    alert('Allow pop-ups to print the report.')
    return
  }
  const p = bill.patient || {}
  const m = bill.meta || {}
  const age = p.ageY || p.age ? `${p.ageY || p.age}${/^\d+$/.test(String(p.ageY || p.age)) ? ' Yrs' : ''}` : ''

  // Only tests with a result are printed; a heading prints when something under it has a result.
  let body = ''
  let lastDept = null
  for (const g of groups) {
    const filled = g.rows.filter((r) => !r.heading && String(r.value || '').trim())
    if (!filled.length) continue
    const dept = (g.department || '').toUpperCase()
    if (dept && dept !== lastDept) {
      body += `<tr><td colspan="4" class="dept">${esc(dept)}</td></tr>`
      lastDept = dept
    }
    const many = g.rows.filter((r) => !r.heading).length > 1
    if (g.isProfile || many) body += `<tr><td colspan="4" class="group">${esc(g.title)}</td></tr>`

    g.rows.forEach((r, i) => {
      if (r.heading) {
        const hasKids = g.rows.slice(i + 1).some((k) => !k.heading && k.group === r.name && String(k.value || '').trim())
        if (hasKids && r.name !== g.title) body += `<tr><td colspan="4" class="sub">${esc(r.name)}</td></tr>`
        return
      }
      if (!String(r.value || '').trim()) return
      const flag = r.flag ? ` <b class="flag">${r.flag}</b>` : ''
      const nameCls = r.bold ? ' class="b"' : ''
      const method = r.showMethod && r.method ? `<div class="method">Method: ${esc(r.method)}</div>` : ''
      const indent = r.group && r.group !== g.title ? ' style="padding-left:18px"' : ''
      if (r.paragraph) {
        body += `<tr><td${indent}${nameCls}>${esc(r.name)}${method}</td><td colspan="3" class="${r.resultBold ? 'b' : ''}">${lines(r.value)}</td></tr>`
      } else {
        body += `<tr><td${indent}><span${nameCls}>${esc(r.name)}</span>${method}</td><td class="res ${r.flag || r.resultBold ? 'b' : ''}">${esc(r.value)}${flag}</td><td>${esc(r.unit)}</td><td>${lines(r.range)}</td></tr>`
      }
      if (r.remark) body += `<tr><td></td><td colspan="3" class="note">${lines(r.remark)}</td></tr>`
      const interp = safeHtml(r.interpretation).trim()
      if (interp) body += `<tr><td colspan="4" class="interp">${interp}</td></tr>`
    })
  }
  if (!body) body = '<tr><td colspan="4" style="text-align:center;padding:30px">No result entered yet.</td></tr>'

  win.document.open()
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Report ${esc(bill.id)} - ${esc(p.name)}</title>
<style>
  @page { size: A4; margin: 12mm 12mm 16mm }
  * { box-sizing: border-box }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12.5px; color: #111 }
  .head { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 6px }
  .head h1 { margin: 0; font-size: 24px; color: #1e3a8a; letter-spacing: .5px }
  .head div { font-size: 11px; margin-top: 2px }
  .pt { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 24px; border-bottom: 1px solid #555; padding: 8px 2px; margin-bottom: 6px }
  .pt span { display: inline-block; width: 95px; color: #333 }
  .title { text-align: center; font-weight: bold; font-size: 14px; margin: 8px 0 4px; text-decoration: underline }
  table { width: 100%; border-collapse: collapse }
  th { text-align: left; border-top: 1px solid #333; border-bottom: 1px solid #333; padding: 5px 4px; font-size: 12px }
  td { padding: 4px; vertical-align: top }
  td.res { white-space: nowrap }
  .dept { text-align: center; font-weight: bold; font-size: 13.5px; padding-top: 12px; text-decoration: underline }
  .group { font-weight: bold; padding-top: 8px; text-transform: uppercase }
  .sub { font-weight: bold; padding-top: 6px }
  .b { font-weight: bold }
  .flag { margin-left: 4px }
  .method { font-size: 10.5px; color: #555; font-style: italic }
  .note { font-size: 11.5px; color: #333 }
  .interp { font-size: 11.5px; padding: 4px 4px 10px }
  .interp p { margin: 3px 0 }
  .comment { margin-top: 12px; font-size: 12px }
  .end { text-align: center; margin: 18px 0 40px; font-size: 11px }
  .sign { display: flex; justify-content: space-between; font-size: 12px; margin-top: 30px }
  .sign div { text-align: center; min-width: 160px; border-top: 1px solid #333; padding-top: 4px }
  thead { display: table-header-group }
  tr { page-break-inside: avoid }
</style></head><body>
  <div class="head">
    <h1>${esc(LAB_DETAILS.name)}</h1>
    <div>${esc(LAB_DETAILS.addressLine1)}</div>
    <div>${esc(LAB_DETAILS.addressLine2)}</div>
    <div>Mob: ${esc(LAB_DETAILS.contact1)}, ${esc(LAB_DETAILS.contact2)} · ${esc(LAB_DETAILS.email)}</div>
  </div>
  <div class="pt">
    <div><span>Patient Name</span>: <b>${esc([p.title, p.name].filter(Boolean).join(' '))}</b></div>
    <div><span>Reg. No</span>: <b>${esc(bill.id)}</b></div>
    <div><span>Age / Sex</span>: ${esc([age, p.sex || p.category].filter(Boolean).join(' / '))}</div>
    <div><span>Serial No</span>: ${esc(m.siNo || '')}</div>
    <div><span>Ref. By</span>: ${esc(p.refBy || 'Self')}</div>
    <div><span>Collected</span>: ${esc(dt(m.collectionDateTime || m.billingDateTime))}</div>
    <div><span>Patient ID</span>: ${esc(bill.patientId || '')}</div>
    <div><span>Reported</span>: ${esc(dt(nowLocal()))}</div>
  </div>
  <div class="title">TEST REPORT</div>
  <table>
    <thead><tr><th style="width:42%">Test Name</th><th style="width:16%">Result</th><th style="width:12%">Unit</th><th>Bio. Ref. Interval</th></tr></thead>
    <tbody>${body}</tbody>
  </table>
  ${comment ? `<div class="comment"><b>Comment:</b> ${lines(comment)}</div>` : ''}
  <div class="end">*** End of Report ***</div>
  <div class="sign"><div>Lab Technician</div><div>Pathologist</div></div>
<script>window.onload = () => { window.print() }</` + `script>
</body></html>`)
  win.document.close()
}
