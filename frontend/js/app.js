// app.js
// Front-end vanilla JS. Nenhuma dependência externa além de fetch nativo.

// ⚠️ Ao hospedar o back-end (Render/Railway/etc.), troque a URL abaixo pela
// URL pública do seu servidor, ex: "https://sistema-sus-backend.onrender.com/api"
const API_BASE = "https://sistema-sus.onrender.com/api";

let pacienteSelecionado = null; // paciente atualmente identificado na recepção
let itemFilaEmAtendimento = null; // item da fila aberto no painel do profissional

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

async function api(path, options = {}) {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(dados.erro || "Erro na requisição.");
  return dados;
}

function formatarData(iso) {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T") + "Z");
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function idade(dataNasc) {
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let a = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) a--;
  return a;
}

// ---------------------------------------------------------------------------
// Status do servidor
// ---------------------------------------------------------------------------

async function checarStatus() {
  const el = document.getElementById("api-indicator");
  try {
    await api("/status");
    el.classList.add("ok");
    el.classList.remove("erro");
    el.querySelector(".txt").textContent = "servidor conectado";
  } catch {
    el.classList.add("erro");
    el.classList.remove("ok");
    el.querySelector(".txt").textContent = "servidor indisponível — rode o back-end";
  }
}

// ---------------------------------------------------------------------------
// Navegação entre abas
// ---------------------------------------------------------------------------

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");

    if (btn.dataset.tab === "fila") carregarFila();
    if (btn.dataset.tab === "atendimento") carregarEmAtendimento();
  });
});

// ---------------------------------------------------------------------------
// RECEPÇÃO — busca por CNS
// ---------------------------------------------------------------------------

document.getElementById("form-busca-cns").addEventListener("submit", async (e) => {
  e.preventDefault();
  const cns = document.getElementById("input-cns").value.trim();
  const box = document.getElementById("resultado-busca");
  box.innerHTML = "Buscando…";

  try {
    const paciente = await api(`/pacientes/cns/${cns}`);
    pacienteSelecionado = paciente;
    box.innerHTML = `
      <div class="paciente-box">
        <strong>${paciente.nome}</strong><br/>
        CNS: ${paciente.cns} · ${idade(paciente.data_nasc)} anos · ${paciente.sexo || "sexo não informado"}<br/>
        Telefone: ${paciente.telefone || "—"}
      </div>`;
    mostrarCheckin(paciente);
  } catch (err) {
    box.innerHTML = `<p class="msg-erro">${err.message}</p>`;
    esconderCheckin();
  }
});

// ---------------------------------------------------------------------------
// RECEPÇÃO — cadastro de novo paciente
// ---------------------------------------------------------------------------

document.getElementById("form-cadastro").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const box = document.getElementById("resultado-cadastro");

  const corpo = {
    cns: form.cns.value.trim(),
    nome: form.nome.value.trim(),
    data_nasc: form.data_nasc.value,
    sexo: form.sexo.value,
    telefone: form.telefone.value.trim(),
  };

  try {
    const paciente = await api("/pacientes", { method: "POST", body: JSON.stringify(corpo) });
    box.innerHTML = `<p class="msg-ok">Paciente cadastrado com sucesso.</p>`;
    pacienteSelecionado = paciente;
    mostrarCheckin(paciente);
    form.reset();
  } catch (err) {
    box.innerHTML = `<p class="msg-erro">${err.message}</p>`;
  }
});

// ---------------------------------------------------------------------------
// RECEPÇÃO — check-in na fila
// ---------------------------------------------------------------------------

function mostrarCheckin(paciente) {
  document.getElementById("card-checkin").hidden = false;
  document.getElementById("checkin-nome").textContent = `${paciente.nome} (CNS ${paciente.cns})`;
}

function esconderCheckin() {
  document.getElementById("card-checkin").hidden = true;
}

document.getElementById("form-checkin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const box = document.getElementById("resultado-checkin");

  const corpo = {
    paciente_id: pacienteSelecionado.id,
    prioridade: Number(form.prioridade.value),
    queixa: form.queixa.value.trim(),
  };

  try {
    await api("/fila", { method: "POST", body: JSON.stringify(corpo) });
    box.innerHTML = `<p class="msg-ok">Paciente adicionado à fila com sucesso.</p>`;
    form.reset();
    esconderCheckin();
    pacienteSelecionado = null;
  } catch (err) {
    box.innerHTML = `<p class="msg-erro">${err.message}</p>`;
  }
});

// ---------------------------------------------------------------------------
// FILA — listagem e ações
// ---------------------------------------------------------------------------

document.getElementById("btn-atualizar-fila").addEventListener("click", carregarFila);

