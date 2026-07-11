// Tux Academy Interaction Controller

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initFAQAccordion();
  initTerminal();
  initEnrollModal();
  initPricingReveal();
});

/* ==========================================================================
   Pricing Section Reveal
   Fee details are hidden while casually scrolling the page — they only
   appear once a visitor deliberately clicks a link to "Schedule & Pricing"
   (or any other link pointing at #pricing, like the nav Enroll button or
   the footer link).
   ========================================================================== */
function initPricingReveal() {
  const pricingSection = document.getElementById('pricing');
  if (!pricingSection) return;

  document.querySelectorAll('a[href="#pricing"]').forEach(link => {
    link.addEventListener('click', () => {
      pricingSection.classList.remove('hidden');
    });
  });
}

/* ==========================================================================
   Mobile Menu Toggle
   ========================================================================== */
function initMobileMenu() {
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const navLinks = document.getElementById('nav-links-menu');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });

    // Close menu when navigation link is clicked
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });
  }
}

/* ==========================================================================
   FAQ Accordion
   ========================================================================== */
function initFAQAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all other accordion items
      faqItems.forEach(otherItem => {
        otherItem.classList.remove('active');
        otherItem.querySelector('.faq-answer').style.maxHeight = null;
      });

      // Toggle current item
      if (!isActive) {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
}

/* ==========================================================================
   Terminal Sandbox Simulator
   ========================================================================== */
