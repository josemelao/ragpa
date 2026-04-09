# PLANO DE MELHORIAS — RAG PESSOAL V2.0
**Projeto:** WebApp RAG pessoal — evolução do MVP v1.0  
**Objetivo:** melhorar organização do acervo, qualidade de recuperação, qualidade de resposta e usabilidade  
**Ferramenta principal de execução:** Claude Code  
**Data de abertura:** 2026-04-09  
**Status geral:** ABERTO — planejamento inicial  
**Pré-requisito:** MVP v1.0 funcionando (upload, indexação, embeddings, busca vetorial, resposta RAG)

---

# 0. PRINCÍPIOS DESTE PLANO

1. Nunca quebrar o fluxo existente — cada bloco é opcional e incremental
2. Sempre implementar com compatibilidade retroativa (documentos já indexados continuam funcionando)
3. Sempre validar antes de avançar para o próximo bloco
4. Nunca misturar dois blocos no mesmo commit sem necessidade
5. Manter stack atual: Node/Express + Supabase + pgvector + HTML/CSS/JS puro
6. Registrar tudo no log ao final de cada etapa
7. A qualquer sinal de regressão, parar e corrigir antes de continuar

---

# 1. VISÃO GERAL DOS BLOCOS

| Bloco | Nome | Impacto | Risco | Depende de |
|-------|------|---------|-------|------------|
| A | Metadados e Coleções | Alto | Baixo | — |
| B | Melhoria de Recuperação | Alto | Médio | A |
| C | Qualidade de Resposta | Alto | Baixo | A, B |
| D | Usabilidade — Biblioteca | Médio | Baixo | A |
| E | Usabilidade — Chat | Médio | Baixo | C |
| F | Operação e Métricas | Médio | Baixo | todos |

Ordem recomendada: A → B → C → D → E → F

---

# 2. BLOCO A — METADADOS E COLEÇÕES

## Objetivo
Permitir organizar documentos por coleção, tags, tipo e fonte.
Filtrar a busca por escopo antes de ir para similaridade vetorial.

## Resultado esperado
- documento pode ter: coleção, tags, tipo_doc, fonte, data_referencia
- busca pode ser filtrada por coleção ou tag
- chat tem seletor de escopo: "Todos | Coleção X | Tag Y"
- documentos existentes continuam funcionando sem coleção/tag definida (campo nullable)

## Regras obrigatórias
1. Campos de metadados são todos opcionais (nullable) para não quebrar documentos existentes
2. Não alterar schema de `document_chunks` — apenas `documents` recebe os novos campos
3. Não forçar migração de dados existentes — novos campos ficam null nos registros antigos
4. Não criar UI complexa antes de validar o backend

## Arquivos envolvidos

### Backend
- `docs/sql/` — novo SQL incremental de migração
- `backend/src/controllers/upload.controller.js` — aceitar metadados no upload
- `backend/src/routes/upload.routes.js` — campos opcionais no multipart
- `backend/src/services/vectorStore.service.js` — salvar metadados ao indexar
- `backend/src/services/retrieval.service.js` — aceitar filtro de escopo na busca
- `backend/src/controllers/ask.controller.js` — receber escopo no payload
- novo `backend/src/services/collection.service.js` — CRUD de coleções e tags
- nova rota `backend/src/routes/collection.routes.js`

### Frontend
- `frontend/index.html` — campos opcionais de metadados no upload
- `frontend/app.js` — enviar metadados e escopo

---

## ETAPA A1 — Schema incremental no Supabase

### Objetivo
Adicionar colunas de metadados à tabela `documents` sem alterar dados existentes.

### SQL a executar no Supabase (criar em `docs/sql/migration_v2_metadata.sql`)

```sql
-- Adiciona metadados opcionais à tabela documents
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS collection    TEXT,
  ADD COLUMN IF NOT EXISTS tags          TEXT[],
  ADD COLUMN IF NOT EXISTS tipo_doc      TEXT,
  ADD COLUMN IF NOT EXISTS fonte         TEXT,
  ADD COLUMN IF NOT EXISTS data_ref      DATE;

-- Índices para filtro eficiente
CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents (collection);
CREATE INDEX IF NOT EXISTS idx_documents_tags       ON documents USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_documents_tipo_doc   ON documents (tipo_doc);
```

### Checklist A1
- [ ] Arquivo SQL criado em `docs/sql/migration_v2_metadata.sql`
- [ ] SQL executado no Supabase sem erro
- [ ] Registros antigos confirmados com novos campos null (não quebraram)
- [ ] Índices criados com sucesso

### Validação A1
- Abrir tabela `documents` no Supabase e confirmar as 5 novas colunas
- Confirmar que registros anteriores têm `null` nos novos campos
- Confirmar que upload antigo ainda funciona sem enviar os novos campos

