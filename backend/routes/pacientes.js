// routes/pacientes.js
const express = require("express");
const db = require("../database");

const router = express.Router();

// Validação simples de CNS: o número real tem 15 dígitos.
// Para o protótipo, aceitamos 15 dígitos numéricos.
function cnsValido(cns) {
  return typeof cns === "string" && /^\d{15}$/.test(cns);
}

// GET /api/pacientes?busca=nome-ou-cns  -> lista/pesquisa
router.get("/", (req, res) => {
  const { busca } = req.query;
  let pacientes;
  if (busca) {
    pacientes = db
      .prepare(
        `SELECT * FROM pacientes WHERE cns LIKE ? OR nome LIKE ? ORDER BY nome LIMIT 20`
      )
      .all(`%${busca}%`, `%${busca}%`);
  } else {
    pacientes = db.prepare(`SELECT * FROM pacientes ORDER BY nome LIMIT 50`).all();
  }
  res.json(pacientes);
});

// GET /api/pacientes/cns/:cns -> busca exata pelo Cartão SUS (identificação na recepção)
router.get("/cns/:cns", (req, res) => {
  const paciente = db
    .prepare(`SELECT * FROM pacientes WHERE cns = ?`)
    .get(req.params.cns);

  if (!paciente) {
    return res.status(404).json({ erro: "Paciente não encontrado para este Cartão SUS." });
  }
  res.json(paciente);
});

// POST /api/pacientes -> cadastra novo paciente (primeira vez que aparece no sistema)
router.post("/", (req, res) => {
  const { cns, nome, data_nasc, sexo, telefone } = req.body;

  if (!cnsValido(cns)) {
    return res.status(400).json({ erro: "CNS inválido. Deve conter 15 dígitos numéricos." });
  }
  if (!nome || !data_nasc) {
    return res.status(400).json({ erro: "Nome e data de nascimento são obrigatórios." });
  }

  try {
    const info = db
      .prepare(
        `INSERT INTO pacientes (cns, nome, data_nasc, sexo, telefone) VALUES (?, ?, ?, ?, ?)`
      )
      .run(cns, nome, data_nasc, sexo || null, telefone || null);

    const paciente = db.prepare(`SELECT * FROM pacientes WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json(paciente);
  } catch (e) {
    if (e.message.includes("UNIQUE")) {
      return res.status(409).json({ erro: "Já existe um paciente cadastrado com este CNS." });
    }
    res.status(500).json({ erro: "Erro ao cadastrar paciente." });
  }
});

// GET /api/pacientes/:id/historico -> histórico de consultas e exames do paciente
router.get("/:id/historico", (req, res) => {
  const paciente = db.prepare(`SELECT * FROM pacientes WHERE id = ?`).get(req.params.id);
  if (!paciente) return res.status(404).json({ erro: "Paciente não encontrado." });

  const historico = db
    .prepare(`SELECT * FROM consultas_exames WHERE paciente_id = ? ORDER BY data DESC`)
    .all(req.params.id);

  res.json({ paciente, historico });
});

module.exports = router;
