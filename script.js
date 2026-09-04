/* =========================================
   TONEARM MUSIC PLAYER
   ========================================= */


/* =========================================
   ELEMENTS
   ========================================= */

const audio = document.getElementById("audioPlayer");

const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");
const addMusicBtn = document.getElementById("addMusicBtn");
const heroAddBtn = document.getElementById("heroAddBtn");

const dropZone = document.getElementById("dropZone");

const libraryGrid = document.getElementById("libraryGrid");
const emptyState = document.getElementById("emptyState");

const trackCount = document.getElementById("trackCount");

const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");

const progress = document.getElementById("progress");

const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");

const volume = document.getElementById("volume");

const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");
const playerArtwork = document.getElementById("playerArtwork");

const themeBtn = document.getElementById("themeBtn");

const toast = document.getElementById("toast");

const globalSearch = document.getElementById("globalSearch");

const onlineSearchInput =
  document.getElementById("onlineSearchInput");

const onlineSearchBtn =
  document.getElementById("onlineSearchBtn");

const onlineResults =
  document.getElementById("onlineResults");

const onlineStatus =
  document.getElementById("onlineStatus");

const librarySection =
  document.getElementById("librarySection");

const onlineSection =
  document.getElementById("onlineSection");

const pageTitle =
  document.getElementById("pageTitle");


/* =========================================
   STATE
   ========================================= */

let library = [];

let currentIndex = -1;

let isShuffle = false;

let isRepeat = false;

let onlineTracks = [];

let currentOnlineTrack = null;


/* =========================================
   LOCAL STORAGE
   ========================================= */

function saveLibrary() {

  /*
    Blob URLs cannot survive page refreshes.

    We only store metadata here.

    The actual audio file is kept during the
    current browser session.
  */

  try {

    const metadata = library.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artist,
      album: track.album,
      type: track.type
    }));

    localStorage.setItem(
      "tonearm-library",
      JSON.stringify(metadata)
    );

  } catch (error) {

    console.warn(
      "Could not save library metadata.",
      error
    );

  }
}


/* =========================================
   ADD FILES
   ========================================= */

function addFiles(files) {

  const audioFiles = Array.from(files).filter(file =>
    file.type.startsWith("audio/")
  );

  if (!audioFiles.length) {

    showToast("Please select audio files.");

    return;
  }

  audioFiles.forEach(file => {

    const track = {

      id:
        Date.now() +
        Math.random()
          .toString(36)
          .substring(2),

      name: cleanFileName(file.name),

      artist: "Local file",

      album: "Your library",

      type: "local",

      file: file,

      url: URL.createObjectURL(file)

    };

    library.push(track);

  });

  saveLibrary();

  renderLibrary();

  showToast(
    `${audioFiles.length} track${audioFiles.length > 1 ? "s" : ""} added`
  );
}


/* =========================================
   CLEAN FILE NAME
   ========================================= */

function cleanFileName(filename) {

  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();

}


/* =========================================
   FILE INPUT
   ========================================= */

browseBtn.addEventListener("click", () => {

  fileInput.click();

});


addMusicBtn.addEventListener("click", () => {

  fileInput.click();

});


heroAddBtn.addEventListener("click", () => {

  fileInput.click();

});


fileInput.addEventListener("change", event => {

  addFiles(event.target.files);

  /*
    Allows the same file to be selected again.
  */

  fileInput.value = "";

});


/* =========================================
   DRAG AND DROP
   ========================================= */

dropZone.addEventListener("dragover", event => {

  event.preventDefault();

  dropZone.classList.add("dragging");

});


dropZone.addEventListener("dragleave", () => {

  dropZone.classList.remove("dragging");

});


dropZone.addEventListener("drop", event => {

  event.preventDefault();

  dropZone.classList.remove("dragging");

  addFiles(event.dataTransfer.files);

});


dropZone.addEventListener("click", event => {

  if (
    event.target === dropZone ||
    event.target.classList.contains("upload-icon") ||
    event.target.tagName === "H3" ||
    event.target.tagName === "P"
  ) {

    fileInput.click();

  }

});


/* =========================================
   RENDER LIBRARY
   ========================================= */

