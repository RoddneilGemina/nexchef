-- Create the follows table
create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id)
);

-- Enable Row Level Security
alter table public.follows enable row level security;

-- Drop existing policies if they exist and recreate
drop policy if exists "Anyone can read follows" on public.follows;
drop policy if exists "Users can follow other users" on public.follows;
drop policy if exists "Users can unfollow users" on public.follows;

-- Create policies
create policy "Anyone can read follows"
  on public.follows for select
  using (true);

create policy "Users can follow other users"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow users"
  on public.follows for delete
  using (auth.uid() = follower_id);
