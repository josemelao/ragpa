# PLANO DE AÇÃO — MVP RAG PESSOAL V1.0
**Projeto:** MVP WebApp RAG pessoal (upload de arquivos + perguntas sobre documentos)  
**Stack-alvo:** custo zero / free tier / pronto para evoluir  
**Ferramenta principal de execução:** Claude Code  
**Data de abertura:** 2026-04-06  
**Status geral:** EM EXECUCAO — MVP funcional com pendencias de consolidacao e evolucao

---

# 0. OBJETIVO

Este documento define o plano operacional para construir um **MVP simples de RAG** (Retrieval-Augmented Generation) para uso pessoal, com foco em:

1. Permitir **upload de arquivos** (PDF, TXT, MD inicialmente)
2. Permitir **perguntas em linguagem natural**
3. Responder com base nos **documentos enviados**
4. Manter **custo zero** no MVP
5. Usar stack simples, com baixo atrito para desenvolvimento em **HTML/CSS/JS**
6. Ser evolutivo para futura escala sem retrabalho absurdo

---

# 1. RESULTADO ESPERADO DO MVP

Ao final da v1.0, a aplicação deve permitir:

- abrir uma página web simples
- fazer upload de 1 ou mais arquivos
- processar os arquivos localmente ou no backend
- quebrar os documentos em chunks
- gerar embeddings dos chunks
- salvar os chunks + embeddings em banco vetorial
- fazer uma pergunta no chat
- buscar os chunks mais relevantes
- enviar contexto + pergunta para o LLM
- retornar uma resposta baseada nos documentos
- opcionalmente exibir os **trechos-fonte** usados

---

# 2. STACK DEFINIDA (CUSTO ZERO)

## 2.1 Frontend
**Stack**
- HTML
- CSS
- JavaScript puro (Vanilla JS)

**Motivo**
- zero custo
- simples
- fácil de hospedar
- ideal para MVP
- compatível com GitHub Pages no futuro (se separar backend)

---

## 2.2 Backend
**Stack**
- Node.js
- Express.js

**Motivo**
- simples
- fácil de integrar com frontend HTML/JS
- enorme compatibilidade com bibliotecas
- ótimo para MVP local

---

## 2.3 Banco de dados vetorial
**Stack**
- Supabase (free tier)
- PostgreSQL + pgvector

**Motivo**
- grátis no início
- flexível
- fácil de escalar
- ótimo para RAG
- melhor que improvisar com Google Drive como “banco”

---

## 2.4 Armazenamento de arquivos
**Opção escolhida no MVP**
- armazenamento local no backend (`/uploads`)

**Motivo**
- mais simples
- zero custo
- sem complexidade inicial

**Evolução futura**
- Supabase Storage (quando quiser publicar ou escalar)

---

## 2.5 Embeddings
**Stack sugerida (custo zero)**
- Google Gemini Embeddings API (free tier, se disponível na sua conta/projeto)

**Fallback**
- OpenRouter com modelo gratuito de embedding (se houver oferta no momento)
- ou embeddings locais no futuro (mais complexo)

**Observação**
- verificar limite gratuito vigente no momento da implementação

---

## 2.6 LLM para resposta
**Stack sugerida (custo zero)**
- Google Gemini API (modelo gratuito disponível no período)

**Fallback**
- OpenRouter com modelos gratuitos
- ou Groq (se houver modelo útil disponível gratuitamente)

**Regra**
- sempre encapsular em um `llmProvider.js` para poder trocar depois sem reescrever o app

---

## 2.7 Parse de arquivos
**Bibliotecas sugeridas**
- PDF: `pdf-parse`
- TXT: nativo
- MD: nativo
- (DOCX opcional futura fase): `mammoth`

---

# 3. ARQUITETURA DO MVP

## Fluxo completo

1. Usuário faz upload do arquivo
2. Backend salva arquivo localmente
3. Backend extrai o texto
4. Backend limpa o texto
5. Backend quebra em chunks
6. Backend gera embedding de cada chunk
7. Backend salva:
   - nome do documento
   - metadados
   - chunk
   - embedding
8. Usuário faz pergunta
9. Backend gera embedding da pergunta
10. Backend busca chunks similares no Supabase (pgvector)
11. Backend monta contexto
12. Backend envia contexto + pergunta ao LLM
13. Backend retorna resposta
14. Frontend exibe resposta + fontes

---

# 4. ESTRUTURA DE PASTAS RECOMENDADA

```txt
rag-mvp/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── backend/
│   ├── server.js
│   ├── .env
│   ├── package.json
│   ├── uploads/
│   ├── src/
│   │   ├── config/
│   │   │   └── env.js
│   │   ├── routes/
│   │   │   ├── upload.routes.js
│   │   │   └── chat.routes.js
│   │   ├── services/
│   │   │   ├── fileParser.js
│   │   │   ├── chunker.js
│   │   │   ├── embeddingService.js
│   │   │   ├── vectorStore.js
│   │   │   ├── retrievalService.js
│   │   │   ├── llmProvider.js
│   │   │   └── ragService.js
│   │   ├── db/
│   │   │   └── supabaseClient.js
│   │   └── utils/
│   │       └── logger.js
├── docs/
│   └── AGENT_LOG.md
└── README.md
```

---

# 5. ESQUEMA DE BANCO (SUPABASE)

## 5.1 Tabela `documents`

Campos sugeridos:
- `id` (uuid)
- `filename` (text)
- `original_name` (text)
- `mime_type` (text)
- `size_bytes` (bigint)
- `created_at` (timestamp)

---

## 5.2 Tabela `document_chunks`

Campos sugeridos:
- `id` (uuid)
- `document_id` (uuid)
- `chunk_index` (int)
- `chunk_text` (text)
- `embedding` (vector)
- `created_at` (timestamp)

---

## 5.3 Índices
- índice por `document_id`
- índice vetorial em `embedding`

---

# 6. ESCOPO DA V1.0 (O QUE ENTRA)

## Entram
- upload de PDF/TXT/MD
- chunking simples
- embeddings
- busca vetorial
- resposta com contexto
- interface simples
- exibição de fontes
- logs operacionais

## Não entram
- autenticação
- multiusuário
- permissões
- OCR
- DOCX complexo
- planilhas
- upload massivo
- fila de processamento
- re-ranking avançado
- streaming de resposta
- memória de conversa longa

---

# 7. PRINCÍPIOS OBRIGATÓRIOS

1. Sempre preferir a solução **mais simples que funcione**
2. Sempre manter o backend **modular**
3. Nunca acoplar diretamente frontend ao provedor de IA
4. Nunca expor chave de API no frontend
5. Sempre deixar o provedor de IA trocável
6. Trabalhar por blocos pequenos e validáveis
7. Registrar tudo no log do agente
8. Priorizar funcionamento antes de “embelezamento”

---

# 8. PASSO A PASSO DE EXECUÇÃO (CLAUDE CODE)

# FASE 1 — INICIALIZAÇÃO DO PROJETO

## Objetivo
Criar a estrutura base e deixar frontend + backend rodando.

## Passos
1. Criar pasta do projeto
2. Criar estrutura de diretórios
3. Inicializar `backend/package.json`
4. Instalar dependências:
   - `express`
   - `cors`
   - `dotenv`
   - `multer`
   - `pdf-parse`
   - `@supabase/supabase-js`
5. Criar `server.js`
6. Criar rota healthcheck (`GET /health`)
7. Criar frontend mínimo com:
   - área de upload
   - input de pergunta
   - botão enviar
   - área de resposta

## Critério de conclusão
- backend sobe sem erro
- frontend abre no navegador
- `/health` responde OK

---

# FASE 2 — INTEGRAÇÃO COM SUPABASE

