import { initializeApp }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth, GoogleAuthProvider, signInWithPopup,
    signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getDatabase, ref, push, query,
    orderByChild, get
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDOYd9zZWnCRJBWJMMSkA_G69aYB-76-6o",
    authDomain: "typer-rakendus.firebaseapp.com",
    databaseURL:
        "https://typer-rakendus-default-rtdb.europe-west1.firebasedatabase.app",
    projectId:        "typer-rakendus",
    storageBucket:    "typer-rakendus.firebasestorage.app",
    messagingSenderId:"387598034140",
    appId: "1:387598034140:web:b3cd7837cf2328fd1c4019"
};

const app  = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = getDatabase(app);

const SPEED_TIERS = [
    { minWpm: 0,   label: "Algaja",      emoji: "🐢" },
    { minWpm: 20,  label: "Harjutaja",   emoji: "🚶" },
    { minWpm: 40,  label: "Keskmine",    emoji: "🚲" },
    { minWpm: 60,  label: "Kiire",       emoji: "🏎️" },
    { minWpm: 80,  label: "Ekspert",     emoji: "✈️" },
    { minWpm: 100, label: "Supersonic",  emoji: "🚀" }
];

const DIFFICULTY = {
    easy:   { wordCount: 5,  startLen: 2 },
    medium: { wordCount: 10, startLen: 3 },
    hard:   { wordCount: 15, startLen: 4 }
};

class SoundEngine {
    constructor() {
        this._ctx = null;
    }

    _getCtx() {
        if (!this._ctx) {
            this._ctx = new (window.AudioContext
                || window.webkitAudioContext)();
        }
        return this._ctx;
    }
    // kasutatud on Claude AI-d – Web Audio API fallback (AudioContext + webkitAudioContext)

    _beep(freq, dur, type = "sine", vol = 0.18) {
        const ctx  = this._getCtx();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type      = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.001, ctx.currentTime + dur
        );
        osc.start();
        osc.stop(ctx.currentTime + dur);
    }
    // kasutatud on Claude AI-d – oscillator + gain node + exponentialRampToValueAtTime

    playStart() {
        [440, 554, 659].forEach((f, i) => {
            setTimeout(() => this._beep(f, 0.18, "triangle", 0.2), i * 100);
        });
    }

    playKeyCorrect() {
        this._beep(880, 0.06, "sine", 0.08);
    }

    playWordDone() {
        this._beep(660, 0.08, "square", 0.12);
        setTimeout(() => this._beep(880, 0.08, "square", 0.12), 80);
    }

    playGameEnd() {
        [523, 659, 784, 1047].forEach((f, i) => {
            setTimeout(
                () => this._beep(f, 0.22, "triangle", 0.18), i * 110
            );
        });
    }

    playLeaderboard() {
        [784, 988, 1175, 1568].forEach((f, i) => {
            setTimeout(
                () => this._beep(f, 0.18, "sine", 0.2), i * 80
            );
        });
    }
}

class Typer {
    constructor() {
        this.playerName     = "";
        this.difficulty     = "hard";
        this.wordCount      = DIFFICULTY.hard.wordCount;
        this.startWordLen   = DIFFICULTY.hard.startLen;
        this.startTime      = 0;
        this.endTime        = 0;
        this.currentWord    = "";
        this.wordBank       = [];   
        this.gameWords      = [];   
        this.wordsTyped     = 0;
        this.score          = 0;    
        this.wpm            = 0;
        this.leaderboard    = [];
        this.isLoggedIn     = false;
        this.keyListener    = null;
        this.liveTimer      = null;

        this.sound = new SoundEngine();

        this._initUI();
        this._initAuth();
        this._loadWords();
    }

