const API_BASE = '/api';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const filePreview = document.getElementById('file-preview');
const fileNameDisplay = document.getElementById('file-name-display');
const removeFileBtn = document.getElementById('remove-file-btn');
const uploadBtn = document.getElementById('upload-btn');
const uploadStatus = document.getElementById('upload-status');

const questionInput = document.getElementById('question-input');
const askBtn = document.getElementById('ask-btn');

const chatArea = document.getElementById('chat-area');
const chatEmpty = document.getElementById('chat-empty');
const docList = document.getElementById('doc-list');
const refreshDocsBtn = document.getElementById('refresh-docs-btn');

let selectedFile = null;
let isUploading = false;
let isAsking = false;
let isDeletingDocument = false;

browseBtn.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('click', (event) => {
  if (event.target !== browseBtn) fileInput.click();
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) setSelectedFile(fileInput.files[0]);
});

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = event.dataTransfer.files[0];
  if (file) setSelectedFile(file);
});

removeFileBtn.addEventListener('click', clearSelectedFile);
uploadBtn.addEventListener('click', doUpload);
refreshDocsBtn.addEventListener('click', loadDocuments);
docList.addEventListener('click', handleDocListClick);
askBtn.addEventListener('click', doAsk);

questionInput.addEventListener('input', () => {
  questionInput.style.height = 'auto';
  questionInput.style.height = questionInput.scrollHeight + 'px';
});

questionInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (!askBtn.disabled && !isAsking) doAsk();
  }
});