## Objetivo
Conectar o backend ao banco vetorial.

## Passos
1. Criar projeto no Supabase (free tier)
2. Ativar extensão `vector` / `pgvector`
3. Criar tabelas:
   - `documents`
   - `document_chunks`
4. Criar índices
5. Criar `supabaseClient.js`
6. Testar conexão

## Critério de conclusão
- backend consegue inserir e ler um registro de teste

---

# FASE 3 — UPLOAD E PARSE DE ARQUIVOS

## Objetivo
Receber arquivos e extrair texto.

## Passos
1. Criar rota `POST /upload`
2. Configurar `multer`
3. Salvar arquivo em `/uploads`
4. Detectar tipo do arquivo
5. Extrair texto:
   - PDF com `pdf-parse`
   - TXT/MD com leitura nativa
6. Validar se texto não está vazio
7. Salvar metadados em `documents`

## Critério de conclusão
- upload de PDF/TXT/MD funcionando
- texto extraído com sucesso

---

# FASE 4 — CHUNKING

## Objetivo
Quebrar o documento em pedaços úteis para RAG.

## Estratégia inicial recomendada
- chunk por caracteres
- tamanho: **700 a 1000 caracteres**
- overlap: **100 a 150 caracteres**

## Passos
1. Criar `chunker.js`
2. Limpar texto:
   - remover espaços excessivos
   - normalizar quebras de linha
3. Quebrar em chunks
4. Gerar `chunk_index`
5. Validar se chunks não ficaram vazios

## Critério de conclusão
- qualquer documento vira lista consistente de chunks

---

# FASE 5 — EMBEDDINGS

## Objetivo
Gerar embedding para cada chunk.

## Passos
1. Criar `embeddingService.js`
2. Integrar com provedor escolhido (Gemini preferencial)
3. Criar função:
   - `generateEmbedding(text)`
4. Para cada chunk:
   - gerar embedding
   - validar retorno
5. Salvar em `document_chunks`

## Critério de conclusão
- chunks persistidos com embedding no Supabase

---

# FASE 6 — BUSCA VETORIAL

## Objetivo
Buscar os chunks mais relevantes para uma pergunta.

## Passos
1. Criar função SQL/RPC no Supabase para similaridade vetorial
2. Criar `vectorStore.js`
3. Criar `retrievalService.js`
4. Fluxo:
   - gerar embedding da pergunta
   - buscar top 5 chunks
   - retornar texto + score + origem

## Critério de conclusão
- pergunta retorna chunks relevantes

---

# FASE 7 — RESPOSTA RAG

## Objetivo
Gerar resposta final baseada nos chunks recuperados.

## Passos
1. Criar `llmProvider.js`
2. Criar `ragService.js`
3. Montar prompt padrão:
   - instrução: responder somente com base no contexto
   - contexto: chunks
   - pergunta do usuário
4. Criar rota `POST /chat`
5. Retornar:
   - resposta
   - fontes usadas
   - chunks relevantes

## Critério de conclusão
- o app responde com base nos documentos

---

# FASE 8 — FRONTEND FUNCIONAL

## Objetivo
Conectar UI ao backend.

## Componentes mínimos
- input file
- botão upload
- status de upload
- textarea/input de pergunta
- botão perguntar
- bloco de resposta
- bloco de fontes

## Critério de conclusão
- fluxo ponta a ponta funcional no navegador

---

# FASE 9 — REFINO MÍNIMO

## Objetivo
Deixar o MVP utilizável.

## Melhorias recomendadas
1. Mostrar lista de arquivos já processados
2. Mostrar loading no upload
3. Mostrar loading na pergunta
4. Exibir erros claros
5. Exibir fontes em formato simples
6. Limitar tamanho máximo de upload
7. Impedir arquivos não suportados

## Critério de conclusão
- experiência básica consistente

---

# 9. PROMPT PADRÃO DO RAG (RECOMENDADO)

## Regra do sistema
- Responda somente com base no contexto fornecido.
- Se a informação não estiver no contexto, diga claramente que não encontrou nos documentos.
- Não invente.
- Cite os trechos relevantes quando possível.

---

# 10. CUSTOS (REALIDADE PRÁTICA)

## MVP local / testes pessoais
**Custo esperado:** R$ 0

### Componentes
- Frontend local: grátis
- Backend local: grátis
- Supabase free: grátis
- GitHub: grátis
- Claude Code: depende do seu acesso/plano, mas o projeto em si não exige custo extra
- Gemini free tier: potencialmente grátis dentro do limite

---

## Riscos de custo zero
1. limite de requests de IA
2. limite de embeddings
3. limite do Supabase free
4. mudança de política dos provedores

**Regra prática:**  
O MVP deve nascer com **camada de abstração** para trocar LLM/embedding sem refazer o sistema.

---

# 11. RISCOS TÉCNICOS PRINCIPAIS

## Alto risco
- chave de API exposta no frontend
- embeddings incompatíveis com dimensão da coluna `vector`
- PDFs escaneados sem texto (não funciona sem OCR)
- chunks grandes demais
- prompt sem instrução anti-alucinação
- depender de modelo gratuito sem fallback

## Médio risco
- parsing ruim de PDFs complexos
- resultados irrelevantes por chunking ruim
- resposta boa no teste e ruim em docs grandes

## Baixo risco
- UI simples/feia
- falta de histórico
- falta de autenticação no MVP local

---

# 12. REGRAS PARA O AGENTE (CLAUDE CODE)

## Regra mestra
Sempre fazer **uma fase por vez**.

## Regras obrigatórias
1. Não misturar backend e frontend grande no mesmo passo sem necessidade
2. Não trocar stack no meio da execução sem registrar motivo
3. Não acoplar código diretamente ao Gemini sem camada de serviço
4. Não criar complexidade prematura
5. Sempre validar antes de seguir para próxima fase
6. Sempre atualizar o log ao final de cada microetapa
7. Sempre registrar o que foi feito e o que ainda falta

---

# 13. CHECKLIST DE EXECUÇÃO POR BLOCO

- [x] Escopo da etapa definido
- [x] Arquivos alvo definidos
- [x] Dependências instaladas
- [x] Implementação mínima aplicada
- [x] Teste local executado
- [x] Erros corrigidos
- [x] Resultado registrado no log
- [x] Próxima etapa identificada

---

# 14. MODELO DE LOG OPERACIONAL (OBRIGATÓRIO)

Usar este modelo ao final de cada microetapa:

```txt
[LOG XX]
Data:
Agente:
Fase:
Escopo:
Objetivo:
Arquivos criados:
Arquivos alterados:
Dependências instaladas:
Comandos executados:
Validação executada:
Resultado:
Pendências:
Próximo passo:
Observações:
```

---

# 15. LOG DE ABERTURA

```txt
[LOG 00]
Data: 2026-04-06
Agente: ChatGPT
Fase: Planejamento
Escopo: criação do plano operacional do MVP RAG v1.0
Objetivo: definir stack custo zero, arquitetura, fases, regras de execução e padrão de log
Arquivos criados: este plano
Arquivos alterados: nenhum
Dependências instaladas: nenhuma
Comandos executados: nenhum
Validação executada: revisão estrutural do documento
Resultado: plano inicial criado
Pendências: execução técnica completa ainda não iniciada
Próximo passo: Fase 1 — inicialização do projeto
Observações: manter o projeto simples, modular e com provider de IA desacoplado
```

---

# 16. ORDEM RECOMENDADA DE EXECUÇÃO

