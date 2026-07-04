// Junior Linux Lab — Student / Teacher Portal
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
   variables: {{to_email}}, {{parent_name}}, {{student_age}}, {{course_name}},
   {{price}}, {{batch_times}}, {{login_id}}, {{login_password}}.
   ========================================================================== */
const EMAILJS_PUBLIC_KEY = 'mDsVxFDHqLRc7pPol';
const EMAILJS_SERVICE_ID = 'service_1k5l144';
const EMAILJS_TEMPLATE_ID = 'template_l0un4cs';
let emailjsReady = false;

function initEmailJS() {
  const configured = !!EMAILJS_PUBLIC_KEY && !!EMAILJS_SERVICE_ID && !!EMAILJS_TEMPLATE_ID
    && !/^YOUR_/.test(EMAILJS_PUBLIC_KEY) && !/^YOUR_/.test(EMAILJS_SERVICE_ID) && !/^YOUR_/.test(EMAILJS_TEMPLATE_ID);

  if (window.emailjs && configured) {
    window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    emailjsReady = true;
  } else {
    console.warn('[Junior Linux Lab] EmailJS is not configured yet — enrollment emails will be skipped. See EMAILJS_* constants at the top of portal.js.');
  }
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
const TEACHER_CREDENTIALS = { id: 'teacher@juniorlinuxlab.com', password: 'teach123' };

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

function registerStudent({ parentName, email, age, course }) {
  const students = loadStudents();
  const existing = students.find(s => s.studentId.toLowerCase() === email.toLowerCase());
  if (existing) return existing;

  const student = {
    studentId: email,
    password: generatePassword(),
    parentName,
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

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

window.JLLPortal = {
  registerStudent,
  loadStudents,
  saveStudents,
  loadSyllabusProgress,
  saveSyllabusProgress,
  sendEnrollmentEmail,
  TEACHER_CREDENTIALS
};

/* ==========================================================================
   Login + Dashboard UI
   ========================================================================== */
document.addEventListener('DOMContentLoaded', initPortal);

function initPortal() {
  initEmailJS();

  const loginNavBtn = document.getElementById('login-nav-btn');
  const loginModal = document.getElementById('login-modal');
  const loginModalClose = document.getElementById('login-modal-close');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const loginIdInput = document.getElementById('login-id');
  const loginHint = document.getElementById('login-hint');
  const loginTabButtons = document.querySelectorAll('#login-tabs .portal-tab-btn');

  const studentDashboardModal = document.getElementById('student-dashboard-modal');
  const teacherDashboardModal = document.getElementById('teacher-dashboard-modal');

  if (!loginNavBtn || !loginModal || !studentDashboardModal || !teacherDashboardModal) return;

  let activeRole = 'student';

  function getSession() {
    return JSON.parse(sessionStorage.getItem('jll_session') || 'null');
  }
  function setSession(session) {
    sessionStorage.setItem('jll_session', JSON.stringify(session));
  }
  function clearSession() {
    sessionStorage.removeItem('jll_session');
  }

  function openLogin() {
    loginError.classList.add('hidden');
    loginForm.reset();
    loginModal.classList.add('open');
  }
  function closeLogin() {
    loginModal.classList.remove('open');
  }
  function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.classList.remove('hidden');
  }

  loginNavBtn.addEventListener('click', () => {
    const session = getSession();
    if (session && session.role === 'student') {
      openStudentDashboard(session.studentId);
    } else if (session && session.role === 'teacher') {
      openTeacherDashboard();
    } else {
      openLogin();
    }
  });

  loginModalClose.addEventListener('click', closeLogin);
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) closeLogin();
  });

  loginTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      loginTabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRole = btn.getAttribute('data-role');
      loginError.classList.add('hidden');
      if (activeRole === 'teacher') {
        loginIdInput.placeholder = 'teacher@juniorlinuxlab.com';
        loginHint.innerHTML = 'Demo teacher login — ID: <code>teacher@juniorlinuxlab.com</code>, Password: <code>teach123</code>';
      } else {
        loginIdInput.placeholder = 'you@example.com';
        loginHint.textContent = 'New students: your login is created automatically when you enroll — check the confirmation popup (and your email) for your password.';
      }
    });
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = loginIdInput.value.trim();
    const password = document.getElementById('login-password').value;

    if (activeRole === 'teacher') {
      if (id === TEACHER_CREDENTIALS.id && password === TEACHER_CREDENTIALS.password) {
        setSession({ role: 'teacher' });
        closeLogin();
        openTeacherDashboard();
      } else {
        showLoginError('Incorrect teacher ID or password.');
      }
    } else {
      const students = loadStudents();
      const student = students.find(s => s.studentId.toLowerCase() === id.toLowerCase() && s.password === password);
      if (student) {
        setSession({ role: 'student', studentId: student.studentId });
        closeLogin();
        openStudentDashboard(student.studentId);
      } else {
        showLoginError('No matching student account. Check your ID/password, or enroll first.');
      }
    }
  });

  /* ---------------- Student dashboard ---------------- */
  function openStudentDashboard(studentId) {
    const students = loadStudents();
    const student = students.find(s => s.studentId === studentId);
    if (!student) return;

    const body = document.getElementById('student-dashboard-body');
    const feeBadge = student.feeStatus === 'paid'
      ? '<span class="fee-badge paid">✔️ Paid</span>'
      : '<span class="fee-badge pending">⏳ Pending</span>';

    body.innerHTML =
      '<p class="dashboard-welcome">Welcome back, <strong>' + escapeHtml(student.parentName) + '</strong>!</p>' +
      '<div class="dashboard-summary">' +
        '<div><span class="dashboard-label">Course</span><span>' + escapeHtml(student.course) + '</span></div>' +
        '<div><span class="dashboard-label">Student Age</span><span>' + escapeHtml(String(student.age)) + '</span></div>' +
        '<div><span class="dashboard-label">Fee Status</span>' + feeBadge + '</div>' +
      '</div>' +
      '<h4 class="dashboard-section-title">📁 My Projects</h4>' +
      '<ul class="portal-list" id="student-projects-list"></ul>' +
      '<h4 class="dashboard-section-title">📝 My Notes</h4>' +
      '<ul class="portal-list">' +
        SYLLABUS_TEMPLATE.map(w => '<li><strong>Week ' + w.week + ':</strong> ' + escapeHtml(w.topic) + '</li>').join('') +
      '</ul>';

    const projectsList = document.getElementById('student-projects-list');
    student.projects.forEach((proj, idx) => {
      const li = document.createElement('li');
      li.className = 'portal-project-item';
      li.innerHTML =
        '<span>' + escapeHtml(proj.name) + '</span>' +
        '<select class="project-status-select" data-idx="' + idx + '">' +
          '<option value="Not Started">Not Started</option>' +
          '<option value="In Progress">In Progress</option>' +
          '<option value="Completed">Completed</option>' +
        '</select>';
      li.querySelector('select').value = proj.status;
      projectsList.appendChild(li);
    });

    projectsList.querySelectorAll('.project-status-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.getAttribute('data-idx'), 10);
        const allStudents = loadStudents();
        const s = allStudents.find(s2 => s2.studentId === studentId);
        s.projects[idx].status = sel.value;
        saveStudents(allStudents);
      });
    });

    studentDashboardModal.classList.add('open');
  }

  document.getElementById('student-dashboard-close').addEventListener('click', () => {
    studentDashboardModal.classList.remove('open');
  });
  document.getElementById('student-logout-btn').addEventListener('click', () => {
    clearSession();
    studentDashboardModal.classList.remove('open');
  });

  /* ---------------- Teacher dashboard ---------------- */
  function renderTeacherProgress() {
    const progress = loadSyllabusProgress();
    const panel = document.getElementById('teacher-tab-progress');
    panel.innerHTML = '<ul class="portal-list" id="syllabus-progress-list"></ul>';
    const list = document.getElementById('syllabus-progress-list');
    progress.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'portal-checklist-item';
      li.innerHTML =
        '<label><input type="checkbox" data-idx="' + idx + '" ' + (item.done ? 'checked' : '') + '> ' +
        'Week ' + item.week + ': ' + escapeHtml(item.topic) + '</label>';
      list.appendChild(li);
    });
    list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = parseInt(cb.getAttribute('data-idx'), 10);
        const p = loadSyllabusProgress();
        p[idx].done = cb.checked;
        saveSyllabusProgress(p);
      });
    });
  }

  function renderTeacherStudents() {
    const students = loadStudents();
    const panel = document.getElementById('teacher-tab-students');
    if (students.length === 0) {
      panel.innerHTML = '<p class="portal-empty">No students enrolled yet.</p>';
      return;
    }
    panel.innerHTML =
      '<table class="portal-table"><thead><tr><th>Parent</th><th>Age</th><th>Email</th><th>Enrolled</th><th>Fee</th></tr></thead><tbody>' +
      students.map(s =>
        '<tr>' +
          '<td>' + escapeHtml(s.parentName) + '</td>' +
          '<td>' + escapeHtml(String(s.age)) + '</td>' +
          '<td>' + escapeHtml(s.studentId) + '</td>' +
          '<td>' + new Date(s.enrolledAt).toLocaleDateString() + '</td>' +
          '<td>' + (s.feeStatus === 'paid' ? '<span class="fee-badge paid">Paid</span>' : '<span class="fee-badge pending">Pending</span>') + '</td>' +
        '</tr>'
      ).join('') +
      '</tbody></table>';
  }

  function renderTeacherFees() {
    const students = loadStudents();
    const pending = students.filter(s => s.feeStatus === 'pending');
    const panel = document.getElementById('teacher-tab-fees');
    if (pending.length === 0) {
      panel.innerHTML = '<p class="portal-empty">No pending fees — everyone is paid up! 🎉</p>';
      return;
    }
    panel.innerHTML =
      '<table class="portal-table"><thead><tr><th>Parent</th><th>Email</th><th>Course</th><th></th></tr></thead><tbody>' +
      pending.map(s =>
        '<tr>' +
          '<td>' + escapeHtml(s.parentName) + '</td>' +
          '<td>' + escapeHtml(s.studentId) + '</td>' +
          '<td>' + escapeHtml(s.course) + '</td>' +
          '<td><button class="btn btn-secondary btn-sm mark-paid-btn" data-id="' + escapeHtml(s.studentId) + '">Mark Paid</button></td>' +
        '</tr>'
      ).join('') +
      '</tbody></table>';

    panel.querySelectorAll('.mark-paid-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const allStudents = loadStudents();
        const s = allStudents.find(s2 => s2.studentId === id);
        s.feeStatus = 'paid';
        saveStudents(allStudents);
        renderTeacherFees();
        renderTeacherStudents();
      });
    });
  }

  function openTeacherDashboard() {
    renderTeacherProgress();
    renderTeacherStudents();
    renderTeacherFees();
    teacherDashboardModal.classList.add('open');
  }

  document.getElementById('teacher-dashboard-close').addEventListener('click', () => {
    teacherDashboardModal.classList.remove('open');
  });
  document.getElementById('teacher-logout-btn').addEventListener('click', () => {
    clearSession();
    teacherDashboardModal.classList.remove('open');
  });

  const teacherTabButtons = document.querySelectorAll('#teacher-tabs .portal-tab-btn');
  teacherTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      teacherTabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.getAttribute('data-tab');
      document.querySelectorAll('.teacher-tab-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById('teacher-tab-' + tab).classList.remove('hidden');
    });
  });
}
