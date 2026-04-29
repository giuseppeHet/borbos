// 🔹 SUPABASE CLIENT
const supabaseClient = window.supabase.createClient(
  "https://yylupmjhsyvlhktbnkhz.supabase.co",
  "sb_publishable_ryFFpgvkWARK8Uh5O4lrDw_rz5DcHeu"
);

function getManualAuthUser() {
  try {
    const raw = localStorage.getItem("manualAuthUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const scryfallCommanderCache = new Map();
let commanderSuggestionCloseBound = false;

function shouldUseCustomCommanderSuggestions() {
  try {
    const touchLike = window.matchMedia && window.matchMedia("(hover: none)").matches;
    return touchLike || window.innerWidth <= 900;
  } catch {
    return false;
  }
}

function ensureCommanderSuggestionCloseHandler() {
  if (commanderSuggestionCloseBound) return;
  commanderSuggestionCloseBound = true;

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(".commander-suggestions") || event.target.closest("input[list]")) return;
    document.querySelectorAll(".commander-suggestions").forEach((el) => {
      el.style.display = "none";
      el.innerHTML = "";
    });
  });
}

function ensureCommanderSuggestionsBox(input) {
  const boxId = `${input.id}-suggestions-box`;
  let box = document.getElementById(boxId);
  if (box) return box;

  box = document.createElement("div");
  box.id = boxId;
  box.className = "commander-suggestions";
  box.style.display = "none";

  input.insertAdjacentElement("afterend", box);
  return box;
}

