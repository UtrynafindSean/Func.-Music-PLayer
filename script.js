// =========================================================
// TONEARM MUSIC PLAYER
// =========================================================

// -------------------------
// APP STATE
// -------------------------

let library = [];
let currentIndex = -1;

let shuffleEnabled = false;
let repeatEnabled = false;

let currentOnlineTrack = null;

// -------------------------
// DOM ELEMENTS
// -------------------------

const audioPlayer = document.getElementById("audioPlayer");

const playerArtwork = document.getElementById("playerArtwork");
const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");

const playBtn = document.getElementById("playBtn");
const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");

const currentTimeEl = document.getElementById("currentTime");
const totalTimeEl = document.getElementById("totalTime");
const progressBar = document.getElementById("progressBar");
const volumeControl = document.getElementById("volumeControl");

const addMusicBtn = document.getElementById("addMusicBtn");
const heroAddBtn = document.getElementById("heroAddBtn");
const fileInput = document.getElementById("fileInput");

const librarySearch = document.getElementById("librarySearch");

const onlineSearchInput = document.getElementById("onlineSearchInput");

const onlineSearchBtn = document.getElementById("onlineSearchBtn");

const onlineSearchStatus = document.getElementById("onlinestatus");

const onlineResults = document.getElementById("onlineResults");

// -------------------------
// INDEXED DB
// -------------------------

const DB_NAME = "tonearmDB";
const DB_VERSION = 1;
const STORE_NAME = "tracks";

let db = null;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function (event) {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = function (event) {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

function saveTrack(track) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database is not ready"));
      return;
    }

    const transaction = db.transaction(STORE_NAME, "readwrite");

    const store = transaction.objectStore(STORE_NAME);

    const request = store.put(track);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function deleteTrack(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");

    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function loadTracks() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database is not ready"));
      return;
    }

    const transaction = db.transaction(STORE_NAME, "readonly");

    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => reject(request.error);
  });
}

// -------------------------
// INITIALIZE APP
// -------------------------

async function initializeApp() {
  try {
    await openDatabase();

    library = await loadTracks();

    renderLibrary();
    updatePlayer();
  } catch (error) {
    console.error("Initialization error:", error);
  }

  setupEventListeners();
}

document.addEventListener("DOMContentLoaded", initializeApp);

// -------------------------
// EVENT LISTENERS
// -------------------------

function setupEventListeners() {
  // Add music buttons
  if (addMusicBtn) {
    addMusicBtn.addEventListener("click", () => {
      fileInput.click();
    });
  }

  if (heroAddBtn) {
    heroAddBtn.addEventListener("click", () => {
      fileInput.click();
    });
  }

  // File input
  if (fileInput) {
    fileInput.addEventListener("change", handleFiles);
  }

  // Player controls
  if (playBtn) {
    playBtn.addEventListener("click", togglePlay);
  }

  if (previousBtn) {
    previousBtn.addEventListener("click", previousTrack);
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", nextTrack);
  }

  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", toggleShuffle);
  }

  if (repeatBtn) {
    repeatBtn.addEventListener("click", toggleRepeat);
  }

  // Audio events
  if (audioPlayer) {
    audioPlayer.addEventListener("timeupdate", updateProgress);

    audioPlayer.addEventListener("loadedmetadata", updateDuration);

    audioPlayer.addEventListener("ended", handleTrackEnd);

    audioPlayer.addEventListener("play", updatePlayButton);

    audioPlayer.addEventListener("pause", updatePlayButton);

    audioPlayer.addEventListener("error", handleAudioError);
  }

  // Progress
  if (progressBar) {
    progressBar.addEventListener("input", seekAudio);
  }

  // Volume
  if (volumeControl) {
    volumeControl.addEventListener("input", changeVolume);
  }

  // Library search
  if (librarySearch) {
    librarySearch.addEventListener("input", renderLibrary);
  }

  // Online search
  if (onlineSearchBtn) {
    onlineSearchBtn.addEventListener("click", searchOnlineMusic);
  }

  if (onlineSearchInput) {
    onlineSearchInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        searchOnlineMusic();
      }
    });
  }

  setupNavigation();
  setupDragAndDrop();
}

