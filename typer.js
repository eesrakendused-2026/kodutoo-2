import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, push, get }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyD9ly7Fdc-2j941wcSoSTegfGAxlXsDJvw",
    authDomain: "typer-app-markus.firebaseapp.com",
    databaseURL: "https://typer-app-markus-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "typer-app-markus",
    storageBucket: "typer-app-markus.firebasestorage.app",
    messagingSenderId: "196200005090",
    appId: "1:196200005090:web:5ad961268399c26fa10dbb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const DIFFICULTY = {
    easy:   { wordsInGame: 10, minLen: 3, maxLen: 5 },
    medium: { wordsInGame: 10, minLen: 5, maxLen: 8 },
    hard:   { wordsInGame: 10, minLen: 8, maxLen: 99 }
};

class Typer {
    constructor() {
        this.name = "";
        this.uid = "";
        this.words = [];
        this.typeWords = [];
        this.wordsTyped = 0;
        this.score = 0;
        this.results = [];
        this.loggedIn = false;
        this.mistakes = 0;
        this.paused = false;
        this.pauseStart = 0;
        this.totalPauseTime = 0;
        this.startTime = 0;
        this.endTime = 0;
        this.word = "";
        this.typedIndex = 0;
        this.keyListener = null;
        this.keydownListener = null;
        this.difficulty = "easy";
        this.activeFilter = "easy";
        this.wordsInGame = DIFFICULTY.easy.wordsInGame;

        this.initButtons();
        this.loadFromFile();
    }

    showScreen(screenId) {
        const screens = ["name", "counter", "wordContainer", "pauseScreen", "endScreen"];
        screens.forEach(id => {
            document.getElementById(id).style.display = "none";
        });
        if (screenId) {
            document.getElementById(screenId).style.display = "flex";
        }
    }

    clearNavbar() {
        document.getElementById("wordcount").textContent = "";
        document.getElementById("pauseBtn").style.display = "none";
        document.getElementById("cancelBtn").style.display = "none";
        document.getElementById("leaderboardBtn").style.display = "inline-block";
        document.getElementById("logoutBtn").style.display = "inline-block";
    }

