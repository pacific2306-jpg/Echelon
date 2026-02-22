/* --- STATE & DATA --- */
let habits = JSON.parse(localStorage.getItem('echelonHabits')) || [];
let habitData = JSON.parse(localStorage.getItem('echelonHabitData')) || {}; 
let vices = JSON.parse(localStorage.getItem('echelonVices')) || [];
let viceData = JSON.parse(localStorage.getItem('echelonViceData')) || {};
let apexData = JSON.parse(localStorage.getItem('echelonApex')) || { text: "", done: false };
let protocolData = JSON.parse(localStorage.getItem('echelonProtocol')) || Array(100).fill(false);
let protocolRules = JSON.parse(localStorage.getItem('echelonRules')) || ["Deep Work", "Training", "Clean Diet", "Reading"];
let protocolStart = localStorage.getItem('echelonProtocolStart') || null;
let journalData = JSON.parse(localStorage.getItem('echelonJournal')) || [];

// Freemium
let isPremium = localStorage.getItem('echelonSovereign') === 'true';
const UNLOCK_CODE = "ECHELON19";

// Time
const todayDate = new Date();
const currentDay = todayDate.getDate();
const daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
let currentMood = "😐";

// Audio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep(freq = 440, type = 'sine', dur = 0.1) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.value = freq;
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + dur);
    osc.stop(audioCtx.currentTime + dur);
}
const sfx = {
    click: () => playBeep(800, 'triangle', 0.05),
    success: () => { playBeep(440, 'sine', 0.1); setTimeout(() => playBeep(880, 'sine', 0.3), 100); },
    error: () => playBeep(150, 'sawtooth', 0.2),
    alarm: () => { playBeep(600, 'square', 0.2); setTimeout(() => playBeep(600, 'square', 0.2), 300); setTimeout(() => playBeep(600, 'square', 0.5), 600); },
    shutdown: () => playBeep(100, 'sine', 1)
};

// --- SYSTEM LOGS ---
function addSystemLog(msg) {
    const logList = document.getElementById('system-logs');
    if(!logList) return;
    const time = new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit'});
    const li = document.createElement('li'); li.className = 'log-entry';
    li.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    logList.prepend(li);
    if(logList.children.length > 50) logList.lastChild.remove();
}

/* --- INIT --- */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cinematic SVG Loader
    setTimeout(() => {
        const loader = document.getElementById('app-loader');
        if(loader) { 
            loader.style.opacity = '0'; 
            setTimeout(() => loader.style.display = 'none', 800); 
        }
        addSystemLog("Boot Sequence Complete.");
    }, 2500); 

    // 2. Spotlight Hover Effect
    const handleOnMouseMove = e => {
        const { currentTarget: target } = e;
        const rect = target.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
        target.style.setProperty("--mouse-x", `${x}px`); target.style.setProperty("--mouse-y", `${y}px`);
    }
    for(const card of document.querySelectorAll(".premium-card")) card.onmousemove = e => handleOnMouseMove(e);

    // 3. Init UI Data
    document.getElementById('current-date-display').textContent = todayDate.toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'}).toUpperCase();
    
    const name = localStorage.getItem('echelonUserName') || 'User';
    document.getElementById('nav-username').textContent = name;
    document.getElementById('settings-name').value = name;

    // Sovereign Directive Engine
    const directives = [
        { q: "We suffer more often in imagination than in reality.", a: "Seneca" },
        { q: "Discipline equals freedom.", a: "Jocko Willink" },
        { q: "You have power over your mind - not outside events.", a: "Marcus Aurelius" },
        { q: "First say to yourself what you would be; and then do what you have to do.", a: "Epictetus" }
    ];
    const todayDirective = directives[currentDay % directives.length];
    document.getElementById('daily-quote').textContent = `"${todayDirective.q}"`;
    document.getElementById('quote-author').textContent = `- ${todayDirective.a}`;

    // Apex Target Init
    const apexInp = document.getElementById('apex-input');
    const apexChk = document.getElementById('apex-checkbox');
    if(apexInp) {
        apexInp.value = apexData.text;
        if(apexData.done) { apexChk.classList.add('done'); apexInp.classList.add('done'); }
    }

    checkPremiumUI();
    renderMatrix();
    renderViceMatrix();
    updateTimerDisplay();
    renderJournal();
});

