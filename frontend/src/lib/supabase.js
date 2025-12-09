import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Custom logger that filters out the self-XSS warning
const customLogger = (level, ...args) => {
  const message = args[0]?.message || args[0] || '';
  
  // Skip the specific self-XSS warning
  if (typeof message === 'string' && message.includes('Using this console may allow attackers to impersonate you')) {
    return;
  }
  
  // Pass through other logs
  switch (level) {
    case 'log':
      console.log(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args);
      break;
    default:
      console.log(...args);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    // @ts-ignore - Supabase types don't include logger in all versions
    logger: {
      log: (message) => customLogger('log', message),
      warn: (message) => customLogger('warn', message),
      error: (message) => customLogger('error', message)
    }
  }
});
