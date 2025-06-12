// 🌐——— Persistent Data & Defaults ———
let users    = JSON.parse(localStorage.getItem('mt_users') || '{}');
let current  = localStorage.getItem('mt_current') || null;
let incs     = [];
let exps     = [];
let goal     = parseFloat(localStorage.getItem('mt_goal')) || 6000;
let currency = localStorage.getItem('mt_currency') || '$';

// 🌈——— Element Refs ———
const $ = id => document.getElementById(id);
const pages         = document.querySelectorAll('.page');
const navBtns       = document.querySelectorAll('nav button');
const savingsCircle = $('savingsCircle');
const funCircle     = $('funCircle');
const savingsText   = $('savingsText');
const funText       = $('funText');
const curSelect     = $('currencySelect');
const dmToggle      = $('darkModeToggle');
const goalInput     = $('goalInput');

// 📱——— Page Switching ———
navBtns.forEach(b => b.onclick = () => showPage(b.dataset.target));
const showPage = id => {
  pages.forEach(p => p.classList.remove('active'));
  $(id).classList.add('active');
};

// 🔐——— Auth Logic ———
const loginForm = $('loginForm');
const acctInfo  = $('acctInfo');
const acctTitle = $('acctTitle');

const updateAuthUI = user => {
  if (user) {
    loginForm.style.display = 'none';
    acctInfo.style.display  = 'block';
    acctTitle.textContent   = 'Account';
    $('acctDisplay').textContent = '@' + user.email.split('@')[0];
    loadData();
  } else {
    loginForm.style.display = 'flex';
    acctInfo.style.display  = 'none';
    acctTitle.textContent   = 'Login / Register';
  }
};

// 👉 Login / Register / Logout
$('loginBtn').onclick = () => {
  const email = $('userName').value;
  const pass  = $('userPass').value;
  firebase.auth().signInWithEmailAndPassword(email, pass)
    .catch(err => alert(err.message));
};

$('regBtn').onclick = () => {
  const email = $('userName').value;
  const pass  = $('userPass').value;
  firebase.auth().createUserWithEmailAndPassword(email, pass)
    .then(() => alert('✅ Registered! Now log in.'))
    .catch(err => alert(err.message));
};

$('logoutBtn').onclick = () => firebase.auth().signOut();

// 🔄 Auth State
firebase.auth().onAuthStateChanged(user => {
  current = user?.uid || null;
  localStorage.setItem('mt_current', current || '');
  updateAuthUI(user);
});

// ⚙️——— Settings ———
curSelect.onchange = () => {
  currency = curSelect.value;
  localStorage.setItem('mt_currency', currency);
  renderAll();
};

dmToggle.onchange = () => {
  const isDark = dmToggle.checked;
  document.body.classList.toggle('dark', isDark);
  localStorage.setItem('mt_dark', isDark);
  updateCircles();
};

goalInput.onchange = () => {
  const v = parseFloat(goalInput.value);
  if (!isNaN(v) && v > 0) {
    goal = v;
    localStorage.setItem('mt_goal', goal);
    renderAll();
  }
};

// ☁️——— Load Data From Firestore ———
const loadData = () => {
  const userRef = db.collection("users").doc(current);

  Promise.all([
    userRef.collection("incomes").get(),
    userRef.collection("expenses").get()
  ])
  .then(([incSnap, expSnap]) => {
    incs = incSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    exps = expSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderAll();
  })
  .catch(err => console.error("🔥 Load error:", err));

  currency = localStorage.getItem('mt_currency') || '$';
  document.body.classList.toggle('dark', localStorage.getItem('mt_dark') === 'true');
  curSelect.value = currency;
  goalInput.value = goal;
};

// 📊——— Render Everything ———
const renderAll = () => {
  renderList('incList', incs);
  renderList('expList', exps);
  updateCircles();

  $('acctDisplay').textContent = '@' + current;

  const totalInc   = incs.reduce((a, e) => a + e.amount, 0);
  const totalSaved = incs.reduce((a, e) => a + e.amount * 0.7, 0);
  const totalSpent = exps.reduce((a, e) => a + e.amount, 0);

  $('totalSaved').textContent = currency + totalSaved.toFixed(2);
  $('totalSpent').textContent = currency + totalSpent.toFixed(2);

  renderMiniList(incs, 'lastIncomes');
  renderMiniList(exps, 'lastExpenses');
};

