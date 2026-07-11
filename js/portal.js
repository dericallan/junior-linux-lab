// Junior Linux Lab — Login modal + Mentor Portal (index.html only).
// The student dashboard lives on its own page: student-dashboard.html /
// student-dashboard.js. Shared data/session helpers live in portal-data.js,
// which must be loaded before this file.

document.addEventListener('DOMContentLoaded', initPortal);

function initPortal() {
  const {
    loadStudents, updateStudentDetails, setStudentFeeStatus, loadSyllabusProgress, saveSyllabusProgress,
    sendEnrollmentEmail, initEmailJS, onAuthReady, getCurrentUser, isMentorUser,
    loginMentor, loginStudent, logout,
    escapeHtml, usernameFromName, MENTOR_TERMINAL_USERNAME
  } = window.JLLPortal;

  initEmailJS();

  const loginNavBtn = document.getElementById('login-nav-btn');
  const loginModal = document.getElementById('login-modal');
  const loginModalClose = document.getElementById('login-modal-close');
  const loginForm = document.getElementById('login-form');
  const loginSubmitBtn = loginForm.querySelector('button[type="submit"]');
  const loginError = document.getElementById('login-error');
  const loginIdInput = document.getElementById('login-id');
  const loginHint = document.getElementById('login-hint');
  const loginTabButtons = document.querySelectorAll('#login-tabs .portal-tab-btn');

  const teacherDashboardModal = document.getElementById('teacher-dashboard-modal');

  if (!loginNavBtn || !loginModal || !teacherDashboardModal) return;

  let activeRole = 'student';
  let currentUser = null;
  let isMentor = false;

  onAuthReady((user) => {
    currentUser = user;
    isMentor = isMentorUser(user);
  });

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
    if (currentUser && isMentor) {
      openTeacherDashboard();
    } else if (currentUser && !isMentor) {
      window.location.href = 'pages/student-dashboard.html';
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
      if (activeRole === 'mentor') {
        loginIdInput.placeholder = 'mentor email';
        loginHint.textContent = 'Mentor login is restricted to Junior Linux Lab staff.';
      } else {
        loginIdInput.placeholder = 'you@example.com';
        loginHint.textContent = 'New students: your login is created automatically when you enroll — check the confirmation popup (and your email) for your password.';
      }
    });
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = loginIdInput.value.trim();
    const password = document.getElementById('login-password').value;

    loginError.classList.add('hidden');
    loginSubmitBtn.disabled = true;
    try {
      if (activeRole === 'mentor') {
        await loginMentor(id, password);
        currentUser = getCurrentUser();
        isMentor = true;
        closeLogin();
        await openTeacherDashboard();
      } else {
        await loginStudent(id, password);
        currentUser = getCurrentUser();
        isMentor = false;
        window.location.href = 'pages/student-dashboard.html';
      }
    } catch (err) {
      showLoginError(activeRole === 'mentor'
        ? 'Incorrect mentor ID or password.'
        : 'No matching student account. Check your ID/password, or enroll first.');
    } finally {
      loginSubmitBtn.disabled = false;
    }
  });

  /* ---------------- Mentor dashboard ---------------- */
  async function renderTeacherProgress() {
    const progress = await loadSyllabusProgress();
    const panel = document.getElementById('teacher-tab-progress');
    panel.innerHTML =
      '<p class="portal-hint" style="margin-top:0; text-align:left;">Edit a topic\'s text and it updates immediately in every student\'s Notes tab.</p>' +
      '<ul class="portal-list" id="syllabus-progress-list"></ul>';
    const list = document.getElementById('syllabus-progress-list');
    progress.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'portal-checklist-item portal-editable-topic';
      li.innerHTML =
        '<label><input type="checkbox" data-idx="' + idx + '" ' + (item.done ? 'checked' : '') + '> Week ' + item.week + ':</label>' +
        '<input type="text" class="topic-edit-input" data-idx="' + idx + '" value="' + escapeHtml(item.topic).replace(/"/g, '&quot;') + '">';
      list.appendChild(li);
    });
    list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', async () => {
        const idx = parseInt(cb.getAttribute('data-idx'), 10);
        const p = await loadSyllabusProgress();
        p[idx].done = cb.checked;
        await saveSyllabusProgress(p);
      });
    });
    list.querySelectorAll('.topic-edit-input').forEach(input => {
      input.addEventListener('change', async () => {
        const idx = parseInt(input.getAttribute('data-idx'), 10);
        const p = await loadSyllabusProgress();
        p[idx].topic = input.value;
        await saveSyllabusProgress(p);
      });
    });
  }

  async function renderTeacherStudents() {
    const students = await loadStudents();
    const panel = document.getElementById('teacher-tab-students');
    if (students.length === 0) {
      panel.innerHTML = '<p class="portal-empty">No students enrolled yet.</p>';
      return;
    }
    panel.innerHTML =
      '<p class="portal-hint" style="margin-top:0; text-align:left;">👁️ Watch opens a live, read/write mirror of a student\'s terminal — best-effort only, and only works while that student currently has their terminal tab open.</p>' +
      '<table class="portal-table"><thead><tr><th>Student</th><th>Parent</th><th>Age</th><th>Email</th><th>Enrolled</th><th>Fee</th><th></th></tr></thead><tbody>' +
      students.map(s =>
        '<tr data-row-id="' + escapeHtml(s.studentId) + '">' +
          '<td class="cell-student-name">' + escapeHtml(s.studentName || '—') + '</td>' +
          '<td class="cell-parent-name">' + escapeHtml(s.parentName) + '</td>' +
          '<td class="cell-age">' + escapeHtml(String(s.age)) + '</td>' +
          '<td class="cell-email">' + escapeHtml(s.email) + '</td>' +
          '<td>' + new Date(s.enrolledAt).toLocaleDateString() + '</td>' +
          '<td>' + (s.feeStatus === 'paid' ? '<span class="fee-badge paid">Paid</span>' : '<span class="fee-badge pending">Pending</span>') + '</td>' +
          '<td>' +
            '<button class="btn btn-secondary btn-sm edit-student-btn" data-id="' + escapeHtml(s.studentId) + '">Edit</button> ' +
            '<button class="btn btn-secondary btn-sm watch-student-btn" data-username="' + escapeHtml(usernameFromName(s.studentName || s.parentName)) + '">👁️ Watch</button>' +
          '</td>' +
        '</tr>'
      ).join('') +
      '</tbody></table>';

    panel.querySelectorAll('.edit-student-btn').forEach(btn => {
      btn.addEventListener('click', () => startEditStudentRow(btn.getAttribute('data-id'), students));
    });
    panel.querySelectorAll('.watch-student-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetUsername = btn.getAttribute('data-username');
        window.open('https://dericallan.github.io/browser-linux-terminal/?watch=' + encodeURIComponent(targetUsername), '_blank', 'noopener,noreferrer');
      });
    });
  }

  function startEditStudentRow(studentId, students) {
    const student = students.find(s => s.studentId === studentId);
    if (!student) return;

    const row = document.querySelector('#teacher-tab-students tr[data-row-id="' + CSS.escape(studentId) + '"]');
    if (!row) return;

    row.querySelector('.cell-student-name').innerHTML = '<input type="text" class="edit-input" data-field="studentName" value="' + escapeHtml(student.studentName || '').replace(/"/g, '&quot;') + '">';
    row.querySelector('.cell-parent-name').innerHTML = '<input type="text" class="edit-input" data-field="parentName" value="' + escapeHtml(student.parentName || '').replace(/"/g, '&quot;') + '">';
    row.querySelector('.cell-age').innerHTML = '<input type="number" class="edit-input" data-field="age" value="' + escapeHtml(String(student.age)) + '" style="width:60px;">';
    // Login email is tied to the student's Firebase account and can't be
    // changed from here without an admin backend, so it stays read-only.

    const lastCell = row.querySelector('td:last-child');
    lastCell.innerHTML =
      '<button class="btn btn-primary btn-sm save-student-btn" data-id="' + escapeHtml(studentId) + '">Save</button> ' +
      '<button class="btn btn-secondary btn-sm cancel-student-btn">Cancel</button>';

    lastCell.querySelector('.save-student-btn').addEventListener('click', async () => {
      const parentName = row.querySelector('[data-field="parentName"]').value.trim();
      const studentName = row.querySelector('[data-field="studentName"]').value.trim();
      const age = row.querySelector('[data-field="age"]').value.trim();
      await updateStudentDetails(studentId, { parentName, studentName, age });
      await renderTeacherStudents();
      await renderTeacherFees();
    });
    lastCell.querySelector('.cancel-student-btn').addEventListener('click', renderTeacherStudents);
  }

  async function renderTeacherFees() {
    const students = await loadStudents();
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
          '<td>' + escapeHtml(s.email) + '</td>' +
          '<td>' + escapeHtml(s.course) + '</td>' +
          '<td><button class="btn btn-secondary btn-sm mark-paid-btn" data-id="' + escapeHtml(s.studentId) + '">Mark Paid</button></td>' +
        '</tr>'
      ).join('') +
      '</tbody></table>';

    panel.querySelectorAll('.mark-paid-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await setStudentFeeStatus(id, 'paid');
        await renderTeacherFees();
        await renderTeacherStudents();
      });
    });
  }

  /* ---------------- Mentor's own terminal ---------------- */
  const MENTOR_TERMINAL_BASE_URL = 'https://dericallan.github.io/browser-linux-terminal/';
  const MENTOR_MAX_TERMINALS = 4;
  let mentorTerminalTabs = [];
  let mentorTerminalCounter = 0;

  function renderTeacherTerminal() {
    const panel = document.getElementById('teacher-tab-terminal');
    panel.innerHTML =
      '<p class="portal-hint" style="margin-top:0; text-align:left;">Logged in as <code>' + escapeHtml(MENTOR_TERMINAL_USERNAME) + '@terminal</code>.</p>' +
      '<div class="terminal-tabs-bar" id="mentor-terminal-tabs-bar"></div>' +
      '<div class="terminal-panels" id="mentor-terminal-panels"></div>';

    document.getElementById('mentor-terminal-tabs-bar').addEventListener('click', (e) => {
      const addBtn = e.target.closest('.terminal-tab-add');
      const closeBtn = e.target.closest('.terminal-tab-close');
      const tabBtn = e.target.closest('.terminal-tab-btn');

      if (addBtn) openNewMentorTerminalTab();
      else if (closeBtn) { e.stopPropagation(); closeMentorTerminalTab(closeBtn.getAttribute('data-id')); }
      else if (tabBtn) redrawMentorTerminalTabs(tabBtn.getAttribute('data-id'));
    });

    if (mentorTerminalTabs.length === 0) openNewMentorTerminalTab();
    else redrawMentorTerminalTabs();
  }

  function openNewMentorTerminalTab() {
    if (mentorTerminalTabs.length >= MENTOR_MAX_TERMINALS) {
      alert('You can have up to ' + MENTOR_MAX_TERMINALS + ' terminals open at once — close one first to open another.');
      return;
    }
    mentorTerminalCounter++;
    const tab = { id: 'mentor-term-' + mentorTerminalCounter, label: 'Terminal ' + mentorTerminalCounter };
    mentorTerminalTabs.push(tab);
    redrawMentorTerminalTabs(tab.id);
  }

  function closeMentorTerminalTab(id) {
    const wasActive = document.getElementById(id) && document.getElementById(id).classList.contains('active-terminal-panel');
    mentorTerminalTabs = mentorTerminalTabs.filter(t => t.id !== id);
    const panel = document.getElementById(id);
    if (panel) panel.remove();

    if (mentorTerminalTabs.length === 0) {
      openNewMentorTerminalTab();
      return;
    }
    redrawMentorTerminalTabs(wasActive ? mentorTerminalTabs[mentorTerminalTabs.length - 1].id : null);
  }

  function redrawMentorTerminalTabs(activeId) {
    const tabsBar = document.getElementById('mentor-terminal-tabs-bar');
    const panelsContainer = document.getElementById('mentor-terminal-panels');
    if (!tabsBar || !panelsContainer) return;

    const existingActive = panelsContainer.querySelector('.active-terminal-panel');
    const resolvedActive = activeId || (existingActive && existingActive.id) || (mentorTerminalTabs[0] && mentorTerminalTabs[0].id);

    tabsBar.innerHTML = mentorTerminalTabs.map(t =>
      '<button type="button" class="terminal-tab-btn' + (t.id === resolvedActive ? ' active' : '') + '" data-id="' + t.id + '">' +
        escapeHtml(t.label) +
        '<span class="terminal-tab-close" data-id="' + t.id + '">&times;</span>' +
      '</button>'
    ).join('') + '<button type="button" class="terminal-tab-add" title="Open a new terminal">+ New</button>';

    mentorTerminalTabs.forEach(t => {
      if (!document.getElementById(t.id)) {
        const iframe = document.createElement('iframe');
        iframe.id = t.id;
        iframe.className = 'terminal-iframe';
        iframe.src = MENTOR_TERMINAL_BASE_URL + '?user=' + encodeURIComponent(MENTOR_TERMINAL_USERNAME);
        iframe.title = t.label;
        iframe.allow = 'fullscreen';
        iframe.setAttribute('allowfullscreen', 'true');
        panelsContainer.appendChild(iframe);
      }
    });

    panelsContainer.querySelectorAll('.terminal-iframe').forEach(f => {
      f.classList.toggle('active-terminal-panel', f.id === resolvedActive);
    });
  }

  async function openTeacherDashboard() {
    await Promise.all([renderTeacherProgress(), renderTeacherStudents(), renderTeacherFees()]);
    renderTeacherTerminal();
    teacherDashboardModal.classList.add('open');
  }

  document.getElementById('teacher-dashboard-close').addEventListener('click', () => {
    teacherDashboardModal.classList.remove('open');
  });
  document.getElementById('teacher-logout-btn').addEventListener('click', async () => {
    await logout();
    currentUser = null;
    isMentor = false;
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
