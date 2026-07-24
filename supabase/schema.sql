-- Toy Project shared rankings
-- Supabase SQL Editor에서 한 번 실행하세요.

create table if not exists public.rankings (
  id bigint generated always as identity primary key,
  game text not null check (game in ('snake', 'tetris')),
  name text not null check (char_length(name) between 1 and 12),
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);

create index if not exists rankings_game_score_idx
  on public.rankings (game, score desc, created_at asc);

alter table public.rankings enable row level security;

drop policy if exists "Public can read rankings" on public.rankings;
create policy "Public can read rankings"
  on public.rankings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can insert rankings" on public.rankings;
create policy "Public can insert rankings"
  on public.rankings
  for insert
  to anon, authenticated
  with check (
    char_length(name) between 1 and 12
    and score >= 0
    and game in ('snake', 'tetris')
  );

grant select, insert on public.rankings to anon, authenticated;