function renderLibrary(filter = "") {

  libraryGrid.innerHTML = "";

  const filtered = library.filter(track =>

    track.name
      .toLowerCase()
      .includes(filter.toLowerCase())

  );

  trackCount.textContent =
    `${library.length} track${library.length === 1 ? "" : "s"}`;


  if (!filtered.length) {

    libraryGrid.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">♫</div>

        <h3>
          ${
            filter
              ? "No matching tracks"
              : "Your library is empty"
          }
        </h3>

        <p>
          ${
            filter
              ? "Try another search."
              : "Add some music to start building your collection."
          }
        </p>

      </div>
    `;

    return;
  }


  filtered.forEach(track => {

    const card = createTrackCard(track);

    libraryGrid.appendChild(card);

  });

}


/* =========================================
   CREATE TRACK CARD
   ========================================= */

function createTrackCard(track) {

  const card = document.createElement("article");

  card.className = "track-card";


  card.innerHTML = `

    <div class="artwork">

      <span>♫</span>

    </div>

    <div class="track-name">
      ${escapeHTML(track.name)}
    </div>

    <div class="artist-name">
      ${escapeHTML(track.artist || "Unknown artist")}
    </div>

    <div class="card-actions">

      <button
        class="card-play"
        title="Play"
      >
        ▶
      </button>

      <button
        class="card-delete"
        title="Remove"
      >
        ×
      </button>

    </div>

  `;


  const artwork = card.querySelector(".artwork");


  /*
    Online tracks can have artwork.
  */

  if (track.artwork) {

    artwork.innerHTML = `
      <img
        src="${track.artwork}"
        alt=""
        loading="lazy"
      >
    `;

  }


  const playButton =
    card.querySelector(".card-play");

  const deleteButton =
    card.querySelector(".card-delete");


  playButton.addEventListener("click", () => {

    const index = library.findIndex(
      item => item.id === track.id
    );

    if (index !== -1) {

      playTrack(index);

    }

  });


  deleteButton.addEventListener("click", () => {

    deleteTrack(track.id);

  });


  return card;
}


/* =========================================
   PLAY TRACK
   ========================================= */

function playTrack(index) {

  if (!library[index]) return;

  currentIndex = index;

  const track = library[index];

  currentOnlineTrack = null;

  audio.src = track.url;

  audio.currentTime = 0;

  audio.play()
    .then(() => {

      updatePlayButton();

    })
    .catch(error => {

      console.error(error);

      showToast(
        "Your browser could not play this file."
      );

    });


  playerTitle.textContent = track.name;

  playerArtist.textContent =
    track.artist || "Unknown artist";

  playerArtwork.innerHTML = "♫";


  if (track.artwork) {

    playerArtwork.innerHTML = `
      <img src="${track.artwork}" alt="">
    `;

  }

  updatePlayButton();

}


/* =========================================
   PLAY ONLINE TRACK
   ========================================= */

function playOnlineTrack(track) {

  if (!track.previewUrl) {

    showToast(
      "No preview is available for this song."
    );

    return;
  }


  currentOnlineTrack = track;

  currentIndex = -1;

  audio.src = track.previewUrl;

  audio.currentTime = 0;

  audio.play()
    .then(() => {

      updatePlayButton();

    })
    .catch(error => {

      console.error(error);

      showToast(
        "Unable to play this preview."
      );

    });


  playerTitle.textContent =
    track.name;

  playerArtist.textContent =
    `${track.artist} • Online preview`;

  playerArtwork.innerHTML = `
    <img
      src="${track.artwork}"
      alt=""
    >
  `;


  updatePlayButton();

}


/* =========================================
   PLAY / PAUSE
   ========================================= */

playBtn.addEventListener("click", () => {

  if (!audio.src) {

    if (library.length) {

      playTrack(0);

    } else {

      showToast(
        "Add a track or search online."
      );

    }

    return;
  }


  if (audio.paused) {

    audio.play();

  } else {

    audio.pause();

  }

});


audio.addEventListener("play", () => {

  updatePlayButton();

});


audio.addEventListener("pause", () => {

  updatePlayButton();

});


function updatePlayButton() {

  playBtn.textContent =
    audio.paused ? "▶" : "Ⅱ";

}


/* =========================================
   NEXT
   ========================================= */

nextBtn.addEventListener("click", () => {

  if (!library.length) return;


  let nextIndex;


  if (isShuffle) {

    nextIndex =
      Math.floor(
        Math.random() * library.length
      );

  } else {

    nextIndex =
      currentIndex + 1;

    if (nextIndex >= library.length) {

      nextIndex = 0;

    }

  }


  playTrack(nextIndex);

});


/* =========================================
   PREVIOUS
   ========================================= */

prevBtn.addEventListener("click", () => {

  if (!library.length) return;


  let previousIndex =
    currentIndex - 1;


  if (previousIndex < 0) {

    previousIndex =
      library.length - 1;

  }


  playTrack(previousIndex);

});


/* =========================================
   SHUFFLE
   ========================================= */

shuffleBtn.addEventListener("click", () => {

  isShuffle = !isShuffle;

  shuffleBtn.style.color =
    isShuffle
      ? "var(--accent)"
      : "";

  showToast(
    isShuffle
      ? "Shuffle enabled"
      : "Shuffle disabled"
  );

});


/* =========================================
   REPEAT
   ========================================= */

repeatBtn.addEventListener("click", () => {

  isRepeat = !isRepeat;

  repeatBtn.style.color =
    isRepeat
      ? "var(--accent)"
      : "";

  showToast(
    isRepeat
      ? "Repeat enabled"
      : "Repeat disabled"
  );

});


/* =========================================
   AUDIO ENDED
   ========================================= */

audio.addEventListener("ended", () => {

  /*
    Online previews are only 30 seconds.
  */

  if (currentOnlineTrack) {

    updatePlayButton();

    return;

  }


  if (isRepeat && currentIndex !== -1) {

    playTrack(currentIndex);

    return;

  }


  if (library.length) {

    nextBtn.click();

  }

});


/* =========================================
   PROGRESS
   ========================================= */

audio.addEventListener("loadedmetadata", () => {

  duration.textContent =
    formatTime(audio.duration);

});


audio.addEventListener("timeupdate", () => {

  if (!audio.duration) return;

  const percentage =
    (audio.currentTime / audio.duration) * 100;

  progress.value = percentage;

  currentTime.textContent =
    formatTime(audio.currentTime);

});


progress.addEventListener("input", () => {

  if (!audio.duration) return;

  audio.currentTime =
    (progress.value / 100) *
    audio.duration;

});


function formatTime(seconds) {

  if (!Number.isFinite(seconds)) {

    return "0:00";

  }

  const minutes =
    Math.floor(seconds / 60);

  const secs =
    Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");

  return `${minutes}:${secs}`;

}


/* =========================================
   VOLUME
   ========================================= */

audio.volume =
  Number(volume.value);


volume.addEventListener("input", () => {

  audio.volume =
    Number(volume.value);

});


/* =========================================
   DELETE TRACK
   ========================================= */

function deleteTrack(id) {

  const index =
    library.findIndex(
      track => track.id === id
    );


  if (index === -1) return;


  const track =
    library[index];


  /*
    Release the Blob URL.
  */

  if (track.url) {

    URL.revokeObjectURL(track.url);

  }


  /*
    If the deleted track is currently
    playing, stop playback.
  */

  if (index === currentIndex) {

    audio.pause();

    audio.removeAttribute("src");

    audio.load();

    currentIndex = -1;

    playerTitle.textContent =
      "Nothing playing";

    playerArtist.textContent =
      "Add music to begin";

    playerArtwork.innerHTML =
      "♫";

  }


  library.splice(index, 1);


  if (currentIndex > index) {

    currentIndex--;

  }


  saveLibrary();

  renderLibrary();

  showToast("Track removed");

}


/* =========================================
   ONLINE MUSIC SEARCH
   ========================================= */

/*
  iTunes Search API

  This searches Apple's public catalog.

  The API provides preview URLs for many
  tracks.

  The preview is normally approximately
  30 seconds.
*/


async function searchOnlineMusic() {

  const query =
    onlineSearchInput.value.trim();


  if (!query) {

    showToast(
      "Type an artist, song or album."
    );

    return;
  }


  onlineStatus.textContent =
    "Searching...";

  onlineResults.innerHTML = "";


  try {

    const url =
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=30`;


    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        "Search request failed."
      );

    }


    const data =
      await response.json();


    onlineTracks =
      data.results || [];


    renderOnlineResults();


  } catch (error) {

    console.error(error);

    onlineStatus.textContent =
      "Unable to search right now.";

    onlineResults.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">!</div>

        <h3>
          Search failed
        </h3>

        <p>
          Check your internet connection
          and try again.
        </p>

      </div>

    `;

  }

}


/* =========================================
   RENDER ONLINE RESULTS
   ========================================= */

function renderOnlineResults() {

  onlineResults.innerHTML = "";


  if (!onlineTracks.length) {

    onlineStatus.textContent =
      "No results found.";

    onlineResults.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">⌕</div>

        <h3>
          No songs found
        </h3>

        <p>
          Try searching for another artist
          or song.
        </p>

      </div>

    `;

    return;

  }


  onlineStatus.textContent =
    `${onlineTracks.length} results found`;


  onlineTracks.forEach(track => {

    const card =
      document.createElement("article");

    card.className =
      "track-card";


    const artwork =
      track.artworkUrl100 ||
      "";


    card.innerHTML = `

      <div class="artwork">

        ${
          artwork

          ? `
            <img
              src="${artwork}"
              alt=""
              loading="lazy"
            >
          `

          : `
            <span>♫</span>
          `
        }

      </div>


      <div class="track-name">

        ${escapeHTML(
          track.trackName ||
          "Unknown track"
        )}

      </div>


      <div class="artist-name">

        ${escapeHTML(
          track.artistName ||
          "Unknown artist"
        )}

      </div>


      <div class="card-actions">

        <button
          class="card-play"
          title="Play preview"
        >
          ▶
        </button>

        <button
          class="card-delete"
          title="Add to library"
        >
          ＋
        </button>

      </div>

    `;


    const playButton =
      card.querySelector(".card-play");


    const addButton =
      card.querySelector(".card-delete");


    playButton.addEventListener(
      "click",
      () => {

        playOnlineTrack({

          name:
            track.trackName,

          artist:
            track.artistName,

          album:
            track.collectionName,

          artwork:
            track.artworkUrl100,

          previewUrl:
            track.previewUrl

        });

      }
    );


    addButton.addEventListener(
      "click",
      () => {

        addOnlineTrackToLibrary(track);

      }
    );


    onlineResults.appendChild(card);

  });

}


