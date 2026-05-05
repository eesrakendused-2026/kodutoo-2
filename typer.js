import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
    getDatabase,
    ref,
    push,
    onValue
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDNPYWVZT82V2XdewtVMmQTRBeiJPOuhQM",
    authDomain: "typer-kodutoo.firebaseapp.com",
    databaseURL: "https://typer-kodutoo-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "typer-kodutoo",
    storageBucket: "typer-kodutoo.firebasestorage.app",
    messagingSenderId: "299498425367",
    appId: "1:299498425367:web:be2f4dd87d320e62f76052"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const provider = new GoogleAuthProvider();

const DIFFICULTIES = {
    easy:   { count: 5,  minLen: 3, maxLen: 5,  label: "Lihtne" },
    medium: { count: 7,  minLen: 5, maxLen: 7,  label: "Keskmine" },
    hard:   { count: 10, minLen: 7, maxLen: 10, label: "Raske" }
};

const RANKS = [
    { max: 20,       name: "Noob",     img: "https://media.tenor.com/8BvIvPhOJDYAAAAi/doink.gif" },
    { max: 40,       name: "Keskmine", img: "https://media.tenor.com/ZF_NNP-7O_AAAAAi/hmm.gif" },
    { max: 60,       name: "Hea",      img: "https://media.tenor.com/w9EEOXqXHa4AAAAi/%D1%82%D1%8B%D1%82%D1%8B%D1%82%D1%8B-%D1%82%D1%8B.gif" },
    { max: Infinity, name: "Boss",     img: "https://media.tenor.com/eGIIS3aKoqQAAAAi/yellow-guy-rich.gif" }
];

class Typer {
    constructor() {
        this.name = "";
        this.userId = "";
        this.difficulty = "easy";
        this.startTime = 0;
        this.endTime = 0;
        this.word = "";
        this.words = [];
        this.typeWords = [];
        this.wordsTyped = 0;
        this.totalKeys = 0;
        this.correctKeys = 0;
        this.score = 0;
        this.results = [];
        this.volume = 0.5;

        this.audioCtx = null;

        this.setupAuth();
        this.setupButtons();
        this.setupDifficulty();
        this.setupVolume();
        this.setupSidebar();
        this.loadWords();
        this.listenToResults();
    }

