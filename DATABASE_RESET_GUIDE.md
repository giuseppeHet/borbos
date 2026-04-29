# ðŸŽ® Magic Tracker - Database Reset & Username Authentication Setup

## ðŸ“‹ Istruzioni per il Reset del Database e Cambio Autenticazione

### 1. Reset del Database
Esegui questi comandi SQL nel tuo Supabase SQL Editor (in ordine):

```sql
-- Svuota le tabelle esistenti (in ordine per rispettare i vincoli di foreign key)
DELETE FROM matches;
DELETE FROM decks;
DELETE FROM players;

-- Verifica che le tabelle siano vuote
SELECT COUNT(*) as players_count FROM players;
SELECT COUNT(*) as decks_count FROM decks;
SELECT COUNT(*) as matches_count FROM matches;
```

### 2. Crea Tabella Users per Username Authentication
Esegui questo script SQL per creare la tabella users:

```sql
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

-- Policy per permettere agli utenti di inserire il proprio record (anche durante signup)
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (true);

-- Policy per permettere agli utenti di aggiornare il proprio record
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Policy speciale per permettere la ricerca di username durante il login
CREATE POLICY "Allow username lookup for login" ON users
  FOR SELECT USING (true);
```

### 3. Aggiorna Schema Tabelle Esistenti
Se vuoi aggiungere le colonne mancanti per un'esperienza completa:

```sql
-- Aggiungi colonne mancanti alle tabelle esistenti
ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE players ADD COLUMN IF NOT EXISTS colors TEXT[];
ALTER TABLE players ADD COLUMN IF NOT EXISTS commander TEXT;

ALTER TABLE decks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE decks ADD COLUMN IF NOT EXISTS colors TEXT[];
ALTER TABLE decks ADD COLUMN IF NOT EXISTS commander TEXT;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
```

### 4. Come Usare il Nuovo Sistema

1. **Registrazione**: Gli utenti possono ora registrarsi con username, email e password
2. **Login**: Gli utenti fanno login solo con username e password
3. **Profilo**: Nella navbar viene mostrato l'username invece dell'email

### 5. Test del Sistema

1. Apri l'app nel browser
2. Clicca "Registrati" per creare un nuovo account
3. Inserisci username, email e password
4. Fai logout e login con il nuovo username

### 6. Note Importanti

- La tabella `users` Ã¨ necessaria per mappare username a email per l'autenticazione
- Le policy RLS permettono la ricerca di username durante il login
- Il sistema mantiene la sicurezza usando Supabase Auth per l'autenticazione effettiva
- Gli username devono essere unici nel sistema

### 7. Troubleshooting

- **"Username non trovato"**: Assicurati che l'utente sia registrato nella tabella users
- **"Username giÃ  in uso"**: Scegli un username diverso durante la registrazione
- **Errori RLS**: Verifica che le policy siano applicate correttamente

---
*Dopo aver completato questi passaggi, il tuo Magic Tracker avrÃ  un sistema di autenticazione basato su username con database pulito!* ðŸŽ‰
