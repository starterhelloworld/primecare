/* Nursing Patient Records — academic prototype (data stored in browser localStorage) */
const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- Roles & permissions ---------- */
const PERMS = {
  Administrator: ['view', 'add', 'edit', 'vitals', 'notes', 'delete', 'audit', 'users'],
  Instructor: ['view', 'add', 'edit', 'vitals', 'notes', 'audit'],
  Nurse: ['view', 'add', 'edit', 'vitals', 'notes'],
  Student: ['view', 'add', 'edit', 'vitals', 'notes']
};
const can = a => !!(state.user && PERMS[state.user.role].includes(a));

/* ---------- Data ---------- */
const seedUsers = [
  { id: 'u1', name: 'Admin', email: 'admin@gmail.com', password: 'admin3211', role: 'Administrator', status: 'Active' },
  { id: 'u2', name: 'Instructor', email: 'instructor@gmail.com', password: 'instructor3212', role: 'Instructor', status: 'Active' },
  { id: 'u3', name: 'Nurse', email: 'nurse@gmail.com', password: 'nurse3213', role: 'Nurse', status: 'Active' },
  { id: 'u4', name: 'Student', email: 'student@gmail.com', password: 'student123', role: 'Student', status: 'Active' }
];
const storedUsers = load('npr_users', null);
const authSeedVersion = load('npr_auth_seed_version', 0);
const users = storedUsers && authSeedVersion >= 1
  ? storedUsers
  : storedUsers
  ? [...seedUsers.map(seed => {
    const stored = storedUsers.find(user => user.id === seed.id);
    return stored ? { ...stored, ...seed, name: stored.name || seed.name, status: stored.status || seed.status } : seed;
  }), ...storedUsers.filter(user => !seedUsers.some(seed => seed.id === user.id))]
  : seedUsers;
if (authSeedVersion < 1) {
  save('npr_users', users);
  save('npr_auth_seed_version', 1);
}
if (authSeedVersion < 2) {
  const admin = users.find(user => user.id === 'u1');
  if (admin && ['Ryzza', 'Administrator'].includes(admin.name)) admin.name = 'Admin';
  save('npr_users', users);
  save('npr_auth_seed_version', 2);
}
const blankPatient = () => ({
  id: '', firstName: '', middleName: '', lastName: '', suffix: '', dob: '', age: '', sex: '', civilStatus: '', nationality: '', religion: '',
  address: '', contact: '', email: '', ecName: '', ecRel: '', ecContact: '', ecAddress: '', hospId: '', philhealth: '', insNo: '',
  createdAt: today(), pastHistory: {}, familyHistory: {}, psychosocial: {},
  surgical: [], allergies: [], meds: [], vitals: [], assessments: [], notes: [], labs: [], immun: [], carePlans: []
});
function seedPatients() {
  const mk = (o) => Object.assign(blankPatient(), o);
  const a = mk({ id: 'PT-0001', firstName: 'Juan', lastName: 'Dela Cruz', dob: '1985-03-12', age: 41, sex: 'Male', civilStatus: 'Married', nationality: 'Filipino', religion: 'Catholic', address: 'Quezon City', contact: '09171234567', email: 'juan@example.com', ecName: 'Rosa Dela Cruz', ecRel: 'Spouse', ecContact: '09179876543', hospId: 'H-1001', philhealth: 'PhilHealth', insNo: '12-345678901-2' });
  a.vitals.push({ id: uid(), date: today(), temp: 38.2, bp: '150/95', hr: 96, rr: 20, spo2: 97, pain: 3, o2: 'Room air', weight: 78, height: 172, by: 'Seed' });
  a.labs.push({ id: uid(), test: 'Hemoglobin', date: today(), result: '13.5', range: '13.5-17.5', unit: 'g/dL', remarks: 'Normal', provider: 'Dr. Reyes' });
  const b = mk({ id: 'PT-0002', firstName: 'Maria', lastName: 'Santos', dob: '1992-07-25', age: 34, sex: 'Female', civilStatus: 'Single', nationality: 'Filipino', religion: 'Catholic', address: 'Manila', contact: '09181112222' });
  b.vitals.push({ id: uid(), date: today(), temp: 36.8, bp: '118/76', hr: 78, rr: 16, spo2: 85, pain: 0, o2: 'Nasal cannula', weight: 55, height: 160, by: 'Seed' });
  b.labs.push({ id: uid(), test: 'WBC', date: today(), result: '', range: '4.5-11.0', unit: 'x10^9/L', remarks: 'Awaiting result', provider: 'Dr. Lim' });
  const c = mk({ id: 'PT-0003', firstName: 'Pedro', lastName: 'Reyes', dob: '1970-11-02', age: 55, sex: 'Male', civilStatus: 'Widowed', nationality: 'Filipino', religion: 'Iglesia', address: 'Cebu City', contact: '09223334444' });
  c.notes.push({ id: uid(), date: today(), format: 'SOAP', S: 'Complains of headache', O: 'BP 140/90', A: 'Acute pain', P: 'Give analgesic, monitor BP', by: 'Seed' });
  return [a, b, c];
}
const state = {
  user: load('npr_session', null), view: 'dashboard', pid: null, tab: 'Overview', q: '', denied: null,
  users,
  patients: load('npr_patients', null) || (() => { const p = seedPatients(); save('npr_patients', p); return p; })(),
  audit: load('npr_audit', [])
};
const persist = () => { save('npr_users', state.users); save('npr_patients', state.patients); save('npr_audit', state.audit); };
function log(action, pid, desc) {
  state.audit.unshift({ time: new Date().toLocaleString(), user: state.user ? `${state.user.name} (${state.user.role})` : 'Anonymous', action, pid: pid || '-', desc });
  persist();
}
const patient = id => state.patients.find(p => p.id === id);
const fullName = p => [p.firstName, p.middleName, p.lastName, p.suffix].filter(Boolean).join(' ');