// -------------------------
// NAVIGATION
// -------------------------

function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-btn");
  const libraryPage = document.getElementById("libraryPage");
  const onlinePage = document.getElementById("onlinePage");
  const pageTitle = document.getElementById("pageTitle");

  navItems.forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.dataset.page;

      // Remove active state from all buttons
      navItems.forEach((item) => {
        item.classList.remove("active");
      });

      // Add active state to clicked button
      button.classList.add("active");

      // Show the correct page
      if (page === "library") {
        libraryPage.classList.add("active");
        libraryPage.hidden = false;

        onlinePage.classList.remove("active");
        onlinePage.hidden = true;

        pageTitle.textContent = "Your Library";
      }

      if (page === "online") {
        libraryPage.classList.remove("active");
        libraryPage.hidden = true;

        onlinePage.classList.add("active");
        onlinePage.hidden = false;

        pageTitle.textContent = "Online Music";
      }
    });
  });
}

// -------------------------
// DRAG & DROP
// -------------------------

function setupDragAndDrop() {
  const dropZone = document.querySelector("[data-drop-zone]");

  if (!dropZone) return;

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove("dragging");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();

    const files = event.dataTransfer.files;

    handleFiles({
      target: {
        files,
      },
    });
  });
}

// -------------------------
// ADD LOCAL MUSIC
// -------------------------

async function handleFiles(event) {
  const files = Array.from(event.target.files || []);

  if (!files.length) return;

  const audioFiles = files.filter((file) => file.type.startsWith("audio/"));

  if (!audioFiles.length) {
    showToast("Please select audio files.");
    return;
  }

  for (const file of audioFiles) {
    const track = {
      id: crypto.randomUUID(),

      name: file.name.replace(/\.[^/.]+$/, ""),

      artist: "Local File",

      album: "Your Library",

      artwork: "",

      type: "local",

      file: file,

      url: URL.createObjectURL(file),
    };

    try {
      await saveTrack(track);
      library.push(track);
    } catch (error) {
      console.error("Could not save track:", error);
    }
  }

  renderLibrary();

  showToast(
    `${audioFiles.length} song${
      audioFiles.length > 1 ? "s" : ""
    } added to your library.`,
  );

  event.target.value = "";
}

// -------------------------
// RENDER LIBRARY
// -------------------------

function renderLibrary() {
  const container = document.querySelector("#libraryTracks");

  if (!container) return;

  const searchTerm = librarySearch?.value?.toLowerCase().trim() || "";

  const filtered = library.filter((track) => {
    return (
      track.name.toLowerCase().includes(searchTerm) ||
      track.artist.toLowerCase().includes(searchTerm) ||
      track.album.toLowerCase().includes(searchTerm)
    );
  });

  container.innerHTML = "";

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Your library is empty</h3>
        <p>Add music to start listening.</p>
      </div>
    `;

    return;
  }

  filtered.forEach((track) => {
    const originalIndex = library.findIndex((item) => item.id === track.id);

    const card = document.createElement("div");

    card.className = "track-card";

    card.innerHTML = `
      <div class="track-art">
        ${
          track.artwork
            ? `<img src="${escapeHTML(track.artwork)}" alt="">`
            : `<div class="default-art">♪</div>`
        }
      </div>

      <div class="track-info">
        <h3>${escapeHTML(track.name)}</h3>
        <p>${escapeHTML(track.artist)}</p>
      </div>

      <div class="track-actions">
        <button
          class="play-track"
          data-index="${originalIndex}"
          aria-label="Play ${escapeHTML(track.name)}"
        >
          ▶
        </button>

        <button
          class="delete-track"
          data-id="${escapeHTML(track.id)}"
          aria-label="Delete ${escapeHTML(track.name)}"
        >
          ×
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  container.querySelectorAll(".play-track").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);

      playTrack(index);
    });
  });

  container.querySelectorAll(".delete-track").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;

      await removeTrack(id);
    });
  });
}

