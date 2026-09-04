/* =========================================
   TONEARM MUSIC PLAYER
   Jamendo Online Music + Local Library
========================================= */

const JAMENDO_CLIENT_ID = "fd714c65";
const JAMENDO_API = "https://api.jamendo.com/v3.0";

/* =========================================
   ELEMENTS
========================================= */

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

/* =========================================
   STATE
========================================= */

let library = [];
let onlineSongs = [];
let currentPlaylist = [];
let currentIndex = -1;

let isShuffle = false;
let isRepeat = false;

/* =========================================
   HELPERS
========================================= */

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/* =========================================
   NAVIGATION
========================================= */

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const page = button.dataset.page;

    navButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    if (page === "library") {
      libraryPage.hidden = false;
      libraryPage.classList.add("active");

      onlinePage.hidden = true;
      onlinePage.classList.remove("active");

      pageTitle.textContent = "Your Library";
    }

    if (page === "online") {
      libraryPage.hidden = true;
      libraryPage.classList.remove("active");

      onlinePage.hidden = false;
      onlinePage.classList.add("active");

      pageTitle.textContent = "Online Music";

      if (onlineSongs.length === 0) {
        loadJamendoMusic();
      }
    }
  });
});

/* =========================================
   LOCAL MUSIC
========================================= */

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

function addLocalFiles(files) {
  if (!files || files.length === 0) return;

  Array.from(files).forEach((file) => {
    if (
      !file.type.startsWith("audio/") &&
      !/\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i.test(file.name)
    ) {
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
    };

    library.push(song);
  });

  renderLibrary();

  showToast(`${files.length} music file(s) added`);
}

/* =========================================
   DRAG & DROP
========================================= */

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

/* =========================================
   LIBRARY RENDER
========================================= */

function renderLibrary(filter = "") {
  libraryTracks.innerHTML = "";

  const filtered = library.filter((song) => {
    const text = `${song.title} ${song.artist} ${song.album}`.toLowerCase();

    return text.includes(filter.toLowerCase());
  });

  trackCount.textContent =
    library.length === 1 ? "1 track" : `${library.length} tracks`;

  emptyState.style.display = library.length === 0 ? "block" : "none";

  filtered.forEach((song, index) => {
    const card = createTrackCard(song, index, "library");
    libraryTracks.appendChild(card);
  });
}

/* =========================================
   ONLINE MUSIC - JAMENDO
========================================= */

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
      throw new Error(`HTTP ${response.status}`);
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
      id: track.id,
      title: track.name || "Unknown Track",
      artist: track.artist_name || "Unknown Artist",
      album: track.album_name || "Jamendo",
      url: track.audio || "",
      downloadUrl: track.audiodownload || "",
      downloadAllowed: track.audiodownload_allowed === true,
      artwork: track.album_image || track.image || "",
      source: "jamendo",
    }));

    if (onlineSongs.length === 0) {
      onlineStatus.textContent = "No music found.";
      return;
    }

    onlineStatus.textContent = `${onlineSongs.length} tracks found`;

    renderOnlineResults();
  } catch (error) {
    console.error("Jamendo error:", error);

    onlineStatus.textContent =
      "Couldn't connect to Jamendo. Make sure you are running the site through Live Server.";

    showToast("Couldn't connect to Jamendo");
  }
}

function renderOnlineResults() {
  onlineResults.innerHTML = "";

  onlineSongs.forEach((song, index) => {
    const card = createTrackCard(song, index, "online");
    onlineResults.appendChild(card);
  });
}

/* =========================================
   TRACK CARD
========================================= */

function createTrackCard(song, index, type) {
  const card = document.createElement("div");

  card.className = "track-card";

  const artwork = song.artwork
    ? `<img src="${song.artwork}" alt="${escapeHTML(song.title)}">`
    : `<div class="track-placeholder">♫</div>`;

  card.innerHTML = `
    <div class="track-artwork">
      ${artwork}
    </div>

    <div class="track-info">
      <h3>${escapeHTML(song.title)}</h3>
      <p>${escapeHTML(song.artist)}</p>
    </div>

    <div class="track-actions">
      <button class="play-track-btn" title="Play">
        ▶
      </button>

      ${
        type === "online" && song.downloadAllowed && song.downloadUrl
          ? `<button class="download-track-btn" title="Download">↓</button>`
          : ""
      }
    </div>
  `;

  const playButton = card.querySelector(".play-track-btn");

  playButton.addEventListener("click", () => {
    currentPlaylist = type === "online" ? onlineSongs : library;
    playSong(song, index);
  });

  const downloadButton = card.querySelector(".download-track-btn");

  if (downloadButton) {
    downloadButton.addEventListener("click", () => {
      downloadSong(song);
    });
  }

  return card;
}

