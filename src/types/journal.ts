// Mirrors the journal_entries table (supabase/migrations/0001_journal_entries.sql).
export type JournalEntry = {
  id: string;
  user_id: string;
  entry_date: string; // YYYY-MM-DD
  text: string;
  transit_planet: string | null;
  natal_planet: string | null;
  aspect: string | null;
  intensity: 'COLLISION' | 'TRANSIT' | 'RIPPLE' | 'WALKING' | null;
  phase: string | null;
  headline: string | null;
  body: string | null;
  content_id: number | null;
  created_at: string;
  updated_at: string;
};