/* --- FREEMIUM --- */
function handleNavClick(tabId) {
    sfx.click();
    const isPremiumRequired = document.querySelector(`.nav-item[onclick="handleNavClick('${tabId}')"]`).hasAttribute('data-premium');
    if (isPremiumRequired && !isPremium) openModal('premium-modal');
    else switchTab(tabId);
}
function verifyLicense() {
    const input = document.getElementById('license-key');
    if(input.value.trim().toUpperCase() === UNLOCK_CODE) {
        sfx.success(); isPremium = true; localStorage.setItem('echelonSovereign', 'true');
        closeModal('premium-modal'); checkPremiumUI(); addSystemLog("Sovereign Status Unlocked.");
    } else { sfx.error(); input.value = ''; addSystemLog("Decryption Failed."); }
}
function checkPremiumUI() {
    if(isPremium) {
        document.querySelectorAll('.lock-icon').forEach(icon => icon.remove());
        const rankEl = document.getElementById('nav-rank');
        rankEl.textContent = 'SOVEREIGN';
        rankEl.style.color = 'var(--text-primary)';
        rankEl.style.fontWeight = '600';
    }
}

/* --- NAVIGATION --- */
function switchTab(id) {
    document.querySelectorAll('.view-section').forEach(e => e.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    
    const navBtn = document.querySelector(`.nav-item[onclick="handleNavClick('${id}')"]`);
    if(navBtn) navBtn.classList.add('active');

    const titleObj = document.getElementById('dynamic-title');
    const initBtn = document.getElementById('header-init-btn');
    const viceBtn = document.getElementById('header-vice-btn');
    
    if(id === 'dashboard') {
        titleObj.textContent = "Systemize the Mundane.";
        initBtn.style.display = 'block'; initBtn.style.opacity = '1';
        viceBtn.style.display = 'block'; viceBtn.style.opacity = '1';
    } else {
        initBtn.style.display = 'none'; viceBtn.style.display = 'none';
        if (id === 'protocol-view') titleObj.textContent = "Iron Mode Active.";
        else if (id === 'focus') titleObj.textContent = "Deep Work Session.";
        else if (id === 'intelligence-view') { titleObj.textContent = "System Metrics."; renderAnalytics(); }
        else if (id === 'manifesto-view') titleObj.textContent = "Daily Intentions.";
        else if (id === 'settings-view') titleObj.textContent = "System Parameters.";
    }
}

/* --- APEX TARGET --- */
function saveApex() {
    apexData.text = document.getElementById('apex-input').value;
    localStorage.setItem('echelonApex', JSON.stringify(apexData));
}
function toggleApex() {
    sfx.click();
    apexData.done = !apexData.done;
    const chk = document.getElementById('apex-checkbox');
    const inp = document.getElementById('apex-input');
    if(apexData.done) { chk.classList.add('done'); inp.classList.add('done'); addSystemLog("Apex Target Secured."); } 
    else { chk.classList.remove('done'); inp.classList.remove('done'); }
    saveApex();
}

/* --- MATRIX (HABITS) --- */
function addNewHabit() {
    const name = document.getElementById('new-habit-name').value.trim();
    if(name && !habits.includes(name)) {
        habits.push(name); habitData[name] = {};
        localStorage.setItem('echelonHabits', JSON.stringify(habits));
        localStorage.setItem('echelonHabitData', JSON.stringify(habitData));
        closeModal('add-habit-modal'); document.getElementById('new-habit-name').value = '';
        renderMatrix(); sfx.success(); addSystemLog(`Protocol Deployed: ${name}`);
    }
}
function renderMatrix() {
    const header = document.getElementById('matrix-days'); const body = document.getElementById('habit-list-body');
    const empty = document.getElementById('empty-state'); const container = document.getElementById('matrix-container');

    if(habits.length === 0) { empty.style.display = 'block'; container.style.display = 'none'; return; }
    else { empty.style.display = 'none'; container.style.display = 'block'; }

    header.innerHTML = '<th class="routine-col">ROUTINE</th>';
    for(let i=1; i<=daysInMonth; i++) header.innerHTML += `<th class="day-cell"><span class="day-number ${i===currentDay?'current-day':''}">${i}</span></th>`;

    body.innerHTML = '';
    habits.forEach((h, idx) => {
        let tr = `<tr class="matrix-row" style="--row-idx: ${idx}"><td class="routine-col">${h}</td>`;
        for(let i=1; i<=daysInMonth; i++) {
            const isChecked = habitData[h]?.[i] ? 'checked' : '';
            const isFuture = i > currentDay ? 'future' : '';
            tr += `<td class="day-cell"><div class="check-box ${isChecked} ${isFuture}" data-h="${h}" data-d="${i}"></div></td>`;
        }
        tr += `</tr>`; body.innerHTML += tr;
    });

    document.querySelectorAll('#habit-list-body .check-box:not(.future)').forEach(box => {
        box.addEventListener('click', function() {
            sfx.click(); this.classList.toggle('checked');
            const h = this.getAttribute('data-h'); const d = this.getAttribute('data-d');
            if(!habitData[h]) habitData[h] = {};
            if(this.classList.contains('checked')) { habitData[h][d] = true; addSystemLog(`Execution Logged: ${h}`); }
            else { delete habitData[h][d]; addSystemLog(`Execution Retracted: ${h}`); }
            
            localStorage.setItem('echelonHabitData', JSON.stringify(habitData));
            updateDashboardStats();
        });
    });
    updateDashboardStats();
}

/* --- VICE QUARANTINE --- */
function addNewVice() {
    const name = document.getElementById('new-vice-name').value.trim();
    if(name && !vices.includes(name)) {
        vices.push(name); viceData[name] = {};
        localStorage.setItem('echelonVices', JSON.stringify(vices));
        localStorage.setItem('echelonViceData', JSON.stringify(viceData));
        closeModal('add-vice-modal'); document.getElementById('new-vice-name').value = '';
        renderViceMatrix(); sfx.error(); addSystemLog(`Vice Quarantined: ${name}`);
    }
}
function renderViceMatrix() {
    const header = document.getElementById('vice-matrix-days'); const body = document.getElementById('vice-list-body');
    const empty = document.getElementById('vice-empty-state'); const container = document.getElementById('vice-matrix-container');

    if(vices.length === 0) { empty.style.display = 'block'; container.style.display = 'none'; return; }
    else { empty.style.display = 'none'; container.style.display = 'block'; }

    header.innerHTML = '<th class="routine-col text-red">AVOID</th>';
    for(let i=1; i<=daysInMonth; i++) header.innerHTML += `<th class="day-cell"><span class="day-number ${i===currentDay?'current-day':''}">${i}</span></th>`;

    body.innerHTML = '';
    vices.forEach((v, idx) => {
        let tr = `<tr class="matrix-row" style="--row-idx: ${idx}"><td class="routine-col text-red">${v}</td>`;
        for(let i=1; i<=daysInMonth; i++) {
            const isChecked = viceData[v]?.[i] ? 'checked' : '';
            const isFuture = i > currentDay ? 'future' : '';
            tr += `<td class="day-cell"><div class="check-box vice-check ${isChecked} ${isFuture}" data-v="${v}" data-d="${i}"></div></td>`;
        }
        tr += `</tr>`; body.innerHTML += tr;
    });

    document.querySelectorAll('.vice-check:not(.future)').forEach(box => {
        box.addEventListener('click', function() {
            sfx.error(); this.classList.toggle('checked');
            const v = this.getAttribute('data-v'); const d = this.getAttribute('data-d');
            if(!viceData[v]) viceData[v] = {};
            if(this.classList.contains('checked')) { viceData[v][d] = true; addSystemLog(`Quarantine Breach: ${v}`); }
            else { delete viceData[v][d]; }
            localStorage.setItem('echelonViceData', JSON.stringify(viceData));
        });
    });
}

function updateDashboardStats() {
    let doneToday = 0; let totalChecks = 0;
    habits.forEach(h => { if(habitData[h]?.[currentDay]) doneToday++; totalChecks += Object.keys(habitData[h] || {}).length; });
    const pct = habits.length ? Math.round((doneToday / habits.length) * 100) : 0;
    document.getElementById('completion-rate').textContent = pct;
    document.getElementById('completion-bar').style.width = `${pct}%`;
    document.getElementById('streak-display').textContent = totalChecks;
    checkSeals(totalChecks);
}

/* --- ZENITH MODE (Deep Focus) --- */
let isZenith = false;
function toggleZenithMode() {
    sfx.click();
    isZenith = !isZenith;
    const exitBtn = document.getElementById('exit-zenith-btn');
    
    if(isZenith) {
        document.body.classList.add('zenith-active');
        switchTab('focus');
        if(exitBtn) exitBtn.style.display = 'block';
        addSystemLog("Zenith Mode Activated.");
    } else {
        document.body.classList.remove('zenith-active');
        if(exitBtn) exitBtn.style.display = 'none';
        addSystemLog("Zenith Mode Deactivated.");
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isZenith) toggleZenithMode();
});

