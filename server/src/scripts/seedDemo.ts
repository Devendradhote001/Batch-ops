/**
 * Resets the database to a realistic demo, relative to today (IST):
 * the admin from .env (kept, or created), 3 instructors, 1 viewer, 4 batches, every scheduled session
 * since each batch started, ~30 days of daily updates, events either side of today, and an activity feed.
 *
 * DESTRUCTIVE: deletes all batches, sessions, events, daily updates, activity, and every user except the
 * admin in ADMIN_EMAIL. Runs only with --reset, and never when NODE_ENV=production.
 */
import dayjs from 'dayjs';
import { Types } from 'mongoose';
import type { EventStatus, EventType, SessionStatus, SessionType, UpdateStatus } from '@batchops/shared';
import { env } from '../config/env';
import { connectDB, disconnectDB } from '../config/db';
import { Activity } from '../modules/activity/activity.model';
import { Batch } from '../modules/batches/batch.model';
import { Event } from '../modules/events/event.model';
import { Session } from '../modules/sessions/session.model';
import { DailyUpdate } from '../modules/updates/update.model';
import { User } from '../modules/users/user.model';
import { addDays, startOfWeek, todayIST } from '../utils/day';
import { hashPassword } from '../utils/password';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo@1234';

/** Deterministic PRNG so every reset produces the same shape of data. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261031);
const pick = <T>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
const chance = (p: number) => rand() < p;

/** An IST wall-clock time on a day, as a UTC Date. */
function at(day: string, hhmm: string) {
  return new Date(`${day}T${hhmm}:00+05:30`);
}

// ---------------------------------------------------------------------------------------------------------
// People

const PEOPLE = {
  asha: { name: 'Asha Verma', email: 'asha@batchops.dev', role: 'instructor', avatarColor: '#f59e0b' },
  rahul: { name: 'Rahul Mehta', email: 'rahul@batchops.dev', role: 'instructor', avatarColor: '#0ea5e9' },
  priya: { name: 'Priya Nair', email: 'priya@batchops.dev', role: 'instructor', avatarColor: '#10b981' },
  sanjay: { name: 'Sanjay Kapoor', email: 'sanjay@batchops.dev', role: 'viewer', avatarColor: '#8b5cf6' },
} as const;

type PersonKey = keyof typeof PEOPLE | 'admin';

// ---------------------------------------------------------------------------------------------------------
// Batches

interface BatchPlan {
  key: string;
  prefix: string;
  name: string;
  description: string;
  startOffset: number;
  lengthDays: number;
  days: number[];
  startTime: string;
  endTime: string;
  students: number;
  planned: number;
  lead: PersonKey;
  co: PersonKey[];
  modules: string[];
}

const today = todayIST();

