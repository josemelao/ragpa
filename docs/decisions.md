# Decisões do projeto

## 2026-04-06 — Stack inicial
**Decisão:** HTML/JS puro + Node/Express + Supabase/pgvector  
**Motivo:** custo zero, simplicidade, flexibilidade e escalabilidade gradual.

## 2026-04-06 — Armazenamento local no MVP
**Decisão:** usar pasta `/uploads` no backend  
**Motivo:** reduzir complexidade e validar fluxo antes de usar Supabase Storage.

## 2026-04-06 — Embedding: Google Gemini text-embedding-004
**Decisão:** usar o modelo `text-embedding-004` da Google (768 dimensões)  
**Motivo:** disponível no free tier do Google AI Studio, sem custo para uso pessoal leve.  
**Impacto:** coluna `vector(768)` no Supabase. Se trocar de modelo, recriar a coluna.

## 2026-04-06 — LLM: Google Gemini 1.5 Flash
**Decisão:** usar `gemini-1.5-flash` para geração de resposta  
**Motivo:** modelo rápido e gratuito no free tier. Suficiente para MVP pessoal.  
**Provedor encapsulado em:** `answer.service.js` — troca sem reescrever o app.

## 2026-04-06 — Chunking por parágrafo + overlap por caracteres
**Decisão:** quebrar por `\n\n` primeiro; cair em corte por tamanho se necessário  
**Motivo:** respeita a estrutura do documento, melhora qualidade do RAG.  
**Config:** `CHUNK_SIZE=1000`, `OVERLAP=150` — ajustável no topo de `chunking.service.js`.

## 2026-04-06 — top-k inicial = 5
**Decisão:** buscar 5 chunks por pergunta  
**Motivo:** equilíbrio entre contexto e tamanho do prompt. Ajustável em `retrieval.service.js`.
