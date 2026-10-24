import { jsPDF } from 'jspdf'

const NAVY = [44, 62, 80]
const MARGIN = 15
const PAGE_BOTTOM = 280

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '-')
const label = (v) => (v && v !== 'not_checked' ? String(v).replace(/_/g, ' ') : 'Not checked')

// Builds the job card PDF and returns the jsPDF document.
// `job` must be the full record from GET /job-cards/:id (includes checklist + equipment).
export function buildJobCardPdf(job) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - MARGIN * 2
  const checklist = job.checklist || {}
  const equipment = job.equipment || []
  let y = 0

  const ensureSpace = (needed) => {
    if (y + needed > PAGE_BOTTOM) {
      doc.addPage()
      y = 20
    }
  }

  const sectionTitle = (title) => {
    ensureSpace(14)
    doc.setFillColor(...NAVY)
    doc.rect(MARGIN, y, contentWidth, 7, 'F')
    doc.setTextColor(255)
    doc.setFont(undefined, 'bold')
    doc.setFontSize(10)
    doc.text(title, MARGIN + 3, y + 5)
    doc.setFont(undefined, 'normal')
    y += 12
  }

  // Two-column label/value grid
  const fields = (rows) => {
    const colWidth = contentWidth / 2
    for (let i = 0; i < rows.length; i += 2) {
      ensureSpace(8)
      rows.slice(i, i + 2).forEach(([name, value], col) => {
        const x = MARGIN + col * colWidth
        doc.setFontSize(8)
        doc.setTextColor(120)
        doc.text(name.toUpperCase(), x, y)
        doc.setFontSize(10)
        doc.setTextColor(40)
        const text = doc.splitTextToSize(String(value ?? '-') || '-', colWidth - 6)
        doc.text(text[0], x, y + 5)
      })
      y += 12
    }
  }

  const paragraph = (title, text) => {
    if (!text) return
    sectionTitle(title)
    doc.setFontSize(10)
    doc.setTextColor(40)
    doc.splitTextToSize(text, contentWidth).forEach(line => {
      ensureSpace(6)
      doc.text(line, MARGIN, y)
      y += 5.5
    })
    y += 5
  }

  // Header
  doc.setTextColor(...NAVY)
  doc.setFontSize(22)
  doc.setFont(undefined, 'bold')
  doc.text('JOB CARD', MARGIN, 22)
  doc.setFont(undefined, 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text('Land Mawe Fleet Services', pageWidth - MARGIN, 18, { align: 'right' })
  doc.text('Nairobi, Kenya', pageWidth - MARGIN, 24, { align: 'right' })
  doc.setDrawColor(200)
  doc.line(MARGIN, 29, pageWidth - MARGIN, 29)
  y = 38

  fields([
    ['Job Number', job.job_number],
    ['Status', (job.status || '').replace(/_/g, ' ').toUpperCase()],
    ['Client', job.client_name],
    ['Event Dates', job.event_start_date
      ? `${fmtDate(job.event_start_date)} - ${fmtDate(job.event_finish_date)}`
      : fmtDate(job.departure_date)],
    ['Destination', job.destination],
    ['Route', job.route],
    ['Team Lead', job.team_lead],
    ['Branding In House', job.branding_in_house ? 'Yes' : 'No']
  ])
  if (job.purpose) fields([['Purpose', job.purpose]])
  y += 2

  sectionTitle('Vehicle & Driver')
  fields([
    ['Driver', job.driver_name],
    ['Driver Phone', job.driver_phone],
    ['Truck', [job.truck_plate, job.truck_model].filter(Boolean).join(' - ')],
    ['Vehicle Reg', job.vehicle_reg],
    ['Odometer (km)', job.kilometer ?? checklist.departure_mileage],
    ['Fuel Gauge', label(job.fuel_gauge)],
    ['Current Average', job.current_average]
  ])

  if (job.crew) paragraph('Crew', job.crew)
  if (job.merchandise) paragraph('Merchandise', job.merchandise)

  if (job.checklist) {
    sectionTitle('Pre-Departure Checklist')
    const tick = (v) => (v ? 'Yes' : 'No')
    fields([
      ['Fire Extinguisher', tick(checklist.fire_extinguisher)],
      ['First Aid Kit', tick(checklist.first_aid_kit)],
      ['Warning Triangles', tick(checklist.warning_triangles)],
      ['Reflective Jacket', tick(checklist.reflective_jacket)],
      ['Spare Wheel', tick(checklist.spare_wheel)],
      ['Jack & Tools', tick(checklist.jack_and_tools)],
      ['Lights Working', tick(checklist.lights_working)],
      ['Tires', label(checklist.tires_condition)],
      ['Brakes', label(checklist.brakes_condition)],
      ['Oil Level', label(checklist.oil_level)],
      ['Fuel Level', label(checklist.fuel_level)],
      ['Coolant Level', label(checklist.coolant_level)]
    ])
    if (checklist.inspection_notes) fields([['Inspection Notes', checklist.inspection_notes]])
  }

  if (equipment.length > 0) {
    sectionTitle('Equipment')
    const cols = [
      { title: 'Equipment', x: MARGIN + 2 },
      { title: 'Type', x: MARGIN + 80 },
      { title: 'Qty', x: MARGIN + 120 },
      { title: 'Returned', x: MARGIN + 140 }
    ]
    const header = () => {
      doc.setFontSize(8)
      doc.setTextColor(120)
      cols.forEach(c => doc.text(c.title.toUpperCase(), c.x, y))
      y += 2
      doc.setDrawColor(200)
      doc.line(MARGIN, y, pageWidth - MARGIN, y)
      y += 5
    }
    header()
    doc.setFontSize(10)
    doc.setTextColor(40)
    equipment.forEach(eq => {
      if (y + 7 > PAGE_BOTTOM) {
        doc.addPage()
        y = 20
        header()
        doc.setFontSize(10)
        doc.setTextColor(40)
      }
      doc.text(String(eq.equipment_name || '').substring(0, 38), cols[0].x, y)
      doc.text(String(eq.equipment_type || '-').substring(0, 20), cols[1].x, y)
      doc.text(String(eq.quantity ?? ''), cols[2].x, y)
      // Empty box to tick by hand when not yet returned
      if (eq.returned) {
        doc.text(`Yes (${fmtDate(eq.return_date)})`, cols[3].x, y)
      } else {
        doc.setDrawColor(120)
        doc.rect(cols[3].x, y - 3.5, 4, 4)
      }
      y += 7
    })
    y += 5
  }

  paragraph('Additional Equipment', job.additional_equipment)
  paragraph('Notes', job.notes)
  paragraph('Damage Report', job.damage_report)
  paragraph('Return Notes', job.return_notes)

  // Sign-off
  ensureSpace(40)
  sectionTitle('Sign-off')
  const sigs = [
    ['Prepared by', job.created_by_name],
    ['Approved by', job.approved_by_name],
    ['Driver', job.driver_name]
  ]
  const sigWidth = contentWidth / 3
  sigs.forEach(([role, name], i) => {
    const x = MARGIN + i * sigWidth
    doc.setDrawColor(120)
    doc.line(x, y + 12, x + sigWidth - 8, y + 12)
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(role.toUpperCase(), x, y + 17)
    if (name) {
      doc.setFontSize(9)
      doc.setTextColor(40)
      doc.text(name, x, y + 8)
    }
  })

  // Footer on every page
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`${job.job_number} - Page ${p} of ${pages}`, pageWidth / 2, 289, { align: 'center' })
  }

  return doc
}
