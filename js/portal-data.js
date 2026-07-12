// Junior Linux Lab — shared data layer (Firebase) + EmailJS wiring.
// Loaded by both index.html (login/enroll/mentor portal) and
// student-dashboard.html (the student's full-page workspace).
//
// This is a real backend: student accounts + progress live in Firestore,
// gated by Firebase Authentication, so enrollments and mentor edits are
// visible from any browser/device — not just the one that made them.
// See firestore.rules (repo root) for the access rules that must be
// deployed in the Firebase console for this to be secure.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updatePassword
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, collection
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
  getStorage, ref as storageRef, uploadBytes, getBytes
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyA5INQztBiq389LItVwnFYB9gZgTQON9W4",
  authDomain: "junior-linux-lab.firebaseapp.com",
  projectId: "junior-linux-lab",
  storageBucket: "junior-linux-lab.firebasestorage.app",
  messagingSenderId: "878144180344",
  appId: "1:878144180344:web:56a178de4d8a608c7f9d8d"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

/* ==========================================================================
   EmailJS configuration
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
   Firebase-backed data layer
   ========================================================================== */
const MENTOR_EMAIL = 'ericallan.daniel@gmail.com';
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

function generatePassword() {
  return Math.random().toString(36).slice(-8);
}

function studentDocToObject(uid, data) {
  return { studentId: uid, ...data };
}

/* ---- Auth ---- */
function onAuthReady(callback) {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    unsubscribe();
    callback(user);
  });
}

function getCurrentUser() {
  return auth.currentUser;
}

function isMentorUser(user) {
  return !!user && user.email && user.email.toLowerCase() === MENTOR_EMAIL.toLowerCase();
}

async function loginMentor(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  if (!isMentorUser(cred.user)) {
    await signOut(auth);
    throw new Error('Not authorized as mentor.');
  }
  return cred.user;
}

async function loginStudent(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'students', cred.user.uid));
  if (!snap.exists()) {
    await signOut(auth);
    throw new Error('No matching student account.');
  }
  return studentDocToObject(cred.user.uid, snap.data());
}

function logout() {
  return signOut(auth);
}

async function changeStudentPassword(newPassword) {
  if (!auth.currentUser) throw new Error('Not signed in.');
  return updatePassword(auth.currentUser, newPassword);
}

/* ---- Students ---- */
async function registerStudent({ parentName, studentName, email, age, course }) {
  const password = generatePassword();
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  const studentDoc = {
    email,
    parentName,
    studentName,
    age,
    course,
    enrolledAt: new Date().toISOString(),
    feeStatus: 'pending',
    projects: PROJECT_TEMPLATE.map(p => ({ ...p }))
  };
  await setDoc(doc(db, 'students', cred.user.uid), studentDoc);

  return { studentId: cred.user.uid, password, ...studentDoc };
}

async function loadStudents() {
  const snap = await getDocs(collection(db, 'students'));
  return snap.docs.map(d => studentDocToObject(d.id, d.data()));
}

async function getStudent(uid) {
  const snap = await getDoc(doc(db, 'students', uid));
  return snap.exists() ? studentDocToObject(uid, snap.data()) : null;
}

async function updateStudentDetails(uid, { parentName, studentName, age }) {
  await updateDoc(doc(db, 'students', uid), { parentName, studentName, age });
  return getStudent(uid);
}

async function setStudentFeeStatus(uid, feeStatus) {
  await updateDoc(doc(db, 'students', uid), { feeStatus });
}

async function setStudentProjects(uid, projects) {
  await updateDoc(doc(db, 'students', uid), { projects });
}

/* ---- Syllabus (mentor-editable, shared with every student) ---- */
async function loadSyllabusProgress() {
  const ref = doc(db, 'syllabus', 'current');
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data().weeks;
  return SYLLABUS_TEMPLATE.map(w => ({ ...w, done: false }));
}

async function saveSyllabusProgress(progress) {
  await setDoc(doc(db, 'syllabus', 'current'), { weeks: progress });
}

/* ---- Terminal state cross-device sync (paired with linux-terminal's own
   IndexedDB-based local persistence — this is the cloud copy that lets a
   student's saved terminal work follow them to a different browser/device).
   ========================================================================== */
async function uploadTerminalState(uid, arrayBuffer, savedAt) {
  await uploadBytes(storageRef(storage, 'terminal-states/' + uid + '.bin'), arrayBuffer);
  await updateDoc(doc(db, 'students', uid), { terminalStateSavedAt: savedAt });
}

async function downloadTerminalState(uid) {
  try {
    return await getBytes(storageRef(storage, 'terminal-states/' + uid + '.bin'));
  } catch (err) {
    if (err && err.code === 'storage/object-not-found') return null;
    throw err;
  }
}

function usernameFromName(name) {
  const cleaned = String(name || '').trim().replace(/\s+/g, '').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 24);
  return cleaned || 'guest';
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

window.JLLPortal = {
  registerStudent,
  updateStudentDetails,
  setStudentFeeStatus,
  setStudentProjects,
  loadStudents,
  getStudent,
  loadSyllabusProgress,
  saveSyllabusProgress,
  uploadTerminalState,
  downloadTerminalState,
  sendEnrollmentEmail,
  initEmailJS,
  onAuthReady,
  getCurrentUser,
  isMentorUser,
  loginMentor,
  loginStudent,
  logout,
  changeStudentPassword,
  escapeHtml,
  usernameFromName,
  MENTOR_EMAIL,
  MENTOR_TERMINAL_USERNAME,
  SYLLABUS_TEMPLATE
};
