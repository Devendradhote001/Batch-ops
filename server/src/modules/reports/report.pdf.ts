import PDFDocument from 'pdfkit';
import { formatDay, formatNowIST } from '../../utils/day';
import type { ReportData } from './report.data';

const ACCENT = '#4f46e5';
const INK = '#18181b';
const MUTED = '#71717a';
const LINE = '#e4e4e7';
const HEADER_BG = '#f4f4f5';
const MARGIN = 40;
const MAX_EVENT_ROWS = 40;
const MAX_UPDATE_ROWS = 15;

type Doc = PDFKit.PDFDocument;

interface Col {
  header: string;
  width: number;
  align?: 'left' | 'right';
}

const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
const pageBottom = (doc: Doc) => doc.page.height - MARGIN - 20;

function ensureSpace(doc: Doc, needed: number) {
  if (doc.y + needed > pageBottom(doc)) doc.addPage();
}

function sectionTitle(doc: Doc, title: string, note?: string) {
  ensureSpace(doc, 60);
  doc.moveDown(0.8).font('Helvetica-Bold').fontSize(12).fillColor(INK).text(title, MARGIN);
  if (note) doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(note, MARGIN);
  doc.moveDown(0.4);
}

/**
 * A simple table: grey header, hairline rows, wrapping cells, header repeated after page breaks.
 * `draw` lets a column render something other than text (e.g. a progress bar).
 */
function table(
  doc: Doc,
  cols: Col[],
  rows: (string | number)[][],
  draw?: Record<number, (x: number, y: number, width: number, row: (string | number)[]) => void>,
) {
  const pad = 4;
  const header = () => {
    const y = doc.y;
    doc.rect(MARGIN, y, cols.reduce((s, c) => s + c.width, 0), 18).fill(HEADER_BG);
    let x = MARGIN;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED);
    for (const c of cols) {
      doc.text(c.header, x + pad, y + 5, { width: c.width - pad * 2, align: c.align ?? 'left', lineBreak: false });
      x += c.width;
    }
    doc.y = y + 18;
  };

  header();
  doc.font('Helvetica').fontSize(9).fillColor(INK);
  for (const row of rows) {
    const height =
      Math.max(...row.map((cell, i) => (draw?.[i] ? 10 : doc.heightOfString(String(cell), { width: cols[i].width - pad * 2 })))) + pad * 2;
    if (doc.y + height > pageBottom(doc)) {
      doc.addPage();
      header();
      doc.font('Helvetica').fontSize(9).fillColor(INK);
    }
    const y = doc.y;
    let x = MARGIN;
    row.forEach((cell, i) => {
      const col = cols[i];
      if (draw?.[i]) draw[i](x + pad, y + pad, col.width - pad * 2, row);
      else doc.fillColor(INK).text(String(cell), x + pad, y + pad, { width: col.width - pad * 2, align: col.align ?? 'left' });
      x += col.width;
    });
    doc.y = y + height;
    doc
      .moveTo(MARGIN, doc.y)
      .lineTo(MARGIN + cols.reduce((s, c) => s + c.width, 0), doc.y)
      .lineWidth(0.5)
      .strokeColor(LINE)
      .stroke();
  }
  if (!rows.length) doc.font('Helvetica-Oblique').fontSize(9).fillColor(MUTED).text('Nothing in this range.', MARGIN + pad, doc.y + pad);
  doc.x = MARGIN;
}

function kpiGrid(doc: Doc, items: [string, string][]) {
  const perRow = 3;
  const gap = 10;
  const width = (doc.page.width - MARGIN * 2 - gap * (perRow - 1)) / perRow;
  const height = 52;
  const top = doc.y;
  items.forEach(([name, value], i) => {
    const col = i % perRow;
    const x = MARGIN + col * (width + gap);
    // Fixed positions: each card's text moves doc.y, so never derive the next card from it.
    const y = top + Math.floor(i / perRow) * (height + gap);
    doc.roundedRect(x, y, width, height, 6).lineWidth(0.75).strokeColor(LINE).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(name, x + 10, y + 10, { width: width - 20 });
    doc.font('Helvetica-Bold').fontSize(16).fillColor(INK).text(value, x + 10, y + 24, { width: width - 20 });
  });
  doc.y = top + Math.ceil(items.length / perRow) * (height + gap) - gap;
  doc.x = MARGIN;
}

