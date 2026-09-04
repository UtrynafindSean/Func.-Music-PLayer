"use strict";

/* =========================
   TONEARM MUSIC PLAYER
========================= */

const state = {
  library: [],
  currentIndex: -1,
  shuffleEnabled: false,
  repeatEnabled: false,
  currentOnlineTrack: null,
};

/* =========================
   DOM
========================= */

const audioPlayer = document.getElementById("audioPlayer");

const navItems = document.querySelectorAll(".nav-btn");

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

const onlineStatus = document.getElementById("onlineStatus");

const onlineResults = document.getElementById("onlineResults");

const playBtn = document.getElementById("playBtn");

const previousBtn = document.getElementById("previousBtn");

const nextBtn = document.getElementById("nextBtn");

const shuffleBtn = document.getElementById("shuffleBtn");

const repeatBtn = document.getElementById("repeatBtn");

const progressBar = document.getElementById("progressBar");

const currentTime = document.getElementById("currentTime");

const totalTime = document.getElementById("totalTime");

const volumeControl = document.getElementById("volumeControl");

const playerTitle = document.getElementById("playerTitle");

const playerArtist = document.getElementById("playerArtist");

const playerArtwork = document.getElementById("playerArtwork");

const themeBtn = document.getElementById("themeBtn");

const toast = document.getElementById("toast");

/* =========================
   DATABASE
========================= */

const DB_NAME = "tonearmDB";
const DB_VERSION = 1;
const STORE_NAME = "tracks";

let db = null;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

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

function saveTrack(track) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database unavailable"));
      return;
    }

    const transaction = db.transaction(STORE_NAME, "readwrite");

    transaction.objectStore(STORE_NAME).put(track);

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

function deleteTrack(id) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database unavailable"));
      return;
    }

    const transaction = db.transaction(STORE_NAME, "readwrite");

    transaction.objectStore(STORE_NAME).delete(id);

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

function loadTracks() {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve([]);
      return;
    }

    const transaction = db.transaction(STORE_NAME, "readonly");

    const request = transaction.objectStore(STORE_NAME).getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* =========================
   INITIALIZE
========================= */

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
  try {
    await openDatabase();

    state.library = await loadTracks();

    renderLibrary();
  } catch (error) {
    console.error(error);

    showToast("Could not load your library.");
  }

  setupNavigation();
  setupEventListeners();
  setupDragAndDrop();
  setupPlayer();
}

/* =========================
   NAVIGATION
========================= */

function setupNavigation() {
  navItems.forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.dataset.page;

      navItems.forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      if (page === "library") {
        libraryPage.hidden = false;
        onlinePage.hidden = true;

        libraryPage.classList.add("active");
        onlinePage.classList.remove("active");

        pageTitle.textContent = "Your Library";
      }

      if (page === "online") {
        libraryPage.hidden = true;
        onlinePage.hidden = false;

        libraryPage.classList.remove("active");
        onlinePage.classList.add("active");

        pageTitle.textContent = "Online Music";
      }
    });
  });
}

/* =========================
   EVENT LISTENERS
========================= */

function setupEventListeners() {
  addMusicBtn.addEventListener("click", openFilePicker);

  heroAddBtn.addEventListener("click", openFilePicker);

  browseBtn.addEventListener("click", openFilePicker);

  fileInput.addEventListener("change", handleFiles);

  librarySearch.addEventListener("input", () => {
    renderLibrary(librarySearch.value);
  });

  onlineSearchBtn.addEventListener("click", searchOnlineMusic);

  onlineSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      searchOnlineMusic();
    }
  });

  themeBtn.addEventListener("click", toggleTheme);
}

/* =========================
   FILES
========================= */

function openFilePicker() {
  fileInput.click();
}

async function handleFiles(event) {
  const files = Array.from(event.target.files || []);

  if (!files.length) return;

  await addFiles(files);

  fileInput.value = "";
}

async function addFiles(files) {
  let added = 0;

  for (const file of files) {
    if (!file.type.startsWith("audio/")) {
      continue;
    }

    const track = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,

      name: file.name.replace(/\.[^/.]+$/, ""),

      artist: "Local file",

      album: "Your Library",

      blob: file,

      artwork: null,

      source: "local",

      createdAt: Date.now(),
    };

    try {
      await saveTrack(track);

      state.library.push(track);

      added++;
    } catch (error) {
      console.error(error);
    }
  }

  renderLibrary();

  if (added) {
    showToast(`${added} track${added > 1 ? "s" : ""} added.`);
  }
}

