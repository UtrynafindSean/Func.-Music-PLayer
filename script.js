/* =========================================================
   TONEARM MUSIC PLAYER
   Jamendo + Local Music + Offline Playback
========================================================= */

const JAMENDO_CLIENT_ID = "fd714c65";
const JAMENDO_API = "https://api.jamendo.com/v3.0";

/* =========================================================
   ELEMENTS
========================================================= */

const audio = document.getElementById("audioPlayer");

const navButtons = document.querySelectorAll(".nav-btn");

const libraryPage = document.getElementById("libraryPage");
const onlinePage = document.getElementById("onlinePage");
const pageTitle = document.getElementById("pageTitle");

const addMusicBtn = document.getElementById("addMusicBtn");
const heroAddBtn = document.getElementById("heroAddBtn");
const browseBtn = document.getElementById("browseBtn");
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");

const libraryTracks = document.getElementById("libraryTracks");
const emptyState = document.getElementById("emptyState");
const trackCount = document.getElementById("trackCount");
const librarySearch = document.getElementById("librarySearch");

const onlineSearchInput = document.getElementById("onlineSearchInput");
const onlineSearchBtn = document.getElementById("onlineSearchBtn");
const onlineResults = document.getElementById("onlineResults");
const onlineStatus = document.getElementById("onlineStatus");

const playerArtwork = document.getElementById("playerArtwork");
const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");

const playBtn = document.getElementById("playBtn");
const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");

const currentTime = document.getElementById("currentTime");
const totalTime = document.getElementById("totalTime");
const progressBar = document.getElementById("progressBar");
const volumeControl = document.getElementById("volumeControl");

const themeBtn = document.getElementById("themeBtn");
const toast = document.getElementById("toast");

/* =========================================================
   STATE
========================================================= */

let library = [];
let onlineSongs = [];
let offlineSongs = [];

let currentPlaylist = [];
let currentIndex = -1;

let isShuffle = false;
let isRepeat = false;

/* =========================================================
   TOAST
========================================================= */

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* =========================================================
   TIME FORMAT
========================================================= */

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/* =========================================================
   NAVIGATION
========================================================= */

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const page = button.dataset.page;

    navButtons.forEach((btn) => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    if (page === "library") {
      libraryPage.hidden = false;
      libraryPage.classList.add("active");

      onlinePage.hidden = true;
      onlinePage.classList.remove("active");

      pageTitle.textContent = "Your Library";

      currentPlaylist = library;
    }

    if (page === "online") {
      libraryPage.hidden = true;
      libraryPage.classList.remove("active");

      onlinePage.hidden = false;
      onlinePage.classList.add("active");

      pageTitle.textContent = "Online Music";

      currentPlaylist = onlineSongs;

      if (onlineSongs.length === 0) {
        loadJamendoMusic();
      }
    }
  });
});

/* =========================================================
   LOCAL FILE PICKER
========================================================= */

function openFilePicker() {
  fileInput.click();
}

addMusicBtn.addEventListener("click", openFilePicker);
heroAddBtn.addEventListener("click", openFilePicker);
browseBtn.addEventListener("click", openFilePicker);

fileInput.addEventListener("change", (event) => {
  addLocalFiles(event.target.files);

  fileInput.value = "";
});

/* =========================================================
   ADD LOCAL FILES
========================================================= */

