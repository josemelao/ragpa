require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,

  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'documents',
  },

  google: {
    apiKey: process.env.GOOGLE_API_KEY,
  },

  providers: {
    embedding: process.env.EMBEDDING_PROVIDER || 'gemini',
    llm: process.env.LLM_PROVIDER || 'gemini',
    fileStorage: process.env.FILE_STORAGE_PROVIDER || 'local',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  },
};

function validateConfig() {
  const missing = [];
  if (!config.supabase.url) missing.push('SUPABASE_URL');
  if (!config.supabase.serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!config.google.apiKey) missing.push('GOOGLE_API_KEY');

  if (missing.length > 0) {
    console.warn(`[CONFIG] Variaveis de ambiente ausentes: ${missing.join(', ')}`);
    console.warn('[CONFIG] Copie .env.example para .env e preencha os valores.');
  }
}

validateConfig();

module.exports = config;
