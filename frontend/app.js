/* ============================================================
   RAG MVP — app.js
   Vanilla JS, sem frameworks, sem build step
   ============================================================ */

const API_BASE = '/api';

/* ── ELEMENTOS ───────────────────────────────────────────── */
const dropZone        = document.getElementById('drop-zone');
const fileInput       = document.getElementById('file-input');
const browseBtn       = document.getElementById('browse-btn');
const filePreview     = document.getElementById('file-preview');
const fileNameDisplay = document.getElementById('file-name-display');
const removeFileBtn   = document.getElementById('remove-file-btn');
const uploadBtn       = document.getElementById('upload-btn');
const uploadStatus    = document.getElementById('upload-status');

const questionInput   = document.getElementById('question-input');
const askBtn          = document.getElementById('ask-btn');

const chatArea        = document.getElementById('chat-area');
const chatEmpty       = document.getElementById('chat-empty');
const docList         = document.getElementById('doc-list');
const refreshDocsBtn  = document.getElementById('refresh-docs-btn');

/* ── ESTADO ──────────────────────────────────────────────── */
let selectedFile = null;
let isUploading  = false;
let isAsking     = false;

/* ── UPLOAD — DRAG & DROP ────────────────────────────────── */
browseBtn.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('click', (e) => {
  if (e.target !== browseBtn) fileInput.click();
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) setSelectedFile(fileInput.files[0]);
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f) setSelectedFile(f);
});

removeFileBtn.addEventListener('click', clearSelectedFile);

function setSelectedFile(file) {
  const allowed = ['.txt', '.md', '.pdf'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowed.includes(ext)) {
    showUploadStatus('Tipo não permitido. Use .txt, .md ou .pdf', 'error');
    return;
  }
  selectedFile = file;
  fileNameDisplay.textContent = file.name;
  filePreview.classList.remove('hidden');
  uploadBtn.disabled = false;
  clearStatus(uploadStatus);
}

function clearSelectedFile() {
  selectedFile = null;
  fileInput.value = '';
  filePreview.classList.add('hidden');
  uploadBtn.disabled = true;
}

/* ── UPLOAD — ENVIO ─────────────────────────────────────── */
uploadBtn.addEventListener('click', doUpload);

async function doUpload() {
  if (!selectedFile || isUploading) return;

  isUploading = true;
  setBtnLoading(uploadBtn, true);
  showUploadStatus('Enviando e indexando…', 'info');

  const formData = new FormData();
  formData.append('file', selectedFile);

  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Erro no upload.');

    showUploadStatus(
      `✓ "${data.document.name}" indexado com sucesso (${data.document.chunks} chunks)`,
      'success'
    );
    clearSelectedFile();
    loadDocuments();

    // Habilita perguntas
    askBtn.disabled = false;
    questionInput.disabled = false;
    hideChatEmpty();
  } catch (err) {
    showUploadStatus(`✗ ${err.message}`, 'error');
  } finally {
    isUploading = false;
    setBtnLoading(uploadBtn, false);
  }
}

/* ── DOCUMENTOS — LISTA ──────────────────────────────────── */
refreshDocsBtn.addEventListener('click', loadDocuments);

async function loadDocuments() {
  try {
    const res = await fetch(`${API_BASE}/upload/documents`);
    const data = await res.json();
    renderDocList(data.documents || []);

    if (data.documents && data.documents.length > 0) {
      askBtn.disabled = false;
      questionInput.disabled = false;
      hideChatEmpty();
    }
  } catch {
    // falha silenciosa na lista
  }
}

function renderDocList(docs) {
  if (!docs.length) {
    docList.innerHTML = '<li class="doc-item muted">Nenhum documento ainda.</li>';
    return;
  }

  docList.innerHTML = docs.map((d) => {
    const ext = d.original_name?.split('.').pop()?.toUpperCase() || '?';
    const kb = d.size_bytes ? Math.round(d.size_bytes / 1024) + ' KB' : '';
    const date = d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : '';
    return `
      <li class="doc-item">
        <span class="doc-icon">📄</span>
        <div class="doc-info">
          <div class="doc-info-name" title="${escapeHtml(d.original_name)}">${escapeHtml(d.original_name)}</div>
          <div class="doc-info-meta">${ext} · ${kb} · ${date}</div>
        </div>
      </li>`;
  }).join('');
}

