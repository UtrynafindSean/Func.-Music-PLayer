/* =========================================
   TONEARM MUSIC PLAYER
   VERCEL READY
========================================= */

/* =========================================
   STATE
========================================= */

let library = [];

let currentIndex = -1;

let shuffleEnabled = false;

let repeatEnabled = false;

let currentOnlineTrack = null;

/* =========================================
   DOM
========================================= */

const audioPlayer = document.getElementById("audioPlayer");

const fileInput = document.getElementById("fileInput");

const browseBtn = document.getElementById("browseBtn");

const addMusicBtn = document.getElementById("addMusicBtn");

const heroAddBtn = document.getElementById("heroAddBtn");

const dropZone = document.getElementById("dropZone");

const libraryGrid = document.getElementById("libraryGrid");

const emptyState = document.getElementById("emptyState");

const trackCount = document.getElementById("trackCount");

const librarySearch = document.getElementById("librarySearch");

const navButtons = document.querySelectorAll(".nav-btn");

const libraryPage = document.getElementById("libraryPage");

const onlinePage = document.getElementById("onlinePage");

const pageTitle = document.getElementById("pageTitle");

const themeBtn = document.getElementById("themeBtn");

const onlineSearchInput = document.getElementById("onlineSearchInput");

const onlineSearchBtn = document.getElementById("onlineSearchBtn");

const onlineStatus = document.getElementById("onlineStatus");

const onlineResults = document.getElementById("onlineResults");

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

const toast = document.getElementById("toast");

/* =========================================
   INDEXED DB
========================================= */

const DB_NAME = "tonearmDB";

const DB_VERSION = 1;

const STORE_NAME = "tracks";

let db;

/* =========================================
   OPEN DATABASE
========================================= */

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;

      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* =========================================
   SAVE TRACK
========================================= */

function saveTrackToDB(track) {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();

      return;
    }

    const transaction = db.transaction(STORE_NAME, "readwrite");

    const store = transaction.objectStore(STORE_NAME);

    store.put({
      id: track.id,
      name: track.name,
      artist: track.artist,
      album: track.album,
      type: track.type,
      file: track.file,
    });

    transaction.oncomplete = () => resolve();

    transaction.onerror = () => reject(transaction.error);
  });
}

/* =========================================
   LOAD TRACKS
========================================= */

function loadTracksFromDB() {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve([]);

      return;
    }

    const transaction = db.transaction(STORE_NAME, "readonly");

    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => {
      const tracks = request.result || [];

      resolve(tracks);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* =========================================
   DELETE TRACK
========================================= */

function deleteTrackFromDB(id) {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();

      return;
    }

    const transaction = db.transaction(STORE_NAME, "readwrite");

    const store = transaction.objectStore(STORE_NAME);

    store.delete(id);

    transaction.oncomplete = () => resolve();

    transaction.onerror = () => reject(transaction.error);
  });
}

/* =========================================
   FILE HANDLING
========================================= */

function handleFiles(files) {
  const audioFiles = [...files].filter(
    (file) =>
      file.type.startsWith("audio/") ||
      /\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i.test(file.name),
  );

  if (!audioFiles.length) {
    showToast("Please select audio files.");

    return;
  }

  audioFiles.forEach((file) => {
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

    library.push(track);

    saveTrackToDB(track).catch((error) =>
      console.error("Could not save track:", error),
    );
  });

  renderLibrary();

  showToast(
    `${audioFiles.length} track${audioFiles.length > 1 ? "s" : ""} added`,
  );
}

/* =========================================
   RENDER LIBRARY
========================================= */

