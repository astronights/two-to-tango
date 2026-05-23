'use strict';

const SUN = 1, MOON = 2, EMPTY = 0, SIZE = 6;

const DIFFICULTIES = {
  easy:   { revealed: 14, numConstraints: 4 },
  medium: { revealed: 8,  numConstraints: 7 },
  hard:   { revealed: 4,  numConstraints: 10 },
};

// ── Utilities ──────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Grid Rules ─────────────────────────────────────────────────────────────

function isValidCell(grid, r, c, val, size) {
  // Count: at most size/2 of same value per row/col
  let rc = 0, cc = 0;
  for (let i = 0; i < size; i++) {
    if (grid[r][i] === val) rc++;
    if (grid[i][c] === val) cc++;
  }
  if (rc >= size / 2 || cc >= size / 2) return false;

  // No 3 consecutive in row (check windows touching c)
  for (let s = Math.max(0, c - 2); s <= Math.min(size - 3, c); s++) {
    const v = [0, 1, 2].map(d => s + d === c ? val : grid[r][s + d]);
    if (v[0] !== EMPTY && v[0] === v[1] && v[1] === v[2]) return false;
  }
  // No 3 consecutive in col
  for (let s = Math.max(0, r - 2); s <= Math.min(size - 3, r); s++) {
    const v = [0, 1, 2].map(d => s + d === r ? val : grid[s + d][c]);
    if (v[0] !== EMPTY && v[0] === v[1] && v[1] === v[2]) return false;
  }

  return true;
}

function isValidWithConstraints(grid, r, c, val, cmap, size) {
  if (!isValidCell(grid, r, c, val, size)) return false;
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
    const type = cmap[`${r},${c},${nr},${nc}`];
    if (!type) continue;
    const nv = grid[nr][nc];
    if (nv === EMPTY) continue;
    if (type === '=' && nv !== val) return false;
    if (type === 'x' && nv === val) return false;
  }
  return true;
}

// ── Puzzle Generation ──────────────────────────────────────────────────────

function generateSolution(size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(EMPTY));
  function solve(pos) {
    if (pos === size * size) return true;
    const r = Math.floor(pos / size), c = pos % size;
    for (const val of shuffle([SUN, MOON])) {
      if (isValidCell(grid, r, c, val, size)) {
        grid[r][c] = val;
        if (solve(pos + 1)) return true;
        grid[r][c] = EMPTY;
      }
    }
    return false;
  }
  solve(0);
  return grid;
}

function buildCmap(constraints) {
  const m = {};
  for (const { r1, c1, r2, c2, type } of constraints) {
    m[`${r1},${c1},${r2},${c2}`] = type;
    m[`${r2},${c2},${r1},${c1}`] = type;
  }
  return m;
}

function countSolutions(size, clueGrid, constraints, limit = 2) {
  const grid = clueGrid.map(row => [...row]);
  const cmap = buildCmap(constraints);
  let count = 0;
  const deadline = Date.now() + 400;

  function solve(pos) {
    if (count >= limit || Date.now() > deadline) return;
    while (pos < size * size && grid[Math.floor(pos / size)][pos % size] !== EMPTY) pos++;
    if (pos >= size * size) { count++; return; }
    const r = Math.floor(pos / size), c = pos % size;
    for (const val of [SUN, MOON]) {
      if (isValidWithConstraints(grid, r, c, val, cmap, size)) {
        grid[r][c] = val;
        solve(pos + 1);
        grid[r][c] = EMPTY;
      }
    }
  }

  solve(0);
  return count;
}

