-- Private registration-number storage for lost campus ID notices.
-- Run after supabase-campus-market.sql. Registration numbers are never stored
-- on the public campus_board_posts row and are readable only by the post owner.

create table if not exists public.campus_board_private_details (
  post_id uuid primary key references public.campus_board_posts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  registration_no text not null check (char_length(registration_no) between 3 and 30),
  created_at timestamptz not null default now()
);

alter table public.campus_board_private_details enable row level security;
revoke all on public.campus_board_private_details from anon;
revoke all on public.campus_board_private_details from authenticated;
grant select, insert, delete on public.campus_board_private_details to authenticated;

drop policy if exists "Owners read private ID details" on public.campus_board_private_details;
create policy "Owners read private ID details" on public.campus_board_private_details
  for select to authenticated
  using (public.is_srmist_member() and owner_id = auth.uid());

drop policy if exists "Owners save private ID details" on public.campus_board_private_details;
create policy "Owners save private ID details" on public.campus_board_private_details
  for insert to authenticated
  with check (
    public.is_srmist_member()
    and owner_id = auth.uid()
    and exists (
      select 1 from public.campus_board_posts p
      where p.id = post_id and p.owner_id = auth.uid() and p.post_type = 'missing_id'
    )
  );

drop policy if exists "Owners remove private ID details" on public.campus_board_private_details;
create policy "Owners remove private ID details" on public.campus_board_private_details
  for delete to authenticated
  using (public.is_srmist_member() and owner_id = auth.uid());
