alter table anime_ratings enable row level security;
alter table episode_ratings enable row level security;

create policy "Authenticated users can view anime ratings"
on anime_ratings
for select
to authenticated
using (true);

create policy "Users can insert their own anime ratings"
on anime_ratings
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own anime ratings"
on anime_ratings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own anime ratings"
on anime_ratings
for delete
to authenticated
using (auth.uid() = user_id);

create policy "Authenticated users can view episode ratings"
on episode_ratings
for select
to authenticated
using (true);

create policy "Users can insert their own episode ratings"
on episode_ratings
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own episode ratings"
on episode_ratings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own episode ratings"
on episode_ratings
for delete
to authenticated
using (auth.uid() = user_id);

alter table public.user_anime_interactions enable row level security;
alter table public.user_genre_preferences enable row level security;
alter table public.user_onboarding_responses enable row level security;

-- =========================
-- anime_cache policies
-- =========================

drop policy if exists "anime cache readable by everyone" on public.anime_cache;
create policy "anime cache readable by everyone"
on public.anime_cache
for select
to authenticated, anon
using (true);

-- Optional: only allow service role / backend inserts in production
drop policy if exists "anime cache insert authenticated" on public.anime_cache;
create policy "anime cache insert authenticated"
on public.anime_cache
for insert
to authenticated
with check (true);

drop policy if exists "anime cache update authenticated" on public.anime_cache;
create policy "anime cache update authenticated"
on public.anime_cache
for update
to authenticated
using (true)
with check (true);


-- =========================
-- user_anime_interactions policies
-- =========================

drop policy if exists "users can read own anime interactions" on public.user_anime_interactions;
create policy "users can read own anime interactions"
on public.user_anime_interactions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can insert own anime interactions" on public.user_anime_interactions;
create policy "users can insert own anime interactions"
on public.user_anime_interactions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own anime interactions" on public.user_anime_interactions;
create policy "users can update own anime interactions"
on public.user_anime_interactions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete own anime interactions" on public.user_anime_interactions;
create policy "users can delete own anime interactions"
on public.user_anime_interactions
for delete
to authenticated
using (auth.uid() = user_id);


-- =========================
-- user_genre_preferences policies
-- =========================

drop policy if exists "users can read own genre preferences" on public.user_genre_preferences;
create policy "users can read own genre preferences"
on public.user_genre_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can insert own genre preferences" on public.user_genre_preferences;
create policy "users can insert own genre preferences"
on public.user_genre_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own genre preferences" on public.user_genre_preferences;
create policy "users can update own genre preferences"
on public.user_genre_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete own genre preferences" on public.user_genre_preferences;
create policy "users can delete own genre preferences"
on public.user_genre_preferences
for delete
to authenticated
using (auth.uid() = user_id);


-- =========================
-- user_onboarding_responses policies
-- =========================

drop policy if exists "users can read own onboarding responses" on public.user_onboarding_responses;
create policy "users can read own onboarding responses"
on public.user_onboarding_responses
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can insert own onboarding responses" on public.user_onboarding_responses;
create policy "users can insert own onboarding responses"
on public.user_onboarding_responses
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own onboarding responses" on public.user_onboarding_responses;
create policy "users can update own onboarding responses"
on public.user_onboarding_responses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete own onboarding responses" on public.user_onboarding_responses;
create policy "users can delete own onboarding responses"
on public.user_onboarding_responses
for delete
to authenticated
using (auth.uid() = user_id);