1. Criar estrutura de pastas
2. Inicializar backend Node/Express
3. Criar frontend mínimo
4. Conectar Supabase
5. Criar tabelas
6. Implementar upload
7. Implementar parse de arquivos
8. Implementar chunking
9. Implementar embeddings
10. Persistir chunks
11. Implementar busca vetorial
12. Implementar rota `/chat`
13. Integrar frontend ao backend
14. Exibir fontes
15. Refinar UX mínima
16. Registrar tudo em `docs/AGENT_LOG.md`

---

# 17. ARQUIVOS QUE O AGENTE DEVE CRIAR PRIMEIRO

## Obrigatórios
- `frontend/index.html`
- `frontend/style.css`
- `frontend/app.js`
- `backend/server.js`
- `backend/.env.example`
- `backend/src/db/supabaseClient.js`
- `backend/src/services/fileParser.js`
- `backend/src/services/chunker.js`
- `backend/src/services/embeddingService.js`
- `backend/src/services/vectorStore.js`
- `backend/src/services/retrievalService.js`
- `backend/src/services/llmProvider.js`
- `backend/src/services/ragService.js`
- `backend/src/routes/upload.routes.js`
- `backend/src/routes/chat.routes.js`
- `docs/AGENT_LOG.md`
- `README.md`

---

# 18. CRITÉRIOS DE CONCLUSÃO DA V1.0

A v1.0 pode ser considerada concluída quando:

1. o app sobe localmente sem erro
2. o upload de PDF/TXT/MD funciona
3. o texto é extraído corretamente
4. o documento é chunkado
5. os embeddings são gerados
6. os chunks são salvos no Supabase
7. a busca vetorial retorna trechos relevantes
8. a pergunta ao chat retorna resposta baseada no contexto
9. as fontes aparecem na interface
10. os logs estão atualizados

---

# 19. PRÓXIMA EVOLUÇÃO (V1.1 SUGERIDA)

Depois do MVP funcionando, as melhores evoluções são:

1. adicionar DOCX
2. adicionar exclusão de documentos
3. adicionar listagem de documentos
4. adicionar filtro por documento
5. mover arquivos para Supabase Storage
6. adicionar autenticação
7. adicionar histórico de conversas
8. melhorar chunking por parágrafo/título
9. adicionar OCR para PDFs escaneados
10. publicar frontend separadamente e backend em host free

---

# 20. RECOMENDAÇÃO FINAL AOS PRÓXIMOS AGENTES

Não tratar este projeto como “plataforma enterprise”.

Tratar como **MVP de validação técnica**, com foco em:

- simplicidade
- baixo custo
- modularidade
- capacidade real de responder sobre documentos
- base limpa para escalar depois

Sempre:

1. implementar o mínimo viável
2. validar rápido
3. registrar no log
4. só então avançar para a próxima fase
---

# 21. LOGS DE EXECUCAO DA SESSAO 2026-04-06

```txt
[LOG 01]
Data: 2026-04-06
Agente: Codex
Fase: Correcao de embeddings e schema vetorial
Escopo: resolver erro 404 do embedding Gemini e erro 54000 do ivfflat no Supabase
Objetivo: alinhar modelo, dimensao do vetor e SQL do banco
Arquivos criados: nenhum
Arquivos alterados:
- backend/src/services/embedding.service.js
- docs/sql/init.sql
Dependencias instaladas: nenhuma
Comandos executados:
- buscas locais com rg
- leitura dos arquivos de backend e SQL
- validacao com node --check
Validacao executada:
- conferencia entre dimensao do embedding e vector(N)
- validacao de sintaxe Node nos arquivos alterados
Resultado:
- embedding trocado para gemini-embedding-001
- outputDimensionality fixado em 768
- SQL ajustado para vector(768)
- indice ivfflat voltou a ser compativel
Pendencias:
- recriar schema no Supabase se o schema antigo de 3072 ja tiver sido aplicado
Proximo passo:
- retestar upload e indexacao
Observacoes:
- a tentativa anterior com 3072 falhava porque ivfflat nao aceita mais de 2000 dimensoes em vector
```

```txt
[LOG 02]
Data: 2026-04-06
Agente: Codex
Fase: Correcao do LLM Gemini
Escopo: resolver erro 404 e erros 400 no generateContent
Objetivo: deixar a etapa de resposta RAG funcional
Arquivos criados: nenhum
Arquivos alterados:
- backend/src/services/answer.service.js
Dependencias instaladas: nenhuma
Comandos executados:
- leitura do answer.service.js
- consultas na documentacao oficial da Gemini
- validacao com node --check
Validacao executada:
- checagem de sintaxe do servico
- retestes do usuario apos cada ajuste
Resultado:
- modelo atualizado para gemini-2.5-flash
- endpoint de generateContent ajustado
- chave enviada via header x-goog-api-key
- prompt de sistema incorporado ao conteudo do usuario para contornar rejeicao pratica de system_instruction
- fluxo de perguntas passou a funcionar
Pendencias:
- nenhuma bloqueante no fluxo principal
Proximo passo:
- revisar UX e consistencia documental
Observacoes:
- a documentacao oficial aceita system_instruction, mas o endpoint/chave em uso rejeitou esse campo na pratica
```

```txt
[LOG 03]
Data: 2026-04-06
Agente: Codex
Fase: Correcao de encoding no upload
Escopo: resolver nomes de arquivo com caracteres corrompidos na interface e no banco
Objetivo: preservar nomes corretos em Unicode e corrigir casos de mojibake
Arquivos criados: nenhum
Arquivos alterados:
- backend/src/routes/upload.routes.js
Dependencias instaladas: nenhuma
Comandos executados:
- leitura das rotas de upload e do frontend
- validacao com node --check
Validacao executada:
- revisao do ponto de entrada do multer
- ajuste de heuristica para normalizar apenas nomes com padrao de mojibake
Resultado:
- upload preserva nomes corretos em Unicode
- nomes com padrao tipico como "DoaÃ§Ã£o" sao corrigidos no upload
Pendencias:
- documentos ja gravados com nome corrompido no banco nao sao corrigidos automaticamente
Proximo passo:
- reenviar arquivos antigos ou corrigir os registros no Supabase
Observacoes:
- conversao forcada em todos os casos piorava nomes que ja chegavam corretos
```

```txt
[LOG 04]
Data: 2026-04-06
Agente: Codex
Fase: Atualizacao de documentacao
Escopo: alinhar README e plano ao estado real do projeto apos as correcoes
Objetivo: deixar a documentacao coerente com o codigo e registrar a sessao
Arquivos criados: nenhum
Arquivos alterados:
- README.md
- plano-mvp-rag-v1.0.md
Dependencias instaladas: nenhuma
Comandos executados: nenhum relevante alem de leitura e edicao de arquivos
Validacao executada:
- revisao manual dos pontos alterados na documentacao
Resultado:
- README atualizado com stack, configuracao e estado atual
- plano atualizado com logs desta sessao
Pendencias:
- opcionalmente atualizar logs adicionais em logs/AGENT_LOG.md
Proximo passo:
- preparar publicacao no GitHub com .gitignore adequado
Observacoes:
- documentacao agora reflete o uso atual de Gemini para embeddings e LLM
```