function addLocalFiles(files) {
  if (!files || files.length === 0) {
    return;
  }

  let added = 0;

  Array.from(files).forEach((file) => {
    const isAudio =
      file.type.startsWith("audio/") ||
      /\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i.test(file.name);

    if (!isAudio) {
      return;
    }

    const song = {
      id: `local-${Date.now()}-${Math.random()}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Local File",
      album: "My Library",
      url: URL.createObjectURL(file),
      artwork: "",
      source: "local",
      file: file,
    };

    library.push(song);
    added++;
  });

  renderLibrary();

  if (added > 0) {
    showToast(`${added} song${added > 1 ? "s" : ""} added`);
  }
}

/* =========================================================
   DRAG AND DROP
========================================================= */

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();

  dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();

  dropZone.classList.remove("dragging");

  addLocalFiles(event.dataTransfer.files);
});

/* =========================================================
   LIBRARY
========================================================= */

function renderLibrary(filter = "") {
  libraryTracks.innerHTML = "";

  const filteredSongs = library.filter((song) => {
    const text = `${song.title} ${song.artist} ${song.album}`.toLowerCase();

    return text.includes(filter.toLowerCase());
  });

  trackCount.textContent =
    library.length === 1 ? "1 track" : `${library.length} tracks`;

  emptyState.style.display = library.length === 0 ? "block" : "none";

  filteredSongs.forEach((song, index) => {
    const card = createTrackCard(song, index, "library");

    libraryTracks.appendChild(card);
  });
}

/* =========================================================
   JAMENDO SEARCH
========================================================= */

async function loadJamendoMusic(searchTerm = "") {
  onlineStatus.textContent = searchTerm
    ? `Searching for "${searchTerm}"...`
    : "Loading online music...";

  onlineResults.innerHTML = "";

  try {
    const params = new URLSearchParams({
      client_id: JAMENDO_CLIENT_ID,
      format: "json",
      limit: "20",
      audioformat: "mp32",
      imagesize: "300",
    });

    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    }

    const response = await fetch(`${JAMENDO_API}/tracks/?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Jamendo HTTP ${response.status}`);
    }

    const data = await response.json();

    if (
      data.headers &&
      data.headers.status &&
      data.headers.status !== "success"
    ) {
      throw new Error(data.headers.error_message || "Jamendo API error");
    }

    onlineSongs = (data.results || []).map((track) => ({
      id: `jamendo-${track.id}`,
      jamendoId: track.id,

      title: track.name || "Unknown Track",

      artist: track.artist_name || "Unknown Artist",

      album: track.album_name || "Jamendo",

      url: track.audio || "",

      downloadUrl: track.audiodownload || "",

      downloadAllowed: track.audiodownload_allowed === true,

      artwork: track.album_image || track.image || "",

      source: "jamendo",
    }));

    currentPlaylist = onlineSongs;

    if (onlineSongs.length === 0) {
      onlineStatus.textContent = "No music found.";

      return;
    }

    onlineStatus.textContent = `${onlineSongs.length} tracks found`;

    renderOnlineResults();
  } catch (error) {
    console.error("Jamendo error:", error);

    onlineStatus.textContent =
      "Couldn't connect to Jamendo. Run the website with Live Server.";

    showToast("Couldn't connect to Jamendo");
  }
}

/* =========================================================
   ONLINE RESULTS
========================================================= */

function renderOnlineResults() {
  onlineResults.innerHTML = "";

  onlineSongs.forEach((song, index) => {
    const card = createTrackCard(song, index, "online");

    onlineResults.appendChild(card);
  });
}

/* =========================================================
   TRACK CARD
========================================================= */

function createTrackCard(song, index, type) {
  const card = document.createElement("div");

  card.className = "track-card";

  const artwork = song.artwork
    ? `<img src="${song.artwork}" alt="${escapeHTML(song.title)}">`
    : `<div class="track-placeholder">♫</div>`;

  let downloadButton = "";

  if (type === "online" && song.downloadAllowed && song.downloadUrl) {
    downloadButton = `
      <button
        class="download-track-btn"
        title="Download for offline playback">
        ↓
      </button>
    `;
  }

  card.innerHTML = `
    <div class="track-artwork">
      ${artwork}
    </div>

    <div class="track-info">
      <h3>${escapeHTML(song.title)}</h3>
      <p>${escapeHTML(song.artist)}</p>
    </div>

    <div class="track-actions">

      <button
        class="play-track-btn"
        title="Play">
        ▶
      </button>

      ${downloadButton}

    </div>
  `;

  const playButton = card.querySelector(".play-track-btn");

  playButton.addEventListener("click", () => {
    currentPlaylist = type === "online" ? onlineSongs : library;

    playSong(song, index);
  });

  const downloadButtonElement = card.querySelector(".download-track-btn");

  if (downloadButtonElement) {
    downloadButtonElement.addEventListener("click", () => {
      saveForOffline(song);
    });
  }

  return card;
}

/* =========================================================
   PLAY SONG
========================================================= */

function playSong(song, index) {
  if (!song.url) {
    showToast("This track cannot be played.");
    return;
  }

  currentIndex = index;

  audio.src = song.url;

  playerTitle.textContent = song.title || "Unknown Track";

  playerArtist.textContent = song.artist || "Unknown Artist";

  if (song.artwork) {
    playerArtwork.innerHTML = `
      <img
        src="${song.artwork}"
        alt="${escapeHTML(song.title)}">
    `;
  } else {
    playerArtwork.innerHTML = "<span>♫</span>";
  }

  audio
    .play()
    .then(() => {
      playBtn.textContent = "⏸";
    })
    .catch((error) => {
      console.error("Playback error:", error);

      showToast("Unable to play this track.");
    });
}

/* =========================================================
   PLAY / PAUSE
========================================================= */

playBtn.addEventListener("click", () => {
  if (!audio.src) {
    showToast("Choose a track first.");
    return;
  }

  if (audio.paused) {
    audio
      .play()
      .then(() => {
        playBtn.textContent = "⏸";
      })
      .catch(() => {
        showToast("Unable to play track.");
      });
  } else {
    audio.pause();

    playBtn.textContent = "▶️";
  }
});

/* =========================================================
   NEXT
========================================================= */

nextBtn.addEventListener("click", () => {
  if (currentPlaylist.length === 0) {
    showToast("No tracks available.");
    return;
  }

  let nextIndex;

  if (isShuffle) {
    nextIndex = Math.floor(Math.random() * currentPlaylist.length);

    if (currentPlaylist.length > 1 && nextIndex === currentIndex) {
      nextIndex = (nextIndex + 1) % currentPlaylist.length;
    }
  } else {
    nextIndex = currentIndex + 1;

    if (nextIndex >= currentPlaylist.length) {
      nextIndex = 0;
    }
  }

  playSong(currentPlaylist[nextIndex], nextIndex);
});

/* =========================================================
   PREVIOUS
========================================================= */

previousBtn.addEventListener("click", () => {
  if (currentPlaylist.length === 0) {
    showToast("No tracks available.");
    return;
  }

  let previousIndex = currentIndex - 1;

  if (previousIndex < 0) {
    previousIndex = currentPlaylist.length - 1;
  }

  playSong(currentPlaylist[previousIndex], previousIndex);
});

/* =========================================================
   SHUFFLE
========================================================= */

shuffleBtn.addEventListener("click", () => {
  isShuffle = !isShuffle;

  shuffleBtn.classList.toggle("active", isShuffle);

  showToast(isShuffle ? "Shuffle on" : "Shuffle off");
});

/* =========================================================
   REPEAT
========================================================= */

repeatBtn.addEventListener("click", () => {
  isRepeat = !isRepeat;

  audio.loop = isRepeat;

  repeatBtn.classList.toggle("active", isRepeat);

  showToast(isRepeat ? "Repeat on" : "Repeat off");
});

/* =========================================================
   AUDIO EVENTS
========================================================= */

audio.addEventListener("loadedmetadata", () => {
  totalTime.textContent = formatTime(audio.duration);

  progressBar.value = 0;
});

audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;

  const percentage = (audio.currentTime / audio.duration) * 100;

  progressBar.value = percentage;

  currentTime.textContent = formatTime(audio.currentTime);
});

audio.addEventListener("play", () => {
  playBtn.textContent = "⏸";
});

audio.addEventListener("pause", () => {
  playBtn.textContent = "▶️";
});

audio.addEventListener("ended", () => {
  if (isRepeat) {
    return;
  }

  if (currentPlaylist.length === 0) {
    return;
  }

  let nextIndex = currentIndex + 1;

  if (nextIndex >= currentPlaylist.length) {
    nextIndex = 0;
  }

  playSong(currentPlaylist[nextIndex], nextIndex);
});

audio.addEventListener("error", () => {
  console.error("Audio error:", audio.error);

  showToast("This track could not be played.");
});

/* =========================================================
   PROGRESS BAR
========================================================= */

progressBar.addEventListener("input", () => {
  if (!audio.duration) return;

  audio.currentTime = (progressBar.value / 100) * audio.duration;
});

/* =========================================================
   VOLUME
========================================================= */

audio.volume = 1;

volumeControl.addEventListener("input", () => {
  audio.volume = Number(volumeControl.value);
});

/* =========================================================
   ONLINE SEARCH BUTTON
========================================================= */

onlineSearchBtn.addEventListener("click", () => {
  const query = onlineSearchInput.value.trim();

  loadJamendoMusic(query);
});

/* =========================================================
   ONLINE SEARCH ENTER KEY
========================================================= */

onlineSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();

    const query = onlineSearchInput.value.trim();

    loadJamendoMusic(query);
  }
});

/* =========================================================
   LIBRARY SEARCH
========================================================= */

librarySearch.addEventListener("input", () => {
  renderLibrary(librarySearch.value);
});

/* =========================================================
   INDEXEDDB OFFLINE STORAGE
========================================================= */

let db;

const DB_NAME = "TonearmMusicDB";
const DB_VERSION = 1;
const STORE_NAME = "offlineSongs";

/* =========================================================
   OPEN DATABASE
========================================================= */

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => {
      db = request.result;

      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* =========================================================
   SAVE SONG FOR OFFLINE
========================================================= */

async function saveForOffline(song) {
  if (!song.downloadAllowed || !song.downloadUrl) {
    showToast("Download is not available for this track.");

    return;
  }

  try {
    showToast("Downloading song...");

    const response = await fetch(song.downloadUrl);

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const blob = await response.blob();

    const offlineSong = {
      id: song.id,

      title: song.title,

      artist: song.artist,

      album: song.album,

      artwork: song.artwork,

      blob: blob,

      savedAt: Date.now(),
    };

    await saveOfflineSong(offlineSong);

    await loadOfflineSongs();

    showToast(`"${song.title}" saved for offline playback`);
  } catch (error) {
    console.error("Offline download error:", error);

    /*
      Fallback:
      If browser CORS prevents fetching
      the file, open Jamendo's download URL.
    */

    const link = document.createElement("a");

    link.href = song.downloadUrl;

    link.target = "_blank";

    link.rel = "noopener noreferrer";

    document.body.appendChild(link);

    link.click();

    link.remove();

    showToast("Download opened in a new tab");
  }
}

/* =========================================================
   SAVE TO INDEXEDDB
========================================================= */

function saveOfflineSong(song) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not ready"));

      return;
    }

    const transaction = db.transaction([STORE_NAME], "readwrite");

    const store = transaction.objectStore(STORE_NAME);

    const request = store.put(song);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* =========================================================
   LOAD OFFLINE SONGS
========================================================= */

function loadOfflineSongs() {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve([]);

      return;
    }

    const transaction = db.transaction([STORE_NAME], "readonly");

    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => {
      offlineSongs = request.result || [];

      /*
          Convert blobs into playable URLs
        */

      offlineSongs = offlineSongs.map((song) => ({
        ...song,

        url: URL.createObjectURL(song.blob),

        source: "offline",
      }));

      /*
          Add offline songs to library
        */

      offlineSongs.forEach((offlineSong) => {
        const exists = library.some((song) => song.id === offlineSong.id);

        if (!exists) {
          library.push(offlineSong);
        }
      });

      renderLibrary();

      resolve(offlineSongs);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* =========================================================
   OFFLINE DATABASE INITIALIZATION
========================================================= */

async function initializeOfflineStorage() {
  try {
    await openDatabase();

    await loadOfflineSongs();

    console.log("Offline music storage ready.");
  } catch (error) {
    console.error("Offline storage error:", error);

    showToast("Offline storage unavailable.");
  }
}

/* =========================================================
   DELETE OFFLINE SONG
========================================================= */

function deleteOfflineSong(id) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not ready"));

      return;
    }

    const transaction = db.transaction([STORE_NAME], "readwrite");

    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* =========================================================
   THEME
========================================================= */

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const darkMode = document.body.classList.contains("dark");

  localStorage.setItem("tonearm-theme", darkMode ? "dark" : "light");
});

if (localStorage.getItem("tonearm-theme") === "dark") {
  document.body.classList.add("dark");
}

/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   INITIALIZE
========================================================= */

renderLibrary();

initializeOfflineStorage();

console.log("TONEARM Music Player loaded successfully.");
