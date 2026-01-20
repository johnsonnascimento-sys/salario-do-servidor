-- ============================================
-- FIX: RLS Policies for shared_tables and regime_tables
-- ============================================
-- Execute this script in Supabase SQL Editor to fix 406 errors
-- The issue is that 'auth.role()' doesn't work as expected in Supabase

-- ============================================
-- shared_tables - Drop and recreate policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public Read Active Tables" ON shared_tables;
DROP POLICY IF EXISTS "Authenticated Read All" ON shared_tables;
DROP POLICY IF EXISTS "Authenticated Insert" ON shared_tables;
DROP POLICY IF EXISTS "Authenticated Update" ON shared_tables;
DROP POLICY IF EXISTS "Authenticated Delete" ON shared_tables;

-- Recreate with correct syntax
-- IMPORTANT: For public/anon access, we use TRUE for the anon key
CREATE POLICY "Enable read access for all users" ON shared_tables
  FOR SELECT
  USING (true);

-- Authenticated users can write
CREATE POLICY "Enable insert for authenticated users" ON shared_tables
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for authenticated users" ON shared_tables
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable delete for authenticated users" ON shared_tables
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- regime_tables - Drop and recreate policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public Read Active Regime Tables" ON regime_tables;
DROP POLICY IF EXISTS "Authenticated Read All Regime Tables" ON regime_tables;
DROP POLICY IF EXISTS "Authenticated Insert Regime Tables" ON regime_tables;
DROP POLICY IF EXISTS "Authenticated Update Regime Tables" ON regime_tables;
DROP POLICY IF EXISTS "Authenticated Delete Regime Tables" ON regime_tables;

-- Recreate with correct syntax
CREATE POLICY "Enable read access for all users" ON regime_tables
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users" ON regime_tables
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for authenticated users" ON regime_tables
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable delete for authenticated users" ON regime_tables
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- Verify policies are applied
-- ============================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('shared_tables', 'regime_tables');
