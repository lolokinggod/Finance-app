// —— data stores & defaults —— 
let users = JSON.parse(localStorage.getItem('mt_users') || '{}');
let current = localStorage.getItem('mt_current') || null;
let incs = [];
let exps = [];
let goal = parseFloat(localStorage.getItem('mt_goal')) || 6000;
let currency = localStorage.getItem('mt_currency') || '$';

// —— element refs —— 
const pages         = document.querySelectorAll('.page');
const navBtns       = document.querySelectorAll('nav button');
const savingsCircle = document.getElementById('savingsCircle');
const funCircle     = document.getElementById('funCircle');
const savingsText   = document.getElementById('savingsText');
const funText       = document.getElementById('funText');
const curSelect     = document.getElementById('currencySelect');
const dmToggle      = document.getElementById('darkModeToggle');
const goalInput     = document.getElementById('goalInput');

// —— page switcher —— 
navBtns.forEach(b => b.onclick = ()=>showPage(b.dataset.target));
function showPage(id){
  pages.forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// —— auth logic —— 
const loginForm = document.getElementById('loginForm');
const acctInfo  = document.getElementById('acctInfo');
const acctTitle = document.getElementById('acctTitle');
function updateAuthUI(){
  if(current && users[current]){
    loginForm.style.display='none';
    acctInfo.style.display='block';
    document.getElementById('acctUser').innerText = current;
    acctTitle.innerText = 'Account';
    loadData();
  } else {
    loginForm.style.display='flex';
    acctInfo.style.display='none';
    acctTitle.innerText = 'Login / Register';
  }
}
document.getElementById('loginBtn').onclick = ()=>{
  const u = document.getElementById('userName').value,
        p = document.getElementById('userPass').value;
  if(users[u]===p){ current=u; saveAuth(); updateAuthUI(); }
  else alert('Wrong creds');
};
document.getElementById('regBtn').onclick = ()=>{
  const u = document.getElementById('userName').value,
        p = document.getElementById('userPass').value;
  if(!u||!p) return;
  if(users[u]) return alert('User exists');
  users[u]=p; saveAuth(); alert('Registered! Log in');
};
document.getElementById('logoutBtn').onclick = ()=>{
  current=null; saveAuth(); updateAuthUI();
};
function saveAuth(){
  localStorage.setItem('mt_users', JSON.stringify(users));
  localStorage.setItem('mt_current', current);
}

// —— settings logic —— 
curSelect.onchange = ()=>{
  currency = curSelect.value;
  localStorage.setItem('mt_currency', currency);
  renderAll();
};
dmToggle.onchange = ()=>{
  document.body.classList.toggle('dark', dmToggle.checked);
  localStorage.setItem('mt_dark', dmToggle.checked);
  updateCircles(); // refresh chart styling in dark mode
};
goalInput.onchange = ()=>{
  const v = parseFloat(goalInput.value);
  if(!isNaN(v) && v>0){ 
    goal = v;
    localStorage.setItem('mt_goal', goal);
    renderAll();
  }
};

// —— load & save data —— 
function loadData(){
  incs      = JSON.parse(localStorage.getItem(`incs_${current}`)||'[]');
  exps      = JSON.parse(localStorage.getItem(`exps_${current}`)||'[]');
  currency  = localStorage.getItem('mt_currency')||'$';
  document.body.classList.toggle('dark', localStorage.getItem('mt_dark')==='true');
  curSelect.value = currency;
  goalInput.value  = goal;
  renderAll();
}
function saveData(){
  localStorage.setItem(`incs_${current}`, JSON.stringify(incs));
  localStorage.setItem(`exps_${current}`, JSON.stringify(exps));
}

// —— rendering —— 
function renderAll(){
  renderList('incList', incs);
  renderList('expList', exps);
  updateCircles();

  // Username
  document.getElementById('acctDisplay').textContent = '@' + current;

  // Totals
  const totalInc = incs.reduce((a,e)=>a+e.amount,0);
  const totalSaved = incs.reduce((a,e)=>a + e.amount*0.7,0);
  const totalSpent = exps.reduce((a,e)=>a + e.amount, 0);

  document.getElementById('totalSaved').textContent = currency + totalSaved.toFixed(2);
  document.getElementById('totalSpent').textContent = currency + totalSpent.toFixed(2);

  // Recent logs
  const lastIncomes = incs.slice(-5).reverse();
  const lastExpenses = exps.slice(-5).reverse();

  function renderMiniList(arr, targetId) {
    const ul = document.getElementById(targetId);
    ul.innerHTML = '';
    arr.forEach(e => {
      const li = document.createElement('li');
      li.textContent = `${e.date} • ${e.reason} • ${currency}${e.amount.toFixed(2)}`;
      ul.appendChild(li);
    });
  }

  renderMiniList(lastIncomes, 'lastIncomes');
  renderMiniList(lastExpenses, 'lastExpenses');
}

function renderList(listId, arr){
  const ul = document.getElementById(listId);
  ul.innerHTML = '';
  arr.forEach((e,i)=>{
    const li=document.createElement('li'),
          del=document.createElement('button');
    li.textContent = `${e.date||''} ${e.reason} ${currency}${e.amount.toFixed(2)}`;
    del.textContent='✖'; del.onclick=()=>{
      arr.splice(i,1); saveData(); renderAll();
    };
    li.appendChild(del); ul.appendChild(li);
  });
}

// —— donut updates —— 
function updateCircleProgress(circleEl, percent, color) {
  const dark = document.body.classList.contains('dark');
  const bgColor = dark ? '#444' : '#ddd';
  const deg = percent * 3.6;
  circleEl.style.background = `conic-gradient(${color} ${deg}deg, ${bgColor} ${deg}deg)`;
}

function updateCircles(){
  const totalInc = incs.reduce((a,e)=>a+e.amount,0);
  const saved    = incs.reduce((a,e)=>a + e.amount*0.7,0);
  const spentFun = exps.reduce((a,e)=>a+e.amount,0);
  const maxFun   = totalInc*0.3;

  const pctS = Math.min(saved/goal,1)*100;
  updateCircleProgress(savingsCircle, pctS, '#4CAF50');
  savingsText.textContent = pctS.toFixed(2)+'%';

  const remFun = Math.max(maxFun-spentFun,0);
  const pctF   = maxFun ? Math.min(remFun/maxFun,1)*100 : 0;
  updateCircleProgress(funCircle, pctF, '#FF9800');
  funText.textContent = pctF.toFixed(2)+'%';

  document.getElementById('savedAmountLabel').textContent = `${currency}${saved.toFixed(2)} saved`;
  document.getElementById('funAmountLabel').textContent = `${currency}${remFun.toFixed(2)} left`;
}

// —— add entry handlers —— 
document.getElementById('addIncBtn').onclick = ()=>{
  const d=document.getElementById('incDate').value,
        r=document.getElementById('incReason').value,
        a=parseFloat(document.getElementById('incAmount').value);
  if(!d||!r||isNaN(a)) return alert('Fill all fields');
  incs.push({date:d,reason:r,amount:a});
  saveData(); renderAll();
};
document.getElementById('addExpBtn').onclick = ()=>{
  const d=document.getElementById('expDate').value,
        r=document.getElementById('expReason').value,
        a=parseFloat(document.getElementById('expAmount').value);
  if(!d||!r||isNaN(a)) return alert('Fill all fields');
  exps.push({date:d,reason:r,amount:a});
  saveData(); renderAll();
};

// —— initialize UI —— 
showPage("incomePage");
updateAuthUI();