```txt
[LOG 05]
Data: 2026-04-06
Agente: Codex
Fase: Melhoria do modelo de respostas e da recuperacao
Escopo: reduzir limitacoes do RAG em strings literais e perguntas sobre o inventario de documentos
Objetivo: melhorar recall, permitir listagem explicita de documentos indexados e evitar respostas limitadas por retrieval puramente vetorial
Arquivos criados: nenhum
Arquivos alterados:
- backend/src/controllers/ask.controller.js
- backend/src/services/retrieval.service.js
- backend/src/services/vectorStore.service.js
Dependencias instaladas: nenhuma
Comandos executados:
- leitura dos controllers e services do fluxo de pergunta
- validacao com node --check
- criacao de commit incremental
Validacao executada:
- checagem de sintaxe dos arquivos alterados
- revisao do diff do backend
Resultado:
- perguntas como "quais documentos estao indexados?" passaram a usar listagem direta do inventario
- retrieval passou a ser hibrido: texto literal + vetor
- strings entre aspas e termos exatos passaram a ter caminho de busca textual
- os resultados textuais e vetoriais passaram a ser mesclados sem duplicacao
Pendencias:
- opcionalmente exibir no frontend o tipo de match (text ou vector)
Proximo passo:
- testar cenarios com nomes exatos, numeros, codigos e perguntas de inventario
Observacoes:
- o LLM continua dependente dos chunks recuperados, entao perguntas de inventario nao devem passar pelo fluxo RAG normal
```

---

# 22. PLANO DE MIGRACAO PARA SUPABASE STORAGE (UPLOAD 100% NA NUVEM)

## Objetivo

Migrar o armazenamento de arquivos do backend local para o Supabase Storage, eliminando a dependencia de `backend/uploads`, sem quebrar:

- upload de `.txt`, `.md` e `.pdf`
- parsing de conteudo
- chunking
- embeddings
- persistencia vetorial
- perguntas no RAG
- nomes de arquivos com acentos e caracteres especiais
- compatibilidade com documentos ja indexados

## Resultado esperado apos a migracao

Ao final da migracao:

- nenhum arquivo novo deve ser salvo no disco local
- o arquivo original deve ficar armazenado em bucket do Supabase Storage
- o backend deve continuar processando o arquivo para extracao de texto
- o banco deve continuar salvando metadados, chunks e embeddings
- o sistema deve continuar funcionando para upload, listagem e perguntas
- o nome original do arquivo deve continuar correto de ponta a ponta

## Regras de seguranca para o agente que executar

1. Nao remover o fluxo atual de uma vez sem antes criar compatibilidade temporaria.
2. Nao assumir que `multer.diskStorage` pode ser trocado sem impacto no parser.
3. Nao alterar o schema de `documents` sem plano de migracao dos dados existentes.
4. Nao introduzir nova quebra de encoding em `original_name`.
5. Nao expor bucket publico sem necessidade.
6. Nao salvar caminhos locais no banco para novos documentos apos a migracao.
7. Nao apagar suporte a documentos antigos ate existir estrategia clara de convivencia.
8. Nao commitar chaves, URLs sensiveis ou politicas inseguras no repo.

## Estrategia recomendada

### Fase A - Preparar compatibilidade

- criar bucket no Supabase Storage, preferencialmente privado
- adicionar variaveis de ambiente para bucket e modo de storage
- manter o fluxo atual funcionando enquanto o novo caminho e implementado
- introduzir camada de abstracao para storage, em vez de espalhar chamadas do Supabase Storage pelo codigo

### Fase B - Fazer upload em memoria

- trocar `multer.diskStorage` por `memoryStorage`
- garantir limite de tamanho coerente para nao explodir memoria
- normalizar `file.originalname` antes de qualquer persistencia
- enviar o buffer diretamente para o Supabase Storage

### Fase C - Parse a partir da nuvem

- para `.txt` e `.md`, usar o buffer ja recebido no upload ou o arquivo baixado do Storage
- para `.pdf`, usar buffer em memoria para `pdf-parse`, sem depender de arquivo em disco
- desacoplar o parser da necessidade de `filePath`

### Fase D - Persistencia de metadados

- salvar no banco a chave do objeto no bucket
- manter `original_name`, `mime_type`, `size_bytes` e `created_at`
- se necessario, adicionar coluna nova como `storage_path`
- nao reutilizar `filename` com semantica ambigua se isso gerar confusao entre nome interno e nome original

### Fase E - Convivencia com legado

- documentos antigos podem continuar sem `storage_path`
- o sistema deve continuar lendo documentos antigos sem exigir migracao imediata
- uploads novos passam a usar apenas Storage
- migracao retroativa de arquivos antigos deve ser opcional e separada

## Checklist de implementacao

- [x] Definir o nome do bucket no Supabase Storage
- [ ] Definir se o bucket sera privado ou publico
- [x] Adicionar variaveis de ambiente como `SUPABASE_STORAGE_BUCKET` e opcionalmente `FILE_STORAGE_PROVIDER`
- [x] Criar service dedicado para storage, por exemplo `storage.service.js`
- [x] Implementar funcao de upload para buffer no Supabase Storage
- [x] Implementar funcao de download para buffer no Supabase Storage
- [x] Implementar funcao opcional de delete no Supabase Storage
- [x] Trocar `multer.diskStorage` por `multer.memoryStorage`
- [x] Preservar a heuristica atual de correcao de encoding de `originalname`
- [x] Ajustar o parser para aceitar buffer alem de caminho local
- [x] Garantir que `pdf-parse` funcione a partir de buffer
- [x] Garantir que `.txt` e `.md` sejam lidos de buffer com UTF-8
- [x] Revisar necessidade de fallback para arquivos com BOM ou encoding inesperado
- [x] Definir formato de chave do objeto no bucket sem depender de nome original puro
- [x] Continuar guardando `original_name` separado da chave tecnica do objeto
- [x] Revisar se `documents.filename` sera reutilizado ou substituido por `storage_path`
- [ ] Se houver mudanca de schema, criar SQL de migracao incremental em vez de sobrescrever dados existentes
- [x] Garantir que novos uploads nao escrevam mais em `backend/uploads`
- [x] Garantir que erros de upload no Storage abortem a indexacao inteira de forma limpa
- [x] Garantir que erro de parsing nao deixe lixo inconsistente no bucket sem politica definida
- [x] Definir politica de rollback em caso de falha apos upload do arquivo mas antes de salvar chunks
- [x] Revisar limites de tamanho e memoria para upload em buffer
- [x] Testar upload de `.txt` com acentos
- [x] Testar upload de `.md` com acentos
- [x] Testar upload de `.pdf` com nome acentuado
- [x] Testar listagem de documentos apos a migracao
- [x] Testar perguntas RAG apos a migracao
- [x] Testar perguntas de inventario de documentos
- [x] Testar strings literais apos a migracao
- [ ] Confirmar que nenhum arquivo novo esta sendo criado em `backend/uploads`
- [x] Atualizar README e logs quando a migracao for concluida

## Checklist de validacao funcional

- [x] Upload retorna sucesso e salva o arquivo no bucket
- [x] Nome original aparece corretamente na UI
- [x] Metadados aparecem corretamente na lista de documentos
- [x] Texto do arquivo e extraido corretamente
- [x] Chunks sao persistidos no banco
- [x] Embeddings sao gerados normalmente
- [x] Busca vetorial continua funcionando
- [x] Busca textual continua funcionando
- [x] Resposta RAG continua funcionando
- [x] Nao ha dependencia de arquivo local para uploads novos

## Checklist de seguranca e integridade

- [ ] Bucket configurado com politica minima necessaria
- [x] Service role usada apenas no backend
- [x] Nenhuma chave sensivel exposta ao frontend
- [x] Falha de upload nao cria registro incompleto no banco
- [x] Falha de indexacao nao deixa estado inconsistente sem log
- [x] Chave do objeto no bucket nao depende de input bruto do usuario sem sanitizacao
- [x] `original_name` e preservado sem corromper encoding

## Ordem recomendada de execucao

1. Criar abstracao de storage
2. Adicionar configuracao do bucket
3. Migrar upload para memoria
4. Subir arquivo para o Storage
5. Ajustar parser para buffer
6. Persistir metadados do Storage no banco
7. Garantir rollback e tratamento de erro
8. Testar todos os tipos de arquivo
9. Confirmar ausencia de escrita local
10. Atualizar documentacao