/* =========================
   DRAG & DROP
========================= */

function setupDragAndDrop() {
  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();

      dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();

      dropZone.classList.remove("dragging");
    });
  });

  dropZone.addEventListener("drop", async (event) => {
    const files = Array.from(event.dataTransfer.files || []);

    await addFiles(files);
  });
}

/* =========================
   LIBRARY
========================= */

function renderLibrary(searchTerm = "") {
  if (!libraryTracks) return;

  const term = searchTerm.toLowerCase().trim();

  const filtered = state.library.filter((track) => {
    return (
      track.name.toLowerCase().includes(term) ||
      track.artist.toLowerCase().includes(term)
    );
  });

  libraryTracks.innerHTML = "";

  trackCount.textContent = `${state.library.length} track${state.library.length === 1 ? "" : "s"}`;

  if (!filtered.length) {
    emptyState.style.display = "block";

    if (state.library.length > 0) {
      emptyState.querySelector("h3").textContent = "No tracks found";
    } else {
      emptyState.querySelector("h3").textContent = "Your library is empty";
    }

    return;
  }

  emptyState.style.display = "none";

  filtered.forEach((track) => {
    libraryTracks.appendChild(createLocalTrackCard(track));
  });
}

function createLocalTrackCard(track) {
  const card = document.createElement("article");

  card.className = "track-card";

  const artwork = document.createElement("div");

  artwork.className = "track-art-placeholder";

  artwork.textContent = "♫";

  const content = document.createElement("div");

  content.className = "track-content";

  const title = document.createElement("h3");

  title.textContent = track.name;

  const artist = document.createElement("p");

  artist.textContent = track.artist;

  const actions = document.createElement("div");

  actions.className = "track-actions";

  const play = document.createElement("button");

  play.className = "play-track";

  play.textContent = "▶ Play";

  play.addEventListener("click", () => playLocalTrack(track));

  const remove = document.createElement("button");

  remove.textContent = "Delete";

  remove.addEventListener("click", () => removeLocalTrack(track.id));

  actions.appendChild(play);
  actions.appendChild(remove);

  content.appendChild(title);
  content.appendChild(artist);
  content.appendChild(actions);

  card.appendChild(artwork);
  card.appendChild(content);

  return card;
}

async function removeLocalTrack(id) {
  try {
    await deleteTrack(id);

    const index = state.library.findIndex((track) => track.id === id);

    if (index !== -1) {
      if (state.currentIndex === index) {
        audioPlayer.pause();

        audioPlayer.removeAttribute("src");

        state.currentIndex = -1;

        updatePlayerUI();
      }

      state.library.splice(index, 1);
    }

    renderLibrary();

    showToast("Track deleted.");
  } catch (error) {
    console.error(error);

    showToast("Could not delete track.");
  }
}

/* =========================
   LOCAL PLAYBACK
========================= */

function playLocalTrack(track) {
  const index = state.library.findIndex((item) => item.id === track.id);

  if (index === -1) return;

  state.currentIndex = index;

  const url = URL.createObjectURL(track.blob);

  audioPlayer.src = url;

  audioPlayer
    .play()
    .then(() => {
      updatePlayerUI();
    })
    .catch((error) => {
      console.error(error);
      showToast("Could not play this file.");
    });

  playerTitle.textContent = track.name;

  playerArtist.textContent = track.artist;

  playerArtwork.innerHTML = "<span>♫</span>";
}

/* =========================
   PLAYER
========================= */

