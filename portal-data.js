// Junior Linux Lab — shared data layer + EmailJS wiring.
// Loaded by both index.html (login/enroll/mentor portal) and
// student-dashboard.html (the student's full-page workspace).
//
// DEMO / PROTOTYPE NOTICE: this site is static HTML with no backend or
// database. Accounts and progress data live only in this browser's
// localStorage — there is no real security, and data will not sync across
// devices or survive clearing browser storage. It's built to demonstrate
// the feature, not to hold real student data.

/* ==========================================================================
   EmailJS configuration
   To actually send enrollment emails, create a free account at emailjs.com,
   then replace the three placeholders below with your own Service ID,
   Template ID, and Public Key. Your email template should use these
   variables: {{to_email}}, {{parent_name}}, {{student_name}}, {{student_age}},
   {{course_name}}, {{price}}, {{batch_times}}, {{login_id}}, {{login_password}}.
   ========================================================================== */
const EMAILJS_PUBLIC_KEY = 'mDsVxFDHqLRc7pPol';
const EMAILJS_SERVICE_ID = 'service_1k5l144';
const EMAILJS_TEMPLATE_ID = 'template_l0un4cs';
let emailjsReady = false;

function initEmailJS() {
  const configured = !!EMAILJS_PUBLIC_KEY && !!EMAILJS_SERVICE_ID && !!EMAILJS_TEMPLATE_ID
    && !/^YOUR_/.test(EMAILJS_PUBLIC_KEY) && !/^YOUR_/.test(EMAILJS_SERVICE_ID) && !/^YOUR_/.test(EMAILJS_TEMPLATE_ID);

  if (!configured) {
    console.warn('[Junior Linux Lab] EmailJS is not configured yet — enrollment emails will be skipped. See EMAILJS_* constants at the top of portal-data.js.');
    return;
  }

  // The EmailJS SDK loads via an async <script> tag so it never blocks the
  // rest of the page from becoming interactive. That means it may not have
  // finished loading yet when this runs, so poll briefly instead of giving
  // up immediately.
  let attempts = 0;
  const tryInit = () => {
    if (window.emailjs) {
      window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
      emailjsReady = true;
      return;
    }
    attempts++;
    if (attempts < 25) {
      setTimeout(tryInit, 200);
    } else {
      console.warn('[Junior Linux Lab] EmailJS SDK never finished loading — enrollment emails will be skipped for this page load.');
    }
  };
  tryInit();
}

function sendEnrollmentEmail(details) {
  if (!emailjsReady) {
    return Promise.resolve({ skipped: true });
  }
  return window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, details);
}

/* ==========================================================================
   Demo data layer (localStorage-backed)
   ========================================================================== */
// DEMO CREDENTIAL NOTICE: this repo is public, so nothing hardcoded here is
// truly confidential — anyone can read the source. This is hidden from the
// visible UI (no on-screen hint), but treat it as "not shown to casual
// visitors", not as a real secret.
const MENTOR_CREDENTIALS = { id: 'ericallan.daniel@gmail.com', password: 'Mentor@2026' };
const MENTOR_TERMINAL_USERNAME = 'Eric';

const PROJECT_TEMPLATE = [
  { name: 'Calculator', status: 'Not Started' },
  { name: 'Guessing Game', status: 'Not Started' },
  { name: 'Quiz Game', status: 'Not Started' },
  { name: 'File Organizer', status: 'Not Started' }
];

const SYLLABUS_TEMPLATE = [
  { week: 1, topic: 'CLI basics: cd, ls, pwd' },
  { week: 2, topic: 'Directory structures & file management' },
  { week: 3, topic: 'Command line flags & the nano editor' },
  { week: 4, topic: 'Review & mini project: file navigator' },
  { week: 5, topic: 'Variables, loops, and control flow' },
  { week: 6, topic: 'Pipes (|) and redirects (> >>)' },
  { week: 7, topic: 'Environment variables' },
  { week: 8, topic: 'Custom shell script automation' },
  { week: 9, topic: 'Build: Calculator & Guessing Game' },
  { week: 10, topic: 'Build: Quiz Game' },
  { week: 11, topic: 'Linux permissions: chmod, chown, groups' },
  { week: 12, topic: 'Build: File Organizer & final showcase' }
];

function loadStudents() {
  return JSON.parse(localStorage.getItem('jll_students') || '[]');
}

function saveStudents(students) {
  localStorage.setItem('jll_students', JSON.stringify(students));
}

function loadSyllabusProgress() {
  const stored = JSON.parse(localStorage.getItem('jll_syllabus_progress') || 'null');
  if (stored) return stored;
  const fresh = SYLLABUS_TEMPLATE.map(w => ({ ...w, done: false }));
  localStorage.setItem('jll_syllabus_progress', JSON.stringify(fresh));
  return fresh;
}

function saveSyllabusProgress(progress) {
  localStorage.setItem('jll_syllabus_progress', JSON.stringify(progress));
}

function generatePassword() {
  return Math.random().toString(36).slice(-8);
}

function registerStudent({ parentName, studentName, email, age, course }) {
  const students = loadStudents();
  const existing = students.find(s => s.studentId.toLowerCase() === email.toLowerCase());
  if (existing) return existing;

  const student = {
    studentId: email,
    password: generatePassword(),
    parentName,
    studentName,
    age,
    course,
    enrolledAt: new Date().toISOString(),
    feeStatus: 'pending',
    projects: PROJECT_TEMPLATE.map(p => ({ ...p }))
  };
  students.push(student);
  saveStudents(students);
  return student;
}

function updateStudentDetails(originalStudentId, { parentName, studentName, email, age }) {
  const students = loadStudents();
  const student = students.find(s => s.studentId === originalStudentId);
  if (!student) return null;

  student.parentName = parentName;
  student.studentName = studentName;
  student.studentId = email; // email doubles as the login ID
  student.age = age;
  saveStudents(students);
  return student;
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/* ==========================================================================
   Session helpers (shared between index.html and student-dashboard.html)
   ========================================================================== */
function getSession() {
  return JSON.parse(sessionStorage.getItem('jll_session') || 'null');
}
function setSession(session) {
  sessionStorage.setItem('jll_session', JSON.stringify(session));
}
function clearSession() {
  sessionStorage.removeItem('jll_session');
}

window.JLLPortal = {
  registerStudent,
  updateStudentDetails,
  loadStudents,
  saveStudents,
  loadSyllabusProgress,
  saveSyllabusProgress,
  sendEnrollmentEmail,
  initEmailJS,
  getSession,
  setSession,
  clearSession,
  escapeHtml,
  MENTOR_CREDENTIALS,
  MENTOR_TERMINAL_USERNAME,
  SYLLABUS_TEMPLATE
};
