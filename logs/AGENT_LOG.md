# AGENT LOG

---

## Sessão 2026-04-06

### Objetivo
Criar a estrutura base completa do MVP RAG seguindo o plano `plano-mvp-rag-v1.0.md`.

### O que foi feito
- Criada estrutura completa de pastas do projeto
- Implementado backend Node/Express com separação em routes/controllers/services
- Implementado frontend HTML+CSS+JS puro (sem frameworks, sem build step)
- Criados todos os services do pipeline RAG:
  - `fileParser.service.js` — extrai texto de .txt, .md, .pdf
  - `chunking.service.js` — quebra por parágrafo + overlap por caracteres
  - `embedding.service.js` — integração com Google Gemini text-embedding-004
  - `vectorStore.service.js` — salva e busca no Supabase via RPC
  - `retrieval.service.js` — gera embedding da pergunta e busca top-k chunks
  - `answer.service.js` — chama Gemini 1.5 Flash com contexto + pergunta
- Criados controllers e rotas para upload e ask
- Criado SQL de inicialização para Supabase (tabelas + índice IVFFlat + RPC)
- Criado `.env.example` com todas as variáveis necessárias
- Criado prompt do sistema RAG

### Arquivos criados
- `backend/package.json`
- `backend/.env.example`
- `backend/src/server.js`
- `backend/src/config/env.js`
- `backend/src/config/supabase.js`
- `backend/src/utils/logger.js`
- `backend/src/utils/sanitizeText.js`
- `backend/src/services/fileParser.service.js`
- `backend/src/services/chunking.service.js`
- `backend/src/services/embedding.service.js`
- `backend/src/services/vectorStore.service.js`
- `backend/src/services/retrieval.service.js`
- `backend/src/services/answer.service.js`
- `backend/src/controllers/upload.controller.js`
- `backend/src/controllers/ask.controller.js`
- `backend/src/routes/upload.routes.js`
- `backend/src/routes/ask.routes.js`
- `backend/src/prompts/rag.system.prompt.txt`
- `frontend/index.html`
- `frontend/style.css`
- `frontend/app.js`
- `docs/sql/init.sql`
- `docs/decisions.md`
- `logs/AGENT_LOG.md`
- `logs/TODO.md`
- `README.md`

### Decisões tomadas
- Gemini text-embedding-004 (768 dims) para embeddings — free tier
- Gemini 1.5 Flash para LLM — free tier, rápido
- Chunking por parágrafo + overflow por caracteres (1000 chars, 150 overlap)
- top-k = 5 por padrão

### Problemas encontrados
- Nenhum na geração da estrutura. Integração real depende das chaves do .env

### Próximos passos
1. Copiar arquivos para o ambiente local
2. Criar projeto no Supabase e executar `docs/sql/init.sql`
3. Obter GOOGLE_API_KEY no Google AI Studio
4. Copiar `.env.example` para `.env` e preencher as variáveis
5. Rodar `npm install` no diretório `backend/`
6. Rodar `npm run dev` e testar com um .txt simples
7. Testar com .pdf
8. Ajustar chunk size / top-k se necessário
