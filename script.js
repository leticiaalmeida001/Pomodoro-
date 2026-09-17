/* ============================================
   CONFIGURAÇÕES PADRÃO
   ============================================ */
const DEFAULT_TIMES = {
    focus: 25 * 60,
    short: 5  * 60,
    long:  15 * 60
};

const LABELS = {
    focus: 'Foco',
    short: 'Pausa Curta',
    long:  'Pausa Longa'
};

/* ============================================
   ESTADO
   ============================================ */
let currentMode = 'focus';
let timeLeft = DEFAULT_TIMES.focus;
let totalTime = DEFAULT_TIMES.focus;
let isRunning = false;
let timerInterval = null;
let pomodoroCount = 0;
let totalFocusTime = 0;

const customTimes = { ...DEFAULT_TIMES };

/* ============================================
   DOM
   ============================================ */
const body            = document.body;
const timerEl         = document.getElementById('timer');
const progressEl      = document.getElementById('timerProgress');
const timeEl          = document.getElementById('time');
const labelEl         = document.getElementById('label');
const startBtn        = document.getElementById('startBtn');
const pauseBtn        = document.getElementById('pauseBtn');
const resetBtn        = document.getElementById('resetBtn');
const applyBtn        = document.getElementById('applyBtn');
const customInput     = document.getElementById('customInput');
const toast           = document.getElementById('toast');
const pomodoroCountEl = document.getElementById('pomodoroCount');
const totalTimeEl     = document.getElementById('totalTime');
const modeBtns        = document.querySelectorAll('.mode');

/* ============================================
   UTILITÁRIOS
   ============================================ */
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 3500);
}

function updateStats() {
    pomodoroCountEl.textContent = pomodoroCount;
    const h = Math.floor(totalFocusTime / 3600);
    const m = Math.floor((totalFocusTime % 3600) / 60);
    totalTimeEl.textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/* ============================================
   RENDER
   ============================================ */
function updateDisplay() {
    timeEl.textContent = formatTime(timeLeft);
    labelEl.textContent = LABELS[currentMode];

    const progress = totalTime > 0 ? timeLeft / totalTime : 0;
    const angle = progress * 360;

    const colorVar =
        currentMode === 'focus' ? 'var(--accent-focus)' :
        currentMode === 'short' ? 'var(--accent-short)' :
                                  'var(--accent-long)';

    progressEl.style.background = `conic-gradient(
        ${colorVar} ${angle}deg,
        transparent ${angle}deg
    )`;

    document.title = `${formatTime(timeLeft)} · ${LABELS[currentMode]}`;
}

/* ============================================
   TROCA DE MODO
   ============================================ */
function switchMode(mode) {
    if (isRunning) {
        if (!confirm('O timer está rodando. Trocar de modo mesmo assim?')) return;
        stopTimer();
    }

    currentMode = mode;
    timeLeft = customTimes[mode];
    totalTime = customTimes[mode];

    modeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    body.className = `mode-${mode}`;
    timerEl.dataset.mode = mode;

    updateDisplay();
}

/* ============================================
   TIMER
   ============================================ */
function startTimer() {
    if (isRunning || timeLeft <= 0) return;

    isRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;

    timerInterval = setInterval(() => {
        timeLeft--;
        updateDisplay();

        if (timeLeft <= 0) {
            finishTimer();
        }
    }, 1000);
}

function pauseTimer() {
    if (!isRunning) return;
    isRunning = false;
    clearInterval(timerInterval);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

function stopTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

function resetTimer() {
    stopTimer();
    timeLeft = customTimes[currentMode];
    totalTime = customTimes[currentMode];
    updateDisplay();
}

function finishTimer() {
    stopTimer();
    playAlarm();

    if (currentMode === 'focus') {
        pomodoroCount++;
        totalFocusTime += customTimes.focus;
        updateStats();
        showToast('🎉 Foco concluído! Hora de uma pausa.');

        if (pomodoroCount % 4 === 0) {
            switchMode('long');
        } else {
            switchMode('short');
        }
    } else {
        showToast('☕ Pausa concluída! Vamos focar.');
        switchMode('focus');
    }
}

/* ============================================
   ALARME (Web Audio API)
   ============================================ */
function playAlarm() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();

        const beep = (freq, start, dur) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.25, start + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

            osc.start(start);
            osc.stop(start + dur);
        };

        const t = ctx.currentTime;

        beep(880, t,          0.25);
        beep(1046.5, t + 0.25, 0.25);
        beep(1318.5, t + 0.50, 0.45);

        beep(880, t + 1.2,    0.25);
        beep(1046.5, t + 1.45, 0.25);
        beep(1318.5, t + 1.70, 0.55);
    } catch (err) {
        console.warn('Falha ao tocar som:', err);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
}

/* ============================================
   TEMPO PERSONALIZADO
   ============================================ */
function applyCustomTime() {
    const value = parseInt(customInput.value, 10);

    if (isNaN(value) || value < 1 || value > 120) {
        showToast('Digite um valor entre 1 e 120 minutos.');
        return;
    }

    const seconds = value * 60;
    customTimes[currentMode] = seconds;

    if (!isRunning) {
        timeLeft = seconds;
        totalTime = seconds;
        updateDisplay();
    }

    showToast(`⏱ ${LABELS[currentMode]}: ${value} min definidos.`);
    customInput.value = '';
}

/* ============================================
   EVENTOS
   ============================================ */
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
applyBtn.addEventListener('click', applyCustomTime);

customInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyCustomTime();
});

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.dataset.mode === currentMode) return;
        switchMode(btn.dataset.mode);
    });
});

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    if (e.code === 'Space') {
        e.preventDefault();
        isRunning ? pauseTimer() : startTimer();
    }
    if (e.code === 'KeyR') resetTimer();
});

/* ============================================
   INICIALIZAÇÃO
   ============================================ */
body.classList.add('mode-focus');
updateDisplay();
updateStats();