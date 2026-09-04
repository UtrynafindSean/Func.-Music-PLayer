/* =========================================================
   TONEARM — JAMENDO DEVELOPER API
   ========================================================= */

const JAMENDO_CLIENT_ID = "709fa152";
const JAMENDO_API = "https://api.jamendo.com/v3.0";

/* =========================================================
   APP STATE
   ========================================================= */

let songs = [];
let currentSongIndex = -1;

let isPlaying = false;
let isShuffle = false;
let repeatMode = false;

const audio = document.getElementById("audio");

/* =========================================================
   JAMENDO API
   ========================================================= */

async function searchJamendo(query = "") {
    try {
        const params = new URLSearchParams();

        params.set("client_id", JAMENDO_CLIENT_ID);
        params.set("format", "json");
        params.set("limit", "30");

        // Good-quality MP3
        params.set("audioformat", "mp32");
        params.set("audiodlformat", "mp32");

        // Include both album tracks and singles
        params.set("type", "albumtrack");

        // Larger artwork
        params.set("imagesize", "500");

        // Search by song name
        if (query.trim()) {
            params.set("namesearch", query.trim());
        }

        const url = `${JAMENDO_API}/tracks/?${params.toString()}`;

        console.log("Jamendo request:", url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Jamendo API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.headers && data.headers.status !== "success") {
            throw new Error(
                data.headers.error_message || "Jamendo API request failed"
            );
        }

        return data.results || [];

    } catch (error) {
        console.error("Jamendo API Error:", error);

        showMessage(
            "Unable to connect to Jamendo. Check your internet connection."
        );

        return [];
    }
}

/* =========================================================
   CONVERT JAMENDO TRACK
   ========================================================= */

function formatJamendoSong(track) {
    return {
        id: `jamendo-${track.id}`,
        jamendoId: track.id,

        title: track.name || "Unknown Track",

        artist: track.artist_name || "Unknown Artist",

        album: track.album_name || "Single",

        artwork:
            track.album_image ||
            track.image ||
            "https://via.placeholder.com/500",

        image:
            track.album_image ||
            track.image ||
            "https://via.placeholder.com/500",

        duration: Number(track.duration) || 0,

        // FULL STREAM URL
        audio: track.audio,

        // DOWNLOAD URL
        downloadUrl: track.audiodownload,

        downloadAllowed:
            track.audiodownload_allowed === true,

        source: "Jamendo"
    };
}

/* =========================================================
   LOAD MUSIC FROM JAMENDO
   ========================================================= */

async function loadJamendoMusic(query = "") {

    showMessage("Loading music...");

    const results = await searchJamendo(query);

    songs = results.map(formatJamendoSong);

    renderSongs(songs);

    if (songs.length === 0) {
        showMessage("No music found.");
    }

    console.log("Jamendo songs:", songs);
}

/* =========================================================
   SEARCH
   ========================================================= */

async function searchMusic(query) {

    query = query.trim();

    if (!query) {
        await loadJamendoMusic();
        return;
    }

    await loadJamendoMusic(query);
}

/* =========================================================
   PLAY SONG
   ========================================================= */

function playSong(index) {

    if (!songs[index]) return;

    currentSongIndex = index;

    const song = songs[index];

    /*
       IMPORTANT:
       This uses Jamendo's FULL audio stream,
       NOT a 30-second preview.
    */

    if (!song.audio) {
        showMessage("This track cannot be streamed.");
        return;
    }

    audio.src = song.audio;

    audio.load();

    audio.play()
        .then(() => {
            isPlaying = true;
            updatePlayer(song);
            updatePlayButton();
        })
        .catch(error => {
            console.error("Playback error:", error);

            showMessage(
                "Unable to play this track."
            );
        });
}

/* =========================================================
   PLAY / PAUSE
   ========================================================= */

function togglePlay() {

    if (!audio.src) {

        if (songs.length > 0) {
            playSong(0);
        }

        return;
    }

    if (audio.paused) {

        audio.play()
            .then(() => {

                isPlaying = true;

                updatePlayButton();

            })
            .catch(error => {
                console.error(error);
            });

    } else {

        audio.pause();

        isPlaying = false;

        updatePlayButton();
    }
}

/* =========================================================
   NEXT SONG
   ========================================================= */

function nextSong() {

    if (songs.length === 0) return;

    let nextIndex;

    if (isShuffle) {

        nextIndex =
            Math.floor(Math.random() * songs.length);

        while (
            songs.length > 1 &&
            nextIndex === currentSongIndex
        ) {
            nextIndex =
                Math.floor(Math.random() * songs.length);
        }

    } else {

        nextIndex =
            currentSongIndex + 1;

        if (nextIndex >= songs.length) {
            nextIndex = 0;
        }
    }

    playSong(nextIndex);
}