function setupPlayer() {
  audioPlayer.addEventListener("timeupdate", updateProgress);

  audioPlayer.addEventListener("loadedmetadata", () => {
    totalTime.textContent = formatTime(audioPlayer.duration);
  });

  audioPlayer.addEventListener("play", () => {
    playBtn.textContent = "❚❚";
  });

  audioPlayer.addEventListener("pause", () => {
    playBtn.textContent = "▶";
  });

  audioPlayer.addEventListener("ended", handleTrackEnded);

  playBtn.addEventListener("click", togglePlay);

  previousBtn.addEventListener("click", playPrevious);

  nextBtn.addEventListener("click", playNext);

  shuffleBtn.addEventListener("click", () => {
    state.shuffleEnabled = !state.shuffleEnabled;

    shuffleBtn.style.opacity = state.shuffleEnabled ? "1" : "0.5";
  });

  repeatBtn.addEventListener("click", () => {
    state.repeatEnabled = !state.repeatEnabled;

    repeatBtn.style.opacity = state.repeatEnabled ? "1" : "0.5";
  });

  progressBar.addEventListener("input", () => {
    if (!audioPlayer.duration) return;

    audioPlayer.currentTime =
      (Number(progressBar.value) / 100) * audioPlayer.duration;
  });

  volumeControl.addEventListener("input", () => {
    audioPlayer.volume = Number(volumeControl.value);
  });

  audioPlayer.volume = Number(volumeControl.value);
}

function togglePlay() {
  if (!audioPlayer.src) {
    if (state.library.length) {
      playLocalTrack(state.library[0]);
    } else {
      showToast("Add music to your library first.");
    }

    return;
  }

  if (audioPlayer.paused) {
    audioPlayer.play().catch((error) => {
      console.error(error);
    });
  } else {
    audioPlayer.pause();
  }
}

function playPrevious() {
  if (!state.library.length) return;

  let index = state.currentIndex - 1;

  if (index < 0) {
    index = state.library.length - 1;
  }

  playLocalTrack(state.library[index]);
}

function playNext() {
  if (!state.library.length) return;

  let index;

  if (state.shuffleEnabled) {
    index = Math.floor(Math.random() * state.library.length);
  } else {
    index = state.currentIndex + 1;

    if (index >= state.library.length) {
      index = 0;
    }
  }

  playLocalTrack(state.library[index]);
}

function handleTrackEnded() {
  if (state.repeatEnabled) {
    audioPlayer.currentTime = 0;

    audioPlayer.play();

    return;
  }

  playNext();
}

function updateProgress() {
  if (!audioPlayer.duration) return;

  const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;

  progressBar.value = percent || 0;

  currentTime.textContent = formatTime(audioPlayer.currentTime);
}

function updatePlayerUI() {
  if (state.currentIndex >= 0 && state.library[state.currentIndex]) {
    const track = state.library[state.currentIndex];

    playerTitle.textContent = track.name;

    playerArtist.textContent = track.artist;
  }
}

/* =========================
   ONLINE MUSIC
========================= */

async function searchOnlineMusic() {
  const query = onlineSearchInput.value.trim();

  if (!query) {
    onlineStatus.textContent = "Please enter an artist, song or album.";

    onlineResults.innerHTML = "";

    return;
  }

  onlineStatus.textContent = `Searching for "${query}"...`;

  onlineResults.innerHTML = "";

  try {
    const response = await fetch(
      `/api/search?term=${encodeURIComponent(query)}`,
    );

    if (!response.ok) {
      let message = `Search request failed (${response.status})`;

      try {
        const errorData = await response.json();

        if (errorData.error) {
          message = errorData.error;
        }
      } catch (_) {}

      throw new Error(message);
    }

    const data = await response.json();

    const results = Array.isArray(data.results) ? data.results : [];

    if (!results.length) {
      onlineStatus.textContent = `No results found for "${query}".`;

      return;
    }

    onlineStatus.textContent = `${results.length} result${results.length === 1 ? "" : "s"} found.`;

    displayOnlineResults(results);
  } catch (error) {
    console.error("Search failed:", error);

    onlineStatus.textContent = "Search failed.";

    onlineResults.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠</div>
        <h3>Search failed</h3>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
  }
}

