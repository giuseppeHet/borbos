// 🔹 LOGICA SEZIONE PARTITE

let matchesPlayersCache = [];

const MATCH_PLAYER_ART_BY_NAME = {
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

function getFallbackPlayerArtByName(name) {
  return MATCH_PLAYER_ART_BY_NAME[String(name || "").toLowerCase()] ||
    "https://cards.scryfall.io/art_crop/front/d/a/da4ab2ac-4b15-4fba-bc11-d4e185e7f99c.jpg?1562794058";
}

function toggleYearGroup(yearKey) {
  const rows = document.querySelectorAll(`.year-group-${yearKey}`);
  const marker = document.getElementById(`year-marker-${yearKey}`);
  if (!rows.length || !marker) return;

  const isHidden = rows[0].style.display === "none";
  rows.forEach((r) => {
    r.style.display = isHidden ? "table-row" : "none";
  });
  marker.textContent = isHidden ? "▼" : "▶";
}

function getAvailableYears() {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current; y >= 2018; y--) years.push(y);
  return years;
}

function populateYearSelects() {
  const yearSelect = document.getElementById("matchYear");
  const statsFilter = document.getElementById("statsYearFilter");
  const years = getAvailableYears();
  const current = String(new Date().getFullYear());

  if (yearSelect) {
    yearSelect.innerHTML = years
      .map((y) => `<option value="${y}" ${String(y) === current ? "selected" : ""}>${y}</option>`)
      .join("");
  }

  if (statsFilter) {
    statsFilter.innerHTML =
      '<option value="all" selected>Tutti gli anni</option>' +
      years.map((y) => `<option value="${y}">${y}</option>`).join("");
  }
}

