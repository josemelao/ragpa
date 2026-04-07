const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { getSupabaseClient, getStorageBucket } = require('../config/supabase');
const config = require('../config/env');

function sanitizeFileName(name) {
  return (name || 'file')
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

function buildStorageObjectKey(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  const baseName = path.basename(originalName || 'file', ext);
  const safeName = sanitizeFileName(baseName);
  const stamp = new Date().toISOString().slice(0, 10);
  return `${stamp}/${randomUUID()}-${safeName}${ext}`;
}

function getFileStorageProvider() {
  return config.providers.fileStorage;
}

async function getStorageHealth() {
  const provider = getFileStorageProvider();

  if (provider === 'local') {
    return {
      provider,
      status: 'ok',
      detail: `local:${config.upload.dir}`,
    };
  }

  if (provider === 'supabase') {
    const supabase = getSupabaseClient();
    const bucket = getStorageBucket();

    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      return {
        provider,
        status: 'error',
        detail: error.message,
      };
    }

    const exists = (data || []).some((item) => item.name === bucket);

    return {
      provider,
      status: exists ? 'ok' : 'error',
      detail: exists ? `bucket:${bucket}` : `bucket inexistente: ${bucket}`,
    };
  }

  return {
    provider,
    status: 'error',
    detail: `provider nao suportado: ${provider}`,
  };
}

async function uploadBufferToSupabase({ buffer, mimeType, originalName, objectKey }) {
  const supabase = getSupabaseClient();
  const bucket = getStorageBucket();
  const finalKey = objectKey || buildStorageObjectKey(originalName);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(finalKey, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Erro ao enviar arquivo para o Storage: ${error.message}`);
  }

  return {
    bucket,
    fileName: path.basename(data.path),
    objectKey: data.path,
    provider: 'supabase',
  };
}

async function uploadBufferToLocal({ buffer, originalName, objectKey }) {
  const finalKey = objectKey || buildStorageObjectKey(originalName);
  const absolutePath = path.resolve(config.upload.dir, finalKey);
  const targetDir = path.dirname(absolutePath);

  await fs.promises.mkdir(targetDir, { recursive: true });
  await fs.promises.writeFile(absolutePath, buffer);

  return {
    fileName: path.basename(finalKey),
    filePath: absolutePath,
    objectKey: finalKey.replace(/\\/g, '/'),
    provider: 'local',
  };
}

async function persistUploadedFile({ buffer, mimeType, originalName, objectKey }) {
  const provider = getFileStorageProvider();

  if (provider === 'supabase') {
    return uploadBufferToSupabase({ buffer, mimeType, originalName, objectKey });
  }

  if (provider === 'local') {
    return uploadBufferToLocal({ buffer, mimeType, originalName, objectKey });
  }

  throw new Error(`Provedor de storage nao suportado: ${provider}`);
}

async function downloadBuffer(objectKey) {
  const provider = getFileStorageProvider();

  if (provider === 'supabase') {
    const supabase = getSupabaseClient();
    const bucket = getStorageBucket();

    const { data, error } = await supabase.storage.from(bucket).download(objectKey);

    if (error) {
      throw new Error(`Erro ao baixar arquivo do Storage: ${error.message}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  if (provider === 'local') {
    const absolutePath = path.resolve(config.upload.dir, objectKey);
    return fs.promises.readFile(absolutePath);
  }

  throw new Error(`Provedor de storage nao suportado: ${provider}`);
}

async function removeStoredFile(storedFile) {
  if (!storedFile || !storedFile.objectKey) return;

  if (storedFile.provider === 'supabase') {
    const supabase = getSupabaseClient();
    const bucket = getStorageBucket();

    const { error } = await supabase.storage.from(bucket).remove([storedFile.objectKey]);

    if (error) {
      throw new Error(`Erro ao remover arquivo do Storage: ${error.message}`);
    }

    return;
  }

  if (storedFile.provider === 'local') {
    const absolutePath = storedFile.filePath || path.resolve(config.upload.dir, storedFile.objectKey);
    await fs.promises.rm(absolutePath, { force: true });
    return;
  }

  throw new Error(`Provedor de storage nao suportado: ${storedFile.provider}`);
}

module.exports = {
  buildStorageObjectKey,
  downloadBuffer,
  getFileStorageProvider,
  getStorageHealth,
  persistUploadedFile,
  removeStoredFile,
};
