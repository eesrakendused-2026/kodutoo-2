console.log("Fail õigesti ühendatud");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
    getDatabase,
    ref,
    push,
    query,
    orderByChild,
    limitToFirst,
    onValue
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDWXAPrznsvPC0ns8jitpfKxFxIQd6pcd8",
    authDomain: "typer-eb879.firebaseapp.com",
    databaseURL: "https://typer-eb879-default-rtdb.firebaseio.com",
    projectId: "typer-eb879",
    storageBucket: "typer-eb879.firebasestorage.app",
    messagingSenderId: "728797172107",
    appId: "1:728797172107:web:3b6246b6f823a804179f8e",
    measurementId: "G-QHD5FZQ0C1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

class Typer {
    constructor() {
        this.user = null;
        this.name = "";

        this.wordsInGame = 1;
        this.startingWordLength = 2;

        this.startTime = 0;
        this.endTime = 0;

        this.word = "";
        this.words = [];
        this.typeWords = [];
        this.wordsTyped = 0;
        this.score = 0;

        this.results = [];
        this.keyListener = null;
        this.resultsStarted = false;

        // HELID
        // Failid peavad olema samas kaustas kus index.html.
        this.backgroundMusic = new Audio("./taustamuusika.mp3");
        this.countdownMusic = new Audio("./countdown.mp3");
        this.gameMusic = new Audio("./game.mp3");
        this.successSound = new Audio("./correct.mp3");

        this.backgroundMusic.loop = true;
        this.countdownMusic.loop = true;
        this.gameMusic.loop = true;
        this.successSound.loop = false;

        this.backgroundMusic.volume = 0.25;
        this.countdownMusic.volume = 0.35;
        this.gameMusic.volume = 0.25;
        this.successSound.volume = 0.8;

        this.backgroundMusic.preload = "auto";
        this.countdownMusic.preload = "auto";
        this.gameMusic.preload = "auto";
        this.successSound.preload = "auto";

        this.cacheElements();
        this.addButtonListeners();
        this.watchAuth();
        this.loadWordsFromFile();
    }

    cacheElements() {
        this.loginDiv = document.getElementById("login");
        this.userInfoDiv = document.getElementById("userInfo");
        this.welcomeText = document.getElementById("welcomeText");

        this.loginButton = document.getElementById("googleLogin");
        this.logoutButton = document.getElementById("logout");
        this.startButton = document.getElementById("startGame");
        this.playAgainButton = document.getElementById("playAgain");
        this.switchUserButton = document.getElementById("switchUser");

        this.counterDiv = document.getElementById("counter");
        this.timeDiv = document.getElementById("time");
        this.infoDiv = document.getElementById("info");
        this.wordCountDiv = document.getElementById("wordcount");
        this.wordContainer = document.getElementById("wordContainer");
        this.wordDiv = document.getElementById("word");
        this.endGameDiv = document.getElementById("endGame");

        this.resultsDiv = document.getElementById("results");
        this.resultImageContainer = document.getElementById("resultImageContainer");
        this.resultMessageDiv = document.getElementById("resultMessage");
    }

