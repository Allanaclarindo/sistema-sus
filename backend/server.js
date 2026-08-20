// server.js
// Servidor principal. Sobe a API REST usada pelo front-end (recepção, fila, atendimento).
require("./database"); // garante que o schema exista antes de tudo

const express = require("express");
const cors = require("cors");

const pacientesRouter = require("./routes/pacientes");
const filaRouter = require("./routes/fila");
const consultasRouter = require("./routes/consultas");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/status", (req, res) => {
  res.json({ ok: true, servico: "Sistema de Atendimento SUS", hora: new Date().toISOString() });
});

app.use("/api/pacientes", pacientesRouter);
app.use("/api/fila", filaRouter);
app.use("/api/consultas", consultasRouter);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Teste rápido: http://localhost:${PORT}/api/status`);
});
