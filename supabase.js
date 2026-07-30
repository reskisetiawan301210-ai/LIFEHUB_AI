import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://edryswrihxnshtvdueyr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8hFUbmuxP05qLrrz6xD00g_6XXm-OgK';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);