## Riscos tecnicos especificos

- uso de memoria maior por `memoryStorage` em arquivos grandes
- regressao no parsing de PDF se alguma parte ainda depender de caminho local
- regressao de encoding no nome do arquivo
- inconsistencia entre bucket e banco se nao houver ordem de operacoes clara
- bucket configurado de forma insegura

## Decisoes recomendadas antes da implementacao

- bucket privado por padrao
- chave tecnica do objeto separada de `original_name`
- parser baseado em buffer como caminho principal
- compatibilidade temporaria com registros antigos
- migracao dos arquivos antigos como tarefa separada, nao no mesmo PR

---

# 23. LOGS DE EXECUCAO DA MIGRACAO PARA STORAGE

```txt
[LOG 06]
Data: 2026-04-06
Agente: Codex
Fase: Preparacao da migracao para Supabase Storage
Escopo: criar base de configuracao e abstracao de storage antes de trocar o fluxo de upload
Objetivo: preparar o backend para suportar provider de arquivos configuravel sem quebrar o fluxo existente
Arquivos criados:
- backend/src/services/storage.service.js
Arquivos alterados:
- backend/src/config/env.js
- backend/src/config/supabase.js
- backend/.env.example
Dependencias instaladas: nenhuma
Comandos executados:
- leitura dos arquivos de configuracao e upload
- validacao com node --check
Validacao executada:
- checagem de sintaxe dos arquivos de configuracao e storage
Resultado:
- provider de arquivos passou a ser configuravel por `FILE_STORAGE_PROVIDER`
- bucket de storage passou a ser configuravel por `SUPABASE_STORAGE_BUCKET`
- foi criada camada centralizada para upload, download, remocao e chave tecnica de objeto
Pendencias:
- migrar o fluxo real de upload para memoria e buffer
Proximo passo:
- trocar `multer.diskStorage` por `memoryStorage`
Observacoes:
- nesta etapa ainda nao havia corte funcional completo para cloud-only
```

```txt
[LOG 07]
Data: 2026-04-06
Agente: Codex
Fase: Migracao funcional do upload para memoria e provider de storage
Escopo: remover dependencia de `req.file.path` e preparar parsing/persistencia sem disco local para uploads novos
Objetivo: fazer o upload usar buffer em memoria e persistir arquivo pelo provider configurado
Arquivos criados: nenhum
Arquivos alterados:
- backend/src/routes/upload.routes.js
- backend/src/controllers/upload.controller.js
- backend/src/services/fileParser.service.js
- backend/src/services/storage.service.js
Dependencias instaladas: nenhuma
Comandos executados:
- leitura das rotas, controller, parser e storage service
- validacao com node --check
- testes funcionais do usuario
Validacao executada:
- checagem de sintaxe dos arquivos alterados
- verificacao de ausencia de `req.file.path` e `diskStorage`
- teste de upload com provider configurado
Resultado:
- `multer.memoryStorage()` passou a ser o mecanismo de entrada
- parser passou a aceitar buffer para `.txt`, `.md` e `.pdf`
- controller passou a persistir arquivo via provider e fazer cleanup em caso de falha
- uploads novos deixaram de depender de caminho local no backend
Pendencias:
- reforcar observabilidade e healthcheck do provider de arquivos
Proximo passo:
- expor status de storage no healthcheck e validar bucket
Observacoes:
- heuristica de encoding do nome original foi preservada no fluxo novo
```

```txt
[LOG 08]
Data: 2026-04-06
Agente: Codex
Fase: Validacao operacional do modo cloud-only
Escopo: fechar a observabilidade do provider de arquivos e validar upload no Supabase Storage
Objetivo: confirmar que o sistema ja opera com Storage em nuvem para uploads novos
Arquivos criados: nenhum
Arquivos alterados:
- backend/src/server.js
- backend/src/services/storage.service.js
- backend/.env
Dependencias instaladas: nenhuma
Comandos executados:
- leitura de configuracao e server
- healthcheck em `/api/health`
- reinicio do backend
- testes repetidos de upload
Validacao executada:
- `supabase: ok`
- `fileStorage: ok (bucket:documents)`
- documento enviado com sucesso para o Supabase Storage
- validacao manual do usuario confirmando funcionamento
Resultado:
- upload novo validado em modo `FILE_STORAGE_PROVIDER=supabase`
- bucket `documents` reconhecido no healthcheck
- fluxo ponta a ponta voltou a funcionar apos renovacao de credenciais
Pendencias:
- remover do versionamento o `.env` e sanear o repositorio por conta do vazamento anterior
- opcionalmente migrar ou descartar arquivos locais legados em `backend/uploads`
Proximo passo:
- registrar commit da etapa e endurecer higiene de segredos no repo
Observacoes:
- esta etapa confirmou a operacao em nuvem para uploads novos; os arquivos antigos locais continuam apenas como legado
```

---

# 24. PLANO DE MEMORIA CONVERSACIONAL CONTROLADA (CHAT COM CONTEXTO CURTO + RESUMO)

## Objetivo

Adicionar memoria conversacional ao chat para melhorar perguntas de continuidade, sem transformar a conversa em fonte principal da verdade e sem aumentar alucinacao.

O foco deve permanecer em:

- contexto recuperado dos documentos
- continuidade curta de conversa
- resumo operacional da sessao
- respostas com prioridade total para os documentos

## Resultado esperado apos a implementacao

Ao final desta evolucao:

- o usuario podera continuar uma conversa sem repetir tudo a cada pergunta
- o sistema lembrara o contexto recente da sessao
- o backend mantera um resumo curto da conversa para preservar contexto sem inflar o prompt
- o modelo continuara respondendo com base principal nos documentos
- follow-ups como "e esse documento?", "resuma melhor isso", "qual a data mesmo?" passarao a funcionar melhor
- o usuario podera iniciar nova conversa para limpar o contexto

## Principio obrigatorio desta feature

A memoria conversacional nao pode competir com o RAG documental.

Regra operacional:

1. documentos sao a fonte principal de verdade
2. historico da conversa so serve para resolver referencia, continuidade e foco
3. resumo da conversa nao pode introduzir fatos novos
4. se historico e documentos entrarem em conflito, vencem os documentos
5. se a conversa sugerir algo nao sustentado pelos documentos, o modelo deve recusar

## Escopo da memoria recomendada

### Entra

- memoria curta da conversa por sessao
- persistencia no Supabase
- resumo progressivo da conversa
- historico recente de mensagens
- botao ou acao clara de "nova conversa"
- envio de `conversationId` no frontend
- reuso do mesmo chat para multiplas perguntas relacionadas

### Nao entra nesta fase

- memoria longa entre usuarios diferentes
- memoria sem limite
- aprendizagem automatica fora do contexto da conversa
- "perfil do usuario" persistente
- recomendacao baseada em historico global
- resumo sem rastreabilidade

## Desenho recomendado

### Estrategia de memoria hibrida

Usar 3 camadas no backend:

1. pergunta atual
2. ultimas mensagens da conversa
3. resumo curto consolidado da conversa

Montagem recomendada do prompt:

1. instrucoes do sistema
2. modo de resposta selecionado pelo usuario
3. resumo da conversa
4. ultimas mensagens relevantes
5. chunks recuperados dos documentos
6. pergunta atual

### Regra de prioridade no prompt

O prompt deve deixar explicito:

- use o historico apenas para entender referencia e continuidade
- use os documentos como base da resposta
- nao trate afirmacoes anteriores do assistente como prova factual
- nunca prefira o historico sobre o contexto documental atual

## Schema recomendado no Supabase

### Tabela `conversations`

