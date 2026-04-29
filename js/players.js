// 🔹 LOGICA SEZIONE GIOCATORI

const PLAYER_CARD_ARTS = [
  "https://cards.scryfall.io/art_crop/front/d/a/da4ab2ac-4b15-4fba-bc11-d4e185e7f99c.jpg?1562794058",
  "https://cards.scryfall.io/art_crop/front/1/e/1e7c0de1-cff8-4727-bf2a-17f553fd68f2.jpg?1562901710",
  "https://cards.scryfall.io/art_crop/front/8/5/8592e18c-99f7-4e42-9280-c1f30255b8ec.jpg?1562922017",
  "https://cards.scryfall.io/art_crop/front/1/2/1259a0a3-e4ce-4217-bc24-a7f385f4f912.jpg?1562799238",
  "https://cards.scryfall.io/art_crop/front/a/f/af6f85d9-bbd8-4f31-9f16-75d5620bb9cf.jpg?1562932163"
];

// Associa qui immagini personalizzate per nome giocatore (chiave in minuscolo).
const PLAYER_ART_BY_NAME = {
  "pedro": "https://cards.scryfall.io/art_crop/front/0/f/0fa5725c-fcf8-4f84-9093-75b454b4755f.jpg?1559592403",
  "carosta": "https://cards.scryfall.io/art_crop/front/a/4/a4d2f904-3d68-4192-aa8d-9521b9747fbd.jpg?1562489348",
  "carota": "https://cards.scryfall.io/art_crop/front/a/4/a4d2f904-3d68-4192-aa8d-9521b9747fbd.jpg?1562489348",
  "gerry": "https://cards.scryfall.io/art_crop/front/a/e/aea8ab0f-6898-4312-9989-915d6357515f.jpg?1562799140",
  "vito": "https://cards.scryfall.io/art_crop/front/e/5/e56ccbd2-c17d-4625-bc11-181d36a84936.jpg?1562489835",
  "gordon": "https://cards.scryfall.io/art_crop/front/9/0/90f17b85-a866-48e8-aae0-55330109550e.jpg?1562488879",
  "doug": "https://cards.scryfall.io/art_crop/front/6/5/651626f5-aca6-4653-aa27-36c919566cb0.jpg?1720467986",
  "boss": "https://cards.scryfall.io/art_crop/front/0/0/00325992-ec1c-469a-8df0-ffb9a197d221.jpg?1562799056",
  "flint": "https://cards.scryfall.io/art_crop/front/0/e/0e62aa7e-d9f9-42d4-9eed-5f51f88047c6.jpg?1562628641",
  "zatta": "https://cards.scryfall.io/art_crop/front/0/2/0276e9da-73fc-4d27-bbf1-726a37f5d5a0.jpg?1562487438"
};

const MTG_COLOR_NAMES = { W: "Bianco", U: "Blu", B: "Nero", R: "Rosso", G: "Verde" };

// Navigazione tra sottopagine
function navigateToSubpage(subpageName) {
  const playersDashboard = document.getElementById("playersDashboard");
  const playerProfilePage = document.getElementById("playerProfile-page");
  const myProfilePage = document.getElementById("myProfile-page");

  // Nascondi tutte le sottopagine disponibili
  if (playersDashboard) playersDashboard.style.display = "none";
  if (playerProfilePage) playerProfilePage.style.display = "none";
  if (myProfilePage) myProfilePage.style.display = "none";
  
  // Mostra la sottopagina selezionata
  if (subpageName === "myProfile") {
    if (myProfilePage) myProfilePage.style.display = "block";
    loadMyProfile();
  } else if (subpageName === "playerProfile") {
    if (playerProfilePage) playerProfilePage.style.display = "block";
  } else {
    // Torna al dashboard
    if (playersDashboard) playersDashboard.style.display = "block";
    loadPlayersDashboard();
  }
}

function formatDeckName(deckStat) {
  return deckStat?.name || "-";
}

function renderColorLabel(colorCode) {
  if (!colorCode) return "-";
  return `${getManaSymbolsHtml([colorCode])} ${MTG_COLOR_NAMES[colorCode] || colorCode}`;
}

function pickMostUsedDeck(deckStats) {
  return [...deckStats].sort((a, b) => {
    if (b.uses !== a.uses) return b.uses - a.uses;
    return a.name.localeCompare(b.name);
  })[0] || null;
}

function pickLeastUsedDeck(deckStats) {
  return [...deckStats].sort((a, b) => {
    if (a.uses !== b.uses) return a.uses - b.uses;
    return a.name.localeCompare(b.name);
  })[0] || null;
}

function pickMostWinningDeck(deckStats) {
  return [...deckStats].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const wrA = a.uses > 0 ? a.wins / a.uses : 0;
    const wrB = b.uses > 0 ? b.wins / b.uses : 0;
    if (wrB !== wrA) return wrB - wrA;
    return a.name.localeCompare(b.name);
  })[0] || null;
}