/* --- EOD SHUTDOWN SEQUENCE --- */
function initiateShutdown() {
    sfx.shutdown();
    const modal = document.getElementById('shutdown-sequence');
    modal.classList.add('active');
    document.getElementById('shutdown-title').textContent = "INITIATING END OF DAY PROTOCOL...";
    document.getElementById('shutdown-step-1').style.display = 'block';
    document.getElementById('shutdown-step-2').style.display = 'none';
    document.getElementById('shutdown-step-3').style.display = 'none';
    clearInterval(tInt); tRun = false; updateTimerDisplay();
}

function nextShutdownStep(step) {
    sfx.click();
    if(step === 2) {
        document.getElementById('shutdown-step-1').style.display = 'none';
        document.getElementById('shutdown-step-2').style.display = 'block';
        document.getElementById('tomorrow-apex').focus();
    } else if (step === 3) {
        const tmrw = document.getElementById('tomorrow-apex').value.trim();
        if(tmrw) { apexData.text = tmrw; apexData.done = false; localStorage.setItem('echelonApex', JSON.stringify(apexData)); }
        
        document.getElementById('shutdown-title').style.display = 'none';
        document.getElementById('shutdown-step-2').style.display = 'none';
        document.getElementById('shutdown-step-3').style.display = 'block';
        
        setTimeout(() => { location.reload(); }, 3000);
    }
}

