// 🔹 LOGICA AUTENTICAZIONE (Username-based con tabella users)

// Modalita manuale per piccoli gruppi: credenziali gestite direttamente nel codice.
const MANUAL_AUTH_ENABLED = true;
const MANUAL_USERS = [
  { id: "11111111-1111-4111-8111-111111111111", username: "Pedro", password: "Pedro123" },
  { id: "22222222-2222-4222-8222-222222222222", username: "Giuseppe", password: "Giuseppe123" },
  { id: "33333333-3333-4333-8333-333333333333", username: "Flint", password: "Flint123" },
  { id: "44444444-4444-4444-8444-444444444444", username: "Carota", password: "Carota123" },
  { id: "55555555-5555-4555-8555-555555555555", username: "Boss", password: "Boss123" },
  { id: "66666666-6666-4666-8666-666666666666", username: "Gerry", password: "Gerry123" },
  { id: "77777777-7777-4777-8777-777777777777", username: "Vito", password: "Vito123" },
  { id: "88888888-8888-4888-8888-888888888888", username: "Zatta", password: "Zatta123" },
  { id: "99999999-9999-4999-8999-999999999999", username: "Gordon", password: "Gordon123" },
  { id: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1", username: "Doug", password: "Doug123" },
  { id: "bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2", username: "Todd", password: "Todd123" }
];

const USER_AVATAR_BY_NAME = {
  pedro: "https://cards.scryfall.io/art_crop/front/0/f/0fa5725c-fcf8-4f84-9093-75b454b4755f.jpg?1559592403",
  carosta: "https://cards.scryfall.io/art_crop/front/a/4/a4d2f904-3d68-4192-aa8d-9521b9747fbd.jpg?1562489348",
  carota: "https://cards.scryfall.io/art_crop/front/a/4/a4d2f904-3d68-4192-aa8d-9521b9747fbd.jpg?1562489348",
  gerry: "https://cards.scryfall.io/art_crop/front/a/e/aea8ab0f-6898-4312-9989-915d6357515f.jpg?1562799140",
  vito: "https://cards.scryfall.io/art_crop/front/e/5/e56ccbd2-c17d-4625-bc11-181d36a84936.jpg?1562489835",
  gordon: "https://cards.scryfall.io/art_crop/front/9/0/90f17b85-a866-48e8-aae0-55330109550e.jpg?1562488879",
  doug: "https://cards.scryfall.io/art_crop/front/6/5/651626f5-aca6-4653-aa27-36c919566cb0.jpg?1720467986",
  boss: "https://cards.scryfall.io/art_crop/front/0/0/00325992-ec1c-469a-8df0-ffb9a197d221.jpg?1562799056",
  flint: "https://cards.scryfall.io/art_crop/front/0/e/0e62aa7e-d9f9-42d4-9eed-5f51f88047c6.jpg?1562628641",
  zatta: "https://cards.scryfall.io/art_crop/front/0/2/0276e9da-73fc-4d27-bbf1-726a37f5d5a0.jpg?1562487438"
};

const DEFAULT_USER_AVATAR = "https://cards.scryfall.io/art_crop/front/d/a/da4ab2ac-4b15-4fba-bc11-d4e185e7f99c.jpg?1562794058";

function getManualSessionUser() {
  try {
    const raw = localStorage.getItem("manualAuthUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function toggleUserMenu() {
  const menu = document.getElementById("userMenuDropdown");
  if (!menu) return;
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

function setUserMenuButton(username, avatarUrl) {
  const button = document.getElementById("userEmail");
  if (!button) return;

  const label = username ? `${username} ▾` : "Utente ▾";
  const src = avatarUrl || DEFAULT_USER_AVATAR;

  button.innerHTML = "";
  const img = document.createElement("img");
  img.src = src;
  img.alt = label;
  img.className = "user-menu-avatar";

  const span = document.createElement("span");
  span.textContent = label;

  button.appendChild(img);
  button.appendChild(span);
}

async function getAvatarFromPlayersByName(username) {
  if (!username) return null;

  let data = null;
  let error = null;
  ({ data, error } = await supabaseClient
    .from("players")
    .select("image_url")
    .ilike("name", username)
    .maybeSingle());

  if (error && error.message.includes("image_url")) {
    return null;
  }

  if (error) {
    throw error;
  }

  const fromDb = typeof data?.image_url === "string" ? data.image_url.trim() : "";
  if (fromDb) return fromDb;

  const fromMap = USER_AVATAR_BY_NAME[String(username).toLowerCase()];
  return fromMap || null;
}

// Funzioni per cambiare tab
function showLogin() {
  document.getElementById("loginTab").style.display = "block";
  document.getElementById("registerTab").style.display = "none";
  document.getElementById("errorMsg").textContent = "";
}

function showRegister() {
  document.getElementById("loginTab").style.display = "none";
  document.getElementById("registerTab").style.display = "block";
  document.getElementById("errorMsg").textContent = "";
}

function bindAuthModalEvents() {
  const loginBtn = document.getElementById("loginSubmitBtn");
  const usernameInput = document.getElementById("loginUsername");
  const passwordInput = document.getElementById("loginPassword");

  if (loginBtn && !loginBtn.dataset.bound) {
    loginBtn.addEventListener("click", () => handleLogin());
    loginBtn.dataset.bound = "true";
  }

  const onEnter = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleLogin();
    }
  };

  if (usernameInput && !usernameInput.dataset.boundEnter) {
    usernameInput.addEventListener("keydown", onEnter);
    usernameInput.dataset.boundEnter = "true";
  }

  if (passwordInput && !passwordInput.dataset.boundEnter) {
    passwordInput.addEventListener("keydown", onEnter);
    passwordInput.dataset.boundEnter = "true";
  }
}

// Login con username
async function handleLogin() {
  try {
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;
    const errorMsg = document.getElementById("errorMsg");
    
    if (!username || !password) {
      errorMsg.textContent = "Username e password obbligatori";
      return;
    }
    
    errorMsg.textContent = "Caricamento...";

    if (MANUAL_AUTH_ENABLED) {
      const user = MANUAL_USERS.find(
        (u) => u.username === username && u.password === password
      );

      if (!user) {
        errorMsg.textContent = "Credenziali non valide";
        return;
      }

      localStorage.setItem("manualAuthUser", JSON.stringify({
        id: user.id,
        username: user.username,
        email: `${user.username.toLowerCase()}@local`
      }));

      try {
        await ensureCurrentUserHasPlayerProfile();
      } catch (profileErr) {
        console.error("Profilo players non creato automaticamente:", profileErr.message);
      }

      errorMsg.textContent = "";
      showApp();
      return;
    }
    
    // Prima cerca l'email dall'username nella tabella users
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('email')
      .eq('username', username)
      .maybeSingle();
    
    if (userError) {
      if (userError.code === "42501") {
        errorMsg.textContent = "Permessi database mancanti su tabella users (RLS/GRANT)";
        return;
      }
      throw userError;
    }

    if (!userData) {
      errorMsg.textContent = "Username non trovato";
      return;
    }
    
    // Ora fai login con l'email trovata
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: userData.email,
      password
    });
    
    if (error) throw error;
    
    // Successo
    errorMsg.textContent = "";
    showApp();
  } catch (err) {
    document.getElementById("errorMsg").textContent = "❌ " + err.message;
  }
}