/** A shareable summary: headline numbers, batch progress, instructors, events, daily-update discipline. */
export function buildPdf(data: ReportData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true, info: { Title: 'BatchOps report', Author: 'BatchOps' } });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const { filters: f, kpis } = data;

  // Header
  doc.font('Helvetica-Bold').fontSize(20).fillColor(ACCENT).text('BatchOps report');
  doc.font('Helvetica').fontSize(11).fillColor(INK).text(`${formatDay(f.from)} – ${formatDay(f.to)}`);
  doc.fontSize(8).fillColor(MUTED).text(`Generated ${formatNowIST()} IST by ${data.generatedFor}`);
  doc.moveDown(1);

  const items: [string, string][] = [
    ['Active batches', String(kpis.activeBatches)],
    ['Sessions held', String(kpis.sessions)],
    ['Teaching hours', `${kpis.teachingHours}h`],
    ['Average attendance', kpis.avgAttendance == null ? '—' : `${kpis.avgAttendance}%`],
    ['Events conducted', String(kpis.eventsConducted)],
  ];
  if (kpis.updateStreak != null) items.push(['Daily update streak', `${kpis.updateStreak} days`]);
  kpiGrid(doc, items);

  // Batch progress
  sectionTitle(doc, 'Batch progress', 'Completed of planned sessions, all time');
  table(
    doc,
    [
      { header: 'Batch', width: 170 },
      { header: 'Status', width: 60 },
      { header: 'Sessions', width: 60, align: 'right' },
      { header: 'Progress', width: 135 },
      { header: 'Modules', width: 90, align: 'right' },
    ],
    data.batches.map((b) => [
      `${b.code}\n${b.name}`,
      label(b.status),
      `${b.progress?.completed ?? 0} / ${b.totalPlannedSessions}`,
      b.progress?.progress ?? 0,
      `${b.modules.filter((m) => m.isCompleted).length} / ${b.modules.length}`,
    ]),
    {
      3: (x, y, width, row) => {
        const pct = Number(row[3]);
        const barWidth = width - 32;
        doc.roundedRect(x, y + 2, barWidth, 6, 3).fill(HEADER_BG);
        if (pct > 0) doc.roundedRect(x, y + 2, Math.max(6, (barWidth * Math.min(pct, 100)) / 100), 6, 3).fill(ACCENT);
        doc.font('Helvetica').fontSize(9).fillColor(INK).text(`${pct}%`, x + barWidth + 4, y, { width: 28, align: 'right' });
      },
    },
  );

  // Instructors
  sectionTitle(doc, 'Instructor workload', 'Completed sessions and events in the range');
  table(
    doc,
    [
      { header: 'Instructor', width: 175 },
      { header: 'Sessions', width: 65, align: 'right' },
      { header: 'Hours', width: 65, align: 'right' },
      { header: 'Avg attendance', width: 80, align: 'right' },
      { header: 'Events led', width: 65, align: 'right' },
      { header: 'Co-led', width: 65, align: 'right' },
    ],
    data.instructors.map((i) => [
      i.name,
      i.sessions,
      i.hours,
      i.avgAttendance == null ? '—' : `${i.avgAttendance}%`,
      i.eventsLed,
      i.eventsCoLed,
    ]),
  );

  // Events
  const events = data.events.slice(0, MAX_EVENT_ROWS);
  sectionTitle(
    doc,
    'Events',
    data.events.length > MAX_EVENT_ROWS ? `First ${MAX_EVENT_ROWS} of ${data.events.length} — the Excel export has all of them` : undefined,
  );
  table(
    doc,
    [
      { header: 'Date', width: 65 },
      { header: 'Event', width: 180 },
      { header: 'Type', width: 70 },
      { header: 'Status', width: 70 },
      { header: 'Led by', width: 85 },
      { header: 'People', width: 45, align: 'right' },
    ],
    events.map((e) => [
      formatDay(e.day, 'D MMM'),
      e.title,
      label(e.type),
      label(e.status),
      e.leadBy?.name ?? '',
      e.status === 'completed' ? e.participantCount : '',
    ]),
  );

  // Daily updates
  if (data.consistency) {
    const c = data.consistency;
    const mix = c.distribution.map((d) => `${label(d.status)}: ${d.count}`).join('   ');
    sectionTitle(doc, 'Daily updates');
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(INK)
      .text(`Filed ${c.filed} of ${c.totalDays} days · missed ${c.missed} · current streak ${c.currentStreak} days · longest ${c.longestStreak} days`)
      .fillColor(MUTED)
      .text(mix);
    doc.moveDown(0.5);
    const recent = [...data.updates].reverse().slice(0, MAX_UPDATE_ROWS);
    table(
      doc,
      [
        { header: 'Date', width: 65 },
        { header: 'Status', width: 60 },
        { header: 'Summary', width: 260 },
        { header: 'Blockers', width: 130 },
      ],
      recent.map((u) => [formatDay(u.day, 'D MMM'), label(u.status), u.summary, u.blockers.join('\n') || '—']),
    );
  }

  // Page numbers
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Writing inside the bottom margin would otherwise make pdfkit start a new page.
    doc.page.margins.bottom = 0;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(`BatchOps · page ${i + 1} of ${range.count}`, MARGIN, doc.page.height - MARGIN, {
        width: doc.page.width - MARGIN * 2,
        align: 'center',
        lineBreak: false,
      });
  }

  doc.end();
  return done;
}