---

## ETAPA A2 — Service de coleções

### Objetivo
Criar `collection.service.js` com funções para listar coleções e tags disponíveis.

### Funções a implementar

```js
// Retorna lista de coleções únicas cadastradas
async function listCollections()

// Retorna lista de tags únicas cadastradas
async function listTags()

// Retorna lista de tipo_doc únicos cadastrados
async function listTiposDocs()
```

### Regras
- Consultas simples com `SELECT DISTINCT` no Supabase
- Ignorar valores null
- Retornar array vazio se não houver dados

### Checklist A2
- [ ] Arquivo `backend/src/services/collection.service.js` criado
- [ ] Função `listCollections` implementada e testada
- [ ] Função `listTags` implementada e testada
- [ ] Função `listTiposDocs` implementada e testada
- [ ] Nenhuma função quebra se tabela estiver vazia

---

## ETAPA A3 — Rota de metadados

### Objetivo
Expor endpoints para o frontend consultar coleções e tags disponíveis.

### Endpoints novos

```
GET /api/collections        → lista coleções únicas
GET /api/tags               → lista tags únicas
GET /api/tipodocs           → lista tipos de documento únicos
```

### Checklist A3
- [ ] Arquivo `backend/src/routes/collection.routes.js` criado
- [ ] Rotas registradas em `server.js`
- [ ] Teste manual dos 3 endpoints via curl ou Postman
- [ ] Retorno correto quando não há dados (array vazio, não erro 500)

---

## ETAPA A4 — Upload com metadados

### Objetivo
Aceitar coleção, tags e tipo_doc opcionais no upload. Salvar junto ao documento.

### Mudanças no upload

- `upload.routes.js`: aceitar campos `collection`, `tags` (string separada por vírgula), `tipo_doc`, `fonte`, `data_ref` no multipart
- `upload.controller.js`: extrair e sanitizar esses campos antes de salvar
- `vectorStore.service.js`: incluir os campos ao inserir em `documents`

### Regras
- Todos os campos são opcionais — upload sem metadados deve continuar funcionando
- `tags` recebido como string `"tag1,tag2"` deve ser convertido para array `["tag1","tag2"]`
- Sanitizar: trim, lowercase, remover vazios

### Checklist A4
- [ ] Upload sem metadados continua funcionando
- [ ] Upload com metadados salva corretamente no banco
- [ ] Tags convertidas de string para array corretamente
- [ ] Campos null não geram erro no Supabase
- [ ] Teste com documento real

---

## ETAPA A5 — Filtro de escopo na busca

### Objetivo
Aceitar escopo opcional na rota `/api/ask` e filtrar chunks por coleção ou tag.

### Mudança no payload de `/api/ask`

```json
{
  "question": "sua pergunta",
  "responseMode": "balanced",
  "scope": {
    "collection": "Direito",
    "tags": ["constitucional"]
  }
}
```

### Mudanças no backend

- `ask.controller.js`: extrair `scope` do body
- `retrieval.service.js`: passar `scope` para busca vetorial e textual
- `vectorStore.service.js`: aplicar filtro de `collection` e/ou `tags` na query antes da similaridade

### Regras
- `scope` é opcional — sem escopo, busca em todos os documentos (comportamento atual)
- Se `scope.collection` for `"all"` ou ausente, não filtrar
- Filtro aplicado via JOIN ou subquery em `documents`, não inline nos chunks

### Checklist A5
- [ ] Pergunta sem scope funciona igual ao comportamento anterior
- [ ] Pergunta com `scope.collection` retorna apenas chunks daquela coleção
- [ ] Pergunta com `scope.tags` retorna apenas chunks de documentos com aquela tag
- [ ] Score e fontes continuam sendo retornados corretamente
- [ ] Nenhum erro quando scope é passado mas coleção não existe

---

## ETAPA A6 — Frontend mínimo para metadados

### Objetivo
Adicionar campos opcionais no formulário de upload e seletor de escopo no chat.

### Mudanças no frontend

- `index.html`: adicionar inputs opcionais (coleção, tags, tipo) no form de upload
- `app.js`: incluir os campos no FormData do upload
- `index.html`: adicionar seletor de escopo no chat (dropdown ou chips)
- `app.js`: popular seletor com dados de `/api/collections` e `/api/tags`
- `app.js`: incluir `scope` no payload de `/api/ask`

### Regras
- Campos opcionais devem ter placeholder claro ("opcional")
- Seletor de escopo deve ter opção padrão "Todos os documentos"
- Não bloquear upload se campos estiverem vazios