async function carregarFila() {
  const container = document.getElementById("lista-fila");
  container.innerHTML = "Carregando…";

  try {
    const fila = await api("/fila?status=aguardando");
    if (fila.length === 0) {
      container.innerHTML = `<p class="vazio">Nenhum paciente aguardando no momento.</p>`;
      return;
    }
    container.innerHTML = fila.map(renderItemFila).join("");

    container.querySelectorAll("[data-chamar]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await api(`/fila/${btn.dataset.chamar}/chamar`, { method: "PATCH" });
        carregarFila();
      });
    });
  } catch {
    container.innerHTML = `<p class="msg-erro">Não foi possível carregar a fila. O servidor está rodando?</p>`;
  }
}

function renderItemFila(item) {
  return `
    <div class="item-fila">
      <div class="prioridade-tag p${item.prioridade}"></div>
      <div class="item-fila-info">
        <div class="nome">${item.nome}</div>
        <div class="meta">
          ${item.prioridade_label} · chegou às ${formatarData(item.chegada)}
          ${item.queixa ? " · " + item.queixa : ""}
        </div>
      </div>
      <div class="item-fila-acoes">
        <button data-chamar="${item.id}">Chamar</button>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// ATENDIMENTO — pacientes chamados, histórico, registro
// ---------------------------------------------------------------------------

async function carregarEmAtendimento() {
  const container = document.getElementById("lista-em-atendimento");
  container.innerHTML = "Carregando…";

  try {
    const lista = await api("/fila?status=em_atendimento");
    if (lista.length === 0) {
      container.innerHTML = `<p class="vazio">Nenhum paciente chamado ainda. Vá à aba "Fila" e clique em "Chamar".</p>`;
      document.getElementById("card-historico").hidden = true;
      return;
    }
    container.innerHTML = lista
      .map(
        (item) => `
      <div class="item-fila">
        <div class="prioridade-tag p${item.prioridade}"></div>
        <div class="item-fila-info">
          <div class="nome">${item.nome}</div>
          <div class="meta">${item.prioridade_label} · em atendimento desde ${formatarData(item.chamado_em)}</div>
        </div>
        <div class="item-fila-acoes">
          <button data-abrir='${item.paciente_id}' data-fila-id='${item.id}'>Ver histórico</button>
        </div>
      </div>`
      )
      .join("");

    container.querySelectorAll("[data-abrir]").forEach((btn) => {
      btn.addEventListener("click", () => abrirHistorico(btn.dataset.abrir, btn.dataset.filaId));
    });
  } catch {
    container.innerHTML = `<p class="msg-erro">Não foi possível carregar. O servidor está rodando?</p>`;
  }
}

async function abrirHistorico(pacienteId, filaId) {
  itemFilaEmAtendimento = filaId;
  const { paciente, historico } = await api(`/pacientes/${pacienteId}/historico`);

  document.getElementById("card-historico").hidden = false;
  document.getElementById("hist-nome").textContent = paciente.nome;

  const lista = document.getElementById("hist-lista");
  lista.innerHTML = historico.length
    ? historico
        .map(
          (h) => `
      <div class="historico-item">
        <div class="tipo">${h.tipo}</div>
        <div>${h.descricao}</div>
        ${h.resultado ? `<div>${h.resultado}</div>` : ""}
        <div class="data">${h.profissional || "Profissional não informado"} · ${formatarData(h.data)}</div>
      </div>`
        )
        .join("")
    : `<p class="vazio">Sem registros anteriores.</p>`;

  document.getElementById("form-registro").dataset.pacienteId = pacienteId;
}

document.getElementById("form-registro").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const box = document.getElementById("resultado-registro");

  const corpo = {
    paciente_id: Number(form.dataset.pacienteId),
    tipo: form.tipo.value,
    descricao: form.descricao.value.trim(),
    profissional: form.profissional.value.trim(),
    resultado: form.resultado.value.trim(),
  };

  try {
    await api("/consultas", { method: "POST", body: JSON.stringify(corpo) });
    box.innerHTML = `<p class="msg-ok">Registro salvo no histórico do paciente.</p>`;
    abrirHistorico(corpo.paciente_id, itemFilaEmAtendimento);
    form.reset();
  } catch (err) {
    box.innerHTML = `<p class="msg-erro">${err.message}</p>`;
  }
});

document.getElementById("btn-finalizar").addEventListener("click", async () => {
  if (!itemFilaEmAtendimento) return;
  await api(`/fila/${itemFilaEmAtendimento}/finalizar`, { method: "PATCH" });
  document.getElementById("card-historico").hidden = true;
  itemFilaEmAtendimento = null;
  carregarEmAtendimento();
});

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------

checarStatus();
setInterval(checarStatus, 15000);
