// database.js
// Responsável por abrir/criar o banco SQLite e garantir o schema.
// Usamos better-sqlite3: síncrono, simples e ótimo pra projetos pequenos/médios.

const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "db", "sistema.db");
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
