// Junior Linux Lab Smart Chatbot Controller

document.addEventListener('DOMContentLoaded', () => {
  initChatbot();
});

/* ==========================================================================
   Single source of truth for on-page facts, so the bot can never drift
   out of sync with what the page actually says.
   ========================================================================== */
const SITE = {
  price: '₹4,999',
  duration: '10–12 weeks',
  ageRange: '8–15 years old',
  sessionLength: '1.5 hours',
  cohortSize: '12 students',
  sandboxAccess: '6 months',
  refundDeadline: "the second class session",
  email: 'ericallan.daniel@gmail.com',
  phone: '+91 7893530761',
  batchTimes: [
    'Sat 6:00 PM – 8:00 PM IST',
    'Sun 10:00 AM – 12:00 PM IST'
  ]
};

function initChatbot() {
  const widget = document.getElementById('chat-widget');
  const trigger = document.getElementById('chat-trigger');
  const dialog = document.getElementById('chat-dialog');
  const messagesContainer = document.getElementById('chat-messages');
  const form = document.getElementById('chat-input-form');
  const input = document.getElementById('chat-input');
  const closeBtn = document.getElementById('chat-close-btn');
  const badge = document.getElementById('chat-badge');

  if (!widget || !trigger || !dialog || !messagesContainer || !form || !input || !closeBtn) return;

  let hasPoppedUp = false;
  let isChatOpen = false;
  let inactivityTimer = null;
  const INACTIVITY_TIMEOUT = 60000; // auto-hide after 60s of no activity

  function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (isChatOpen) {
      inactivityTimer = setTimeout(() => {
        closeChat();
      }, INACTIVITY_TIMEOUT);
    }
  }

  // 1. Initial greeting message
  const welcomeText = "Hi there! 👋 I'm Tux, your Linux teacher bot. Ask me about any Linux command, our classes, or really anything at all.";

  // 2. Setup 50 second auto popup
  const autoPopupTimer = setTimeout(() => {
    if (!hasPoppedUp && !isChatOpen) {
      openChat();
      showBotMessage(welcomeText);
      badge.classList.remove('hidden'); // Show notification badge
      hasPoppedUp = true;
    }
  }, 50000); // 50 seconds

  // Trigger button click (toggle open/close)
  trigger.addEventListener('click', () => {
    // Clear timer if user clicks before 10s
    clearTimeout(autoPopupTimer);

    if (isChatOpen) {
      closeChat();
    } else {
      openChat();
      // If it's the first time opening, print welcome message
      if (messagesContainer.children.length === 0) {
        showBotMessage(welcomeText);
      }
      badge.classList.add('hidden'); // Hide badge upon read
    }
  });

  // Close button click
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeChat();
  });

  // Handle form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawText = input.value.trim();
    if (rawText === '') return;

    resetInactivityTimer();
    input.value = '';
    showUserMessage(rawText);

    // Process and respond with typing indicator
    showTypingIndicator();

    setTimeout(() => {
      removeTypingIndicator();
      respondToQuery(rawText);
    }, 500 + Math.random() * 500); // Natural delay
  });

  // Any typing in the input also counts as activity
  input.addEventListener('input', resetInactivityTimer);

  // Suggestion buttons click
  document.querySelectorAll('.suggestion-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      resetInactivityTimer();
      const query = e.target.getAttribute('data-query');
      const text = e.target.innerText;
      showUserMessage(text);

      showTypingIndicator();
      setTimeout(() => {
        removeTypingIndicator();
        respondToQuery(query);
      }, 500);
    });
  });

  function openChat() {
    dialog.classList.add('open');
    trigger.classList.add('open');
    isChatOpen = true;
    input.focus();
    resetInactivityTimer();
  }

  function closeChat() {
    dialog.classList.remove('open');
    trigger.classList.remove('open');
    isChatOpen = false;
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
  }

  function showUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg user';
    msgDiv.innerText = text;
    messagesContainer.appendChild(msgDiv);
    scrollToBottom();
  }

  function showBotMessage(text, actions = []) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg bot';

    // Support basic markdown-like lines
    msgDiv.innerHTML = text.replace(/\n/g, '<br>');

    // If sub-links/actions are provided
    if (actions.length > 0) {
      const btnContainer = document.createElement('div');
      btnContainer.className = 'chat-btn-container';

      actions.forEach(act => {
        const linkBtn = document.createElement('button');
        linkBtn.className = 'chat-link-btn' + (act.action === 'websearch' ? ' web-search' : '');
        linkBtn.innerText = act.label;
        linkBtn.addEventListener('click', () => {
          resetInactivityTimer();
          handleAction(act.action, act.target);
        });
        btnContainer.appendChild(linkBtn);
      });

      msgDiv.appendChild(btnContainer);
    }

    messagesContainer.appendChild(msgDiv);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'chat-msg bot typing-indicator-container';
    indicatorDiv.id = 'chat-typing-indicator';
    indicatorDiv.innerHTML = `
      <div class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    messagesContainer.appendChild(indicatorDiv);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById('chat-typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /* ==========================================================================
     Knowledge base: site-specific facts, general tech Q&A, and small talk.
     Each topic is scored by keyword hits so the best match wins, instead of
     the old "first if-branch that matches" approach.
     ========================================================================== */
  const SITE_TOPICS = [
    {
      id: 'curriculum',
      keywords: ['syllabus', 'curriculum', 'learn', 'courses', 'course', 'class', 'classes', 'topics', 'study', 'level', 'levels', 'teach'],
      respond: () => ({
        text:
          "Junior Linux Lab offers one complete program for kids and teens aged " + SITE.ageRange + ":\n\n" +
          "Complete Linux & Coding Program (" + SITE.duration + "):\n" +
          "• Linux CLI navigation and terminal skills\n" +
          "• Coding fundamentals: variables, loops, and scripting\n" +
          "• 6+ real projects including games, calculators, and file tools\n\n" +
          "Click below to explore the syllabus or try our command sandbox:",
        actions: [
          { label: '📚 View Curriculum', action: 'scroll', target: '#curriculum' },
          { label: '🖥️ Try Command Sandbox', action: 'scroll', target: '#terminal-sandbox' }
        ]
      })
    },
    {
      id: 'pricing',
      keywords: ['price', 'pricing', 'cost', 'how much', 'fees', 'fee', 'expensive', 'pay', 'cheap', 'money', 'afford'],
      respond: () => ({
        text:
          "We offer one flat-rate program that covers live instruction, mentoring, certificates, and cloud sandbox access:\n\n" +
          "• Complete Linux & Coding Program: " + SITE.price + " (" + SITE.duration + " of labs)\n\n" +
          "We also provide a full refund guarantee up until " + SITE.refundDeadline + " starts. Select a button to see pricing or read refund details:",
        actions: [
          { label: '💰 Cohort Pricing', action: 'scroll', target: '#pricing' },
          { label: '📜 Refund Policy FAQ', action: 'faq', target: 4 }
        ]
      })
    },
    {
      id: 'refund',
      keywords: ['refund', 'money back', 'money-back', 'cancel', 'cancellation'],
      respond: () => ({
        text:
          "Yes — we offer a full 100% refund up until " + SITE.refundDeadline + " starts. If your child decides the class isn't the right fit, just email us and we'll issue a complete refund, no questions asked.",
        actions: [
          { label: '📜 Refund Policy FAQ', action: 'faq', target: 4 },
          { label: '💰 View Pricing', action: 'scroll', target: '#pricing' }
        ]
      })
    },
    {
      id: 'schedule',
      keywords: ['schedule', 'timings', 'timing', 'when', 'days', 'hours', 'weeks', 'batch', 'batches'],
      respond: () => ({
        text:
          "Our cohort meets once a week on Saturdays or Sundays to fit around school work:\n\n" +
          SITE.batchTimes.map(t => "• " + t).join('\n') + "\n\n" +
          "The full program runs " + SITE.duration + ". Each lab session is " + SITE.sessionLength + " long. View the schedule below:",
        actions: [
          { label: '📅 View Batch Timings', action: 'scroll', target: '#pricing' }
        ]
      })
    },
    {
      id: 'safety_setup',
      keywords: ['parent', 'parents', 'safe', 'safety', 'install', 'computer', 'setup', 'pc', 'mac', 'chromebook', 'laptop', 'prerequisite', 'requirements', 'hardware'],
      respond: () => ({
        text:
          "We prioritize absolute safety and ease of use. Students use a virtual sandbox browser console. This guarantees:\n\n" +
          "• Zero local changes: No need to partition or install anything on your family computer.\n" +
          "• Safe sandboxing: Any mistakes happen inside an isolated container that can be reset in one click.\n" +
          "• No prerequisites: Absolute beginners are welcome. The program starts from the basics!\n\n" +
          "Read our Parents Portal page or view the setups checklist:",
        actions: [
          { label: '🛡️ Open Parent Portal', action: 'scroll', target: '#parents' },
          { label: '🖥️ System Requirements FAQ', action: 'faq', target: 1 }
        ]
      })
    },
    {
      id: 'age',
      keywords: ['age', 'ages', 'how old', 'kids', 'teens', 'school', 'grade', 'student', 'students'],
      respond: () => ({
        text:
          "Junior Linux Lab classes are designed for school students between " + SITE.ageRange + ":\n\n" +
          "Our single " + SITE.duration + " program covers Linux and coding from beginner to project builder. We group students of similar ages together to keep discussions interactive and engaging!",
        actions: [
          { label: '📚 View Curriculum', action: 'scroll', target: '#curriculum' }
        ]
      })
    },
    {
      id: 'mentorship',
      keywords: ['mentor', 'mentors', 'mentorship', 'cohort size', 'class size', 'discord', 'support', 'teacher', 'teachers', 'instructor', 'instructors', 'tutor'],
      respond: () => ({
        text:
          "Each cohort is capped at " + SITE.cohortSize + " to keep it personal. Every live lab has one head mentor and one teaching assistant, and students get debug help all week in our private, moderated Discord server.",
        actions: [
          { label: '👨‍🏫 Mentorship FAQ', action: 'faq', target: 3 },
          { label: '💰 View Pricing', action: 'scroll', target: '#pricing' }
        ]
      })
    },
    {
      id: 'certificate',
      keywords: ['certificate', 'certification', 'certified', 'completion'],
      respond: () => ({
        text:
          "Yes! Every student who finishes the " + SITE.duration + " program receives a Certificate of Completion, plus " + SITE.sandboxAccess + " of continued access to our sandbox terminals to keep practicing.",
        actions: [
          { label: '💰 View Pricing & Inclusions', action: 'scroll', target: '#pricing' }
        ]
      })
    },
    {
      id: 'enroll',
      keywords: ['enroll', 'register', 'signup', 'sign up', 'join', 'apply', 'book', 'reserve'],
      respond: () => ({
        text:
          "Registration for upcoming cohorts is open! Fill in parent/student information and secure a spot in our " + SITE.duration + " program. No card or payment is required upfront to reserve a seat.\n\n" +
          "Click the link below to open the application form directly:",
        actions: [
          { label: '🚀 Open Application Form', action: 'modal', target: 'General' },
          { label: '💰 Check Pricing Batches', action: 'scroll', target: '#pricing' }
        ]
      })
    },
    {
      id: 'contact',
      keywords: ['contact', 'reach', 'email', 'phone', 'whatsapp', 'call', 'talk to someone', 'human'],
      respond: () => ({
        text:
          "You can reach the Junior Linux Lab team directly:\n\n" +
          "📧 " + SITE.email + "\n" +
          "📞 " + SITE.phone + "\n\n" +
          "Or just keep chatting with me — I can answer most questions right here!",
        actions: []
      })
    },
    {
      id: 'why_linux',
      keywords: ['what is linux', 'why linux', 'why learn linux', 'linux brand'],
      respond: () => ({
        text:
          "Linux is the operating system core that powers modern technology—including Android devices, NASA computers, AWS cloud servers, and global web services.\n\n" +
          "Learning Linux teaches kids how computer files, networking, and system tasks actually work behind the scenes, creating a foundation for any coding career.\n\n" +
          "Try running real Linux command line programs in our interactive simulator widget:",
        actions: [
          { label: '🖥️ Try Command Simulator', action: 'scroll', target: '#terminal-sandbox' },
          { label: '🧠 Why Learn Linux FAQ', action: 'faq', target: 2 }
        ]
      })
    },
    {
      id: 'projects',
      keywords: ['project', 'projects', 'build', 'calculator', 'guessing game', 'quiz', 'file organizer'],
      respond: () => ({
        text:
          "Every lesson ends with something real students build themselves:\n\n" +
          "• 🔢 Calculator — a working CLI calculator from scratch\n" +
          "• 🎮 Guessing Game — interactive hints, validation, scoring\n" +
          "• ❓ Quiz Game — multiple-choice questions with score tracking\n" +
          "• 📁 File Organizer — a real Linux shell utility for auto-sorting files\n\n" +
          "Check out the full list:",
        actions: [
          { label: '🚀 View All Projects', action: 'scroll', target: '#projects' }
        ]
      })
    },
    {
      id: 'greeting',
      keywords: ['hi', 'hello', 'hey', 'greetings', 'hola', 'yo'],
      respond: () => ({
        text:
          "Hello! I am Tux Bot, your Linux teacher. Ask me to explain any Linux command, or anything about our courses — and I'll search the web if I get stuck.\n\n" +
          "What can I help with today?",
        actions: [
          { label: '📚 Course Syllabus', action: 'scroll', target: '#curriculum' },
          { label: '💰 Pricing & Fees', action: 'scroll', target: '#pricing' }
        ]
      })
    }
  ];

  /* ==========================================================================
     Linux command teacher content — the bot's core "teacher" knowledge.
     Generated from a compact command database so each entry stays short
     to write but produces a consistent, example-driven answer.
     ========================================================================== */
  const COMMAND_DB = [
    { cmd: 'ls', desc: 'lists the files and folders in a directory.', syntax: 'ls [options] [path]', example: 'ls -la /home', extra: '-l shows details, -a shows hidden files (the ones starting with a dot).' },
    { cmd: 'cd', desc: 'changes your current directory (moves you around the filesystem).', syntax: 'cd [path]', example: 'cd projects', extra: 'Use "cd .." to go up one level, and "cd ~" to jump straight home.' },
    { cmd: 'pwd', desc: 'prints your current working directory — i.e. "where am I right now?"', syntax: 'pwd', example: 'pwd', extra: 'Handy when you get lost after a few cd commands.' },
    { cmd: 'mkdir', desc: 'creates a new directory (folder).', syntax: 'mkdir [name]', example: 'mkdir projects', extra: 'Add -p to create nested folders in one go: mkdir -p a/b/c' },
    { cmd: 'rmdir', desc: 'removes an empty directory.', syntax: 'rmdir [name]', example: 'rmdir old_folder', extra: "If the folder isn't empty, you'll need rm -r instead." },
    { cmd: 'rm', desc: 'deletes files (and, with -r, folders). There is no recycle bin, so it\'s permanent!', syntax: 'rm [options] [name]', example: 'rm -r old_folder', extra: 'Always double-check the path before running rm -r — it cannot be undone.' },
    { cmd: 'cp', desc: 'copies a file or folder to a new location.', syntax: 'cp [source] [destination]', example: 'cp notes.txt backup.txt', extra: 'Add -r to copy an entire folder.' },
    { cmd: 'mv', desc: 'moves (or renames) a file or folder.', syntax: 'mv [source] [destination]', example: 'mv draft.txt final.txt', extra: 'Renaming is just "moving" a file to a new name in the same folder.' },
    { cmd: 'touch', desc: 'creates a new, empty file (or updates its timestamp if it exists).', syntax: 'touch [filename]', example: 'touch notes.txt', extra: 'A quick way to create a blank file to edit later.' },
    { cmd: 'cat', desc: 'prints a file\'s contents straight to the terminal.', syntax: 'cat [filename]', example: 'cat notes.txt', extra: 'Great for short files. For long files, "less" is easier to read.' },
    { cmd: 'nano', desc: 'opens a simple, beginner-friendly text editor right inside the terminal.', syntax: 'nano [filename]', example: 'nano script.sh', extra: 'Ctrl+O saves, Ctrl+X exits — the shortcuts are listed at the bottom of the screen.' },
    { cmd: 'chmod', desc: 'changes a file\'s permissions — who can read, write, or execute it.', syntax: 'chmod [permissions] [filename]', example: 'chmod +x script.sh', extra: '+x makes a file executable, so you can run it directly.' },
    { cmd: 'chown', desc: 'changes which user (and group) owns a file.', syntax: 'chown [user] [filename]', example: 'chown alex notes.txt', extra: 'Usually needs sudo, since you\'re changing something system-level.' },
    { cmd: 'grep', desc: 'searches text for lines matching a pattern — like Ctrl+F for the terminal.', syntax: 'grep [pattern] [filename]', example: 'grep "error" log.txt', extra: 'Add -i to ignore uppercase/lowercase differences.' },
    { cmd: 'find', desc: 'searches for files and folders by name, type, or other properties.', syntax: 'find [path] -name [pattern]', example: 'find . -name "*.txt"', extra: 'The "." means "search starting from the current folder".' },
    { cmd: 'sudo', desc: 'runs a command with admin (superuser) privileges — for actions normal users aren\'t allowed to do.', syntax: 'sudo [command]', example: 'sudo apt update', extra: 'Powerful and a little dangerous — only use it when a command actually needs it.' },
    { cmd: 'man', desc: 'opens the manual (built-in help pages) for any command.', syntax: 'man [command]', example: 'man ls', extra: 'Press "q" to quit the manual page.' },
    { cmd: 'history', desc: 'shows a list of commands you\'ve typed recently.', syntax: 'history', example: 'history', extra: 'You can rerun command #42 with "!42".' },
    { cmd: 'clear', desc: 'clears the terminal screen so you can start fresh.', syntax: 'clear', example: 'clear', extra: 'Nothing is actually deleted — it just clears the visible screen.' },
    { cmd: 'echo', desc: 'prints text back to the terminal — often used to display messages or variable values.', syntax: 'echo [text]', example: 'echo "Hello, Linux!"', extra: 'Try "echo $HOME" to print an environment variable\'s value.' },
    { cmd: 'df', desc: 'shows how much disk space is used and free on your system.', syntax: 'df -h', example: 'df -h', extra: '-h means "human-readable", so sizes show as MB/GB instead of raw bytes.' },
    { cmd: 'ps', desc: 'lists the programs (processes) currently running.', syntax: 'ps [options]', example: 'ps aux', extra: 'Pair it with grep to find one process: ps aux | grep firefox' }
  ];

  const PIPE_REDIRECT_TOPIC = {
    id: 'linux_pipes_redirects',
    keywords: ['pipe', 'pipes', '|', 'redirect', 'redirection', '>>', '>'],
    respond: () => ({
      text:
        "Pipes and redirects are how Linux commands work together:\n\n" +
        "• A pipe ( | ) sends one command's output into another command as input.\n" +
        "  Example: ls | grep \"txt\" — lists files, then filters for ones containing \"txt\".\n\n" +
        "• A redirect ( > ) sends output into a file, overwriting it.\n" +
        "  Example: echo \"hello\" > notes.txt\n\n" +
        "• A double redirect ( >> ) appends to a file instead of overwriting it.\n" +
        "  Example: echo \"more text\" >> notes.txt\n\n" +
        "Try these in the sandbox below!",
      actions: [{ label: '🖥️ Try in Sandbox', action: 'scroll', target: '#terminal-sandbox' }]
    })
  };

  const PERMISSIONS_TOPIC = {
    id: 'linux_permissions',
    keywords: ['permission', 'permissions', 'read write execute', 'rwx'],
    respond: () => ({
      text:
        "Every file in Linux has permissions for three groups: the owner, the group, and everyone else. Each group can have:\n\n" +
        "• r (read) — view the file's contents\n" +
        "• w (write) — edit or delete the file\n" +
        "• x (execute) — run it as a program or script\n\n" +
        "You view permissions with `ls -l` and change them with `chmod`. For example, `chmod +x script.sh` makes a script runnable.",
      actions: [{ label: '🖥️ Try in Sandbox', action: 'scroll', target: '#terminal-sandbox' }]
    })
  };

  const LINUX_TOPICS = COMMAND_DB.map(c => ({
    id: 'linux_cmd_' + c.cmd,
    keywords: [c.cmd, c.cmd + ' command', 'what is ' + c.cmd, 'what does ' + c.cmd + ' do', 'how to use ' + c.cmd],
    respond: () => ({
      text:
        "📘 `" + c.cmd + "` — " + c.desc + "\n\n" +
        "Syntax: " + c.syntax + "\n" +
        "Example: " + c.example + "\n\n" +
        "💡 " + c.extra + "\n\n" +
        "Want to try it yourself?",
      actions: [{ label: '🖥️ Try in Sandbox', action: 'scroll', target: '#terminal-sandbox' }]
    })
  })).concat([PIPE_REDIRECT_TOPIC, PERMISSIONS_TOPIC]);

  const GENERAL_TOPICS = [
    {
      id: 'gen_python',
      keywords: ['python'],
      respond: () => ({
        text: "Python is a beginner-friendly, high-level programming language known for readable syntax. It's widely used for web development, data science, automation, and AI. It's a great next step after our program's coding fundamentals track!",
        actions: [{ label: '📚 See Our Coding Track', action: 'scroll', target: '#curriculum' }]
      })
    },
    {
      id: 'gen_js',
      keywords: ['javascript', 'js '],
      respond: () => ({ text: "JavaScript is the programming language of the web browser — it's what makes web pages interactive (like this chat widget!). Paired with HTML and CSS, it's one of the three core web technologies." })
    },
    {
      id: 'gen_html_css',
      keywords: ['html', 'css', 'web page', 'webpage', 'website design'],
      respond: () => ({ text: "HTML structures a web page's content, and CSS styles how it looks (colors, layout, fonts). Together with JavaScript for interactivity, they form the foundation of every website, including this one." })
    },
    {
      id: 'gen_git',
      keywords: ['git', 'github', 'version control'],
      respond: () => ({ text: "Git is a version control system that tracks changes to code over time, so teams can collaborate without overwriting each other's work. GitHub is a popular website for hosting Git projects online." })
    },
    {
      id: 'gen_api',
      keywords: ['api', 'apis'],
      respond: () => ({ text: "An API (Application Programming Interface) is a set of rules that lets one piece of software talk to another — for example, an app calling a weather service to fetch today's forecast." })
    },
    {
      id: 'gen_cloud',
      keywords: ['cloud computing', 'aws', 'cloud server', 'what is the cloud'],
      respond: () => ({ text: "Cloud computing means running software and storing data on remote servers (like AWS, Google Cloud, or Azure) accessed over the internet, instead of on your own computer. It's the backbone of most modern apps." })
    },
    {
      id: 'gen_cyber',
      keywords: ['cybersecurity', 'cyber security', 'hacking', 'hacker'],
      respond: () => ({ text: "Cybersecurity is the practice of protecting computers, networks, and data from unauthorized access or attacks. Ethical hackers ('white hats') use these same skills to find and fix security holes legally." })
    },
    {
      id: 'gen_ai',
      keywords: ['artificial intelligence', 'machine learning', 'what is ai', ' ai '],
      respond: () => ({ text: "Artificial Intelligence (AI) is technology that lets computers perform tasks that normally need human intelligence — like recognizing images, understanding language, or making predictions from data. Machine learning is a common technique used to build AI systems." })
    },
    {
      id: 'gen_database',
      keywords: ['database', 'sql', 'data storage'],
      respond: () => ({ text: "A database is an organized system for storing and retrieving data. SQL is the most common language used to query and manage data inside databases like MySQL or PostgreSQL." })
    },
    {
      id: 'gen_programming_basics',
      keywords: ['variable', 'variables', 'loop', 'loops', 'function', 'functions', 'algorithm', 'what is coding', 'what is programming'],
      respond: () => ({
        text: "In programming: a variable stores a value, a loop repeats an action, and a function is a reusable block of code. An algorithm is just a step-by-step set of instructions to solve a problem. These are exactly the fundamentals our coding track teaches!",
        actions: [{ label: '📚 See Our Coding Track', action: 'scroll', target: '#curriculum' }]
      })
    },
    {
      id: 'gen_opensource',
      keywords: ['open source', 'open-source'],
      respond: () => ({ text: "Open source means a program's source code is publicly available for anyone to view, use, modify, and share. Linux itself is the most famous open-source project in the world." })
    }
  ];

  const SMALLTALK_TOPICS = [
    {
      id: 'thanks',
      keywords: ['thanks', 'thank you', 'thx', 'appreciate it'],
      respond: () => ({ text: "You're welcome! 😊 Let me know if there's anything else you'd like to know about our classes or otherwise." })
    },
    {
      id: 'bye',
      keywords: ['bye', 'goodbye', 'see you', 'later', 'cya'],
      respond: () => ({ text: "Goodbye! 👋 Feel free to reopen this chat anytime you have questions." })
    },
    {
      id: 'how_are_you',
      keywords: ['how are you', "how're you", 'how you doing'],
      respond: () => ({ text: "I'm doing great, thanks for asking! Ready to help you learn about Junior Linux Lab or answer any question you've got." })
    },
    {
      id: 'who_are_you',
      keywords: ['who are you', 'your name', 'what are you'],
      respond: () => ({ text: "I'm Tux Bot, the Linux teacher for Junior Linux Lab. Ask me to explain any Linux command or concept, and I can also answer questions about our classes, general tech topics, do quick calculations, and search the web when I don't know something." })
    },
    {
      id: 'joke',
      keywords: ['joke', 'funny', 'make me laugh'],
      respond: () => ({ text: "Why do programmers prefer dark mode? Because light attracts bugs! 🐛\n\nWant another, or shall we get back to Linux classes?" })
    },
    {
      id: 'capabilities',
      keywords: ['what can you do', 'help me', 'capabilities', 'what do you do'],
      respond: () => ({
        text:
          "Here's what I can do:\n\n" +
          "• 🐧 Teach you Linux commands (try \"what does chmod do\" or \"explain grep\")\n" +
          "• 📚 Answer anything about Junior Linux Lab (curriculum, pricing, schedule, safety, refunds)\n" +
          "• 🧠 Explain general tech topics (Python, Git, APIs, AI, and more)\n" +
          "• 🧮 Do quick math (try \"what is 24 * 3\")\n" +
          "• 🕐 Tell you the current time or date\n" +
          "• 🌐 Search the web when I don't have an answer\n\n" +
          "Just ask away!",
        actions: []
      })
    }
  ];

  const ALL_TOPICS = [...SITE_TOPICS, ...LINUX_TOPICS, ...GENERAL_TOPICS, ...SMALLTALK_TOPICS];

  /* ==========================================================================
     Fuzzy scoring matcher + small utilities
     ========================================================================== */
  function tokenize(text) {
    return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  }

  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
    return dp[m][n];
  }

  function matchBestTopic(rawQuery) {
    const cleanQuery = ' ' + rawQuery.toLowerCase().trim() + ' ';
    const tokens = tokenize(rawQuery);
    let best = null;
    let bestScore = 0;

    ALL_TOPICS.forEach(topic => {
      let score = 0;
      topic.keywords.forEach(kw => {
        const needle = kw.includes(' ') ? kw : ' ' + kw.trim() + ' ';
        if (cleanQuery.includes(kw.includes(' ') ? kw : needle) || cleanQuery.includes(kw)) {
          score += kw.includes(' ') ? 2 : 1;
        } else if (!kw.includes(' ')) {
          tokens.forEach(tok => {
            if (tok.length > 3 && kw.length > 3 && levenshtein(tok, kw.trim()) <= 1) {
              score += 0.5;
            }
          });
        }
      });
      if (score > bestScore) {
        bestScore = score;
        best = topic;
      }
    });

    return bestScore > 0 ? best : null;
  }

  /* ==========================================================================
     Safe inline calculator (charset-restricted, no arbitrary code execution)
     ========================================================================== */
  function tryMath(rawQuery) {
    const candidates = rawQuery.match(/[0-9+\-*/().\s]+/g);
    if (!candidates) return null;

    const expr = candidates
      .map(s => s.trim())
      .filter(s => /[0-9]/.test(s) && /[+\-*/]/.test(s) && /^[0-9+\-*/().\s]+$/.test(s))
      .sort((a, b) => b.length - a.length)[0];

    if (!expr) return null;

    try {
      const result = Function('"use strict"; return (' + expr + ')')();
      if (typeof result !== 'number' || !isFinite(result)) return null;
      return { expr, result };
    } catch (e) {
      return null;
    }
  }

  function tryTimeDate(cleanQuery) {
    if (/what.?s the time|current time|what time is it|time now|time is it/.test(cleanQuery)) {
      return "It's currently " + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + " (based on your device's clock).";
    }
    if (/what.?s the date|today.?s date|current date|what day is it|what.?s today/.test(cleanQuery)) {
      return "Today is " + new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ".";
    }
    return null;
  }

  /* ==========================================================================
     Main response pipeline
     ========================================================================== */
  function respondToQuery(query) {
    const cleanQuery = query.toLowerCase().trim();

    // 1. Time/date (deterministic, check before anything else)
    const timeDateAnswer = tryTimeDate(cleanQuery);
    if (timeDateAnswer) {
      showBotMessage(timeDateAnswer);
      return;
    }

    // 2. Quick math, but only when the query actually looks like it's asking for a calculation
    if (/\d\s*[\+\-\*\/]\s*\d/.test(cleanQuery) || /calculate|what is|how much is|solve/.test(cleanQuery)) {
      const mathResult = tryMath(cleanQuery);
      if (mathResult) {
        showBotMessage(`${mathResult.expr.trim()} = **${mathResult.result}**`.replace(/\*\*/g, ''));
        return;
      }
    }

    // 3. Best-scoring topic across site facts, general knowledge, and small talk
    const topic = matchBestTopic(query);
    if (topic) {
      const { text, actions } = topic.respond();
      showBotMessage(text, actions || []);
      return;
    }

    // 4. Fallback — offer a web search instead of guessing
    showBotMessage(
      "I don't have a confident answer for that in my knowledge base yet. I don't want to guess and give you wrong information — want me to search the web for it instead?",
      [
        { label: '🔍 Search the web', action: 'websearch', target: query },
        { label: '📚 Class Curriculum', action: 'scroll', target: '#curriculum' },
        { label: '💰 Course Fees', action: 'scroll', target: '#pricing' },
        { label: '🛡️ For Parents', action: 'scroll', target: '#parents' }
      ]
    );
  }

  /* ==========================================================================
     Navigation / Link Actions Handler
     ========================================================================== */
  function handleAction(type, target) {
    if (type === 'scroll') {
      const element = document.querySelector(target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        // Close chat dialog on mobile devices so they can see the scrolled content
        if (window.innerWidth <= 768) {
          closeChat();
        }
      }
    } else if (type === 'modal') {
      if (window.openEnrollModal) {
        window.openEnrollModal(target);
      }
    } else if (type === 'websearch') {
      const url = 'https://www.google.com/search?q=' + encodeURIComponent(target);
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (type === 'faq') {
      const faqItems = document.querySelectorAll('.faq-item');
      const faqSection = document.getElementById('faq');

      if (faqSection) {
        faqSection.scrollIntoView({ behavior: 'smooth' });
      }

      if (faqItems && faqItems[target]) {
        setTimeout(() => {
          // Close all other accordions
          faqItems.forEach(otherItem => {
            otherItem.classList.remove('active');
            otherItem.querySelector('.faq-answer').style.maxHeight = null;
          });

          // Open target accordion
          const targetItem = faqItems[target];
          const answer = targetItem.querySelector('.faq-answer');
          targetItem.classList.add('active');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }, 600);

        if (window.innerWidth <= 768) {
          closeChat();
        }
      }
    }
  }
}
