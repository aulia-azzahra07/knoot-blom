const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL.trim(),
    process.env.SUPABASE_SECRET_KEY.trim()
);

module.exports = supabase;