### Checklist A6
- [ ] Upload com campos vazios funciona normalmente
- [ ] Upload com metadados preenchidos salva corretamente
- [ ] Seletor de escopo carrega coleções do backend
- [ ] Pergunta com escopo selecionado usa filtro correto
- [ ] Pergunta com "Todos" não aplica filtro

---

## REVISÃO DO BLOCO A

### Testes de regressão obrigatórios antes de avançar

- [ ] Upload de `.txt` sem metadados funciona
- [ ] Upload de `.md` sem metadados funciona
- [ ] Upload de `.pdf` sem metadados funciona
- [ ] Indexação gera chunks e embeddings normalmente
- [ ] Pergunta sem scope retorna resposta correta
- [ ] Fontes são retornadas corretamente
- [ ] `/api/health` retorna ok
- [ ] Documentos antigos (sem metadados) não causam erro no chat

### Log obrigatório ao final do Bloco A

```
[LOG A]
Data:
Agente:
Bloco: A — Metadados e Coleções
Etapas concluídas:
Arquivos criados:
Arquivos alterados:
SQL executado:
Validação executada:
Resultado:
Regressões encontradas:
Pendências:
Próximo bloco:
Observações:
```

---

# 3. BLOCO B — MELHORIA DE RECUPERAÇÃO

## Objetivo
Melhorar a qualidade dos chunks recuperados antes de montar o contexto do LLM.

## Resultado esperado
- chunking por estrutura lógica (título/parágrafo) em vez de só por tamanho fixo
- busca híbrida: vetorial + textual já existe parcialmente, melhorar integração e peso
- parent/adjacent chunks: ao recuperar um chunk relevante, incluir o chunk vizinho para dar mais contexto
- reranking simples dos top resultados antes de montar o prompt
- fallback claro quando scores são baixos

## Regras obrigatórias
1. Não alterar dimensão do vetor (768) — embedding existente continua
2. Chunking novo só afeta documentos novos — documentos já indexados não são reprocessados automaticamente
3. Reranking deve ser leve e local — não chamar API externa para reranking no MVP
4. Adjacent chunks só adicionados se não ultrapassarem limite de tokens definido

## Arquivos envolvidos

- `backend/src/services/chunking.service.js` — melhorar lógica de chunking
- `backend/src/services/retrieval.service.js` — adjacent chunks + reranking
- `backend/src/services/vectorStore.service.js` — busca com filtro de score mínimo

---

## ETAPA B1 — Chunking por estrutura

### Objetivo
Melhorar o chunker para tentar respeitar estrutura do documento antes de cair em corte por tamanho.

### Estratégia de chunking (ordem de prioridade)

1. Quebrar por títulos (linhas que começam com `#`, `##`, `###` para MD; linhas em caps ou curtas seguidas de parágrafo para TXT/PDF)
2. Quebrar por parágrafos (dupla quebra de linha `\n\n`)
3. Quebrar por frases (`.`, `!`, `?` seguidos de espaço)
4. Fallback: corte por tamanho fixo (comportamento atual)

### Parâmetros recomendados

```js
const CHUNK_SIZE = 1000;      // caracteres alvo por chunk
const CHUNK_OVERLAP = 150;    // overlap entre chunks
const MIN_CHUNK_SIZE = 200;   // chunks menores que isso são descartados ou fundidos
```

### Regras
- Chunk nunca pode ficar vazio
- Chunk não deve ultrapassar 2x o `CHUNK_SIZE` (senão cortar)
- Preservar título/header no início do chunk quando possível

### Checklist B1
- [ ] Chunker novo implementado
- [ ] Documentos `.md` com títulos geram chunks por seção
- [ ] Documentos `.txt` geram chunks por parágrafo
- [ ] Documentos `.pdf` usam fallback por tamanho se sem estrutura clara
- [ ] Nenhum chunk vazio ou abaixo de `MIN_CHUNK_SIZE` é indexado
- [ ] Quantidade de chunks por documento é razoável (não explodir em centenas)
- [ ] Chunking antigo ainda disponível como fallback configurável

---

## ETAPA B2 — Filtro de score mínimo

### Objetivo
Não retornar chunks com score de similaridade abaixo de um limiar mínimo.

### Implementação

```js
const MIN_SIMILARITY_SCORE = 0.65; // ajustar empiricamente
```

- Após busca vetorial, filtrar resultados com score < `MIN_SIMILARITY_SCORE`
- Se nenhum resultado passar do limiar, retornar array vazio
- `ask.controller.js` deve tratar array vazio e retornar mensagem de fallback clara:
  - "Não encontrei evidência suficiente nos documentos para responder a esta pergunta."

### Checklist B2
- [ ] Filtro de score implementado no `vectorStore.service.js`
- [ ] Perguntas sem resposta retornam mensagem de fallback (não erro 500)
- [ ] Perguntas com boa base nos documentos continuam funcionando
- [ ] Score mínimo configurável por variável de ambiente `MIN_SIMILARITY_SCORE`

