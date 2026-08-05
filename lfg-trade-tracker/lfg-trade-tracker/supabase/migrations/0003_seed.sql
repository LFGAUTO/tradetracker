-- =====================================================================
-- LFG Trade Tracker — 0003 seed
-- Safe to re-run. Edit the names here or manage them on the Admin page.
-- =====================================================================

insert into public.brokers (name) values
  ('Patrick'),
  ('Lester Soto'),
  ('Tim Stewart'),
  ('Mike Watters'),
  ('Jon Lordi'),
  ('Steve Jiminez'),
  ('Mike Fein')
on conflict (name) do nothing;

insert into public.banks (name) values
  ('Ally Financial'),
  ('American Honda Finance'),
  ('BMW Financial Services'),
  ('Capital One Auto Finance'),
  ('Chase Auto'),
  ('Ford Credit'),
  ('GM Financial'),
  ('Hyundai Motor Finance'),
  ('Kia Motors Finance'),
  ('Mercedes-Benz Financial Services'),
  ('Nissan Motor Acceptance'),
  ('Santander Consumer USA'),
  ('Subaru Motors Finance'),
  ('Toyota Financial Services'),
  ('TD Auto Finance'),
  ('US Bank'),
  ('Volkswagen Credit'),
  ('Wells Fargo Auto')
on conflict (name) do nothing;

insert into public.application_settings (setting_key, setting_value) values
  ('mmr_website_url', 'https://www.manheim.com'),
  ('company_name', 'LFG AUTO')
on conflict (setting_key) do nothing;