function pickMostLosingDeck(deckStats) {
  return [...deckStats].sort((a, b) => {
    if (b.losses !== a.losses) return b.losses - a.losses;
    return a.name.localeCompare(b.name);
  })[0] || null;
}

function pickMostRepresentedColor(decks) {
  const map = new Map();
  (decks || []).forEach((d) => {
    const colors = Array.isArray(d.colors) ? d.colors : [];
    colors.forEach((c) => map.set(c, (map.get(c) || 0) + 1));
  });
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0] || null;
}

function pickMostWinningColor(colorStatsMap) {
  return Array.from(colorStatsMap.values()).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.games !== a.games) return b.games - a.games;
    return String(a.color).localeCompare(String(b.color));
  })[0] || null;
}

function resolvePlayerCardArt(player, idx) {
  const byDb = typeof player?.image_url === "string" ? player.image_url.trim() : "";
  if (byDb) return byDb;

  const byName = PLAYER_ART_BY_NAME[String(player?.name || "").toLowerCase()];
  if (byName) return byName;

  return PLAYER_CARD_ARTS[idx % PLAYER_CARD_ARTS.length];
}

function resolvePlayerProfileArt(player) {
  const byDb = typeof player?.image_url === "string" ? player.image_url.trim() : "";
  if (byDb) return byDb;

  const byName = PLAYER_ART_BY_NAME[String(player?.name || "").toLowerCase()];
  if (byName) return byName;

  const seed = String(player?.name || "");
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % PLAYER_CARD_ARTS.length;
  }
  return PLAYER_CARD_ARTS[hash];
}

