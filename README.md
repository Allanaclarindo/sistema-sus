# SUS Ágil — Sistema de Atendimento Hospitalar por Cartão SUS

Protótipo acadêmico que propõe agilizar o atendimento em unidades do SUS
identificando o paciente pelo número do Cartão Nacional de Saúde (CNS),
organizando a fila por prioridade clínica e disponibilizando o histórico de
consultas/exames diretamente para o profissional que vai atender.

Este projeto se inspira na infraestrutura real do SUS (RNDS — Rede Nacional
de Dados em Saúde, padrão HL7 FHIR, app Meu SUS Digital), mas é um protótipo
simplificado, feito para fins de trabalho de faculdade — **não use dados
reais de pacientes nele.**

## Estrutura do projeto

```
sistema-sus/
├── backend/          API REST em Node.js + Express + SQLite
│   ├── server.js
│   ├── database.js
│   ├── seed.js        (dados de exemplo)
│   └── routes/
├── frontend/         Front-end estático (HTML + CSS + JS puro)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── README.md
```

## Rodando localmente

### 1. Back-end (API)

```bash
cd backend
npm install
npm run seed     # cria o banco e insere pacientes de exemplo
npm start        # sobe o servidor em http://localhost:3000
```

Teste rápido: abra `http://localhost:3000/api/status` no navegador — deve
retornar um JSON com `"ok": true`.

CNS de teste criados pelo seed:

| Paciente               | CNS               |
|-------------------------|-------------------|
| Maria de Nazaré Souza    | 700000000000001 |
| João Pedro Costa Lima    | 700000000000002 |
| Rosa Trindade Alves      | 700000000000003 |
| Antônio Barreto Ferreira | 700000000000004 |

### 2. Front-end

O front-end é só HTML/CSS/JS estático. Mais simples: abra
`frontend/index.html` direto no navegador, ou sirva com qualquer servidor
estático, por exemplo:

```bash
cd frontend
npx serve .
```

Com o back-end rodando em `http://localhost:3000`, o indicador no topo da
página deve mostrar "servidor conectado".

## Fluxo pra testar

1. Aba **Recepção** → digite um CNS de teste → o sistema mostra os dados do
   paciente automaticamente (sem precisar redigitar nome, idade etc.).
2. Escolha a classificação de risco e faça o check-in — o paciente entra na
   fila.
3. Aba **Fila de atendimento** → veja a fila ordenada por prioridade
   clínica, não por ordem de chegada. Clique em "Chamar".
4. Aba **Painel do profissional** → clique em "Ver histórico" → aparecem
   as consultas/exames anteriores do paciente. Registre um novo atendimento
   e finalize.

## Hospedando (deploy)

O back-end precisa rodar Node.js continuamente, então **não funciona em
GitHub Pages** (que só serve arquivos estáticos). Sugestão de arquitetura
de hospedagem gratuita:

- **Back-end** → [Render](https://render.com) ou [Railway](https://railway.app)
  (ambos têm free tier para apps Node.js pequenos).
  - Novo "Web Service" apontando para a pasta `backend/`
  - Build command: `npm install`
  - Start command: `npm start`
  - Rode `npm run seed` uma vez (via Shell do Render) para popular o banco.

- **Front-end** → GitHub Pages, Vercel ou Netlify, apontando para a pasta
  `frontend/`.
  - **Importante:** depois de hospedar o back-end, edite a constante
    `API_BASE` no arquivo `frontend/js/app.js` para a URL pública do seu
    back-end, por exemplo:
    ```js
    const API_BASE = "https://sistema-sus-backend.onrender.com/api";
    ```

## Sobre o uso do SQLite em produção

O SQLite grava num arquivo (`backend/db/sistema.db`). Isso funciona bem em
serviços como Render/Railway (disco persistente), mas **não funciona em
plataformas serverless** como Vercel Functions, porque o sistema de
arquivos ali é temporário e os dados seriam perdidos a cada novo
deploy/invocação. Por isso o back-end deste projeto deve ser hospedado como
um serviço "always-on" (Render/Railway), não como função serverless.

## Limitações conhecidas (importante citar no trabalho)

Este é um protótipo para fins didáticos. Para um sistema real de produção
seria necessário, entre outros pontos:

- Autenticação e controle de acesso por perfil (recepção, enfermagem,
  médico, gestor), com trilha de auditoria.
- Conformidade com a LGPD (Lei Geral de Proteção de Dados) para dados de
  saúde, que são dados sensíveis.
- Validação real do número do CNS (dígito verificador) e integração de fato
  com a RNDS (Rede Nacional de Dados em Saúde) via padrão HL7 FHIR, em vez
  de um banco local isolado.
- Criptografia de dados em trânsito (HTTPS) e em repouso.
- Escalabilidade para múltiplas unidades de saúde simultâneas (aqui o
  SQLite atende bem a um protótipo, mas um sistema real usaria um banco
  como PostgreSQL).