const renderMiniList = (arr, targetId) => {
  const ul = $(targetId);
  ul.innerHTML = '';
  arr.slice(-5).reverse().forEach(e => {
    const li = document.createElement('li');
    li.textContent = `${e.date} • ${e.reason} • ${currency}${e.amount.toFixed(2)}`;
    ul.appendChild(li);
  });
};

// 📜——— Full Logs with Edit & Delete ———
const renderList = (listId, arr) => {
  const ul = $(listId);
  ul.innerHTML = '';

  arr.forEach((e, i) => {
    const li = document.createElement('li');
    li.className = 'log-item';

    const text = document.createElement('span');
    text.className = 'log-text';
    text.textContent = `${e.date} ${e.reason} ${currency}${e.amount.toFixed(2)}`;

    const btns = document.createElement('span');
    btns.className = 'log-buttons';

    const edit = document.createElement('button');
    edit.className = 'edit-btn';
    edit.textContent = '✏️';
    edit.onclick = () => {
      const reason = prompt("New reason:", e.reason);
      const amount = parseFloat(prompt("New amount:", e.amount));
      const date   = prompt("New date (YYYY-MM-DD):", e.date);

      if (!reason || isNaN(amount) || !date) return;

      const updated = { reason, amount, date };
      const col = listId === 'incList' ? 'incomes' : 'expenses';

      db.collection("users").doc(current).collection(col).doc(e.id).update(updated)
        .then(() => {
          arr[i] = { ...arr[i], ...updated };
          renderAll();
        })
        .catch(err => alert("❌ Update error: " + err.message));
    };

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.textContent = '✖';
    del.onclick = () => {
      const col = listId === 'incList' ? 'incomes' : 'expenses';

      db.collection("users").doc(current).collection(col).doc(e.id).delete()
        .then(() => {
          arr.splice(i, 1);
          renderAll();
        })
        .catch(err => alert("❌ Delete error: " + err.message));
    };

    btns.append(edit, del);
    li.append(text, btns);
    ul.appendChild(li);
  });
};

// 🍩——— Donut Charts ———
const updateCircleProgress = (el, pct, color) => {
  const deg = pct * 3.6;
  const bg = document.body.classList.contains('dark') ? '#444' : '#ddd';
  el.style.background = `conic-gradient(${color} ${deg}deg, ${bg} ${deg}deg)`;
};

const updateCircles = () => {
  const totalInc = incs.reduce((a,e)=>a+e.amount,0);
  const saved    = incs.reduce((a,e)=>a+e.amount*0.7,0);
  const spentFun = exps.reduce((a,e)=>a+e.amount,0);
  const maxFun   = totalInc * 0.3;

  const pctSaved = Math.min(saved / goal, 1) * 100;
  updateCircleProgress(savingsCircle, pctSaved, '#4CAF50');
  savingsText.textContent = pctSaved.toFixed(2) + '%';

  const funLeft = Math.max(maxFun - spentFun, 0);
  const pctFun  = maxFun ? (funLeft / maxFun) * 100 : 0;
  updateCircleProgress(funCircle, pctFun, '#FF9800');
  funText.textContent = pctFun.toFixed(2) + '%';

  $('savedAmountLabel').textContent = `${currency}${saved.toFixed(2)} saved`;
  $('funAmountLabel').textContent   = `${currency}${funLeft.toFixed(2)} left`;
};

// ➕——— Add Entry (Income / Expense) ———
const addEntry = (type) => {
  const d = $(type + 'Date').value;
  const r = $(type + 'Reason').value;
  const a = parseFloat($(type + 'Amount').value);

  if (!d || !r || isNaN(a)) return alert('Fill all fields');

  const entry = { date: d, reason: r, amount: a };
  const col   = type === 'inc' ? 'incomes' : 'expenses';
  const list  = type === 'inc' ? incs : exps;

  db.collection("users").doc(current).collection(col).add(entry)
    .then(docRef => {
      entry.id = docRef.id;
      list.push(entry);
      renderAll();
    })
    .catch(err => alert(`❌ ${type === 'inc' ? 'Income' : 'Expense'} save error: ` + err.message));
};

$('addIncBtn').onclick = () => addEntry('inc');
$('addExpBtn').onclick = () => addEntry('exp');

// 🚀——— Init ———
document.addEventListener('DOMContentLoaded', () => showPage('incomePage'));