<<<<<<< HEAD
-- Crea tabella users per username-based authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilita RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli utenti di vedere solo il proprio record
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy per permettere agli utenti di inserire il proprio record
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy per permettere agli utenti di aggiornare il proprio record
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Policy speciale per permettere la ricerca di username durante il login
-- (necessaria per il lookup username -> email)
CREATE POLICY "Allow username lookup for login" ON users
=======
-- Crea tabella users per username-based authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilita RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli utenti di vedere solo il proprio record
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy per permettere agli utenti di inserire il proprio record
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy per permettere agli utenti di aggiornare il proprio record
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Policy speciale per permettere la ricerca di username durante il login
-- (necessaria per il lookup username -> email)
CREATE POLICY "Allow username lookup for login" ON users
>>>>>>> e3e3bda (first)
  FOR SELECT USING (true);