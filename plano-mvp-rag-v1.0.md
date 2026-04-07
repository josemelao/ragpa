# PLANO DE AÇÃO — MVP RAG PESSOAL V1.0
**Projeto:** MVP WebApp RAG pessoal (upload de arquivos + perguntas sobre documentos)  
**Stack-alvo:** custo zero / free tier / pronto para evoluir  
**Ferramenta principal de execução:** Claude Code  
**Data de abertura:** 2026-04-06  
**Status geral:** ABERTO — planejamento inicial

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

- [ ] Escopo da etapa definido
- [ ] Arquivos alvo definidos
- [ ] Dependências instaladas
- [ ] Implementação mínima aplicada
- [ ] Teste local executado
- [ ] Erros corrigidos
- [ ] Resultado registrado no log
- [ ] Próxima etapa identificada

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

- [ ] Definir o nome do bucket no Supabase Storage
- [ ] Definir se o bucket sera privado ou publico
- [ ] Adicionar variaveis de ambiente como `SUPABASE_STORAGE_BUCKET` e opcionalmente `FILE_STORAGE_PROVIDER`
- [ ] Criar service dedicado para storage, por exemplo `storage.service.js`
- [ ] Implementar funcao de upload para buffer no Supabase Storage
- [ ] Implementar funcao de download para buffer no Supabase Storage
- [ ] Implementar funcao opcional de delete no Supabase Storage
- [ ] Trocar `multer.diskStorage` por `multer.memoryStorage`
- [ ] Preservar a heuristica atual de correcao de encoding de `originalname`
- [ ] Ajustar o parser para aceitar buffer alem de caminho local
- [ ] Garantir que `pdf-parse` funcione a partir de buffer
- [ ] Garantir que `.txt` e `.md` sejam lidos de buffer com UTF-8
- [ ] Revisar necessidade de fallback para arquivos com BOM ou encoding inesperado
- [ ] Definir formato de chave do objeto no bucket sem depender de nome original puro
- [ ] Continuar guardando `original_name` separado da chave tecnica do objeto
- [ ] Revisar se `documents.filename` sera reutilizado ou substituido por `storage_path`
- [ ] Se houver mudanca de schema, criar SQL de migracao incremental em vez de sobrescrever dados existentes
- [ ] Garantir que novos uploads nao escrevam mais em `backend/uploads`
- [ ] Garantir que erros de upload no Storage abortem a indexacao inteira de forma limpa
- [ ] Garantir que erro de parsing nao deixe lixo inconsistente no bucket sem politica definida
- [ ] Definir politica de rollback em caso de falha apos upload do arquivo mas antes de salvar chunks
- [ ] Revisar limites de tamanho e memoria para upload em buffer
- [ ] Testar upload de `.txt` com acentos
- [ ] Testar upload de `.md` com acentos
- [ ] Testar upload de `.pdf` com nome acentuado
- [ ] Testar listagem de documentos apos a migracao
- [ ] Testar perguntas RAG apos a migracao
- [ ] Testar perguntas de inventario de documentos
- [ ] Testar strings literais apos a migracao
- [ ] Confirmar que nenhum arquivo novo esta sendo criado em `backend/uploads`
- [ ] Atualizar README e logs quando a migracao for concluida

## Checklist de validacao funcional

- [ ] Upload retorna sucesso e salva o arquivo no bucket
- [ ] Nome original aparece corretamente na UI
- [ ] Metadados aparecem corretamente na lista de documentos
- [ ] Texto do arquivo e extraido corretamente
- [ ] Chunks sao persistidos no banco
- [ ] Embeddings sao gerados normalmente
- [ ] Busca vetorial continua funcionando
- [ ] Busca textual continua funcionando
- [ ] Resposta RAG continua funcionando
- [ ] Nao ha dependencia de arquivo local para uploads novos

## Checklist de seguranca e integridade

- [ ] Bucket configurado com politica minima necessaria
- [ ] Service role usada apenas no backend
- [ ] Nenhuma chave sensivel exposta ao frontend
- [ ] Falha de upload nao cria registro incompleto no banco
- [ ] Falha de indexacao nao deixa estado inconsistente sem log
- [ ] Chave do objeto no bucket nao depende de input bruto do usuario sem sanitizacao
- [ ] `original_name` e preservado sem corromper encoding

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
