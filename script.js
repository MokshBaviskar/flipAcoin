/* ============================================================
   ROYAL TOSS — Game Logic
   ============================================================ */

// ── State ──────────────────────────────────────────────────
const state = {
  p1: { name: '', score: 0 },
  p2: { name: '', score: 0 },
  round: 1,
  maxScore: 3,
  p1Choice: null,      // 'heads' | 'tails'
  coinResult: null,    // 'heads' | 'tails'
  flipping: false,
  gameOver: false,
};

// ── DOM refs ───────────────────────────────────────────────
const screens = {
  setup:  document.getElementById('screen-setup'),
  game:   document.getElementById('screen-game'),
  winner: document.getElementById('screen-winner'),
};

const el = {
  p1Input:         document.getElementById('p1-name'),
  p2Input:         document.getElementById('p2-name'),
  p1DisplayName:   document.getElementById('p1-display-name'),
  p2DisplayName:   document.getElementById('p2-display-name'),
  p1Avatar:        document.getElementById('p1-avatar'),
  p2Avatar:        document.getElementById('p2-avatar'),
  p1ScoreVal:      document.getElementById('p1-score-val'),
  p2ScoreVal:      document.getElementById('p2-score-val'),
  roundNum:        document.getElementById('round-num'),
  coin:            document.getElementById('coin'),
  coinShadow:      document.getElementById('coin-shadow'),
  resultBanner:    document.getElementById('result-banner'),
  resultText:      document.getElementById('result-text'),
  resultWinner:    document.getElementById('result-winner'),
  resultIcon:      document.getElementById('result-icon'),
  pickerName:      document.getElementById('picker-name'),
  flipStatusText:  document.getElementById('flip-status-text'),
  stepPick:        document.getElementById('step-pick'),
  stepFlip:        document.getElementById('step-flip'),
  stepNext:        document.getElementById('step-next'),
  btnHeads:        document.getElementById('btn-heads'),
  btnTails:        document.getElementById('btn-tails'),
  btnNext:         document.getElementById('btn-next'),
  winnerName:      document.getElementById('winner-name'),
  winnerSub:       document.getElementById('winner-sub'),
  finalP1Name:     document.getElementById('final-p1-name'),
  finalP2Name:     document.getElementById('final-p2-name'),
  finalP1Score:    document.getElementById('final-p1-score'),
  finalP2Score:    document.getElementById('final-p2-score'),
  p1ScoreBlock:    document.getElementById('p1-score-block'),
  p2ScoreBlock:    document.getElementById('p2-score-block'),
};

// ── Audio (optional subtle tick) ───────────────────────────
function createFlipSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  } catch { return null; }
}

function playTick(ctx, delay = 0) {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime + delay);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + delay + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.14);
  } catch { /* silent fail */ }
}

function playWinSound(ctx) {
  if (!ctx) return;
  try {
    [0, 0.15, 0.3, 0.5].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      const notes = [523, 659, 784, 1047];
      osc.frequency.setValueAtTime(notes[i], ctx.currentTime + t);
      gain.gain.setValueAtTime(0.1, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.28);
    });
  } catch { /* silent fail */ }
}

let audioCtx = null;

// ── Screen Management ──────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ── Special Twist (hidden) ─────────────────────────────────
// Returns 'heads' | 'tails' — rigged if needed
function determineCoinResult(p1Name, p2Name, p1Choice, p1Score, p2Score) {
  const max = state.maxScore;

  // 🔥 FORCE 2–2 for first 4 rounds
  if (p1Score + p2Score < 4) {
    // alternate wins
    if ((p1Score + p2Score) % 2 === 0) {
      // Player 1 wins → coin = their choice
      return p1Choice;
    } else {
      // Player 2 wins → coin = opposite
      return p1Choice === 'heads' ? 'tails' : 'heads';
    }
  }

  // 🔥 FINAL ROUND (2–2 situation)
  const deciding = (p1Score === 2 && p2Score === 2);

  if (deciding) {
    const p1IsRigged = p1Name.toLowerCase() === 'chinmay';
    const p2IsRigged = p2Name.toLowerCase() === 'chinmay';

    if (p1IsRigged && !p2IsRigged) {
      return p1Choice === 'heads' ? 'tails' : 'heads';
    }
    if (p2IsRigged && !p1IsRigged) {
      return p1Choice;
    }
  }

  // fallback random (just safety)
  return Math.random() < 0.5 ? 'heads' : 'tails';
}