function displayOnlineResults(results) {
  onlineResults.innerHTML = "";

  results.forEach((track) => {
    if (!track.previewUrl) return;

    const card = document.createElement("article");

    card.className = "track-card";

    const artwork = document.createElement("div");

    if (track.artworkUrl100) {
      artwork.innerHTML = `
        <img
          class="track-art"
          src="${escapeAttribute(track.artworkUrl100)}"
          alt=""
        >
      `;
    } else {
      artwork.className = "track-art-placeholder";

      artwork.textContent = "♫";
    }

    const content = document.createElement("div");

    content.className = "track-content";

    const title = document.createElement("h3");

    title.textContent = track.trackName || "Unknown track";

    const artist = document.createElement("p");

    artist.textContent = track.artistName || "Unknown artist";

    const actions = document.createElement("div");

    actions.className = "track-actions";

    const play = document.createElement("button");

    play.className = "play-track";

    play.textContent = "▶ Preview";

    play.addEventListener("click", () => {
      playOnlinePreview({
        name: track.trackName,

        artist: track.artistName,

        artwork: track.artworkUrl100,

        previewUrl: track.previewUrl,
      });
    });

    const add = document.createElement("button");

    add.textContent = "＋ Add";

    add.addEventListener("click", () =>
      addOnlineTrack({
        name: track.trackName,

        artist: track.artistName,

        album: track.collectionName,

        artwork: track.artworkUrl100,

        previewUrl: track.previewUrl,
      }),
    );

    actions.appendChild(play);
    actions.appendChild(add);

    content.appendChild(title);
    content.appendChild(artist);
    content.appendChild(actions);

    card.appendChild(artwork);
    card.appendChild(content);

    onlineResults.appendChild(card);
  });

  if (!onlineResults.children.length) {
    onlineResults.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">♫</div>
        <h3>No playable previews</h3>
        <p>Try another artist or song.</p>
      </div>
    `;
  }
}

/* =========================
   ONLINE PREVIEW
========================= */

function playOnlinePreview(track) {
  if (!track.previewUrl) {
    showToast("No preview available.");

    return;
  }

  state.currentOnlineTrack = track;

  audioPlayer.src = track.previewUrl;

  playerTitle.textContent = track.name || "Online track";

  playerArtist.textContent = track.artist || "Unknown artist";

  if (track.artwork) {
    playerArtwork.innerHTML = `
      <img
        src="${escapeAttribute(track.artwork)}"
        alt=""
      >
    `;
  } else {
    playerArtwork.innerHTML = "<span>♫</span>";
  }

  audioPlayer.play().catch((error) => {
    console.error(error);

    showToast("Preview could not be played.");
  });
}

/* =========================
   ADD ONLINE TRACK
========================= */

async function addOnlineTrack(track) {
  try {
    const response = await fetch(track.previewUrl);

    const blob = await response.blob();

    const savedTrack = {
      id: `online-${Date.now()}-${Math.random().toString(36).slice(2)}`,

      name: track.name || "Online track",

      artist: track.artist || "Unknown artist",

      album: track.album || "",

      blob: blob,

      artwork: track.artwork || null,

      source: "online",

      createdAt: Date.now(),
    };

    await saveTrack(savedTrack);

    state.library.push(savedTrack);

    renderLibrary();

    showToast("Track added to your library.");
  } catch (error) {
    console.error(error);

    showToast("Could not add this track. Try playing the preview instead.");
  }
}

/* =========================
   THEME
========================= */

function toggleTheme() {
  document.body.classList.toggle("dark");

  localStorage.setItem(
    "tonearmTheme",
    document.body.classList.contains("dark") ? "dark" : "light",
  );
}

const savedTheme = localStorage.getItem("tonearmTheme");

if (savedTheme === "dark") {
  document.body.classList.add("dark");
}

/* =========================
   HELPERS
========================= */

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);

  const remaining = Math.floor(seconds % 60);

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

function showToast(message) {
  toast.textContent = message;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* =========================
   KEYBOARD SHORTCUTS
========================= */

document.addEventListener("keydown", (event) => {
  const tag = document.activeElement?.tagName;

  if (tag === "INPUT" || tag === "TEXTAREA") {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();

    togglePlay();
  }

  if (event.code === "ArrowRight") {
    if (audioPlayer.duration) {
      audioPlayer.currentTime = Math.min(
        audioPlayer.currentTime + 5,
        audioPlayer.duration,
      );
    }
  }

  if (event.code === "ArrowLeft") {
    if (audioPlayer.duration) {
      audioPlayer.currentTime = Math.max(audioPlayer.currentTime - 5, 0);
    }
  }
});
