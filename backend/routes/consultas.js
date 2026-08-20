// routes/consultas.js
const express = require("express");
const db = require("../database");

const router = express.Router();

// POST /api/consultas -> profissional registra uma consulta ou exame no histórico do paciente
router.post("/", (req, res) => {
  const { paciente_id, tipo, descricao, profissional, resultado } = req.body;

  if (!paciente_id || !tipo || !descricao) {
    return res.status(400).json({ erro: "paciente_id, tipo e descricao são obrigatórios." });
  }
  if (!["consulta", "exame"].includes(tipo)) {
    return res.status(400).json({ erro: "tipo deve ser 'consulta' ou 'exame'." });
  }

  const paciente = db.prepare(`SELECT * FROM pacientes WHERE id = ?`).get(paciente_id);
  if (!paciente) return res.status(404).json({ erro: "Paciente não encontrado." });

  const info = db
    .prepare(
      `INSERT INTO consultas_exames (paciente_id, tipo, descricao, profissional, resultado)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(paciente_id, tipo, descricao, profissional || null, resultado || null);

  const registro = db
    .prepare(`SELECT * FROM consultas_exames WHERE id = ?`)
    .get(info.lastInsertRowid);

  res.status(201).json(registro);
});

module.exports = router;
