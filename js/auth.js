// ============================================================
// CONFRARIA DOS CRISMADOS — auth.js
// Módulo de autenticação: login, cadastro, sessão
// ============================================================

import {
  signIn, signUp, signOut, getSession,
  getMemberByAuthId, linkAuthToMember,
} from './supabase.js';
import { showToast } from './animations.js';

// ─── ESTADO INTERNO ───────────────────────────────────────────

let _onAuthSuccess = null; // callback(member) quando auth OK

// ─── INICIALIZAÇÃO ────────────────────────────────────────────

/**
 * Verifica sessão existente ao carregar o app.
 * @param {Function} onSuccess - callback(member) chamado se já autenticado
 * @returns {Promise<boolean>} true se já havia sessão
 */
export async function initAuth(onSuccess) {
  _onAuthSuccess = onSuccess;

  const { session, error } = await getSession();
  if (session?.user) {
    const { data: member, error: memberError } = await getMemberByAuthId(session.user.id);
    if (member) {
      onSuccess(member);
      return true;
    }
  }
  return false;
}

// ─── RENDERIZAÇÃO DA TELA DE AUTH ─────────────────────────────

/**
 * Renderiza a tela de login/cadastro no container fornecido.
 * @param {HTMLElement} container
 */
export function renderAuthScreen(container) {
  container.innerHTML = `
    <div class="auth-emblem" aria-hidden="true">✝</div>

    <h1 class="entry-title">Confraria<br>dos Crismados</h1>
    <p class="entry-subtitle">Acesse sua conta</p>

    <div class="ornamental-divider" aria-hidden="true">
      <span class="ornamental-divider__symbol">✦</span>
    </div>

    <!-- Toggle de abas -->
    <div class="auth-tabs" role="tablist" aria-label="Modo de acesso">
      <button
        class="auth-tab auth-tab--active"
        id="tab-btn-entrar"
        role="tab"
        aria-selected="true"
        aria-controls="auth-form-entrar"
      >Entrar</button>
      <button
        class="auth-tab"
        id="tab-btn-criar"
        role="tab"
        aria-selected="false"
        aria-controls="auth-form-criar"
      >Criar conta</button>
    </div>

    <!-- Formulário: Entrar -->
    <form id="auth-form-entrar" class="auth-form" role="tabpanel" aria-labelledby="tab-btn-entrar" novalidate>
      <div class="form-group">
        <label class="form-label" for="input-login-email">Seu e-mail</label>
        <input
          type="email"
          id="input-login-email"
          class="form-input"
          placeholder="nome@email.com"
          autocomplete="email"
          required
        />
      </div>
      <div class="form-group">
        <label class="form-label" for="input-login-senha">Sua senha</label>
        <input
          type="password"
          id="input-login-senha"
          class="form-input"
          placeholder="••••••••"
          autocomplete="current-password"
          required
        />
      </div>
      <button type="submit" class="btn-auth" id="btn-login">
        <span class="btn-auth__icon">☩</span>
        Entrar na Confraria
      </button>
      <p class="auth-link">
        Primeira vez?
        <button type="button" class="auth-link__btn" id="link-goto-criar">Crie sua conta.</button>
      </p>
    </form>

    <!-- Formulário: Criar conta -->
    <form id="auth-form-criar" class="auth-form auth-form--hidden" role="tabpanel" aria-labelledby="tab-btn-criar" novalidate>
      <div class="form-group">
        <label class="form-label" for="input-reg-nome">Como você quer ser chamado(a)</label>
        <input
          type="text"
          id="input-reg-nome"
          class="form-input"
          placeholder="Ex: Vinicius"
          autocomplete="name"
          required
        />
      </div>
      <div class="form-group">
        <label class="form-label" for="input-reg-email">Seu e-mail</label>
        <input
          type="email"
          id="input-reg-email"
          class="form-input"
          placeholder="nome@email.com"
          autocomplete="email"
          required
        />
      </div>
      <div class="form-group">
        <label class="form-label" for="input-reg-senha">Crie uma senha</label>
        <input
          type="password"
          id="input-reg-senha"
          class="form-input"
          placeholder="Mínimo 6 caracteres"
          autocomplete="new-password"
          required
          minlength="6"
        />
      </div>
      <div class="form-group">
        <label class="form-label" for="input-reg-confirma">Confirme sua senha</label>
        <input
          type="password"
          id="input-reg-confirma"
          class="form-input"
          placeholder="Repita a senha"
          autocomplete="new-password"
          required
        />
      </div>
      <button type="submit" class="btn-auth" id="btn-register-auth">
        <span class="btn-auth__icon">✦</span>
        Criar minha conta
      </button>
    </form>
  `;

  // Bind de eventos
  bindAuthEvents(container);
}

