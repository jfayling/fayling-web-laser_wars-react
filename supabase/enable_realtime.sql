-- Enable Realtime for players and matches tables
begin;
  -- Check if publication exists (it usually does by default)
  -- Add tables to the publication
  alter publication supabase_realtime add table public.players;
  alter publication supabase_realtime add table public.matches;
commit;