Campos sugeridos:

- `id` (uuid)
- `title` (text, opcional)
- `summary` (text, opcional)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Tabela `conversation_messages`

Campos sugeridos:

- `id` (uuid)
- `conversation_id` (uuid)
- `role` (text) -> `user` | `assistant`
- `content` (text)
- `sources_json` (jsonb, opcional)
- `created_at` (timestamp)

### Indices sugeridos

- indice por `conversation_id`
- indice por `created_at`
- opcionalmente ordenacao por `created_at desc` para leitura das ultimas mensagens

## Regras de seguranca para o agente executor

1. Nao misturar memoria conversacional com retrieval documental no mesmo service sem separacao clara.
2. Nao montar prompt a partir de historico inteiro sem limite.
3. Nao resumir a conversa com liberdade excessiva; o resumo deve ser conservador e rastreavel.
4. Nao salvar mensagens sem vinculo a `conversation_id`.
5. Nao quebrar o fluxo atual de perguntas sem conversa ativa.
6. Nao remover a resposta sem memoria; deve existir fallback seguro.
7. Nao deixar a ausencia de memoria quebrar o chat.
8. Nao deixar o resumo carregar "fatos" nao sustentados pelos documentos.
9. Nao salvar credenciais, dados sensiveis ou payloads desnecessarios nas mensagens.
10. Nao alterar comportamento de exclusao de documentos sem revisar impacto no historico salvo.

## Estrategia por fases

### Fase A - Preparacao de schema e abstracao

Objetivo:
- criar as tabelas e services de conversa sem ligar ainda no fluxo principal

Escopo:
- SQL incremental
- service de persistencia de conversa
- funcoes de criar, carregar e atualizar conversa

Validacao esperada:
- backend consegue criar conversa e inserir mensagens de teste

Bugs a procurar:
- mensagens sem `conversation_id`
- leitura fora de ordem
- falha de integridade ao apagar conversa

### Fase B - Persistencia da conversa no backend

Objetivo:
- permitir criar conversa, buscar historico recente e salvar novas mensagens

Escopo:
- `conversation.service.js`
- rotas para criar conversa e carregar historico
- persistencia das mensagens do usuario e do assistente

Validacao esperada:
- uma pergunta cria ou atualiza uma conversa existente
- mensagens ficam recuperaveis em ordem cronologica

Bugs a procurar:
- duplicacao de mensagens
- respostas salvas sem texto
- perda de conversa entre requests

### Fase C - Integracao minima com o frontend

Objetivo:
- enviar `conversationId` em cada pergunta e permitir "nova conversa"

Escopo:
- guardar `conversationId` no frontend
- criar nova conversa automaticamente na primeira pergunta
- acao clara de limpar/iniciar conversa

Validacao esperada:
- perguntas seguidas usam a mesma conversa
- ao iniciar nova conversa, o contexto anterior deixa de influenciar a resposta

Bugs a procurar:
- frontend reaproveitando conversa errada
- `conversationId` nulo sendo enviado de forma inconsistente
- historico visual e backend divergindo

### Fase D - Historico curto no prompt

Objetivo:
- enviar as ultimas mensagens ao modelo, com limite seguro

Escopo:
- incluir ultimas 4 a 8 mensagens no prompt
- separar claramente historico e contexto documental
- manter chunks como base principal

Validacao esperada:
- follow-ups simples melhoram sem degradar respostas diretas

Bugs a procurar:
- historico muito grande
- perda de foco nos documentos
- modelo respondendo com base na conversa anterior em vez dos chunks atuais

### Fase E - Resumo progressivo da conversa

Objetivo:
- manter um resumo curto e conservador da sessao

Escopo:
- gerar/rescrever resumo a cada N mensagens ou ao final de cada rodada
- limitar tamanho do resumo
- registrar apenas fatos conversacionais uteis:
  - assunto atual
  - documentos em foco
  - perguntas respondidas
  - ambiguidades resolvidas

Validacao esperada:
- contexto se preserva mesmo quando o historico curto nao basta
- prompt continua controlado em tamanho

Bugs a procurar:
- resumo inventando fatos
- resumo contradizendo mensagens reais
- resumo crescendo sem limite

### Fase F - Endurecimento anti-alucinacao

Objetivo:
- reforcar no prompt a hierarquia entre memoria e documentos

Escopo:
- instrucoes especificas no `answer.service`
- regras para desconsiderar memoria quando nao sustentada por documentos
- comportamento claro em casos ambigos

Validacao esperada:
- memoria melhora follow-up sem soltar resposta fora dos documentos

Bugs a procurar:
- assistente citando memoria como prova
- resposta herdando erro de uma rodada anterior
- uso excessivo de contexto antigo

### Fase G - UX final e validacao de regressao

Objetivo:
- deixar a feature usavel, controlada e observavel

Escopo:
- botao de nova conversa
- opcionalmente lista de conversas depois, mas nao obrigatorio nesta fase
- logs atualizados
- README e plano atualizados

Validacao esperada:
- usuario entende quando esta continuando a conversa atual
- nova conversa limpa o contexto corretamente

Bugs a procurar:
- UI mostrando conversa limpa enquanto backend reaproveita contexto
- reload da pagina perdendo estado de forma inesperada
- historico visual diferente do historico real salvo

## Ordem recomendada de execucao

1. Criar schema incremental no Supabase
2. Criar service de conversa no backend
3. Criar endpoints minimos de conversa
4. Integrar `conversationId` no frontend
5. Persistir mensagens
6. Incluir historico curto no prompt
7. Implementar resumo progressivo
8. Endurecer prompt anti-alucinacao
9. Adicionar "nova conversa"
10. Fazer testes de regressao
11. Atualizar documentacao e logs

## Checklist detalhado de implementacao

- [x] Definir schema de `conversations`
- [x] Definir schema de `conversation_messages`
- [x] Criar SQL incremental seguro
- [x] Criar service dedicado para conversa
- [x] Criar funcao para criar conversa
- [x] Criar funcao para carregar conversa por ID
- [x] Criar funcao para listar ultimas mensagens
- [x] Criar funcao para salvar mensagem do usuario
- [x] Criar funcao para salvar mensagem do assistente
- [x] Criar funcao para atualizar `updated_at` da conversa
- [x] Criar estrutura para `summary`
- [x] Definir limite maximo de mensagens recentes no prompt
- [x] Definir limite maximo de tamanho do resumo
- [x] Ajustar `ask.controller` para aceitar `conversationId`
- [x] Ajustar `answer.service` para montar prompt com memoria
- [x] Garantir separacao visual/semantica entre:
  - resumo da conversa
  - historico recente
  - contexto dos documentos
- [x] Garantir fallback quando nao houver conversa
- [x] Garantir fallback quando nao houver resumo
- [x] Garantir fallback quando o resumo falhar
- [x] Definir gatilho de atualizacao do resumo
- [ ] Garantir que o resumo nao seja atualizado em caso de erro de resposta
- [x] Persistir `conversationId` no frontend
- [x] Criar acao de "nova conversa"
- [x] Limpar o estado local ao iniciar nova conversa
- [ ] Confirmar que follow-up funciona com a mesma conversa
- [ ] Confirmar que follow-up nao vaza para nova conversa
- [ ] Testar com documentos reais
- [ ] Atualizar README
- [ ] Atualizar este plano com logs de execucao

## Checklist de validacao por etapa

### Validacao do usuario - Etapa 1

Escopo:
- schema criado
- backend criando conversas e mensagens

Como testar:
- criar uma conversa
- enviar uma pergunta com `conversationId`
- verificar se as mensagens foram salvas no banco

Bugs a procurar:
- mensagens fora de ordem
- conversa nao encontrada
- erro de integridade no Supabase