---

## ETAPA B3 — Adjacent chunks

### Objetivo
Ao recuperar um chunk relevante, incluir o chunk imediatamente anterior e/ou posterior para dar contexto adicional ao LLM.

### Implementação

- Em `retrieval.service.js`, após recuperar top-k chunks:
  - Para cada chunk com `chunk_index > 0`, buscar chunk com `chunk_index - 1` do mesmo `document_id`
  - Para cada chunk, buscar chunk com `chunk_index + 1` do mesmo `document_id`
  - Adicionar vizinhos ao contexto apenas se não ultrapassar `MAX_CONTEXT_CHARS`
- Marcar chunks vizinhos como `"adjacent"` nas fontes retornadas (para não confundir com chunks primários)

### Parâmetros recomendados

```js
const MAX_CONTEXT_CHARS = 8000; // limite total do contexto enviado ao LLM
const INCLUDE_ADJACENT = true;  // configurável
```

### Checklist B3
- [ ] Adjacent chunks buscados corretamente por `document_id` + `chunk_index`
- [ ] Contexto total não ultrapassa `MAX_CONTEXT_CHARS`
- [ ] Chunks vizinhos não duplicam chunks já recuperados pela busca
- [ ] Fontes retornadas identificam quais chunks são primários e quais são adjacentes
- [ ] Feature desligável via configuração

---

## ETAPA B4 — Reranking local simples

### Objetivo
Reordenar os chunks recuperados antes de montar o prompt, priorizando os mais relevantes.

### Estratégia de reranking (sem API externa)

Pontuar cada chunk com score combinado:

```
score_final = (0.7 * score_vetorial) + (0.3 * score_textual)
```

Onde `score_textual` é calculado localmente por:
- contagem de termos da pergunta presentes no chunk (normalizado por tamanho)
- boost se o chunk pertence a documento da coleção selecionada no escopo

### Implementação

- Criar função `rerankChunks(question, chunks)` em `retrieval.service.js`
- Aplicar após merge de resultados vetoriais e textuais
- Retornar lista reordenada por `score_final` descendente

### Checklist B4
- [ ] Função `rerankChunks` implementada
- [ ] Score final calculado corretamente
- [ ] Chunks reordenados antes de montar contexto
- [ ] Sem chamada de API externa nesta etapa
- [ ] Resultado não piora em relação ao comportamento anterior

---

## REVISÃO DO BLOCO B

### Testes de regressão obrigatórios

- [ ] Upload e indexação funcionam normalmente com chunker novo
- [ ] Documentos antigos (chunks já indexados) continuam sendo recuperados
- [ ] Pergunta direta retorna resposta correta com fontes
- [ ] Pergunta fora do escopo dos documentos retorna fallback (não erro)
- [ ] Score mínimo não descarta chunks bons (ajustar threshold se necessário)
- [ ] Adjacent chunks não duplicam conteúdo no contexto
- [ ] Tempo de resposta não aumentou mais de 2x

### Log obrigatório ao final do Bloco B

```
[LOG B]
Data:
Agente:
Bloco: B — Melhoria de Recuperação
Etapas concluídas:
Arquivos criados:
Arquivos alterados:
Parâmetros ajustados:
Validação executada:
Resultado:
Regressões encontradas:
Pendências:
Próximo bloco:
Observações:
```

---

# 4. BLOCO C — QUALIDADE DE RESPOSTA

## Objetivo
Melhorar o que o LLM retorna: citar fontes com precisão, expor nível de confiança, limitar resposta quando evidência é fraca.

## Resultado esperado
- resposta sempre cita documento + trecho de onde veio a informação
- nível de confiança exposto (Alto / Médio / Baixo) baseado nos scores de retrieval
- resposta limitada/conservadora quando scores são baixos
- prompt do sistema atualizado para exigir citação explícita

## Arquivos envolvidos

- `backend/src/services/answer.service.js` — prompt e lógica de confiança
- `backend/src/prompts/rag.system.prompt.txt` — prompt base atualizado
- `backend/src/controllers/ask.controller.js` — incluir nível de confiança na resposta

---

## ETAPA C1 — Nível de confiança baseado em scores

### Objetivo
Calcular e retornar um nível de confiança com base nos scores dos chunks recuperados.

### Lógica recomendada

```js
function calcConfidence(chunks) {
  if (!chunks.length) return 'none';
  const avgScore = chunks.reduce((s, c) => s + c.score, 0) / chunks.length;
  if (avgScore >= 0.80) return 'high';
  if (avgScore >= 0.65) return 'medium';
  return 'low';
}
```

### Comportamento por nível