function renderLibrary() {
  const query = librarySearch.value.trim().toLowerCase();

  const filtered = library.filter((track) => {
    return (
      track.name.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query) ||
      track.album.toLowerCase().includes(query)
    );
  });

  libraryGrid.innerHTML = "";

  trackCount.textContent = `${library.length} ${
    library.length === 1 ? "track" : "tracks"
  }`;

  emptyState.style.display = library.length ? "none" : "block";

  if (!filtered.length) {
    if (library.length) {
      libraryGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⌕</div>
          <h3>No tracks found</h3>
          <p>Try another search.</p>
        </div>
      `;
    }

    return;
  }

  filtered.forEach((track) => {
    libraryGrid.appendChild(createTrackCard(track));
  });
}

/* =========================================
   TRACK CARD
========================================= */

function createTrackCard(track) {
  const card = document.createElement("article");

  card.className = "track-card";

  const artwork = track.artwork
    ? `
        <img
          src="${escapeHTML(track.artwork)}"
          alt=""
        >
      `
    : `
        <div class="art-placeholder">
          ♫
        </div>
      `;

  card.innerHTML = `

    <div class="track-art">

      ${artwork}

      <button
        class="track-play"
        title="Play"
      >
        ▶
      </button>

    </div>


    <div
      class="track-name"
      title="${escapeHTML(track.name)}"
    >
      ${escapeHTML(track.name)}
    </div>


    <div
      class="track-artist"
      title="${escapeHTML(track.artist)}"
    >
      ${escapeHTML(track.artist)}
    </div>


    <div class="track-actions">

      <button
        class="small-btn play-card-btn"
      >
        Play
      </button>

      <button
        class="small-btn delete-card-btn"
      >
        Delete
      </button>

    </div>

  `;

  card
    .querySelector(".track-play")
    .addEventListener("click", () => playTrack(track));

  card
    .querySelector(".play-card-btn")
    .addEventListener("click", () => playTrack(track));

  card
    .querySelector(".delete-card-btn")
    .addEventListener("click", () => deleteTrack(track.id));

  return card;
}

/* =========================================
   PLAY TRACK
========================================= */

function playTrack(track) {
  const index = library.findIndex((item) => item.id === track.id);

  if (index !== -1) {
    currentIndex = index;
  }

  currentOnlineTrack = null;

  if (track.type === "online") {
    currentOnlineTrack = track;

    audioPlayer.src = track.previewUrl;
  } else {
    if (!track.url && track.file) {
      track.url = URL.createObjectURL(track.file);
    }

    audioPlayer.src = track.url;
  }

  playerTitle.textContent = track.name;

  playerArtist.textContent = track.artist;

  if (track.artwork) {
    playerArtwork.innerHTML = `
      <img
        src="${escapeHTML(track.artwork)}"
        alt=""
      >
    `;
  } else {
    playerArtwork.innerHTML = "<span>♫</span>";
  }

  audioPlayer
    .play()
    .then(() => {
      updatePlayButton();
    })
    .catch((error) => {
      console.error(error);

      showToast("This track could not be played.");
    });
}

/* =========================================
   PLAY / PAUSE
========================================= */

function togglePlay() {
  if (!audioPlayer.src) {
    if (library.length) {
      playTrack(library[0]);
    } else {
      showToast("Add music to start playing.");
    }

    return;
  }

  if (audioPlayer.paused) {
    audioPlayer.play();
  } else {
    audioPlayer.pause();
  }
}

/* =========================================
   UPDATE PLAY BUTTON
========================================= */

function updatePlayButton() {
  playBtn.textContent = audioPlayer.paused ? "▶" : "Ⅱ";
}

/* =========================================
   NEXT
========================================= */

function playNext() {
  if (currentOnlineTrack) {
    audioPlayer.currentTime = 0;

    audioPlayer.play();

    return;
  }

  if (!library.length) return;

  let nextIndex;

  if (shuffleEnabled) {
    nextIndex = Math.floor(Math.random() * library.length);
  } else {
    nextIndex = currentIndex + 1;

    if (nextIndex >= library.length) {
      nextIndex = 0;
    }
  }

  playTrack(library[nextIndex]);
}

/* =========================================
   PREVIOUS
========================================= */

function playPrevious() {
  if (!library.length) return;

  if (audioPlayer.currentTime > 3) {
    audioPlayer.currentTime = 0;

    return;
  }

  let previousIndex = currentIndex - 1;

  if (previousIndex < 0) {
    previousIndex = library.length - 1;
  }

  playTrack(library[previousIndex]);
}

/* =========================================
   DELETE TRACK
========================================= */

async function deleteTrack(id) {
  const index = library.findIndex((track) => track.id === id);

  if (index === -1) return;

  if (index === currentIndex) {
    audioPlayer.pause();

    audioPlayer.removeAttribute("src");

    audioPlayer.load();

    currentIndex = -1;

    playerTitle.textContent = "Nothing playing";

    playerArtist.textContent = "Choose a track";

    playerArtwork.innerHTML = "<span>♫</span>";

    updatePlayButton();
  }

  const track = library[index];

  if (track.url) {
    URL.revokeObjectURL(track.url);
  }

  library.splice(index, 1);

  try {
    await deleteTrackFromDB(id);
  } catch (error) {
    console.error(error);
  }

  if (currentIndex > index) {
    currentIndex--;
  }

  renderLibrary();

  showToast("Track deleted");
}

/* =========================================
   AUDIO EVENTS
========================================= */

audioPlayer.addEventListener("play", updatePlayButton);

audioPlayer.addEventListener("pause", updatePlayButton);

audioPlayer.addEventListener("loadedmetadata", () => {
  totalTime.textContent = formatTime(audioPlayer.duration);

  progressBar.max = audioPlayer.duration || 0;
});

audioPlayer.addEventListener("timeupdate", () => {
  if (Number.isFinite(audioPlayer.duration)) {
    progressBar.value = audioPlayer.currentTime;

    currentTime.textContent = formatTime(audioPlayer.currentTime);
  }
});

audioPlayer.addEventListener("ended", () => {
  if (repeatEnabled) {
    audioPlayer.currentTime = 0;

    audioPlayer.play();

    return;
  }

  playNext();
});

/* =========================================
   FORMAT TIME
========================================= */

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);

  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

/* =========================================
   PROGRESS
========================================= */

progressBar.addEventListener("input", () => {
  audioPlayer.currentTime = Number(progressBar.value);
});

/* =========================================
   VOLUME
========================================= */

volumeControl.addEventListener("input", () => {
  audioPlayer.volume = Number(volumeControl.value);
});

/* =========================================
   PLAYER BUTTONS
========================================= */

playBtn.addEventListener("click", togglePlay);

nextBtn.addEventListener("click", playNext);

previousBtn.addEventListener("click", playPrevious);

shuffleBtn.addEventListener("click", () => {
  shuffleEnabled = !shuffleEnabled;

  shuffleBtn.classList.toggle("active", shuffleEnabled);

  showToast(shuffleEnabled ? "Shuffle on" : "Shuffle off");
});

repeatBtn.addEventListener("click", () => {
  repeatEnabled = !repeatEnabled;

  repeatBtn.classList.toggle("active", repeatEnabled);

  showToast(repeatEnabled ? "Repeat on" : "Repeat off");
});

/* =========================================
   FILE INPUT
========================================= */

browseBtn.addEventListener("click", () => fileInput.click());

addMusicBtn.addEventListener("click", () => fileInput.click());

heroAddBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (event) => {
  handleFiles(event.target.files);

  fileInput.value = "";
});

/* =========================================
   DRAG & DROP
========================================= */

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();

    dropZone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();

    dropZone.classList.remove("dragover");
  });
});

dropZone.addEventListener("drop", (event) => {
  handleFiles(event.dataTransfer.files);
});

/* =========================================
   LIBRARY SEARCH
========================================= */

librarySearch.addEventListener("input", renderLibrary);

/* =========================================
   NAVIGATION
========================================= */

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const page = button.dataset.page;

    navButtons.forEach((btn) => btn.classList.remove("active"));

    button.classList.add("active");

    if (page === "library") {
      libraryPage.classList.add("active");

      onlinePage.classList.remove("active");

      pageTitle.textContent = "Your Library";
    } else {
      libraryPage.classList.remove("active");

      onlinePage.classList.add("active");

      pageTitle.textContent = "Online Music";
    }
  });
});

/* =========================================
   THEME
========================================= */

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("light");

  const isLight = document.body.classList.contains("light");

  localStorage.setItem("tonearm-theme", isLight ? "light" : "dark");
});

if (localStorage.getItem("tonearm-theme") === "light") {
  document.body.classList.add("light");
}

/* =========================================
   ONLINE MUSIC SEARCH
========================================= */

async function searchOnlineMusic() {
  const term = onlineSearchInput.value.trim();

  if (!term) {
    showToast("Enter a song or artist.");

    return;
  }

  onlineStatus.textContent = "Searching for music...";

  onlineResults.innerHTML = "";

  try {
    /*
      IMPORTANT:

      On Vercel we use:

      /api/search

      instead of directly calling Apple.

      This removes the Live Server
      requirement and avoids browser
      CORS problems.
    */

    const url = `/api/search?term=${encodeURIComponent(term)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();

    displayOnlineResults(data);
  } catch (error) {
    console.error("Online search error:", error);

    onlineStatus.textContent =
      "Unable to search right now. Check your internet connection and try again.";
  }
}

/* =========================================
   DISPLAY ONLINE RESULTS
========================================= */

function displayOnlineResults(data) {
  const results = Array.isArray(data.results) ? data.results : [];

  if (!results.length) {
    onlineStatus.textContent = "No results found.";

    return;
  }

  onlineStatus.textContent = `${results.length} result${
    results.length === 1 ? "" : "s"
  } found.`;

  results.forEach((track) => {
    if (!track.previewUrl) {
      return;
    }

    const card = document.createElement("article");

    card.className = "track-card";

    const artwork = track.artworkUrl100
      ? track.artworkUrl100.replace("100x100", "600x600")
      : "";

    card.innerHTML = `

      <div class="track-art">

        ${
          artwork
            ? `
              <img
                src="${escapeHTML(artwork)}"
                alt=""
              >
            `
            : `
              <div class="art-placeholder">
                ♫
              </div>
            `
        }

        <button
          class="track-play"
          title="Play preview"
        >
          ▶
        </button>

      </div>


      <div
        class="track-name"
        title="${escapeHTML(track.trackName || "Unknown")}"
      >
        ${escapeHTML(track.trackName || "Unknown")}
      </div>


      <div
        class="track-artist"
        title="${escapeHTML(track.artistName || "Unknown artist")}"
      >
        ${escapeHTML(track.artistName || "Unknown artist")}
      </div>


      <div class="track-actions">

        <button class="small-btn online-play">
          Play preview
        </button>

        ${
          track.trackViewUrl
            ? `
              <button class="small-btn open-store">
                View
              </button>
            `
            : ""
        }

      </div>

    `;

    const onlineTrack = {
      id: `online-${track.trackId}`,

      name: track.trackName || "Unknown",

      artist: track.artistName || "Unknown artist",

      album: track.collectionName || "",

      artwork,

      previewUrl: track.previewUrl
        ? track.previewUrl.replace("http://", "https://")
        : "",

      trackUrl: track.trackViewUrl || "",

      type: "online",
    };

    card
      .querySelector(".track-play")
      .addEventListener("click", () => playTrack(onlineTrack));

    card
      .querySelector(".online-play")
      .addEventListener("click", () => playTrack(onlineTrack));

    const storeButton = card.querySelector(".open-store");

    if (storeButton) {
      storeButton.addEventListener("click", () => {
        window.open(onlineTrack.trackUrl, "_blank", "noopener,noreferrer");
      });
    }

    onlineResults.appendChild(card);
  });
}

/* =========================================
   ONLINE SEARCH EVENTS
========================================= */

onlineSearchBtn.addEventListener("click", searchOnlineMusic);

onlineSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchOnlineMusic();
  }
});

/* =========================================
   TOAST
========================================= */

let toastTimer;

function showToast(message) {
  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* =========================================
   ESCAPE HTML
========================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================
   INITIALIZE
========================================= */

async function initializeApp() {
  try {
    await openDatabase();

    const savedTracks = await loadTracksFromDB();

    library = savedTracks.map((track) => ({
      ...track,

      artwork: "",

      url: track.file ? URL.createObjectURL(track.file) : "",
    }));
  } catch (error) {
    console.warn("IndexedDB unavailable:", error);

    library = [];
  }

  renderLibrary();

  audioPlayer.volume = Number(volumeControl.value);
}

initializeApp();
