-- =====================================================================
-- LFG Trade Tracker — 0002 row level security
-- Everyone signed in can read and work the board.
-- Deleting, archiving, restoring and user management are admin only.
-- =====================================================================

alter table public.users                enable row level security;
alter table public.brokers              enable row level security;
alter table public.banks                enable row level security;
alter table public.trades               enable row level security;
alter table public.mmr_entries          enable row level security;
alter table public.appraisal_entries    enable row level security;
alter table public.dispositions         enable row level security;
alter table public.trade_notes          enable row level security;
alter table public.activity_logs        enable row level security;
alter table public.application_settings enable row level security;

-- ---------------------------------------------------------------- users
create policy users_read on public.users
  for select to authenticated using (true);

create policy users_admin_write on public.users
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- --------------------------------------------------- brokers and banks
create policy brokers_read on public.brokers
  for select to authenticated using (true);
create policy brokers_admin_write on public.brokers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy banks_read on public.banks
  for select to authenticated using (true);
-- Any signed-in user may add a bank inline from the trade form.
create policy banks_insert on public.banks
  for insert to authenticated with check (true);
create policy banks_admin_update on public.banks
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy banks_admin_delete on public.banks
  for delete to authenticated using (public.is_admin());

-- --------------------------------------------------------------- trades
create policy trades_read on public.trades
  for select to authenticated using (true);
create policy trades_insert on public.trades
  for insert to authenticated with check (created_by = auth.uid());
create policy trades_update on public.trades
  for update to authenticated using (true) with check (true);
create policy trades_admin_delete on public.trades
  for delete to authenticated using (public.is_admin());

-- ------------------------------------------- mmr / appraisal / disposition
create policy mmr_read on public.mmr_entries
  for select to authenticated using (true);
create policy mmr_write on public.mmr_entries
  for insert to authenticated with check (true);
create policy mmr_update on public.mmr_entries
  for update to authenticated using (true) with check (true);
create policy mmr_delete on public.mmr_entries
  for delete to authenticated using (true);

create policy appraisal_read on public.appraisal_entries
  for select to authenticated using (true);
create policy appraisal_write on public.appraisal_entries
  for insert to authenticated with check (true);
create policy appraisal_update on public.appraisal_entries
  for update to authenticated using (true) with check (true);
create policy appraisal_delete on public.appraisal_entries
  for delete to authenticated using (true);

create policy dispositions_read on public.dispositions
  for select to authenticated using (true);
create policy dispositions_write on public.dispositions
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------- notes
create policy notes_read on public.trade_notes
  for select to authenticated using (true);
create policy notes_insert on public.trade_notes
  for insert to authenticated with check (created_by = auth.uid());
create policy notes_admin_delete on public.trade_notes
  for delete to authenticated using (public.is_admin());

-- --------------------------------------------------------------- activity
-- Append only. Nothing in the app may rewrite history.
create policy activity_read on public.activity_logs
  for select to authenticated using (true);
create policy activity_insert on public.activity_logs
  for insert to authenticated with check (user_id = auth.uid());

-- --------------------------------------------------------------- settings
create policy settings_read on public.application_settings
  for select to authenticated using (true);
create policy settings_admin_write on public.application_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