// -------------------------
// PLAY LOCAL TRACK
// -------------------------

function playTrack(index) {
  if (index < 0 || index >= library.length) {
    return;
  }

  currentIndex = index;

  const track = library[currentIndex];

  if (!track) return;

  currentOnlineTrack = null;

  if (audioPlayer.src) {
    audioPlayer.pause();
  }

  if (track.type === "local") {
    if (!track.url && track.file) {
      track.url = URL.createObjectURL(track.file);
    }

    audioPlayer.src = track.url;
  } else if (track.type === "online") {
    audioPlayer.src = track.previewUrl;
  }

  updatePlayer();

  audioPlayer.play().catch((error) => {
    console.error("Playback failed:", error);
  });
}

// -------------------------
// UPDATE PLAYER
// -------------------------

function updatePlayer() {
  if (currentIndex < 0) {
    if (playerTitle) {
      playerTitle.textContent = "Nothing playing";
    }

    if (playerArtist) {
      playerArtist.textContent = "Choose a song";
    }

    if (playerArtwork) {
      playerArtwork.innerHTML = "♪";
    }

    return;
  }

  const track = library[currentIndex];

  if (!track) return;

  if (playerTitle) {
    playerTitle.textContent = track.name;
  }

  if (playerArtist) {
    playerArtist.textContent = track.artist;
  }

  if (playerArtwork) {
    if (track.artwork) {
      playerArtwork.innerHTML = `
        <img
          src="${escapeHTML(track.artwork)}"
          alt="${escapeHTML(track.name)}"
        >
      `;
    } else {
      playerArtwork.innerHTML = "♪";
    }
  }

  updatePlayButton();
}

// -------------------------
// PLAY / PAUSE
// -------------------------

