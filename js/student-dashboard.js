// Junior Linux Lab — full-page student dashboard.
// Requires portal-data.js to be loaded first.

document.addEventListener('DOMContentLoaded', initStudentDashboard);

function initStudentDashboard() {
  const {
    getStudent, setStudentProjects, sendEnrollmentEmail, initEmailJS,
    onAuthReady, getCurrentUser, isMentorUser, logout, changeStudentPassword,
    escapeHtml, loadSyllabusProgress, usernameFromName,
    uploadTerminalState, downloadTerminalState
  } = window.JLLPortal;

  initEmailJS();

  // Firebase Auth restores its session asynchronously, so the "are they
  // logged in" check can't happen synchronously at the top of the page like
  // the old localStorage-based session did — everything below waits for the
  // very first auth-state resolution instead.
  onAuthReady(async (user) => {
    if (!user || isMentorUser(user)) {
      window.location.href = '../index.html';
      return;
    }

    let student = await getStudent(user.uid);
    if (!student) {
      // Auth account exists but the Firestore student record is missing
      // (e.g. deleted by a mentor) — bounce back rather than showing a
      // broken page.
      await logout();
      window.location.href = '../index.html';
      return;
    }

    const TERMINAL_BASE_URL = 'https://dericallan.github.io/browser-linux-terminal/';
    const TERMINAL_ORIGIN = new URL(TERMINAL_BASE_URL).origin;
    const MAX_TERMINALS = 4;
    let terminalTabs = []; // { id, label }
    let terminalCounter = 0;
    // Only the primary (first/"watchable") terminal tab is synced to the
    // cloud — same reasoning as live-watch: one predictable session per
    // student, so multiple simultaneously-open tabs don't race over the
    // same saved slot. Extra tabs still get the terminal's own local
    // (same-browser-only) persistence, just not cross-device sync.
    let primaryTerminalId = null;

    function getPrimaryIframeWindow() {
      const el = primaryTerminalId && document.getElementById(primaryTerminalId);
      return el ? el.contentWindow : null;
    }

    /* ---------------- Terminal cloud sync (cross-device) ---------------- */
    let pendingMetaResolve = null;
    let pendingStateResolve = null;

    window.addEventListener('message', (event) => {
      if (event.origin !== TERMINAL_ORIGIN) return;
      const primaryWin = getPrimaryIframeWindow();
      if (!primaryWin || event.source !== primaryWin) return;

      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'jll-boot-complete') {
        syncTerminalOnBoot();
      } else if (msg.type === 'jll-state-meta') {
        if (pendingMetaResolve) { pendingMetaResolve(msg.savedAt || 0); pendingMetaResolve = null; }
      } else if (msg.type === 'jll-state') {
        if (pendingStateResolve) { pendingStateResolve({ state: msg.state, savedAt: msg.savedAt }); pendingStateResolve = null; }
      }
    });

    function requestLocalMeta(timeoutMs) {
      return new Promise((resolve) => {
        const win = getPrimaryIframeWindow();
        if (!win) { resolve(0); return; }
        pendingMetaResolve = resolve;
        win.postMessage({ type: 'jll-get-state-meta' }, TERMINAL_ORIGIN);
        setTimeout(() => {
          if (pendingMetaResolve === resolve) { pendingMetaResolve = null; resolve(0); }
        }, timeoutMs || 4000);
      });
    }

    function requestLocalState(timeoutMs) {
      return new Promise((resolve) => {
        const win = getPrimaryIframeWindow();
        if (!win) { resolve(null); return; }
        pendingStateResolve = resolve;
        win.postMessage({ type: 'jll-get-state' }, TERMINAL_ORIGIN);
        setTimeout(() => {
          if (pendingStateResolve === resolve) { pendingStateResolve = null; resolve(null); }
        }, timeoutMs || 20000);
      });
    }

    // Runs once, right after the primary tab finishes its own local
    // boot-or-restore: pulls the cloud copy down only if it's newer than
    // what's already loaded locally, so a fresher local session (made since
    // the last cloud sync) never gets clobbered by a stale cloud copy.
    async function syncTerminalOnBoot() {
      try {
        const localSavedAt = await requestLocalMeta();
        const cloudSavedAt = student.terminalStateSavedAt || 0;
        if (cloudSavedAt > localSavedAt) {
          const cloudState = await downloadTerminalState(user.uid);
          const win = getPrimaryIframeWindow();
          if (cloudState && win) {
            win.postMessage({ type: 'jll-set-state', state: cloudState }, TERMINAL_ORIGIN);
          }
        }
      } catch (err) {
        console.warn('[Junior Linux Lab] Terminal cloud sync (pull) failed:', err);
      }
    }

    // Pushes the primary tab's current state to the cloud. Triggered on
    // natural "leaving" moments (switching dashboard tabs away from
    // Terminal, backgrounding the browser tab, logging out) rather than on
    // a fixed timer — full VM snapshots run tens of MB, so syncing only
    // when there's an actual reason to keeps Firebase usage (and the free
    // tier's daily quota) proportional to real use.
    async function pushTerminalStateToCloud() {
      try {
        const result = await requestLocalState();
        if (result && result.state) {
          await uploadTerminalState(user.uid, result.state, result.savedAt);
          student.terminalStateSavedAt = result.savedAt;
        }
      } catch (err) {
        console.warn('[Junior Linux Lab] Terminal cloud sync (push) failed:', err);
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') pushTerminalStateToCloud();
    });

    const terminalUsername = usernameFromName(student.studentName || student.parentName);

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
                '<input type="password" id="new-password" required minlength="6" placeholder="New password">' +
              '</div>' +
              '<div class="form-group">' +
                '<label for="confirm-password">Confirm Password</label>' +
                '<input type="password" id="confirm-password" required minlength="6" placeholder="Confirm new password">' +
              '</div>' +
              '<p class="portal-error hidden" id="password-error"></p>' +
              '<p class="portal-hint" id="password-success" style="display:none; color: var(--accent-green); margin-top:0;">Password updated!</p>' +
              '<button type="submit" class="btn btn-primary" style="align-self:flex-start;">Update Password</button>' +
            '</form>'
          : '<p class="portal-hint" style="margin-top:0; text-align:left;">Password changes unlock once your course fee is marked as paid by your mentor. Your fee status is shown above.</p>'
        );

      const pwForm = document.getElementById('change-password-form');
      if (pwForm) {
        pwForm.addEventListener('submit', async (e) => {
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

          try {
            await changeStudentPassword(newPw);
            pwForm.reset();
            successEl.style.display = 'block';
          } catch (err) {
            errorEl.textContent = err && err.code === 'auth/requires-recent-login'
              ? 'For security, please log out and log back in before changing your password.'
              : 'Could not update password. Please try again.';
            errorEl.classList.remove('hidden');
          }
        });
      }
    }

    /* ---------------- Fee-gated feature lock ---------------- */
    function renderLocked(panelId, featureName) {
      const panel = document.getElementById(panelId);
      panel.innerHTML =
        '<p class="portal-hint" style="margin-top:0; text-align:left;">🔒 ' + escapeHtml(featureName) +
        ' unlocks once your course fee is marked as paid by your mentor. Check the Overview tab for your current fee status.</p>';
    }

    /* ---------------- Projects ---------------- */
    function renderProjects() {
      if (student.feeStatus !== 'paid') { renderLocked('student-tab-projects', 'Projects'); return; }
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
        sel.addEventListener('change', async () => {
          const idx = parseInt(sel.getAttribute('data-idx'), 10);
          student.projects[idx].status = sel.value;
          await setStudentProjects(user.uid, student.projects);
        });
      });
    }

    /* ---------------- Notes ---------------- */
    async function renderNotes() {
      if (student.feeStatus !== 'paid') { renderLocked('student-tab-notes', 'Notes'); return; }
      const panel = document.getElementById('student-tab-notes');
      // Reads the live, mentor-editable syllabus data (not a static template) so
      // any topic edits made in the Mentor Portal show up here immediately.
      const syllabus = await loadSyllabusProgress();
      panel.innerHTML =
        '<ul class="portal-list">' +
          syllabus.map(w => '<li><strong>Week ' + w.week + ':</strong> ' + escapeHtml(w.topic) + '</li>').join('') +
        '</ul>';
    }

    /* ---------------- Terminal ---------------- */
    function renderTerminal() {
      if (student.feeStatus !== 'paid') { renderLocked('student-tab-terminal', 'The terminal'); return; }
      const panel = document.getElementById('student-tab-terminal');
      panel.innerHTML =
        '<p class="portal-hint" style="margin-top:0; text-align:left;">Logged in as <code>' + escapeHtml(terminalUsername) + '@terminal</code>. Your first terminal tab auto-saves and follows you across devices; extra tabs are independent scratch sessions saved only in this browser.</p>' +
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
      // Only the first tab is watchable by a mentor / synced to the cloud, so
      // there's one predictable session to mirror per student (avoids
      // peer-ID collisions and cloud-sync races across simultaneous tabs).
      const tab = { id: 'term-' + terminalCounter, label: 'Terminal ' + terminalCounter, watchable: terminalCounter === 1 };
      if (tab.watchable) primaryTerminalId = tab.id;
      terminalTabs.push(tab);
      redrawTerminalTabs(tab.id);
    }

    function closeTerminalTab(id) {
      const wasActive = document.getElementById(id) && document.getElementById(id).classList.contains('active-terminal-panel');
      if (id === primaryTerminalId) {
        pushTerminalStateToCloud();
        primaryTerminalId = null;
      }
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
          iframe.src = TERMINAL_BASE_URL + '?user=' + encodeURIComponent(terminalUsername) + '&disableReset=1' + (t.watchable ? '&watchable=1' : '');
          iframe.title = t.label;
          iframe.allow = 'fullscreen; clipboard-read; clipboard-write';
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
    let activeStudentTab = 'overview';
    studentTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        studentTabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-tab');
        if (activeStudentTab === 'terminal' && tab !== 'terminal') pushTerminalStateToCloud();
        activeStudentTab = tab;
        document.querySelectorAll('.student-tab-panel').forEach(p => p.classList.add('hidden'));
        document.getElementById('student-tab-' + tab).classList.remove('hidden');
      });
    });

    document.getElementById('dashboard-logout-btn').addEventListener('click', async () => {
      if (activeStudentTab === 'terminal') await pushTerminalStateToCloud();
      await logout();
      window.location.href = '../index.html';
    });

    renderOverview();
    renderProjects();
    renderNotes();
    renderTerminal();
  });
}
