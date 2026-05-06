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