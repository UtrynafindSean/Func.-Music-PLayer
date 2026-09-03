/* 
/* ================= ELEMENTS ================= */

const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  [...document.querySelectorAll(selector)];


const audio = $("#audio");

const fileInput = $("#fileInput");

const content = $("#content");

const playlistList =
  $("#playlistList");

const globalSearch =
  $("#globalSearch");

const dropOverlay =
  $("#dropOverlay");

const toast =
  $("#toast");


/* ================= DATABASE ================= */

const DB_NAME = "tonearm-db";

const STORE = "tracks";

let db;

let tracks = [];

let currentIndex = -1;

let shuffle = false;

let repeat = false;


/* ================= HELPERS ================= */

function uid() {

  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return (
    Date.now() +
    "-" +
    Math.random()
  );

}


function escapeHTML(value = "") {

  return String(value).replace(
    /[&<>"']/g,

    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char])
  );

}


function formatTime(seconds) {

  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  seconds =
    Math.max(
      0,
      Math.floor(seconds)
    );

  const minutes =
    Math.floor(seconds / 60);

  const secs =
    String(seconds % 60)
      .padStart(2, "0");

  return `${minutes}:${secs}`;

}


function showToast(message) {

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(
    showToast.timer
  );

  showToast.timer =
    setTimeout(() => {

      toast.classList.remove(
        "show"
      );

    }, 2200);

}


/* ================= COLORS ================= */

function colorFor(index) {

  const colors = [

    "#c17a25",
    "#4b618b",
    "#4d8175",
    "#a95756",
    "#7055a8",
    "#9b8330",
    "#65766d",
    "#8d6348"

  ];

  return colors[
    index % colors.length
  ];

}


function hash(value) {

  let h = 0;

  for (
    let i = 0;
    i < value.length;
    i++
  ) {

    h =
      (
        (h << 5) -
        h +
        value.charCodeAt(i)
      ) |
      0;

  }

  return h;

}


function trackArt(track) {

  const index =
    Math.abs(
      hash(track.id)
    ) % 8;

  return `
    --art:${colorFor(index)}
  `;

}


/* ================= INDEXED DB ================= */

function openDB() {

  return new Promise(
    (resolve, reject) => {

      const request =
        indexedDB.open(
          DB_NAME,
          1
        );


      request.onupgradeneeded =
        () => {

          request.result
            .createObjectStore(
              STORE,
              {
                keyPath: "id"
              }
            );

        };


      request.onsuccess =
        () => {

          resolve(
            request.result
          );

        };


      request.onerror =
        () => {

          reject(
            request.error
          );

        };

    }
  );

}


/* GET ALL TRACKS */

function getAllTracks() {

  return new Promise(
    (resolve, reject) => {

      const transaction =
        db.transaction(
          STORE,
          "readonly"
        );

      const request =
        transaction
          .objectStore(STORE)
          .getAll();


      request.onsuccess =
        () => {

          resolve(
            request.result
          );

        };


      request.onerror =
        () => {

          reject(
            request.error
          );

        };

    }
  );

}


/* SAVE TRACK */

function saveTrack(track) {

  return new Promise(
    (resolve, reject) => {

      const transaction =
        db.transaction(
          STORE,
          "readwrite"
        );


      transaction
        .objectStore(STORE)
        .put(track);


      transaction.oncomplete =
        resolve;


      transaction.onerror =
        () => {

          reject(
            transaction.error
          );

        };

    }
  );

}


/* DELETE TRACK */

function removeTrack(id) {

  return new Promise(
    (resolve, reject) => {

      const transaction =
        db.transaction(
          STORE,
          "readwrite"
        );


      transaction
        .objectStore(STORE)
        .delete(id);


      transaction.oncomplete =
        resolve;


      transaction.onerror =
        () => {

          reject(
            transaction.error
          );

        };

    }
  );

}


/* ================= FILE IMPORT ================= */

