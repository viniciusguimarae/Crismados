// ============================================================
// CONFRARIA DOS CRISMADOS — certificate.js
// Lógica de elegibilidade e geração do certificado
// ============================================================

import { getCurrentMonthName, toDateString } from './dates.js';

/**
 * Verifica se um membro é elegível para o certificado do mês.
 * Condição: todos os domingos do mês já passaram E o membro frequentou todos.
 *
 * @param {string[]} attendedDates - datas '2026-05-03' frequentadas
 * @param {Date[]} allSundays - todos os domingos do mês
 * @returns {{ eligible: boolean, attended: number, total: number, remaining: number }}
 */
export function checkCertificateEligibility(attendedDates, allSundays) {
  const today = new Date();
  const todayStr = toDateString(today);

  // Apenas domingos que já passaram contam
  const pastSundays = allSundays.filter(s => toDateString(s) <= todayStr);
  const total = allSundays.length;
  const pastTotal = pastSundays.length;

  const attended = pastSundays.filter(s => attendedDates.includes(toDateString(s))).length;

  // Mês completo = todos os domingos passaram e membro foi em todos
  const monthComplete = pastTotal === total;
  const eligible = monthComplete && attended === total;

  const remaining = total - attended;

  return { eligible, attended, total, pastTotal, remaining, monthComplete };
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
          <div class="certificate-content">
            <div class="certificate-seal">
              <span class="certificate-seal__symbol">✝</span>
            </div>

            <div class="certificate-title">Certificado de Perseverança</div>

            <div class="certificate-divider">
              <span class="certificate-divider__symbol">✦</span>
            </div>

            <p class="certificate-body">
              Certificamos que <strong>${member.name}</strong> participou de todas as
              missas dominicais de ${monthWord} de ${yearWord}, permanecendo firme
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
    const remaining = eligibility.total - eligibility.attended;
    const pastRemaining = eligibility.total - eligibility.pastTotal;

    const msg = eligibility.monthComplete
      ? `Faltam ${remaining} ${remaining === 1 ? 'missa' : 'missas'} para completar ${monthWord}.`
      : `Faltam ${pastRemaining} ${pastRemaining === 1 ? 'domingo' : 'domingos'} para completar ${monthWord}.`;

    container.innerHTML = `
      <div class="certificate-locked">
        <div class="certificate-locked__icon">⛨</div>
        <div class="certificate-locked__title">Pergaminho Selado</div>
        <p class="certificate-locked__message">
          Complete todas as missas do mês para desbloquear seu pergaminho.
        </p>
        <div class="certificate-locked__remaining">${msg}</div>
        <div class="certificate-locked__preview"></div>
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
  const text = `✝ Certificado de Perseverança\n\n${member.name} participou de todas as missas dominicais de ${monthName}.\n\n— Confraria dos Crismados`;

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
