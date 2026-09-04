"use strict";

/* =========================================
   TONEARM MUSIC PLAYER
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

const libraryPage = document.getElementById("libraryPage");
const onlinePage = document.getElementById("onlinePage");
const pageTitle = document.getElementById("pageTitle");

const navButtons = document.querySelectorAll(".nav-btn");

const onlineSearchInput = document.getElementById("onlineSearchInput");
const onlineSearchBtn = document.getElementById("onlineSearchBtn");
const onlineStatus = document.getElementById("onlineStatus");
const onlineResults = document.getElementById("onlineResults");

const playerArtwork = document.getElementById("playerArtwork");
const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");

const shuffleBtn = document.getElementById("shuffleBtn");
const previousBtn = document.getElementById("previousBtn");
const playBtn = document.getElementById("playBtn");
const nextBtn = document.getElementById("nextBtn");
const repeatBtn = document.getElementById("repeatBtn");

const currentTimeEl = document.getElementById("currentTime");
const totalTimeEl = document.getElementById("totalTime");
const progressBar = document.getElementById("progressBar");
const volumeControl = document.getElementById("volumeControl");

const themeBtn = document.getElementById("themeBtn");
const toast = document.getElementById("toast");


/* =========================================
   STATE
   ========================================= */

let library = [];
let currentIndex = -1;

let shuffleEnabled = false;
let repeatEnabled = false;

let currentOnlineTrack = null;

let toastTimer;


/* =========================================
   INDEXED DB
   ========================================= */

const DB_NAME = "tonearmDB";
const DB_VERSION = 1;
const STORE_NAME = "tracks";

let db = null;