function generatePuzzle(difficulty) {
  const size = SIZE;
  const { revealed, numConstraints } = DIFFICULTIES[difficulty];

  for (let attempt = 0; attempt < 20; attempt++) {
    const solution = generateSolution(size);

    // Candidate adjacency pairs
    const pairs = shuffle([
      ...Array.from({ length: size }, (_, r) =>
        Array.from({ length: size - 1 }, (_, c) => [r, c, r, c + 1])
      ).flat(),
      ...Array.from({ length: size - 1 }, (_, r) =>
        Array.from({ length: size }, (_, c) => [r, c, r + 1, c])
      ).flat(),
    ]);

    const constraints = pairs.slice(0, numConstraints).map(([r1, c1, r2, c2]) => ({
      r1, c1, r2, c2,
      type: solution[r1][c1] === solution[r2][c2] ? '=' : 'x',
    }));

    // Greedy removal: start full, remove cells while keeping uniqueness
    const clueGrid = solution.map(row => [...row]);
    const cells = shuffle(
      Array.from({ length: size }, (_, r) =>
        Array.from({ length: size }, (_, c) => [r, c])
      ).flat()
    );

    let removed = 0;
    const target = size * size - revealed;
    for (const [r, c] of cells) {
      if (removed >= target) break;
      const saved = clueGrid[r][c];
      clueGrid[r][c] = EMPTY;
      if (countSolutions(size, clueGrid, constraints) !== 1) {
        clueGrid[r][c] = saved;
      } else {
        removed++;
      }
    }

    if (countSolutions(size, clueGrid, constraints) === 1) {
      return {
        size, solution, constraints,
        clueGrid,
        clues: clueGrid.map(row => row.map(v => v !== EMPTY)),
      };
    }
  }

  // Fallback: show more clues
  const solution = generateSolution(size);
  return {
    size, solution, constraints: [],
    clueGrid: solution.map(row => [...row]),
    clues: solution.map(row => row.map(() => true)),
  };
}

// ── Timer ──────────────────────────────────────────────────────────────────

let timerInterval = null;
let timerSeconds = 0;