/* =========================================================
   PREVIOUS SONG
   ========================================================= */

function previousSong() {

    if (songs.length === 0) return;

    let previousIndex =
        currentSongIndex - 1;

    if (previousIndex < 0) {
        previousIndex = songs.length - 1;
    }

    playSong(previousIndex);
}

/* =========================================================
   SHUFFLE
   ========================================================= */

function toggleShuffle() {

    isShuffle = !isShuffle;

    const shuffleButton =
        document.getElementById("shuffleBtn");

    if (shuffleButton) {
        shuffleButton.classList.toggle(
            "active",
            isShuffle
        );
    }
}

/* =========================================================
   REPEAT
   ========================================================= */

function toggleRepeat() {

    repeatMode = !repeatMode;

    const repeatButton =
        document.getElementById("repeatBtn");

    if (repeatButton) {
        repeatButton.classList.toggle(
            "active",
            repeatMode
        );
    }
}

/* =========================================================
   AUDIO ENDED
   ========================================================= */

audio.addEventListener("ended", () => {

    if (repeatMode) {

        audio.currentTime = 0;
        audio.play();

        return;
    }

    nextSong();
});

/* =========================================================
   PLAYER UI
   ========================================================= */

function updatePlayer(song) {

    const titleElements = [
        document.getElementById("playerTitle"),
        document.getElementById("currentTitle")
    ];

    titleElements.forEach(element => {

        if (element) {
            element.textContent = song.title;
        }

    });

    const artistElements = [
        document.getElementById("playerArtist"),
        document.getElementById("currentArtist")
    ];

    artistElements.forEach(element => {

        if (element) {
            element.textContent = song.artist;
        }

    });

    const imageElements = [
        document.getElementById("playerImage"),
        document.getElementById("currentImage")
    ];

    imageElements.forEach(element => {

        if (element) {
            element.src = song.artwork;
        }

    });
}

/* =========================================================
   PLAY BUTTON UI
   ========================================================= */

function updatePlayButton() {

    const buttons = [
        document.getElementById("playBtn"),
        document.getElementById("playPauseBtn")
    ];

    buttons.forEach(button => {

        if (!button) return;

        button.textContent =
            isPlaying ? "❚❚" : "▶";

    });
}

/* =========================================================
   PROGRESS BAR
   ========================================================= */

audio.addEventListener("timeupdate", () => {

    const progress =
        document.getElementById("progress");

    if (!progress) return;

    if (audio.duration) {

        progress.value =
            (audio.currentTime / audio.duration) * 100;
    }

    updateTime();
});

/* =========================================================
   SEEK
   ========================================================= */

function seekAudio(value) {

    if (!audio.duration) return;

    audio.currentTime =
        (value / 100) * audio.duration;
}

/* =========================================================
   TIME DISPLAY
   ========================================================= */

function formatTime(seconds) {

    if (!seconds || isNaN(seconds)) {
        return "0:00";
    }

    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        Math.floor(seconds % 60);

    return `${minutes}:${String(
        remainingSeconds
    ).padStart(2, "0")}`;
}

function updateTime() {

    const currentTime =
        document.getElementById("currentTime");

    const duration =
        document.getElementById("duration");

    if (currentTime) {
        currentTime.textContent =
            formatTime(audio.currentTime);
    }

    if (duration) {
        duration.textContent =
            formatTime(audio.duration);
    }
}

/* =========================================================
   VOLUME
   ========================================================= */

function setVolume(value) {

    audio.volume =
        Number(value) / 100;
}

/* =========================================================
   DOWNLOAD SONG
   ========================================================= */

async function downloadSong(index) {

    const song = songs[index];

    if (!song) return;

    if (!song.downloadAllowed || !song.downloadUrl) {

        showMessage(
            "Downloads are not available for this track."
        );

        return;
    }

    try {

        const response =
            await fetch(song.downloadUrl);

        if (!response.ok) {
            throw new Error(
                `Download failed: ${response.status}`
            );
        }

        const blob =
            await response.blob();

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            `${song.artist} - ${song.title}.mp3`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);

        showMessage("Download started.");

    } catch (error) {

        console.error(
            "Download error:",
            error
        );

        /*
           Fallback: let the browser open
           Jamendo's download URL directly.
        */

        const link =
            document.createElement("a");

        link.href =
            song.downloadUrl;

        link.target = "_blank";

        link.rel = "noopener";

        document.body.appendChild(link);

        link.click();

        link.remove();
    }
}