async function fetchAllPlayers() {
  const { data, error } = await supabaseClient
    .from("players")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchDecksByPlayer(playerId) {
  const { data, error } = await supabaseClient
    .from("decks")
    .select("id, name, colors")
    .eq("player_id", playerId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

function buildPlayerOptions() {
  return ['<option value="">Seleziona giocatore...</option>']
    .concat(matchesPlayersCache.map((p) => `<option value="${p.id}">${p.name}</option>`))
    .join("");
}

function buildDeckOptions(decks) {
  return ['<option value="">Seleziona mazzo...</option>']
    .concat((decks || []).map((d) => `<option value="${d.id}">${d.name}</option>`))
    .join("");
}

function updateWinnerOptions() {
  const winner = document.getElementById("winner");
  if (!winner) return;

  const selected = [];
  document.querySelectorAll(".match-player-select").forEach((sel) => {
    if (sel.value) {
      const p = matchesPlayersCache.find((x) => x.id === sel.value);
      if (p) selected.push(p);
    }
  });

  winner.innerHTML = '<option value="">Seleziona vincitore...</option>' +
    selected.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
}

async function onParticipantPlayerChange(index) {
  const playerSelect = document.getElementById(`mp_player_${index}`);
  const deckSelect = document.getElementById(`mp_deck_${index}`);
  if (!playerSelect || !deckSelect) return;

  deckSelect.innerHTML = '<option value="">Caricamento mazzi...</option>';
  if (!playerSelect.value) {
    deckSelect.innerHTML = '<option value="">Seleziona mazzo...</option>';
    updateWinnerOptions();
    return;
  }

  try {
    const decks = await fetchDecksByPlayer(playerSelect.value);
    deckSelect.innerHTML = buildDeckOptions(decks);
  } catch {
    deckSelect.innerHTML = '<option value="">Errore caricamento mazzi</option>';
  }

  updateWinnerOptions();
}

function renderMatchParticipantsForm() {
  const container = document.getElementById("participantsContainer");
  const countSelect = document.getElementById("playersCount");
  if (!container || !countSelect) return;

  const count = parseInt(countSelect.value, 10);
  let html = "";

  for (let i = 1; i <= count; i++) {
    html += `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
        <select id="mp_player_${i}" class="match-player-select" onchange="onParticipantPlayerChange(${i})">
          ${buildPlayerOptions()}
        </select>
        <select id="mp_deck_${i}" class="match-deck-select">
          <option value="">Seleziona mazzo...</option>
        </select>
      </div>
    `;
  }

  container.innerHTML = html;
  updateWinnerOptions();
}

function getParticipantsFromForm() {
  const count = parseInt(document.getElementById("playersCount").value, 10);
  const participants = [];

  for (let i = 1; i <= count; i++) {
    const player_id = document.getElementById(`mp_player_${i}`)?.value;
    const deck_id = document.getElementById(`mp_deck_${i}`)?.value;
    if (!player_id || !deck_id) {
      throw new Error(`Compila giocatore e mazzo per il partecipante ${i}`);
    }
    participants.push({ player_id, deck_id });
  }

  const uniquePlayers = new Set(participants.map((p) => p.player_id));
  if (uniquePlayers.size !== participants.length) {
    throw new Error("Non puoi selezionare lo stesso giocatore piu volte");
  }

  return participants;
}

async function deleteMatch(matchId) {
  const confirmed = window.confirm("Eliminare questa partita?");
  if (!confirmed) return;

  try {
    const { error: partError } = await supabaseClient
      .from("match_participants")
      .delete()
      .eq("match_id", matchId);

    if (partError && !partError.message.includes("match_participants")) {
      throw partError;
    }

    const { error } = await supabaseClient
      .from("matches")
      .delete()
      .eq("id", matchId);
    if (error) throw error;

    loadMatches();
    loadMatchStats();
  } catch (err) {
    alert("Errore eliminazione partita: " + err.message);
  }
}

async function loadMatches() {
  const tbody = document.getElementById("matchesBody");
  if (!tbody) return;

  tbody.innerHTML = "<tr><td colspan='3'>Caricamento...</td></tr>";

  try {
    let matches = null;
    let matchesError = null;
    ({ data: matches, error: matchesError } = await supabaseClient
      .from("matches")
      .select("id, winner_id, player1_id, player2_id, match_year, winner:winner_id(name), deck1:deck1_id(name), deck2:deck2_id(name)")
      .order("id", { ascending: false })
      .limit(100));

    if (matchesError && matchesError.message.includes("match_year")) {
      ({ data: matches, error: matchesError } = await supabaseClient
        .from("matches")
        .select("id, winner_id, player1_id, player2_id, winner:winner_id(name), deck1:deck1_id(name), deck2:deck2_id(name)")
        .order("id", { ascending: false })
        .limit(100));
    }

    if (matchesError) throw matchesError;

    const matchIds = (matches || []).map((m) => m.id);
    let participants = [];

    if (matchIds.length > 0) {
      let partData = null;
      let partError = null;

      ({ data: partData, error: partError } = await supabaseClient
        .from("match_participants")
        .select("match_id, player_id, deck_id, participant_order, player:player_id(name), deck:deck_id(name)")
        .in("match_id", matchIds));

      if (partError && partError.message.includes("participant_order")) {
        ({ data: partData, error: partError } = await supabaseClient
          .from("match_participants")
          .select("match_id, player_id, deck_id, player:player_id(name), deck:deck_id(name)")
          .in("match_id", matchIds));
      }

      if (partError) {
        throw new Error(`match_participants SELECT: ${partError.message}`);
      }
      participants = partData || [];
    }

    const byMatch = new Map();
    participants.forEach((p) => {
      if (!byMatch.has(p.match_id)) byMatch.set(p.match_id, []);
      byMatch.get(p.match_id).push(p);
    });

    tbody.innerHTML = "";
    if (!matches || matches.length === 0) {
      tbody.innerHTML = "<tr><td colspan='3' style='color:#999;'>Nessuna partita registrata</td></tr>";
      return;
    }

    const groupedByYear = new Map();
    matches.forEach((m) => {
      const year = String(m.match_year || "Senza anno");
      if (!groupedByYear.has(year)) groupedByYear.set(year, []);
      groupedByYear.get(year).push(m);
    });

    const orderedYears = Array.from(groupedByYear.keys()).sort((a, b) => {
      if (a === "Senza anno") return 1;
      if (b === "Senza anno") return -1;
      return Number(b) - Number(a);
    });

    orderedYears.forEach((year, yearIndex) => {
      const yearKey = year.replace(/[^a-zA-Z0-9]/g, "_");
      const yearMatches = groupedByYear.get(year) || [];
      const headerRow = document.createElement("tr");
      headerRow.style.background = "#f5f7fb";
      headerRow.style.cursor = "pointer";
      headerRow.onclick = () => toggleYearGroup(yearKey);
      headerRow.innerHTML = `
        <td colspan="3" style="font-weight:bold;color:#334;">
          <span id="year-marker-${yearKey}">${yearIndex === 0 ? "▼" : "▶"}</span>
          &nbsp;${year} (${yearMatches.length} partite)
        </td>
      `;
      tbody.appendChild(headerRow);

      yearMatches.forEach((m) => {
      const parts = (byMatch.get(m.id) || []).slice().sort((a, b) => {
        const ao = a.participant_order ?? Number.MAX_SAFE_INTEGER;
        const bo = b.participant_order ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return (a.player?.name || "").localeCompare(b.player?.name || "");
      });
      const participantsCount = parts.length;
      const participantPairs = parts
        .map((p) => `${p.player?.name || "?"} - ${p.deck?.name || "?"}`)
        .join("<br>");

      const winnerPart = parts.find((p) => p.player_id === m.winner_id);
      let winnerDeckName = winnerPart?.deck?.name || "";
      if (!winnerDeckName) {
        if (m.winner_id === m.player1_id) winnerDeckName = m.deck1?.name || "";
        else if (m.winner_id === m.player2_id) winnerDeckName = m.deck2?.name || "";
      }
      const winnerLabel = `${m.winner?.name || "?"}${winnerDeckName ? ` - ${winnerDeckName}` : ""}`;

      const row = document.createElement("tr");
      row.className = `year-group-${yearKey}`;
      row.style.display = yearIndex === 0 ? "table-row" : "none";
      row.innerHTML = `
        <td>${participantsCount}</td>
        <td>${participantPairs || "-"}</td>
        <td>
          <div class="match-winner-cell">
            <strong>${winnerLabel}</strong>
            <button class="match-delete-btn" onclick="deleteMatch('${m.id}')">Elimina</button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan='3' style='color:#dc3545;'>${err.message}</td></tr>`;
  }
}

async function addMatch() {
  try {
    const participants = getParticipantsFromForm();
    const winner_id = document.getElementById("winner").value;
    const matchYear = parseInt(document.getElementById("matchYear")?.value, 10);
    if (!winner_id) throw new Error("Seleziona il vincitore");
    if (!matchYear || Number.isNaN(matchYear)) throw new Error("Seleziona l'anno della partita");

    if (!participants.some((p) => p.player_id === winner_id)) {
      throw new Error("Il vincitore deve essere tra i partecipanti");
    }

    const first = participants[0];
    const second = participants[1] || participants[0];

    let createdMatch = null;
    let matchError = null;
    ({ data: createdMatch, error: matchError } = await supabaseClient
      .from("matches")
      .insert([{
        winner_id,
        match_year: matchYear,
        player1_id: first.player_id,
        deck1_id: first.deck_id,
        player2_id: second.player_id,
        deck2_id: second.deck_id
      }])
      .select("id")
      .single());

    if (matchError && matchError.message.includes("match_year")) {
      ({ data: createdMatch, error: matchError } = await supabaseClient
        .from("matches")
        .insert([{
          winner_id,
          player1_id: first.player_id,
          deck1_id: first.deck_id,
          player2_id: second.player_id,
          deck2_id: second.deck_id
        }])
        .select("id")
        .single());
    }

    if (matchError) throw matchError;

    const payload = participants.map((p, idx) => ({
      match_id: createdMatch.id,
      player_id: p.player_id,
      deck_id: p.deck_id,
      participant_order: idx + 1
    }));

    let { error: partError } = await supabaseClient
      .from("match_participants")
      .insert(payload);

    // Fallback compatibilita: se la colonna participant_order non esiste ancora.
    if (partError && partError.message.includes("participant_order")) {
      const fallbackPayload = participants.map((p) => ({
        match_id: createdMatch.id,
        player_id: p.player_id,
        deck_id: p.deck_id
      }));
      ({ error: partError } = await supabaseClient
        .from("match_participants")
        .insert(fallbackPayload));
    }

    if (partError) throw new Error(`match_participants INSERT: ${partError.message}`);

    renderMatchParticipantsForm();
    document.getElementById("winner").value = "";

    alert("Partita salvata!");
    loadMatches();
    loadMatchStats();
  } catch (err) {
    alert("Errore salvataggio partita: " + err.message);
  }
}

function upsertStat(map, key, baseFactory) {
  if (!map.has(key)) map.set(key, baseFactory());
  return map.get(key);
}

async function loadMatchStats() {
  const statsContainer = document.getElementById("matchStatsContainer");
  if (!statsContainer) return;

  try {
    const selectedYear = document.getElementById("statsYearFilter")?.value || "all";
    let matches = null;
    let matchesError = null;
    ({ data: matches, error: matchesError } = await supabaseClient
      .from("matches")
      .select("id, winner_id, match_year"));

    if (matchesError && matchesError.message.includes("match_year")) {
      ({ data: matches, error: matchesError } = await supabaseClient
        .from("matches")
        .select("id, winner_id"));
    }

    if (matchesError) throw matchesError;

    if (selectedYear !== "all") {
      matches = (matches || []).filter((m) => String(m.match_year) === String(selectedYear));
    }

    const ids = (matches || []).map((m) => m.id);
    if (ids.length === 0) {
      statsContainer.innerHTML = "<p>Nessuna partita registrata.</p>";
      return;
    }

    const playerImageById = new Map();
    {
      let players = null;
      let playersError = null;
      ({ data: players, error: playersError } = await supabaseClient
        .from("players")
        .select("id, name, image_url"));

      if (playersError && playersError.message.includes("image_url")) {
        ({ data: players, error: playersError } = await supabaseClient
          .from("players")
          .select("id, name"));
      }

      if (playersError) throw playersError;
      (players || []).forEach((p) => {
        const fromDb = typeof p.image_url === "string" ? p.image_url.trim() : "";
        playerImageById.set(p.id, fromDb || getFallbackPlayerArtByName(p.name));
      });
    }

    const { data: participants, error: partError } = await supabaseClient
      .from("match_participants")
      .select("match_id, player_id, deck_id, player:player_id(name), deck:deck_id(name, commander, colors)")
      .in("match_id", ids);
    if (partError) throw new Error(`match_participants SELECT: ${partError.message}`);

    const winnerByMatch = new Map(matches.map((m) => [m.id, m.winner_id]));
    const byPlayer = new Map();
    const byDeck = new Map();
    const byColor = new Map();

    (participants || []).forEach((p) => {
      const winnerId = winnerByMatch.get(p.match_id);
      const isWin = winnerId === p.player_id;

      const playerStat = upsertStat(byPlayer, p.player_id, () => ({
        id: p.player_id,
        name: p.player?.name || "?",
        wins: 0,
        losses: 0,
        games: 0
      }));
      playerStat.games++;
      if (isWin) playerStat.wins++; else playerStat.losses++;

      const deckStat = upsertStat(byDeck, p.deck_id, () => ({
        id: p.deck_id,
        name: p.deck?.name || "?",
        commander: p.deck?.commander || "",
        ownerName: p.player?.name || "",
        wins: 0,
        losses: 0,
        games: 0
      }));
      if (!deckStat.ownerName && p.player?.name) deckStat.ownerName = p.player.name;
      deckStat.games++;
      if (isWin) deckStat.wins++; else deckStat.losses++;

      const colors = Array.isArray(p.deck?.colors) ? p.deck.colors : [];
      colors.forEach((color) => {
        const c = upsertStat(byColor, color, () => ({ color, wins: 0, losses: 0, games: 0 }));
        c.games++;
        if (isWin) c.wins++; else c.losses++;
      });

    });

    const players = Array.from(byPlayer.values()).sort((a, b) => b.wins - a.wins);
    const decks = Array.from(byDeck.values()).sort((a, b) => b.wins - a.wins);
    const colors = Array.from(byColor.values()).sort((a, b) => b.wins - a.wins);

    const topPlayer = players[0];
    const topDeck = decks[0];
    const topColor = colors[0];

    const colorName = { W: "Bianco", U: "Blu", B: "Nero", R: "Rosso", G: "Verde" };
    const colorBackgrounds = {
      W: "https://cards.scryfall.io/art_crop/front/1/1/116a7806-1513-44b9-ae95-cbedb7e96b89.jpg?1583965896",
      U: "https://cards.scryfall.io/art_crop/front/c/5/c5258f33-02c6-4b45-b4de-4429b4508924.jpg?1583965902",
      B: "https://cards.scryfall.io/art_crop/front/e/2/e269461e-638f-433b-979b-820f87fb431a.jpg?1583965913",
      R: "https://cards.scryfall.io/art_crop/front/e/e/ee851c64-4bf9-4dde-b73e-41366828a1dc.jpg?1583965921",
      G: "https://cards.scryfall.io/art_crop/front/7/4/743f283c-8aae-44ab-b245-c239feb23c16.jpg?1590879356"
    };

    const topPlayerImage = topPlayer ? (playerImageById.get(topPlayer.id) || getFallbackPlayerArtByName(topPlayer.name)) : null;
    let topDeckImage = null;
    if (topDeck?.commander) {
      try {
        const commanderInfo = await getCommanderCardDetails(topDeck.commander);
        topDeckImage = commanderInfo?.imageUrl || null;
      } catch {
        topDeckImage = null;
      }
    }
    const topColorImage = topColor ? (colorBackgrounds[topColor.color] || null) : null;
    const manaSymbolLarge = (color) =>
      `<img src="https://svgs.scryfall.io/card-symbols/${color}.svg" alt="${color}" title="${color}" style="width:34px;height:34px;vertical-align:middle;">`;

    statsContainer.innerHTML = `
      <div class="box-container">
        <div class="box match-hero-box" style="background-image:url('${topPlayerImage || ""}');">
          <h3>Giocatore piu vincente</h3>
          <p><strong>${topPlayer?.name || "-"}</strong></p>
          <div class="box-stat">${topPlayer?.wins || 0} W</div>
        </div>
        <div class="box match-hero-box" style="background-image:url('${topDeckImage || ""}');">
          <h3>Mazzo piu vincente</h3>
          <p><strong>${topDeck?.name || "-"}</strong></p>
          <p>Proprietario: <strong>${topDeck?.ownerName || "-"}</strong></p>
          <div class="box-stat">${topDeck?.wins || 0} W</div>
        </div>
        <div class="box match-hero-box" style="background-image:url('${topColorImage || ""}');">
          <h3>Colore piu vincente</h3>
          <p><strong>${topColor ? (colorName[topColor.color] || topColor.color) : "-"}</strong></p>
          <div class="box-stat">${topColor?.wins || 0} W</div>
        </div>
      </div>

      <p style="margin-top:10px; color:#666; font-size:13px;">Filtro anno: <strong>${selectedYear === "all" ? "Tutti" : selectedYear}</strong></p>

      <h3 style="margin-top:20px;">Colori (W/L)</h3>
      <div class="stats-grid">
        ${colors.map((c) => `
          <div class="stat-box match-color-box" style="background-image:url('${colorBackgrounds[c.color] || ""}');">
            <div class="stat-color">${manaSymbolLarge(c.color)}</div>
            <div class="stat-name">${colorName[c.color] || c.color}</div>
            <div class="stat-winrate">${c.games ? ((c.wins / c.games) * 100).toFixed(1) : 0}%</div>
            <div class="stat-details">${c.wins}V / ${c.losses}S</div>
          </div>
        `).join("")}
      </div>
    `;
  } catch (err) {
    statsContainer.innerHTML = `<p style='color:#dc3545;'>${err.message}</p>`;
  }
}

function buildMatchMigrationNotice() {
  return `
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_year INTEGER;
ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS participant_order INTEGER;

UPDATE matches
SET match_year = EXTRACT(YEAR FROM NOW())::INTEGER
WHERE match_year IS NULL;

CREATE TABLE IF NOT EXISTS match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_match_participants_match_id ON match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_player_id ON match_participants(player_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_deck_id ON match_participants(deck_id);
`;
}

// Inizializzazione sezione partite
async function initMatchesSection() {
  try {
    matchesPlayersCache = await fetchAllPlayers();
  } catch {
    matchesPlayersCache = [];
  }

  populateYearSelects();
  renderMatchParticipantsForm();
  loadMatches();
  loadMatchStats();

  if (!window.__matchMigrationHintShown) {
    window.__matchMigrationHintShown = true;
    console.log("Se manca match_participants, esegui questa SQL in Supabase:\n" + buildMatchMigrationNotice());
  }
}