/* =========================================
   PLAY SONG
========================================= */

function playSong(song, index) {
  if (!song.url) {
    showToast("This track cannot be played.");
    return;
  }

  currentIndex = index;

  audio.src = song.url;

  playerTitle.textContent = song.title;
  playerArtist.textContent = song.artist;

  if (song.artwork) {
    playerArtwork.innerHTML = `<img src="${song.artwork}" alt="">`;
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
      showToast("Unable to play this track");
    });
}

/* =========================================
   PLAY / PAUSE
========================================= */

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
        showToast("Unable to play track");
      });
  } else {
    audio.pause();
    playBtn.textContent = "▶️";
  }
});

/* =========================================
   NEXT
========================================= */

nextButtonHandler();

function nextButtonHandler() {
  nextButton();
}

function nextButton() {
  nextBtn.addEventListener("click", () => {
    if (currentPlaylist.length === 0) {
      showToast("No tracks available.");
      return;
    }

    let nextIndex;

    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * currentPlaylist.length);
    } else {
      nextIndex = currentIndex + 1;

      if (nextIndex >= currentPlaylist.length) {
        nextIndex = 0;
      }
    }

    playSong(currentPlaylist[nextIndex], nextIndex);
  });
}

/* =========================================
   PREVIOUS
========================================= */

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

/* =========================================
   SHUFFLE
========================================= */

shuffleBtn.addEventListener("click", () => {
  isShuffle = !isShuffle;

  shuffleBtn.classList.toggle("active", isShuffle);

  showToast(isShuffle ? "Shuffle on" : "Shuffle off");
});

/* =========================================
   REPEAT
========================================= */

repeatBtn.addEventListener("click", () => {
  isRepeat = !isRepeat;

  audio.loop = isRepeat;

  repeatBtn.classList.toggle("active", isRepeat);

  showToast(isRepeat ? "Repeat on" : "Repeat off");
});

/* =========================================
   AUDIO EVENTS
========================================= */

audio.addEventListener("loadedmetadata", () => {
  totalTime.textContent = formatTime(audio.duration);
  progressBar.value = 0;
});

audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;

  const progress = (audio.currentTime / audio.duration) * 100;

  progressBar.value = progress;

  currentTime.textContent = formatTime(audio.currentTime);
});

audio.addEventListener("play", () => {
  playBtn.textContent = "⏸";
});

audio.addEventListener("pause", () => {
  playBtn.textContent = "▶️";
});

audio.addEventListener("ended", () => {
  if (!isRepeat && currentPlaylist.length > 0) {
    let nextIndex = currentIndex + 1;

    if (nextIndex >= currentPlaylist.length) {
      nextIndex = 0;
    }

    playSong(currentPlaylist[nextIndex], nextIndex);
  }
});

audio.addEventListener("error", () => {
  console.error("Audio playback error:", audio.error);
  showToast("This track could not be played.");
});

/* =========================================
   PROGRESS BAR
========================================= */

progressBar.addEventListener("input", () => {
  if (!audio.duration) return;

  audio.currentTime = (progressBar.value / 100) * audio.duration;
});

/* =========================================
   VOLUME
========================================= */

audio.volume = 1;

volumeControl.addEventListener("input", () => {
  audio.volume = Number(volumeControl.value);
});

/* =========================================
   DOWNLOAD
========================================= */

function downloadSong(song) {
  if (!song.downloadAllowed || !song.downloadUrl) {
    showToast("Download is not available for this track.");
    return;
  }

  const link = document.createElement("a");

  link.href = song.downloadUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  document.body.appendChild(link);
  link.click();
  link.remove();

  showToast("Download started");
}

/* =========================================
   LIBRARY SEARCH
========================================= */

librarySearch.addEventListener("input", () => {
  renderLibrary(librarySearch.value);
});

/* =========================================
   ONLINE SEARCH
========================================= */

onlineSearchBtn.addEventListener("click", () => {
  const query = onlineSearchInput.value.trim();

  loadJamendoMusic(query);
});

onlineSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();

    const query = onlineSearchInput.value.trim();

    loadJamendoMusic(query);
  }
});

/* =========================================
   THEME
========================================= */

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");

  localStorage.setItem("tonearm-theme", isDark ? "dark" : "light");
});

if (localStorage.getItem("tonearm-theme") === "dark") {
  document.body.classList.add("dark");
}

/* =========================================
   HTML ESCAPE
========================================= */

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================
   INITIAL STATE
========================================= */

renderLibrary();

console.log("TONEARM Music Player loaded successfully.");