function getTitle(fileName) {

  return fileName

    .replace(
      /\.[^/.]+$/,
      ""
    )

    .replace(
      /[_-]+/g,
      " "
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim()

    || "Untitled";

}


function getArtist(fileName) {

  const title =
    getTitle(fileName);


  if (
    title.includes(" - ")
  ) {

    return title
      .split(" - ")[0]
      .trim();

  }


  return "Local library";

}


/* IMPORT MUSIC */

async function importFiles(
  files
) {

  const audioFiles =
    [...files].filter(
      file =>

        file.type.startsWith(
          "audio/"
        )

        ||

        /\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i
          .test(file.name)
    );


  if (
    !audioFiles.length
  ) {

    showToast(
      "Choose an audio file"
    );

    return;

  }


  for (
    const file of audioFiles
  ) {

    const track = {

      id: uid(),

      name:
        getTitle(
          file.name
        ),

      artist:
        getArtist(
          file.name
        ),

      album:
        "Local Library",

      fileName:
        file.name,

      blob:
        file,

      added:
        Date.now(),

      liked:
        false

    };


    await saveTrack(
      track
    );

  }


  tracks =
    await getAllTracks();


  renderAll();


  showToast(
    `${audioFiles.length} track${
      audioFiles.length > 1
        ? "s"
        : ""
    } added`
  );

}


/* ================= PLAYLISTS ================= */

function renderPlaylists() {

  playlistList.innerHTML = `

    <button
      class="playlist-item"
      data-playlist="liked"
    >

      <span
        class="playlist-dot"
        style="
          background:
          linear-gradient(
            135deg,
            #d45c78,
            #742c3f
          )
        "
      >
        ♥
      </span>

      Liked Songs

    </button>


    <button
      class="playlist-item"
      data-playlist="all"
    >

      <span
        class="playlist-dot"
        style="
          background:
          linear-gradient(
            135deg,
            #55709e,
            #293a5b
          )
        "
      >
        ♪
      </span>

      My Library

    </button>

  `;


  $$(".playlist-item")
    .forEach(button => {

      button.onclick = () => {

        if (
          button.dataset.playlist ===
          "liked"
        ) {

          renderLibrary(
            tracks.filter(
              track =>
                track.liked
            ),
            "Liked Songs"
          );

        } else {

          renderLibrary(
            tracks,
            "Your Library"
          );

        }

      };

    });

}


/* ================= SONG LIST ================= */

function songList(list) {

  if (!list.length) {

    return `
      <div class="empty">

        <strong>
          No music here yet
        </strong>

        Add your music files
        to start listening.

      </div>
    `;

  }


  return `

    <div class="song-list">

      ${list.map(track => `

        <div
          class="
            song
            ${
              tracks[currentIndex]?.id ===
              track.id
                ? "playing"
                : ""
            }
          "
          data-id="${track.id}"
        >

          <div
            class="song-art"
            style="${trackArt(track)}"
          ></div>


          <div>

            <div class="song-title">

              ${escapeHTML(
                track.name
              )}

            </div>


            <div class="song-meta">

              ${escapeHTML(
                track.artist
              )}

              ·

              ${escapeHTML(
                track.album ||
                "Local Library"
              )}

            </div>

          </div>


          <div class="song-meta">

            Local file

          </div>


          <div
            class="song-time"
          >
            —
          </div>


          <button
            class="more"
            data-delete="${track.id}"
            title="Remove track"
          >
            ⋯
          </button>

        </div>

      `).join("")}

    </div>

  `;

}


/* ================= HOME ================= */

function renderHome() {

  if (!tracks.length) {

    content.innerHTML = `

      <h1 class="view-title">
        Good afternoon
      </h1>


      <div class="hero-actions">

        <button
          class="primary"
          id="emptyAdd"
        >
          ＋ Add music
        </button>

      </div>


      <div class="empty">

        <strong>
          Your library is empty
        </strong>

        Upload your own music
        to start building TONEARM.

        <br><br>

        Nothing is hardcoded —
        every song comes from
        your own files.

      </div>

    `;


    $("#emptyAdd").onclick =
      () => fileInput.click();


    return;

  }


  const recent =
    [...tracks]
      .sort(
        (a, b) =>
          b.added - a.added
      )
      .slice(0, 4);


  content.innerHTML = `

    <h1 class="view-title">
      Good afternoon
    </h1>


    <div class="tabs">

      <button class="tab active">
        All
      </button>

      <button
        class="tab"
        data-go="library"
      >
        Music
      </button>

      <button
        class="tab"
        data-go="library"
      >
        Podcasts
      </button>

    </div>


    <div class="hero-actions">

      <button
        class="primary"
        id="addHome"
      >
        ＋ Add music
      </button>


      <button
        class="secondary"
        id="clearAll"
      >
        Clear library
      </button>

    </div>


    <div class="section">

      <div class="section-head">

        <h2>
          Recently added
        </h2>

        <span class="muted">

          ${tracks.length}
          track${tracks.length === 1 ? "" : "s"}

        </span>

      </div>


      <div class="track-grid">

        ${recent
          .map(
            (track, index) =>
              albumCard(
                track,
                index
              )
          )
          .join("")}

      </div>

    </div>


    <div class="section">

      <div class="section-head">

        <h2>
          All tracks
        </h2>

        <button
          class="tiny-btn"
          data-go="library"
        >
          View all
        </button>

      </div>


      ${songList(tracks)}

    </div>

  `;


  $("#addHome").onclick =
    () => fileInput.click();


  $("#clearAll").onclick =
    clearLibrary;


  $$("[data-go]")
    .forEach(button => {

      button.onclick =
        () =>
          renderLibrary(
            tracks,
            "Your Library"
          );

    });


  bindTrackButtons();

}


/* ================= ALBUM CARD ================= */

function albumCard(
  track,
  index
) {

  return `

    <article
      class="album-card"
      data-id="${track.id}"
      style="${trackArt(track)}"
    >

      <div class="album-art"></div>


      <div class="album-info">

        <strong>

          ${escapeHTML(
            track.name
          )}

        </strong>


        <span>

          ${escapeHTML(
            track.artist
          )}

        </span>

      </div>

    </article>

  `;

}


/* ================= LIBRARY ================= */

function renderLibrary(
  list = tracks,
  title = "Your Library"
) {

  content.innerHTML = `

    <h1 class="view-title">

      ${escapeHTML(title)}

    </h1>


    <div class="hero-actions">

      <button
        class="primary"
        id="addLibrary"
      >
        ＋ Add music
      </button>

    </div>


    ${songList(list)}

  `;


  $("#addLibrary").onclick =
    () => fileInput.click();


  bindTrackButtons();

}


/* ================= SEARCH ================= */

function renderSearch(query) {

  const search =
    query.trim().toLowerCase();


  if (!search) {

    renderHome();

    return;

  }


  const results =
    tracks.filter(track => {

      const text = `

        ${track.name}
        ${track.artist}
        ${track.album}

      `.toLowerCase();


      return text.includes(
        search
      );

    });


  content.innerHTML = `

    <h1 class="view-title">
      Search
    </h1>


    <p class="muted">

      Results for
      “${escapeHTML(query)}”

    </p>


    ${songList(results)}

  `;


  bindTrackButtons();

}


/* ================= VIEW ================= */

function renderView(view) {

  if (view === "home") {

    renderHome();

    return;

  }


  if (view === "search") {

    renderSearch(
      globalSearch.value
    );

    return;

  }


  if (view === "library") {

    renderLibrary();

  }

}


/* ================= BIND TRACKS ================= */

function bindTrackButtons() {

  $$("[data-id]")
    .forEach(element => {

      element.onclick =
        event => {

          if (
            event.target.closest(
              "[data-delete]"
            )
          ) {
            return;
          }


          const track =
            tracks.find(
              item =>
                item.id ===
                element.dataset.id
            );


          if (track) {

            playTrack(track);

          }

        };

    });


  $$("[data-delete]")
    .forEach(button => {

      button.onclick =
        async event => {

          event.stopPropagation();


          const id =
            button.dataset.delete;


          const wasPlaying =
            tracks[currentIndex]?.id ===
            id;


          await removeTrack(id);


          tracks =
            await getAllTracks();


          if (wasPlaying) {

            audio.pause();

            audio.removeAttribute(
              "src"
            );

            currentIndex = -1;

            updatePlayer();

          }


          renderAll();

          showToast(
            "Track removed"
          );

        };

    });

}


/* ================= PLAY TRACK ================= */

function playTrack(track) {

  const index =
    tracks.findIndex(
      item =>
        item.id ===
        track.id
    );


  if (index < 0) {
    return;
  }


  currentIndex = index;


  audio.pause();


  audio.src =
    URL.createObjectURL(
      track.blob
    );


  audio.volume =
    Number(
      $("#volumeSlider").value
    );


  audio.play()
    .then(() => {

      updatePlayer();

    })
    .catch(() => {

      showToast(
        "Could not play this file"
      );

    });


  updatePlayer();

  renderAll(false);

}


/* ================= NEXT ================= */

function nextTrack() {

  if (!tracks.length) {
    return;
  }


  let index;


  if (shuffle) {

    index =
      Math.floor(
        Math.random() *
        tracks.length
      );

  } else {

    index =
      (
        currentIndex + 1
      ) %
      tracks.length;

  }


  playTrack(
    tracks[index]
  );

}


/* ================= PREVIOUS ================= */

function previousTrack() {

  if (!tracks.length) {
    return;
  }


  if (
    audio.currentTime > 3
  ) {

    audio.currentTime = 0;

    return;

  }


  const index =
    (
      currentIndex -
      1 +
      tracks.length
    ) %
    tracks.length;


  playTrack(
    tracks[index]
  );

}


/* ================= PLAYER UI ================= */

function updatePlayer() {

  const track =
    tracks[currentIndex];


  if (!track) {

    $("#nowTitle")
      .textContent =
      "Nothing playing";


    $("#miniTitle")
      .textContent =
      "Nothing playing";


    $("#nowArtist")
      .textContent =
      "Add music to begin";


    $("#miniArtist")
      .textContent =
      "—";


    $("#playBtn")
      .textContent =
      "▶";


    $("#likeBtn")
      .textContent =
      "♡";


    renderQueue();

    return;

  }


  const color =
    colorFor(
      Math.abs(
        hash(track.id)
      ) % 8
    );


  $("#nowTitle")
    .textContent =
    track.name;


  $("#miniTitle")
    .textContent =
    track.name;


  $("#nowArtist")
    .textContent =
    track.artist;


  $("#miniArtist")
    .textContent =
    track.artist;


  $("#nowPlayingArt")
    .style
    .setProperty(
      "--now-art",
      color
    );


  $("#miniArt")
    .style
    .background =
    color;


  $("#playBtn")
    .textContent =
    audio.paused
      ? "▶"
      : "Ⅱ";


  $("#likeBtn")
    .textContent =
    track.liked
      ? "♥"
      : "♡";


  renderQueue();

}


/* ================= QUEUE ================= */

function renderQueue() {

  const upcoming =
    currentIndex >= 0

      ? tracks.slice(
          currentIndex + 1,
          currentIndex + 6
        )

      : tracks.slice(
          0,
          5
        );


  if (!upcoming.length) {

    $("#queueList")
      .innerHTML =
      `
        <div class="muted">
          Nothing queued
        </div>
      `;

    return;

  }


  $("#queueList")
    .innerHTML =

    upcoming
      .map(track => `

        <div
          class="queue-row"
          data-id="${track.id}"
          style="${trackArt(track)}"
        >

          <div
            class="queue-thumb"
          ></div>


          <div>

            <strong>

              ${escapeHTML(
                track.name
              )}

            </strong>

            <span>

              ${escapeHTML(
                track.artist
              )}

            </span>

          </div>

          <span>
            ♪
          </span>

        </div>

      `)
      .join("");


  $$("#queueList [data-id]")
    .forEach(element => {

      element.onclick =
        () => {

          const track =
            tracks.find(
              item =>
                item.id ===
                element.dataset.id
            );


          if (track) {

            playTrack(track);

          }

        };

    });

}


/* ================= CLEAR LIBRARY ================= */

async function clearLibrary() {

  if (!tracks.length) {
    return;
  }


  const confirmed =
    confirm(
      "Remove all imported music from TONEARM?"
    );


  if (!confirmed) {
    return;
  }


  for (
    const track of tracks
  ) {

    await removeTrack(
      track.id
    );

  }


  tracks = [];


  audio.pause();

  audio.removeAttribute(
    "src"
  );


  currentIndex = -1;


  renderAll();

  updatePlayer();

  showToast(
    "Library cleared"
  );

}


/* ================= RENDER ALL ================= */

function renderAll(
  full = true
) {

  renderPlaylists();


  if (full) {

    if (
      globalSearch.value.trim()
    ) {

      renderSearch(
        globalSearch.value
      );

    } else {

      renderHome();

    }

  }

}


/* ================= FILE INPUT ================= */

fileInput.onchange =
  event => {

    importFiles(
      event.target.files
    );


    event.target.value = "";

  };


$("#addFilesSide").onclick =
  () => fileInput.click();


/* ================= PLAY / PAUSE ================= */

$("#playBtn").onclick =
  () => {

    if (!tracks.length) {

      fileInput.click();

      return;

    }


    if (currentIndex < 0) {

      playTrack(
        tracks[0]
      );

      return;

    }


    if (audio.paused) {

      audio.play();

    } else {

      audio.pause();

    }

  };


/* ================= NEXT / PREVIOUS ================= */

$("#nextBtn").onclick =
  nextTrack;


$("#prevBtn").onclick =
  previousTrack;


/* ================= SHUFFLE ================= */

$("#shuffleBtn").onclick =
  () => {

    shuffle =
      !shuffle;


    $("#shuffleBtn")
      .style.color =
      shuffle
        ? "var(--accent)"
        : "";


    showToast(
      shuffle
        ? "Shuffle on"
        : "Shuffle off"
    );

  };


/* ================= REPEAT ================= */

$("#repeatBtn").onclick =
  () => {

    repeat =
      !repeat;


    audio.loop =
      repeat;


    $("#repeatBtn")
      .style.color =
      repeat
        ? "var(--accent)"
        : "";


    showToast(
      repeat
        ? "Repeat on"
        : "Repeat off"
    );

  };


/* ================= VOLUME ================= */

$("#volumeSlider").oninput =
  event => {

    audio.volume =
      Number(
        event.target.value
      );

  };


/* ================= MUTE ================= */

$("#muteBtn").onclick =
  () => {

    audio.muted =
      !audio.muted;


    $("#muteBtn")
      .textContent =
      audio.muted
        ? "🔇"
        : "🔊";

  };


/* ================= PROGRESS ================= */

$("#progress").oninput =
  event => {

    if (!audio.duration) {
      return;
    }


    audio.currentTime =
      (
        Number(
          event.target.value
        ) / 100
      ) *
      audio.duration;

  };


/* ================= AUDIO EVENTS ================= */

audio.addEventListener(
  "timeupdate",
  () => {

    $("#currentTime")
      .textContent =
      formatTime(
        audio.currentTime
      );


    $("#duration")
      .textContent =
      formatTime(
        audio.duration
      );


    $("#progress").value =
      audio.duration

        ? (
            audio.currentTime /
            audio.duration
          ) *
          100

        : 0;

  }
);


audio.addEventListener(
  "play",
  updatePlayer
);


audio.addEventListener(
  "pause",
  updatePlayer
);


audio.addEventListener(
  "ended",
  () => {

    if (!repeat) {

      nextTrack();

    }

  }
);


/* ================= LIKE ================= */

$("#likeBtn").onclick =
  async () => {

    const track =
      tracks[currentIndex];


    if (!track) {
      return;
    }


    track.liked =
      !track.liked;


    await saveTrack(
      track
    );


    tracks =
      await getAllTracks();


    updatePlayer();


    showToast(
      track.liked
        ? "Added to Liked Songs"
        : "Removed from Liked Songs"
    );

  };


/* ================= SEARCH ================= */

globalSearch.oninput =
  () => {

    renderSearch(
      globalSearch.value
    );

  };


/* ================= NAVIGATION ================= */

$$(".nav-btn")
  .forEach(button => {

    button.onclick =
      () => {

        $$(".nav-btn")
          .forEach(
            item =>
              item.classList.remove(
                "active"
              )
          );


        button.classList.add(
          "active"
        );


        renderView(
          button.dataset.view
        );

      };

  });


/* ================= THEME ================= */

$("#themeBtn").onclick =
  () => {

    document.body
      .classList
      .toggle("light");


    localStorage.setItem(
      "tonearm-theme",

      document.body.classList.contains(
        "light"
      )
        ? "light"
        : "dark"
    );

  };


if (
  localStorage.getItem(
    "tonearm-theme"
  ) === "light"
) {

  document.body
    .classList
    .add("light");

}


/* ================= DRAG & DROP ================= */

[
  "dragenter",
  "dragover"
].forEach(eventName => {

  document.addEventListener(
    eventName,
    event => {

      event.preventDefault();

      dropOverlay
        .classList
        .add("show");

    }
  );

});


document.addEventListener(
  "drop",
  event => {

    event.preventDefault();


    dropOverlay
      .classList
      .remove("show");


    importFiles(
      event.dataTransfer.files
    );

  }
);


document.addEventListener(
  "dragleave",
  event => {

    if (
      event.relatedTarget === null
    ) {

      dropOverlay
        .classList
        .remove("show");

    }

  }
);


/* ================= KEYBOARD ================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      ["INPUT", "TEXTAREA"]
        .includes(
          document.activeElement.tagName
        )
    ) {

      return;

    }


    /* SPACE */

    if (
      event.code === "Space"
    ) {

      event.preventDefault();

      $("#playBtn").click();

    }


    /* SHIFT + RIGHT */

    if (
      event.code === "ArrowRight" &&
      event.shiftKey
    ) {

      nextTrack();

    }


    /* SHIFT + LEFT */

    if (
      event.code === "ArrowLeft" &&
      event.shiftKey
    ) {

      previousTrack();

    }

  }
);


/* ================= START APP ================= */

(async function startApp() {

  try {

    db =
      await openDB();


    tracks =
      await getAllTracks();


    renderAll();

    updatePlayer();

  } catch (error) {

    console.error(
      error
    );


    showToast(
      "Browser storage is unavailable"
    );

  }

})();