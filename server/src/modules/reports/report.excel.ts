import ExcelJS from 'exceljs';
import { formatDay, formatNowIST } from '../../utils/day';
import type { ReportData } from './report.data';

const ACCENT = 'FF4F46E5';
const HEADER_FILL = 'FFF4F4F5';

/** "2026-11-03" → a real Excel date (so the sheet can sort/filter by it). */
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
const list = (items: (string | undefined | null)[]) => items.filter(Boolean).join(', ');

interface Column {
  header: string;
  key: string;
  width: number;
  numFmt?: string;
  wrap?: boolean;
}

/** A sheet with a styled, frozen, filterable header row. */
function addTableSheet(wb: ExcelJS.Workbook, name: string, columns: Column[], rows: Record<string, unknown>[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = columns.map(({ header, key, width }) => ({ header, key, width }));
  ws.addRows(rows);

  const header = ws.getRow(1);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  header.alignment = { vertical: 'middle' };
  header.height = 20;

  columns.forEach((col, i) => {
    const column = ws.getColumn(i + 1);
    if (col.numFmt) column.numFmt = col.numFmt;
    if (col.wrap) column.alignment = { wrapText: true, vertical: 'top' };
  });
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  if (!rows.length) ws.addRow([`No ${name.toLowerCase()} in this range.`]).font = { italic: true, color: { argb: 'FF71717A' } };
  return ws;
}

function addSummarySheet(wb: ExcelJS.Workbook, data: ReportData) {
  const ws = wb.addWorksheet('Summary');
  ws.columns = [{ width: 30 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 16 }];
  const { filters: f, kpis } = data;

  ws.addRow(['BatchOps report']).font = { bold: true, size: 16, color: { argb: ACCENT } };
  ws.addRow([`${formatDay(f.from)} – ${formatDay(f.to)}`]).font = { size: 12 };
  ws.addRow([`Generated ${formatNowIST()} IST by ${data.generatedFor}`]).font = { color: { argb: 'FF71717A' } };
  ws.addRow([]);

  const section = (title: string) => {
    const r = ws.addRow([title]);
    r.font = { bold: true, size: 12 };
  };
  section('Headline numbers');
  const kpiRows: [string, number | string | null][] = [
    ['Active batches', kpis.activeBatches],
    ['Sessions held (in range)', kpis.sessions],
    ['Teaching hours (in range)', kpis.teachingHours],
    ['Average attendance', kpis.avgAttendance == null ? '—' : kpis.avgAttendance / 100],
    ['Events conducted (in range)', kpis.eventsConducted],
  ];
  if (kpis.updateStreak != null) kpiRows.push(['Daily update streak (days)', kpis.updateStreak]);
  if (data.consistency) kpiRows.push(['Daily updates filed', `${data.consistency.filed} of ${data.consistency.totalDays} days`]);
  for (const [name, value] of kpiRows) {
    const r = ws.addRow([name, value]);
    r.getCell(2).font = { bold: true };
    if (name === 'Average attendance' && typeof value === 'number') r.getCell(2).numFmt = '0%';
  }
  ws.addRow([]);

  section('Batch progress (all time)');
  const head = ws.addRow(['Batch', 'Status', 'Sessions done', 'Planned', 'Progress', 'Modules done']);
  head.font = { bold: true };
  head.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }));
  for (const b of data.batches) {
    const modulesDone = b.modules.filter((m) => m.isCompleted).length;
    const r = ws.addRow([
      `${b.code} — ${b.name}`,
      label(b.status),
      b.progress?.completed ?? 0,
      b.totalPlannedSessions,
      (b.progress?.progress ?? 0) / 100,
      `${modulesDone} / ${b.modules.length}`,
    ]);
    r.getCell(5).numFmt = '0%';
  }
  if (!data.batches.length) ws.addRow(['No batches match these filters.']).font = { italic: true };
}