function openDatabase() {
    return new Promise((resolve, reject) => {

        if (!window.indexedDB) {
            resolve(null);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function(event) {

            const database = event.target.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {

                database.createObjectStore(STORE_NAME, {
                    keyPath: "id"
                });

            }
        };

        request.onsuccess = function(event) {

            db = event.target.result;

            resolve(db);
        };

        request.onerror = function() {

            reject(request.error);
        };
    });
}


function saveTrack(track) {

    return new Promise((resolve, reject) => {

        if (!db) {
            resolve();
            return;
        }

        const transaction =
            db.transaction(STORE_NAME, "readwrite");

        const store =
            transaction.objectStore(STORE_NAME);

        store.put(track);

        transaction.oncomplete = resolve;

        transaction.onerror = function() {
            reject(transaction.error);
        };
    });
}


function getAllTracks() {

    return new Promise((resolve, reject) => {

        if (!db) {
            resolve([]);
            return;
        }

        const transaction =
            db.transaction(STORE_NAME, "readonly");

        const store =
            transaction.objectStore(STORE_NAME);

        const request = store.getAll();

        request.onsuccess = function() {
            resolve(request.result || []);
        };

        request.onerror = function() {
            reject(request.error);
        };
    });
}


function deleteTrackFromDB(id) {

    return new Promise((resolve, reject) => {

        if (!db) {
            resolve();
            return;
        }

        const transaction =
            db.transaction(STORE_NAME, "readwrite");

        const store =
            transaction.objectStore(STORE_NAME);

        store.delete(id);

        transaction.oncomplete = resolve;

        transaction.onerror = function() {
            reject(transaction.error);
        };
    });
}


/* =========================================
   INITIALIZE
   ========================================= */

async function initializeApp() {

    try {

        await openDatabase();

        const savedTracks =
            await getAllTracks();

        library = savedTracks.map(track => {

            if (track.type === "local" && track.file) {

                track.url =
                    URL.createObjectURL(track.file);
            }

            return track;
        });

    } catch (error) {

        console.error(
            "Database error:",
            error
        );

        library = [];
    }

    renderLibrary();

    audioPlayer.volume = 1;
}

initializeApp();


/* =========================================
   FILE PICKER
   ========================================= */

function openFilePicker() {
    fileInput.click();
}

browseBtn.addEventListener(
    "click",
    openFilePicker
);

addMusicBtn.addEventListener(
    "click",
    openFilePicker
);

heroAddBtn.addEventListener(
    "click",
    openFilePicker
);


fileInput.addEventListener(
    "change",
    function() {

        handleFiles(fileInput.files);

        fileInput.value = "";
    }
);


/* =========================================
   DRAG & DROP
   ========================================= */

dropZone.addEventListener(
    "dragover",
    function(event) {

        event.preventDefault();

        dropZone.classList.add("dragover");
    }
);


dropZone.addEventListener(
    "dragleave",
    function() {

        dropZone.classList.remove(
            "dragover"
        );
    }
);


dropZone.addEventListener(
    "drop",
    function(event) {

        event.preventDefault();

        dropZone.classList.remove(
            "dragover"
        );

        handleFiles(
            event.dataTransfer.files
        );
    }
);


/* =========================================
   ADD LOCAL MUSIC
   ========================================= */

async function handleFiles(files) {

    if (!files || files.length === 0) {
        return;
    }

    let added = 0;

    for (const file of files) {

        if (!file.type.startsWith("audio/")) {
            continue;
        }

        const track = {

            id: crypto.randomUUID(),

            name: file.name
                .replace(/\.[^/.]+$/, ""),

            artist: "Local File",

            album: "Your Library",

            artwork: "",

            type: "local",

            file: file,

            url: URL.createObjectURL(file)
        };

        library.push(track);

        try {
            await saveTrack(track);
        } catch (error) {
            console.error(error);
        }

        added++;
    }

    renderLibrary();

    if (added > 0) {

        showToast(
            `${added} track${added > 1 ? "s" : ""} added`
        );

    } else {

        showToast(
            "No audio files found"
        );
    }
}


/* =========================================
   LIBRARY
   ========================================= */

function renderLibrary(searchTerm = "") {

    libraryGrid.innerHTML = "";

    const term =
        searchTerm.trim().toLowerCase();

    const filteredTracks =
        library.filter(track => {

            return (

                track.name
                    .toLowerCase()
                    .includes(term)

                ||

                track.artist
                    .toLowerCase()
                    .includes(term)

                ||

                track.album
                    .toLowerCase()
                    .includes(term)
            );
        });


    trackCount.textContent =
        `${library.length} track${library.length === 1 ? "" : "s"}`;


    if (library.length === 0) {

        emptyState.style.display =
            "block";

        return;
    }


    if (filteredTracks.length === 0) {

        emptyState.style.display =
            "block";

        emptyState.querySelector("h3")
            .textContent =
            "No tracks found";

        emptyState.querySelector("p")
            .textContent =
            "Try another search.";

        return;
    }


    emptyState.style.display =
        "none";


    filteredTracks.forEach(track => {

        libraryGrid.appendChild(
            createTrackCard(track, true)
        );
    });
}


/* =========================================
   TRACK CARD
   ========================================= */

function createTrackCard(track, isLocal) {

    const card =
        document.createElement("article");

    card.className =
        "track-card";


    const image =
        document.createElement("div");

    image.className =
        "track-image";


    if (track.artwork) {

        const img =
            document.createElement("img");

        img.src =
            track.artwork;

        img.alt =
            track.name;

        img.onerror =
            function() {

                img.remove();

                const placeholder =
                    document.createElement("div");

                placeholder.className =
                    "track-placeholder";

                placeholder.textContent =
                    "♫";

                image.prepend(
                    placeholder
                );
            };

        image.appendChild(img);

    } else {

        const placeholder =
            document.createElement("div");

        placeholder.className =
            "track-placeholder";

        placeholder.textContent =
            "♫";

        image.appendChild(
            placeholder
        );
    }


    const playButton =
        document.createElement("button");

    playButton.className =
        "track-play";

    playButton.textContent =
        "▶";


    playButton.addEventListener(
        "click",
        function() {

            if (track.type === "online") {

                playOnlinePreview(track);

            } else {

                playTrack(track);
            }
        }
    );


    image.appendChild(
        playButton
    );


    const content =
        document.createElement("div");

    content.className =
        "track-content";


    const name =
        document.createElement("div");

    name.className =
        "track-name";

    name.textContent =
        track.name;


    const artist =
        document.createElement("div");

    artist.className =
        "track-artist";

    artist.textContent =
        track.artist;


    const actions =
        document.createElement("div");

    actions.className =
        "track-actions";


    const playSmall =
        document.createElement("button");

    playSmall.className =
        "small-btn";

    playSmall.textContent =
        "Play";


    playSmall.addEventListener(
        "click",
        function() {

            if (track.type === "online") {

                playOnlinePreview(track);

            } else {

                playTrack(track);
            }
        }
    );


    actions.appendChild(
        playSmall
    );


    if (isLocal) {

        const deleteButton =
            document.createElement("button");

        deleteButton.className =
            "small-btn delete-btn";

        deleteButton.textContent =
            "Delete";


        deleteButton.addEventListener(
            "click",
            function() {

                deleteLocalTrack(
                    track.id
                );
            }
        );


        actions.appendChild(
            deleteButton
        );

    } else {

        const addButton =
            document.createElement("button");

        addButton.className =
            "small-btn";

        addButton.textContent =
            "Add";


        addButton.addEventListener(
            "click",
            function() {

                addOnlineTrack(track);
            }
        );


        actions.appendChild(
            addButton
        );
    }


    content.appendChild(name);
    content.appendChild(artist);
    content.appendChild(actions);

    card.appendChild(image);
    card.appendChild(content);

    return card;
}


/* =========================================
   DELETE
   ========================================= */

async function deleteLocalTrack(id) {

    const index =
        library.findIndex(
            track => track.id === id
        );

    if (index === -1) {
        return;
    }


    const track =
        library[index];


    if (track.url) {

        URL.revokeObjectURL(
            track.url
        );
    }


    await deleteTrackFromDB(id);


    if (currentIndex === index) {

        stopAudio();
    }


    library.splice(index, 1);


    if (currentIndex > index) {
        currentIndex--;
    }


    renderLibrary();

    showToast(
        "Track removed"
    );
}


/* =========================================
   PLAY LOCAL TRACK
   ========================================= */

function playTrack(track) {

    if (!track || !track.url) {

        showToast(
            "This track cannot be played"
        );

        return;
    }


    const index =
        library.findIndex(
            item => item.id === track.id
        );


    if (index !== -1) {

        currentIndex =
            index;
    }


    currentOnlineTrack =
        null;


    audioPlayer.src =
        track.url;


    playerTitle.textContent =
        track.name;


    playerArtist.textContent =
        track.artist;


    setPlayerArtwork(
        track.artwork
    );


    audioPlayer.play()
        .catch(function() {

            showToast(
                "Unable to play this track"
            );
        });


    updatePlayButton();
}


/* =========================================
   ONLINE PREVIEW
   ========================================= */

function playOnlinePreview(track) {

    if (!track.previewUrl) {

        showToast(
            "No preview available"
        );

        return;
    }


    currentOnlineTrack =
        track;

    currentIndex =
        -1;


    audioPlayer.src =
        track.previewUrl;


    playerTitle.textContent =
        track.name;


    playerArtist.textContent =
        `${track.artist} • Preview`;


    setPlayerArtwork(
        track.artwork
    );


    audioPlayer.play()
        .catch(function() {

            showToast(
                "Unable to play preview"
            );
        });


    updatePlayButton();
}


/* =========================================
   STOP
   ========================================= */

function stopAudio() {

    audioPlayer.pause();

    audioPlayer.currentTime = 0;

    audioPlayer.removeAttribute(
        "src"
    );

    audioPlayer.load();


    currentIndex = -1;

    currentOnlineTrack = null;


    playerTitle.textContent =
        "Nothing playing";

    playerArtist.textContent =
        "Choose a track";


    setPlayerArtwork("");

    updatePlayButton();
}


/* =========================================
   PLAYER BUTTON
   ========================================= */

function updatePlayButton() {

    playBtn.textContent =
        audioPlayer.paused
            ? "▶"
            : "Ⅱ";
}


/* =========================================
   PLAY / PAUSE
   ========================================= */

playBtn.addEventListener(
    "click",
    function() {

        if (!audioPlayer.src) {

            showToast(
                "Choose a track first"
            );

            return;
        }


        if (audioPlayer.paused) {

            audioPlayer.play()
                .catch(() => {});

        } else {

            audioPlayer.pause();
        }


        updatePlayButton();
    }
);


/* =========================================
   PREVIOUS
   ========================================= */

previousBtn.addEventListener(
    "click",
    function() {

        if (library.length === 0) {

            showToast(
                "Your library is empty"
            );

            return;
        }


        let previousIndex;


        if (shuffleEnabled) {

            previousIndex =
                Math.floor(
                    Math.random() *
                    library.length
                );

        } else {

            if (currentIndex === -1) {

                previousIndex =
                    library.length - 1;

            } else {

                previousIndex =
                    (
                        currentIndex -
                        1 +
                        library.length
                    ) %
                    library.length;
            }
        }


        playTrack(
            library[previousIndex]
        );
    }
);


/* =========================================
   NEXT
   ========================================= */

nextBtn.addEventListener(
    "click",
    function() {

        if (library.length === 0) {

            showToast(
                "Your library is empty"
            );

            return;
        }


        let nextIndex;


        if (shuffleEnabled) {

            nextIndex =
                Math.floor(
                    Math.random() *
                    library.length
                );

        } else {

            if (currentIndex === -1) {

                nextIndex = 0;

            } else {

                nextIndex =
                    (
                        currentIndex +
                        1
                    ) %
                    library.length;
            }
        }


        playTrack(
            library[nextIndex]
        );
    }
);


/* =========================================
   SHUFFLE
   ========================================= */

shuffleBtn.addEventListener(
    "click",
    function() {

        shuffleEnabled =
            !shuffleEnabled;


        shuffleBtn.classList.toggle(
            "active",
            shuffleEnabled
        );


        showToast(
            shuffleEnabled
                ? "Shuffle enabled"
                : "Shuffle disabled"
        );
    }
);


/* =========================================
   REPEAT
   ========================================= */

repeatBtn.addEventListener(
    "click",
    function() {

        repeatEnabled =
            !repeatEnabled;


        repeatBtn.classList.toggle(
            "active",
            repeatEnabled
        );


        showToast(
            repeatEnabled
                ? "Repeat enabled"
                : "Repeat disabled"
        );
    }
);


/* =========================================
   AUDIO EVENTS
   ========================================= */

audioPlayer.addEventListener(
    "play",
    updatePlayButton
);


audioPlayer.addEventListener(
    "pause",
    updatePlayButton
);


audioPlayer.addEventListener(
    "loadedmetadata",
    function() {

        if (!isNaN(audioPlayer.duration)) {

            totalTimeEl.textContent =
                formatTime(
                    audioPlayer.duration
                );

            progressBar.max =
                audioPlayer.duration;
        }
    }
);


audioPlayer.addEventListener(
    "timeupdate",
    function() {

        if (!isNaN(audioPlayer.duration)) {

            progressBar.value =
                audioPlayer.currentTime;
        }


        currentTimeEl.textContent =
            formatTime(
                audioPlayer.currentTime
            );
    }
);


audioPlayer.addEventListener(
    "ended",
    function() {

        if (repeatEnabled) {

            audioPlayer.currentTime =
                0;

            audioPlayer.play()
                .catch(() => {});

            return;
        }


        if (currentOnlineTrack) {

            updatePlayButton();

            return;
        }


        if (library.length > 0) {

            let nextIndex;


            if (shuffleEnabled) {

                nextIndex =
                    Math.floor(
                        Math.random() *
                        library.length
                    );

            } else {

                nextIndex =
                    (
                        currentIndex +
                        1
                    ) %
                    library.length;
            }


            playTrack(
                library[nextIndex]
            );
        }
    }
);


/* =========================================
   PROGRESS
   ========================================= */

progressBar.addEventListener(
    "input",
    function() {

        audioPlayer.currentTime =
            Number(
                progressBar.value
            );
    }
);


/* =========================================
   VOLUME
   ========================================= */

volumeControl.addEventListener(
    "input",
    function() {

        audioPlayer.volume =
            Number(
                volumeControl.value
            );
    }
);


/* =========================================
   FORMAT TIME
   ========================================= */

function formatTime(seconds) {

    if (!seconds || isNaN(seconds)) {
        return "0:00";
    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    const remainingSeconds =
        Math.floor(
            seconds % 60
        )
        .toString()
        .padStart(2, "0");


    return `${minutes}:${remainingSeconds}`;
}


/* =========================================
   ARTWORK
   ========================================= */

function setPlayerArtwork(url) {

    playerArtwork.innerHTML = "";


    if (!url) {

        playerArtwork.textContent =
            "♫";

        return;
    }


    const img =
        document.createElement("img");


    img.src =
        url;


    img.alt =
        "Album artwork";


    img.onerror =
        function() {

            playerArtwork.innerHTML =
                "♫";
        };


    playerArtwork.appendChild(
        img
    );
}


/* =========================================
   LIBRARY SEARCH
   ========================================= */

librarySearch.addEventListener(
    "input",
    function() {

        renderLibrary(
            librarySearch.value
        );
    }
);


/* =========================================
   NAVIGATION
   ========================================= */

navButtons.forEach(button => {

    button.addEventListener(
        "click",
        function() {

            const page =
                button.dataset.page;


            navButtons.forEach(btn => {

                btn.classList.remove(
                    "active"
                );
            });


            button.classList.add(
                "active"
            );


            if (page === "library") {

                libraryPage.classList.add(
                    "active-page"
                );

                onlinePage.classList.remove(
                    "active-page"
                );

                pageTitle.textContent =
                    "Your Library";

                librarySearch.style.display =
                    "block";
            }


            if (page === "online") {

                libraryPage.classList.remove(
                    "active-page"
                );

                onlinePage.classList.add(
                    "active-page"
                );

                pageTitle.textContent =
                    "Online Search";

                librarySearch.style.display =
                    "none";
            }
        }
    );
});


/* =========================================
   ONLINE MUSIC SEARCH
   iTunes Search API
   JSONP FALLBACK
   ========================================= */

onlineSearchBtn.addEventListener(
    "click",
    searchOnlineMusic
);


onlineSearchInput.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {

            searchOnlineMusic();
        }
    }
);