    initButtons() {
        document.getElementById("googleLoginBtn").addEventListener("click", async () => {
            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider);
            } catch (err) {
                alert("Sisselogimine ebaonnestus: " + err.message);
            }
        });

        document.getElementById("submitname").addEventListener("click", () => {
            if (!this.loggedIn) return;
            this.showScreen(null);
            this.startCountdown();
        });

        document.getElementById("restartBtn").addEventListener("click", () => {
            this.wordsTyped = 0;
            this.score = 0;
            this.typeWords = [];
            this.totalPauseTime = 0;
            this.mistakes = 0;
            this.clearNavbar();
            this.showScreen("name");
        });

        document.getElementById("switchUserBtn").addEventListener("click", async () => {
            this.loggedIn = false;
            await signOut(auth);
            this.clearNavbar();
            this.showScreen("name");
            document.getElementById("loggedInInfo").style.display = "none";
            document.getElementById("googleLoginBtn").style.display = "inline-block";
            document.getElementById("resultsContainer").style.display = "none";
        });

        document.getElementById("pauseBtn").addEventListener("click", () => {
            this.pauseGame();
        });

        document.getElementById("resumeBtn").addEventListener("click", () => {
            this.resumeGame();
        });

        document.getElementById("cancelBtn").addEventListener("click", () => {
            this.cancelGame();
        });

        document.getElementById("leaderboardBtn").addEventListener("click", () => {
            this.loadResultsFromDB();
            document.getElementById("leaderboardModal").style.display = "flex";
        });

        document.getElementById("logoutBtn").addEventListener("click", async () => {
            this.loggedIn = false;
            await signOut(auth);
            this.clearNavbar();
            this.showScreen("name");
            document.getElementById("loggedInInfo").style.display = "none";
            document.getElementById("googleLoginBtn").style.display = "inline-block";
            document.getElementById("resultsContainer").style.display = "none";
        });

        document.getElementById("closeModal").addEventListener("click", () => {
            document.getElementById("leaderboardModal").style.display = "none";
        });

        document.getElementById("leaderboardModal").addEventListener("click", (e) => {
            if (e.target === document.getElementById("leaderboardModal")) {
                document.getElementById("leaderboardModal").style.display = "none";
            }
        });

        document.querySelectorAll(".btn-difficulty").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".btn-difficulty").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.difficulty = btn.dataset.level;
                this.wordsInGame = DIFFICULTY[this.difficulty].wordsInGame;
            });
        });

        document.querySelectorAll(".btn-filter").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".btn-filter").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.activeFilter = btn.dataset.filter;
                this.loadResults();
            });
        });

        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.name = user.displayName || user.email;
                this.uid = user.uid;
                this.loggedIn = true;
                document.getElementById("googleLoginBtn").style.display = "none";
                document.getElementById("loggedInAs").textContent = "Tere, " + this.name + "!";
                document.getElementById("loggedInInfo").style.display = "flex";
                document.getElementById("resultsContainer").style.display = "flex";
                this.clearNavbar();
                this.showScreen("name");
            }
        });
    }

    cancelGame() {
        if (this.keyListener) window.removeEventListener("keypress", this.keyListener);
        if (this.keydownListener) window.removeEventListener("keydown", this.keydownListener);
        this.keyListener = null;
        this.keydownListener = null;
        this.wordsTyped = 0;
        this.score = 0;
        this.typeWords = [];
        this.totalPauseTime = 0;
        this.mistakes = 0;
        this.typedIndex = 0;
        this.paused = false;
        this.clearNavbar();
        this.showScreen("name");
    }

    pauseGame() {
        if (this.paused) return;
        this.paused = true;
        this.pauseStart = performance.now();
        window.removeEventListener("keypress", this.keyListener);
        document.getElementById("wordContainer").style.display = "none";
        document.getElementById("pauseScreen").style.display = "flex";
        document.getElementById("wordContainer").style.display = "none";
    }

    resumeGame() {
        if (!this.paused) return;
        document.getElementById("pauseScreen").style.display = "none";
        document.getElementById("counter").style.display = "flex";
        let i = 3;
        document.getElementById("time").innerHTML = i;

        const countdown = setInterval(() => {
            i--;
            if (i === 0) {
                clearInterval(countdown);
                document.getElementById("counter").style.display = "none";
                document.getElementById("wordContainer").style.display = "flex";
                this.paused = false;
                this.totalPauseTime += performance.now() - this.pauseStart;
                window.addEventListener("keypress", this.keyListener);
            } else {
                document.getElementById("time").innerHTML = i;
            }
        }, 1000);
    }

    loadResults() {
        const resultDiv = document.getElementById("results");
        resultDiv.innerHTML = "";

        const filtered = this.results
            .filter(r => r.difficulty === this.activeFilter)
            .slice(0, 20);

        for (let i = 0; i < filtered.length; i++) {
            const row = document.createElement("div");
            row.className = "result-row";

            const rank = document.createElement("span");
            rank.className = "result-rank";
            rank.textContent = (i + 1) + ".";

            const name = document.createElement("span");
            name.className = "result-name";
            name.textContent = filtered[i].name;

            const time = document.createElement("span");
            time.className = "result-time";
            time.textContent = filtered[i].time + "s";

            row.appendChild(rank);
            row.appendChild(name);
            row.appendChild(time);
            resultDiv.appendChild(row);
        }
    }

    async loadFromFile() {
        const responseFromFile = await fetch("lemmad2013.txt");
        const allWords = await responseFromFile.text();
        this.loadResultsFromDB();
        this.getWords(allWords);
    }

    async loadResultsFromDB() {
        const snapshot = await get(ref(db, "results"));
        const items = [];
        if (snapshot.exists()) {
            Object.values(snapshot.val()).forEach(item => items.push(item));
        }
        const filtered = items.filter(r => r.time > 0 && r.name);
        filtered.sort((a, b) => a.time - b.time);
        this.results = filtered;
        this.loadResults();
    }

    getWords(data) {
        const dataFromFile = data.split("\n");
        this.separateWordsByLength(dataFromFile);
    }

    separateWordsByLength(words) {
        for (let word of words) {
            const wordLength = word.trim().length;
            if (wordLength < 2) continue;
            if (!this.words[wordLength]) this.words[wordLength] = [];
            this.words[wordLength].push(word.trim());
        }
    }

    startCountdown() {
        document.getElementById("counter").style.display = "flex";
        document.getElementById("pauseBtn").style.display = "inline-block";
        document.getElementById("cancelBtn").style.display = "inline-block";
        document.getElementById("leaderboardBtn").style.display = "none";
        document.getElementById("logoutBtn").style.display = "none";
        let i = 3;
        this.playSound("start");
        document.getElementById("time").innerHTML = i;

        const countdown = setInterval(() => {
            i--;
            if (i === 0) {
                clearInterval(countdown);
                document.getElementById("counter").style.display = "none";
                this.startTyper();
            } else {
                document.getElementById("time").innerHTML = i;
            }
        }, 1000);
    }

    startTyper() {
        this.totalPauseTime = 0;
        this.generateWords();
        this.updateInfo();
        document.getElementById("wordContainer").style.display = "flex";

        this.startTime = performance.now();

        this.keyListener = (e) => {
            this.shortenWord(e.key);
        };

        this.keydownListener = (e) => {
            if (e.code === "Space") {
                e.preventDefault();
                this.playSound("pause");
                this.paused ? this.resumeGame() : this.pauseGame();
            } else if (e.code === "Escape") {
                this.playSound("cancel");
                this.cancelGame();
            }
        };

        window.addEventListener("keypress", this.keyListener);
        window.addEventListener("keydown", this.keydownListener);
        this.playSound("game");
    }

    shortenWord(keyPressed) {
        const currentChar = this.word[this.typedIndex];

        if (currentChar === keyPressed && this.typedIndex < this.word.length - 1) {
            this.playSound("key");
            this.typedIndex++;
            this.drawWord();
        } else if (currentChar === keyPressed && this.typedIndex === this.word.length - 1
                   && this.wordsTyped <= this.typeWords.length - 2) {
            this.playSound("key");
            this.typedIndex++;
            this.drawWord();
            setTimeout(() => {
                this.wordsTyped++;
                this.typedIndex = 0;
                this.updateInfo();
                this.selectWord();
            }, 150);
        } else if (currentChar === keyPressed && this.typedIndex === this.word.length - 1
                   && this.typeWords.length - 1 === this.wordsTyped) {
            this.playSound("key");
            this.typedIndex++;
            this.drawWord();
            setTimeout(() => {
                this.endGame();
            }, 150);
        } else if (currentChar !== keyPressed) {
            this.playSound("mistake");
            this.mistakes++;
            this.updateInfo();
            const wordEl = document.getElementById("word");
            const spans = wordEl.querySelectorAll("span");
            if (spans[this.typedIndex]) {
                spans[this.typedIndex].style.color = "var(--error)";
                setTimeout(() => {
                    spans[this.typedIndex].style.color = "";
                }, 150);
            }
        }
    }

    endGame() {
        this.endTime = performance.now();
        const rawTime = (this.endTime - this.startTime - this.totalPauseTime) / 1000;
        this.score = rawTime.toFixed(2);

        window.removeEventListener("keypress", this.keyListener);
        if (this.keydownListener) window.removeEventListener("keydown", this.keydownListener);
        this.keyListener = null;
        this.keydownListener = null;

        this.clearNavbar();

        const wpm = Math.round((this.wordsInGame / rawTime) * 60);
        const speedInfo = this.getSpeedInfo(wpm);

        document.getElementById("endMessage").innerHTML =
            "Mang labi! Sinu aeg: <strong>" + this.score + "s</strong> (" +
            wpm + " sona/min)<br>Vigu: " + this.mistakes;
        document.getElementById("speedImage").innerHTML =
            '<img src="' + speedInfo.img + '" alt="kiirus"><p>' + speedInfo.label + "</p>";
        document.getElementById("personalBest").textContent = "";

        this.playSound("end");
        this.showScreen("endScreen");
        this.saveResult(wpm);
    }

    getSpeedInfo(wpm) {
        if (wpm >= 60) return {
            img: "https://media.giphy.com/media/3oKIPEqDGUULpEU0aQ/giphy.gif",
            label: "Ekspert! " + wpm + " sona/min"
        };
        if (wpm >= 40) return {
            img: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
            label: "Hea trukkija! " + wpm + " sona/min"
        };
        if (wpm >= 20) return {
            img: "https://media.giphy.com/media/xT9IgG50Lg7russbDa/giphy.gif",
            label: "Keskmine! " + wpm + " sona/min"
        };
        return {
            img: "https://media.giphy.com/media/26ufnwz3wDUli7GU0/giphy.gif",
            label: "Algaja! " + wpm + " sona/min"
        };
    }

    async saveResult(wpm) {
        if (!this.name || parseFloat(this.score) === 0) return;

        await push(ref(db, "results"), {
            name: this.name,
            uid: this.uid,
            time: parseFloat(this.score),
            wpm: wpm,
            mistakes: this.mistakes,
            difficulty: this.difficulty,
            timestamp: Date.now()
        });

        this.playSound("leaderboard");
        await this.loadResultsFromDB();

        const myResults = this.results.filter(r => r.uid === this.uid);
        if (myResults.length > 0) {
            const best = myResults.reduce((a, b) => a.time < b.time ? a : b);
            document.getElementById("personalBest").textContent =
                "Sinu parim tulemus: " + best.time + "s";
        }
    }

    playSound(type) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === "start") {
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === "game") {
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else if (type === "end") {
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } else if (type === "leaderboard") {
            osc.frequency.setValueAtTime(523, ctx.currentTime);
            osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
            osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        } else if (type === "mistake") {
            osc.type = "square";
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        } else if (type === "key") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        } else if (type === "pause") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(500, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } else if (type === "cancel") {
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        }
    }

    generateWords() {
        this.typeWords = [];
        const minLen = DIFFICULTY[this.difficulty].minLen;
        const maxLen = DIFFICULTY[this.difficulty].maxLen;
        const used = new Set();

        for (let i = 0; i < this.wordsInGame; i++) {
            const availableLengths = [];
            for (let l = minLen; l <= maxLen; l++) {
                if (this.words[l] && this.words[l].length > 0) {
                    availableLengths.push(l);
                }
            }
            if (availableLengths.length === 0) continue;

            let word;
            let attempts = 0;
            do {
                const len = availableLengths[Math.floor(Math.random() * availableLengths.length)];
                const idx = Math.floor(Math.random() * this.words[len].length);
                word = this.words[len][idx];
                attempts++;
            } while (used.has(word) && attempts < 50);

            used.add(word);
            this.typeWords.push(word);
        }
        this.selectWord();
    }

    selectWord() {
        this.word = this.typeWords[this.wordsTyped];
        this.typedIndex = 0;
        this.drawWord();
    }

    drawWord() {
        const wordEl = document.getElementById("word");
        wordEl.innerHTML = this.word.split("").map((char, i) => {
            if (i < this.typedIndex) {
                return '<span style="color: var(--success)">' + char + "</span>";
            }
            return "<span>" + char + "</span>";
        }).join("");
    }

    updateInfo() {
        document.getElementById("wordcount").innerHTML =
            "Sonu trukitud: " + this.wordsTyped + "/" + this.wordsInGame +
            " | Vead: " + this.mistakes;
    }
}

let typer = new Typer();