function setSelectedFile(file) {
  const allowed = ['.txt', '.md', '.pdf'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();

  if (!allowed.includes(ext)) {
    showUploadStatus('Tipo nao permitido. Use .txt, .md ou .pdf', 'error');
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

async function doUpload() {
  if (!selectedFile || isUploading) return;

  isUploading = true;
  setBtnLoading(uploadBtn, true);
  showUploadStatus('Enviando e indexando...', 'info');

  const formData = new FormData();
  formData.append('file', selectedFile);

  try {
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Erro no upload.');

    showUploadStatus(
      `OK "${data.document.name}" indexado com sucesso (${data.document.chunks} chunks)`,
      'success'
    );
    clearSelectedFile();
    await loadDocuments();
    askBtn.disabled = false;
    questionInput.disabled = false;
    hideChatEmpty();
  } catch (err) {
    showUploadStatus(`Erro: ${err.message}`, 'error');
  } finally {
    isUploading = false;
    setBtnLoading(uploadBtn, false);
  }
}

async function loadDocuments() {
  try {
    const response = await fetch(`${API_BASE}/upload/documents`);
    const data = await response.json();
    const documents = data.documents || [];

    renderDocList(documents);

    if (documents.length > 0) {
      askBtn.disabled = false;
      questionInput.disabled = false;
      hideChatEmpty();
    } else {
      askBtn.disabled = true;
      questionInput.disabled = true;
    }
  } catch {
    // silent fail
  }
}

function renderDocList(documents) {
  if (!documents.length) {
    docList.innerHTML = '<li class="doc-item muted">Nenhum documento ainda.</li>';
    return;
  }

  docList.innerHTML = documents
    .map((document) => {
      const ext = document.original_name?.split('.').pop()?.toUpperCase() || '?';
      const kb = document.size_bytes ? Math.round(document.size_bytes / 1024) + ' KB' : '';
      const date = document.created_at
        ? new Date(document.created_at).toLocaleDateString('pt-BR')
        : '';

      return `
        <li class="doc-item" data-document-id="${escapeHtml(document.id)}">
          <span class="doc-icon">DOC</span>
          <div class="doc-info">
            <div class="doc-info-name" title="${escapeHtml(document.original_name)}">${escapeHtml(document.original_name)}</div>
            <div class="doc-info-meta">${ext} · ${kb} · ${date}</div>
          </div>
          <button class="doc-delete-btn" type="button" data-document-id="${escapeHtml(document.id)}" title="Apagar documento">x</button>
        </li>`;
    })
    .join('');
}

async function handleDocListClick(event) {
  const button = event.target.closest('.doc-delete-btn');
  if (!button || isDeletingDocument) return;

  const documentId = button.dataset.documentId;
  const docItem = button.closest('.doc-item');
  const documentName =
    docItem?.querySelector('.doc-info-name')?.textContent?.trim() || 'documento';

  const confirmed = window.confirm(
    `Apagar "${documentName}" do indice? Isso remove o documento e todos os chunks.`
  );

  if (!confirmed) return;

  isDeletingDocument = true;
  button.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/upload/documents/${documentId}`, {
      method: 'DELETE',
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Erro ao apagar documento.');

    showUploadStatus(`OK "${documentName}" removido do indice.`, 'success');
    await loadDocuments();
  } catch (err) {
    showUploadStatus(`Erro: ${err.message}`, 'error');
  } finally {
    isDeletingDocument = false;
    button.disabled = false;
  }
}

async function doAsk() {
  const question = questionInput.value.trim();
  if (!question || isAsking) return;

  isAsking = true;
  setBtnLoading(askBtn, true);
  questionInput.disabled = true;

  appendMessage('question', question);
  questionInput.value = '';
  questionInput.style.height = 'auto';

  const loadingElement = appendLoading();

  try {
    const response = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const data = await response.json();

    loadingElement.remove();

    if (!response.ok) throw new Error(data.error || 'Erro ao processar pergunta.');

    appendAnswer(data.answer, data.sources || []);
  } catch (err) {
    loadingElement.remove();
    appendAnswer(`Erro: ${err.message}`, []);
  } finally {
    isAsking = false;
    setBtnLoading(askBtn, false);
    questionInput.disabled = false;
    questionInput.focus();
  }
}

function appendMessage(type, text) {
  hideChatEmpty();

  const element = document.createElement('div');
  element.className = `message message-${type}`;
  element.textContent = text;
  chatArea.appendChild(element);
  scrollChatToBottom();
  return element;
}

function appendLoading() {
  const element = document.createElement('div');
  element.className = 'message message-loading';
  element.innerHTML = `
    <div class="loading-dots">
      <span></span><span></span><span></span>
    </div>
    <span>Consultando documentos...</span>`;
  chatArea.appendChild(element);
  scrollChatToBottom();
  return element;
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
  const items = sources
    .map(
      (source, index) => `
        <div class="source-item">
          <div class="source-header">
            <span class="source-filename">DOC ${escapeHtml(source.filename)}</span>
            <span class="source-chunk">chunk #${source.chunkIndex ?? index}</span>
            ${source.similarity != null ? `<span class="source-score">sim: ${source.similarity}</span>` : ''}
          </div>
          <div class="source-excerpt">${escapeHtml(source.excerpt || '')}</div>
        </div>`
    )
    .join('');

  return `
    <div class="sources-block">
      <span class="sources-label">Fontes utilizadas (${sources.length})</span>
      ${items}
    </div>`;
}

function showUploadStatus(message, type) {
  uploadStatus.textContent = message;
  uploadStatus.className = `status-msg ${type}`;
  uploadStatus.classList.remove('hidden');
}

function clearStatus(element) {
  element.textContent = '';
  element.classList.add('hidden');
}

function setBtnLoading(button, loading) {
  const text = button.querySelector('.btn-text');
  const spinner = button.querySelector('.btn-spinner');

  if (loading) {
    text?.classList.add('hidden');
    spinner?.classList.remove('hidden');
    button.disabled = true;
  } else {
    text?.classList.remove('hidden');
    spinner?.classList.add('hidden');
    button.disabled = false;
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

(function init() {
  loadDocuments();
  askBtn.disabled = true;
  questionInput.disabled = true;
})();