/* =========================================
   SEARCH
   ========================================= */

async function searchOnlineMusic() {

    const term =
        onlineSearchInput.value.trim();


    if (!term) {

        showToast(
            "Enter a song or artist"
        );

        return;
    }


    onlineStatus.textContent =
        "Searching...";


    onlineResults.innerHTML =
        "";


    try {

        const data =
            await searchWithFetch(term);


        displayOnlineResults(
            data
        );

    } catch (error) {

        console.warn(
            "Fetch failed. Trying JSONP...",
            error
        );


        try {

            const data =
                await searchWithJSONP(term);


            displayOnlineResults(
                data
            );

        } catch (jsonpError) {

            console.error(
                jsonpError
            );


            onlineStatus.textContent =
                "Search failed. Check your internet connection.";


            onlineResults.innerHTML = `
                <div class="empty-state">
                    <div>⚠</div>
                    <h3>Search unavailable</h3>
                    <p>
                        Make sure you are connected to the internet
                        and running the page through Live Server.
                    </p>
                </div>
            `;
        }
    }
}


/* =========================================
   NORMAL FETCH
   ========================================= */

async function searchWithFetch(term) {

    const url =
        "https://itunes.apple.com/search" +
        "?term=" +
        encodeURIComponent(term) +
        "&country=NG" +
        "&media=music" +
        "&entity=song" +
        "&limit=30";


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            "iTunes request failed"
        );
    }


    return await response.json();
}