async function loadPlayersCards() {
  const container = document.getElementById("playersCardsContainer");
  if (!container) return;

  try {
    let players = null;
    let error = null;
    ({ data: players, error } = await supabaseClient
      .from("players")
      .select("id, name, image_url")
      .order("name", { ascending: true }));

    // Compatibilita schema: se image_url non esiste ancora, fallback senza colonna.
    if (error && error.message.includes("image_url")) {
      ({ data: players, error } = await supabaseClient
        .from("players")
        .select("id, name")
        .order("name", { ascending: true }));
    }

    if (error) throw error;

    const playerList = players || [];
    const manualUser = typeof getManualAuthUser === "function" ? getManualAuthUser() : null;

    let currentPlayerId = null;
    if (!manualUser?.username && typeof getCurrentUserPlayer === "function") {
      try {
        const currentPlayer = await getCurrentUserPlayer();
        currentPlayerId = currentPlayer?.id || null;
      } catch {
        currentPlayerId = null;
      }
    }

    const visiblePlayers = playerList.filter((p) => {
      if (manualUser?.username) {
        return String(p.name || "").toLowerCase() !== String(manualUser.username).toLowerCase();
      }
      if (currentPlayerId) {
        return p.id !== currentPlayerId;
      }
      return true;
    });

    container.innerHTML = "";

    if (!visiblePlayers.length) {
      container.innerHTML = '<p style="color:#999;">Nessun altro giocatore presente.</p>';
      return;
    }

    visiblePlayers.forEach((s, idx) => {
      const art = resolvePlayerCardArt(s, idx);

      const card = document.createElement("div");
      card.className = "box player-card-clickable";
      card.onclick = () => openPlayerProfile(s.id);
      card.innerHTML = `
        <div style="height:180px;">
          <img src="${art}" alt="art" style="width:100%; height:100%; object-fit:cover; object-position:center; display:block;">
        </div>
        <h3 class="player-card-name">${s.name}</h3>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<p style="color:#dc3545;">${err.message}</p>`;
  }
}

async function buildPlayerProfileData(playerId) {
  let player = null;
  let playerError = null;
  ({ data: player, error: playerError } = await supabaseClient
    .from("players")
    .select("id, name, image_url")
    .eq("id", playerId)
    .single());

  if (playerError && playerError.message.includes("image_url")) {
    ({ data: player, error: playerError } = await supabaseClient
      .from("players")
      .select("id, name")
      .eq("id", playerId)
      .single());
  }

  if (playerError) throw playerError;

  const { data: decks, error: decksError } = await supabaseClient
    .from("decks")
    .select("id, name, commander, colors")
    .eq("player_id", playerId)
    .order("name", { ascending: true });
  if (decksError) throw decksError;

  const enrichedDecks = await Promise.all(
    (decks || []).map(async (deck) => {
      if (!deck.commander) {
        return {
          ...deck,
          commanderImageUrl: null,
          effectiveColors: Array.isArray(deck.colors) ? deck.colors : []
        };
      }

      const commanderNames = typeof splitCommanderNames === "function"
        ? splitCommanderNames(deck.commander)
        : [String(deck.commander || "").trim()].filter(Boolean);

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
      const fetchedColors = typeof mergeUniqueColors === "function"
        ? mergeUniqueColors(...detailsList.map((d) => d?.colors || []))
        : [];
      const baseColors = Array.isArray(deck.colors) ? deck.colors : [];
      const effectiveColors = typeof mergeUniqueColors === "function"
        ? mergeUniqueColors(baseColors, fetchedColors)
        : baseColors;

      return {
        ...deck,
        commanderImageUrl: firstImage,
        effectiveColors
      };
    })
  );

  const deckMap = new Map();
  const deckStatsMap = new Map();
  enrichedDecks.forEach((d) => {
    deckMap.set(d.id, d);
    deckStatsMap.set(d.id, {
      id: d.id,
      name: d.name || "-",
      commander: d.commander || "-",
      colors: Array.isArray(d.effectiveColors) ? d.effectiveColors : [],
      uses: 0,
      wins: 0,
      losses: 0
    });
  });

  const { data: matches, error: matchesError } = await supabaseClient
    .from("matches")
    .select("id, winner_id, player1_id, player2_id, deck1_id, deck2_id")
    .order("id", { ascending: false });
  if (matchesError) throw matchesError;

  const winnerByMatch = new Map((matches || []).map((m) => [m.id, m.winner_id]));
  const matchIds = (matches || []).map((m) => m.id);
  const colorStatsMap = new Map();

  const upsertColorStat = (colorCode, isWin) => {
    const current = colorStatsMap.get(colorCode) || { color: colorCode, wins: 0, losses: 0, games: 0 };
    current.games += 1;
    if (isWin) current.wins += 1;
    else current.losses += 1;
    colorStatsMap.set(colorCode, current);
  };

  let games = 0;
  let wins = 0;
  let losses = 0;
  let usedParticipantTable = false;

  if (matchIds.length > 0) {
    const { data: parts, error: partsError } = await supabaseClient
      .from("match_participants")
      .select("match_id, deck_id, deck:deck_id(name, commander, colors)")
      .eq("player_id", playerId)
      .in("match_id", matchIds);

    if (!partsError) {
      usedParticipantTable = true;
      (parts || []).forEach((p) => {
        const isWin = winnerByMatch.get(p.match_id) === playerId;
        const deckData = deckMap.get(p.deck_id) || p.deck || {};
        const stat = deckStatsMap.get(p.deck_id) || {
          id: p.deck_id,
          name: deckData.name || "-",
          commander: deckData.commander || "-",
          colors: Array.isArray(deckData.colors) ? deckData.colors : [],
          uses: 0,
          wins: 0,
          losses: 0
        };

        stat.uses += 1;
        games += 1;
        if (isWin) {
          stat.wins += 1;
          wins += 1;
        } else {
          stat.losses += 1;
          losses += 1;
        }
        deckStatsMap.set(p.deck_id, stat);

        (Array.isArray(stat.colors) ? stat.colors : []).forEach((c) => upsertColorStat(c, isWin));
      });
    }
  }

  if (!usedParticipantTable) {
    (matches || []).forEach((m) => {
      let deckId = null;
      if (m.player1_id === playerId) deckId = m.deck1_id;
      else if (m.player2_id === playerId) deckId = m.deck2_id;
      if (!deckId) return;

      const isWin = m.winner_id === playerId;
      const deckData = deckMap.get(deckId) || {};
      const stat = deckStatsMap.get(deckId) || {
        id: deckId,
        name: deckData.name || "-",
        commander: deckData.commander || "-",
        colors: Array.isArray(deckData.colors) ? deckData.colors : [],
        uses: 0,
        wins: 0,
        losses: 0
      };

      stat.uses += 1;
      games += 1;
      if (isWin) {
        stat.wins += 1;
        wins += 1;
      } else {
        stat.losses += 1;
        losses += 1;
      }
      deckStatsMap.set(deckId, stat);

      (Array.isArray(stat.colors) ? stat.colors : []).forEach((c) => upsertColorStat(c, isWin));
    });
  }

  return {
    player,
    decks: enrichedDecks,
    deckStats: Array.from(deckStatsMap.values()),
    games,
    wins,
    losses,
    winRate: games > 0 ? ((wins / games) * 100).toFixed(1) : "0.0",
    mostRepresentedColor: pickMostRepresentedColor(decks || []),
    mostWinningColor: pickMostWinningColor(colorStatsMap)
  };
}

function renderPlayerProfile(data) {
  const container = document.getElementById("playerProfileContainer");
  if (!container) return;

  const mostUsed = pickMostUsedDeck(data.deckStats);
  const leastUsed = pickLeastUsedDeck(data.deckStats);
  const mostWinning = pickMostWinningDeck(data.deckStats);
  const mostLosing = pickMostLosingDeck(data.deckStats);
  const deckStatsById = new Map((data.deckStats || []).map((s) => [s.id, s]));
  const profileArt = resolvePlayerProfileArt(data.player);

  const decksListHtml = (data.decks || []).length
    ? data.decks.map((d) => {
      const colors = Array.isArray(d.effectiveColors) && d.effectiveColors.length
        ? getManaSymbolsHtml(d.effectiveColors)
        : "-";
      const deckStat = deckStatsById.get(d.id);

      return `
        <div class="deck-item">
          ${d.commanderImageUrl ? `<img src="${d.commanderImageUrl}" alt="${d.commander || "commander"}" class="deck-thumb">` : "<div class=\"deck-thumb\"></div>"}
          <div class="deck-main">
            <div class="deck-title-row">
              <span class="deck-name">${d.name || "-"}</span>
              <span class="deck-colors">${colors}</span>
            </div>
          </div>
          <div class="deck-side-stats">
            <span>G: ${deckStat?.uses || 0}</span>
            <span>W: ${deckStat?.wins || 0}</span>
          </div>
        </div>
      `;
    }).join("")
    : "<p>Nessun mazzo registrato.</p>";

  const representedColorLabel = data.mostRepresentedColor
    ? `${renderColorLabel(data.mostRepresentedColor[0])} (${data.mostRepresentedColor[1]} mazzi)`
    : "-";

  const winningColorLabel = data.mostWinningColor
    ? `${renderColorLabel(data.mostWinningColor.color)} (${data.mostWinningColor.wins} vittorie)`
    : "-";

  container.innerHTML = `
    <div class="player-profile-banner" style="background-image:url('${profileArt}');">
      <h2 class="player-profile-banner-title">${data.player?.name || "Profilo giocatore"}</h2>
    </div>

    <div class="player-profile-content">
      <section class="player-profile-section player-profile-panel">
        <h3>Lista mazzi</h3>
        <details class="deck-collapsible" open>
          <summary>Mostra/Nascondi (${(data.decks || []).length} mazzi)</summary>
          <div class="decks-list">
            ${decksListHtml}
          </div>
        </details>
      </section>

      <section class="player-profile-section player-profile-panel" style="margin-top:10px;">
        <h3>Statistiche</h3>
        <div class="player-stats-list">
          <div class="player-stat-row">
            <div class="player-stat-label">Mazzo più usato</div>
            <div class="player-stat-value">${formatDeckName(mostUsed)} (${mostUsed?.uses || 0})</div>
          </div>
          <div class="player-stat-row">
            <div class="player-stat-label">Mazzo meno usato</div>
            <div class="player-stat-value">${formatDeckName(leastUsed)} (${leastUsed?.uses || 0})</div>
          </div>
          <div class="player-stat-row">
            <div class="player-stat-label">Mazzo più vincente</div>
            <div class="player-stat-value">${formatDeckName(mostWinning)} (${mostWinning?.wins || 0} W)</div>
          </div>
          <div class="player-stat-row">
            <div class="player-stat-label">Mazzo più perdente</div>
            <div class="player-stat-value">${formatDeckName(mostLosing)} (${mostLosing?.losses || 0} L)</div>
          </div>
          <div class="player-stat-row">
            <div class="player-stat-label">Partite giocate</div>
            <div class="player-stat-value">${data.games}</div>
          </div>
          <div class="player-stat-row">
            <div class="player-stat-label">Winrate</div>
            <div class="player-stat-value">${data.winRate}% (${data.wins}V / ${data.losses}S)</div>
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
}

async function openPlayerProfile(playerId) {
  const container = document.getElementById("playerProfileContainer");
  navigateToSubpage("playerProfile");

  if (container) {
    container.innerHTML = "<p>Caricamento profilo giocatore...</p>";
  }

  try {
    const data = await buildPlayerProfileData(playerId);
    renderPlayerProfile(data);
  } catch (err) {
    if (container) {
      container.innerHTML = `<p style=\"color:#dc3545;\">${err.message}</p>`;
    }
  }
}

async function loadPlayersDashboard() {
  await loadPlayersCards();
}

// Inizializzazione sezione giocatori
function initPlayersSection() {
  // Mostra il dashboard
  navigateToSubpage(null);
  
  // Controlla se mostrare avviso database
  checkDatabaseSetup();
}

// Controlla configurazione database
async function checkDatabaseSetup() {
  try {
    const { error } = await supabaseClient
      .from('players')
      .select('user_id')
      .limit(1);
    
    const warning = document.getElementById('dbWarning');
    if (warning) {
      warning.style.display = error ? 'block' : 'none';
    }
  } catch (err) {
    console.log('Controllo database:', err.message);
  }
}
