const express = require('express');
const multer = require('multer');
const path = require('path');
const config = require('../config/env');
const { handleUpload } = require('../controllers/upload.controller');
const { handleDeleteDocument } = require('../controllers/document.controller');
const { listDocuments } = require('../services/vectorStore.service');

const router = express.Router();

function normalizeOriginalName(name) {
  if (!name) return name;

  const looksMisdecoded =
    name.includes('Ãƒ') ||
    name.includes('Ã‚') ||
    name.includes('Ã¢') ||
    name.includes('Ã') ||
    name.includes('Â') ||
    name.includes('â');

  if (!looksMisdecoded) {
    return name;
  }

  try {
    return Buffer.from(name, 'latin1').toString('utf8');
  } catch {
    return name;
  }
}

const ALLOWED_EXTENSIONS = ['.txt', '.md', '.pdf'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    file.originalname = normalizeOriginalName(file.originalname);
    const ext = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Tipo de arquivo nao permitido: ${ext}. Use .txt, .md ou .pdf`));
    }

    cb(null, true);
  },
});

router.post('/', upload.single('file'), handleUpload);
router.delete('/documents/:id', handleDeleteDocument);

router.get('/documents', async (req, res) => {
  try {
    const docs = await listDocuments();
    res.json({ documents: docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: `Arquivo muito grande. Maximo: ${config.upload.maxFileSizeMb}MB`,
    });
  }

  return res.status(400).json({ error: err.message });
});

module.exports = router;