function renderCustomCommanderSuggestions(input, suggestions) {
  const box = ensureCommanderSuggestionsBox(input);
  if (!box) return;

  if (!suggestions.length) {
    box.style.display = "none";
    box.innerHTML = "";
    return;
  }

  box.innerHTML = suggestions
    .map((name) => `<button type="button" class="commander-suggestion-item">${name}</button>`)
    .join("");
  box.style.display = "block";

  box.querySelectorAll(".commander-suggestion-item").forEach((btn, idx) => {
    btn.addEventListener("click", () => {
      const selected = suggestions[idx];
      input.value = selected;
      box.style.display = "none";
      box.innerHTML = "";
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
}

function getManaSymbolsHtml(colors) {
  if (!Array.isArray(colors) || colors.length === 0) return "";
  return colors
    .map(
      (color) =>
        `<img src="https://svgs.scryfall.io/card-symbols/${color}.svg" alt="${color}" title="${color}" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;">`
    )
    .join("");
}

async function getCommanderCardDetails(commanderName) {
  if (!commanderName || commanderName.trim() === "") return null;

  const normalized = commanderName.trim();
  const key = normalized.toLowerCase();
  if (scryfallCommanderCache.has(key)) {
    return scryfallCommanderCache.get(key);
  }

  const headers = {
    Accept: "application/json"
  };

  let response = await fetch(
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(normalized)}`,
    { headers }
  );

  if (!response.ok) {
    response = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(normalized)}`,
      { headers }
    );
  }

  if (!response.ok) {
    throw new Error(`Commander \"${commanderName}\" non trovato`);
  }

  const card = await response.json();
  const imageUrl =
    card.image_uris?.art_crop ||
    card.card_faces?.[0]?.image_uris?.art_crop ||
    null;

  const details = {
    name: card.name,
    colors: card.color_identity || [],
    legalCommander: card.legalities?.commander === "legal",
    imageUrl
  };

  scryfallCommanderCache.set(key, details);
  return details;
}

function splitCommanderNames(commanderText) {
  const raw = String(commanderText || "").trim();
  if (!raw) return [];
  return raw
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

async function updateCommanderSuggestions(inputId, datalistId) {
  const input = document.getElementById(inputId);
  const datalist = document.getElementById(datalistId);
  if (!input || !datalist) return;
  ensureCommanderSuggestionCloseHandler();

  const query = input.value.trim();
  if (query.length < 2) {
    datalist.innerHTML = "";
    if (shouldUseCustomCommanderSuggestions()) {
      renderCustomCommanderSuggestions(input, []);
    }
    return;
  }

  try {
    const response = await fetch(
      `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`,
      {
        headers: {
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) return;

    const data = await response.json();
    const suggestions = (data.data || []).slice(0, 3);
    datalist.innerHTML = suggestions.map((name) => `<option value="${name}"></option>`).join("");
    if (shouldUseCustomCommanderSuggestions()) {
      renderCustomCommanderSuggestions(input, suggestions);
    }
  } catch {
    // Se autocomplete fallisce, non bloccare l'inserimento del mazzo.
    if (shouldUseCustomCommanderSuggestions()) {
      renderCustomCommanderSuggestions(input, []);
    }
  }
}

// 🔹 OTTIENI UTENTE CORRENTE
async function getCurrentUser() {
  try {
    const manualRaw = localStorage.getItem("manualAuthUser");
    if (manualRaw) {
      const manualUser = JSON.parse(manualRaw);
      if (manualUser?.id) return manualUser;
    }
  } catch {
    // Ignore local parsing errors and fallback to Supabase auth.
  }

  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

// 🔹 OTTIENI GIOCATORE DELL'UTENTE CORRENTE
async function getCurrentUserPlayer() {
  const user = await getCurrentUser();
  if (!user) return null;

  const manualUser = getManualAuthUser();
  
  try {
    // In modalita manuale non c'e un auth.users valido: associa per nome.
    if (manualUser?.username) {
      const { data: byName, error: byNameError } = await supabaseClient
        .from("players")
        .select("*")
        .ilike("name", manualUser.username)
        .maybeSingle();

      if (!byNameError && byName) return byName;
    }

    const { data, error } = await supabaseClient
      .from("players")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
      
    if (error && (error.code === 'PGRST116' || error.message.includes('user_id'))) {
      // Nessun giocatore trovato
      return null;
    }
    if (error) throw error;
    return data || null;
  } catch (err) {
    console.error("Errore caricamento profilo utente:", err.message);
    return null;
  }
}

// In modalita manuale garantisce l'esistenza del profilo players per l'utente loggato.
async function ensureCurrentUserHasPlayerProfile() {
  const manualUser = getManualAuthUser();
  if (!manualUser?.username) return null;

  const normalizedName = String(manualUser.username).trim();
  if (!normalizedName) return null;

  const { data: existing, error: existingError } = await supabaseClient
    .from("players")
    .select("id, name")
    .ilike("name", normalizedName)
    .maybeSingle();

  if (!existingError && existing) return existing;
  if (existingError && existingError.code !== "PGRST116") {
    throw existingError;
  }

  const { data: created, error: createError } = await supabaseClient
    .from("players")
    .insert([{ name: normalizedName }])
    .select("id, name")
    .maybeSingle();

  if (createError) {
    // Se la riga e stata creata in parallelo da un altro client, prova a rileggerla.
    const { data: retry, error: retryError } = await supabaseClient
      .from("players")
      .select("id, name")
      .ilike("name", normalizedName)
      .maybeSingle();

    if (!retryError && retry) return retry;
    throw createError;
  }

  return created || null;
}

// 🔹 CARICA GIOCATORI (in tutti i dropdown)
async function loadPlayers() {
  try {
    const { data, error } = await supabaseClient.from("players").select("*");
    if (error) throw error;

    const selects = ["playerSelect", "p1", "p2", "winner"];
    
    selects.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return; // Skip if element doesn't exist
      el.innerHTML = '<option value="">Seleziona...</option>';
      data.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        el.appendChild(opt);
      });
    });
    
    // Aggiorna lista giocatori se caricata
    loadPlayersList();
  } catch (err) {
    console.error("Errore caricamento giocatori:", err.message);
  }
}

// 🔹 CARICA LISTA GIOCATORI (escludendo l'utente corrente)
async function loadPlayersList() {
  try {
    const user = await getCurrentUser();
    const manualUser = getManualAuthUser();
    
    // Carica giocatori. Se user_id non esiste, fallback senza user_id.
    let data = null;
    let error = null;
    ({ data, error } = await supabaseClient
      .from("players")
      .select("id, name, decks(count), user_id"));
    if (error && error.message.includes("user_id")) {
      ({ data, error } = await supabaseClient
        .from("players")
        .select("id, name, decks(count)"));
    }
    
    if (error) throw error;

    const tbody = document.getElementById("playersBody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: #999;">Nessun giocatore presente</td></tr>';
      return;
    }
    
    // Filtra con JavaScript: escludi il giocatore dell'utente corrente
    const filteredPlayers = data.filter((p) => {
      if (manualUser?.username) {
        return (p.name || "").toLowerCase() !== manualUser.username.toLowerCase();
      }
      if (user && Object.prototype.hasOwnProperty.call(p, "user_id")) {
        return p.user_id !== user.id;
      }
      return true;
    });
    
    if (filteredPlayers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: #999;">Nessun altro giocatore presente</td></tr>';
      return;
    }
    
    filteredPlayers.forEach(p => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${p.name}</td>
        <td>${p.decks && p.decks.length > 0 ? p.decks[0].count : 0}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Errore caricamento lista giocatori:", err.message);
  }
}

const MY_PROFILE_ART_BY_NAME = {
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

function resolveMyProfileArt(userPlayer, manualUser, enrichedDecks) {
  const byDb = typeof userPlayer?.image_url === "string" ? userPlayer.image_url.trim() : "";
  if (byDb) return byDb;

  const key = String(userPlayer?.name || manualUser?.username || "").toLowerCase();
  if (MY_PROFILE_ART_BY_NAME[key]) return MY_PROFILE_ART_BY_NAME[key];

  const fromCommander = (enrichedDecks || []).find((d) => d.commanderImageUrl)?.commanderImageUrl;
  if (fromCommander) return fromCommander;

  return "https://cards.scryfall.io/art_crop/front/d/a/da4ab2ac-4b15-4fba-bc11-d4e185e7f99c.jpg?1562794058";
}

async function getDeckUsageStatsForPlayer(playerId, deckIds) {
  const stats = new Map((deckIds || []).map((id) => [id, { uses: 0, wins: 0 }]));

  const { data: matches, error: matchesError } = await supabaseClient
    .from("matches")
    .select("id, winner_id, player1_id, player2_id, deck1_id, deck2_id");
  if (matchesError) throw matchesError;

  const matchIds = (matches || []).map((m) => m.id);
  const winnerByMatch = new Map((matches || []).map((m) => [m.id, m.winner_id]));

  let usedParticipantTable = false;
  if (matchIds.length > 0) {
    const { data: participants, error: partError } = await supabaseClient
      .from("match_participants")
      .select("match_id, deck_id")
      .eq("player_id", playerId)
      .in("match_id", matchIds);

    if (!partError) {
      usedParticipantTable = true;
      (participants || []).forEach((p) => {
        if (!stats.has(p.deck_id)) stats.set(p.deck_id, { uses: 0, wins: 0 });
        const entry = stats.get(p.deck_id);
        entry.uses += 1;
        if (winnerByMatch.get(p.match_id) === playerId) entry.wins += 1;
      });
    }
  }

  if (!usedParticipantTable) {
    (matches || []).forEach((m) => {
      let deckId = null;
      if (m.player1_id === playerId) deckId = m.deck1_id;
      else if (m.player2_id === playerId) deckId = m.deck2_id;
      if (!deckId) return;

      if (!stats.has(deckId)) stats.set(deckId, { uses: 0, wins: 0 });
      const entry = stats.get(deckId);
      entry.uses += 1;
      if (m.winner_id === playerId) entry.wins += 1;
    });
  }

  return stats;
}

// 🔹 CARICA PROFILO PERSONALE
async function loadMyProfile() {
  try {
    const container = document.getElementById("myProfileContainer");
    if (!container) return;
    const manualUser = getManualAuthUser();
    
    let userPlayer = await getCurrentUserPlayer();
    
    if (!userPlayer) {
      container.innerHTML = `
        <div class="profile-setup">
          <h3>👤 Il Tuo Profilo</h3>
          <p>Non hai ancora creato il tuo profilo giocatore.</p>
          <div class="form-group">
            <input id="myPlayerName" placeholder="Il tuo nome giocatore" value="${manualUser?.username || ""}">
            <button onclick="createMyProfile()">Crea Profilo</button>
          </div>
        </div>
      `;
      return;
    }
    
    // Carica mazzi del giocatore
    const { data: decks, error: decksError } = await supabaseClient
      .from("decks")
      .select("*")
      .eq("player_id", userPlayer.id)
      .order("name", { ascending: true });
    if (decksError) throw decksError;

    // Arricchisci i mazzi con dati commander (miniatura + colori aggiornati)
    const enrichedDecks = await Promise.all(
      (decks || []).map(async (deck) => {
        if (!deck.commander) {
          return { ...deck, commanderImageUrl: null, effectiveColors: deck.colors || [] };
        }

        const commanderNames = splitCommanderNames(deck.commander);
        const detailsList = await Promise.all(
          commanderNames.map(async (name) => {
            try {
              return await getCommanderCardDetails(name);
            } catch {
              return null;
            }
          })
        );

        const firstImage = detailsList.find((d) => d?.imageUrl)?.imageUrl || null;
        const fetchedColors = mergeUniqueColors(...detailsList.map((d) => d?.colors || []));

        return {
          ...deck,
          commanderImageUrl: firstImage,
          effectiveColors: mergeUniqueColors(deck.colors || [], fetchedColors)
        };
      })
    );
    
    const deckStats = await getDeckUsageStatsForPlayer(
      userPlayer.id,
      enrichedDecks.map((d) => d.id)
    );
    const profileArt = resolveMyProfileArt(userPlayer, manualUser, enrichedDecks);

    const deckRows = enrichedDecks.map((d) => {
      const stat = deckStats.get(d.id) || { uses: 0, wins: 0 };
      const losses = Math.max(0, stat.uses - stat.wins);
      return {
        id: d.id,
        name: d.name,
        commanderImageUrl: d.commanderImageUrl,
        colors: d.effectiveColors || [],
        uses: stat.uses,
        wins: stat.wins,
        losses
      };
    });

    const sortByName = (a, b) => String(a.name || "").localeCompare(String(b.name || ""));
    const mostUsed = [...deckRows].sort((a, b) => (b.uses - a.uses) || sortByName(a, b))[0] || null;
    const leastUsed = [...deckRows].sort((a, b) => (a.uses - b.uses) || sortByName(a, b))[0] || null;
    const mostWinning = [...deckRows].sort((a, b) => (b.wins - a.wins) || ((b.uses ? b.wins / b.uses : 0) - (a.uses ? a.wins / a.uses : 0)) || sortByName(a, b))[0] || null;
    const mostLosing = [...deckRows].sort((a, b) => (b.losses - a.losses) || sortByName(a, b))[0] || null;

    const totalGames = deckRows.reduce((acc, d) => acc + d.uses, 0);
    const totalWins = deckRows.reduce((acc, d) => acc + d.wins, 0);
    const totalLosses = Math.max(0, totalGames - totalWins);
    const totalWinRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : "0.0";

    const colorNameMap = { W: "Bianco", U: "Blu", B: "Nero", R: "Rosso", G: "Verde" };
    const representedColors = new Map();
    const winningColors = new Map();
    deckRows.forEach((d) => {
      (d.colors || []).forEach((c) => {
        representedColors.set(c, (representedColors.get(c) || 0) + 1);
        const current = winningColors.get(c) || { wins: 0, games: 0 };
        current.wins += d.wins;
        current.games += d.uses;
        winningColors.set(c, current);
      });
    });

    const topRepresentedColor = Array.from(representedColors.entries()).sort((a, b) => b[1] - a[1])[0] || null;
    const topWinningColor = Array.from(winningColors.entries()).sort((a, b) => (b[1].wins - a[1].wins) || (b[1].games - a[1].games))[0] || null;
    const representedColorLabel = topRepresentedColor
      ? `${getManaSymbolsHtml([topRepresentedColor[0]])} ${colorNameMap[topRepresentedColor[0]] || topRepresentedColor[0]} (${topRepresentedColor[1]} mazzi)`
      : "-";
    const winningColorLabel = topWinningColor
      ? `${getManaSymbolsHtml([topWinningColor[0]])} ${colorNameMap[topWinningColor[0]] || topWinningColor[0]} (${topWinningColor[1].wins} vittorie)`
      : "-";

    container.innerHTML = `
      <div class="player-profile-banner" style="background-image:url('${profileArt}');">
        <h2 class="player-profile-banner-title">${userPlayer.name}</h2>
      </div>

      <div class="player-profile-content">
        <section class="player-profile-section player-profile-panel">
          <h3>Lista mazzi</h3>
          <details class="deck-collapsible" open>
            <summary>Mostra/Nascondi (${enrichedDecks.length} mazzi)</summary>
            <div class="decks-list">
              ${enrichedDecks.length === 0 ? '<p style="padding:8px 0;">Nessun mazzo ancora creato.</p>' : 
                enrichedDecks.map((d) => {
                  const stat = deckStats.get(d.id) || { uses: 0, wins: 0 };
                  const colorsHtml = getManaSymbolsHtml(d.effectiveColors);
                  return `
                    <div class="deck-item">
                      ${d.commanderImageUrl ? `<img src="${d.commanderImageUrl}" alt="${d.commander || "commander"}" class="deck-thumb">` : "<div class=\"deck-thumb\"></div>"}
                      <div class="deck-main">
                        <div class="deck-title-row">
                          <span class="deck-name">${d.name}</span>
                          <span class="deck-colors">${colorsHtml || "-"}</span>
                        </div>
                      </div>
                      <div class="deck-side-stats">
                        <span>G: ${stat.uses}</span>
                        <span>W: ${stat.wins}</span>
                      </div>
                      <div class="deck-item-actions">
                        <button class="deck-edit-btn" onclick="editMyDeck('${d.id}', '${encodeURIComponent(d.name || "")}', '${encodeURIComponent(d.commander || "")}')" title="Modifica mazzo" aria-label="Modifica mazzo">✎</button>
                        <button class="deck-delete-btn" onclick="deleteMyDeck('${d.id}')" title="Elimina mazzo" aria-label="Elimina mazzo">🗑</button>
                      </div>
                    </div>
                  `;
                }).join('')
              }
            </div>
          </details>
        </section>

        <section class="player-profile-section player-profile-panel" style="margin-top:10px;">
          <h3>Registra mazzo</h3>
          <input id="myDeckName" placeholder="Nome mazzo">
          <input id="myDeckCommander" list="myDeckCommanderSuggestions" oninput="updateCommanderSuggestions('myDeckCommander', 'myDeckCommanderSuggestions')" placeholder="Commander (obbligatorio)">
          <datalist id="myDeckCommanderSuggestions"></datalist>
          <label style="display:flex;align-items:center;gap:8px;margin:10px 0 8px;font-weight:700;color:#33445b;">
            <input id="myDeckHasPartnerBackground" type="checkbox" onchange="toggleMyDeckPartnerBackground()" style="width:18px;height:18px;margin:0;">
            Partner/background
          </label>
          <div id="myDeckSecondCommanderWrap" style="display:none;">
            <input id="myDeckSecondCommander" list="myDeckSecondCommanderSuggestions" oninput="updateCommanderSuggestions('myDeckSecondCommander', 'myDeckSecondCommanderSuggestions')" placeholder="Secondo comandante o background">
            <datalist id="myDeckSecondCommanderSuggestions"></datalist>
          </div>
          <button onclick="addMyDeck()">Aggiungi Mazzo</button>
        </section>

        <section class="player-profile-section player-profile-panel" style="margin-top:10px;">
          <h3>Statistiche</h3>
          <div class="player-stats-list">
            <div class="player-stat-row">
              <div class="player-stat-label">Mazzo più usato</div>
              <div class="player-stat-value">${mostUsed?.name || "-"} (${mostUsed?.uses || 0})</div>
            </div>
            <div class="player-stat-row">
              <div class="player-stat-label">Mazzo meno usato</div>
              <div class="player-stat-value">${leastUsed?.name || "-"} (${leastUsed?.uses || 0})</div>
            </div>
            <div class="player-stat-row">
              <div class="player-stat-label">Mazzo più vincente</div>
              <div class="player-stat-value">${mostWinning?.name || "-"} (${mostWinning?.wins || 0} W)</div>
            </div>
            <div class="player-stat-row">
              <div class="player-stat-label">Mazzo più perdente</div>
              <div class="player-stat-value">${mostLosing?.name || "-"} (${mostLosing?.losses || 0} L)</div>
            </div>
            <div class="player-stat-row">
              <div class="player-stat-label">Partite giocate</div>
              <div class="player-stat-value">${totalGames}</div>
            </div>
            <div class="player-stat-row">
              <div class="player-stat-label">Winrate</div>
              <div class="player-stat-value">${totalWinRate}% (${totalWins}V / ${totalLosses}S)</div>
            </div>
            <div class="player-stat-row">
              <div class="player-stat-label">Colore più rappresentato</div>
              <div class="player-stat-value">${representedColorLabel}</div>
            </div>
            <div class="player-stat-row">
              <div class="player-stat-label">Colore più vincente</div>
              <div class="player-stat-value">${winningColorLabel}</div>
            </div>
          </div>
        </section>
      </div>
    `;
  } catch (err) {
    console.error("Errore caricamento profilo:", err.message);
  }
}

function mergeUniqueColors(...colorLists) {
  const merged = new Set();
  colorLists.forEach((list) => {
    (Array.isArray(list) ? list : []).forEach((color) => {
      if (color) merged.add(color);
    });
  });
  return Array.from(merged);
}

function toggleMyDeckPartnerBackground() {
  const toggle = document.getElementById("myDeckHasPartnerBackground");
  const wrapper = document.getElementById("myDeckSecondCommanderWrap");
  const secondInput = document.getElementById("myDeckSecondCommander");
  if (!toggle || !wrapper || !secondInput) return;

  if (toggle.checked) {
    wrapper.style.display = "block";
  } else {
    wrapper.style.display = "none";
    secondInput.value = "";
  }
}

// 🔹 CARICA MAZZI PER PLAYER
async function loadDecks(playerId, targetId) {
  try {
    const { data, error } = await supabaseClient
      .from("decks")
      .select("*")
      .eq("player_id", playerId);
    if (error) throw error;

    const el = document.getElementById(targetId);
    if (!el) return;
    
    el.innerHTML = '<option value="">Seleziona mazzo...</option>';

    data.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.name;
      el.appendChild(opt);
    });
  } catch (err) {
    console.error("Errore caricamento mazzi:", err.message);
  }
}

// 🔹 CARICA STORICO PARTITE
async function loadMatches() {
  try {
    // Carica matches senza colors (colonna non ancora aggiunta)
    const { data, error } = await supabaseClient
      .from("matches")
      .select("*, player1:player1_id(name), deck1:deck1_id(name), player2:player2_id(name), deck2:deck2_id(name), winner:winner_id(name)");
    
    if (error) throw error;

    const tbody = document.getElementById("matchesBody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    data.forEach(m => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${m.player1?.name || "?"}</td>
        <td>${m.deck1?.name || "?"}</td>
        <td>${m.player2?.name || "?"}</td>
        <td>${m.deck2?.name || "?"}</td>
        <td><strong>${m.winner?.name || "?"}</strong></td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Errore caricamento storico:", err.message);
  }
}

// 🔹 SCRYFALL API - OTTIENI COLORI COMMANDER
async function getCommanderColors(commanderName) {
  try {
    if (!commanderName || commanderName.trim() === "") {
      return { colors: [], name: "" };
    }
    const card = await getCommanderCardDetails(commanderName);

    return {
      name: card.name,
      colors: card.colors || [],
      legalCommander: card.legalCommander || false,
      imageUrl: card.imageUrl || null
    };
  } catch (error) {
    console.error('Errore Scryfall API:', error);
    throw new Error(`Errore ricerca commander: ${error.message}`);
  }
}

// 🔹 AGGIUNGI GIOCATORE
async function addPlayer() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Utente non autenticato");
    
    const name = document.getElementById("playerName").value;
    if (!name) throw new Error("Nome giocatore obbligatorio");
    
    // Prova prima con user_id, se fallisce (colonna non esiste) crea senza
    let playerData = { name };
    try {
      playerData.user_id = user.id;
      const { error } = await supabaseClient.from("players").insert([playerData]);
      if (error) throw error;
    } catch (insertError) {
      if (insertError.message.includes('user_id')) {
        // Colonna non esiste, crea senza user_id
        console.log('Colonna user_id non trovata, creo giocatore senza associazione utente');
        const { error } = await supabaseClient.from("players").insert([{ name }]);
        if (error) throw error;
      } else {
        throw insertError;
      }
    }
    
    document.getElementById("playerName").value = "";
    loadPlayers();
  } catch (err) {
    alert("Errore aggiunta giocatore: " + err.message);
  }
}

// 🔹 AGGIUNGI MAZZO
async function addDeck() {
  try {
    const player_id = document.getElementById("playerSelect").value;
    const name = document.getElementById("deckName").value;
    const commander = document.getElementById("deckCommander").value;
    
    if (!player_id || !name || !commander) throw new Error("Seleziona giocatore, nome mazzo e commander");
    
    // Ottieni colori dal commander
    let colors = [];
    const commanderData = await getCommanderColors(commander);
    colors = commanderData.colors;
    
    const { error } = await supabaseClient.from("decks").insert([{
      name,
      player_id,
      commander,
      colors: colors.length > 0 ? colors : null
    }]);
    
    if (error) throw error;
    
    document.getElementById("deckName").value = "";
    document.getElementById("deckCommander").value = "";
    updateDecksList();
    loadPlayers();
  } catch (err) {
    alert("Errore aggiunta mazzo: " + err.message);
  }
}

// 🔹 AGGIUNGI PARTITA
async function addMatch() {
  try {
    const player1_id = document.getElementById("p1").value;
    const deck1_id = document.getElementById("d1").value;
    const player2_id = document.getElementById("p2").value;
    const deck2_id = document.getElementById("d2").value;
    const winner_id = document.getElementById("winner").value;

    if (!player1_id || !deck1_id || !player2_id || !deck2_id || !winner_id) {
      throw new Error("Compila tutti i campi per la partita");
    }

    const { error } = await supabaseClient.from("matches").insert([{
      player1_id,
      deck1_id,
      player2_id,
      deck2_id,
      winner_id
    }]);
    if (error) throw error;

    // Pulisci form
    document.getElementById("p1").value = "";
    document.getElementById("d1").value = "";
    document.getElementById("p2").value = "";
    document.getElementById("d2").value = "";
    document.getElementById("winner").value = "";
    
    alert("Partita salvata!");
    loadMatches();
  } catch (err) {
    alert("Errore salvataggio partita: " + err.message);
  }
}

// 🔹 CREA PROFILO PERSONALE
async function createMyProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Utente non autenticato");
    const manualUser = getManualAuthUser();
    
    const nameInput = document.getElementById("myPlayerName").value;
    const name = (nameInput || manualUser?.username || "").trim();
    if (!name) throw new Error("Nome giocatore obbligatorio");
    
    if (manualUser) {
      // In login manuale non esiste auth.users: evita user_id (FK).
      const { error } = await supabaseClient.from("players").insert([{ name }]);
      if (error) throw error;

      document.getElementById("myPlayerName").value = "";
      loadMyProfile();
      loadPlayers();
      alert("Profilo creato con successo!");
      return;
    }

    // Prova prima con user_id, se fallisce (colonna non esiste) crea senza
    let playerData = { name };
    try {
      playerData.user_id = user.id;
      const { error } = await supabaseClient.from("players").insert([playerData]);
      if (error) throw error;
    } catch (insertError) {
      if (insertError.message.includes('user_id')) {
        // Colonna non esiste, crea senza user_id
        console.log('Colonna user_id non trovata, creo profilo senza associazione utente');
        alert('⚠️ Attenzione: La colonna user_id non è stata aggiunta al database. Il profilo verrà creato ma non sarà associato al tuo account. Aggiungi la colonna con: ALTER TABLE players ADD COLUMN user_id UUID REFERENCES auth.users(id);');
        const { error } = await supabaseClient.from("players").insert([{ name }]);
        if (error) throw error;
      } else {
        throw insertError;
      }
    }
    
    document.getElementById("myPlayerName").value = "";
    loadMyProfile();
    loadPlayers(); // Aggiorna dropdown
    alert("Profilo creato con successo!");
  } catch (err) {
    alert("Errore creazione profilo: " + err.message);
  }
}