function initTerminal() {
  const terminalInput = document.getElementById('terminal-input');
  const terminalOutputs = document.getElementById('terminal-outputs');
  const terminalBody = document.getElementById('terminal-body');

  if (!terminalInput || !terminalOutputs || !terminalBody) return;

  // Virtual file system content
  const files = {
    'about_academy.txt': `Welcome to Junior Linux Lab!
---------------------------------------
We teach Linux systems and command line concepts to school students.
- Program length: 10-12 weeks
- Mentor ratio: 1:6
- Labs: 100% online in-browser sandbox
- Next cohort starts this Saturday!`,

    'syllabus.txt': `Junior Linux Lab Syllabus Summary
---------------------------------------
Complete Linux & Coding Program (10-12 weeks, Ages 8-15)

Weeks 1-4: Linux Fundamentals
- CLI basics: cd, ls, mkdir, pwd, mv
- Managing directory structures and files
- Command line flags, nano text editor

Weeks 5-8: Coding & Scripting
- Variables, loops, and control flow
- Pipes (|), redirects (> >>), environment variables
- Custom shell script automation

Weeks 9-12: Projects & Systems
- Build calculator, games, and file organizer tools
- Linux permissions: chmod, chown, user groups
- Deploy and showcase final projects`,

    'parent_guide.txt': `Why Junior Linux Lab is parent-approved:
---------------------------------------
- 100% cloud-based labs: No installations or modifications to home computers.
- Guided resilience: Mentors teach kids how to read error logs rather than giving answers.
- Industry relevance: Linux is the foundation of Cloud computing, DevOps, Cyber Security and system development.
- Secure environment: Moderated channels & sandbox setups.`,

    'secret.sh': `echo "Reading secret system configurations..."
sleep 1
echo "Checking credentials..."
echo "ERROR: Access Denied!"
echo "Sign up at Junior Linux Lab to learn how to write real shell scripts!"`
  };

  // Tracks an in-progress interactive game, if any. While set, terminal
  // input is routed to activeGame.handleInput() instead of the command table.
  let activeGame = null;

  const QUIZ_QUESTIONS = [
    { q: 'Which command lists files in a directory?', options: ['cd', 'ls', 'rm', 'mkdir'], answer: 1 },
    { q: "What does the 'pwd' command print?", options: ['A password', 'The present working directory', 'A process ID', 'Public web data'], answer: 1 },
    { q: 'Which symbol sends output into a file, overwriting it?', options: ['|', '>>', '>', '<'], answer: 2 },
    { q: 'Which command changes a file\'s permissions?', options: ['chown', 'chmod', 'grep', 'find'], answer: 1 },
    { q: 'What does the pipe symbol "|" do?', options: ['Deletes a file', "Sends one command's output into another", 'Comments out a line', 'Ends a script'], answer: 1 }
  ];

  function startGuessGame() {
    activeGame = { name: 'guess', target: Math.floor(Math.random() * 100) + 1, attempts: 0, maxAttempts: 7 };
    return [
      '🎮 <span class="terminal-highlight">Guess the Number</span> — I\'m thinking of a number between 1 and 100.',
      `You have ${activeGame.maxAttempts} tries. Type a number, or "exit" to quit.`
    ];
  }

  function handleGuessInput(line) {
    if (/^(exit|quit)$/i.test(line)) {
      const answer = activeGame.target;
      activeGame = null;
      return [`Game exited. The number was ${answer}.`];
    }
    const n = parseInt(line, 10);
    if (isNaN(n)) return ['Please enter a whole number (or "exit").'];
    activeGame.attempts++;
    if (n === activeGame.target) {
      const msg = `🎉 Correct! You got it in ${activeGame.attempts} ${activeGame.attempts === 1 ? 'try' : 'tries'}.`;
      activeGame = null;
      return [msg];
    }
    if (activeGame.attempts >= activeGame.maxAttempts) {
      const answer = activeGame.target;
      activeGame = null;
      return [`💥 Out of tries! The number was ${answer}. Type "guess" to try again.`];
    }
    const hint = n < activeGame.target ? 'Higher ⬆️' : 'Lower ⬇️';
    return [`${hint} — ${activeGame.maxAttempts - activeGame.attempts} tries left.`];
  }

  function quizQuestionLines(i) {
    const q = QUIZ_QUESTIONS[i];
    const opts = q.options.map((o, idx) => `&nbsp;&nbsp;${String.fromCharCode(65 + idx)}) ${o}`);
    return [`❓ Question ${i + 1}/${QUIZ_QUESTIONS.length}: ${q.q}`, ...opts, 'Type A, B, C, or D (or "exit" to quit).'];
  }

  function startQuizGame() {
    activeGame = { name: 'quiz', index: 0, score: 0 };
    return ['🧠 <span class="terminal-highlight">Linux Quiz</span> — let\'s see what you know!', '', ...quizQuestionLines(0)];
  }

  function handleQuizInput(line) {
    if (/^(exit|quit)$/i.test(line)) {
      activeGame = null;
      return ['Quiz exited.'];
    }
    const letter = line.trim().toUpperCase();
    const idx = 'ABCD'.indexOf(letter);
    if (idx === -1) return ['Please answer with A, B, C, or D.'];

    const q = QUIZ_QUESTIONS[activeGame.index];
    const correct = idx === q.answer;
    if (correct) activeGame.score++;
    const feedback = correct
      ? '✅ Correct!'
      : `❌ Not quite — the answer was ${String.fromCharCode(65 + q.answer)}) ${q.options[q.answer]}.`;

    activeGame.index++;
    if (activeGame.index >= QUIZ_QUESTIONS.length) {
      const finalScore = `🏁 Quiz complete! Score: ${activeGame.score}/${QUIZ_QUESTIONS.length}`;
      activeGame = null;
      return [feedback, finalScore, 'Type "quiz" to play again.'];
    }
    return [feedback, '', ...quizQuestionLines(activeGame.index)];
  }

  function startCalcGame() {
    activeGame = { name: 'calculator' };
    return ['🔢 <span class="terminal-highlight">Calculator</span> — type an expression like 12 + 7, then press enter.', 'Type "exit" to quit.'];
  }

  function handleCalcInput(line) {
    if (/^(exit|quit)$/i.test(line)) {
      activeGame = null;
      return ['Calculator closed.'];
    }
    if (!/^[0-9+\-*/().\s]+$/.test(line) || !/[0-9]/.test(line)) {
      return ['Only numbers and + - * / ( ) are allowed. Try again, or "exit" to quit.'];
    }
    try {
      const result = Function('"use strict"; return (' + line + ')')();
      if (typeof result !== 'number' || !isFinite(result)) return ["That didn't compute. Try again."];
      return [`= ${result}`, 'Enter another expression, or "exit" to quit.'];
    } catch (e) {
      return ['Syntax error — try something like 8 * 4.'];
    }
  }

  // --- Futuristic games ---
  const HACK_STAGES = [
    { cmd: 'bypass firewall', success: '✅ Firewall signature spoofed. Layer 1 breached.' },
    { cmd: 'crack password', success: '✅ Brute-force complete. Layer 2 breached.' },
    { cmd: 'download files', success: '✅ Data exfiltrated. Layer 3 breached.' }
  ];

  function startHackGame() {
    activeGame = { name: 'hack', stage: 0 };
    return [
      '🛰️ <span class="terminal-highlight">MAINFRAME BREACH</span> — connecting to CorpNet-9...',
      'Breach all 3 security layers by typing the exact command shown.',
      '',
      `[Layer 1/3] Type: <span class="terminal-highlight">${HACK_STAGES[0].cmd}</span> (or "exit")`
    ];
  }

  function handleHackInput(line) {
    if (/^(exit|quit)$/i.test(line)) {
      activeGame = null;
      return ['Connection terminated.'];
    }
    const stage = HACK_STAGES[activeGame.stage];
    if (line.trim().toLowerCase() !== stage.cmd) {
      return [`Command not recognized. Try: <span class="terminal-highlight">${stage.cmd}</span> (or "exit").`];
    }
    activeGame.stage++;
    if (activeGame.stage >= HACK_STAGES.length) {
      activeGame = null;
      return [stage.success, '', '🏆 ACCESS GRANTED — mainframe breached!', '(All simulated, obviously — real hacking without permission is illegal.)'];
    }
    const next = HACK_STAGES[activeGame.stage];
    return [stage.success, '', `[Layer ${activeGame.stage + 1}/3] Type: <span class="terminal-highlight">${next.cmd}</span>`];
  }

  function caesarShift(str, shift) {
    return str.replace(/[a-zA-Z]/g, (c) => {
      const base = c === c.toUpperCase() ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + shift) % 26 + 26) % 26 + base);
    });
  }

  function startCipherGame() {
    activeGame = { name: 'cipher', step: 'message' };
    return ['🔐 <span class="terminal-highlight">Cipher Machine</span> — encode a secret message with a Caesar shift.', 'Type the message you want to encode (or "exit"):'];
  }

  function handleCipherInput(line) {
    if (/^(exit|quit)$/i.test(line)) {
      activeGame = null;
      return ['Cipher machine powered down.'];
    }
    if (activeGame.step === 'message') {
      activeGame.message = line;
      activeGame.step = 'shift';
      return ['Now enter a shift number (1-25):'];
    }
    const shift = parseInt(line, 10);
    if (isNaN(shift) || shift < 1 || shift > 25) {
      return ['Please enter a whole number between 1 and 25 (or "exit").'];
    }
    const message = activeGame.message;
    const encoded = caesarShift(message, shift);
    const decoded = caesarShift(encoded, 26 - shift);
    activeGame = null;
    return [
      `Encoded (shift ${shift}): ${encoded}`,
      `Decoded back: ${decoded}`,
      'Type "cipher" to encode another message.'
    ];
  }

  function runMatrixEffect() {
    const chars = 'アイウエオカキクケコ0123456789ABCDEFXYZ$#@%&';
    let frame = 0;
    const totalFrames = 10;
    function renderFrame() {
      if (frame >= totalFrames) {
        appendLine('<span class="terminal-highlight">Wake up, Neo...</span>', 'stdout');
        terminalBody.scrollTop = terminalBody.scrollHeight;
        return;
      }
      let line = '';
      for (let i = 0; i < 50; i++) {
        line += Math.random() < 0.15 ? chars[Math.floor(Math.random() * chars.length)] : '&nbsp;';
      }
      appendLine('<span style="color:#00ff41; font-weight:bold;">' + line + '</span>', 'stdout');
      terminalBody.scrollTop = terminalBody.scrollHeight;
      frame++;
      setTimeout(renderFrame, 120);
    }
    renderFrame();
  }

  // Commands registry
  const commands = {
    'help': () => {
      return [
        'Available commands:',
        '  <span class="terminal-highlight">help</span>             Show this help menu',
        '  <span class="terminal-highlight">ls</span>               List files in directory',
        '  <span class="terminal-highlight">cat &lt;filename&gt;</span>  Display contents of a file',
        '  <span class="terminal-highlight">cowsay &lt;msg&gt;</span>    Let Tux the Cow say a message',
        '  <span class="terminal-highlight">neofetch</span>         Display system specifications',
        '  <span class="terminal-highlight">organize</span>         Simulate sorting a messy Downloads folder',
        '  <span class="terminal-highlight">games</span>            List playable sandbox games',
        '  <span class="terminal-highlight">guess</span>            Play the number guessing game',
        '  <span class="terminal-highlight">quiz</span>             Play the Linux trivia quiz',
        '  <span class="terminal-highlight">calculator</span>       Open the interactive calculator',
        '  <span class="terminal-highlight">hack</span>             Play the Mainframe Breach hacking sim',
        '  <span class="terminal-highlight">cipher</span>           Encode/decode a message with a Caesar cipher',
        '  <span class="terminal-highlight">matrix</span>           Enter the Matrix (digital rain effect)',
        '  <span class="terminal-highlight">clear</span>            Clear terminal output',
        '  <span class="terminal-highlight">sudo &lt;command&gt;</span>   Execute a command with root privileges',
        '  <span class="terminal-highlight">enroll</span>           Open registration portal'
      ];
    },
    'games': () => {
      return [
        'Sample projects you can run right here:',
        '  <span class="terminal-highlight">guess</span>       🎮 Guess the Number — pick 1-100, get higher/lower hints',
        '  <span class="terminal-highlight">quiz</span>        ❓ Linux Quiz — 5 multiple-choice questions',
        '  <span class="terminal-highlight">calculator</span>  🔢 Calculator — evaluate any expression',
        '  <span class="terminal-highlight">organize</span>    📁 File Organizer — sorts a messy Downloads folder',
        '  <span class="terminal-highlight">hack</span>        🛰️ Mainframe Breach — a futuristic hacking sim',
        '  <span class="terminal-highlight">cipher</span>      🔐 Cipher Machine — Caesar-encode a secret message',
        '  <span class="terminal-highlight">matrix</span>      🟢 Enter the Matrix — digital rain effect',
        'Type any of these to start!'
      ];
    },
    'guess': () => {
      if (activeGame) return ['A game is already running. Type "exit" to quit it first.'];
      return startGuessGame();
    },
    'quiz': () => {
      if (activeGame) return ['A game is already running. Type "exit" to quit it first.'];
      return startQuizGame();
    },
    'calculator': () => {
      if (activeGame) return ['A game is already running. Type "exit" to quit it first.'];
      return startCalcGame();
    },
    'hack': () => {
      if (activeGame) return ['A game is already running. Type "exit" to quit it first.'];
      return startHackGame();
    },
    'cipher': () => {
      if (activeGame) return ['A game is already running. Type "exit" to quit it first.'];
      return startCipherGame();
    },
    'matrix': () => {
      runMatrixEffect();
      return ['Entering the Matrix...'];
    },
    'organize': () => {
      return [
        'Downloads/ before organizing:',
        '  photo.jpg   vacation.png   song.mp3   report.pdf   notes.txt   deploy.sh',
        '',
        'Running the file organizer script...',
        '',
        'Downloads/ after organizing:',
        '  <span class="terminal-highlight">Images/</span>    photo.jpg, vacation.png',
        '  <span class="terminal-highlight">Audio/</span>     song.mp3',
        '  <span class="terminal-highlight">Documents/</span> report.pdf, notes.txt',
        '  <span class="terminal-highlight">Scripts/</span>   deploy.sh',
        '',
        'That\'s exactly what the real File Organizer project teaches you to build!'
      ];
    },
    'ls': () => {
      const fileList = Object.keys(files).map(name => {
        if (name.endsWith('.sh')) {
          return `<span style="color: #ff5f56; font-weight: bold;">${name}</span>`;
        }
        return `<span style="color: #4facfe;">${name}</span>`;
      });
      return [fileList.join('   ')];
    },
    'cat': (args) => {
      if (!args || args.length === 0) {
        return ['usage: cat &lt;filename&gt;'];
      }
      const filename = args[0];
      if (files[filename]) {
        return files[filename].split('\n');
      } else {
        return [`cat: ${filename}: No such file or directory`];
      }
    },
    'cowsay': (args) => {
      if (!args || args.length === 0) {
        args = ['Moo! Welcome to Junior Linux Lab!'];
      }
      const message = args.join(' ');
      const underline = '_'.repeat(message.length + 2);
      const dashes = '-'.repeat(message.length + 2);
      return [
        `  ${underline}`,
        `&lt; ${message} &gt;`,
        `  ${dashes}`,
        '         \\   ^__^',
        '          \\  (oo)\\_______',
        '             (__)\\       )\\/\\',
        '                 ||----w |',
        '                 ||     ||'
      ];
    },
    'neofetch': () => {
      return [
        `<span style="color: #E95420; font-weight: bold;">        .--.         </span>    tux@academy-sandbox`,
        `<span style="color: #E95420; font-weight: bold;">       |o_o |        </span>    -------------------`,
        `<span style="color: #E95420; font-weight: bold;">       |:_/ |        </span>    OS: JuniorLinuxLab OS x86_64`,
        `<span style="color: #F99B11; font-weight: bold;">      //   \\ \\       </span>    Kernel: 6.1.0-JuniorLinuxLab`,
        `<span style="color: #F99B11; font-weight: bold;">     (|     | )      </span>    Uptime: 2 hours, 14 mins`,
        `<span style="color: #F99B11; font-weight: bold;">    /'\\_   _/\`\\      </span>    Shell: bash 5.1.16`,
        `<span style="color: #F99B11; font-weight: bold;">    \\___)=(___/      </span>    Terminal: HTML5 Browser Console`,
        `                         CPU: Virtual Core (1) @ 2.40GHz`,
        `                         Memory: 512MB / 2048MB`
      ];
    },
    'clear': () => {
      terminalOutputs.innerHTML = '';
      return [];
    },
    'sudo': (args) => {
      const cmd = args.join(' ');
      return [
        `tux is not in the sudoers file.`,
        `<span style="color: #ff5f56; font-weight: bold;">This incident will be reported.</span>`
      ];
    },
    'enroll': () => {
      // Scroll to pricing section
      document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' });
      // Trigger modal after brief delay
      setTimeout(() => {
        openEnrollModal('General');
      }, 800);
      return ['Redirecting to enrollment table and loading application form...'];
    }
  };

  // Focus terminal input on clicking anywhere in terminal body
  terminalBody.addEventListener('click', () => {
    terminalInput.focus();
  });

  // Handle enter key in input
  terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const line = terminalInput.value.trim();
      terminalInput.value = '';

      if (line === '') {
        appendLine('tux@academy:~$', 'prompt-only');
        return;
      }

      // Add user input to terminal output history
      appendLine(`tux@academy:~$ ${escapeHtml(line)}`, 'user-input');

      // "clear" always works, even mid-game, as an escape hatch
      if (line.toLowerCase() === 'clear') {
        terminalOutputs.innerHTML = '';
        return;
      }

      // While a game is active, route input to it instead of the command table
      if (activeGame) {
        let result = [];
        if (activeGame.name === 'guess') result = handleGuessInput(line);
        else if (activeGame.name === 'quiz') result = handleQuizInput(line);
        else if (activeGame.name === 'calculator') result = handleCalcInput(line);
        else if (activeGame.name === 'hack') result = handleHackInput(line);
        else if (activeGame.name === 'cipher') result = handleCipherInput(line);
        result.forEach(outputLine => appendLine(outputLine, 'stdout'));
        terminalBody.scrollTop = terminalBody.scrollHeight;
        return;
      }

      // Process command
      const tokens = line.split(/\s+/);
      const commandName = tokens[0].toLowerCase();
      const args = tokens.slice(1);

      if (commands[commandName]) {
        const result = commands[commandName](args);
        if (commandName !== 'clear') {
          result.forEach(outputLine => {
            appendLine(outputLine, 'stdout');
          });
        }
      } else {
        appendLine(`bash: ${escapeHtml(commandName)}: command not found`, 'stderr');
      }

      // Scroll to bottom
      terminalBody.scrollTop = terminalBody.scrollHeight;
    }
  });

  function appendLine(content, type) {
    const div = document.createElement('div');
    div.className = `terminal-line ${type}`;
    if (type === 'prompt-only') {
      div.innerHTML = `<span class="terminal-prompt">tux@academy:~$</span>`;
    } else if (type === 'user-input') {
      div.innerHTML = `<span class="terminal-prompt">tux@academy:~$</span> ${content.substring(14)}`;
    } else {
      div.innerHTML = content;
    }
    terminalOutputs.appendChild(div);
  }

  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }
}