    addButtonListeners() {
        this.loginButton.addEventListener("click", () => this.login());
        this.logoutButton.addEventListener("click", () => this.logout());
        this.startButton.addEventListener("click", () => this.startCountdown());
        this.playAgainButton.addEventListener("click", () => this.restartGame());
        this.switchUserButton.addEventListener("click", () => this.logout());

        const modal = document.getElementById("myModal");
        const modalButton = document.getElementById("myBtn");
        const closeButton = document.querySelector(".close");

        modalButton.addEventListener("click", () => {
            modal.style.display = "block";
        });

        closeButton.addEventListener("click", () => {
            modal.style.display = "none";
        });

        window.addEventListener("click", (event) => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        });
    }

    playAudio(audio) {
        if (!audio) {
            return;
        }

        audio.pause();
        audio.currentTime = 0;

        audio.play()
            .then(() => {
                console.log("Heli mängib:", audio.src);
            })
            .catch((error) => {
                console.log("Heli ei saanud mängima panna:", audio.src, error);
            });
    }

    stopAudio(audio) {
        if (!audio) {
            return;
        }

        audio.pause();
        audio.currentTime = 0;
    }

    stopAllMusic() {
        this.stopAudio(this.backgroundMusic);
        this.stopAudio(this.countdownMusic);
        this.stopAudio(this.gameMusic);
    }

    showInstructions() {
        let instructions = document.getElementById("instructions");

        if (!instructions) {
            instructions = document.createElement("p");
            instructions.id = "instructions";
            instructions.textContent = "Kirjuta ekraanil olev sõna võimalikult kiiresti. Vale täht muudab sõna korraks punaseks.";
            this.userInfoDiv.appendChild(instructions);
        }
    }

    async login() {
        try {
            // See on otse kasutaja klikist, seega brauser lubab heli kõige tõenäolisemalt siin.
            this.stopAllMusic();
            this.playAudio(this.backgroundMusic);

            await signInWithPopup(auth, provider);
        } catch (error) {
            alert("Sisselogimine ebaõnnestus: " + error.message);
            console.error(error);
        }
    }

    async logout() {
        try {
            await signOut(auth);
            this.stopAllMusic();
            this.resetGameView();
        } catch (error) {
            alert("Väljalogimine ebaõnnestus: " + error.message);
            console.error(error);
        }
    }

    watchAuth() {
        onAuthStateChanged(auth, (user) => {
            this.user = user;

            if (user) {
                this.name = user.displayName || user.email || "Nimetu";

                this.loginDiv.style.display = "none";
                this.userInfoDiv.style.display = "flex";
                this.counterDiv.style.display = "none";
                this.infoDiv.style.display = "none";
                this.wordContainer.style.display = "none";
                this.endGameDiv.style.display = "none";

                this.welcomeText.textContent = "Tere, " + this.name + "! Valmis trükkima?";
                this.showInstructions();

                if (!this.resultsStarted) {
                    this.watchResults();
                    this.resultsStarted = true;
                }
            } else {
                this.name = "";

                this.loginDiv.style.display = "flex";
                this.userInfoDiv.style.display = "none";
                this.counterDiv.style.display = "none";
                this.infoDiv.style.display = "none";
                this.wordContainer.style.display = "none";
                this.endGameDiv.style.display = "none";

                this.resultsDiv.innerHTML = "";
                this.resultsDiv.textContent = "Logi sisse, et tulemusi näha.";
            }
        });
    }

    watchResults() {
        const topResultsQuery = query(
            ref(db, "results"),
            orderByChild("time"),
            limitToFirst(20)
        );

        onValue(topResultsQuery, (snapshot) => {
            const data = snapshot.val() || {};

            this.results = Object.values(data)
                .filter(result => result.name && typeof result.time === "number")
                .sort((a, b) => a.time - b.time)
                .slice(0, 20);

            this.loadResults();
        }, (error) => {
            console.error("Tulemuste laadimine ebaõnnestus:", error);
            this.resultsDiv.textContent = "Tulemuste laadimine ebaõnnestus.";
        });
    }

    loadResults() {
        this.resultsDiv.innerHTML = "";

        if (this.results.length === 0) {
            this.resultsDiv.textContent = "Tulemusi veel pole.";
            return;
        }

        const table = document.createElement("div");
        table.classList.add("results-table");

        const headerRow = document.createElement("div");
        headerRow.classList.add("results-row", "results-header");

        const placeHeader = document.createElement("div");
        placeHeader.textContent = "Koht";

        const nameHeader = document.createElement("div");
        nameHeader.textContent = "Nimi";

        const timeHeader = document.createElement("div");
        timeHeader.textContent = "Aeg";

        headerRow.appendChild(placeHeader);
        headerRow.appendChild(nameHeader);
        headerRow.appendChild(timeHeader);

        table.appendChild(headerRow);

        this.results.forEach((result, index) => {
            const row = document.createElement("div");
            row.classList.add("results-row");

            const placeCell = document.createElement("div");
            placeCell.textContent = index + 1 + ".";

            const nameCell = document.createElement("div");
            nameCell.textContent = result.name;

            const timeCell = document.createElement("div");
            timeCell.textContent = result.time.toFixed(2) + " s";

            row.appendChild(placeCell);
            row.appendChild(nameCell);
            row.appendChild(timeCell);

            table.appendChild(row);
        });

        this.resultsDiv.appendChild(table);
    }

    showResultMessage() {
        if (!this.resultMessageDiv) {
            return;
        }

        if (this.score <= 0.90) {
            this.resultMessageDiv.textContent = "Uskumatu kiirus! Sa oled klaviatuuri ninja!";
        } else if (this.score <= 2.00) {
            this.resultMessageDiv.textContent = "Väga tubli tulemus!";
        } else {
            this.resultMessageDiv.textContent = "Proovi veel, saad kindlasti kiiremaks!";
        }
    }

    showResultImage() {
        if (!this.resultImageContainer) {
            console.error("resultImageContainer puudub HTML-ist");
            return;
        }

        this.resultImageContainer.innerHTML = "";

        const img = document.createElement("img");

        if (this.score <= 0.90) {
            img.src = "1.jpg";
            img.alt = "Täitsa kena tulemus";
        } else if (this.score <= 2.00) {
            img.src = "2.jpg";
            img.alt = "Saaksid paremini";
        } else {
            img.src = "3.jpg";
            img.alt = "LMAOOOOOO";
        }

        img.width = 200;

        img.onerror = () => {
            console.error("Pilti ei leitud:", img.src);
            this.resultImageContainer.textContent = "Pildi laadimine ebaõnnestus.";
        };

        this.resultImageContainer.appendChild(img);
    }

    async loadWordsFromFile() {
        try {
            const responseFromFile = await fetch("lemmad2013.txt");
            const allWords = await responseFromFile.text();
            this.getWords(allWords);
        } catch (error) {
            alert("Sõnade faili laadimine ebaõnnestus.");
            console.error(error);
        }
    }

    getWords(data) {
        const dataFromFile = data
            .split("\n")
            .map(word => word.trim())
            .filter(word => word.length > 0);

        this.separateWordsByLength(dataFromFile);
    }

    separateWordsByLength(words) {
        for (let word of words) {
            const wordLength = word.length;

            if (!this.words[wordLength]) {
                this.words[wordLength] = [];
            }

            this.words[wordLength].push(word);
        }
    }

    startCountdown() {
        if (!this.user) {
            alert("Palun logi enne mängimist sisse.");
            return;
        }

        this.resetGameData();

        this.stopAllMusic();
        this.playAudio(this.countdownMusic);

        this.loginDiv.style.display = "none";
        this.userInfoDiv.style.display = "none";
        this.endGameDiv.style.display = "none";
        this.counterDiv.style.display = "flex";
        this.infoDiv.style.display = "none";
        this.wordContainer.style.display = "none";

        let i = 3;
        this.timeDiv.textContent = i;

        const countdown = setInterval(() => {
            i--;
            this.timeDiv.textContent = i;

            if (i === 0) {
                clearInterval(countdown);

                this.timeDiv.textContent = "Edu!";

                setTimeout(() => {
                    this.counterDiv.style.display = "none";
                    this.startTyper();
                }, 600);
            }
        }, 1000);
    }

    startTyper() {
        this.generateWords();

        if (this.typeWords.length === 0) {
            alert("Sõnu ei leitud. Kontrolli, kas lemmad2013.txt on olemas.");
            this.userInfoDiv.style.display = "flex";

            this.stopAllMusic();
            this.playAudio(this.backgroundMusic);
            return;
        }

        this.updateInfo();

        this.infoDiv.style.display = "flex";
        this.wordContainer.style.display = "flex";

        this.stopAllMusic();
        this.playAudio(this.gameMusic);

        this.startTime = performance.now();

        this.keyListener = (e) => {
            this.shortenWord(e.key);
        };

        window.addEventListener("keypress", this.keyListener);
    }

    shortenWord(keypressed) {
        if (!this.word) {
            return;
        }

        if (this.word[0] === keypressed && this.word.length > 1) {
            this.word = this.word.slice(1);
            this.drawWord();
        } else if (
            this.word[0] === keypressed &&
            this.word.length === 1 &&
            this.wordsTyped < this.typeWords.length - 1
        ) {
            this.wordsTyped++;
            this.updateInfo();
            this.selectWord();
        } else if (
            this.word[0] === keypressed &&
            this.word.length === 1 &&
            this.wordsTyped === this.typeWords.length - 1
        ) {
            this.wordsTyped++;
            this.updateInfo();
            this.endGame();
        } else if (this.word[0] !== keypressed) {
            this.wordDiv.style.color = "red";

            setTimeout(() => {
                this.wordDiv.style.color = "";
            }, 100);
        }
    }

    async endGame() {
        this.endTime = performance.now();
        this.score = Number(((this.endTime - this.startTime) / 1000).toFixed(2));

        this.stopAudio(this.gameMusic);

        this.wordDiv.style.color = "";
        this.wordDiv.textContent = `Mäng läbi. Sinu aeg on: ${this.score.toFixed(2)} sekundit.`;
        this.endGameDiv.style.display = "flex";

        if (this.keyListener) {
            window.removeEventListener("keypress", this.keyListener);
            this.keyListener = null;
        }

        this.showResultMessage();
        this.showResultImage();

        await this.saveResult();
    }

    async saveResult() {
        if (!this.user || !this.score) {
            return;
        }

        const result = {
            name: this.name,
            time: this.score,
            uid: this.user.uid,
            createdAt: Date.now()
        };

        try {
            await push(ref(db, "results"), result);

            this.stopAllMusic();

            this.successSound.pause();
            this.successSound.currentTime = 0;

            this.successSound.play()
                .then(() => {
                    console.log("Correct heli mängib:", this.successSound.src);

                    setTimeout(() => {
                        this.playAudio(this.backgroundMusic);
                    }, 1200);
                })
                .catch((error) => {
                    console.log("Correct heli ei saanud mängida:", this.successSound.src, error);
                    this.playAudio(this.backgroundMusic);
                });

        } catch (error) {
            alert("Tulemuse salvestamine ebaõnnestus: " + error.message);
            console.error(error);

            this.stopAllMusic();
            this.playAudio(this.backgroundMusic);
        }
    }

    generateWords() {
        this.typeWords = [];

        for (let i = 0; i < this.wordsInGame; i++) {
            const len = this.startingWordLength + i;
            const possibleWords = this.words[len] || [];

            if (possibleWords.length === 0) {
                continue;
            }

            const randomIndex = Math.floor(Math.random() * possibleWords.length);
            this.typeWords.push(possibleWords[randomIndex]);
        }

        this.selectWord();
    }

    selectWord() {
        this.word = this.typeWords[this.wordsTyped];
        this.drawWord();
    }

    drawWord() {
        this.wordDiv.textContent = this.word;
    }

    updateInfo() {
        this.wordCountDiv.textContent = "Sõnu trükitud: " + this.wordsTyped + "/" + this.wordsInGame;
    }

    restartGame() {
        this.startCountdown();
    }

    resetGameData() {
        this.startTime = 0;
        this.endTime = 0;
        this.word = "";
        this.typeWords = [];
        this.wordsTyped = 0;
        this.score = 0;

        if (this.keyListener) {
            window.removeEventListener("keypress", this.keyListener);
            this.keyListener = null;
        }

        if (this.resultImageContainer) {
            this.resultImageContainer.innerHTML = "";
        }

        if (this.resultMessageDiv) {
            this.resultMessageDiv.textContent = "";
        }
    }

    resetGameView() {
        this.resetGameData();
        this.stopAllMusic();

        this.loginDiv.style.display = "flex";
        this.userInfoDiv.style.display = "none";
        this.counterDiv.style.display = "none";
        this.infoDiv.style.display = "none";
        this.wordContainer.style.display = "none";
        this.endGameDiv.style.display = "none";
    }
}

new Typer();