// Registrazione
async function handleRegister() {
  try {
    if (MANUAL_AUTH_ENABLED) {
      document.getElementById("errorMsg").textContent =
        "Registrazione disattivata: gli utenti vengono creati manualmente dagli admin.";
      return;
    }

    const username = document.getElementById("registerUsername").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
    const errorMsg = document.getElementById("errorMsg");
    
    if (!username || !email || !password) {
      errorMsg.textContent = "Tutti i campi sono obbligatori";
      return;
    }
    
    if (password.length < 6) {
      errorMsg.textContent = "La password deve essere di almeno 6 caratteri";
      return;
    }
    
    errorMsg.textContent = "Registrazione in corso...";
    
    // Prima controlla se l'username è già preso
    const { data: existingUser, error: existingUserError } = await supabaseClient
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (existingUserError && existingUserError.code !== "PGRST116") {
      if (existingUserError.code === "42501") {
        errorMsg.textContent = "Permessi database mancanti su tabella users (RLS/GRANT)";
        return;
      }
      throw existingUserError;
    }
    
    if (existingUser) {
      errorMsg.textContent = "Username già in uso";
      return;
    }
    
    // Registra l'utente con Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password
    });
    
    if (authError) throw authError;
    
    // Salva username nella tabella users
    const userId = authData?.user?.id;
    if (!userId) {
      throw new Error("Registrazione auth incompleta: controlla conferma email in Supabase");
    }

    const { error: userError } = await supabaseClient
      .from('users')
      .upsert({
        id: userId,
        username,
        email
      }, { onConflict: 'id' });
    
    if (userError) {
      if (userError.code === "42501") {
        throw new Error("RLS/permessi: abilita INSERT su users per signup");
      }
      throw userError;
    }
    
    errorMsg.textContent = "✅ Registrazione completata! Ora puoi fare login.";
    showLogin();
    document.getElementById("loginUsername").value = username;
  } catch (err) {
    document.getElementById("errorMsg").textContent = "❌ " + err.message;
  }
}