function startTimer() {
  clearInterval(timerInterval);
  timerSeconds = 0;
  updateTimer();
  timerInterval = setInterval(() => { timerSeconds++; updateTimer(); }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function updateTimer() {
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  document.getElementById('timer').textContent = `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Solve History ──────────────────────────────────────────────────────────

const HISTORY_KEY = 'tango-history';
const HISTORY_MAX = 5;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveToHistory(difficulty, seconds) {
  const hist = loadHistory();
  hist.unshift({ diff: difficulty[0].toUpperCase(), seconds });
  if (hist.length > HISTORY_MAX) hist.length = HISTORY_MAX;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
}

function renderHistory() {
  const hist = loadHistory();
  const el = document.getElementById('history');
  if (!hist.length) { el.className = 'history hidden'; return; }
  el.className = 'history';
  el.innerHTML = `
    <div class="history-label">Last ${hist.length} solve${hist.length !== 1 ? 's' : ''}</div>
    <div class="history-times">
      ${hist.map(({ diff, seconds }) =>
        `<div class="history-item"><span class="diff-tag">${diff}</span>${formatTime(seconds)}</div>`
      ).join('')}
    </div>`;
}

// ── Theme ──────────────────────────────────────────────────────────────────

const SUN_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="4" fill="currentColor"/>
  <g stroke="currentColor" stroke-width="1.75" stroke-linecap="round">
    <line x1="12" y1="3"    x2="12" y2="5.5"/>
    <line x1="12" y1="18.5" x2="12" y2="21"/>
    <line x1="3"  y1="12"   x2="5.5" y2="12"/>
    <line x1="18.5" y1="12" x2="21" y2="12"/>
    <line x1="5.64" y1="5.64"   x2="7.4" y2="7.4"/>
    <line x1="16.6" y1="16.6"   x2="18.36" y2="18.36"/>
    <line x1="5.64" y1="18.36"  x2="7.4"   y2="16.6"/>
    <line x1="16.6" y1="7.4"    x2="18.36" y2="5.64"/>
  </g>
</svg>`;

const MOON_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
</svg>`;

function isDarkMode() {
  const t = document.documentElement.dataset.theme;
  if (t) return t === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme() {
  const dark = isDarkMode();
  document.getElementById('theme-btn').innerHTML = dark ? SUN_ICON : MOON_ICON;
  document.getElementById('theme-color-meta').content = dark ? '#0d0d1f' : '#f7f8ff';
}

function toggleTheme() {
  const next = isDarkMode() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('tango-theme', next);
  applyTheme();
}

function initTheme() {
  const saved = localStorage.getItem('tango-theme');
  if (saved) document.documentElement.dataset.theme = saved;
  applyTheme();
}

// ── Game State ─────────────────────────────────────────────────────────────

const state = {
  size: SIZE,
  grid: [],
  solution: [],
  clues: [],
  constraints: [],
  cmap: {},
  difficulty: 'medium',
  errors: new Set(),
  constraintErrors: new Set(),
  won: false,
};

function newGame(startTimerNow = true) {
  showMessage('Generating…', false);
  setTimeout(() => {
    const puzzle = generatePuzzle(state.difficulty);
    state.size = puzzle.size;
    state.solution = puzzle.solution;
    state.clues = puzzle.clues;
    state.constraints = puzzle.constraints;
    state.cmap = buildCmap(puzzle.constraints);
    state.grid = puzzle.clueGrid.map(row => [...row]);
    state.errors = new Set();
    state.constraintErrors = new Set();
    state.won = false;
    hideMessage();
    render();
    if (startTimerNow) {
      startTimer();
    } else {
      stopTimer();
      timerSeconds = 0;
      updateTimer();
    }
  }, 30);
}

function handleCellClick(r, c) {
  if (state.clues[r][c] || state.won) return;
  const cur = state.grid[r][c];
  state.grid[r][c] = cur === EMPTY ? SUN : cur === SUN ? MOON : EMPTY;
  validateAndRender();
}

function validateAndRender() {
  findErrors();
  render();
  if (isComplete() && state.errors.size === 0 && state.constraintErrors.size === 0) {
    state.won = true;
    stopTimer();
    saveToHistory(state.difficulty, timerSeconds);
    render();
    renderHistory();
    setTimeout(() => showMessage(`Solved in ${formatTime(timerSeconds)}!`, true), 80);
  }
}

function isComplete() {
  for (let r = 0; r < state.size; r++)
    for (let c = 0; c < state.size; c++)
      if (state.grid[r][c] === EMPTY) return false;
  return true;
}

function findErrors() {
  const { grid, size, constraints } = state;
  const errs = new Set();
  const cerrs = new Set();

  for (let r = 0; r < size; r++) {
    if (!grid[r].every(v => v !== EMPTY)) continue;
    const sunR = grid[r].filter(v => v === SUN).length;
    const moonR = grid[r].filter(v => v === MOON).length;
    if (sunR > size / 2 || moonR > size / 2)
      grid[r].forEach((v, c) => errs.add(`${r},${c}`));
    for (let c = 0; c <= size - 3; c++) {
      if (grid[r][c] === grid[r][c+1] && grid[r][c] === grid[r][c+2]) {
        errs.add(`${r},${c}`); errs.add(`${r},${c+1}`); errs.add(`${r},${c+2}`);
      }
    }
  }

  for (let c = 0; c < size; c++) {
    const col = grid.map(row => row[c]);
    if (!col.every(v => v !== EMPTY)) continue;
    const sunC = col.filter(v => v === SUN).length;
    const moonC = col.filter(v => v === MOON).length;
    if (sunC > size / 2 || moonC > size / 2)
      col.forEach((v, r) => errs.add(`${r},${c}`));
    for (let r = 0; r <= size - 3; r++) {
      if (col[r] === col[r+1] && col[r] === col[r+2]) {
        errs.add(`${r},${c}`); errs.add(`${r+1},${c}`); errs.add(`${r+2},${c}`);
      }
    }
  }

  for (let i = 0; i < constraints.length; i++) {
    const { r1, c1, r2, c2, type } = constraints[i];
    const v1 = grid[r1][c1], v2 = grid[r2][c2];
    if (v1 !== EMPTY && v2 !== EMPTY) {
      if ((type === '=' && v1 !== v2) || (type === 'x' && v1 === v2)) {
        errs.add(`${r1},${c1}`); errs.add(`${r2},${c2}`);
        cerrs.add(i);
      }
    }
  }

  state.errors = errs;
  state.constraintErrors = cerrs;
}

// ── SVG Icons ──────────────────────────────────────────────────────────────

const SUN_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label="Sun">
  <circle cx="12" cy="12" r="4.5" fill="#FBBF24"/>
  <g stroke="#FBBF24" stroke-width="2" stroke-linecap="round">
    <line x1="12" y1="2"    x2="12" y2="5"/>
    <line x1="12" y1="19"   x2="12" y2="22"/>
    <line x1="2"  y1="12"   x2="5"  y2="12"/>
    <line x1="19" y1="12"   x2="22" y2="12"/>
    <line x1="4.93" y1="4.93"   x2="7.05" y2="7.05"/>
    <line x1="16.95" y1="16.95" x2="19.07" y2="19.07"/>
    <line x1="4.93"  y1="19.07" x2="7.05"  y2="16.95"/>
    <line x1="16.95" y1="7.05"  x2="19.07" y2="4.93"/>
  </g>
</svg>`;

const MOON_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label="Moon">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#94a3b8"/>
</svg>`;

// ── Render ─────────────────────────────────────────────────────────────────

function cellSize() {
  const avail = Math.min(window.innerWidth - 16, 480);
  const gapRatio = 0.22;
  const sz = SIZE;
  return Math.min(76, Math.floor(avail / (sz + (sz - 1) * gapRatio)));
}

function render() {
  const { grid, size, clues, constraints, errors, constraintErrors, won } = state;
  const container = document.getElementById('grid');
  container.innerHTML = '';

  const cs = cellSize();
  const gs = Math.max(14, Math.floor(cs * 0.28));

  // Build CSS grid template: cell gap cell gap … cell
  const tpl = Array.from({ length: size * 2 - 1 }, (_, i) =>
    i % 2 === 0 ? `${cs}px` : `${gs}px`
  ).join(' ');
  container.style.gridTemplateColumns = tpl;
  container.style.gridTemplateRows = tpl;
  container.classList.toggle('won', won);

  // Cells
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.gridRow = `${2 * r + 1}`;
      cell.style.gridColumn = `${2 * c + 1}`;
      cell.dataset.r = r;
      cell.dataset.c = c;

      const val = grid[r][c];
      if (val === SUN)  { cell.dataset.value = 'sun';  cell.innerHTML = SUN_SVG; }
      if (val === MOON) { cell.dataset.value = 'moon'; cell.innerHTML = MOON_SVG; }
      if (clues[r][c]) cell.classList.add('clue');
      if (errors.has(`${r},${c}`)) cell.classList.add('error');

      container.appendChild(cell);
    }
  }

  // Constraint markers
  constraints.forEach(({ r1, c1, r2, c2, type }, i) => {
    const slot = document.createElement('div');
    const horiz = r1 === r2;
    slot.className = `cmarker ${horiz ? 'ch' : 'cv'}`;
    slot.textContent = type === '=' ? '=' : '×';
    slot.style.gridRow    = horiz ? `${2 * r1 + 1}` : `${2 * r1 + 2}`;
    slot.style.gridColumn = horiz ? `${2 * c1 + 2}` : `${2 * c1 + 1}`;
    if (constraintErrors.has(i)) slot.classList.add('error');
    container.appendChild(slot);
  });
}

// ── Messages ───────────────────────────────────────────────────────────────

function formatTime(s) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function showMessage(text, success) {
  const el = document.getElementById('message');
  el.textContent = text;
  el.className = success ? 'success' : 'info';
}

function hideMessage() {
  const el = document.getElementById('message');
  el.className = 'hidden';
}

// ── Init ───────────────────────────────────────────────────────────────────

function init() {
  initTheme();
  document.getElementById('theme-btn').addEventListener('click', toggleTheme);
  document.getElementById('new-game').addEventListener('click', newGame);

  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.diff === state.difficulty) return;
      state.difficulty = btn.dataset.diff;
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      newGame();
    });
  });

  document.getElementById('grid').addEventListener('click', e => {
    const cell = e.target.closest('.cell[data-r]');
    if (!cell) return;
    handleCellClick(+cell.dataset.r, +cell.dataset.c);
  });

  window.addEventListener('resize', render);

  renderHistory();
  newGame(false);
}

document.addEventListener('DOMContentLoaded', init);