const BATCHES: BatchPlan[] = [
  {
    key: 'mern',
    prefix: 'MERN',
    name: 'MERN Stack',
    description: 'Full-stack JavaScript: React, Node.js, Express and MongoDB, ending in a deployed capstone.',
    startOffset: -90,
    lengthDays: 140,
    days: [1, 3, 5],
    startTime: '19:00',
    endTime: '21:00',
    students: 42,
    planned: 60,
    lead: 'asha',
    co: ['rahul'],
    modules: [
      'HTML & CSS foundations',
      'JavaScript essentials',
      'Async JS & APIs',
      'Git & GitHub',
      'React fundamentals',
      'React hooks & state',
      'Node.js & Express',
      'MongoDB & Mongoose',
      'Auth & security',
      'Deployment & capstone',
    ],
  },
  {
    key: 'dsa',
    prefix: 'DSA',
    name: 'DSA with Java',
    description: 'Data structures and algorithms in Java for placement preparation.',
    startOffset: -54,
    lengthDays: 150,
    days: [2, 4, 6],
    startTime: '18:30',
    endTime: '20:30',
    students: 38,
    planned: 54,
    lead: 'rahul',
    co: ['priya'],
    modules: [
      'Java basics',
      'Complexity analysis',
      'Arrays & strings',
      'Recursion & backtracking',
      'Linked lists',
      'Stacks & queues',
      'Trees',
      'Graphs',
      'Dynamic programming',
    ],
  },
  {
    key: 'da',
    prefix: 'DA',
    name: 'Data Analytics',
    description: 'Excel, SQL, Python and Power BI for working analysts. Morning batch.',
    startOffset: -26,
    lengthDays: 140,
    days: [1, 3, 5],
    startTime: '07:30',
    endTime: '09:00',
    students: 30,
    planned: 50,
    lead: 'priya',
    co: ['admin'],
    modules: ['Excel for analysis', 'Statistics basics', 'SQL fundamentals', 'Advanced SQL', 'Python & pandas', 'Data visualisation', 'Power BI', 'Capstone'],
  },
  {
    key: 'genai',
    prefix: 'GENAI',
    name: 'Generative AI for Developers',
    description: 'LLM APIs, prompting, RAG and agents. Starts next month.',
    startOffset: 30,
    lengthDays: 90,
    days: [2, 4],
    startTime: '19:00',
    endTime: '21:00',
    students: 25,
    planned: 32,
    lead: 'asha',
    co: [],
    modules: ['LLM fundamentals', 'Prompt engineering', 'RAG pipelines', 'Agents & tools', 'Shipping AI features'],
  },
];

const SESSION_ROTATION: SessionType[] = ['lecture', 'lecture', 'lab', 'lecture', 'lecture', 'doubt', 'lecture', 'lab', 'lecture', 'lecture', 'test', 'project-review'];

const SESSION_NOTES = [
  'Good energy, lots of questions in the second half.',
  'Ran 15 minutes over to finish the live demo.',
  'Several students struggled with the setup; shared a fix in the group.',
  'Assigned practice problems for the weekend.',
  'Quick recap at the start helped the late joiners.',
  'Recording uploaded to the drive.',
];

const CANCEL_NOTES = ['Instructor unwell — will cover in the next class.', 'Power outage at the centre.', 'Merged with the next session due to a public holiday.'];

// ---------------------------------------------------------------------------------------------------------
// Updates and events

const SUMMARY_OPENERS = [
  'Steady day across the vertical.',
  'Productive day overall.',
  'Mixed day — most things on track.',
  'Busy day with good engagement.',
  'Quiet but useful day.',
];
const HIGHLIGHTS = [
  'Attendance above 85% in the evening batch',
  'Lab exercises completed by most students',
  'Two students shipped their mini-projects',
  'Positive feedback on the live coding format',
  'Doubt session cleared the backlog of questions',
  'Mock test scores improved over last week',
  'New practice set published',
];
const BLOCKERS = [
  'Projector in Lab 2 still flaky',
  'A few students behind on assignments',
  'Waiting on cloud credits for deployment',
  'Attendance dipping in the morning batch',
  'Need a substitute for Thursday',
];
const NEXT_STEPS = [
  'Prepare the next module slides',
  'Review pending assignments',
  'Schedule a one-on-one with struggling students',
  'Finalise the assessment paper',
  'Share recordings with absentees',
  'Sync with co-instructors on pacing',
];
const BATCH_NOTES = ['Pace is good; keep the same rhythm.', 'Attendance slipped slightly this week.', 'Students asked for more practice problems.', 'Ahead of plan by one session.'];

interface EventPlan {
  offset: number;
  title: string;
  type: EventType;
  batches: string[];
  lead: PersonKey;
  co: PersonKey[];
  time: [string, string];
  location: string;
  description: string;
  cancelled?: boolean;
  participants?: number;
  outcome?: string;
}