/* =========================================
   JSONP FALLBACK
   ========================================= */

function searchWithJSONP(term) {

    return new Promise(
        function(resolve, reject) {

            const callbackName =
                "tonearmCallback_" +
                Date.now();


            const script =
                document.createElement("script");


            const timeout =
                setTimeout(
                    function() {

                        cleanup();

                        reject(
                            new Error(
                                "JSONP timeout"
                            )
                        );

                    },
                    10000
                );


            function cleanup() {

                clearTimeout(
                    timeout
                );

                delete window[
                    callbackName
                ];

                if (script.parentNode) {

                    script.parentNode.removeChild(
                        script
                    );
                }
            }


            window[callbackName] =
                function(data) {

                    cleanup();

                    resolve(data);
                };


            script.onerror =
                function() {

                    cleanup();

                    reject(
                        new Error(
                            "JSONP request failed"
                        )
                    );
                };


            script.src =
                "https://itunes.apple.com/search" +
                "?term=" +
                encodeURIComponent(term) +
                "&country=NG" +
                "&media=music" +
                "&entity=song" +
                "&limit=30" +
                "&callback=" +
                callbackName;


            document.body.appendChild(
                script
            );
        }
    );
}


/* =========================================
   DISPLAY ONLINE RESULTS
   ========================================= */