/* =========================================================
   RENDER SONGS
   ========================================================= */

function renderSongs(songList) {

    /*
       CHANGE THIS ID if your existing
       music container has another ID.
    */

    const container =
        document.getElementById("songGrid") ||
        document.getElementById("musicGrid") ||
        document.getElementById("songsContainer");

    if (!container) {

        console.warn(
            "Song container not found."
        );

        return;
    }

    container.innerHTML = "";

    songList.forEach((song, index) => {

        const card =
            document.createElement("div");

        card.className = "song-card";

        card.innerHTML = `
            <div class="song-image-wrapper">

                <img
                    class="song-image"
                    src="${escapeHTML(song.artwork)}"
                    alt="${escapeHTML(song.title)}"
                >

                <button
                    class="song-play-btn"
                    onclick="playSong(${index})"
                >
                    ▶
                </button>

            </div>

            <div class="song-info">

                <h3>
                    ${escapeHTML(song.title)}
                </h3>

                <p>
                    ${escapeHTML(song.artist)}
                </p>

            </div>

            <div class="song-actions">

                <button
                    onclick="playSong(${index})"
                    title="Play"
                >
                    ▶
                </button>

                <button
                    onclick="downloadSong(${index})"
                    title="Download"
                    ${
                        !song.downloadAllowed
                            ? "disabled"
                            : ""
                    }
                >
                    ↓
                </button>

            </div>
        `;

        container.appendChild(card);
    });
}

/* =========================================================
   ESCAPE HTML
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
   MESSAGE
   ========================================================= */

function showMessage(message) {

    console.log(message);

    const messageElement =
        document.getElementById("message");

    if (messageElement) {

        messageElement.textContent =
            message;

        messageElement.style.display =
            "block";

        setTimeout(() => {

            messageElement.style.display =
                "none";

        }, 3000);
    }
}

/* =========================================================
   SEARCH FORM
   ========================================================= */

const searchForm =
    document.getElementById("searchForm");

if (searchForm) {

    searchForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const input =
                document.getElementById("searchInput");

            if (!input) return;

            await searchMusic(input.value);
        }
    );
}

/* =========================================================
   SEARCH INPUT — OPTIONAL LIVE SEARCH
   ========================================================= */

const searchInput =
    document.getElementById("searchInput");

if (searchInput) {

    searchInput.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                searchMusic(
                    searchInput.value
                );
            }
        }
    );
}

/* =========================================================
   CONNECT PLAYER BUTTONS
   ========================================================= */

const playBtn =
    document.getElementById("playBtn");

if (playBtn) {

    playBtn.addEventListener(
        "click",
        togglePlay
    );
}

const playPauseBtn =
    document.getElementById("playPauseBtn");

if (playPauseBtn) {

    playPauseBtn.addEventListener(
        "click",
        togglePlay
    );
}

const nextBtn =
    document.getElementById("nextBtn");

if (nextBtn) {

    nextBtn.addEventListener(
        "click",
        nextSong
    );
}

const previousBtn =
    document.getElementById("previousBtn");

if (previousBtn) {

    previousBtn.addEventListener(
        "click",
        previousSong
    );
}

const shuffleBtn =
    document.getElementById("shuffleBtn");

if (shuffleBtn) {

    shuffleBtn.addEventListener(
        "click",
        toggleShuffle
    );
}

const repeatBtn =
    document.getElementById("repeatBtn");

if (repeatBtn) {

    repeatBtn.addEventListener(
        "click",
        toggleRepeat
    );
}

/* =========================================================
   PROGRESS INPUT
   ========================================================= */

const progress =
    document.getElementById("progress");

if (progress) {

    progress.addEventListener(
        "input",
        event => {

            seekAudio(
                event.target.value
            );
        }
    );
}

/* =========================================================
   VOLUME INPUT
   ========================================================= */

const volume =
    document.getElementById("volume");

if (volume) {

    volume.addEventListener(
        "input",
        event => {

            setVolume(
                event.target.value
            );
        }
    );
}

/* =========================================================
   AUDIO EVENTS
   ========================================================= */

audio.addEventListener("play", () => {

    isPlaying = true;

    updatePlayButton();
});

audio.addEventListener("pause", () => {

    isPlaying = false;

    updatePlayButton();
});

/* =========================================================
   START TONEARM
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "TONEARM + Jamendo API initialized."
        );

        /*
           Load music automatically.
           Remove this line if you want the
           library to start completely empty.
        */

        await loadJamendoMusic();
    }
);