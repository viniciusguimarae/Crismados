// ============================================================
// CONFRARIA DOS CRISMADOS — certificate.js
// Lógica de elegibilidade e geração do certificado
// ============================================================

import { getCurrentMonthName, toDateString } from './dates.js';

/**
 * Verifica se um membro é elegível para o certificado do mês.
 * Condição: Ter participado de pelo menos 4 missas no mês.
 *
 * @param {string[]} attendedDates - datas 'YYYY-MM-DD' frequentadas
 * @returns {{ eligible: boolean, attended: number, total: number, remaining: number }}
 */
export function checkCertificateEligibility(attendedDates) {
  const target = 4;
  const attended = attendedDates.length;
  const eligible = attended >= target;
  const remaining = eligible ? 0 : target - attended;

  return { eligible, attended, total: target, remaining };
}

/**
 * Renderiza o certificado de um membro no container fornecido.
 * @param {HTMLElement} container
 * @param {object} member - { name }
 * @param {object} eligibility - resultado de checkCertificateEligibility
 */
export function renderCertificate(container, member, eligibility) {
  const monthName = getCurrentMonthName();
  // ex: "Maio de 2026" → "Maio" e "2026"
  const [monthWord, , yearWord] = monthName.split(' ');

  if (eligibility.eligible) {
    container.innerHTML = `
      <div class="certificate-unlocked visible">
        <div class="certificate">
          <div class="corner-crosses" aria-hidden="true"></div>
          <div class="certificate-content">
            <div class="certificate-seal">
              <span class="certificate-seal__symbol">✝</span>
            </div>

            <div class="certificate-title">Certificado de Perseverança</div>

            <div class="certificate-divider">
              <span class="certificate-divider__symbol">✦</span>
            </div>

            <p class="certificate-body">
              Certificamos que <strong>${member.name}</strong> participou fervorosamente de missas
              durante <strong>${monthWord} de ${yearWord}</strong>, permanecendo firme
              em sua caminhada de fé.
            </p>

            <div class="certificate-divider">
              <span class="certificate-divider__symbol">✦</span>
            </div>

            <p class="certificate-signature">— Confraria dos Crismados</p>

            <p class="certificate-verse">
              "Ide e fazei discípulos de todas as nações."<br>
              <em>— Mateus 28,19</em>
            </p>
          </div>
        </div>

        <div class="certificate-actions">
          <button class="btn-cert" id="btn-share-cert" aria-label="Compartilhar certificado">
            ⚜ Compartilhar
          </button>
          <button class="btn-cert" id="btn-save-cert" aria-label="Salvar certificado">
            ✦ Salvar
          </button>
        </div>
      </div>
    `;

    // Bind de ações
    document.getElementById('btn-share-cert')?.addEventListener('click', () =>
      shareCertificate(member, monthName)
    );
    document.getElementById('btn-save-cert')?.addEventListener('click', () =>
      saveCertificatePlaceholder()
    );

  } else {
    // Certificado bloqueado
    const msg = "Faltam " + eligibility.remaining + (eligibility.remaining === 1 ? ' missa' : ' missas') + " para completar o pergaminho de " + monthWord + ".";

    container.innerHTML = `
      <div class="certificate-locked">
        <div class="certificate-locked__icon">⛨</div>
        <div class="certificate-locked__title">Pergaminho Selado</div>
        <p class="certificate-locked__message">
          Complete pelo menos 4 missas no mês para desbloquear seu pergaminho.
        </p>
        <div class="certificate-locked__remaining">${msg}</div>
        <div class="certificate-locked__preview" style="position: relative;">
          <!-- Wax Seal -->
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; border-radius: 50%; background: #3d0d15; border: 2px solid var(--gold); display: flex; align-items: center; justify-content: center; z-index: 1;">
            <span style="color: var(--gold); font-size: 18px;">✝</span>
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Compartilha o certificado via Web Share API.
 * @param {object} member
 * @param {string} monthName
 */
async function shareCertificate(member, monthName) {
  const text = `✝ Certificado de Perseverança\n\n${member.name} completou suas missas de ${monthName}.\n\n— Confraria dos Crismados`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Certificado de Perseverança', text });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[Certificate] Falha ao compartilhar:', err);
      }
    }
  } else {
    // Fallback: copia para clipboard
    try {
      await navigator.clipboard.writeText(text);
      // Importa showToast dinamicamente para evitar dependência circular
      const { showToast } = await import('./animations.js');
      showToast('Texto copiado para a área de transferência.', 'success');
    } catch {
      alert(text);
    }
  }
}

/**
 * Placeholder para salvar certificado como imagem.
 * Futuramente integrar html2canvas.
 */
async function saveCertificatePlaceholder() {
  const { showToast } = await import('./animations.js');
  showToast('Em breve: salvar como imagem. Use "Compartilhar" por enquanto.', 'info', 4000);
  // TODO (v2): Integrar html2canvas para capturar .certificate e baixar PNG
}