| Nível | Instrução adicional ao LLM |
|-------|---------------------------|
| high | Responda normalmente com base no contexto |
| medium | Responda, mas sinalize trechos onde a evidência é parcial |
| low | Prefira o fallback; só responda o que tiver evidência clara |
| none | Retorne mensagem de fallback diretamente, sem chamar LLM |

### Checklist C1
- [ ] Função `calcConfidence` implementada em `answer.service.js`
- [ ] Nível `none` retorna fallback sem chamar LLM (economiza tokens)
- [ ] Nível `low` instrui LLM a ser conservador
- [ ] Nível de confiança incluído na resposta JSON (`"confidence": "high"`)
- [ ] Frontend exibe o nível de confiança de forma simples

---

## ETAPA C2 — Prompt atualizado com instrução de citação

### Objetivo
Instruir o LLM a sempre citar explicitamente o documento de onde veio cada informação.

### Prompt base atualizado (`rag.system.prompt.txt`)

```
Você é um assistente de consulta documental.

Regras obrigatórias:
1. Responda apenas com base no CONTEXTO fornecido.
2. Não invente fatos. Não preencha lacunas com suposições.
3. Para cada afirmação relevante, cite a fonte entre parênteses: (Fonte: nome_do_arquivo, Trecho N).
4. Se a resposta não estiver claramente presente no contexto, diga:
   "Não encontrei evidência suficiente nos documentos enviados."
5. Seja objetivo e direto. Prefira clareza a completude.
6. Se o contexto trouxer informação parcial, responda o que for possível e indique o que não foi encontrado.
```

### Checklist C2
- [ ] Arquivo `rag.system.prompt.txt` atualizado
- [ ] Respostas passam a citar `(Fonte: arquivo.pdf, Trecho 2)` ou similar
- [ ] Fallback ainda funciona quando não há evidência
- [ ] Prompt não ficou longo demais (< 500 tokens)

---

## ETAPA C3 — Instrução dinâmica de confiança no prompt

### Objetivo
Adicionar instrução específica ao prompt baseada no nível de confiança calculado.

### Implementação em `answer.service.js`

```js
function getConfidenceInstruction(confidence) {
  if (confidence === 'low') {
    return `ATENÇÃO: Os trechos recuperados têm baixa similaridade com a pergunta.
Seja extra conservador. Só afirme o que estiver diretamente presente no contexto.
Se houver dúvida, prefira dizer que não encontrou evidência suficiente.`;
  }
  if (confidence === 'medium') {
    return `Os trechos recuperados têm similaridade moderada.
Responda o que o contexto permitir, mas sinalize explicitamente trechos onde a evidência é parcial.`;
  }
  return ''; // high: sem instrução adicional
}
```

### Checklist C3
- [ ] Instrução de confiança adicionada ao prompt dinamicamente
- [ ] Nível `high` não adiciona instrução desnecessária
- [ ] Nível `low` produz respostas mais conservadoras de forma perceptível
- [ ] Nível `none` nunca chama o LLM

---

## REVISÃO DO BLOCO C

### Testes de regressão obrigatórios

- [ ] Pergunta com boa base nos documentos retorna resposta completa com fontes
- [ ] Pergunta com base fraca retorna resposta conservadora ou fallback
- [ ] Pergunta sem nenhuma base retorna fallback sem chamar LLM
- [ ] JSON de resposta inclui `confidence`
- [ ] Frontend exibe confiança corretamente
- [ ] Modos `conservative`, `balanced`, `flexible` continuam funcionando

### Log obrigatório ao final do Bloco C

```
[LOG C]
Data:
Agente:
Bloco: C — Qualidade de Resposta
Etapas concluídas:
Arquivos criados:
Arquivos alterados:
Validação executada:
Resultado:
Regressões encontradas:
Pendências:
Próximo bloco:
Observações:
```

---

# 5. BLOCO D — USABILIDADE — BIBLIOTECA

## Objetivo
Criar tela de biblioteca para visualizar, filtrar e gerenciar documentos indexados.

## Resultado esperado
- tela (ou seção) "Biblioteca" com lista de documentos
- exibir: nome, coleção, tags, tipo, data de upload, tamanho, número de chunks
- filtros: por coleção, por tag, por tipo
- busca por nome de arquivo
- botão de excluir documento (com confirmação)
- preview do documento (opcional: primeiros 3 chunks)

## Regras obrigatórias
1. Exclusão deve remover documento, todos os chunks e embeddings associados
2. Exclusão deve ser confirmada pelo usuário antes de executar
3. Não implementar edição de metadados nesta etapa (só visualização)
4. Biblioteca pode ser aba ou seção na mesma página — não criar rota nova no frontend

## Arquivos envolvidos

