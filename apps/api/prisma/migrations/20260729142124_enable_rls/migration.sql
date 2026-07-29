-- Enable Row-Level Security on all public schema tables.
-- No policies are created: the backend connects via the `postgres` role,
-- which bypasses RLS, while this fully blocks access through the
-- Supabase auto-generated REST API using the anon/authenticated keys.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
