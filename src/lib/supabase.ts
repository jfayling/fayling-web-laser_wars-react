import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing. Multiplayer features will be disabled.');
}

let internalSupabase: ReturnType<typeof createClient> | null = null;

const createLazySupabase = () => {
    if (!internalSupabase) {
        internalSupabase = createClient(
            supabaseUrl || '',
            supabaseAnonKey || ''
        );
    }
    return internalSupabase;
};

// Use a Proxy to trigger initialization only when properties are accessed
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
    get: (_target, prop) => {
        const instance = createLazySupabase();
        const value = Reflect.get(instance, prop);
        // Bind functions to the instance to preserve 'this' context
        return typeof value === 'function' ? value.bind(instance) : value;
    }
});