### Validacao do usuario - Etapa 2

Escopo:
- frontend envia e reaproveita `conversationId`

Como testar:
- fazer duas perguntas em sequencia
- confirmar que o backend usa a mesma conversa
- iniciar nova conversa e repetir

Bugs a procurar:
- segunda pergunta indo para outra conversa
- nova conversa herdando memoria antiga
- refresh da pagina gerando comportamento incoerente

### Validacao do usuario - Etapa 3

Escopo:
- historico curto embutido no prompt

Como testar:
- perguntar algo
- fazer follow-up curto como "e qual a data?" ou "resuma melhor isso"
- conferir se o sistema entende a referencia

Bugs a procurar:
- follow-up respondido sem base nos documentos
- assistente preso demais na rodada anterior
- piora em perguntas independentes

### Validacao do usuario - Etapa 4

Escopo:
- resumo progressivo ativo

Como testar:
- conduzir conversa com varias trocas
- conferir se referencias antigas ainda funcionam
- testar tambem pergunta nova e nao relacionada

Bugs a procurar:
- resumo inventando fatos
- conversa ficando "viciada" em um topico antigo
- perda de foco nos chunks atuais

### Validacao do usuario - Etapa 5

Escopo:
- endurecimento final e regressao

Como testar:
- perguntar algo diretamente presente no documento
- perguntar algo parcialmente suportado
- perguntar algo ausente
- fazer follow-up ambiguo
- iniciar nova conversa

Bugs a procurar:
- alucinacao por memoria
- documento sendo ignorado em favor da conversa
- contexto antigo contaminando conversa nova

## Testes de regressao obrigatorios

- [ ] Upload continua funcionando
- [ ] Indexacao continua funcionando
- [ ] Listagem de documentos continua funcionando
- [ ] Exclusao de documentos continua funcionando
- [ ] Busca textual continua funcionando
- [ ] Busca vetorial continua funcionando
- [ ] Modo de resposta `Conservadora` continua conservador
- [ ] Modo de resposta `Equilibrada` continua intermediario
- [ ] Modo de resposta `Flexivel` continua controlado
- [ ] Pergunta sem `conversationId` continua funcionando
- [ ] Pergunta com `conversationId` funciona com continuidade
- [ ] Nova conversa realmente limpa o contexto

## Casos de teste recomendados

### Caso 1 - Pergunta direta

- Usuario: "Qual a data do recibo?"
- Esperado: resposta baseada apenas nos chunks relevantes

### Caso 2 - Follow-up curto

- Usuario: "Qual a data do recibo?"
- Usuario: "E o valor?"
- Esperado: segunda pergunta reaproveita o foco do documento e da pergunta anterior

### Caso 3 - Follow-up ambiguo

- Usuario: "Qual a data do recibo?"
- Usuario: "E esse documento?"
- Esperado: assistente usa memoria curta para entender referencia, mas ancora a resposta nos documentos

### Caso 4 - Mudanca de assunto na mesma conversa

- Usuario: pergunta sobre documento A
- Usuario: pergunta sobre documento B
- Esperado: sistema acompanha a mudanca com base no retrieval atual

### Caso 5 - Nova conversa

- Usuario: conversa longa sobre documento A
- Usuario: inicia nova conversa
- Usuario: pergunta generica
- Esperado: nenhum contexto anterior influencia a resposta

## Decisoes recomendadas antes de codar

- persistir memoria no Supabase, nao so em memoria RAM
- usar resumo curto e conservador
- limitar historico recente por quantidade e tamanho
- deixar a memoria ligada por conversa, nao global
- implementar "nova conversa" antes de considerar lista de conversas
- manter documentos acima da memoria na hierarquia do prompt

## Arquivos provavelmente envolvidos

### Backend

- `backend/src/controllers/ask.controller.js`
- `backend/src/services/answer.service.js`
- `backend/src/services/retrieval.service.js`
- `backend/src/services/vectorStore.service.js`
- novo `backend/src/services/conversation.service.js`
- possivelmente novas rotas para conversa
- SQL incremental em `docs/sql/` ou equivalente

### Frontend

- `frontend/app.js`
- `frontend/index.html`
- `frontend/style.css`

### Documentacao

- `README.md`
- `plano-mvp-rag-v1.0.md`

## Modelo de log especifico desta feature

```txt
[LOG MEM XX]
Data:
Agente:
Fase:
Escopo:
Objetivo:
Arquivos criados:
Arquivos alterados:
Dependencias instaladas:
Comandos executados:
Validacao executada:
Resultado:
Como testar:
Bugs procurados:
Pendencias:
Proximo passo:
Observacoes:
```

## Area de logs reservada para esta implementacao

```txt
[LOG MEM 00]
Data: 2026-04-06
Agente: Codex
Fase: Planejamento da memoria conversacional controlada
Escopo: definir estrategia segura de memoria curta + resumo para o chat RAG
Objetivo: preparar um plano executavel por etapas, com validacao do usuario, regressao e controle de alucinacao
Arquivos criados: nenhum
Arquivos alterados:
- plano-mvp-rag-v1.0.md
Dependencias instaladas: nenhuma
Comandos executados:
- leitura do plano atual
- edicao do plano
Validacao executada:
- revisao estrutural do plano
- alinhamento com a arquitetura atual do projeto
Resultado:
- plano detalhado de memoria conversacional adicionado
- estrategia definida com prioridade documental, historico curto e resumo conservador
Como testar:
- nao se aplica nesta etapa; apenas planejamento
Bugs procurados:
- nao se aplica nesta etapa; apenas planejamento
Pendencias:
- implementacao tecnica ainda nao iniciada
Proximo passo:
- iniciar Fase A com schema de conversa e service dedicado
Observacoes:
- a memoria deve melhorar continuidade sem competir com o contexto dos documentos
```

```txt
[LOG 09]
Data: 2026-04-09
Agente: Codex
Fase: Consolidacao de checklist e status do plano
Escopo: revisar o plano e marcar itens concluidos com base em logs e implementacao atual
Objetivo: separar claramente o que ja foi feito do que ainda esta pendente
Arquivos criados: nenhum
Arquivos alterados:
- plano-mvp-rag-v1.0.md
Dependencias instaladas: nenhuma
Comandos executados:
- leitura do plano e checklists
- leitura de arquivos de backend (storage, upload, parser, retrieval, answer, config)
Validacao executada:
- cruzamento entre LOG 01-08 e codigo atual
Resultado:
- checklist de migracao para Supabase Storage atualizado com itens concluidos
- checklist funcional e de integridade atualizado com evidencias do codigo e testes reportados
- status geral atualizado para "EM EXECUCAO"
Pendencias:
- definir e validar politica do bucket (privado/publico e politicas minimas)
- confirmar operacionalmente ausencia de novos arquivos em `backend/uploads` no ambiente atual
- decidir e executar (ou descartar) migracao de legado em `backend/uploads`
- concluir plano de memoria conversacional (schema, backend, frontend, validacao)
Proximo passo:
- executar a fase A da memoria conversacional e atualizar SQL/servicos/rotas com validacao
Observacoes:
- itens marcados como concluidos foram baseados em implementacao existente e logs previos; itens de governanca/politica permanecem em aberto
```