const EVENTS: EventPlan[] = [
  { offset: -40, title: 'Git & GitHub workflows', type: 'workshop', batches: ['mern'], lead: 'asha', co: [], time: ['16:00', '18:00'], location: 'Lab 1', description: 'Branching, pull requests and resolving merge conflicts.', participants: 39, outcome: 'Everyone opened their first PR by the end.' },
  { offset: -33, title: 'Life as a backend engineer', type: 'guest-talk', batches: [], lead: 'admin', co: ['rahul'], time: ['17:00', '18:00'], location: 'https://meet.example.com/backend-talk', description: 'Industry guest on day-to-day backend work and hiring.', participants: 96, outcome: 'Strong Q&A; recording shared with all batches.' },
  { offset: -26, title: 'MERN mid-term assessment', type: 'assessment', batches: ['mern'], lead: 'asha', co: ['rahul'], time: ['10:00', '13:00'], location: 'Lab 1 & 2', description: 'Written + practical covering JavaScript and React basics.', participants: 41, outcome: 'Median score 72%. Async JS needs a revision session.' },
  { offset: -19, title: 'DSA weekend hackathon', type: 'hackathon', batches: ['dsa'], lead: 'rahul', co: ['priya'], time: ['09:00', '18:00'], location: 'Main hall', description: 'Team problem-solving sprint with leaderboard.', participants: 34, outcome: '9 teams; top team solved 11 of 12 problems.' },
  { offset: -12, title: 'Intro to Power BI', type: 'webinar', batches: ['da'], lead: 'priya', co: [], time: ['18:00', '19:00'], location: 'https://meet.example.com/powerbi', description: 'A first look at dashboards ahead of the Power BI module.', participants: 27, outcome: 'Good turnout; students asked for a dataset to practise with.' },
  { offset: -8, title: 'Mock interviews — round 1', type: 'workshop', batches: ['dsa', 'mern'], lead: 'rahul', co: ['asha'], time: ['15:00', '18:00'], location: 'Rooms 3–5', description: 'One-on-one mock technical interviews.', cancelled: true },
  { offset: -4, title: 'Arrays & strings test', type: 'assessment', batches: ['dsa'], lead: 'priya', co: [], time: ['18:30', '20:00'], location: 'Lab 2', description: 'Timed test on the arrays and strings module.', participants: 36, outcome: 'Average 68%. Sliding-window problems were the weak spot.' },
  { offset: 2, title: 'Deploying on Render', type: 'workshop', batches: ['mern'], lead: 'asha', co: [], time: ['16:00', '18:00'], location: 'Lab 1', description: 'Ship the MERN capstone skeleton to production.' },
  { offset: 5, title: 'Data careers AMA', type: 'guest-talk', batches: ['da'], lead: 'admin', co: ['priya'], time: ['17:30', '18:30'], location: 'https://meet.example.com/data-ama', description: 'Ask-me-anything with two working analysts.' },
  { offset: 9, title: 'Build-a-thon 2.0', type: 'hackathon', batches: ['mern', 'dsa', 'da'], lead: 'asha', co: ['rahul', 'priya'], time: ['09:00', '19:00'], location: 'Main hall', description: 'Cross-batch hackathon. Teams of three, mixed batches.' },
  { offset: 16, title: 'SQL fundamentals test', type: 'assessment', batches: ['da'], lead: 'priya', co: [], time: ['07:30', '09:00'], location: 'Lab 2', description: 'Covers SELECT, joins and aggregation.' },
  { offset: 25, title: 'GenAI batch orientation', type: 'webinar', batches: ['genai'], lead: 'asha', co: [], time: ['19:00', '20:00'], location: 'https://meet.example.com/genai-orientation', description: 'Welcome session, tooling setup and course plan.' },
];

// ---------------------------------------------------------------------------------------------------------

