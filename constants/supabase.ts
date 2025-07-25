import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qdqygtmobavctllqeixc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcXlndG1vYmF2Y3RsbHFlaXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjM2OTgsImV4cCI6MjA2NzIzOTY5OH0.vGZHUHJUu4BOrVTTmGsFYs-6n598HQri3N6NMeBV0Tw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)