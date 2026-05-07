# Supabase Migration Security Checklist

Run through this checklist before merging any new migration.

---

## Every new table

- [ ] `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;` is added to `006_enable_rls.sql` (or a dedicated new RLS migration)
- [ ] If the table has a `user_id` column: **no anon SELECT/INSERT/UPDATE/DELETE policy** — deny by default
- [ ] If the table holds public data (no `user_id`): add `CREATE POLICY "public_select" FOR SELECT USING (true)`

---

## Column types

- [ ] All timestamp columns use `TIMESTAMPTZ`, not `TIMESTAMP`
- [ ] All timestamp defaults use `NOW()`, not `CURRENT_TIMESTAMP`

---

## Constraints

- [ ] Every enum-like `VARCHAR` field has a `CHECK (col IN (...))` constraint
- [ ] Every table with a natural key has a `UNIQUE` constraint on that key (not just the surrogate UUID)
- [ ] No generated column references another generated column — PostgreSQL will error; inline the full expression instead

---

## Triggers

- [ ] `updated_at` triggers use the shared `update_updated_at_column()` function (defined in `001_create_portfolios_table.sql`)
- [ ] Do NOT create a new per-table trigger function — one shared function handles all tables

---

## Seed data

- [ ] Seed file uses fictional names and emails (never real user data)
- [ ] All seed inserts are wrapped in `BEGIN; ... COMMIT;`
- [ ] `DISABLE TRIGGER` / `ENABLE TRIGGER` calls are inside the same transaction block

---

## Adding a web or mobile frontend

When a web or mobile client is introduced, raise a security review. At minimum:

1. Implement Telegram Login → Supabase custom JWT so `auth.uid()` maps to the Telegram user ID
2. Uncomment the user policies in `006_enable_rls.sql` (or add a new migration)
3. Switch the web client to use the `anon_key` — **never expose `service_role_key` in client-side code**
4. Verify that every user-data table has a restrictive policy before go-live