- novo endpoint `GET /api/documents` — listar documentos com metadados
- novo endpoint `DELETE /api/documents/:id` — excluir documento e chunks
- `frontend/index.html` — seção de biblioteca
- `frontend/app.js` — lógica de listagem, filtro e exclusão
- `frontend/style.css` — estilos da biblioteca

---

## ETAPA D1 — Endpoint de listagem

### Endpoints novos

```
GET /api/documents
  query params opcionais:
    ?collection=X
    ?tag=Y
    ?tipo_doc=Z
    ?search=termo

Retorna:
[{
  id, filename, original_name, collection, tags,
  tipo_doc, fonte, data_ref, size_bytes, created_at,
  chunk_count  ← calculado via COUNT nos document_chunks
}]
```

### Checklist D1
- [ ] Endpoint implementado e testado
- [ ] Filtros opcionais funcionam individualmente e combinados
- [ ] `chunk_count` calculado por JOIN com `document_chunks`
- [ ] Retorno vazio quando nenhum documento existe (não erro)
- [ ] Ordenação padrão por `created_at DESC`

---

## ETAPA D2 — Endpoint de exclusão

### Endpoint

```
DELETE /api/documents/:id

Retorna:
{ "deleted": true, "document_id": "uuid" }
```

### Regras
- Excluir primeiro os `document_chunks` (FK), depois o `document`
- Excluir também o arquivo do Supabase Storage (se `FILE_STORAGE_PROVIDER=supabase`)
- Se qualquer etapa falhar, logar o erro mas não retornar 500 genérico — retornar mensagem clara
- Validar que o `id` existe antes de tentar excluir

### Checklist D2
- [ ] Chunks excluídos antes do documento (respeitar FK)
- [ ] Arquivo removido do Storage quando aplicável
- [ ] ID inexistente retorna 404 com mensagem clara
- [ ] Exclusão bem-sucedida retorna confirmação
- [ ] Busca e perguntas não quebram após exclusão

---

## ETAPA D3 — Frontend da biblioteca

### Componentes

- lista de documentos em cards ou tabela simples
- cada item exibe: nome, coleção, tags, data, chunks, tamanho
- barra de filtros: dropdown de coleção, dropdown de tag, input de busca
- botão "Excluir" com modal de confirmação
- estado vazio: "Nenhum documento indexado ainda"
- estado de loading durante carregamento

### Checklist D3
- [ ] Lista carrega ao abrir a biblioteca
- [ ] Filtros atualizam a lista sem recarregar a página
- [ ] Exclusão pede confirmação antes de executar
- [ ] Lista atualiza após exclusão bem-sucedida
- [ ] Estado vazio exibido corretamente
- [ ] Não quebra se um documento não tiver coleção/tags (nullable)

---

## REVISÃO DO BLOCO D

### Testes de regressão obrigatórios

- [ ] Upload ainda funciona normalmente
- [ ] Indexação ainda funciona normalmente
- [ ] Perguntas ainda funcionam normalmente
- [ ] Exclusão remove todos os dados associados
- [ ] Pergunta após exclusão não retorna chunks do documento excluído
- [ ] Biblioteca exibe documentos antigos (sem metadados) sem erro

### Log obrigatório ao final do Bloco D

```
[LOG D]
Data:
Agente:
Bloco: D — Biblioteca
Etapas concluídas:
Arquivos criados:
Arquivos alterados:
Validação executada:
Resultado:
Regressões encontradas:
Pendências:
Próximo bloco:
Observações:
```

---

# 6. BLOCO E — USABILIDADE — CHAT

## Objetivo
Melhorar a experiência do chat: histórico por conversa, painel de fontes clicável, botão nova conversa, chips de escopo.

## Resultado esperado
- histórico da conversa visível na tela durante a sessão
- painel lateral (ou abaixo) com fontes da última resposta, clicável
- botão "Nova conversa" limpa histórico e contexto
- chips de escopo para selecionar coleção/tag rapidamente
- indicador de confiança visível na resposta

## Observação importante
Este bloco é de **UX/frontend** — não altera lógica de RAG.
A memória conversacional persistida (Supabase) está planejada no plano original em seção separada e **não entra neste bloco**.
Aqui o histórico é apenas visual/sessão (não persiste entre reloads).

## Arquivos envolvidos

- `frontend/index.html`
- `frontend/app.js`
- `frontend/style.css`

---

## ETAPA E1 — Histórico visual da conversa

### Objetivo
Exibir as perguntas e respostas da sessão atual em formato de chat.

### Implementação

- Array `conversationHistory` em memória no frontend
- Cada item: `{ role: 'user'|'assistant', content, confidence, sources, timestamp }`
- Renderizar como bubbles ou blocos alternados
- Scroll automático para última mensagem