/* ---------- Field schemas: {k,l,t,o,g,f} ---------- */
const OPT = {
  sex: ['Male', 'Female', 'Other'], civil: ['Single', 'Married', 'Widowed', 'Separated', 'Divorced'],
  loc: ['Alert', 'Verbal', 'Pain', 'Unresponsive'], yn: ['Yes', 'No']
};
const F = {
  patientPersonal: [
    { k: 'id', l: 'Patient ID' }, { k: 'firstName', l: 'First Name', req: 1 }, { k: 'middleName', l: 'Middle Name' }, { k: 'lastName', l: 'Last Name', req: 1 },
    { k: 'suffix', l: 'Suffix' }, { k: 'dob', l: 'Date of Birth', t: 'date', req: 1 }, { k: 'age', l: 'Age', t: 'number' }, { k: 'sex', l: 'Sex', t: 'select', o: OPT.sex },
    { k: 'civilStatus', l: 'Civil Status', t: 'select', o: OPT.civil }, { k: 'nationality', l: 'Nationality' }, { k: 'religion', l: 'Religion' },
    { k: 'address', l: 'Address' }, { k: 'contact', l: 'Contact Number' }, { k: 'email', l: 'Email', t: 'email' }],
  emergency: [{ k: 'ecName', l: 'Contact Name' }, { k: 'ecRel', l: 'Relationship' }, { k: 'ecContact', l: 'Contact Number' }, { k: 'ecAddress', l: 'Address' }],
  ident: [{ k: 'hospId', l: 'Hospital / Patient ID' }, { k: 'philhealth', l: 'PhilHealth / Insurance' }, { k: 'insNo', l: 'Insurance Number' }],
  pastHistory: [{ k: 'illnesses', l: 'Previous Illnesses', t: 'textarea' }, { k: 'chronic', l: 'Chronic Conditions', t: 'textarea' },
    { k: 'hospitalizations', l: 'Previous Hospitalizations', t: 'textarea' }, { k: 'diagnoses', l: 'Previous Diagnoses', t: 'textarea' }],
  familyHistory: [{ k: 'hypertension', l: 'Hypertension', t: 'select', o: OPT.yn }, { k: 'diabetes', l: 'Diabetes', t: 'select', o: OPT.yn },
    { k: 'heart', l: 'Heart Disease', t: 'select', o: OPT.yn }, { k: 'cancer', l: 'Cancer', t: 'select', o: OPT.yn },
    { k: 'kidney', l: 'Kidney Disease', t: 'select', o: OPT.yn }, { k: 'other', l: 'Other Hereditary Conditions', t: 'textarea' }],
  psychosocial: [{ k: 'mental', l: 'Mental Status' }, { k: 'mood', l: 'Mood' }, { k: 'behavior', l: 'Behavior' }, { k: 'sleep', l: 'Sleep' },
    { k: 'stressors', l: 'Stressors', t: 'textarea' }, { k: 'support', l: 'Social Support', t: 'textarea' }, { k: 'lifestyle', l: 'Lifestyle', t: 'textarea' },
    { k: 'substance', l: 'Substance-Use History', t: 'textarea' }, { k: 'safety', l: 'Safety Assessment', t: 'textarea' }]
};
const LISTS = {
  surgical: { title: 'Surgical History', perm: 'edit', fields: [{ k: 'procedure', l: 'Procedure' }, { k: 'date', l: 'Date', t: 'date' }, { k: 'hospital', l: 'Hospital' }, { k: 'outcome', l: 'Outcome' }] },
  allergies: { title: 'Allergies', perm: 'edit', fields: [{ k: 'type', l: 'Type', t: 'select', o: ['Drug', 'Food', 'Environmental'] }, { k: 'allergen', l: 'Allergen' }, { k: 'reaction', l: 'Reaction' }] },
  meds: { title: 'Medications', perm: 'edit', fields: [{ k: 'name', l: 'Medication Name' }, { k: 'generic', l: 'Generic Name' }, { k: 'dose', l: 'Dose' }, { k: 'route', l: 'Route' }, { k: 'freq', l: 'Frequency' },
    { k: 'start', l: 'Start Date', t: 'date' }, { k: 'end', l: 'End Date', t: 'date' }, { k: 'indication', l: 'Indication' }, { k: 'status', l: 'Status', t: 'select', o: ['Active', 'Completed', 'Discontinued'] }, { k: 'notes', l: 'Notes', t: 'textarea' }] },
  vitals: { title: 'Vital Signs', perm: 'vitals', fields: [{ k: 'date', l: 'Date', t: 'date' }, { k: 'temp', l: 'Temperature (°C)', t: 'number', step: '0.1' }, { k: 'bp', l: 'Blood Pressure (mmHg)', ph: '120/80' },
    { k: 'hr', l: 'Heart Rate (bpm)', t: 'number' }, { k: 'rr', l: 'Respiratory Rate (/min)', t: 'number' }, { k: 'spo2', l: 'SpO2 (%)', t: 'number' }, { k: 'pain', l: 'Pain Score (0-10)', t: 'number', min: 0, max: 10 },
    { k: 'o2', l: 'Oxygen Support', t: 'select', o: ['Room air', 'Nasal cannula', 'Face mask', 'Non-rebreather', 'Ventilator'] }, { k: 'weight', l: 'Weight (kg)', t: 'number', step: '0.1' }, { k: 'height', l: 'Height (cm)', t: 'number', step: '0.1' }] },
  assessments: { title: 'Nursing Assessment', perm: 'notes', cards: 1, fields: [
    { g: 'General', k: 'appearance', l: 'General Appearance' }, { g: 'General', k: 'loc', l: 'Level of Consciousness', t: 'select', o: OPT.loc }, { g: 'General', k: 'mental', l: 'Mental Status' },
    { g: 'General', k: 'mobility', l: 'Mobility' }, { g: 'General', k: 'nutrition', l: 'Nutrition' }, { g: 'General', k: 'hydration', l: 'Hydration' },
    { g: 'Neurological', k: 'nLoc', l: 'LOC' }, { g: 'Neurological', k: 'orientation', l: 'Orientation' }, { g: 'Neurological', k: 'pupils', l: 'Pupils' }, { g: 'Neurological', k: 'motor', l: 'Motor Response' },
    { g: 'Respiratory', k: 'rPattern', l: 'Respiratory Pattern' }, { g: 'Respiratory', k: 'breath', l: 'Breath Sounds' }, { g: 'Respiratory', k: 'rSat', l: 'Oxygen Saturation' }, { g: 'Respiratory', k: 'rO2', l: 'Oxygen Support' },
    { g: 'Cardiovascular', k: 'cHr', l: 'Heart Rate' }, { g: 'Cardiovascular', k: 'rhythm', l: 'Rhythm' }, { g: 'Cardiovascular', k: 'pulses', l: 'Peripheral Pulses' }, { g: 'Cardiovascular', k: 'cap', l: 'Capillary Refill' },
    { g: 'Gastrointestinal', k: 'appetite', l: 'Appetite' }, { g: 'Gastrointestinal', k: 'bowel', l: 'Bowel Sounds' }, { g: 'Gastrointestinal', k: 'nv', l: 'Nausea/Vomiting' }, { g: 'Gastrointestinal', k: 'abdomen', l: 'Abdominal Findings' },
    { g: 'Genitourinary', k: 'urination', l: 'Urination' }, { g: 'Genitourinary', k: 'urine', l: 'Urine Characteristics' },
    { g: 'Musculoskeletal', k: 'rom', l: 'ROM' }, { g: 'Musculoskeletal', k: 'strength', l: 'Strength' }, { g: 'Musculoskeletal', k: 'mMobility', l: 'Mobility' },
    { g: 'Skin', k: 'color', l: 'Color' }, { g: 'Skin', k: 'sTemp', l: 'Temperature' }, { g: 'Skin', k: 'integrity', l: 'Integrity' }, { g: 'Skin', k: 'wounds', l: 'Wounds' }] },
  notes: { title: 'Nursing Notes', perm: 'notes', cards: 1, fields: [{ k: 'date', l: 'Date', t: 'date' }, { k: 'format', l: 'Format', t: 'select', o: ['SOAP', 'DAR'] },
    { f: 'SOAP', k: 'S', l: 'Subjective (patient’s verbal complaints)', t: 'textarea' }, { f: 'SOAP', k: 'O', l: 'Objective (observable/measurable findings)', t: 'textarea' },
    { f: 'SOAP', k: 'A', l: 'Assessment (nursing assessment)', t: 'textarea' }, { f: 'SOAP', k: 'P', l: 'Plan (planned nursing interventions)', t: 'textarea' },
    { f: 'DAR', k: 'D', l: 'Data', t: 'textarea' }, { f: 'DAR', k: 'Ac', l: 'Action', t: 'textarea' }, { f: 'DAR', k: 'R', l: 'Response', t: 'textarea' }] },
  labs: { title: 'Laboratory / Test Results', perm: 'edit', fields: [{ k: 'test', l: 'Test Name' }, { k: 'date', l: 'Date', t: 'date' }, { k: 'result', l: 'Result' }, { k: 'range', l: 'Reference Range' },
    { k: 'unit', l: 'Unit' }, { k: 'remarks', l: 'Remarks' }, { k: 'provider', l: 'Ordering Provider' }] },
  immun: { title: 'Immunization', perm: 'edit', fields: [{ k: 'vaccine', l: 'Vaccine' }, { k: 'dose', l: 'Dose' }, { k: 'date', l: 'Date Administered', t: 'date' }, { k: 'lot', l: 'Lot Number' },
    { k: 'route', l: 'Route' }, { k: 'site', l: 'Site' }, { k: 'next', l: 'Next Dose', t: 'date' }, { k: 'by', l: 'Administered By' }] },
  carePlans: { title: 'Care Plan', perm: 'notes', cards: 1, fields: [{ k: 'date', l: 'Date', t: 'date' }, { k: 'assessment', l: '1. Assessment', t: 'textarea' }, { k: 'diagnosis', l: '2. Nursing Diagnosis', t: 'textarea' },
    { k: 'goals', l: '3. Goals / Expected Outcomes', t: 'textarea' }, { k: 'interventions', l: '4. Nursing Interventions', t: 'textarea' }, { k: 'rationale', l: '5. Rationale', t: 'textarea' }, { k: 'evaluation', l: '6. Evaluation', t: 'textarea' }] }
};

