const { createClient } = require('@supabase/supabase-js');
const config = require('./env');

let supabase = null;

function getSupabaseClient() {
  if (supabase) return supabase;

  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    throw new Error(
      'Supabase nao configurado. Preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env'
    );
  }

  supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  return supabase;
}

function getStorageBucket() {
  if (!config.supabase.storageBucket) {
    throw new Error('SUPABASE_STORAGE_BUCKET nao configurado no .env');
  }

  return config.supabase.storageBucket;
}

module.exports = { getSupabaseClient, getStorageBucket };