// 🔹 AGGIUNGI MAZZO AL PROFILO PERSONALE
async function addMyDeck() {
  try {
    const userPlayer = await getCurrentUserPlayer();
    if (!userPlayer) {
      alert("Crea prima il tuo profilo giocatore dalla sezione 'Il Mio Profilo'");
      // Naviga al profilo
      navigateToSubpage('myProfile');
      return;
    }
    
    const name = document.getElementById("myDeckName").value;
    const commander = document.getElementById("myDeckCommander").value;
    const hasPartnerBackground = !!document.getElementById("myDeckHasPartnerBackground")?.checked;
    const secondCommanderInput = document.getElementById("myDeckSecondCommander")?.value || "";
    
    if (!name || !commander) throw new Error("Nome mazzo e commander obbligatori");

    if (hasPartnerBackground && !secondCommanderInput.trim()) {
      throw new Error("Inserisci il secondo comandante o background");
    }
    
    const commanderData = await getCommanderColors(commander);
    let finalCommanderName = commanderData.name || commander.trim();
    let colors = commanderData.colors || [];

    if (hasPartnerBackground) {
      const secondCommanderData = await getCommanderColors(secondCommanderInput);
      const secondName = secondCommanderData.name || secondCommanderInput.trim();
      finalCommanderName = `${finalCommanderName} / ${secondName}`;
      colors = mergeUniqueColors(colors, secondCommanderData.colors || []);
    }
    
    const { error } = await supabaseClient.from("decks").insert([{
      name,
      player_id: userPlayer.id,
      commander: finalCommanderName,
      colors: colors.length > 0 ? colors : null
    }]);
    
    if (error) throw error;
    
    document.getElementById("myDeckName").value = "";
    document.getElementById("myDeckCommander").value = "";
    const toggle = document.getElementById("myDeckHasPartnerBackground");
    if (toggle) {
      toggle.checked = false;
      toggleMyDeckPartnerBackground();
    }
    loadMyProfile();
    loadPlayers(); // Aggiorna dropdown
  } catch (err) {
    alert("Errore aggiunta mazzo: " + err.message);
  }
}