/* =========================================
   ADD ONLINE TRACK TO LIBRARY
   ========================================= */

function addOnlineTrackToLibrary(track) {

  /*
    The iTunes API provides a preview URL.

    We add the online track to the current
    session library using that preview URL.
  */

  if (!track.previewUrl) {

    showToast(
      "This track has no available preview."
    );

    return;

  }


  const exists =
    library.some(
      item =>
        item.name === track.trackName &&
        item.artist === track.artistName
    );


  if (exists) {

    showToast(
      "That track is already in your library."
    );

    return;

  }


  const onlineTrack = {

    id:
      Date.now() +
      Math.random()
        .toString(36)
        .substring(2),

    name:
      track.trackName,

    artist:
      track.artistName,

    album:
      track.collectionName,

    artwork:
      track.artworkUrl100,

    previewUrl:
      track.previewUrl,

    url:
      track.previewUrl,

    type:
      "online"

  };


  library.push(onlineTrack);

  renderLibrary();

  showToast(
    "Added to your library"
  );

}


/* =========================================
   ONLINE SEARCH BUTTON
   ========================================= */

onlineSearchBtn.addEventListener(
  "click",
  searchOnlineMusic
);


/* =========================================
   ENTER TO SEARCH
   ========================================= */

onlineSearchInput.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      searchOnlineMusic();

    }

  }
);


