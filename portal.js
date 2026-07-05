// Junior Linux Lab — Login modal + Teacher Portal (index.html only).
// The student dashboard lives on its own page: student-dashboard.html /
// student-dashboard.js. Shared data/session helpers live in portal-data.js,
// which must be loaded before this file.

document.addEventListener('DOMContentLoaded', initPortal);

function initPortal() {
  const {
    loadStudents, saveStudents, loadSyllabusProgress, saveSyllabusProgress,
    sendEnrollmentEmail, initEmailJS, getSession, setSession, clearSession,
    escapeHtml, TEACHER_CREDENTIALS
  } = window.JLLPortal;

  initEmailJS();

  const loginNavBtn = document.getElementById('login-nav-btn');
  const loginModal = document.getElementById('login-modal');
  const loginModalClose = document.getElementById('login-modal-close');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const loginIdInput = document.getElementById('login-id');
  const loginHint = document.getElementById('login-hint');
  const loginTabButtons = document.querySelectorAll('#login-tabs .portal-tab-btn');

  const teacherDashboardModal = document.getElementById('teacher-dashboard-modal');

  if (!loginNavBtn || !loginModal || !teacherDashboardModal) return;

  let activeRole = 'student';

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
      window.location.href = 'student-dashboard.html';
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
        window.location.href = 'student-dashboard.html';
      } else {
        showLoginError('No matching student account. Check your ID/password, or enroll first.');
      }
    }
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
      '<table class="portal-table"><thead><tr><th>Student</th><th>Parent</th><th>Age</th><th>Email</th><th>Enrolled</th><th>Fee</th></tr></thead><tbody>' +
      students.map(s =>
        '<tr>' +
          '<td>' + escapeHtml(s.studentName || '—') + '</td>' +
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
      '<table class="portal-table"><thead><tr><th>Student</th><th>Parent</th><th>Email</th><th>Course</th><th></th></tr></thead><tbody>' +
      pending.map(s =>
        '<tr>' +
          '<td>' + escapeHtml(s.studentName || '—') + '</td>' +
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