async function main() {
  if (!process.argv.includes('--reset')) {
    throw new Error('This wipes the database. Re-run with --reset (npm run seed:demo) to confirm.');
  }
  if (env.isProduction) throw new Error('Refusing to seed demo data with NODE_ENV=production.');
  if (!env.ADMIN_EMAIL) throw new Error('Set ADMIN_EMAIL (and ADMIN_PASSWORD) in server/.env first.');

  await connectDB();

  // --- Reset -------------------------------------------------------------------------------------------
  const adminEmail = env.ADMIN_EMAIL.trim().toLowerCase();
  await Promise.all([
    Batch.deleteMany({}),
    Session.deleteMany({}),
    Event.deleteMany({}),
    DailyUpdate.deleteMany({}),
    Activity.deleteMany({}),
    User.deleteMany({ email: { $ne: adminEmail } }),
  ]);

  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    if (!env.ADMIN_PASSWORD) throw new Error('Admin account missing: set ADMIN_PASSWORD so it can be created.');
    admin = await User.create({ name: env.ADMIN_NAME, email: adminEmail, role: 'admin', passwordHash: await hashPassword(env.ADMIN_PASSWORD) });
  }

  // --- People ------------------------------------------------------------------------------------------
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const created = await User.insertMany(Object.values(PEOPLE).map((p) => ({ ...p, passwordHash, lastLoginAt: at(addDays(today, -1), '20:00') })));
  const userId: Record<PersonKey, Types.ObjectId> = {
    admin: admin._id,
    ...(Object.fromEntries(Object.keys(PEOPLE).map((k, i) => [k, created[i]._id])) as Record<keyof typeof PEOPLE, Types.ObjectId>),
  };
  const userName: Record<PersonKey, string> = {
    admin: admin.name,
    ...(Object.fromEntries(Object.entries(PEOPLE).map(([k, p]) => [k, p.name])) as Record<keyof typeof PEOPLE, string>),
  };

  // --- Batches & sessions ------------------------------------------------------------------------------
  const batchIds: Record<string, Types.ObjectId> = {};
  const batchCodes: Record<string, string> = {};
  const sessionsByDay = new Map<string, { batch: string; status: SessionStatus }[]>();
  const sessionDocs: Record<string, unknown>[] = [];

  for (const plan of BATCHES) {
    const start = plan.startOffset < 0 ? startOfWeek(addDays(today, plan.startOffset)) : addDays(today, plan.startOffset);
    const end = addDays(start, plan.lengthDays);
    const code = `${plan.prefix}-${dayjs(start).format('MMM-YY').toUpperCase()}`;
    const status = start > today ? 'upcoming' : 'active';
    const instructorKeys = [plan.lead, ...plan.co];
    const _id = new Types.ObjectId();
    batchIds[plan.key] = _id;
    batchCodes[plan.key] = code;

    const duration = dayjs(`2000-01-01T${plan.endTime}`).diff(dayjs(`2000-01-01T${plan.startTime}`), 'minute');
    const perModule = plan.planned / plan.modules.length;
    let index = 0;
    let lastCompletedIndex = -1;
    const moduleCompletedOn: (string | null)[] = plan.modules.map(() => null);

    for (let day = start; day <= today && status === 'active'; day = addDays(day, 1)) {
      if (!plan.days.includes(dayjs(day).day())) continue;
      const moduleIndex = Math.min(plan.modules.length - 1, Math.floor(index / perModule));
      const module = plan.modules[moduleIndex];
      const type = SESSION_ROTATION[index % SESSION_ROTATION.length] === 'project-review' && plan.key !== 'mern' ? 'lecture' : SESSION_ROTATION[index % SESSION_ROTATION.length];
      const roll = rand();
      const sessionStatus: SessionStatus = roll < 0.06 ? 'cancelled' : roll < 0.1 ? 'rescheduled' : 'completed';
      const isDone = sessionStatus === 'completed';
      const instructor = chance(0.7) ? plan.lead : pick(plan.co.length ? plan.co : [plan.lead]);
      const progress = index / plan.planned;
      const rate = Math.max(0.55, Math.min(1, 0.93 - progress * 0.18 + (rand() - 0.5) * 0.12 - (plan.startTime < '09:00' ? 0.05 : 0)));
      const title = {
        lecture: `${module}${chance(0.5) ? ' — concepts' : ''}`,
        lab: `${module} lab`,
        doubt: 'Doubt-clearing session',
        test: `${module} quiz`,
        'project-review': 'Mini-project review',
      }[type];

      sessionDocs.push({
        batch: _id,
        day,
        title,
        topic: module,
        instructor: userId[instructor],
        type,
        durationMinutes: isDone ? duration + (chance(0.15) ? 15 : 0) : 0,
        attendanceCount: isDone ? Math.round(plan.students * rate) : 0,
        status: sessionStatus,
        notes: isDone ? (chance(0.3) ? pick(SESSION_NOTES) : '') : pick(CANCEL_NOTES),
        recordingLink: isDone && type === 'lecture' && chance(0.5) ? `https://drive.example.com/recordings/${code.toLowerCase()}-${index + 1}` : '',
        createdBy: userId[instructor],
        createdAt: at(day, plan.endTime),
        updatedAt: at(day, plan.endTime),
      });
      sessionsByDay.set(day, [...(sessionsByDay.get(day) ?? []), { batch: plan.key, status: sessionStatus }]);

      if (isDone) {
        lastCompletedIndex = index;
        // A module counts as done once the sessions planned for it have run.
        const finishedModule = Math.floor((index + 1) / perModule) - 1;
        if (finishedModule >= 0 && finishedModule < plan.modules.length && !moduleCompletedOn[finishedModule]) moduleCompletedOn[finishedModule] = day;
      }
      index += 1;
    }
    for (let m = 0; m < moduleCompletedOn.length; m++) if (!moduleCompletedOn[m] && m < Math.floor((lastCompletedIndex + 1) / perModule)) moduleCompletedOn[m] = today;

    await Batch.create({
      _id,
      name: `${plan.name} — ${dayjs(start).format('MMMM YYYY')}`,
      code,
      description: plan.description,
      startDate: start,
      endDate: end,
      status,
      leadInstructor: userId[plan.lead],
      instructors: instructorKeys.map((k) => userId[k]),
      studentCount: plan.students,
      schedule: { days: plan.days, startTime: plan.startTime, endTime: plan.endTime },
      totalPlannedSessions: plan.planned,
      modules: plan.modules.map((title, i) => ({
        title,
        isCompleted: !!moduleCompletedOn[i],
        completedAt: moduleCompletedOn[i] ? at(moduleCompletedOn[i]!, '21:30') : null,
      })),
      createdBy: admin._id,
    });
  }
  const sessions = await Session.insertMany(sessionDocs, { timestamps: false });

  // --- Daily updates (last 30 days, a few missed; today left open so the "file today's update" prompt shows)
  const updateDocs: Record<string, unknown>[] = [];
  for (let offset = -30; offset <= -1; offset++) {
    const day = addDays(today, offset);
    if (offset < -1 && chance(0.12)) continue;
    const daySessions = sessionsByDay.get(day) ?? [];
    const held = daySessions.filter((s) => s.status === 'completed');
    const notHeld = daySessions.length - held.length;
    const roll = rand();
    const status: UpdateStatus = notHeld > 0 && roll < 0.5 ? 'at-risk' : roll < 0.05 ? 'blocked' : roll < 0.2 ? 'at-risk' : 'on-track';
    const batchesToday = [...new Set(held.map((s) => batchCodes[s.batch]))];
    const summary = held.length
      ? `${pick(SUMMARY_OPENERS)} ${held.length} session${held.length > 1 ? 's' : ''} ran across ${batchesToday.join(', ')}${notHeld ? `; ${notHeld} didn't go ahead as planned` : ''}.`
      : `${pick(SUMMARY_OPENERS)} No classes scheduled — spent the day on planning and student follow-ups.`;
    const noteBatch = held.length && chance(0.45) ? pick(held).batch : null;

    updateDocs.push({
      day,
      author: admin._id,
      summary,
      highlights: [...new Set([pick(HIGHLIGHTS), ...(chance(0.5) ? [pick(HIGHLIGHTS)] : [])])],
      blockers: status === 'on-track' ? (chance(0.2) ? [pick(BLOCKERS)] : []) : [pick(BLOCKERS)],
      nextDayPlan: [...new Set([pick(NEXT_STEPS), pick(NEXT_STEPS)])],
      batchNotes: noteBatch ? [{ batch: batchIds[noteBatch], note: pick(BATCH_NOTES) }] : [],
      status,
      createdAt: at(day, '21:30'),
      updatedAt: at(day, '21:30'),
    });
  }
  const updates = await DailyUpdate.insertMany(updateDocs, { timestamps: false });

  // --- Events --------------------------------------------------------------------------------------------
  const events = await Event.insertMany(
    EVENTS.map((e) => {
      const day = addDays(today, e.offset);
      const status: EventStatus = e.cancelled ? 'cancelled' : e.offset < 0 ? 'completed' : 'planned';
      return {
        title: e.title,
        day,
        startTime: e.time[0],
        endTime: e.time[1],
        type: e.type,
        batches: e.batches.map((k) => batchIds[k]),
        leadBy: userId[e.lead],
        coLeads: e.co.map((k) => userId[k]),
        description: e.description,
        location: e.location,
        status,
        outcomeNotes: status === 'completed' ? (e.outcome ?? '') : '',
        participantCount: status === 'completed' ? (e.participants ?? 0) : 0,
        createdBy: admin._id,
        createdAt: at(addDays(today, Math.min(e.offset, 0) - 10), '11:00'),
        updatedAt: at(day, e.time[1]),
      };
    }),
    { timestamps: false },
  );

  // --- Activity feed: the most recent things that "happened" ------------------------------------------
  const nameById = new Map((Object.keys(userId) as PersonKey[]).map((k) => [String(userId[k]), userName[k]]));
  const codeById = new Map(Object.keys(batchIds).map((k) => [String(batchIds[k]), batchCodes[k]]));
  const feed = [
    ...[...sessions]
      .sort((a, b) => (a.get('createdAt') as Date).getTime() - (b.get('createdAt') as Date).getTime())
      .slice(-14)
      .map((s) => ({
        actor: s.instructor,
        action: 'created',
        entity: 'session',
        entityId: s._id,
        summary: `${nameById.get(String(s.instructor))} logged ${s.status === 'completed' ? `a ${s.type.replace('-', ' ')}` : `a ${s.status} session`} in ${codeById.get(String(s.batch))}: ${s.title}`,
        createdAt: s.get('createdAt') as Date,
      })),
    ...updates.slice(-4).map((u) => ({
      actor: admin!._id,
      action: 'created',
      entity: 'update',
      entityId: u._id,
      summary: `${admin!.name} filed the daily update for ${dayjs(u.day).format('D MMM')} (${u.status})`,
      createdAt: u.get('createdAt') as Date,
    })),
    ...events
      .filter((e) => e.status === 'completed' && e.day >= addDays(today, -14))
      .map((e) => ({
        actor: admin!._id,
        action: 'completed',
        entity: 'event',
        entityId: e._id,
        summary: `${admin!.name} marked "${e.title}" completed (${e.participantCount} participants)`,
        createdAt: e.get('updatedAt') as Date,
      })),
  ].filter((a) => a.createdAt <= new Date());
  await Activity.insertMany(feed, { timestamps: false });

  console.log('\nDemo data ready:');
  console.table({
    users: 1 + created.length,
    batches: BATCHES.length,
    sessions: sessions.length,
    dailyUpdates: updates.length,
    events: events.length,
    activity: feed.length,
  });
  console.log(`Sign in as the admin from .env, or any of these (password: ${DEMO_PASSWORD}):`);
  console.table(Object.values(PEOPLE).map(({ name, email, role }) => ({ name, email, role })));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
