// routes/fila.js
// Fila de atendimento baseada em prioridade clínica (1 = mais urgente .. 5 = menos urgente),
// inspirada no Protocolo de Manchester usado em unidades de urgência do SUS.
const express = require("express");
const db = require("../database");

const router = express.Router();

const PRIORIDADES = {
  1: { nome: "Emergência", cor: "vermelho" },
  2: { nome: "Muito urgente", cor: "laranja" },
  3: { nome: "Urgente", cor: "amarelo" },
  4: { nome: "Pouco urgente", cor: "verde" },
  5: { nome: "Não urgente", cor: "azul" },
};

// GET /api/fila -> lista pacientes aguardando/em atendimento, ordenados por prioridade e chegada
router.get("/", (req, res) => {
  const { status } = req.query;

  let query = `
    SELECT fila.*, pacientes.nome, pacientes.cns, pacientes.data_nasc
    FROM fila
    JOIN pacientes ON pacientes.id = fila.paciente_id
  `;
  const params = [];
  if (status) {
    query += ` WHERE fila.status = ?`;
    params.push(status);
  } else {
    query += ` WHERE fila.status != 'atendido'`;
  }
  query += ` ORDER BY fila.prioridade ASC, fila.chegada ASC`;

  const linhas = db.prepare(query).all(...params);
  const resultado = linhas.map((l) => ({
    ...l,
    prioridade_label: PRIORIDADES[l.prioridade]?.nome,
    prioridade_cor: PRIORIDADES[l.prioridade]?.cor,
  }));

  res.json(resultado);
});

// POST /api/fila -> check-in: adiciona paciente já identificado (por CNS) na fila
router.post("/", (req, res) => {
  const { paciente_id, prioridade, queixa } = req.body;

  if (!paciente_id) return res.status(400).json({ erro: "paciente_id é obrigatório." });
  const p = Number(prioridade) || 5;
  if (p < 1 || p > 5) return res.status(400).json({ erro: "Prioridade deve ser entre 1 e 5." });

  const paciente = db.prepare(`SELECT * FROM pacientes WHERE id = ?`).get(paciente_id);
  if (!paciente) return res.status(404).json({ erro: "Paciente não encontrado." });

  const jaNaFila = db
    .prepare(`SELECT * FROM fila WHERE paciente_id = ? AND status != 'atendido'`)
    .get(paciente_id);
  if (jaNaFila) return res.status(409).json({ erro: "Paciente já está na fila." });

  const info = db
    .prepare(`INSERT INTO fila (paciente_id, prioridade, queixa) VALUES (?, ?, ?)`)
    .run(paciente_id, p, queixa || null);

  const item = db.prepare(`SELECT * FROM fila WHERE id = ?`).get(info.lastInsertRowid);
  res.status(201).json(item);
});

// PATCH /api/fila/:id/chamar -> profissional chama o paciente para atendimento
router.patch("/:id/chamar", (req, res) => {
  const item = db.prepare(`SELECT * FROM fila WHERE id = ?`).get(req.params.id);
  if (!item) return res.status(404).json({ erro: "Item da fila não encontrado." });

  db.prepare(
    `UPDATE fila SET status = 'em_atendimento', chamado_em = datetime('now') WHERE id = ?`
  ).run(req.params.id);

  res.json(db.prepare(`SELECT * FROM fila WHERE id = ?`).get(req.params.id));
});

// PATCH /api/fila/:id/finalizar -> encerra o atendimento (sai da fila)
router.patch("/:id/finalizar", (req, res) => {
  const item = db.prepare(`SELECT * FROM fila WHERE id = ?`).get(req.params.id);
  if (!item) return res.status(404).json({ erro: "Item da fila não encontrado." });

  db.prepare(
    `UPDATE fila SET status = 'atendido', finalizado_em = datetime('now') WHERE id = ?`
  ).run(req.params.id);

  res.json(db.prepare(`SELECT * FROM fila WHERE id = ?`).get(req.params.id));
});

module.exports = router;
