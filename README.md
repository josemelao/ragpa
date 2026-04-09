# RAG MVP - Consulta Inteligente de Documentos

Webapp pessoal de RAG (Retrieval-Augmented Generation) para upload, indexacao e consulta de documentos via linguagem natural.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML + CSS + JavaScript puro |
| Backend | Node.js + Express |
| Banco vetorial | Supabase (PostgreSQL + pgvector) |
| Embeddings | Google Gemini `gemini-embedding-001` com `outputDimensionality=768` |
| LLM | Google Gemini `gemini-2.5-flash` |
| Arquivos | Supabase Storage (`FILE_STORAGE_PROVIDER=supabase`) com fallback local |

## Estado atual

O fluxo principal esta funcional:

- upload de `.txt`, `.md` e `.pdf`
- extracao de texto
- chunking
- geracao de embeddings
- persistencia no Supabase
- busca vetorial
- resposta RAG com fontes
- armazenamento de upload em nuvem quando `FILE_STORAGE_PROVIDER=supabase`

Correcaoes aplicadas nesta sessao:

- o embedding antigo quebrou por mudanca de modelo na Gemini API
- `gemini-embedding-001` foi adotado no backend
- a saida do embedding foi reduzida para `768` dimensoes para manter compatibilidade com `ivfflat`
- o SQL do Supabase foi alinhado para `vector(768)`
- o LLM foi atualizado para `gemini-2.5-flash`
- o request de `generateContent` foi ajustado para o formato aceito na pratica
- as instrucoes de sistema foram incorporadas ao prompt do usuario para contornar rejeicao do campo `system_instruction`
- o upload passou a tratar corretamente nomes de arquivo com encoding quebrado

## Pre-requisitos

- Node.js 18+
- conta no [Supabase](https://supabase.com)
- chave de API do Google AI Studio em [aistudio.google.com](https://aistudio.google.com/app/apikey)

## Configuracao

### 1. Supabase

Execute o arquivo [docs/sql/init.sql](/C:/Users/PICHAU/Desktop/RAGPA/rag-mvp/docs/sql/init.sql) no SQL Editor do Supabase.

Se voce ja tiver aplicado uma versao antiga do schema, limpe antes:

```sql
drop function if exists match_document_chunks;
drop table if exists document_chunks;
drop table if exists documents;
```

Depois execute o `init.sql` atual.

### 2. Variaveis de ambiente

No backend:

```bash
cd backend
cp .env.example .env
```

Preencha o `.env` com:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=documents
GOOGLE_API_KEY=AIzaSy...
GEMINI_LLM_MODEL=gemini-2.5-flash
GEMINI_API_VERSION=v1beta
FILE_STORAGE_PROVIDER=supabase
```

Observacoes:

- `GEMINI_LLM_MODEL` e `GEMINI_API_VERSION` sao opcionais, mas esses sao os valores atuais usados pelo projeto.
- embeddings usam `gemini-embedding-001` fixamente no backend.
- `FILE_STORAGE_PROVIDER` aceita `supabase` (recomendado) ou `local`.
- para modo nuvem, garanta que o bucket em `SUPABASE_STORAGE_BUCKET` exista no projeto.

### 3. Instalar dependencias

```bash
cd backend
npm install
```

## Como rodar

```bash
cd backend
npm run dev
```

Acesse `http://localhost:3000`.

## Uso

1. Envie um arquivo `.txt`, `.md` ou `.pdf`.
2. Aguarde a indexacao.
3. Faça uma pergunta no chat.
4. O app responde com base nos documentos indexados e mostra as fontes usadas.

## Estrutura do projeto

```txt
rag-mvp/
|-- frontend/
|   |-- index.html
|   |-- style.css
|   `-- app.js
|-- backend/
|   |-- package.json
|   |-- uploads/
|   `-- src/
|       |-- config/
|       |-- controllers/
|       |-- prompts/
|       |-- routes/
|       |-- services/
|       `-- utils/
|-- docs/
|   |-- decisions.md
|   `-- sql/init.sql
|-- logs/
|   |-- AGENT_LOG.md
|   `-- TODO.md
|-- plano-mvp-rag-v1.0.md
`-- README.md
```

## Arquivos importantes

- [backend/src/services/embedding.service.js](/C:/Users/PICHAU/Desktop/RAGPA/rag-mvp/backend/src/services/embedding.service.js)
- [backend/src/services/answer.service.js](/C:/Users/PICHAU/Desktop/RAGPA/rag-mvp/backend/src/services/answer.service.js)
- [backend/src/routes/upload.routes.js](/C:/Users/PICHAU/Desktop/RAGPA/rag-mvp/backend/src/routes/upload.routes.js)
- [docs/sql/init.sql](/C:/Users/PICHAU/Desktop/RAGPA/rag-mvp/docs/sql/init.sql)
- [plano-mvp-rag-v1.0.md](/C:/Users/PICHAU/Desktop/RAGPA/rag-mvp/plano-mvp-rag-v1.0.md)

## Ajustes finos

| Parametro | Arquivo | Padrao |
|---|---|---|
| Tamanho do chunk | `backend/src/services/chunking.service.js` | 1000 chars |
| Overlap | `backend/src/services/chunking.service.js` | 150 chars |
| Top-K | `backend/src/services/retrieval.service.js` | 4 |
| Temperatura LLM | `backend/src/services/answer.service.js` | 0.3 |
| Tamanho maximo de upload | `.env` -> `MAX_FILE_SIZE_MB` | 10 MB |

## Limitacoes atuais

- sem autenticacao
- sem exclusao de documentos pela UI
- PDFs escaneados sem texto nao funcionam sem OCR
- sem streaming de resposta
- documentos antigos salvos com nome corrompido no banco precisam ser reenviados ou corrigidos manualmente

Veja `logs/TODO.md` para a lista de evolucoes planejadas.