// ── STEP 1: Start game ─────────────────────────────────────
function startGame() {
  const name1 = el.p1Input.value.trim();
  const name2 = el.p2Input.value.trim();

  if (!name1 || !name2) {
    shakeInvalid(!name1 ? el.p1Input : el.p2Input);
    return;
  }

  state.p1.name  = name1;
  state.p2.name  = name2;
  state.p1.score = 0;
  state.p2.score = 0;
  state.round    = 1;
  state.gameOver = false;

  // Init audio on user gesture
  if (!audioCtx) audioCtx = createFlipSound();

  updateGameUI();
  showScreen('game');
  resetCoinVisual('heads');
  showStep('pick');
  hideResultBanner();
}

function shakeInvalid(inputEl) {
  inputEl.style.animation = 'none';
  inputEl.style.borderColor = '#E8A020';
  inputEl.style.boxShadow = '0 0 0 3px rgba(232,160,32,0.2)';
  inputEl.focus();
  setTimeout(() => {
    inputEl.style.borderColor = '';
    inputEl.style.boxShadow = '';
  }, 1200);
}

// ── STEP 2: Player 1 picks a side ─────────────────────────
function pickSide(choice) {
  if (state.flipping) return;
  state.p1Choice = choice;

  showStep('flip');
  el.flipStatusText.textContent = `${state.p1.name} chose ${choice.charAt(0).toUpperCase() + choice.slice(1)} — flipping…`;

  // Short delay so UI updates render before animation
  setTimeout(() => flipCoin(choice), 120);
}

// ── STEP 3: Flip coin ──────────────────────────────────────
function flipCoin(p1Choice) {
  if (state.flipping) return;
  state.flipping = true;

  // Determine result (potentially rigged at deciding round)
  const result = determineCoinResult(
    state.p1.name, state.p2.name,
    p1Choice,
    state.p1.score, state.p2.score
  );
  state.coinResult = result;

  // Play tick sounds during flip
  if (audioCtx) {
    for (let i = 0; i < 12; i++) {
      playTick(audioCtx, i * 0.17);
    }
  }

  // Start CSS flip animation
  const coin = el.coin;
  const shadow = el.coinShadow;
  coin.classList.remove('flipping');
  shadow.classList.remove('flipping');

  // Force reflow to reset animation
  void coin.offsetWidth;

  coin.classList.add('flipping');
  shadow.classList.add('flipping');

  // After animation, resolve result
  setTimeout(() => {
    coin.classList.remove('flipping');
    shadow.classList.remove('flipping');

    // Lock coin to show correct face
    resetCoinVisual(result);

    state.flipping = false;
    resolveRound(result);
  }, 2250);
}

// ── STEP 4: Resolve round ──────────────────────────────────
function resolveRound(result) {
  const p1Won = (state.p1Choice === result);

  if (p1Won) {
    state.p1.score++;
    animateScore(el.p1ScoreVal, state.p1.score);
    highlightWinnerCard('p1');
  } else {
    state.p2.score++;
    animateScore(el.p2ScoreVal, state.p2.score);
    highlightWinnerCard('p2');
  }

  const roundWinnerName = p1Won ? state.p1.name : state.p2.name;
  showResultBanner(result, roundWinnerName);

  // Check match winner
  if (state.p1.score >= state.maxScore || state.p2.score >= state.maxScore) {
    state.gameOver = true;
    if (audioCtx) playWinSound(audioCtx);
    el.btnNext.textContent = ''; // will be replaced by winner screen
    showStep('next');
    el.btnNext.textContent = 'See the Champion 🏆';
    el.btnNext.onclick = showWinnerScreen;
  } else {
    state.round++;
    el.roundNum.textContent = state.round;
    showStep('next');
    el.btnNext.textContent = 'Next Round →';
    el.btnNext.onclick = nextRound;
  }
}

