// 🔹 LOGICA SEZIONE HOME

const HOME_CUSTOM_IMAGE_STORAGE_KEY = "homeCustomImageDataUrl";
const HOME_CUSTOM_IMAGE_FALLBACK = "https://cards.scryfall.io/art_crop/front/d/a/da4ab2ac-4b15-4fba-bc11-d4e185e7f99c.jpg?1562794058";

function initHomeSection() {
  const customCard = document.getElementById("homeCustomImageCard");
  if (!customCard) return;

  const saved = localStorage.getItem(HOME_CUSTOM_IMAGE_STORAGE_KEY);
  const image = saved || HOME_CUSTOM_IMAGE_FALLBACK;
  customCard.style.backgroundImage = `url('${image}')`;
}

function triggerHomeCustomImagePicker() {
  const input = document.getElementById("homeCustomImageInput");
  if (!input) return;
  input.click();
}

async function onHomeCustomImageSelected(event) {
  try {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file) return;

    if (!file.type || !file.type.startsWith("image/")) {
      throw new Error("Seleziona un file immagine valido");
    }

    const dataUrl = await fileToDataUrl(file);
    localStorage.setItem(HOME_CUSTOM_IMAGE_STORAGE_KEY, dataUrl);

    const customCard = document.getElementById("homeCustomImageCard");
    if (customCard) {
      customCard.style.backgroundImage = `url('${dataUrl}')`;
    }

    alert("Immagine caricata dalla tua cartella PC!");
  } catch (err) {
    alert("Errore caricamento immagine: " + err.message);
  } finally {
    const input = document.getElementById("homeCustomImageInput");
    if (input) input.value = "";
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Lettura file non riuscita"));
    reader.readAsDataURL(file);
  });
}
