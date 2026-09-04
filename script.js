/* =========================================================
   TONEARM MUSIC PLAYER
   JAMENDO DEVELOPER API INTEGRATION
   ========================================================= */


/* =========================================================
   JAMENDO CONFIG
   ========================================================= */

const JAMENDO_CLIENT_ID = "709fa152";
const JAMENDO_API = "https://api.jamendo.com/v3.0";


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const audioPlayer = document.getElementById("audioPlayer");

const libraryPage = document.getElementById("libraryPage");
const onlinePage = document.getElementById("onlinePage");

const pageTitle = document.getElementById("pageTitle");

const libraryTracks = document.getElementById("libraryTracks");
const onlineResults = document.getElementById("onlineResults");

const onlineSearchInput =
    document.getElementById("onlineSearchInput");

const onlineSearchBtn =
    document.getElementById("onlineSearchBtn");

const onlineStatus =
    document.getElementById("onlineStatus");

const playBtn =
    document.getElementById("playBtn");

const previousBtn =
    document.getElementById("previousBtn");

const nextBtn =
    document.getElementById("nextBtn");

const shuffleBtn =
    document.getElementById("shuffleBtn");

const repeatBtn =
    document.getElementById("repeatBtn");

const progressBar =
    document.getElementById("progressBar");

const volumeControl =
    document.getElementById("volumeControl");

const playerTitle =
    document.getElementById("playerTitle");

const playerArtist =
    document.getElementById("playerArtist");

const playerArtwork =
    document.getElementById("playerArtwork");

const currentTime =
    document.getElementById("currentTime");

const totalTime =
    document.getElementById("totalTime");

const toast =
    document.getElementById("toast");

const navButtons =
    document.querySelectorAll(".nav-btn");


/* =========================================================
   STATE
   ========================================================= */

let onlineSongs = [];

let currentSongIndex = -1;

let isPlaying = false;
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
   PAGE NAVIGATION
   ========================================================= */

