// Junior Linux Lab — full-page student dashboard.
// Requires portal-data.js to be loaded first.

document.addEventListener('DOMContentLoaded', initStudentDashboard);

function initStudentDashboard() {
  const {
    loadStudents, saveStudents, sendEnrollmentEmail, initEmailJS,
    getSession, clearSession, escapeHtml, SYLLABUS_TEMPLATE
  } = window.JLLPortal;

  initEmailJS();

  const session = getSession();
  if (!session || session.role !== 'student') {
    window.location.href = 'index.html';
    return;
  }

  const studentId = session.studentId;
  let student = loadStudents().find(s => s.studentId === studentId);
  if (!student) {
    // Session refers to a student record that no longer exists (e.g. demo
    // data was cleared) — bounce back rather than showing a broken page.
    clearSession();
    window.location.href = 'index.html';
    return;
  }

  const TERMINAL_BASE_URL = 'https://dericallan.github.io/browser-linux-terminal/';
  const MAX_TERMINALS = 4;
  let terminalTabs = []; // { id, label }
  let terminalCounter = 0;

  function usernameFromStudentName(name) {
    const cleaned = String(name || '').trim().replace(/\s+/g, '').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 24);
    return cleaned || 'guest';
  }

  const terminalUsername = usernameFromStudentName(student.studentName || student.parentName);

  document.getElementById('dashboard-student-name').textContent = student.studentName || student.parentName;

  /* ---------------- Overview ---------------- */
  function renderOverview() {
    const panel = document.getElementById('student-tab-overview');
    const feeBadge = student.feeStatus === 'paid'
      ? '<span class="fee-badge paid">✔️ Paid</span>'
      : '<span class="fee-badge pending">⏳ Pending</span>';

    panel.innerHTML =
      '<p class="dashboard-welcome">Welcome back, <strong>' + escapeHtml(student.studentName || student.parentName) + '</strong>!</p>' +
      '<div class="dashboard-summary">' +
        '<div><span class="dashboard-label">Student Name</span><span>' + escapeHtml(student.studentName || '—') + '</span></div>' +
        '<div><span class="dashboard-label">Parent Name</span><span>' + escapeHtml(student.parentName) + '</span></div>' +
        '<div><span class="dashboard-label">Course</span><span>' + escapeHtml(student.course) + '</span></div>' +
        '<div><span class="dashboard-label">Student Age</span><span>' + escapeHtml(String(student.age)) + '</span></div>' +
        '<div><span class="dashboard-label">Fee Status</span>' + feeBadge + '</div>' +
        '<div><span class="dashboard-label">Terminal Username</span><span>' + escapeHtml(terminalUsername) + '@terminal</span></div>' +
      '</div>' +
      '<h4 class="dashboard-section-title">🔒 Change Password</h4>' +
      (student.feeStatus === 'paid'
        ? '<form class="modal-form" id="change-password-form" style="max-width:360px;">' +
            '<div class="form-group">' +
              '<label for="new-password">New Password</label>' +
              '<input type="password" id="new-password" required minlength="4" placeholder="New password">' +
            '</div>' +
            '<div class="form-group">' +
              '<label for="confirm-password">Confirm Password</label>' +
              '<input type="password" id="confirm-password" required minlength="4" placeholder="Confirm new password">' +
            '</div>' +
            '<p class="portal-error hidden" id="password-error"></p>' +
            '<p class="portal-hint" id="password-success" style="display:none; color: var(--accent-green); margin-top:0;">Password updated!</p>' +
            '<button type="submit" class="btn btn-primary" style="align-self:flex-start;">Update Password</button>' +
          '</form>'
        : '<p class="portal-hint" style="margin-top:0; text-align:left;">Password changes unlock once your course fee is marked as paid by your teacher. Your fee status is shown above.</p>'
      );

    const pwForm = document.getElementById('change-password-form');
    if (pwForm) {
      pwForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newPw = document.getElementById('new-password').value;
        const confirmPw = document.getElementById('confirm-password').value;
        const errorEl = document.getElementById('password-error');
        const successEl = document.getElementById('password-success');
        errorEl.classList.add('hidden');
        successEl.style.display = 'none';

        if (newPw !== confirmPw) {
          errorEl.textContent = "Passwords don't match.";
          errorEl.classList.remove('hidden');
          return;
        }

        const allStudents = loadStudents();
        const s = allStudents.find(s2 => s2.studentId === studentId);
        s.password = newPw;
        saveStudents(allStudents);
        student = s;
        pwForm.reset();
        successEl.style.display = 'block';
      });
    }
  }

  /* ---------------- Projects ---------------- */
  function renderProjects() {
    const panel = document.getElementById('student-tab-projects');
    panel.innerHTML = '<ul class="portal-list" id="student-projects-list"></ul>';
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
        student = s;
      });
    });
  }

  /* ---------------- Notes ---------------- */
  function renderNotes() {
    const panel = document.getElementById('student-tab-notes');
    panel.innerHTML =
      '<ul class="portal-list">' +
        SYLLABUS_TEMPLATE.map(w => '<li><strong>Week ' + w.week + ':</strong> ' + escapeHtml(w.topic) + '</li>').join('') +
      '</ul>';
  }

  /* ---------------- Terminal ---------------- */
  function renderTerminal() {
    const panel = document.getElementById('student-tab-terminal');
    panel.innerHTML =
      '<p class="portal-hint" style="margin-top:0; text-align:left;">Logged in as <code>' + escapeHtml(terminalUsername) + '@terminal</code>. Each tab is its own independent Linux session — state resets if you close or restart it.</p>' +
      '<div class="terminal-tabs-bar" id="terminal-tabs-bar"></div>' +
      '<div class="terminal-panels" id="terminal-panels"></div>';

    document.getElementById('terminal-tabs-bar').addEventListener('click', (e) => {
      const addBtn = e.target.closest('.terminal-tab-add');
      const closeBtn = e.target.closest('.terminal-tab-close');
      const tabBtn = e.target.closest('.terminal-tab-btn');

      if (addBtn) {
        openNewTerminalTab();
      } else if (closeBtn) {
        e.stopPropagation();
        closeTerminalTab(closeBtn.getAttribute('data-id'));
      } else if (tabBtn) {
        switchTerminalTab(tabBtn.getAttribute('data-id'));
      }
    });

    if (terminalTabs.length === 0) {
      openNewTerminalTab();
    } else {
      redrawTerminalTabs();
    }
  }

  function openNewTerminalTab() {
    if (terminalTabs.length >= MAX_TERMINALS) {
      alert('You can have up to ' + MAX_TERMINALS + ' terminals open at once — close one first to open another.');
      return;
    }
    terminalCounter++;
    const tab = { id: 'term-' + terminalCounter, label: 'Terminal ' + terminalCounter };
    terminalTabs.push(tab);
    redrawTerminalTabs(tab.id);
  }

  function closeTerminalTab(id) {
    const wasActive = document.getElementById(id) && document.getElementById(id).classList.contains('active-terminal-panel');
    terminalTabs = terminalTabs.filter(t => t.id !== id);
    const panel = document.getElementById(id);
    if (panel) panel.remove();

    if (terminalTabs.length === 0) {
      openNewTerminalTab();
      return;
    }
    redrawTerminalTabs(wasActive ? terminalTabs[terminalTabs.length - 1].id : null);
  }

  function switchTerminalTab(id) {
    redrawTerminalTabs(id);
  }

  function redrawTerminalTabs(activeId) {
    const tabsBar = document.getElementById('terminal-tabs-bar');
    const panelsContainer = document.getElementById('terminal-panels');
    if (!tabsBar || !panelsContainer) return;

    const existingActive = panelsContainer.querySelector('.active-terminal-panel');
    const resolvedActive = activeId || (existingActive && existingActive.id) || (terminalTabs[0] && terminalTabs[0].id);

    tabsBar.innerHTML = terminalTabs.map(t =>
      '<button type="button" class="terminal-tab-btn' + (t.id === resolvedActive ? ' active' : '') + '" data-id="' + t.id + '">' +
        escapeHtml(t.label) +
        '<span class="terminal-tab-close" data-id="' + t.id + '">&times;</span>' +
      '</button>'
    ).join('') + '<button type="button" class="terminal-tab-add" title="Open a new terminal">+ New</button>';

    terminalTabs.forEach(t => {
      if (!document.getElementById(t.id)) {
        const iframe = document.createElement('iframe');
        iframe.id = t.id;
        iframe.className = 'terminal-iframe';
        iframe.src = TERMINAL_BASE_URL + '?user=' + encodeURIComponent(terminalUsername);
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

  /* ---------------- Tabs + Logout ---------------- */
  const studentTabButtons = document.querySelectorAll('#student-tabs .portal-tab-btn');
  studentTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      studentTabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.getAttribute('data-tab');
      document.querySelectorAll('.student-tab-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById('student-tab-' + tab).classList.remove('hidden');
    });
  });

  document.getElementById('dashboard-logout-btn').addEventListener('click', () => {
    clearSession();
    window.location.href = 'index.html';
  });

  renderOverview();
  renderProjects();
  renderNotes();
  renderTerminal();
}