function displayOnlineResults(data) {

    const results =
        data.results || [];


    const tracks =
        results
            .filter(track => {

                return (
                    track.kind === "song" &&
                    track.trackName
                );
            })
            .map(track => {

                return {

                    id:
                        `online-${track.trackId}`,

                    name:
                        track.trackName,

                    artist:
                        track.artistName ||
                        "Unknown Artist",

                    album:
                        track.collectionName ||
                        "Unknown Album",

                    artwork:
                        track.artworkUrl100
                            ? track.artworkUrl100.replace(
                                "100x100",
                                "600x600"
                              )
                            : "",

                    previewUrl:
                        track.previewUrl
                            ? track.previewUrl.replace(
                                "http://",
                                "https://"
                              )
                            : "",

                    trackUrl:
                        track.trackViewUrl ||
                        "",

                    type:
                        "online"
                };
            });


    onlineResults.innerHTML =
        "";


    if (tracks.length === 0) {

        onlineStatus.textContent =
            "No songs found.";


        onlineResults.innerHTML = `
            <div class="empty-state">
                <div>⌕</div>
                <h3>No results found</h3>
                <p>
                    Try searching for another song or artist.
                </p>
            </div>
        `;

        return;
    }


    onlineStatus.textContent =
        `${tracks.length} result${tracks.length === 1 ? "" : "s"} found`;


    tracks.forEach(track => {

        const card =
            createOnlineCard(track);


        onlineResults.appendChild(
            card
        );
    });
}