// ── Next round ─────────────────────────────────────────────
function nextRound() {
  hideResultBanner();
  resetCoinVisual('heads');
  el.pickerName.textContent = state.p1.name;
  showStep('pick');
}

// ── Winner screen ──────────────────────────────────────────
function showWinnerScreen() {
  const p1Won = state.p1.score >= state.maxScore;
  const winner = p1Won ? state.p1 : state.p2;
  const loser  = p1Won ? state.p2 : state.p1;

  el.winnerName.textContent  = winner.name;
  el.winnerSub.textContent   = 'Wins the Royal Toss!';
  el.finalP1Name.textContent = state.p1.name;
  el.finalP2Name.textContent = state.p2.name;
  el.finalP1Score.textContent = state.p1.score;
  el.finalP2Score.textContent = state.p2.score;

  showScreen('winner');
}

// ── Restart ────────────────────────────────────────────────
function restartGame() {
  // Reset inputs
  el.p1Input.value = '';
  el.p2Input.value = '';

  // Reset state
  state.p1.score = 0;
  state.p2.score = 0;
  state.round    = 1;
  state.gameOver = false;
  state.flipping = false;
  state.p1Choice = null;
  state.coinResult = null;

  showScreen('setup');
}

// ── Helpers ────────────────────────────────────────────────
function updateGameUI() {
  el.p1DisplayName.textContent = state.p1.name;
  el.p2DisplayName.textContent = state.p2.name;
  el.p1Avatar.textContent = getInitials(state.p1.name);
  el.p2Avatar.textContent = getInitials(state.p2.name);
  el.p1ScoreVal.textContent = state.p1.score;
  el.p2ScoreVal.textContent = state.p2.score;
  el.roundNum.textContent = state.round;
  el.pickerName.textContent = state.p1.name;
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function showStep(step) {
  el.stepPick.classList.add('hidden');
  el.stepFlip.classList.add('hidden');
  el.stepNext.classList.add('hidden');

  if (step === 'pick') {
    el.stepPick.classList.remove('hidden');
    el.btnHeads.disabled = false;
    el.btnTails.disabled = false;
  } else if (step === 'flip') {
    el.stepFlip.classList.remove('hidden');
    el.btnHeads.disabled = true;
    el.btnTails.disabled = true;
  } else if (step === 'next') {
    el.stepNext.classList.remove('hidden');
  }
}

function showResultBanner(result, winnerName) {
  el.resultIcon.textContent = result === 'heads' ? '♔' : '✦';
  el.resultText.textContent = result === 'heads' ? "It's Heads!" : "It's Tails!";
  el.resultWinner.textContent = `${winnerName} wins this round!`;
  el.resultBanner.classList.add('show');
}

function hideResultBanner() {
  el.resultBanner.classList.remove('show');
}

function resetCoinVisual(face) {
  // Snap coin to show the requested face without animation
  const coin = el.coin;
  coin.style.transition = 'none';
  if (face === 'heads') {
    coin.style.transform = 'rotateY(0deg)';
  } else {
    coin.style.transform = 'rotateY(180deg)';
  }
  // Re-enable transition after repaint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      coin.style.transition = '';
    });
  });
}

function animateScore(el, val) {
  el.textContent = val;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
  setTimeout(() => el.classList.remove('pop'), 500);
}

function highlightWinnerCard(player) {
  el.p1ScoreBlock.classList.remove('active-player');
  el.p2ScoreBlock.classList.remove('active-player');
  if (player === 'p1') el.p1ScoreBlock.classList.add('active-player');
  else el.p2ScoreBlock.classList.add('active-player');
}

// ── Keyboard: Enter on setup inputs ────────────────────────
[el.p1Input, el.p2Input].forEach(input => {
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') startGame();
  });
});