function togglePlay() {
  if (currentIndex === -1) {
    if (library.length > 0) {
      playTrack(0);
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

// -------------------------
// PLAY BUTTON
// -------------------------

function updatePlayButton() {
  if (!playBtn) return;

  playBtn.textContent = audioPlayer && !audioPlayer.paused ? "❚❚" : "▶";
}

// -------------------------
// PREVIOUS
// -------------------------

function previousTrack() {
  if (!library.length) return;

  let index = currentIndex - 1;

  if (index < 0) {
    index = library.length - 1;
  }

  playTrack(index);
}

// -------------------------
// NEXT
// -------------------------

function nextTrack() {
  if (!library.length) return;

  let index;

  if (shuffleEnabled) {
    index = Math.floor(Math.random() * library.length);
  } else {
    index = currentIndex + 1;

    if (index >= library.length) {
      index = 0;
    }
  }

  playTrack(index);
}

// -------------------------
// SHUFFLE
// -------------------------

function toggleShuffle() {
  shuffleEnabled = !shuffleEnabled;

  if (shuffleBtn) {
    shuffleBtn.classList.toggle("active", shuffleEnabled);
  }

  showToast(shuffleEnabled ? "Shuffle on" : "Shuffle off");
}

// -------------------------
// REPEAT
// -------------------------

function toggleRepeat() {
  repeatEnabled = !repeatEnabled;

  if (repeatBtn) {
    repeatBtn.classList.toggle("active", repeatEnabled);
  }

  showToast(repeatEnabled ? "Repeat on" : "Repeat off");
}

// -------------------------
// TRACK ENDED
// -------------------------

function handleTrackEnd() {
  if (repeatEnabled) {
    audioPlayer.currentTime = 0;

    audioPlayer.play();

    return;
  }

  nextTrack();
}

// -------------------------
// PROGRESS
// -------------------------

function updateProgress() {
  if (!audioPlayer.duration) {
    return;
  }

  const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;

  if (progressBar) {
    progressBar.value = percentage;
  }

  if (currentTimeEl) {
    currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
  }
}

// -------------------------
// DURATION
// -------------------------

function updateDuration() {
  if (totalTimeEl) {
    totalTimeEl.textContent = formatTime(audioPlayer.duration);
  }
}

// -------------------------
// SEEK
// -------------------------

function seekAudio() {
  if (!audioPlayer.duration) {
    return;
  }

  const percentage = Number(progressBar.value);

  audioPlayer.currentTime = (percentage / 100) * audioPlayer.duration;
}

// -------------------------
// VOLUME
// -------------------------

function changeVolume() {
  audioPlayer.volume = Number(volumeControl.value);
}

// -------------------------
// AUDIO ERROR
// -------------------------

function handleAudioError() {
  showToast("This audio preview could not be played.");
}

// -------------------------
// DELETE TRACK
// -------------------------

async function removeTrack(id) {
  try {
    await deleteTrack(id);

    const index = library.findIndex((track) => track.id === id);

    if (index === currentIndex) {
      audioPlayer.pause();
      audioPlayer.src = "";

      currentIndex = -1;

      updatePlayer();
    } else if (index < currentIndex) {
      currentIndex--;
    }

    library = library.filter((track) => track.id !== id);

    renderLibrary();

    showToast("Song removed.");
  } catch (error) {
    console.error("Delete error:", error);
  }
}

// =========================================================
// ONLINE MUSIC SEARCH
// =========================================================

async function searchOnlineMusic() {
  const term = onlineSearchInput?.value?.trim();

  if (!term) {
    showToast("Enter a song or artist.");

    return;
  }

  if (onlineStatus) {
    onlineStatus.textContent = "Searching for music...";
  }

  if (onlineResults) {
    onlineResults.innerHTML = `
      <div class="loading">
        Searching...
      </div>
    `;
  }

  try {
    // IMPORTANT:
    // This calls your Vercel serverless function.
    const url = `/api/search?term=${encodeURIComponent(term)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    // Show the REAL error instead of pretending
    // that every error is an internet problem.
    if (!response.ok) {
      let errorMessage = `Server error: ${response.status}`;

      try {
        const errorData = await response.json();

        if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch (_) {
        // Response was not JSON.
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.results)) {
      throw new Error("Invalid music search response.");
    }

    displayOnlineResults(data.results);
  } catch (error) {
    console.error("Online search error:", error);

    if (onlineStatus) {
      onlineStatus.textContent = `Search error: ${error.message}`;
    }

    if (onlineResults) {
      onlineResults.innerHTML = `
        <div class="empty-state">
          <h3>Search failed</h3>
          <p>${escapeHTML(error.message)}</p>
        </div>
      `;
    }
  }
}

// -------------------------
// DISPLAY ONLINE RESULTS
// -------------------------

function displayOnlineResults(results) {
  if (!onlineResults) return;

  onlineResults.innerHTML = "";

  if (!results.length) {
    onlineStatus.textContent = "No music found.";

    onlineResults.innerHTML = `
      <div class="empty-state">
        <h3>No results</h3>
        <p>Try another song or artist.</p>
      </div>
    `;

    return;
  }

  onlineStatus.textContent = `${results.length} results found`;

  results.forEach((track) => {
    if (!track.trackName) return;

    const artwork = track.artworkUrl100
      ? track.artworkUrl100.replace("100x100", "300x300")
      : "";

    const card = document.createElement("div");

    card.className = "track-card online-track";

    card.innerHTML = `

      <div class="track-art">

        ${
          artwork
            ? `
              <img
                src="${escapeHTML(artwork)}"
                alt="${escapeHTML(track.trackName)}"
                loading="lazy"
              >
            `
            : `
              <div class="default-art">
                ♪
              </div>
            `
        }

      </div>

      <div class="track-info">

        <h3>
          ${escapeHTML(track.trackName)}
        </h3>

        <p>
          ${escapeHTML(track.artistName || "Unknown Artist")}
        </p>

        <small>
          ${escapeHTML(track.collectionName || "Single")}
        </small>

      </div>

      <div class="track-actions">

        ${
          track.previewUrl
            ? `
              <button
                class="online-play-btn"
                title="Play preview"
              >
                ▶
              </button>
            `
            : ""
        }

        <button
          class="add-online-btn"
          title="Add to library"
        >
          +
        </button>

      </div>
    `;

    onlineResults.appendChild(card);

    // Preview button
    const previewBtn = card.querySelector(".online-play-btn");

    if (previewBtn && track.previewUrl) {
      previewBtn.addEventListener("click", () => {
        playOnlinePreview({
          id: track.trackId,

          name: track.trackName,

          artist: track.artistName || "Unknown Artist",

          album: track.collectionName || "Single",

          artwork,

          previewUrl: track.previewUrl.replace("http://", "https://"),

          trackUrl: track.trackViewUrl || "",

          type: "online",
        });
      });
    }

    // Add button
    const addBtn = card.querySelector(".add-online-btn");

    if (addBtn) {
      addBtn.addEventListener("click", () => {
        addOnlineTrack({
          id: track.trackId,

          name: track.trackName,

          artist: track.artistName || "Unknown Artist",

          album: track.collectionName || "Single",

          artwork,

          previewUrl: track.previewUrl
            ? track.previewUrl.replace("http://", "https://")
            : "",

          trackUrl: track.trackViewUrl || "",

          type: "online",
        });
      });
    }
  });
}

// -------------------------
// PLAY ONLINE PREVIEW
// -------------------------

function playOnlinePreview(track) {
  currentOnlineTrack = track;

  if (audioPlayer.src) {
    audioPlayer.pause();
  }

  audioPlayer.src = track.previewUrl;

  if (playerTitle) {
    playerTitle.textContent = track.name;
  }

  if (playerArtist) {
    playerArtist.textContent = track.artist;
  }

  if (playerArtwork) {
    if (track.artwork) {
      playerArtwork.innerHTML = `
        <img
          src="${escapeHTML(track.artwork)}"
          alt="${escapeHTML(track.name)}"
        >
      `;
    } else {
      playerArtwork.innerHTML = "♪";
    }
  }

  audioPlayer.play().catch((error) => {
    console.error("Online preview error:", error);
  });
}

// -------------------------
// ADD ONLINE TRACK
// -------------------------

async function addOnlineTrack(track) {
  // Don't add the same online song twice.
  const alreadyExists = library.some(
    (item) => item.id === `online-${track.id}`,
  );

  if (alreadyExists) {
    showToast("Song is already in your library.");

    return;
  }

  const onlineTrack = {
    id: `online-${track.id}`,

    name: track.name,

    artist: track.artist,

    album: track.album,

    artwork: track.artwork,

    previewUrl: track.previewUrl,

    trackUrl: track.trackUrl,

    type: "online",
  };

  try {
    await saveTrack(onlineTrack);

    library.push(onlineTrack);

    renderLibrary();

    showToast("Added to your library.");
  } catch (error) {
    console.error("Could not add online track:", error);

    showToast("Could not add song.");
  }
}

// -------------------------
// TIME FORMAT
// -------------------------

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);

  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${secs}`;
}

// -------------------------
// ESCAPE HTML
// -------------------------

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// -------------------------
// TOAST
// -------------------------

function showToast(message) {
  let toast = document.querySelector(".tonearm-toast");

  if (!toast) {
    toast = document.createElement("div");

    toast.className = "tonearm-toast";

    document.body.appendChild(toast);
  }

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toast.hideTimer);

  toast.hideTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// =========================================================
// KEYBOARD SHORTCUTS
// =========================================================

document.addEventListener("keydown", (event) => {
  // Don't trigger shortcuts while typing.
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
    return;
  }

  // Space = Play/Pause
  if (event.code === "Space") {
    event.preventDefault();

    togglePlay();
  }

  // Arrow right = next
  if (event.code === "ArrowRight") {
    nextTrack();
  }

  // Arrow left = previous
  if (event.code === "ArrowLeft") {
    previousTrack();
  }
});
