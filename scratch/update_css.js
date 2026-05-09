const fs = require('fs');

// Modify candles-row to wrap
let css = fs.readFileSync('css/components.css', 'utf-8');
css = css.replace(
  /\.candles-row \{\s*display: flex;\s*align-items: flex-end;\s*justify-content: center;\s*gap: 18px;\s*\}/g,
  '.candles-row { display: flex; align-items: flex-end; justify-content: center; gap: 18px; flex-wrap: wrap; }'
);

// Append new styles
const newStyles = `

/* ─── MODAL DE REGISTRO ─────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(14, 11, 10, 0.85);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.modal-overlay:not(.hidden) {
  opacity: 1;
  pointer-events: auto;
}

.modal-content {
  background: var(--stone);
  border: var(--border-gold-subtle);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 400px;
  padding: var(--space-lg);
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  transform: translateY(20px);
  transition: transform 0.3s ease;
}

.modal-overlay:not(.hidden) .modal-content {
  transform: translateY(0);
}

.chips-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.chip {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--cream-dim);
  padding: 6px 12px;
  border-radius: 20px;
  font-family: var(--font-body);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip--active {
  background: rgba(201, 168, 76, 0.15);
  border-color: var(--gold);
  color: var(--gold);
}

.btn-cancel {
  display: block;
  width: 100%;
  padding: 12px;
  margin-top: 8px;
  background: transparent;
  border: none;
  color: var(--cream-dim);
  font-family: var(--font-body);
  font-size: 14px;
  text-align: center;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: rgba(255, 255, 255, 0.1);
}

/* ─── HISTÓRICO PESSOAL (Cards) ─────────────────────────────── */
.history-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(201, 168, 76, 0.1);
  border-radius: var(--radius-sm);
  padding: var(--space-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-card__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-card__date {
  font-family: var(--font-display);
  color: var(--gold);
  font-size: 15px;
}

.history-card__meta {
  font-family: var(--font-body);
  color: var(--cream-dim);
  font-size: 12px;
}

.history-card__edit {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-family: var(--font-body);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.2s;
}

.history-card__edit:hover {
  color: var(--gold);
  background: rgba(255, 255, 255, 0.05);
}
`;

fs.writeFileSync('css/components.css', css + newStyles, 'utf-8');
