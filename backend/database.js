// database.js
// Responsável por abrir/criar o banco SQLite e garantir o schema.
// Usamos better-sqlite3: síncrono, simples e ótimo pra projetos pequenos/médios.

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "db", "sistema.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS pacientes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    cns           TEXT NOT NULL UNIQUE,       -- número do Cartão Nacional de Saúde
    nome          TEXT NOT NULL,
    data_nasc     TEXT NOT NULL,              -- ISO date (YYYY-MM-DD)
    sexo          TEXT,
    telefone      TEXT,
    criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS fila (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id    INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    chegada        TEXT NOT NULL DEFAULT (datetime('now')),
    prioridade     INTEGER NOT NULL DEFAULT 5, -- 1=vermelho .. 5=azul (Protocolo de Manchester)
    queixa         TEXT,
    status         TEXT NOT NULL DEFAULT 'aguardando', -- aguardando | em_atendimento | atendido
    chamado_em     TEXT,
    finalizado_em  TEXT
  );

  CREATE TABLE IF NOT EXISTS consultas_exames (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id   INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    tipo          TEXT NOT NULL,      -- 'consulta' | 'exame'
    descricao     TEXT NOT NULL,
    profissional  TEXT,
    resultado     TEXT,
    data          TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_fila_status ON fila(status);
  CREATE INDEX IF NOT EXISTS idx_consultas_paciente ON consultas_exames(paciente_id);
`);

module.exports = db; 
// ---------------------------------------------------------------------------
// Auto-seed: se o banco estiver vazio, popula com dados de exemplo.
// Necessário porque o Shell não está disponível no plano gratuito do Render.
// ---------------------------------------------------------------------------

const totalPacientes = db.prepare(`SELECT COUNT(*) as total FROM pacientes`).get().total;

if (totalPacientes === 0) {
  console.log("Banco vazio detectado — populando com dados de exemplo...");

  const pacientesExemplo = [
    { cns: "700000000000001", nome: "Maria de Nazaré Souza", data_nasc: "1985-03-12", sexo: "F", telefone: "(91) 98888-1111" },
    { cns: "700000000000002", nome: "João Pedro Costa Lima", data_nasc: "1998-07-22", sexo: "M", telefone: "(91) 98888-2222" },
    { cns: "700000000000003", nome: "Alana Clarindo Barreto", data_nasc: "1972-11-05", sexo: "F", telefone: "(91) 98888-3333" },
    { cns: "700000000000004", nome: "Antônio Barreto Ferreira", data_nasc: "1960-01-30", sexo: "M", telefone: "(91) 98888-4444" },
  ];

  const inserirPaciente = db.prepare(
    `INSERT INTO pacientes (cns, nome, data_nasc, sexo, telefone) VALUES (@cns, @nome, @data_nasc, @sexo, @telefone)`
  );
  for (const p of pacientesExemplo) inserirPaciente.run(p);

  const idPorCns = (cns) => db.prepare(`SELECT id FROM pacientes WHERE cns = ?`).get(cns).id;
  const maria = idPorCns("700000000000001");
  const joao = idPorCns("700000000000002");
  const alana = idPorCns("700000000000003");

  const inserirHistorico = db.prepare(
    `INSERT INTO consultas_exames (paciente_id, tipo, descricao, profissional, resultado, data) VALUES (?, ?, ?, ?, ?, ?)`
  );
  inserirHistorico.run(maria, "consulta", "Consulta de rotina - Clínica Geral", "Dr. Carlos Menezes", "Pressão arterial normal. Retorno em 6 meses.", "2026-05-10 09:30:00");
  inserirHistorico.run(maria, "exame", "Hemograma completo", "Lab. Central", "Sem alterações significativas.", "2026-06-02 08:00:00");
  inserirHistorico.run(joao, "consulta", "Consulta - Ortopedia (dor no joelho)", "Dra. Fernanda Reis", "Solicitado raio-x. Uso de anti-inflamatório por 5 dias.", "2026-07-15 14:00:00");
  inserirHistorico.run(alana, "exame", "Check-up cardiológico", "Dr. Paulo Andrade", "ECG normal. Encaminhada para acompanhamento nutricional.", "2026-08-01 10:15:00");

  const inserirFila = db.prepare(`INSERT INTO fila (paciente_id, prioridade, queixa) VALUES (?, ?, ?)`);
  inserirFila.run(joao, 3, "Dor persistente no joelho direito");
  inserirFila.run(alana, 4, "Retorno de check-up");

  console.log("Banco populado com sucesso.");
}

module.exports = db;