navButtons.forEach(button => {

    button.addEventListener("click", async () => {

        const page = button.dataset.page;

        navButtons.forEach(btn => {
            btn.classList.remove("active");
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


            /*
             * Automatically load music when
             * Online Music is opened.
             */

            if (onlineSongs.length === 0) {

                await loadOnlineMusic();

            }

        }

    });

});


/* =========================================================
   JAMENDO API SEARCH
   ========================================================= */

async function searchJamendo(query = "") {

    try {

        const params = new URLSearchParams();

        params.set(
            "client_id",
            JAMENDO_CLIENT_ID
        );

        params.set(
            "format",
            "json"
        );

        params.set(
            "limit",
            "30"
        );

        params.set(
            "audioformat",
            "mp32"
        );

        params.set(
            "audiodlformat",
            "mp32"
        );

        params.set(
            "imagesize",
            "500"
        );


        /*
         * Use Jamendo's general search.
         * This searches song, artist, album
         * and tags.
         */

        if (query.trim()) {

            params.set(
                "search",
                query.trim()
            );

        }


        const url =
            `${JAMENDO_API}/tracks/?${params.toString()}`;


        console.log(
            "Jamendo API:",
            url
        );


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                `API Error: ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Jamendo response:",
            data
        );


        if (
            data.headers &&
            data.headers.status !== "success"
        ) {

            throw new Error(
                data.headers.error_message ||
                "Jamendo request failed"
            );

        }


        return data.results || [];


    } catch (error) {

        console.error(
            "Jamendo Error:",
            error
        );


        onlineStatus.textContent =
            "Unable to load music. Check your internet connection.";


        showToast(
            "Could not connect to Jamendo."
        );


        return [];

    }

}


/* =========================================================
   FORMAT JAMENDO SONG
   ========================================================= */

function formatSong(track) {

    return {

        id: track.id,

        title:
            track.name ||
            "Unknown Song",

        artist:
            track.artist_name ||
            "Unknown Artist",

        album:
            track.album_name ||
            "Single",

        artwork:
            track.image ||
            track.album_image ||
            "",

        duration:
            Number(track.duration) || 0,

        /*
         * THIS IS THE FULL JAMENDO
         * STREAM URL.
         */

        audio:
            track.audio || "",

        /*
         * DOWNLOAD URL
         */

        downloadUrl:
            track.audiodownload || "",

        /*
         * Jamendo tells us whether
         * downloading is allowed.
         */

        downloadAllowed:
            track.audiodownload_allowed === true

    };

}


/* =========================================================
   LOAD ONLINE MUSIC
   ========================================================= */

async function loadOnlineMusic(query = "") {

    onlineStatus.textContent =
        "Loading music...";


    onlineResults.innerHTML = "";


    const results =
        await searchJamendo(query);


    onlineSongs =
        results.map(formatSong);


    if (onlineSongs.length === 0) {

        onlineStatus.textContent =
            "No music found.";

        return;

    }


    onlineStatus.textContent =
        `${onlineSongs.length} tracks found`;


    renderOnlineSongs();

}


/* =========================================================
   RENDER ONLINE SONGS
   ========================================================= */

function renderOnlineSongs() {

    onlineResults.innerHTML = "";


    onlineSongs.forEach((song, index) => {

        const card =
            document.createElement("article");


        card.className =
            "track-card";


        card.innerHTML = `

            <div class="track-artwork">

                ${
                    song.artwork
                    ?
                    `<img
                        src="${escapeHTML(song.artwork)}"
                        alt="${escapeHTML(song.title)}"
                    >`
                    :
                    `<span>♫</span>`
                }

                <button
                    class="track-play"
                    data-index="${index}"
                    title="Play"
                >
                    ▶
                </button>

            </div>


            <div class="track-details">

                <h3>
                    ${escapeHTML(song.title)}
                </h3>

                <p>
                    ${escapeHTML(song.artist)}
                </p>

                <small>
                    ${escapeHTML(song.album)}
                </small>

            </div>


            <div class="track-actions">

                <button
                    class="play-online-btn"
                    data-index="${index}"
                    title="Play"
                >
                    ▶
                </button>

                <button
                    class="download-online-btn"
                    data-index="${index}"
                    title="Download"
                    ${
                        song.downloadAllowed
                        ? ""
                        : "disabled"
                    }
                >
                    ↓
                </button>

            </div>

        `;


        onlineResults.appendChild(card);

    });


    /*
     * PLAY BUTTONS
     */

    onlineResults
        .querySelectorAll(".track-play")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    playSong(
                        Number(button.dataset.index)
                    );

                }
            );

        });


    onlineResults
        .querySelectorAll(".play-online-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    playSong(
                        Number(button.dataset.index)
                    );

                }
            );

        });


    /*
     * DOWNLOAD BUTTONS
     */

    onlineResults
        .querySelectorAll(
            ".download-online-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    downloadSong(
                        Number(button.dataset.index)
                    );

                }
            );

        });

}


/* =========================================================
   SEARCH BUTTON
   ========================================================= */

onlineSearchBtn.addEventListener(
    "click",
    async () => {

        const query =
            onlineSearchInput.value.trim();


        await loadOnlineMusic(query);

    }
);


/* =========================================================
   SEARCH WITH ENTER
   ========================================================= */

onlineSearchInput.addEventListener(
    "keydown",
    async event => {

        if (event.key === "Enter") {

            event.preventDefault();

            const query =
                onlineSearchInput.value.trim();


            await loadOnlineMusic(query);

        }

    }
);


/* =========================================================
   PLAY SONG
   ========================================================= */

function playSong(index) {

    if (!onlineSongs[index]) return;


    const song =
        onlineSongs[index];


    if (!song.audio) {

        showToast(
            "This track cannot be streamed."
        );

        return;

    }


    currentSongIndex =
        index;


    /*
     * USE JAMENDO FULL STREAM
     */

    audioPlayer.src =
        song.audio;


    audioPlayer.load();


    audioPlayer.play()
        .then(() => {

            isPlaying = true;

            updatePlayer(song);

            updatePlayButton();

        })
        .catch(error => {

            console.error(
                "Playback error:",
                error
            );

            showToast(
                "Unable to play this song."
            );

        });

}


/* =========================================================
   UPDATE PLAYER
   ========================================================= */

function updatePlayer(song) {

    playerTitle.textContent =
        song.title;


    playerArtist.textContent =
        song.artist;


    if (song.artwork) {

        playerArtwork.innerHTML = `

            <img
                src="${escapeHTML(song.artwork)}"
                alt="${escapeHTML(song.title)}"
            >

        `;

    } else {

        playerArtwork.innerHTML =
            "<span>♫</span>";

    }

}


/* =========================================================
   PLAY / PAUSE
   ========================================================= */

playBtn.addEventListener(
    "click",
    () => {

        if (!audioPlayer.src) {

            if (onlineSongs.length > 0) {

                playSong(0);

            }

            return;

        }


        if (audioPlayer.paused) {

            audioPlayer.play();

        } else {

            audioPlayer.pause();

        }

    }
);


/* =========================================================
   AUDIO PLAY
   ========================================================= */

audioPlayer.addEventListener(
    "play",
    () => {

        isPlaying = true;

        updatePlayButton();

    }
);


/* =========================================================
   AUDIO PAUSE
   ========================================================= */

audioPlayer.addEventListener(
    "pause",
    () => {

        isPlaying = false;

        updatePlayButton();

    }
);


/* =========================================================
   UPDATE PLAY BUTTON
   ========================================================= */

function updatePlayButton() {

    playBtn.textContent =
        isPlaying
        ? "⏸️"
        : "▶️";

}


/* =========================================================
   NEXT SONG
   ========================================================= */

nextBtn.addEventListener(
    "click",
    () => {

        if (onlineSongs.length === 0)
            return;


        let nextIndex;


        if (isShuffle) {

            nextIndex =
                Math.floor(
                    Math.random() *
                    onlineSongs.length
                );

        } else {

            nextIndex =
                currentSongIndex + 1;


            if (
                nextIndex >=
                onlineSongs.length
            ) {

                nextIndex = 0;

            }

        }


        playSong(nextIndex);

    }
);


/* =========================================================
   PREVIOUS SONG
   ========================================================= */

previousBtn.addEventListener(
    "click",
    () => {

        if (onlineSongs.length === 0)
            return;


        let previousIndex =
            currentSongIndex - 1;


        if (previousIndex < 0) {

            previousIndex =
                onlineSongs.length - 1;

        }


        playSong(previousIndex);

    }
);


/* =========================================================
   SHUFFLE
   ========================================================= */

shuffleBtn.addEventListener(
    "click",
    () => {

        isShuffle =
            !isShuffle;


        shuffleBtn.classList.toggle(
            "active",
            isShuffle
        );


        showToast(
            isShuffle
            ? "Shuffle enabled"
            : "Shuffle disabled"
        );

    }
);


/* =========================================================
   REPEAT
   ========================================================= */

repeatBtn.addEventListener(
    "click",
    () => {

        isRepeat =
            !isRepeat;


        repeatBtn.classList.toggle(
            "active",
            isRepeat
        );


        showToast(
            isRepeat
            ? "Repeat enabled"
            : "Repeat disabled"
        );

    }
);


/* =========================================================
   WHEN SONG ENDS
   ========================================================= */

audioPlayer.addEventListener(
    "ended",
    () => {

        if (isRepeat) {

            audioPlayer.currentTime = 0;

            audioPlayer.play();

            return;

        }


        if (onlineSongs.length > 0) {

            let nextIndex =
                currentSongIndex + 1;


            if (
                nextIndex >=
                onlineSongs.length
            ) {

                nextIndex = 0;

            }


            playSong(nextIndex);

        }

    }
);


/* =========================================================
   PROGRESS BAR
   ========================================================= */

audioPlayer.addEventListener(
    "timeupdate",
    () => {

        if (!audioPlayer.duration)
            return;


        const percentage =
            (
                audioPlayer.currentTime /
                audioPlayer.duration
            ) * 100;


        progressBar.value =
            percentage;


        currentTime.textContent =
            formatTime(
                audioPlayer.currentTime
            );

    }
);


/* =========================================================
   AUDIO METADATA
   ========================================================= */

audioPlayer.addEventListener(
    "loadedmetadata",
    () => {

        totalTime.textContent =
            formatTime(
                audioPlayer.duration
            );

    }
);


/* =========================================================
   SEEK
   ========================================================= */

progressBar.addEventListener(
    "input",
    () => {

        if (!audioPlayer.duration)
            return;


        audioPlayer.currentTime =
            (
                Number(progressBar.value) /
                100
            ) *
            audioPlayer.duration;

    }
);


/* =========================================================
   VOLUME
   ========================================================= */

volumeControl.addEventListener(
    "input",
    () => {

        audioPlayer.volume =
            Number(volumeControl.value);

    }
);


/* =========================================================
   DOWNLOAD
   ========================================================= */

async function downloadSong(index) {

    const song =
        onlineSongs[index];


    if (!song) return;


    if (
        !song.downloadAllowed ||
        !song.downloadUrl
    ) {

        showToast(
            "Download isn't available for this track."
        );

        return;

    }


    try {

        const response =
            await fetch(
                song.downloadUrl
            );


        if (!response.ok) {

            throw new Error(
                "Download failed"
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


        showToast(
            "Download started."
        );


    } catch (error) {

        console.error(
            "Download error:",
            error
        );


        /*
         * Direct fallback
         */

        window.open(
            song.downloadUrl,
            "_blank"
        );

    }

}


/* =========================================================
   TIME FORMAT
   ========================================================= */

function formatTime(seconds) {

    if (
        !seconds ||
        isNaN(seconds)
    ) {

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
   LIBRARY PLACEHOLDER
   ========================================================= */

function showLibrary() {

    /*
     * Your existing local-library functionality
     * can remain here.
     */

    console.log(
        "Library opened."
    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

audioPlayer.volume = 1;

progressBar.value = 0;


/*
 * Make sure the Library page
 * is displayed when the app starts.
 */

libraryPage.hidden = false;
onlinePage.hidden = true;


console.log(
    "TONEARM initialized successfully."
);