```txt
[LOG MEM 01]
Data: 2026-04-09
Agente: Codex
Fase: Memoria conversacional - Fase A (schema e service base)
Escopo: criar estruturas persistentes de conversa no Supabase e service backend dedicado
Objetivo: preparar a base tecnica da memoria sem alterar ainda o fluxo principal do /api/ask
Arquivos criados:
- docs/sql/2026-04-09-conversations.sql
- backend/src/services/conversation.service.js
- backend/src/controllers/conversation.controller.js
- backend/src/routes/conversation.routes.js
Arquivos alterados:
- backend/src/server.js
- plano-mvp-rag-v1.0.md
Dependencias instaladas: nenhuma
Comandos executados:
- leitura de SQL e backend atuais
- validacao de integracao local por leitura estrutural dos modulos
Validacao executada:
- verificacao de rotas registradas em /api/conversations
- revisao de consistencia entre schema e service
Resultado:
- schema incremental criado com `conversations` e `conversation_messages`
- trigger para atualizar `updated_at` da conversa em novas mensagens
- service com funcoes de criar/buscar conversa, listar mensagens, salvar mensagens e atualizar resumo
- endpoints minimos criados para criar conversa e consultar conversa/mensagens
Como testar:
- aplicar SQL incremental no Supabase
- POST /api/conversations
- GET /api/conversations/:id
- GET /api/conversations/:id/messages
Bugs procurados:
- integridade de chave estrangeira entre mensagem e conversa
- limite e ordenacao de mensagens por `created_at`
Pendencias:
- integrar `conversationId` no fluxo de pergunta (`/api/ask`)
- persistir mensagens user/assistant dentro do fluxo RAG
- incluir historico curto e resumo no prompt
- implementar "nova conversa" no frontend
Proximo passo:
- iniciar Fase B/C com integracao de `conversationId` em backend e frontend
Observacoes:
- esta etapa nao altera a resposta do chat atual; apenas prepara infraestrutura para continuidade
```

```txt
[LOG MEM 02]
Data: 2026-04-09
Agente: Codex
Fase: Memoria conversacional - Fase B/C (integracao backend/frontend)
Escopo: integrar `conversationId` no fluxo de perguntas e habilitar controle de conversa no frontend
Objetivo: persistir mensagens por conversa e permitir iniciar nova conversa sem reaproveitar contexto antigo
Arquivos criados: nenhum
Arquivos alterados:
- backend/src/controllers/ask.controller.js
- frontend/index.html
- frontend/app.js
- frontend/style.css
- plano-mvp-rag-v1.0.md
Dependencias instaladas: nenhuma
Comandos executados:
- leitura dos arquivos de rota/controller/frontend
- validacao com `node --check`
Validacao executada:
- checagem de sintaxe de `ask.controller.js` e `frontend/app.js`
- confirmacao de envio/recebimento de `conversationId` no fluxo
Resultado:
- `/api/ask` passou a aceitar `conversationId` opcional
- quando `conversationId` nao e enviado, o backend cria conversa automaticamente
- mensagens `user` e `assistant` passam a ser persistidas em `conversation_messages`
- resposta de `/api/ask` retorna `conversationId`
- frontend passou a persistir `conversationId` em `localStorage`
- frontend ganhou botao "Nova conversa" que limpa contexto local e mensagens visiveis
Como testar:
- fazer pergunta sem `conversationId` e verificar retorno com `conversationId`
- fazer segunda pergunta e confirmar continuidade com mesmo `conversationId`
- clicar "Nova conversa" e confirmar novo `conversationId` na proxima pergunta
Bugs procurados:
- conversa inexistente enviada pelo cliente
- perda de estado local apos refresh
- reaproveitamento indevido de conversa apos "Nova conversa"
Pendencias:
- integrar historico curto e resumo no prompt (`answer.service`)
- validar follow-up com documentos reais e atualizar checklist de regressao
Proximo passo:
- Fase D/E: enviar ultimas mensagens e resumo para o prompt com limites de tamanho
Observacoes:
- a feature ja persiste conversa, mas ainda nao usa historico na geracao da resposta
```

```txt
[LOG MEM 03]
Data: 2026-04-09
Agente: Codex
Fase: Memoria conversacional - robustez de continuidade (retrieval + prompt)
Escopo: reduzir perda de contexto em follow-ups curtos e perguntas por referencia de documento
Objetivo: melhorar continuidade sem abrir mao da regra de resposta baseada em documentos
Arquivos criados: nenhum
Arquivos alterados:
- backend/src/controllers/ask.controller.js
- backend/src/services/retrieval.service.js
- backend/src/services/vectorStore.service.js
- backend/src/services/answer.service.js
- plano-mvp-rag-v1.0.md
Dependencias instaladas: nenhuma
Comandos executados:
- ajustes iterativos no fluxo de pergunta
- validacoes locais com `node --check`
- testes manuais de perguntas sequenciais com documentos reais
Validacao executada:
- tratamento de `conversationId` invalido com criacao automatica de nova conversa
- continuidade de retrieval para follow-up curto
- priorizacao de documento citado no texto da pergunta
- envio de historico curto da conversa para o prompt de resposta
Resultado:
- backend passou a evitar erro bloqueante por `conversationId` invalido
- retrieval passou a combinar vetor+texto+nome de documento e priorizacao de documento previamente citado
- fontes passaram a carregar `documentId` para ancoragem de follow-up
- `answer.service` passou a montar prompt com bloco de historico recente (limite curto) e regras de continuidade
Como testar:
- "quais documentos estao indexados"
- "oficio 55 fala sobre o que"
- "com que objetivo?"
- "o trator que a secretaria solicitou tem quantas linhas"
Bugs procurados:
- retorno "nao encontrei" com documento claramente indexado
- perda de referencia em perguntas curtas de continuidade
- erro de conversa por id inexistente
Pendencias:
- implementar resumo progressivo de conversa (`summary`) e limites dedicados para esse bloco
- endurecer heuristica para follow-up ambiguo em cenarios com varios documentos semelhantes
- rodar checklist formal de regressao de memoria (secao de testes obrigatorios)
Proximo passo:
- Fase E/F: resumo progressivo + regras anti-alucinacao com prioridade documental explicita
Observacoes:
- houve melhora pratica de continuidade, mas o comportamento ainda nao esta 100% estavel em todas as formulacoes curtas
```

```txt
[LOG MEM 04]
Data: 2026-04-09
Agente: Codex
Fase: Memoria conversacional - resumo progressivo e prompt estruturado
Escopo: consolidar resumo curto da conversa e usar no prompt junto ao historico recente
Objetivo: melhorar continuidade em follow-up sem perder prioridade documental
Arquivos criados: nenhum
Arquivos alterados:
- backend/src/controllers/ask.controller.js
- backend/src/services/answer.service.js
- plano-mvp-rag-v1.0.md
Dependencias instaladas: nenhuma
Comandos executados:
- ajuste de controller e service de resposta
- validacao com `node --check`
Validacao executada:
- resumo curto passou a ser recalculado e salvo em `conversations.summary` apos resposta do assistente
- prompt passou a conter blocos separados: resumo, historico e contexto documental
- fallback para ausencia de resumo/historico e falha de atualizacao do resumo
Resultado:
- limite de historico recente e limite de tamanho do resumo definidos no backend
- gatilho de atualizacao de resumo implementado por rodada de resposta
- continuidade melhor estruturada para perguntas referenciais
Como testar:
- iniciar conversa sobre um documento
- fazer follow-ups curtos ("com que objetivo?", "e quantas linhas?")
- verificar se a resposta preserva o assunto sem exigir repeticao completa
Bugs procurados:
- perda de contexto em perguntas curtas
- atualizacao de resumo causando erro na resposta principal
Pendencias:
- refinar ainda mais heuristica de follow-up ambiguo entre documentos semelhantes
- executar checklist formal de regressao da memoria (secao 1516+)
Proximo passo:
- rodar bateria de testes de regressao e calibrar thresholds de retrieval/follow-up
Observacoes:
- resumo atual e conservador e derivado das ultimas mensagens; nao usa LLM dedicado para sumarizacao nesta fase
```