// Logout
async function handleLogout() {
  try {
    const menu = document.getElementById("userMenuDropdown");
    if (menu) menu.style.display = "none";

    if (MANUAL_AUTH_ENABLED) {
      localStorage.removeItem("manualAuthUser");
    } else {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    }
    
    // Nascondi app
    document.getElementById("mainApp").style.display = "none";
    document.getElementById("authModal").style.display = "flex";
    
    // Pulisci form
    document.getElementById("loginUsername").value = "";
    document.getElementById("loginPassword").value = "";
    document.getElementById("registerUsername").value = "";
    document.getElementById("registerEmail").value = "";
    document.getElementById("registerPassword").value = "";
    document.getElementById("errorMsg").textContent = "";
    
    // Torna al tab login
    showLogin();
  } catch (err) {
    alert("Errore logout: " + err.message);
  }
}

// Mostra app principale
function showApp() {
  document.getElementById("authModal").style.display = "none";
  document.getElementById("mainApp").style.display = "block";
  
  // Pulisci form
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("registerUsername").value = "";
  document.getElementById("registerEmail").value = "";
  document.getElementById("registerPassword").value = "";
  
  // Mostra username utente
  updateUserDisplay();
  
  // Carica profilo personale
  loadMyProfile();
}

// Aggiorna visualizzazione utente
async function updateUserDisplay() {
  if (MANUAL_AUTH_ENABLED) {
    const user = getManualSessionUser();
    let avatarUrl = null;
    if (user?.username) {
      try {
        avatarUrl = await getAvatarFromPlayersByName(user.username);
      } catch {
        avatarUrl = USER_AVATAR_BY_NAME[String(user.username).toLowerCase()] || null;
      }
    }
    setUserMenuButton(user?.username || "Utente", avatarUrl);
    return;
  }

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (user) {
    // Cerca username dalla tabella users
    const { data: userData } = await supabaseClient
      .from('users')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();
    
    const username = userData?.username || user.email || "Utente";
    let avatarUrl = null;
    try {
      avatarUrl = await getAvatarFromPlayersByName(username);
    } catch {
      avatarUrl = USER_AVATAR_BY_NAME[String(username).toLowerCase()] || null;
    }
    setUserMenuButton(username, avatarUrl);
  } else {
    setUserMenuButton("Utente", DEFAULT_USER_AVATAR);
  }
}

// Controlla se loggato al caricamento
async function checkAuth() {
  if (MANUAL_AUTH_ENABLED) {
    const manualUser = getManualSessionUser();
    if (manualUser) {
      try {
        await ensureCurrentUserHasPlayerProfile();
      } catch (profileErr) {
        console.error("Profilo players non sincronizzato:", profileErr.message);
      }

      showApp();
      loadPlayers();
      loadMatches();
      loadMyProfile();
    } else {
      document.getElementById("authModal").style.display = "flex";
      document.getElementById("mainApp").style.display = "none";
    }
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (session) {
    showApp();
    // Carica dati app
    loadPlayers();
    loadMatches();
    loadMyProfile(); // Carica profilo personale
  } else {
    document.getElementById("authModal").style.display = "flex";
    document.getElementById("mainApp").style.display = "none";
  }
}

// Ascolta cambiamenti auth
if (!MANUAL_AUTH_ENABLED) {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN") {
      showApp();
    } else if (event === "SIGNED_OUT") {
      document.getElementById("mainApp").style.display = "none";
      document.getElementById("authModal").style.display = "flex";
    }
  });
}

bindAuthModalEvents();