/* ==========================================================================
   Enrollment Modal Form
   ========================================================================== */
let currentModalSource = 'General';

function initEnrollModal() {
  const modal = document.getElementById('enroll-modal');
  const closeBtn = document.getElementById('modal-close');
  const enrollTriggers = document.querySelectorAll('.enroll-trigger');
  const enrollForm = document.getElementById('enroll-form');
  const courseSelect = document.getElementById('enroll-course-select');

  if (!modal || !closeBtn) return;

  // Open modal triggers
  enrollTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const course = e.target.getAttribute('data-course');
      openEnrollModal(course);
    });
  });

  // Close modal click
  closeBtn.addEventListener('click', closeEnrollModal);

  // Close modal clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeEnrollModal();
    }
  });

  // Handle ESC key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeEnrollModal();
    }
  });

  // Submit action
  if (enrollForm) {
    enrollForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const parentName = document.getElementById('enroll-parent-name').value;
      const studentName = document.getElementById('enroll-student-name').value;
      const email = document.getElementById('enroll-email').value;
      const studentAge = document.getElementById('enroll-student-age').value;
      const selectedCourse = courseSelect.value === 'Complete Program'
        ? 'Complete Linux & Coding Program (₹4,999)'
        : courseSelect.value;

      const submitBtn = enrollForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      let student = null;
      try {
        if (window.JLLPortal) {
          student = await window.JLLPortal.registerStudent({
            parentName,
            studentName,
            email,
            age: studentAge,
            course: 'Complete Linux & Coding Program'
          });

          window.JLLPortal.sendEnrollmentEmail({
            to_email: email,
            parent_name: parentName,
            student_name: studentName,
            student_age: studentAge,
            course_name: 'Complete Linux & Coding Program',
            price: '₹4,999',
            batch_times: 'Sat 6:00 PM - 8:00 PM IST / Sun 10:00 AM - 12:00 PM IST',
            login_id: email,
            login_password: student.password
          }).then((res) => {
            if (res && res.skipped) {
              console.info('[Junior Linux Lab] Enrollment email not sent — EmailJS is not configured yet.');
            }
          }).catch((err) => {
            console.error('[Junior Linux Lab] Failed to send enrollment email:', err);
          });
        }

        const credentialsNote = student
          ? `\n\nYour student login has been created:\nID: ${email}\nPassword: ${student.password}\n\nUse the Login button in the top navigation to view your dashboard.`
          : '';

        alert(`Thank you, ${parentName}! We have reserved a place in '${selectedCourse}' for your student. A confirmation email with course and fee details has been sent to ${email}.${credentialsNote}`);

        closeEnrollModal();
        enrollForm.reset();
      } catch (err) {
        if (err && err.code === 'auth/email-already-in-use') {
          alert(`${email} is already enrolled. Use the Login button to access the existing student dashboard.`);
        } else {
          console.error('[Junior Linux Lab] Enrollment failed:', err);
          alert('Something went wrong while enrolling. Please try again in a moment.');
        }
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
}

function openEnrollModal(course) {
  const modal = document.getElementById('enroll-modal');
  const courseSelect = document.getElementById('enroll-course-select');

  if (courseSelect && course) {
    courseSelect.value = 'Complete Program';
  }

  modal.classList.add('open');
}

function closeEnrollModal() {
  const modal = document.getElementById('enroll-modal');
  modal.classList.remove('open');
}

// app.js is loaded as an ES module now (for consistent script-execution
// ordering with portal-data.js's Firebase imports), so top-level functions
// no longer auto-attach to `window` the way classic scripts' do. chatbot.js
// reaches into window.openEnrollModal, so expose it explicitly.
window.openEnrollModal = openEnrollModal;