/* --- SOVEREIGN SEALS --- */
function checkSeals(total) {
    const seal30 = document.getElementById('seal-30');
    const seal60 = document.getElementById('seal-60');
    const seal90 = document.getElementById('seal-90');
    if(seal30 && total >= 30) seal30.classList.add('unlocked');
    if(seal60 && total >= 60) seal60.classList.add('unlocked');
    if(seal90 && total >= 90) seal90.classList.add('unlocked');
}

/* --- ANALYTICS --- */
let mChart, yChart, tChart;
function renderAnalytics() {
    let totalChecks = 0; habits.forEach(h => { totalChecks += Object.keys(habitData[h] || {}).length; });
    const mPct = habits.length ? Math.min(100, Math.round((totalChecks / (habits.length * currentDay)) * 100)) : 0;
    const yPct = Math.round(mPct * 0.4); 

    document.getElementById('month-percent-text').textContent = mPct + "%";
    document.getElementById('year-percent-text').textContent = yPct + "%";

    if(mChart) mChart.destroy(); if(yChart) yChart.destroy(); if(tChart) tChart.destroy();
    Chart.defaults.color = '#8b839e'; Chart.defaults.font.family = 'Inter';

    const config = (pct, color) => ({ type: 'doughnut', data: { datasets: [{ data: [pct, 100-pct], backgroundColor: [color, 'rgba(255,255,255,0.05)'], borderWidth:0 }] }, options: { cutout: '85%', responsive: true, maintainAspectRatio: false } });
    mChart = new Chart(document.getElementById('monthCircle'), config(mPct, '#805ad5'));
    yChart = new Chart(document.getElementById('yearCircle'), config(yPct, '#f8f8f8'));

    let last7 = [];
    for(let i=6; i>=0; i--) {
        let d = currentDay - i;
        if(d > 0) {
            let done = 0; habits.forEach(h => { if(habitData[h]?.[d]) done++; });
            last7.push(habits.length ? Math.round((done/habits.length)*100) : 0);
        } else last7.push(0);
    }
    
    const ctxT = document.getElementById('trendChartCanvas').getContext('2d');
    let grad = ctxT.createLinearGradient(0,0,0,200); grad.addColorStop(0, 'rgba(128,90,213,0.4)'); grad.addColorStop(1, 'transparent');
    tChart = new Chart(ctxT, { 
        type: 'line', 
        data: { labels: ['-6','-5','-4','-3','-2','-1','Today'], datasets: [{ label: 'Score', data: last7, borderColor: '#805ad5', backgroundColor: grad, fill: true, tension: 0.4, borderWidth: 2 }] },
        options: { plugins:{legend:false}, scales:{x:{display:false},y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.05)'}}}, responsive: true, maintainAspectRatio: false }
    });

    const hm = document.getElementById('heatmap-grid'); hm.innerHTML = '';
    for(let i=27; i>=0; i--) {
        let d = currentDay - i; const box = document.createElement('div'); box.className = 'heat-box';
        if(d > 0) {
            let done = 0; habits.forEach(h => { if(habitData[h]?.[d]) done++; });
            let p = habits.length ? done/habits.length : 0;
            if(p > 0.8) box.style.background = '#f8f8f8'; else if(p > 0.4) box.style.background = '#805ad5'; else if(p > 0) box.style.background = 'rgba(128,90,213,0.3)';
        }
        hm.appendChild(box);
    }
    addSystemLog("Intelligence Metrics Synced.");
}

/* --- PROTOCOL 100 --- */
function renderProtocol100() {
    const grid = document.getElementById('protocol-grid'); grid.innerHTML = ''; let streak = 0;
    const start = protocolStart ? new Date(protocolStart) : null;
    const todayIdx = start ? Math.floor((todayDate - start) / (1000*60*60*24)) : -1;

    for(let i=0; i<100; i++) {
        const div = document.createElement('div'); div.textContent = i+1;
        if(protocolData[i]) { div.className = "protocol-box done"; streak++; }
        else {
            if(start && i < todayIdx) div.className = "protocol-box missed";
            else if(start && i > todayIdx) div.className = "protocol-box locked";
            else { div.className = "protocol-box"; if(start && i===todayIdx) div.style.borderColor = "#fff"; }
        }
        
        div.onclick = () => {
            if(!start && i===0) { if(confirm("Initiate Iron Mode Protocol?")) { localStorage.setItem('echelonProtocolStart', todayDate.toISOString()); location.reload(); } }
            else if(i === todayIdx) { sfx.success(); protocolData[i] = !protocolData[i]; localStorage.setItem('echelonProtocol', JSON.stringify(protocolData)); addSystemLog("Iron Mode Day Logged."); renderProtocol100(); }
            else if(start && i < todayIdx) { sfx.error(); alert("Protocol compromised."); }
        };
        grid.appendChild(div);
    }
    document.getElementById('protocol-count').textContent = streak;
    const rList = document.getElementById('protocol-rules-list'); rList.innerHTML = '';
    protocolRules.forEach(r => rList.innerHTML += `<li>${r}</li>`);
}
function saveProtocolRules() {
    const r = [1,2,3,4].map(i => document.getElementById(`rule-${i}`).value).filter(Boolean);
    if(r.length) { protocolRules = r; localStorage.setItem('echelonRules', JSON.stringify(protocolRules)); renderProtocol100(); closeModal('protocol-modal'); sfx.success(); }
}

/* --- FOCUS TIMER --- */
let tInt, tTime = 25*60, tTot = 25*60, tRun = false;
function setTimer(m) { sfx.click(); clearInterval(tInt); tRun = false; tTime = m*60; tTot = m*60; updateTimerDisplay(); const b = document.getElementById('timer-btn'); b.textContent = "ENGAGE SYSTEM"; b.style.background = "transparent"; b.style.color = "#fff"; }
function toggleTimer() {
    sfx.click(); const b = document.getElementById('timer-btn');
    if(tRun) { clearInterval(tInt); tRun = false; b.textContent = "RESUME"; b.style.background = "transparent"; b.style.color = "#fff"; document.getElementById('focus-status').textContent = "PAUSED"; addSystemLog("Timer Paused."); }
    else {
        tRun = true; b.textContent = "HALT"; b.style.background = "#fff"; b.style.color = "#000"; document.getElementById('focus-status').textContent = "ACTIVE"; addSystemLog("Focus Engaged.");
        tInt = setInterval(() => {
            if(tTime > 0) { tTime--; updateTimerDisplay(); } else { clearInterval(tInt); tRun = false; sfx.alarm(); b.textContent = "CYCLE COMPLETE"; b.style.background = "var(--accent-violet)"; b.style.borderColor = "var(--accent-violet)"; b.style.color = "#fff"; document.getElementById('focus-status').textContent = "STANDBY"; addSystemLog("Focus Cycle Complete."); }
        }, 1000);
    }
}
function updateTimerDisplay() {
    document.getElementById('timer-display').textContent = `${Math.floor(tTime/60).toString().padStart(2,'0')}:${(tTime%60).toString().padStart(2,'0')}`;
    document.getElementById('timer-progress').style.strokeDashoffset = 880 - (tTime/tTot)*880;
}

/* --- MANIFESTO --- */
function setMood(m) { currentMood = m; sfx.click(); document.querySelectorAll('.mood-selectors button').forEach(b => b.classList.remove('active')); event.currentTarget.classList.add('active'); }
function saveJournalEntry() {
    const text = document.getElementById('journal-input').value.trim();
    if(text) {
        journalData.unshift({date: todayDate.toLocaleDateString('en-US',{month:'short',day:'numeric'}).toUpperCase(), mood: currentMood, text: text});
        localStorage.setItem('echelonJournal', JSON.stringify(journalData)); document.getElementById('journal-input').value = '';
        renderJournal(); sfx.success(); addSystemLog("Manifesto Entry Sealed.");
    }
}
function renderJournal() {
    const list = document.getElementById('journal-list'); list.innerHTML = journalData.length ? '' : '<div class="empty-state-box">Archive Empty</div>';
    journalData.forEach(e => { list.innerHTML += `<div class="archive-entry"><div class="archive-date">${e.date} ${e.mood}</div><div>${e.text}</div></div>`; });
}

/* --- UTILS --- */
function openModal(id) { sfx.click(); document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function saveSettings() { const n = document.getElementById('settings-name').value; if(n) localStorage.setItem('echelonUserName', n); sfx.success(); location.reload(); }
function resetAllData() { if(confirm("Irreversible action. Proceed?")) { localStorage.clear(); location.reload(); } }
function exportData() { const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({habits, habitData, vices, viceData, protocolData, journalData, apexData})); const n = document.createElement('a'); n.href = str; n.download = "echelon_state.json"; document.body.appendChild(n); n.click(); n.remove(); }