/* ---------- Form helpers ---------- */
function inputHTML(f, val = '') {
  const attrs = `name="${f.k}" ${f.req ? 'required' : ''} ${f.ph ? `placeholder="${f.ph}"` : ''} ${f.step ? `step="${f.step}"` : ''} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}`;
  let el;
  if (f.t === 'select') el = `<select ${attrs}><option value=""></option>${f.o.map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  else if (f.t === 'textarea') el = `<textarea ${attrs}>${esc(val)}</textarea>`;
  else el = `<input type="${f.t || 'text'}" ${attrs} value="${esc(val)}">`;
  return `<div ${f.f ? `data-f="${f.f}"` : ''}><label>${esc(f.l)}${f.req ? ' *' : ''}</label>${el}</div>`;
}
const fieldsHTML = (fields, vals = {}) => `<div class="grid">${fields.map(f => inputHTML(f, vals[f.k])).join('')}</div>`;
const readForm = form => Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, v.trim()]));
const calcAge = d => { if (!d) return ''; const b = new Date(d), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 2500); }
function openModal(html) { const m = $('#modal'); m.innerHTML = `<div class="box">${html}</div>`; m.classList.remove('hidden'); return m; }
const closeModal = () => $('#modal').classList.add('hidden');
function bindPasswordToggle(password, toggle) {
  toggle.onclick = () => {
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    toggle.textContent = visible ? 'Hide' : 'Show';
    toggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
    toggle.setAttribute('aria-pressed', String(visible));
  };
}

/* ---------- Auth ---------- */
function loginView() {
  $('#app').innerHTML = `<div class="center"><div class="login">
    <img class="login-logo" src="asset/logo.png" alt="PrimeCare Medical Center">
    <p class="muted">Please sign in to continue</p>
    <form id="login-form" class="login-form">
      <div><label for="login-email">Email</label><input id="login-email" name="email" type="email" autocomplete="username" required></div>
      <div><label for="login-password">Password</label><div class="password-control"><input id="login-password" name="password" type="password" autocomplete="current-password" required><button id="toggle-password" type="button" aria-label="Show password" aria-pressed="false">Show</button></div></div>
      <button type="submit">Sign In</button>
    </form>
  </div></div>`;
  bindPasswordToggle($('#login-password'), $('#toggle-password'));
  $('#login-form').onsubmit = e => {
    e.preventDefault();
    const credentials = readForm(e.target);
    verifyLogin(credentials.email.toLowerCase(), credentials.password);
  };
}
function verifyLogin(email, password) {
  const u = state.users.find(x => x.email.toLowerCase() === email && x.password === password && x.status === 'Active');
  if (!u) {
    state.denied = email; state.user = null;
    state.audit.unshift({ time: new Date().toLocaleString(), user: email, action: 'LOGIN_DENIED', pid: '-', desc: 'Unauthorized or inactive account' }); persist();
    return deniedView();
  }
  const { password: storedPassword, ...sessionUser } = u;
  state.user = { ...sessionUser, authVersion: 2 }; save('npr_session', state.user); state.view = 'dashboard'; log('LOGIN', null, 'User signed in'); render();
}
function deniedView() {
  $('#app').innerHTML = `<div class="center"><div class="login"><h1 class="denied">Access Denied</h1>
    <p>Email or password is incorrect, or the account is inactive.</p>
    <p class="muted">Contact the Administrator for assistance.</p><button id="back">Back to Login</button></div></div>`;
  $('#back').onclick = () => { state.denied = null; loginView(); };
}
function logout() { log('LOGOUT', null, 'User signed out'); state.user = null; localStorage.removeItem('npr_session'); loginView(); }

/* ---------- Layout ---------- */
function render() {
  if (!state.user) return loginView();
  const nav = [['dashboard', 'Dashboard'], ['patients', 'Patients'], ['add', 'Add Patient']];
  if (can('audit')) nav.push(['audit', 'Audit Log']);
  if (can('users')) nav.push(['users', 'User Management']);
  $('#app').innerHTML = `<div class="layout"><nav class="side"><h2>PrimeCare Medical Center</h2>
    ${nav.map(([v, l]) => `<a data-v="${v}" class="${state.view === v || (state.view === 'profile' && v === 'patients') ? 'act' : ''}">${l}</a>`).join('')}
    <div class="userbox"><b>${esc(state.user.name)}</b><br>${esc(state.user.email)}<br><span class="badge">${state.user.role}</span><button id="lo">Logout</button></div></nav>
    <main class="main"><header class="app-brand"><img src="asset/logo.png" alt=""><h1>PrimeCare Medical Center</h1></header><div id="main"></div></main></div>`;
  document.querySelectorAll('.side a').forEach(a => a.onclick = () => { state.view = a.dataset.v; state.pid = null; if (state.view === 'add') state.editing = null; render(); });
  $('#lo').onclick = logout;
  const views = { dashboard, patients: patientsView, add: patientForm, profile: profileView, audit: auditView, users: usersView };
  const needs = { audit: 'audit', users: 'users' };
  if (needs[state.view] && !can(needs[state.view])) { $('#main').innerHTML = '<div class="card denied"><h2>Access Denied</h2>Your role has no permission for this page.</div>'; return; }
  (views[state.view] || dashboard)($('#main'));
}

/* ---------- Dashboard ---------- */
function isCritical(v) {
  const sys = parseInt(String(v.bp || '').split('/')[0]);
  return (v.spo2 !== '' && v.spo2 < 90) || (v.temp !== '' && (v.temp >= 39 || v.temp < 35)) || (v.hr !== '' && (v.hr > 130 || v.hr < 40)) || (sys && (sys >= 180 || sys < 80));
}
function dashboard(el) {
  const P = state.patients, all = k => P.flatMap(p => p[k].map(x => ({ ...x, pid: p.id })));
  const crit = P.filter(p => p.vitals.length && isCritical(p.vitals[p.vitals.length - 1])).length;
  const pending = all('labs').filter(l => !l.result).length;
  const S = [['Total Patients', P.length, ''], ["Today's Records", P.filter(p => p.createdAt === today()).length, 'grn'], ['Vital-Sign Entries', all('vitals').length, ''],
    ['Clinical Notes', all('notes').length, ''], ['Pending Results', pending, 'org'], ['Critical Alerts', crit, 'red']];
  const recent = [...P].reverse().slice(0, 5);
  el.innerHTML = `<h1>Welcome, ${esc(state.user.name)}</h1><p class="muted">Signed in as ${state.user.role}</p>
    <div class="stats">${S.map(([l, n, c]) => `<div class="stat ${c}"><b>${n}</b><span>${l}</span></div>`).join('')}</div>
    <div class="card"><h3>Recent Patients</h3>${patientTable(recent)}</div>`;
  bindRows(el);
}

/* ---------- Patients list & search ---------- */
function patientTable(list) {
  if (!list.length) return '<p class="muted">No patients found.</p>';
  return `<div class="tablewrap"><table><tr><th>Patient ID</th><th>Name</th><th>DOB</th><th>Age</th><th>Sex</th><th>Contact</th></tr>
    ${list.map(p => `<tr class="click" data-id="${esc(p.id)}"><td>${esc(p.id)}</td><td>${esc(fullName(p))}</td><td>${esc(p.dob)}</td><td>${esc(p.age)}</td><td>${esc(p.sex)}</td><td>${esc(p.contact)}</td></tr>`).join('')}</table></div>`;
}
function bindRows(el) { el.querySelectorAll('tr.click').forEach(r => r.onclick = () => { state.pid = r.dataset.id; state.view = 'profile'; state.tab = 'Overview'; render(); }); }
function patientsView(el) {
  el.innerHTML = `<div class="bar"><h1>Patients</h1>${can('add') ? '<button id="np">Add Patient</button>' : ''}</div>
    <div class="card"><input id="q" placeholder="Search by Patient ID, full name, date of birth (YYYY-MM-DD) or contact number" value="${esc(state.q)}"><div id="res" style="margin-top:1rem"></div></div>`;
  const run = () => {
    const q = state.q.toLowerCase().trim();
    const list = state.patients.filter(p => !q || [p.id, fullName(p), `${p.firstName} ${p.lastName}`, p.dob, p.contact].some(v => String(v || '').toLowerCase().includes(q)));
    $('#res').innerHTML = patientTable(list); bindRows($('#res'));
  };
  $('#q').oninput = e => { state.q = e.target.value; run(); }; run();
  if ($('#np')) $('#np').onclick = () => { state.view = 'add'; state.editing = null; render(); };
}

/* ---------- Add / Edit patient ---------- */
function patientForm(el) {
  const editing = state.editing ? patient(state.editing) : null;
  if (!editing && !can('add') || editing && !can('edit')) { el.innerHTML = '<div class="card denied">Access denied.</div>'; return; }
  const p = editing || { ...blankPatient(), id: 'PT-' + String(state.patients.reduce((m, x) => Math.max(m, parseInt(x.id.replace(/\D/g, '')) || 0), 0) + 1).padStart(4, '0') };
  el.innerHTML = `<h1>${editing ? 'Edit' : 'Add'} Patient</h1><form id="pf" class="card">
    <fieldset><legend>Personal Information</legend>${fieldsHTML(F.patientPersonal, p)}</fieldset>
    <fieldset><legend>Emergency Contact</legend>${fieldsHTML(F.emergency, p)}</fieldset>
    <fieldset><legend>Identification</legend>${fieldsHTML(F.ident, p)}</fieldset>
    <button>Save</button> <button type="button" class="sec" id="cn">Cancel</button></form>`;
  const f = $('#pf');
  if (editing) f.id.readOnly = true;
  f.dob.onchange = () => f.age.value = calcAge(f.dob.value);
  $('#cn').onclick = () => { state.view = editing ? 'profile' : 'patients'; state.pid = editing ? p.id : null; render(); };
  f.onsubmit = e => {
    e.preventDefault(); const d = readForm(f);
    if (!editing && patient(d.id)) return toast('Patient ID already exists');
    if (editing) {
      const changed = Object.keys(d).filter(k => String(p[k] ?? '') !== d[k]);
      Object.assign(p, d); log('EDIT_PATIENT', p.id, `Updated: ${changed.join(', ') || 'no changes'}`);
    } else { Object.assign(p, d, { createdAt: today() }); state.patients.push(p); log('ADD_PATIENT', p.id, `Registered ${fullName(p)}`); }
    persist(); toast('Patient saved'); state.view = 'profile'; state.pid = p.id; state.tab = 'Overview'; render();
  };
}

/* ---------- Patient profile ---------- */
const TABS = ['Overview', 'History', 'Vitals', 'Assessment', 'Medications', 'Labs', 'Notes', 'Care Plan', 'Immunization', 'Psychosocial'];
function profileView(el) {
  const p = patient(state.pid); if (!p) { state.view = 'patients'; return render(); }
  el.innerHTML = `<div class="bar"><div><h1>${esc(fullName(p))}</h1><span class="badge">${esc(p.id)}</span> <span class="muted">${esc(p.sex)} · ${esc(p.age)} yrs</span></div>
    <div class="actions">${can('edit') ? '<button id="ed">Edit</button>' : ''}${can('delete') ? '<button id="del" class="danger">Delete</button>' : ''}<button class="sec" id="bk">Back</button></div></div>
    <div class="tabs">${TABS.map(t => `<button data-t="${t}" class="${t === state.tab ? 'act' : ''}">${t}</button>`).join('')}</div><div id="tab"></div>`;
  $('#bk').onclick = () => { state.view = 'patients'; render(); };
  if ($('#ed')) $('#ed').onclick = () => { state.editing = p.id; state.view = 'add'; render(); };
  if ($('#del')) $('#del').onclick = () => deletePatient(p);
  el.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { state.tab = b.dataset.t; profileView(el); });
  const t = $('#tab');
  ({ Overview: overviewTab, History: historyTab, Vitals: () => listSection(t, p, 'vitals'), Assessment: () => listSection(t, p, 'assessments'), Medications: () => listSection(t, p, 'meds'),
    Labs: () => listSection(t, p, 'labs'), Notes: () => listSection(t, p, 'notes'), 'Care Plan': () => listSection(t, p, 'carePlans'), Immunization: () => listSection(t, p, 'immun'),
    Psychosocial: () => singleForm(t, p, 'psychosocial', 'Psychosocial Information', 'edit') }[state.tab])(t, p);
}
const kv = (fields, o) => `<div class="kv">${fields.map(f => `<div><small>${esc(f.l)}</small>${esc(o[f.k]) || '<span class="muted">—</span>'}</div>`).join('')}</div>`;
function overviewTab(t, p) {
  const v = p.vitals[p.vitals.length - 1];
  t.innerHTML = `<div class="card"><h3>Personal Information</h3>${kv(F.patientPersonal, p)}</div>
    <div class="card"><h3>Emergency Contact</h3>${kv(F.emergency, p)}</div><div class="card"><h3>Identification</h3>${kv(F.ident, p)}</div>
    <div class="card"><h3>Latest Vitals ${v && isCritical(v) ? '<span class="badge red">CRITICAL</span>' : ''}</h3>${v ? kv(LISTS.vitals.fields, v) : '<p class="muted">No vitals recorded.</p>'}</div>
    <div class="card"><h3>Allergies</h3>${p.allergies.length ? p.allergies.map(a => `<span class="badge red">${esc(a.type)}: ${esc(a.allergen)}</span> `).join('') : '<span class="muted">None recorded</span>'}</div>`;
}
function historyTab(t, p) {
  t.innerHTML = '<div id="h1"></div><div id="h2"></div><div id="h3"></div><div id="h4"></div>';
  singleForm($('#h1'), p, 'pastHistory', 'Past Medical History', 'edit');
  listSection($('#h2'), p, 'surgical');
  singleForm($('#h3'), p, 'familyHistory', 'Family History', 'edit');
  listSection($('#h4'), p, 'allergies');
}
function singleForm(t, p, key, title, perm) {
  const ro = !can(perm);
  t.innerHTML = `<form class="card"><h3>${title}</h3>${fieldsHTML(F[key], p[key])}${ro ? '' : '<p><button>Save</button></p>'}</form>`;
  if (ro) t.querySelectorAll('input,select,textarea').forEach(e => e.disabled = true);
  t.querySelector('form').onsubmit = e => { e.preventDefault(); p[key] = readForm(e.target); log('UPDATE_' + key.toUpperCase(), p.id, `${title} updated`); persist(); toast('Saved'); };
}
function listSection(t, p, key) {
  const c = LISTS[key], rows = p[key];
  const summary = r => c.fields.filter(f => r[f.k]).map(f => f.k === 'format' ? '' : `${esc(f.l.split(' (')[0])}: ${esc(r[f.k])}`).filter(Boolean);
  let body;
  if (!rows.length) body = '<p class="muted">No records yet.</p>';
  else if (c.cards) body = rows.map(r => {
    const groups = {}; c.fields.forEach(f => { if (r[f.k] && (!f.f || f.f === r.format)) (groups[f.g || ''] ||= []).push(f); });
    return `<div class="card" style="background:#fafcfd"><div class="bar"><b>${esc(r.date || '')} ${r.format ? `<span class="badge">${esc(r.format)}</span>` : ''} <small class="muted">by ${esc(r.by || '')}</small></b>${can(c.perm) ? `<button class="sm sec" data-rm="${r.id}">Remove</button>` : ''}</div>
      ${Object.entries(groups).map(([g, fs]) => `${g ? `<h4 style="margin:.5rem 0 .2rem">${esc(g)}</h4>` : ''}${kv(fs.filter(f => f.k !== 'date' && f.k !== 'format'), r)}`).join('')}</div>`;
  }).join('');
  else body = `<div class="tablewrap"><table><tr>${c.fields.map(f => `<th>${esc(f.l)}</th>`).join('')}<th></th></tr>${rows.map(r =>
    `<tr>${c.fields.map(f => `<td>${esc(r[f.k])}${key === 'vitals' && f.k === 'spo2' && r.spo2 !== '' && r.spo2 < 90 ? ' (Low)' : ''}</td>`).join('')}<td>${can(c.perm) ? `<button class="sm sec" data-rm="${r.id}">Remove</button>` : ''}</td></tr>`).join('')}</table></div>`;
  t.innerHTML = `<div class="card"><div class="bar"><h3 style="margin:0">${c.title}</h3>${can(c.perm) ? '<button id="addr">Add</button>' : ''}</div>${body}</div>`;
  t.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
    if (!confirm('Remove this record?')) return;
    p[key] = p[key].filter(r => r.id !== b.dataset.rm); log('REMOVE_' + key.toUpperCase(), p.id, `Removed record from ${c.title}`); persist(); rerender();
  });
  const ar = t.querySelector('#addr'); if (ar) ar.onclick = () => addRecord(p, key, rerender);
  function rerender() { state.tab === 'History' ? historyTab($('#tab'), p) : profileView($('#main')); }
}
function addRecord(p, key, done) {
  const c = LISTS[key], groups = [...new Set(c.fields.map(f => f.g || ''))];
  const defaults = { date: today(), format: 'SOAP' };
  const html = groups.map(g => `${g ? `<fieldset><legend>${esc(g)}</legend>` : ''}${fieldsHTML(c.fields.filter(f => (f.g || '') === g), defaults)}${g ? '</fieldset>' : ''}`).join('');
  const m = openModal(`<h2>Add — ${c.title}</h2><form id="rf">${html}<p><button>Save</button> <button type="button" class="sec" id="cx">Cancel</button></p></form>`);
  const f = $('#rf', m);
  const sync = () => { if (f.format) f.querySelectorAll('[data-f]').forEach(d => d.classList.toggle('hidden', d.dataset.f !== f.format.value)); };
  if (f.format) { f.format.onchange = sync; sync(); }
  $('#cx', m).onclick = closeModal;
  f.onsubmit = e => {
    e.preventDefault(); const d = readForm(f);
    if (d.format) c.fields.forEach(x => { if (x.f && x.f !== d.format) delete d[x.k]; });
    if (!Object.entries(d).some(([k, v]) => v && k !== 'date' && k !== 'format')) return toast('Please fill in at least one field');
    p[key].push({ id: uid(), ...d, by: state.user.name });
    log('ADD_' + key.toUpperCase(), p.id, `Added record to ${c.title}`); persist(); closeModal(); toast('Record added'); done();
  };
}

/* ---------- Delete ---------- */
function deletePatient(p) {
  if (!can('delete')) return toast('Only an Administrator can delete patients');
  const m = openModal(`<h2>Delete Patient</h2><p>Are you sure you want to delete this patient?</p><p><b>${esc(fullName(p))}</b> (${esc(p.id)})</p>
    <p class="muted">Administrator authorization required: type the patient ID <b>${esc(p.id)}</b> to confirm. This cannot be undone.</p>
    <form id="df"><input name="c" required autocomplete="off"><p><button class="danger">Delete</button> <button type="button" class="sec" id="cx">Cancel</button></p></form>`);
  $('#cx', m).onclick = closeModal;
  $('#df', m).onsubmit = e => {
    e.preventDefault();
    if (readForm(e.target).c !== p.id) return toast('ID does not match');
    log('DELETE_PATIENT', p.id, `Deleted ${fullName(p)} (authorized by ${state.user.email})`);
    state.patients = state.patients.filter(x => x.id !== p.id); persist(); closeModal(); toast('Patient deleted'); state.view = 'patients'; render();
  };
}

/* ---------- Audit log ---------- */
function auditView(el) {
  el.innerHTML = `<h1>Audit Log</h1><div class="card tablewrap"><table><tr><th>Date/Time</th><th>User</th><th>Action</th><th>Patient ID</th><th>Description</th></tr>
    ${state.audit.map(a => `<tr><td>${esc(a.time)}</td><td>${esc(a.user)}</td><td><span class="badge">${esc(a.action)}</span></td><td>${esc(a.pid)}</td><td>${esc(a.desc)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No entries.</td></tr>'}</table></div>`;
}

/* ---------- User management ---------- */
function usersView(el) {
  el.innerHTML = `<div class="bar"><h1>User Management</h1><button id="au">Add User</button></div><div class="card tablewrap"><table><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
    ${state.users.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td><span class="badge">${u.role}</span></td><td><span class="badge ${u.status === 'Active' ? 'grn' : 'org'}">${u.status}</span></td>
    <td class="actions"><button class="sm sec" data-e="${u.id}">Edit</button>${u.id !== state.user.id ? `<button class="sm danger" data-d="${u.id}">Remove</button>` : ''}</td></tr>`).join('')}</table></div>`;
  const form = u => {
    const m = openModal(`<h2>${u ? 'Edit' : 'Add'} User</h2><form id="uf">${fieldsHTML([{ k: 'name', l: 'Name', req: 1 }, { k: 'email', l: 'Email', t: 'email', req: 1 },
      { k: 'role', l: 'Role', t: 'select', o: ['Administrator', 'Instructor', 'Nurse', 'Student'], req: 1 }, { k: 'status', l: 'Status', t: 'select', o: ['Active', 'Inactive'] }], u || { status: 'Active' })}
      <div><label for="user-password">Password</label><div class="password-control"><input id="user-password" name="password" type="password" ${u ? '' : 'required'} placeholder="${u ? 'Leave blank to keep current password' : ''}"><button id="toggle-user-password" type="button" aria-label="Show password" aria-pressed="false">Show</button></div></div>
      <p><button>Save</button> <button type="button" class="sec" id="cx">Cancel</button></p></form>`);
    bindPasswordToggle($('#user-password', m), $('#toggle-user-password', m));
    $('#cx', m).onclick = closeModal;
    $('#uf', m).onsubmit = e => {
      e.preventDefault(); const d = readForm(e.target); const password = d.password; delete d.password; d.status ||= 'Active'; d.email = d.email.toLowerCase();
      if (state.users.some(x => x.email.toLowerCase() === d.email && x !== u)) return toast('Email already exists');
      if (u && u.id === state.user.id && (d.role !== u.role || d.status !== 'Active')) return toast('You cannot change your own role/status');
      if (u) { Object.assign(u, d); if (password) u.password = password; log('EDIT_USER', null, `Updated user ${d.email} (${d.role}, ${d.status})`); } else { state.users.push({ id: uid(), ...d, password }); log('ADD_USER', null, `Added user ${d.email} (${d.role})`); }
      persist(); closeModal(); usersView(el);
    };
  };
  $('#au').onclick = () => form();
  el.querySelectorAll('[data-e]').forEach(b => b.onclick = () => form(state.users.find(u => u.id === b.dataset.e)));
  el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
    const u = state.users.find(x => x.id === b.dataset.d); if (!confirm(`Remove ${u.email}?`)) return;
    state.users = state.users.filter(x => x !== u); log('REMOVE_USER', null, `Removed user ${u.email}`); persist(); usersView(el);
  });
}

/* ---------- Boot ---------- */
if (state.user?.authVersion === 2) {
  const u = state.users.find(x => x.id === state.user.id && x.status === 'Active');
  if (u) {
    const { password, ...sessionUser } = u;
    state.user = { ...sessionUser, authVersion: 2 };
  } else { state.user = null; localStorage.removeItem('npr_session'); }
} else { state.user = null; localStorage.removeItem('npr_session'); }
render();
