-- Create public.players table
create table public.players (
  id uuid references auth.users not null primary key,
  nickname text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.players enable row level security;

create policy "Public profiles are viewable by everyone."
  on public.players for select
  using ( true );

create policy "Users can insert their own profile."
  on public.players for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.players for update
  using ( auth.uid() = id );

-- Create public.matches table
create table public.matches (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  player1_id uuid references public.players(id),
  player2_id uuid references public.players(id),
  status text check (status in ('pending', 'active', 'finished', 'forfeited')) default 'pending',
  winner_id uuid references public.players(id),
  current_turn uuid references public.players(id), -- ID of player whose turn it is
  last_move_at timestamp with time zone, 
  metadata jsonb -- For saving snapshot of board if needed
);

alter table public.matches enable row level security;

create policy "Active matches are viewable by everyone (for lobby listing logic usually, or restrict to participants)."
  on public.matches for select
  using ( true );

create policy "Players can create matches."
  on public.matches for insert
  with check ( auth.uid() = player1_id ); -- Assuming creator is player 1

create policy "Players can join matches."
  on public.matches for update
  using ( auth.uid() in (player1_id, player2_id) OR player2_id is null );

-- Realtime needs to be enabled for these tables in the Supabase Dashboard > Database > Replication.