// 🔹 ELIMINA MAZZO DAL PROFILO PERSONALE
async function deleteMyDeck(deckId) {
  if (!confirm("Sei sicuro di voler eliminare questo mazzo?")) return;
  try {
    const { error } = await supabaseClient
      .from("decks")
      .delete()
      .eq("id", deckId);
    if (error) throw error;
    loadMyProfile();
    loadPlayers(); // Aggiorna dropdown
  } catch (err) {
    alert("Errore eliminazione mazzo: " + err.message);
  }
}

// 🔹 MODIFICA MAZZO DEL PROFILO PERSONALE
async function editMyDeck(deckId, encodedName, encodedCommander) {
  try {
    const currentName = decodeURIComponent(encodedName || "");
    const currentCommander = decodeURIComponent(encodedCommander || "");

    const nameInput = prompt("Nuovo nome mazzo:", currentName);
    if (nameInput === null) return;
    const newName = nameInput.trim();
    if (!newName) throw new Error("Il nome del mazzo non puo essere vuoto");

    const commanderInputRaw = prompt(
      "Nuovo comandante (usa '/' per partner/background):",
      currentCommander
    );
    if (commanderInputRaw === null) return;
    const commanderInput = commanderInputRaw.trim();
    if (!commanderInput) throw new Error("Il comandante non puo essere vuoto");

    const commanderParts = splitCommanderNames(commanderInput);
    if (commanderParts.length === 0) {
      throw new Error("Formato comandante non valido");
    }

    const commanderDetails = await Promise.all(
      commanderParts.map((name) => getCommanderColors(name))
    );

    const finalCommander = commanderDetails
      .map((c, idx) => c.name || commanderParts[idx])
      .join(" / ");
    const colors = mergeUniqueColors(...commanderDetails.map((c) => c.colors || []));

    const { error } = await supabaseClient
      .from("decks")
      .update({
        name: newName,
        commander: finalCommander,
        colors: colors.length > 0 ? colors : null
      })
      .eq("id", deckId);

    if (error) throw error;

    loadMyProfile();
    loadPlayers(); // Aggiorna dropdown
  } catch (err) {
    alert("Errore modifica mazzo: " + err.message);
  }
}