/* =========================================
   ONLINE CARD
   ========================================= */

function createOnlineCard(track) {

    const card =
        document.createElement("article");

    card.className =
        "track-card";


    const image =
        document.createElement("div");

    image.className =
        "track-image";


    if (track.artwork) {

        const img =
            document.createElement("img");

        img.src =
            track.artwork;

        img.alt =
            track.name;

        image.appendChild(
            img
        );

    } else {

        const placeholder =
            document.createElement("div");

        placeholder.className =
            "track-placeholder";

        placeholder.textContent =
            "♫";

        image.appendChild(
            placeholder
        );
    }


    const playButton =
        document.createElement("button");

    playButton.className =
        "track-play";

    playButton.textContent =
        "▶";


    playButton.addEventListener(
        "click",
        function() {

            playOnlinePreview(
                track
            );
        }
    );


    image.appendChild(
        playButton
    );


    const content =
        document.createElement("div");

    content.className =
        "track-content";


    const name =
        document.createElement("div");

    name.className =
        "track-name";

    name.textContent =
        track.name;


    const artist =
        document.createElement("div");

    artist.className =
        "track-artist";

    artist.textContent =
        track.artist;


    const actions =
        document.createElement("div");

    actions.className =
        "track-actions";


    const playSmall =
        document.createElement("button");

    playSmall.className =
        "small-btn";

    playSmall.textContent =
        track.previewUrl
            ? "Play Preview"
            : "No Preview";


    playSmall.disabled =
        !track.previewUrl;


    playSmall.addEventListener(
        "click",
        function() {

            playOnlinePreview(
                track
            );
        }
    );


    const addButton =
        document.createElement("button");

    addButton.className =
        "small-btn";

    addButton.textContent =
        "Add";


    addButton.addEventListener(
        "click",
        function() {

            addOnlineTrack(
                track
            );
        }
    );


    actions.appendChild(
        playSmall
    );

    actions.appendChild(
        addButton
    );


    content.appendChild(
        name
    );

    content.appendChild(
        artist
    );

    content.appendChild(
        actions
    );


    card.appendChild(
        image
    );

    card.appendChild(
        content
    );


    return card;
}