    setupAuth() {
        document.getElementById("googleLogin").addEventListener("click", () => {
            signInWithPopup(auth, provider).catch((err) => {
                alert("Sisselogimine ebaõnnestus: " + err.message);
            });
        });

        document.getElementById("logout").addEventListener("click", () => {
            signOut(auth);
            this.resetGame();
        });

        document.getElementById("switchUser").addEventListener("click", () => {
            signOut(auth);
            this.resetGame();
        });

        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.name = user.displayName || user.email;
                this.userId = user.uid;
                this.showUserInfo();
            } else {
                this.showLogin();
            }
        });
    }

    setupButtons() {
        document.getElementById("startGame").addEventListener("click", () => {
            this.startCountdown();
        });

        document.getElementById("playAgain").addEventListener("click", () => {
            this.resetGame();
            this.showUserInfo();
        });

        document.getElementById("quitGame").addEventListener("click", () => {
            this.quitGame();
        });
    }

    setupDifficulty() {
        const buttons = document.querySelectorAll(".diffBtn");
        buttons.forEach((btn) => {
            btn.addEventListener("click", () => {
                buttons.forEach((b) => b.classList.remove("selected"));
                btn.classList.add("selected");
                this.difficulty = btn.dataset.diff;
            });
        });
    }

    setupVolume() {
        const slider = document.getElementById("volume");
        const valueLabel = document.getElementById("volumeValue");
        slider.addEventListener("input", (e) => {
            this.volume = e.target.value / 100;
            valueLabel.textContent = e.target.value + "%";
        });
    }

    setupSidebar() {
        const sidebar = document.getElementById("resultsSidebar");
        document.getElementById("openResults").addEventListener("click", () => {
            sidebar.classList.add("open");
        });
        document.getElementById("closeResults").addEventListener("click", () => {
            sidebar.classList.remove("open");
        });
    }

    initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playBeep(freq, duration, type = "square", startOffset = 0) {
        this.initAudio();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        const start = this.audioCtx.currentTime + startOffset;
        gain.gain.setValueAtTime(this.volume * 0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(start);
        osc.stop(start + duration);
    }

    soundStart() {
        this.playBeep(440, 0.15, "square", 0);
        this.playBeep(660, 0.15, "square", 0.18);
        this.playBeep(880, 0.25, "square", 0.36);
    }

    soundType() {
        this.playBeep(1200, 0.04, "square");
    }

    soundEnd() {
        this.playBeep(660, 0.15, "square", 0);
        this.playBeep(440, 0.15, "square", 0.15);
        this.playBeep(220, 0.3, "square", 0.30);
    }

    soundLeaderboard() {
        this.playBeep(523, 0.12, "square", 0);
        this.playBeep(659, 0.12, "square", 0.13);
        this.playBeep(784, 0.12, "square", 0.26);
        this.playBeep(1047, 0.35, "square", 0.39);
    }

    showLogin() {
        document.getElementById("login").style.display = "flex";
        document.getElementById("userInfo").style.display = "none";
        document.getElementById("counter").style.display = "none";
        document.getElementById("info").style.display = "none";
        document.getElementById("wordContainer").style.display = "none";
        document.getElementById("endGame").style.display = "none";
    }

    showUserInfo() {
        document.getElementById("login").style.display = "none";
        document.getElementById("userInfo").style.display = "flex";
        document.getElementById("counter").style.display = "none";
        document.getElementById("info").style.display = "none";
        document.getElementById("wordContainer").style.display = "none";
        document.getElementById("endGame").style.display = "none";
        document.getElementById("welcomeText").textContent = `Tere, ${this.name}!`;
    }

    resetGame() {
        this.wordsTyped = 0;
        this.typeWords = [];
        this.totalKeys = 0;
        this.correctKeys = 0;
        this.score = 0;
        this.word = "";
        document.getElementById("word").innerHTML = "";
        document.getElementById("endGame").style.display = "none";
        document.getElementById("info").style.display = "none";
        document.getElementById("wordContainer").style.display = "none";
        if (auth.currentUser) {
            document.getElementById("userInfo").style.display = "flex";
        }
    }

    async loadWords() {
        const responseFromFile = await fetch("lemmad2013.txt");
        const allWords = await responseFromFile.text();
        this.getWords(allWords);
    }

    listenToResults() {
        const resultsRef = ref(database, "results");
        onValue(resultsRef, (snapshot) => {
            const data = snapshot.val();
            this.results = data ? Object.values(data) : [];
            this.results.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
            this.loadResults();
        });
    }

    loadResults() {
        const resultDiv = document.getElementById("results");
        resultDiv.innerHTML = "";

        const head = document.createElement("div");
        head.className = "resultHead";
        head.innerHTML = `
            <span class="resultPos">#</span>
            <span class="resultName">Nimi</span>
            <span class="resultTime">Aeg</span>
        `;
        resultDiv.appendChild(head);

        const top20 = this.results.slice(0, 20);
        for (let i = 0; i < top20.length; i++) {
            const row = document.createElement("div");
            row.className = "resultRow";
            row.innerHTML = `
                <span class="resultPos">${i + 1}.</span>
                <span class="resultName">${top20[i].name}</span>
                <span class="resultTime">${top20[i].time}s</span>
            `;
            resultDiv.appendChild(row);
        }
    }

    getWords(data) {
        const dataFromFile = data.split("\n")
            .map((w) => w.trim())
            .filter((w) => w.length > 0);
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
        document.getElementById("userInfo").style.display = "none";
        document.getElementById("endGame").style.display = "none";
        document.getElementById("counter").style.display = "flex";

        this.soundStart();

        let i = 3;
        document.getElementById("time").innerHTML = i;

        const countdown = setInterval(() => {
            i--;
            if (i > 0) {
                document.getElementById("time").innerHTML = i;
            } else {
                document.getElementById("counter").style.display = "none";
                this.startTyper();
                clearInterval(countdown);
            }
        }, 1000);
    }

    startTyper() {
        this.generateWords();
        this.upDateInfo();
        document.querySelector("#info").style.display = "flex";
        document.querySelector("#wordContainer").style.display = "flex";

        this.startTime = performance.now();

        this.keyListener = (e) => {
            this.shorteWord(e.key);
        };

        window.addEventListener("keypress", this.keyListener);
    }

    shorteWord(keypressed) {
        this.totalKeys++;

        if (this.word[0] === keypressed && this.word.length > 1 && this.typeWords.length > this.wordsTyped) {
            this.correctKeys++;
            this.soundType();
            this.word = this.word.slice(1);
            this.drawWord();
        } else if (this.word[0] === keypressed && this.word.length == 1 && this.wordsTyped <= this.typeWords.length - 2) {
            this.correctKeys++;
            this.soundType();
            this.wordsTyped++;
            this.upDateInfo();
            this.selectWord();
        } else if (this.word[0] === keypressed && this.word.length == 1 && this.typeWords.length - 1 == this.wordsTyped) {
            this.correctKeys++;
            this.soundType();
            this.upDateInfo();
            this.wordsTyped = 0;
            this.endGame();
        } else if (this.word[0] != keypressed) {
            document.getElementById("word").style.color = "#ff334a";
            setTimeout(() => {
                document.getElementById("word").style.color = "#fff";
            }, 100);
        }
    }

    quitGame() {
        window.removeEventListener("keypress", this.keyListener);
        this.resetGame();
        this.showUserInfo();
    }

    endGame() {
        this.endTime = performance.now();
        const seconds = (this.endTime - this.startTime) / 1000;
        this.score = seconds.toFixed(2);

        let totalChars = 0;
        for (let i = 0; i < this.typeWords.length; i++) {
            totalChars += this.typeWords[i].length;
        }
        const minutes = seconds / 60;
        const wpm = Math.round((totalChars / 5) / minutes);

        let accuracy = "0.0";
        if (this.totalKeys > 0) {
            accuracy = ((this.correctKeys / this.totalKeys) * 100).toFixed(1);
        }

        let rank = RANKS[RANKS.length - 1];
        for (let i = 0; i < RANKS.length; i++) {
            if (wpm < RANKS[i].max) {
                rank = RANKS[i];
                break;
            }
        }

        document.getElementById("word").innerHTML = "";
        document.getElementById("rankImage").src = rank.img;
        document.getElementById("rankImage").alt = rank.name;
        document.getElementById("rankText").innerHTML = `${rank.name} (${wpm} WPM)`;
        document.getElementById("accuracy").innerHTML = `Täpsus: ${accuracy}%`;
        document.getElementById("finalTime").innerHTML = `Aeg: ${this.score}s`;

        window.removeEventListener("keypress", this.keyListener);
        document.getElementById("info").style.display = "none";
        document.getElementById("wordContainer").style.display = "none";
        document.getElementById("endGame").style.display = "flex";

        this.soundEnd();

        const reachedTop20 = this.results.length < 20
            || seconds < parseFloat(this.results[19].time);
        this.saveResult();
        if (reachedTop20) {
            setTimeout(() => this.soundLeaderboard(), 700);
        }
    }

    saveResult() {
        const result = {
            name: this.name,
            time: this.score,
            difficulty: this.difficulty,
            userId: this.userId,
            timestamp: Date.now()
        };

        const resultsRef = ref(database, "results");
        push(resultsRef, result).catch((err) => {
            alert("Tulemuse salvestamine ebaõnnestus: " + err.message);
        });
    }

    generateWords() {
        const diff = DIFFICULTIES[this.difficulty];
        this.typeWords = [];
        for (let i = 0; i < diff.count; i++) {
            const len = diff.minLen + Math.floor(Math.random() * (diff.maxLen - diff.minLen + 1));
            const wordsOfLen = this.words[len] || this.words[diff.minLen];
            const randomIndex = Math.floor(Math.random() * wordsOfLen.length);
            this.typeWords.push(wordsOfLen[randomIndex]);
        }
        this.selectWord();
    }

    selectWord() {
        this.word = this.typeWords[this.wordsTyped];
        this.drawWord();
    }

    drawWord() {
        document.getElementById("word").innerHTML = this.word;
    }

    upDateInfo() {
        const total = DIFFICULTIES[this.difficulty].count;
        document.getElementById("wordcount").innerHTML = "Sõnu trükitud: " + this.wordsTyped + "/" + total;
    }
}

new Typer();
