// seed.js
// Popula o banco com pacientes de exemplo para você testar o sistema imediatamente.
// Rode com: npm run seed
const db = require("./database");

const pacientes = [
  { cns: "700000000000001", nome: "Maria de Nazaré Souza", data_nasc: "1985-03-12", sexo: "F", telefone: "(91) 98888-1111" },
  { cns: "700000000000002", nome: "João Pedro Costa Lima", data_nasc: "1998-07-22", sexo: "M", telefone: "(91) 98888-2222" },
  { cns: "700000000000003", nome: "Rosa Trindade Alves", data_nasc: "1972-11-05", sexo: "F", telefone: "(91) 98888-3333" },
  { cns: "700000000000004", nome: "Antônio Barreto Ferreira", data_nasc: "1960-01-30", sexo: "M", telefone: "(91) 98888-4444" },
];

const inserirPaciente = db.prepare(
  `INSERT OR IGNORE INTO pacientes (cns, nome, data_nasc, sexo, telefone) VALUES (@cns, @nome, @data_nasc, @sexo, @telefone)`
);

const buscarPorCns = db.prepare(`SELECT id FROM pacientes WHERE cns = ?`);

const inserirHistorico = db.prepare(
  `INSERT INTO consultas_exames (paciente_id, tipo, descricao, profissional, resultado, data)
   VALUES (?, ?, ?, ?, ?, ?)`
);

const inserirFila = db.prepare(
  `INSERT INTO fila (paciente_id, prioridade, queixa) VALUES (?, ?, ?)`
);

const transacao = db.transaction(() => {
  for (const p of pacientes) inserirPaciente.run(p);

  const maria = buscarPorCns.get("700000000000001").id;
  const joao = buscarPorCns.get("700000000000002").id;
  const rosa = buscarPorCns.get("700000000000003").id;

  inserirHistorico.run(maria, "consulta", "Consulta de rotina - Clínica Geral", "Dr. Carlos Menezes", "Pressão arterial normal. Retorno em 6 meses.", "2026-05-10 09:30:00");
  inserirHistorico.run(maria, "exame", "Hemograma completo", "Lab. Central", "Sem alterações significativas.", "2026-06-02 08:00:00");
  inserirHistorico.run(joao, "consulta", "Consulta - Ortopedia (dor no joelho)", "Dra. Fernanda Reis", "Solicitado raio-x. Uso de anti-inflamatório por 5 dias.", "2026-07-15 14:00:00");
  inserirHistorico.run(rosa, "exame", "Check-up cardiológico", "Dr. Paulo Andrade", "ECG normal. Encaminhada para acompanhamento nutricional.", "2026-08-01 10:15:00");

  // Alguns pacientes já chegam na fila para você testar o painel de atendimento
  inserirFila.run(joao, 3, "Dor persistente no joelho direito");
  inserirFila.run(rosa, 4, "Retorno de check-up");
});

transacao();

console.log("Banco populado com sucesso.");
console.log("CNS de teste:");
pacientes.forEach((p) => console.log(`  ${p.nome} -> ${p.cns}`));