/** A multi-sheet workbook: summary, then one detailed sheet per kind of record. */
export async function buildExcel(data: ReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BatchOps';
  wb.created = new Date();

  addSummarySheet(wb, data);

  addTableSheet(
    wb,
    'Batches',
    [
      { header: 'Code', key: 'code', width: 14 },
      { header: 'Name', key: 'name', width: 32 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Start', key: 'start', width: 13, numFmt: 'dd mmm yyyy' },
      { header: 'End', key: 'end', width: 13, numFmt: 'dd mmm yyyy' },
      { header: 'Lead', key: 'lead', width: 20 },
      { header: 'Instructors', key: 'instructors', width: 30, wrap: true },
      { header: 'Students', key: 'students', width: 10 },
      { header: 'Planned sessions', key: 'planned', width: 10 },
      { header: 'Sessions done', key: 'done', width: 10 },
      { header: 'Progress', key: 'progress', width: 10, numFmt: '0%' },
      { header: 'Modules done', key: 'modulesDone', width: 10 },
      { header: 'Modules total', key: 'modulesTotal', width: 10 },
      { header: 'Pending modules', key: 'pending', width: 45, wrap: true },
    ],
    data.batches.map((b) => ({
      code: b.code,
      name: b.name,
      status: label(b.status),
      start: asDate(b.startDate),
      end: asDate(b.endDate),
      lead: b.leadInstructor?.name ?? '',
      instructors: list(b.instructors.map((u) => u?.name)),
      students: b.studentCount,
      planned: b.totalPlannedSessions,
      done: b.progress?.completed ?? 0,
      progress: (b.progress?.progress ?? 0) / 100,
      modulesDone: b.modules.filter((m) => m.isCompleted).length,
      modulesTotal: b.modules.length,
      pending: list(b.modules.filter((m) => !m.isCompleted).map((m) => m.title)),
    })),
  );

  addTableSheet(
    wb,
    'Sessions',
    [
      { header: 'Date', key: 'date', width: 13, numFmt: 'dd mmm yyyy' },
      { header: 'Batch', key: 'batch', width: 14 },
      { header: 'Title', key: 'title', width: 32, wrap: true },
      { header: 'Module / topic', key: 'topic', width: 24 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Instructor', key: 'instructor', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Duration (min)', key: 'duration', width: 10 },
      { header: 'Attendance', key: 'attendance', width: 11 },
      { header: 'Enrolled', key: 'enrolled', width: 10 },
      { header: 'Attendance %', key: 'rate', width: 12, numFmt: '0%' },
      { header: 'Notes', key: 'notes', width: 40, wrap: true },
      { header: 'Recording', key: 'recording', width: 30 },
    ],
    data.sessions.map((s) => {
      const enrolled = s.batch?.studentCount ?? 0;
      const held = s.status === 'completed';
      return {
        date: asDate(s.day),
        batch: s.batch?.code ?? '',
        title: s.title,
        topic: s.topic,
        type: label(s.type),
        instructor: s.instructor?.name ?? '',
        status: label(s.status),
        duration: held ? s.durationMinutes : null,
        attendance: held ? s.attendanceCount : null,
        enrolled: enrolled || null,
        rate: held && enrolled ? Math.min(1, s.attendanceCount / enrolled) : null,
        notes: s.notes,
        recording: s.recordingLink ? { text: 'Open', hyperlink: s.recordingLink } : '',
      };
    }),
  );

  addTableSheet(
    wb,
    'Instructors',
    [
      { header: 'Instructor', key: 'name', width: 24 },
      { header: 'Sessions held', key: 'sessions', width: 12 },
      { header: 'Teaching hours', key: 'hours', width: 12, numFmt: '0.0' },
      { header: 'Avg attendance', key: 'avg', width: 13, numFmt: '0%' },
      { header: 'Events led', key: 'led', width: 10 },
      { header: 'Events co-led', key: 'coLed', width: 12 },
    ],
    data.instructors.map((i) => ({
      name: i.name,
      sessions: i.sessions,
      hours: i.hours,
      avg: i.avgAttendance == null ? null : i.avgAttendance / 100,
      led: i.eventsLed,
      coLed: i.eventsCoLed,
    })),
  );

  addTableSheet(
    wb,
    'Events',
    [
      { header: 'Date', key: 'date', width: 13, numFmt: 'dd mmm yyyy' },
      { header: 'Title', key: 'title', width: 32, wrap: true },
      { header: 'Type', key: 'type', width: 13 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Time (IST)', key: 'time', width: 14 },
      { header: 'Batches', key: 'batches', width: 22, wrap: true },
      { header: 'Led by', key: 'lead', width: 20 },
      { header: 'Co-leads', key: 'coLeads', width: 26, wrap: true },
      { header: 'Participants', key: 'participants', width: 12 },
      { header: 'Location / link', key: 'location', width: 28 },
      { header: 'Outcome', key: 'outcome', width: 40, wrap: true },
    ],
    data.events.map((e) => ({
      date: asDate(e.day),
      title: e.title,
      type: label(e.type),
      status: label(e.status),
      time: e.startTime ? `${e.startTime}${e.endTime ? `–${e.endTime}` : ''}` : '',
      batches: e.batches.length ? list(e.batches.map((b) => b?.code)) : 'Vertical-wide',
      lead: e.leadBy?.name ?? '',
      coLeads: list(e.coLeads.map((u) => u?.name)),
      participants: e.status === 'completed' ? e.participantCount : null,
      location: e.location,
      outcome: e.outcomeNotes,
    })),
  );

  if (data.consistency) {
    addTableSheet(
      wb,
      'Daily updates',
      [
        { header: 'Date', key: 'date', width: 13, numFmt: 'dd mmm yyyy' },
        { header: 'Status', key: 'status', width: 11 },
        { header: 'Summary', key: 'summary', width: 50, wrap: true },
        { header: 'Highlights', key: 'highlights', width: 36, wrap: true },
        { header: 'Blockers', key: 'blockers', width: 36, wrap: true },
        { header: 'Plan for next day', key: 'next', width: 36, wrap: true },
        { header: 'Batch notes', key: 'notes', width: 36, wrap: true },
      ],
      data.updates.map((u) => ({
        date: asDate(u.day),
        status: label(u.status),
        summary: u.summary,
        highlights: u.highlights.map((h) => `• ${h}`).join('\n'),
        blockers: u.blockers.map((h) => `• ${h}`).join('\n'),
        next: u.nextDayPlan.map((h) => `• ${h}`).join('\n'),
        notes: u.batchNotes.map((n) => `${n.batch?.code ?? '?'}: ${n.note}`).join('\n'),
      })),
    );
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