### Checklist E1
- [ ] Histórico exibe perguntas e respostas em ordem
- [ ] Scroll automático funciona
- [ ] Histórico limpo ao clicar "Nova conversa"
- [ ] Histórico não persiste entre reloads (apenas sessão)

---

## ETAPA E2 — Painel de fontes

### Objetivo
Exibir as fontes da última resposta de forma clara e organizada.

### Implementação

- Após cada resposta, renderizar lista de fontes com:
  - nome do arquivo
  - coleção (se houver)
  - trecho resumido (primeiros 200 chars do chunk)
  - score de similaridade (opcional, formatado como %)
  - indicação se é chunk primário ou adjacente
- Painel colapsável ou fixo abaixo da resposta

### Checklist E2
- [ ] Fontes exibidas após cada resposta
- [ ] Trecho resumido legível
- [ ] Score formatado adequadamente (ex: "92% similar")
- [ ] Painel não quebra quando não há fontes (fallback)
- [ ] Fontes limpas ao iniciar nova conversa

---

## ETAPA E3 — Chips de escopo e indicador de confiança

### Objetivo
Permitir selecionar escopo rapidamente com chips visuais e exibir confiança da resposta.

### Chips de escopo
- Renderizados a partir dos dados de `/api/collections`
- Chip "Todos" sempre presente e selecionado por padrão
- Seleção de chip define `scope` enviado no `/api/ask`
- Apenas um chip ativo por vez (radio behavior)

### Indicador de confiança
- Badge colorido ao lado da resposta: 🟢 Alta | 🟡 Média | 🔴 Baixa | ⚫ Sem evidência
- Baseado no campo `confidence` retornado pelo backend

### Checklist E3
- [ ] Chips carregam coleções disponíveis
- [ ] Chip selecionado visualmente destacado
- [ ] Escopo correto enviado ao backend
- [ ] Indicador de confiança exibido em todas as respostas
- [ ] Indicador correto para cada nível

---

## REVISÃO DO BLOCO E

### Testes de regressão obrigatórios

- [ ] Fluxo completo de pergunta/resposta funciona
- [ ] Upload ainda funciona na mesma tela
- [ ] Biblioteca ainda funciona
- [ ] Escopo "Todos" retorna comportamento original
- [ ] Nova conversa limpa corretamente
- [ ] Fontes exibidas corretamente para todos os modos de resposta

### Log obrigatório ao final do Bloco E

```
[LOG E]
Data:
Agente:
Bloco: E — Chat
Etapas concluídas:
Arquivos criados:
Arquivos alterados:
Validação executada:
Resultado:
Regressões encontradas:
Pendências:
Próximo bloco:
Observações:
```

---

# 7. BLOCO F — OPERAÇÃO E MÉTRICAS

## Objetivo
Adicionar observabilidade mínima para entender como o sistema está performando.

## Resultado esperado
- log de cada pergunta com: tempo de resposta, confiança, número de chunks, score médio, fallback ou não
- endpoint `/api/metrics` com resumo simples
- feedback simples no chat (👍 / 👎) salvo no banco
- conjunto de perguntas de teste para validação rápida

## Regras
1. Métricas salvas em tabela separada no Supabase — não poluir tabelas existentes
2. Feedback é opcional para o usuário — nunca bloquear a resposta
3. Não implementar dashboard complexo — apenas dados brutos acessíveis

## Arquivos envolvidos

- novo `docs/sql/migration_v2_metrics.sql`
- novo `backend/src/services/metrics.service.js`
- `backend/src/controllers/ask.controller.js` — salvar métricas após resposta
- nova rota `GET /api/metrics`
- novo endpoint `POST /api/feedback`
- `frontend/app.js` — botões de feedback

---

## ETAPA F1 — Schema de métricas