/* =========================================
   NAVIGATION
   ========================================= */

const navButtons =
  document.querySelectorAll(".nav-btn");


navButtons.forEach(button => {

  button.addEventListener("click", () => {

    navButtons.forEach(btn =>
      btn.classList.remove("active")
    );

    button.classList.add("active");


    const section =
      button.dataset.section;


    if (section === "library") {

      librarySection.classList.add("active");

      onlineSection.classList.remove("active");

      pageTitle.textContent =
        "Library";

    }


    if (section === "online") {

      onlineSection.classList.add("active");

      librarySection.classList.remove("active");

      pageTitle.textContent =
        "Online Search";

    }

  });

});


/* =========================================
   GLOBAL LIBRARY SEARCH
   ========================================= */

globalSearch.addEventListener(
  "input",
  () => {

    /*
      Only search the local library.
    */

    renderLibrary(
      globalSearch.value
    );

  }
);


/* =========================================
   THEME
   ========================================= */

themeBtn.addEventListener("click", () => {

  document.body.classList.toggle("light");


  localStorage.setItem(
    "tonearm-theme",
    document.body.classList.contains("light")
      ? "light"
      : "dark"
  );

});


if (
  localStorage.getItem("tonearm-theme")
  === "light"
) {

  document.body.classList.add("light");

}


/* =========================================
   TOAST
   ========================================= */

let toastTimer;


function showToast(message) {

  toast.textContent =
    message;

  toast.classList.add("show");


  clearTimeout(toastTimer);


  toastTimer =
    setTimeout(() => {

      toast.classList.remove("show");

    }, 2500);

}


/* =========================================
   HTML ESCAPE
   ========================================= */

function escapeHTML(value) {

  if (value === undefined || value === null) {

    return "";

  }


  return String(value)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");

}


/* =========================================
   KEYBOARD SHORTCUTS
   ========================================= */

document.addEventListener(
  "keydown",
  event => {

    /*
      Space = play/pause

      Don't trigger when typing in an input.
    */

    if (
      event.code === "Space" &&
      event.target.tagName !== "INPUT"
    ) {

      event.preventDefault();

      playBtn.click();

    }


    /*
      Arrow keys = seek
    */

    if (
      event.code === "ArrowRight" &&
      event.target.tagName !== "INPUT"
    ) {

      if (audio.duration) {

        audio.currentTime =
          Math.min(
            audio.currentTime + 5,
            audio.duration
          );

      }

    }


    if (
      event.code === "ArrowLeft" &&
      event.target.tagName !== "INPUT"
    ) {

      if (audio.duration) {

        audio.currentTime =
          Math.max(
            audio.currentTime - 5,
            0
          );

      }

    }

  }
);


/* =========================================
   INITIAL RENDER
   ========================================= */

renderLibrary();