/* ── PERGUNTA ────────────────────────────────────────────── */
questionInput.addEventListener('input', () => {
  // Auto-resize do textarea
  questionInput.style.height = 'auto';
  questionInput.style.height = questionInput.scrollHeight + 'px';
});

questionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!askBtn.disabled && !isAsking) doAsk();
  }
});

askBtn.addEventListener('click', doAsk);

async function doAsk() {
  const question = questionInput.value.trim();
  if (!question || isAsking) return;

  isAsking = true;
  setBtnLoading(askBtn, true);
  questionInput.disabled = true;

  // Exibe a pergunta no chat
  appendMessage('question', question);
  questionInput.value = '';
  questionInput.style.height = 'auto';

  // Loader
  const loadingEl = appendLoading();

  try {
    const res = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();

    loadingEl.remove();

    if (!res.ok) throw new Error(data.error || 'Erro ao processar pergunta.');

    appendAnswer(data.answer, data.sources || []);
  } catch (err) {
    loadingEl.remove();
    appendAnswer(`Erro: ${err.message}`, []);
  } finally {
    isAsking = false;
    setBtnLoading(askBtn, false);
    questionInput.disabled = false;
    questionInput.focus();
  }
}

/* ── RENDER MENSAGENS ────────────────────────────────────── */
function appendMessage(type, text) {
  hideChatEmpty();

  const div = document.createElement('div');
  div.className = `message message-${type}`;
  div.textContent = text;
  chatArea.appendChild(div);
  scrollChatToBottom();
  return div;
}

function appendLoading() {
  const div = document.createElement('div');
  div.className = 'message message-loading';
  div.innerHTML = `
    <div class="loading-dots">
      <span></span><span></span><span></span>
    </div>
    <span>Consultando documentos…</span>`;
  chatArea.appendChild(div);
  scrollChatToBottom();
  return div;
}

function appendAnswer(answerText, sources) {
  const wrap = document.createElement('div');
  wrap.className = 'message message-answer';

  wrap.innerHTML = `
    <span class="answer-badge">Resposta</span>
    <div class="answer-text">${escapeHtml(answerText)}</div>
    ${sources.length ? renderSources(sources) : ''}
  `;

  chatArea.appendChild(wrap);
  scrollChatToBottom();
}

function renderSources(sources) {
  const items = sources.map((s, i) => `
    <div class="source-item">
      <div class="source-header">
        <span class="source-filename">📄 ${escapeHtml(s.filename)}</span>
        <span class="source-chunk">chunk #${s.chunkIndex ?? i}</span>
        ${s.similarity != null ? `<span class="source-score">sim: ${s.similarity}</span>` : ''}
      </div>
      <div class="source-excerpt">${escapeHtml(s.excerpt || '')}</div>
    </div>`).join('');

  return `
    <div class="sources-block">
      <span class="sources-label">Fontes utilizadas (${sources.length})</span>
      ${items}
    </div>`;
}

/* ── HELPERS ─────────────────────────────────────────────── */
function showUploadStatus(msg, type) {
  uploadStatus.textContent = msg;
  uploadStatus.className = `status-msg ${type}`;
  uploadStatus.classList.remove('hidden');
}

function clearStatus(el) {
  el.textContent = '';
  el.classList.add('hidden');
}

function setBtnLoading(btn, loading) {
  const text    = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  if (loading) {
    text?.classList.add('hidden');
    spinner?.classList.remove('hidden');
    btn.disabled = true;
  } else {
    text?.classList.remove('hidden');
    spinner?.classList.add('hidden');
    btn.disabled = false;
  }
}

function hideChatEmpty() {
  if (chatEmpty) chatEmpty.style.display = 'none';
}

function scrollChatToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── INIT ────────────────────────────────────────────────── */
(function init() {
  // Carrega documentos já indexados ao abrir
  loadDocuments();

  // Desabilita input de pergunta até ter documentos
  askBtn.disabled = true;
  questionInput.disabled = true;
})();