```sql
CREATE TABLE IF NOT EXISTS query_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question      TEXT,
  confidence    TEXT,
  chunk_count   INT,
  avg_score     FLOAT,
  response_ms   INT,
  was_fallback  BOOLEAN,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS query_feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id     UUID REFERENCES query_logs(id),
  feedback   TEXT CHECK (feedback IN ('positive','negative')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Checklist F1
- [ ] SQL executado sem erro
- [ ] Tabelas criadas no Supabase
- [ ] FK entre `query_feedback` e `query_logs` funciona

---

## ETAPA F2 — Service e log de métricas

### Implementação

```js
// metrics.service.js
async function logQuery({ question, confidence, chunkCount, avgScore, responseMs, wasFallback })
async function saveFeedback({ logId, feedback })
async function getSummary()  // retorna contagens e médias simples
```

### Checklist F2
- [ ] `logQuery` salva corretamente após cada resposta
- [ ] Falha no log não quebra a resposta ao usuário (try/catch isolado)
- [ ] `getSummary` retorna dados úteis
- [ ] `saveFeedback` vincula feedback ao log correto

---

## ETAPA F3 — Feedback no frontend

### Implementação

- Botões 👍 / 👎 abaixo de cada resposta
- Ao clicar, envia `POST /api/feedback` com `logId` e `feedback`
- Após envio, substituir botões por "Obrigado pelo feedback"
- `logId` retornado pelo backend junto com a resposta

### Checklist F3
- [ ] Botões visíveis após cada resposta
- [ ] Feedback enviado corretamente ao backend
- [ ] UI atualiza após envio (não permite enviar duas vezes)
- [ ] Falha no envio não quebra a interface

---

## REVISÃO DO BLOCO F

### Testes de regressão obrigatórios

- [ ] Toda a stack anterior continua funcionando
- [ ] Falha no log não impacta resposta
- [ ] Falha no feedback não impacta resposta
- [ ] `/api/metrics` retorna dados sem erro
- [ ] `/api/health` ainda retorna ok

### Log obrigatório ao final do Bloco F

```
[LOG F]
Data:
Agente:
Bloco: F — Operação e Métricas
Etapas concluídas:
Arquivos criados:
Arquivos alterados:
SQL executado:
Validação executada:
Resultado:
Regressões encontradas:
Pendências:
Próximo bloco: nenhum (fim do plano v2.0)
Observações:
```

---

# 8. CONJUNTO DE PERGUNTAS DE TESTE RECOMENDADAS

Criar arquivo `docs/test_questions.md` com 30-50 perguntas reais dos documentos indexados.

Estrutura sugerida para cada pergunta:

```md
**Pergunta:** Qual é o princípio da legalidade segundo o documento X?
**Documento esperado:** X.pdf
**Resposta esperada (resumo):** ...
**Confiança esperada:** high
**Resultado obtido:** (preencher a cada execução)
**Data do teste:** (preencher)
```

Rodar o conjunto completo:
- antes de cada bloco novo
- depois de cada bloco concluído
- ao trocar modelo de LLM ou embedding
- ao alterar parâmetros de chunking ou topK

---

# 9. VARIÁVEIS DE AMBIENTE ADICIONAIS

Adicionar ao `.env.example`:

```env
# RAG — Recuperação
TOP_K=4
TEXT_FALLBACK_K=4
MIN_SIMILARITY_SCORE=0.65
MAX_CONTEXT_CHARS=8000
INCLUDE_ADJACENT_CHUNKS=true

# Chunking
CHUNK_SIZE=1000
CHUNK_OVERLAP=150
MIN_CHUNK_SIZE=200

# Groq (se usar Groq como LLM)
GROQ_API_KEY=
GROQ_LLM_MODEL=llama-3.1-8b-instant
```

---

# 10. ORDEM FINAL DE EXECUÇÃO RECOMENDADA

1. Bloco A — Metadados e Coleções (base para tudo)
2. Bloco B — Melhoria de Recuperação (core do RAG)
3. Bloco C — Qualidade de Resposta (depende de B para scores)
4. Bloco D — Biblioteca (independente, pode ser paralelo a C)
5. Bloco E — Chat (depende de C para confiança)
6. Bloco F — Métricas (depende de todos para logar corretamente)

---

# 11. REGRAS PARA O AGENTE EXECUTOR

1. Ler este plano inteiro antes de começar qualquer implementação
2. Executar uma etapa por vez — nunca pular etapa
3. Validar a etapa anterior antes de avançar
4. Registrar log ao final de cada bloco (não só ao final de tudo)
5. Não trocar stack sem motivo forte e sem registrar em `docs/decisions.md`
6. Não alterar schema existente — apenas ADD COLUMN IF NOT EXISTS, nunca DROP
7. Não remover compatibilidade com documentos já indexados
8. Em caso de dúvida entre elegância e simplicidade: escolher simplicidade
9. Em caso de regressão: parar tudo, corrigir, só então continuar
10. Commits pequenos e descritivos por etapa

---

# 12. LOG DE ABERTURA DESTE PLANO

```
[LOG v2.0-00]
Data: 2026-04-09
Agente: Claude
Fase: Planejamento
Escopo: criação do plano de melhorias RAG v2.0
Objetivo: definir blocos, etapas, checklists e regras para evolução segura do MVP
Arquivos criados: plano-melhorias-rag-v2.0.md
Arquivos alterados: nenhum
Dependências instaladas: nenhuma
Comandos executados: nenhum
Validação executada: revisão estrutural do plano
Resultado: plano criado com 6 blocos, checklists por etapa, testes de regressão e logs obrigatórios
Pendências: implementação técnica não iniciada
Próximo passo: iniciar Bloco A — Etapa A1 (schema incremental)
Observações: sempre validar regressão antes de avançar entre blocos
```
