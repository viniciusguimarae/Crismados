// ============================================================
// CONFRARIA DOS CRISMADOS — animations.js
// Triggers de animação: velas, toast, todos presentes
// ============================================================

/**
 * Acende uma vela pelo índice (0-based) com animação.
 * @param {number} index - índice da vela no array
 */
export function lightCandle(index) {
  const wrappers = document.querySelectorAll('.candle-wrapper');
  const wrapper = wrappers[index];
  if (!wrapper) return;

  const candle = wrapper.querySelector('.candle');
  if (!candle || candle.classList.contains('candle--lit')) return;

  // Remove classe de não aceso e adiciona acendendo
  candle.classList.remove('candle--unlit');
  candle.classList.add('candle--lighting');

  // Após a animação de acendimento, muda para estado permanente aceso
  setTimeout(() => {
    candle.classList.remove('candle--lighting');
    candle.classList.add('candle--lit');
  }, 700);
}

/**
 * Atualiza todas as velas de acordo com os dados de presença.
 * @param {string[]} attendedDates - datas '2026-05-03' que o membro frequentou
 * @param {Date[]} allSundays - todos os domingos do mês
 * @param {boolean} todayIsCurrentSunday - se o domingo atual está nesta lista
 */
export function updateCandles(attendedDates, allSundays, currentSundayStr) {
  const wrappers = document.querySelectorAll('.candle-wrapper');

  allSundays.forEach((sunday, index) => {
    const dateStr = formatDateStr(sunday);
    const wrapper = wrappers[index];
    if (!wrapper) return;

    const candle = wrapper.querySelector('.candle');
    if (!candle) return;

    const isAttended = attendedDates.includes(dateStr);
    const isCurrent = dateStr === currentSundayStr;

    candle.classList.remove('candle--lit', 'candle--unlit', 'candle--current');

    if (isAttended) {
      candle.classList.add('candle--lit');
    } else {
      candle.classList.add('candle--unlit');
      if (isCurrent) candle.classList.add('candle--current');
    }
  });
}

/**
 * Exibe o toast de notificação.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration - ms antes de sumir
 */
export function showToast(message, type = 'info', duration = 3500) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  // Remove animações anteriores
  toast.classList.remove('toast--visible', 'toast--hiding', 'toast--success', 'toast--error');
  toast.textContent = message;

  if (type === 'success') toast.classList.add('toast--success');
  if (type === 'error')   toast.classList.add('toast--error');

  // Força reflow
  void toast.offsetWidth;
  toast.classList.add('toast--visible');

  clearTimeout(toast._hideTimeout);
  toast._hideTimeout = setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.classList.add('toast--hiding');
    setTimeout(() => {
      toast.classList.remove('toast--hiding');
    }, 400);
  }, duration);
}

/**
 * Dispara o efeito "Todos Presentes" — luz dourada + mensagem.
 */
export function triggerAllPresentEffect() {
  // Cria burst de luz
  const burst = document.createElement('div');
  burst.className = 'gold-burst';
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 2100);

  // Exibe mensagem de glória
  const gloryMsg = document.getElementById('glory-message');
  if (gloryMsg) {
    gloryMsg.classList.add('visible');
  }

  // Pulsa todos os orbs
  document.querySelectorAll('.orb').forEach((orb, i) => {
    setTimeout(() => {
      orb.classList.add('orb--present-all');
      orb.addEventListener('animationend', () => {
        orb.classList.remove('orb--present-all');
      }, { once: true });
    }, i * 120);
  });
}

/**
 * Anima a progress bar até a largura alvo.
 * @param {HTMLElement} fill - elemento da barra
 * @param {number} percentage - 0 a 100
 */
export function animateProgressBar(fill, percentage) {
  if (!fill) return;
  // Reseta para 0 antes de animar
  fill.style.width = '0%';
  // Força reflow
  void fill.offsetWidth;
  fill.style.transition = 'width 0.6s ease-out';
  fill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
}

/**
 * Aplica animação de entrada (fadeUp) em um elemento.
 * @param {HTMLElement} el
 * @param {number} delay - ms
 */
export function fadeInElement(el, delay = 0) {
  if (!el) return;
  el.style.opacity = '0';
  el.style.transform = 'translateY(10px)';
  el.style.transition = `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`;
  // Força reflow
  void el.offsetWidth;
  el.style.opacity = '1';
  el.style.transform = 'translateY(0)';
}

// ─── Helper interno ───────────────────────────────────────────

function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
