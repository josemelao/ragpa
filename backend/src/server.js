require('./config/env');

const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');
const config = require('./config/env');

const uploadRoutes = require('./routes/upload.routes');
const askRoutes = require('./routes/ask.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../../frontend')));

app.use('/api/upload', uploadRoutes);
app.use('/api/ask', askRoutes);

app.get('/api/health', async (req, res) => {
  let supabaseStatus = 'nao verificado';
  let fileStorageStatus = 'nao verificado';

  try {
    const { getSupabaseClient } = require('./config/supabase');
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('documents').select('id').limit(1);
    supabaseStatus = error ? `erro: ${error.message}` : 'ok';
  } catch (err) {
    supabaseStatus = `erro: ${err.message}`;
  }

  try {
    const { getStorageHealth } = require('./services/storage.service');
    const storageHealth = await getStorageHealth();
    fileStorageStatus =
      storageHealth.status === 'ok'
        ? `ok (${storageHealth.detail})`
        : `erro: ${storageHealth.detail}`;
  } catch (err) {
    fileStorageStatus = `erro: ${err.message}`;
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase: supabaseStatus,
    fileStorage: fileStorageStatus,
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Servidor rodando em http://localhost:${PORT}`);
  logger.info(`Provedor de embedding: ${config.providers.embedding}`);
  logger.info(`Provedor de LLM: ${config.providers.llm}`);
  logger.info(`Provedor de arquivos: ${config.providers.fileStorage}`);
  logger.info(`Bucket de storage: ${config.supabase.storageBucket}`);
});