/* =========================================
   ADD ONLINE TRACK
   ========================================= */

async function addOnlineTrack(track) {

    const exists =
        library.some(
            item => item.id === track.id
        );


    if (exists) {

        showToast(
            "Already in your library"
        );

        return;
    }


    const savedTrack = {

        id:
            track.id,

        name:
            track.name,

        artist:
            track.artist,

        album:
            track.album,

        artwork:
            track.artwork,

        previewUrl:
            track.previewUrl,

        url:
            track.previewUrl,

        type:
            "online"
    };


    library.push(
        savedTrack
    );


    try {

        await saveTrack(
            savedTrack
        );

    } catch (error) {

        console.error(error);
    }


    renderLibrary();


    showToast(
        "Added to your library"
    );
}


/* =========================================
   THEME
   ========================================= */

themeBtn.addEventListener(
    "click",
    function() {

        document.body.classList.toggle(
            "light"
        );


        const isLight =
            document.body.classList.contains(
                "light"
            );


        themeBtn.textContent =
            isLight
                ? "☀"
                : "☾";


        localStorage.setItem(
            "tonearmTheme",
            isLight
                ? "light"
                : "dark"
        );
    }
);


const savedTheme =
    localStorage.getItem(
        "tonearmTheme"
    );


if (savedTheme === "light") {

    document.body.classList.add(
        "light"
    );

    themeBtn.textContent =
        "☀";
}


/* =========================================
   TOAST
   ========================================= */

function showToast(message) {

    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            function() {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );
}


/* =========================================
   KEYBOARD
   ========================================= */

document.addEventListener(
    "keydown",
    function(event) {

        const activeTag =
            document.activeElement.tagName
                .toLowerCase();


        if (
            activeTag === "input" ||
            activeTag === "textarea"
        ) {
            return;
        }


        if (event.code === "Space") {

            event.preventDefault();

            playBtn.click();
        }


        if (
            event.code === "ArrowRight" &&
            audioPlayer.src
        ) {

            audioPlayer.currentTime =
                Math.min(
                    audioPlayer.currentTime + 5,
                    audioPlayer.duration || Infinity
                );
        }


        if (
            event.code === "ArrowLeft" &&
            audioPlayer.src
        ) {

            audioPlayer.currentTime =
                Math.max(
                    audioPlayer.currentTime - 5,
                    0
                );
        }
    }
);