// ─── EVENTOS ──────────────────────────────────────────────────

function bindAuthEvents(container) {
  // Toggle de abas
  const tabEntrar = container.querySelector('#tab-btn-entrar');
  const tabCriar  = container.querySelector('#tab-btn-criar');
  const formEntrar = container.querySelector('#auth-form-entrar');
  const formCriar  = container.querySelector('#auth-form-criar');

  function switchAuthTab(tab) {
    const isEntrar = tab === 'entrar';
    tabEntrar.classList.toggle('auth-tab--active', isEntrar);
    tabCriar.classList.toggle('auth-tab--active', !isEntrar);
    tabEntrar.setAttribute('aria-selected', isEntrar);
    tabCriar.setAttribute('aria-selected', !isEntrar);
    formEntrar.classList.toggle('auth-form--hidden', !isEntrar);
    formCriar.classList.toggle('auth-form--hidden', isEntrar);
  }

  tabEntrar.addEventListener('click', () => switchAuthTab('entrar'));
  tabCriar.addEventListener('click', () => switchAuthTab('criar'));

  // Link "Primeira vez?"
  container.querySelector('#link-goto-criar')?.addEventListener('click', () => {
    switchAuthTab('criar');
  });

  // Submit: Login
  formEntrar.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleLogin(container);
  });

  // Submit: Cadastro
  formCriar.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleRegister(container);
  });
}

// ─── HANDLERS ─────────────────────────────────────────────────

async function handleLogin(container) {
  const email = container.querySelector('#input-login-email')?.value.trim();
  const senha  = container.querySelector('#input-login-senha')?.value;
  const btn    = container.querySelector('#btn-login');

  if (!email || !senha) {
    showToast('Preencha e-mail e senha para entrar.', 'error');
    return;
  }

  setButtonLoading(btn, true);

  const { session, error } = await signIn(email, senha);

  if (error || !session) {
    showToast('E-mail ou senha incorretos. Tente novamente.', 'error');
    setButtonLoading(btn, false);
    return;
  }

  // Busca o member correspondente
  const { data: member } = await getMemberByAuthId(session.user.id);
  if (!member) {
    showToast('Conta não vinculada a um membro. Fale com o administrador.', 'error');
    setButtonLoading(btn, false);
    return;
  }

  setButtonLoading(btn, false);
  if (_onAuthSuccess) _onAuthSuccess(member);
}

async function handleRegister(container) {
  const nome     = container.querySelector('#input-reg-nome')?.value.trim();
  const email    = container.querySelector('#input-reg-email')?.value.trim();
  const senha    = container.querySelector('#input-reg-senha')?.value;
  const confirma = container.querySelector('#input-reg-confirma')?.value;
  const btn      = container.querySelector('#btn-register-auth');

  // Validações básicas
  if (!nome || !email || !senha || !confirma) {
    showToast('Preencha todos os campos.', 'error');
    return;
  }
  if (senha !== confirma) {
    showToast('As senhas não coincidem.', 'error');
    return;
  }
  if (senha.length < 6) {
    showToast('A senha deve ter pelo menos 6 caracteres.', 'error');
    return;
  }

  setButtonLoading(btn, true);

  const { user, member, error, errorType } = await signUp(email, senha, nome);

  if (error) {
    if (errorType === 'name_not_found') {
      showToast('Este nome não pertence à Confraria. Verifique com o administrador.', 'error', 5000);
    } else if (errorType === 'email_taken') {
      showToast('Este e-mail já está cadastrado. Tente entrar.', 'error');
    } else {
      showToast('Erro ao criar conta. Tente novamente.', 'error');
      console.error('[Auth] signUp error:', error);
    }
    setButtonLoading(btn, false);
    return;
  }

  setButtonLoading(btn, false);
  showToast('✦ Conta criada. Bem-vindo(a) à Confraria!', 'success', 3000);

  if (_onAuthSuccess && member) {
    setTimeout(() => _onAuthSuccess(member), 1200);
  }
}

// ─── LOGOUT ───────────────────────────────────────────────────

/**
 * Realiza logout e chama callback.
 * @param {Function} onLogout
 */
export async function handleLogout(onLogout) {
  await signOut();
  if (onLogout) onLogout();
}

// ─── HELPERS ──────────────────────────────────────────────────

function setButtonLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="btn-auth__icon">✦</span> Aguarde...`;
  } else if (btn.dataset.originalText) {
    btn.innerHTML = btn.dataset.originalText;
  }
}