    _initUI() {
        const $  = id => document.getElementById(id);

        $("googleLoginBtn").addEventListener("click", () =>
            this._googleLogin()
        );

        $("submitname").addEventListener("click", () => {
            $("name").style.display = "none";
            this._showDifficultyModal();
        });

        $("restartBtn").addEventListener("click", () => {
            $("endScreen").style.display = "none";
            this._showDifficultyModal();
        });

        $("switchUserBtn").addEventListener("click", () =>
            this._logout()
        );

        $("showResultsBtn").addEventListener("click", () =>
            this._openSidebar()
        );

        $("closeSidebar").addEventListener("click", () =>
            this._closeSidebar()
        );

        $("sidebarOverlay").addEventListener("click", () =>
            this._closeSidebar()
        );

        document.querySelectorAll(".diff-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".diff-btn")
                    .forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.difficulty   = btn.dataset.level;
                this.wordCount    = DIFFICULTY[this.difficulty].wordCount;
                this.startWordLen = DIFFICULTY[this.difficulty].startLen;
                $("difficultyModal").style.display = "none";
                this._resetGame();
                this._startCountdown();
            });
        });
    }

    async _googleLogin() {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (err) {
            alert("Sisselogimine ebaõnnestus: " + err.message);
        }
    }

    async _logout() {
        this.isLoggedIn = false;
        await signOut(auth);
        this._closeSidebar();
        document.getElementById("endScreen").style.display = "none";
        document.getElementById("wordContainer").style.display = "none";
        document.getElementById("info").style.display = "none";
        this._showLoginScreen();
    }

    _showLoginScreen() {
        const nameDiv = document.getElementById("name");
        nameDiv.style.display = "flex";
        document.getElementById("googleLoginBtn").style.display = "inline-flex";
        document.getElementById("submitname").style.display = "none";
    }

    _initAuth() {
        onAuthStateChanged(auth, user => {
            if (user) {
                this.playerName = user.displayName || user.email;
                this.isLoggedIn = true;
                document.getElementById("googleLoginBtn")
                    .style.display = "none";
                document.getElementById("submitname")
                    .style.display = "inline-flex";
            }
        });
    }

    async _loadWords() {
        const resp = await fetch("lemmad2013.txt");
        const text = await resp.text();
        this._buildWordBank(text.split("\n"));
        await this._fetchLeaderboard();
    }

    _buildWordBank(words) {
        this.wordBank = [];
        for (const word of words) {
            const len = word.trim().length;
            if (!len) continue;
            if (!this.wordBank[len]) this.wordBank[len] = [];
            this.wordBank[len].push(word.trim());
        }
    }

    async _fetchLeaderboard() {
        const q = query(ref(db, "results"), orderByChild("time"));
        const snap = await get(q);
        const items = [];
        snap.forEach(child => {
            const v = child.val();
            if (v?.name && v?.time > 0) items.push(v);
        });
        items.sort((a, b) => a.time - b.time);
        this.leaderboard = items.slice(0, 20);
        this._renderLeaderboard();
    }
    // kasutatud on AI-d – Firebase query optional chaining + sortimise optimiseerimiseks

    async _saveResult() {
        if (!this.playerName) return;
        await push(ref(db, "results"), {
            name:      this.playerName,
            time:      parseFloat(this.score),
            wpm:       this.wpm,
            timestamp: Date.now()
        });
    }

    _renderLeaderboard() {
        const container = document.getElementById("results");
        container.innerHTML = "";

        const totalWords = this.wordCount;

        this.leaderboard.forEach((entry, i) => {
            const row  = document.createElement("div");
            row.className = "result-row";

            if (entry.name === this.playerName
                && this.score > 0
                && Math.abs(entry.time - parseFloat(this.score)) < 0.1
            ) {
                row.classList.add("highlight");
            }

            const wpmStr = entry.wpm
                ? `${entry.wpm} wpm`
                : this._calcWpm(entry.time, totalWords) + " wpm";

            row.innerHTML = `
                <span class="result-rank">${i + 1}</span>
                <span class="result-name">${this._escHtml(entry.name)}</span>
                <span class="result-time">${entry.time.toFixed(2)}s</span>
                <span class="result-wpm">${wpmStr}</span>
            `;
            container.appendChild(row);
        });
    }

    _escHtml(str) {
        return str.replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;",
            '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    _calcWpm(timeSec, wordCount) {
        if (!timeSec || timeSec <= 0) return 0;
        return Math.round((wordCount / timeSec) * 60);
    }

    _getSpeedTier(wpm) {
        let tier = SPEED_TIERS[0];
        for (const t of SPEED_TIERS) {
            if (wpm >= t.minWpm) tier = t;
        }
        return tier;
    }

    _openSidebar() {
        document.getElementById("resultsSidebar").classList.add("open");
        document.getElementById("sidebarOverlay").classList.add("visible");
        document.getElementById("resultsSidebar")
            .setAttribute("aria-hidden", "false");
    }

    _closeSidebar() {
        document.getElementById("resultsSidebar").classList.remove("open");
        document.getElementById("sidebarOverlay").classList.remove("visible");
        document.getElementById("resultsSidebar")
            .setAttribute("aria-hidden", "true");
    }

    _showDifficultyModal() {
        document.getElementById("difficultyModal").style.display = "flex";
    }

    _resetGame() {
        this.wordsTyped  = 0;
        this.score       = 0;
        this.wpm         = 0;
        this.gameWords   = [];
        this.currentWord = "";
        if (this.keyListener) {
            window.removeEventListener("keypress", this.keyListener);
            this.keyListener = null;
        }
        this._stopLiveTimer();
    }

    _startCountdown() {
        const counter = document.getElementById("counter");
        const timeEl  = document.getElementById("time");
        counter.style.display = "flex";
        let i = 3;
        timeEl.textContent = i;

        const tick = setInterval(() => {
            i--;
            timeEl.textContent = i;
            if (i <= 0) {
                clearInterval(tick);
                counter.style.display = "none";
                this._startGame();
            }
        }, 1000);
    }

    _startGame() {
        this._generateWords();
        this._updateProgress();
        this._updateWordCount();
        this._showUpcoming();

        document.getElementById("info").style.display = "flex";
        document.getElementById("wordContainer").style.display = "flex";
        document.getElementById("keyHint").textContent =
            "Trüki sõna täht-tähelt";

        this.startTime = performance.now();
        this.sound.playStart();
        this._startLiveTimer();

        this.keyListener = e => this._onKeyPress(e.key);
        window.addEventListener("keypress", this.keyListener);
    }

    _startLiveTimer() {
        const el = document.getElementById("elapsed");
        this.liveTimer = setInterval(() => {
            const sec = ((performance.now() - this.startTime) / 1000)
                .toFixed(1);
            el.textContent = sec + "s";
        }, 100);
    }

    _stopLiveTimer() {
        if (this.liveTimer) {
            clearInterval(this.liveTimer);
            this.liveTimer = null;
        }
        document.getElementById("elapsed").textContent = "0.0s";
    }

    _onKeyPress(key) {
        const word = this.currentWord;
        if (!word) return;

        if (key === word[0]) {
            this.sound.playKeyCorrect();

            if (word.length > 1) {
                this.currentWord = word.slice(1);
                this._drawWord();
                this._flashWord("correct");
            } else {
                this.sound.playWordDone();
                this.wordsTyped++;
                this._updateWordCount();
                this._updateProgress();

                if (this.wordsTyped < this.gameWords.length) {
                    this._selectWord();
                    this._showUpcoming();
                } else {
                    this._endGame();
                }
            }
        } else {
            this._flashWord("error");
        }
    }

    _flashWord(type) {
        const el = document.getElementById("word");
        el.classList.remove("error", "word-correct-flash");
        void el.offsetWidth; 
        if (type === "error") {
            el.classList.add("error");
            setTimeout(() => el.classList.remove("error"), 150);
        } else {
            el.classList.add("word-correct-flash");
            setTimeout(() => el.classList.remove("word-correct-flash"), 250);
        }
    }

    async _endGame() {
        this.endTime = performance.now();
        this._stopLiveTimer();

        window.removeEventListener("keypress", this.keyListener);
        this.keyListener = null;

        const timeSec = (this.endTime - this.startTime) / 1000;
        this.score    = timeSec.toFixed(2);
        this.wpm      = this._calcWpm(timeSec, this.wordCount);

        this.sound.playGameEnd();
        this._showEndScreen();

        await this._saveResult();
        await this._fetchLeaderboard();

        const rank = this.leaderboard.findIndex(
            e => Math.abs(e.time - parseFloat(this.score)) < 0.01
                && e.name === this.playerName
        );
        if (rank !== -1 && rank < 20) {
            setTimeout(() => this.sound.playLeaderboard(), 600);
        }

        document.getElementById("wordContainer").style.display = "none";
        document.getElementById("info").style.display = "none";
    }

    _showEndScreen() {
        const tier = this._getSpeedTier(this.wpm);

        document.getElementById("speedImage").textContent = tier.emoji;
        document.getElementById("finalScore").textContent =
            this.score + "s";
        document.getElementById("speedLabel").textContent = tier.label;
        document.getElementById("wpmDisplay").textContent =
            `${this.wpm} sõna minutis`;

        document.getElementById("endScreen").style.display = "flex";
    }

    _generateWords() {
        this.gameWords = [];
        for (let i = 0; i < this.wordCount; i++) {
            const len = this.startWordLen + i;
            const bank = this.wordBank[len];
            if (!bank || !bank.length) {
                const keys = this.wordBank
                    .map((_, idx) => idx)
                    .filter(k => this.wordBank[k]?.length);
                const fallbackLen =
                    keys[Math.floor(Math.random() * keys.length)];
                const fallbackBank = this.wordBank[fallbackLen];
                this.gameWords.push(
                    fallbackBank[
                        Math.floor(Math.random() * fallbackBank.length)
                    ]
                );
                continue;
            }
            this.gameWords.push(
                bank[Math.floor(Math.random() * bank.length)]
            );
        }
        this._selectWord();
    }
    // kasutatud on AI-d – fallback logic (missing wordBank index, dynamic keys etc)

    _selectWord() {
        this.currentWord = this.gameWords[this.wordsTyped];
        this._drawWord();
    }

    _drawWord() {
        document.getElementById("word").textContent = this.currentWord;
    }

    _showUpcoming() {
        const next = this.gameWords
            .slice(this.wordsTyped + 1, this.wordsTyped + 4)
            .join("  ·  ");
        document.getElementById("upcoming").textContent =
            next ? "Järgmised: " + next : "";
    }

    _updateWordCount() {
        document.getElementById("wordcount").textContent =
            `${this.wordsTyped} / ${this.wordCount}`;
    }

    _updateProgress() {
        const pct = (this.wordsTyped / this.wordCount) * 100;
        document.getElementById("progressFill").style.width = pct + "%";
    }
}

// Kasutatud on Claude AI-d ka üldiseks debugimiseks
const typer = new Typer();