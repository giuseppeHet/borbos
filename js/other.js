// LOGICA SEZIONE ALTRO

const DEFAULT_VOCABULARY = [
  { term: "ninjitsu", alias: "intrufolare" },
  { term: "danno", alias: "dolore" },
  { term: "cimitero", alias: "discarica" }
];

const DEFAULT_USEFUL_LINKS = [
  {
    name: "Alternative cheap a carte costose",
    url: "http://thatbutbudget.com/"
  },
  {
    name: "Per stampare proxy",
    url: "https://mtgprint.net/"
  }
];

function getVocabularyEntries() {
  try {
    const raw = localStorage.getItem("mtgVocabularyEntries");
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // fallback to defaults
  }
  return [...DEFAULT_VOCABULARY];
}

function saveVocabularyEntries(entries) {
  localStorage.setItem("mtgVocabularyEntries", JSON.stringify(entries));
}

function renderVocabularyList() {
  const container = document.getElementById("vocabularyList");
  if (!container) return;

  const entries = getVocabularyEntries();
  if (!entries.length) {
    container.innerHTML = '<div class="vocab-row"><span>-</span><span class="vocab-arrow">→</span><span>-</span></div>';
    return;
  }

  container.innerHTML = entries
    .map((e, idx) => `
      <div class="vocab-row">
        <span>${e.term}</span>
        <span class="vocab-arrow">→</span>
        <span>${e.alias}</span>
        <button class="other-delete-btn" onclick="deleteVocabularyEntry(${idx})" title="Elimina" aria-label="Elimina voce">🗑</button>
      </div>
    `)
    .join("");
}

function addVocabularyEntry() {
  const termInput = document.getElementById("newVocabTerm");
  const aliasInput = document.getElementById("newVocabAlias");
  if (!termInput || !aliasInput) return;

  const term = termInput.value.trim();
  const alias = aliasInput.value.trim();
  if (!term || !alias) {
    alert("Inserisci sia termine che traduzione.");
    return;
  }

  const entries = getVocabularyEntries();
  entries.push({ term, alias });
  saveVocabularyEntries(entries);
  renderVocabularyList();

  termInput.value = "";
  aliasInput.value = "";
}

function getUsefulLinks() {
  try {
    const raw = localStorage.getItem("mtgUsefulLinks");
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // fallback to defaults
  }
  return [...DEFAULT_USEFUL_LINKS];
}

function saveUsefulLinks(links) {
  localStorage.setItem("mtgUsefulLinks", JSON.stringify(links));
}

function renderUsefulLinks() {
  const container = document.getElementById("usefulLinksList");
  if (!container) return;

  const links = getUsefulLinks();
  if (!links.length) {
    container.innerHTML = '<div class="link-item"><span class="link-title">-</span><span class="link-separator">-</span><span class="link-url">-</span></div>';
    return;
  }

  container.innerHTML = links
    .map((link, idx) => `
      <div class="link-item">
        <span class="link-title">${link.name}</span>
        <span class="link-separator">-</span>
        <a class="link-url" href="${link.url}" target="_blank" rel="noopener noreferrer">${link.url}</a>
        <button class="other-delete-btn" onclick="deleteUsefulLink(${idx})" title="Elimina" aria-label="Elimina link">🗑</button>
      </div>
    `)
    .join("");
}

function deleteVocabularyEntry(index) {
  if (!confirm("Eliminare questa voce dal vocabolario?")) return;
  const entries = getVocabularyEntries();
  entries.splice(index, 1);
  saveVocabularyEntries(entries);
  renderVocabularyList();
}

function deleteUsefulLink(index) {
  if (!confirm("Eliminare questo link?")) return;
  const links = getUsefulLinks();
  links.splice(index, 1);
  saveUsefulLinks(links);
  renderUsefulLinks();
}

function addUsefulLink() {
  const nameInput = document.getElementById("newUsefulLinkName");
  const urlInput = document.getElementById("newUsefulLinkUrl");
  if (!nameInput || !urlInput) return;

  const name = nameInput.value.trim();
  const rawUrl = urlInput.value.trim();

  if (!name || !rawUrl) {
    alert("Inserisci sia nome sito che URL.");
    return;
  }

  let normalizedUrl = rawUrl;
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    new URL(normalizedUrl);
  } catch {
    alert("URL non valido.");
    return;
  }

  const links = getUsefulLinks();
  links.push({ name, url: normalizedUrl });
  saveUsefulLinks(links);
  renderUsefulLinks();

  nameInput.value = "";
  urlInput.value = "";
}

async function renderTableGeneratorPlayers() {
  const container = document.getElementById("tableGeneratorPlayers");
  if (!container) return;

  try {
    const { data, error } = await supabaseClient
      .from("players")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) throw error;

    const players = data || [];
    if (!players.length) {
      container.innerHTML = '<span style="color:#6c7a8f;">Nessun giocatore disponibile.</span>';
      return;
    }

    container.innerHTML = players
      .map((p) => `
        <label>
          <input type="checkbox" value="${p.id}" data-name="${p.name}">
          <span>${p.name}</span>
        </label>
      `)
      .join("");
  } catch (err) {
    container.innerHTML = `<span style="color:#b42318;">${err.message}</span>`;
  }
}

function shuffleArray(values) {
  const arr = [...values];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateRandomTables() {
  const tablesCountInput = document.getElementById("tablesCount");
  const tablesSizesInput = document.getElementById("tablesSizes");
  const playersContainer = document.getElementById("tableGeneratorPlayers");
  const resultContainer = document.getElementById("tableGeneratorResult");

  if (!tablesCountInput || !tablesSizesInput || !playersContainer || !resultContainer) return;

  const tablesCount = parseInt(tablesCountInput.value, 10);
  if (!tablesCount || tablesCount < 1) {
    alert("Numero tavoli non valido.");
    return;
  }

  const sizes = tablesSizesInput.value
    .split(",")
    .map((v) => parseInt(v.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (sizes.length !== tablesCount) {
    alert("Inserisci esattamente un numero per ogni tavolo (es: 3,3 o 3,4).");
    return;
  }

  const selectedPlayers = Array.from(playersContainer.querySelectorAll('input[type="checkbox"]:checked'))
    .map((cb) => ({ id: cb.value, name: cb.getAttribute("data-name") || "?" }));

  if (!selectedPlayers.length) {
    alert("Seleziona almeno un giocatore.");
    return;
  }

  const totalSeats = sizes.reduce((acc, n) => acc + n, 0);
  if (selectedPlayers.length !== totalSeats) {
    alert(`I posti totali (${totalSeats}) devono essere uguali ai giocatori selezionati (${selectedPlayers.length}).`);
    return;
  }

  const shuffled = shuffleArray(selectedPlayers);
  let cursor = 0;
  const tables = sizes.map((size, idx) => {
    const tablePlayers = shuffled.slice(cursor, cursor + size);
    cursor += size;
    return { index: idx + 1, players: tablePlayers };
  });

  resultContainer.innerHTML = tables
    .map((t) => `
      <div class="other-result-table">
        <h4>Tavolo ${t.index}</h4>
        <p>${t.players.map((p) => p.name).join(" - ")}</p>
      </div>
    `)
    .join("");
}

function initOtherSection() {
  renderVocabularyList();
  renderUsefulLinks();
  renderTableGeneratorPlayers();

  const resultContainer = document.getElementById("tableGeneratorResult");
  if (resultContainer && !resultContainer.innerHTML) {
    resultContainer.innerHTML = '<span style="color:#6c7a8f;">Nessuna divisione generata.</span>';
  }
}
