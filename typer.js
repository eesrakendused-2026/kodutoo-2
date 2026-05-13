// speed levels based on typingpal.com/en/blog/good-typing-speed
const SPEED_LEVELS = [
    { min: 0,   max: 10,  label: "Algaja",         icon: "🐢", cls: "beginner", range: "0–10 WPM"    },
    { min: 10,  max: 20,  label: "Alustaja",        icon: "🚶", cls: "slow",     range: "10–20 WPM"   },
    { min: 20,  max: 40,  label: "Keskmine",        icon: "🚲", cls: "average",  range: "20–40 WPM"   },
    { min: 40,  max: 60,  label: "Hea",             icon: "🏍", cls: "good",     range: "40–60 WPM"   },
    { min: 60,  max: 80,  label: "Kiire",           icon: "🚗", cls: "fast",     range: "60–80 WPM"   },
    { min: 80,  max: 100, label: "Professionaalne", icon: "✈️", cls: "pro",      range: "80–100 WPM"  },
    { min: 100, max: Infinity, label: "Eliit",      icon: "🚀", cls: "elite",    range: "100+ WPM"    }
];

class AudioEngine {
    constructor() {
        this.ctx = null;
    }

    _getCtx() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.ctx;
    }

    _tone(freq, duration, type = "sine", gain = 0.3, delay = 0) {
        try {
            const ctx      = this._getCtx();
            const osc      = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
            gainNode.gain.setValueAtTime(gain, ctx.currentTime + delay);
            gainNode.gain.exponentialRampToValueAtTime(
                0.001, ctx.currentTime + delay + duration
            );
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + duration);
        } catch (_) {}
    }

    playStart() {
        [261, 329, 392, 523].forEach((f, i) => this._tone(f, 0.25, "sine", 0.25, i * 0.1));
    }

    playKeyTick() {
        this._tone(800, 0.05, "square", 0.08);
    }

    playEnd() {
        [523, 440, 349, 262].forEach((f, i) => this._tone(f, 0.3, "triangle", 0.2, i * 0.12));
    }

    playHighScore() {
        const melody = [523, 659, 784, 1047];
        melody.forEach((f, i) => this._tone(f, 0.2, "sine", 0.3, i * 0.15));
        this._tone(1047, 0.5, "sine", 0.25, melody.length * 0.15);
    }
}

function showToast(msg, duration = 2500) {
    let toast = document.querySelector(".toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "toast";
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("show"), duration);
}

class Typer {
    constructor() {
        this.name            = "";
        this.wordsInGame     = 5;
        this.startTime       = 0;
        this.endTime         = 0;
        this.word            = "";
        this.words           = [];
        this.typeWords       = [];
        this.wordsTyped      = 0;
        this.score           = 0;
        this.wpm             = 0;
        this.totalKeyPresses = 0;
        this.correctPresses  = 0;
        this.results         = [];
        this.keyListener     = null;
        this.audio           = new AudioEngine();

        this._buildDifficultyUI();
        this._buildThemeToggle();
        this._setupModal();
        this.loadFromFile();
    }

    _buildDifficultyUI() {
        const inputGroup = document.querySelector(".input-group");
        if (!inputGroup) return;

        const label = document.createElement("div");
        label.className = "diff-label";
        label.textContent = "Raskusaste";

        const group = document.createElement("div");
        group.className = "difficulty-group";

        const levels = [
            { label: "Lihtne",   words: 3  },
            { label: "Keskmine", words: 5  },
            { label: "Raske",    words: 10 }
        ];

        levels.forEach((lvl, i) => {
            const btn = document.createElement("button");
            btn.className = "diff-btn" + (i === 1 ? " active" : "");
            btn.textContent = lvl.label;
            btn.addEventListener("click", () => {
                document.querySelectorAll(".diff-btn")
                    .forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.wordsInGame = lvl.words;
            });
            group.appendChild(btn);
        });

        inputGroup.insertBefore(group, inputGroup.lastElementChild);
        inputGroup.insertBefore(label, group);
    }

    _buildThemeToggle() {
        const btn = document.createElement("button");
        btn.className = "theme-toggle";
        btn.textContent = "🌙";
        btn.title = "Vaheta teemat";
        btn.addEventListener("click", () => {
            const isLight = document.documentElement.classList.toggle("force-light");
            btn.textContent = isLight ? "☀️" : "🌙";
            const vars = ["--bg", "--bg-card", "--bg-card2", "--text", "--border"];
            if (isLight) {
                const light = {
                    "--bg":       "#f4f4f0",
                    "--bg-card":  "#ffffff",
                    "--bg-card2": "#ebebea",
                    "--text":     "#1a1a2e",
                    "--border":   "#dddde8"
                };
                vars.forEach(v => document.documentElement.style.setProperty(v, light[v]));
            } else {
                vars.forEach(v => document.documentElement.style.removeProperty(v));
            }
        });
        document.body.appendChild(btn);
    }

    _setupModal() {
        const overlay  = document.getElementById("resultsModal");
        const closeBtn = document.getElementById("closeModal");
        const againBtn = document.getElementById("playAgainBtn");

        closeBtn.addEventListener("click", () => this._closeModal());
        againBtn.addEventListener("click", () => {
            this._closeModal();
            location.reload();
        });

        overlay.addEventListener("click", e => {
            if (e.target === overlay) this._closeModal();
        });

        document.addEventListener("keydown", e => {
            if (e.key === "Escape" && overlay.style.display !== "none") {
                this._closeModal();
            }
        });
    }

    _openModal() {
        document.getElementById("resultsModal").style.display = "flex";
        document.body.style.overflow = "hidden";
    }

    _closeModal() {
        document.getElementById("resultsModal").style.display = "none";
        document.body.style.overflow = "";
    }

    async loadFromFile() {
        try {
            const response = await fetch("lemmad2013.txt");
            const allWords = await response.text();
            this.getWords(allWords);
            await this.loadResultsFromFile();
        } catch (err) {
            console.error("Faili laadimine ebaõnnestus:", err);
        }
    }

    async loadResultsFromFile() {
        try {
            const res     = await fetch("database.txt");
            const text    = await res.text();
            const content = JSON.parse(text).content;
            this.results  = JSON.parse(content) || [];
            this.results  = this.results.filter(r => r.name && r.name.trim() !== "");
        } catch (_) {
            this.results = [];
        }
        this.renderLeaderboard();
    }

    getWords(data) {
        this.separateWordsByLength(data.split("\n"));
    }

    separateWordsByLength(words) {
        for (const word of words) {
            const len = word.trim().length;
            if (len < 2) continue;
            if (!this.words[len]) this.words[len] = [];
            this.words[len].push(word.trim());
        }
        this.askName();
    }

    renderLeaderboard() {
        const container = document.getElementById("results");
        container.innerHTML = "";

        const top20 = this.results
            .filter(r => r.name && parseFloat(r.time) > 0)
            .sort((a, b) => parseFloat(a.time) - parseFloat(b.time))
            .slice(0, 20);

        if (top20.length === 0) {
            const empty = document.createElement("div");
            empty.className = "result-empty";
            empty.textContent = "Tulemused puuduvad";
            container.appendChild(empty);
            return;
        }

        top20.forEach((entry, i) => {
            const row = document.createElement("div");
            row.className = "result-row";

            const rank = document.createElement("span");
            rank.className = "rank-num";
            rank.textContent = i + 1;

            const name = document.createElement("span");
            name.className = "rank-name";
            name.textContent = entry.name;

            const time = document.createElement("span");
            time.className = "rank-time";
            time.textContent = entry.time + "s";

            const wpm = document.createElement("span");
            wpm.className = "rank-wpm";
            if (entry.wpm) wpm.textContent = entry.wpm + " wpm";

            row.append(rank, name, time, wpm);
            container.appendChild(row);
        });
    }

    askName() {
        document.getElementById("submitname").addEventListener("click", () => {
            const val = document.getElementById("username").value.trim();
            if (!val) { showToast("Palun sisesta nimi!"); return; }
            this.name = val;
            this.startCountdown();
        });

        document.getElementById("username").addEventListener("keydown", e => {
            if (e.key === "Enter") document.getElementById("submitname").click();
        });
    }

    startCountdown() {
        document.getElementById("name").style.display    = "none";
        document.getElementById("counter").style.display = "flex";

        let i = 3;
        document.getElementById("time").textContent = i;

        const interval = setInterval(() => {
            i--;
            document.getElementById("time").textContent = i || "GO!";
            if (i <= 0) {
                clearInterval(interval);
                setTimeout(() => {
                    document.getElementById("counter").style.display = "none";
                    this.startGame();
                }, 600);
            }
        }, 1000);
    }

    startGame() {
        this.audio.playStart();

        this.wordsTyped      = 0;
        this.totalKeyPresses = 0;
        this.correctPresses  = 0;

        this.generateWords();

        document.getElementById("gameScreen").style.display    = "flex";
        document.getElementById("info").style.display          = "flex";
        document.getElementById("wordContainer").style.display = "flex";

        this.startTime = performance.now();
        this._updateInfoBar();

        this.keyListener = e => this._handleKey(e.key);
        window.addEventListener("keypress", this.keyListener);
    }

    _handleKey(key) {
        this.totalKeyPresses++;

        if (this.word[0] === key) {
            this.correctPresses++;
            this.audio.playKeyTick();

            if (this.word.length > 1) {
                this.word = this.word.slice(1);
                this._drawWord();
            } else if (this.wordsTyped < this.typeWords.length - 1) {
                this.wordsTyped++;
                this._updateInfoBar();
                this._selectWord();
            } else {
                this.wordsTyped++;
                this._updateInfoBar();
                this._endGame();
            }
        } else {
            const wordEl = document.getElementById("word");
            wordEl.classList.add("error");
            setTimeout(() => wordEl.classList.remove("error"), 150);
        }

        this._updateProgressBar();
    }

    generateWords() {
        this.typeWords = [];
        for (let i = 0; i < this.wordsInGame; i++) {
            let len = Math.min(3 + i, this.words.length - 1);
            while (!this.words[len] && len > 2) len--;
            const pool = this.words[len];
            this.typeWords.push(pool[Math.floor(Math.random() * pool.length)]);
        }
        this._selectWord();
    }

    _selectWord() {
        this.word = this.typeWords[this.wordsTyped];
        this._drawWord();
    }

    _drawWord() {
        document.getElementById("word").textContent = this.word;
    }

    _updateInfoBar() {
        document.getElementById("wordcount").textContent =
            `Sõnad: ${this.wordsTyped}/${this.wordsInGame}`;

        const acc = this.totalKeyPresses > 0
            ? Math.round((this.correctPresses / this.totalKeyPresses) * 100)
            : 100;
        document.getElementById("accuracy-display").textContent = `Täpsus: ${acc}%`;

        const elapsed = (performance.now() - this.startTime) / 1000 / 60;
        if (elapsed > 0 && this.wordsTyped > 0) {
            document.getElementById("live-wpm").textContent =
                `WPM: ${Math.round(this.wordsTyped / elapsed)}`;
        }
    }

    _updateProgressBar() {
        const pct = (this.wordsTyped / this.wordsInGame) * 100;
        document.getElementById("progress-bar").style.width = pct + "%";
    }

    _endGame() {
        this.endTime = performance.now();
        window.removeEventListener("keypress", this.keyListener);

        const elapsedSec = (this.endTime - this.startTime) / 1000;
        this.score       = elapsedSec.toFixed(2);
        this.wpm         = Math.round(this.wordsInGame / (elapsedSec / 60));

        const accuracy = this.totalKeyPresses > 0
            ? Math.round((this.correctPresses / this.totalKeyPresses) * 100)
            : 100;

        this.audio.playEnd();
        this._saveAndShowResults(accuracy);
    }

    async _saveAndShowResults(accuracy) {
        const entry = {
            name:     this.name,
            time:     this.score,
            wpm:      this.wpm,
            accuracy: accuracy
        };

        await this.loadResultsFromFile();
        this.results.push(entry);
        this.results.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));

        const rank = this.results.findIndex(
            r => r.name === this.name && r.time === this.score
        ) + 1;

        if (rank <= 20) {
            setTimeout(() => this.audio.playHighScore(), 800);
            showToast(`🏆 Edetabelisse! Koht #${rank}`);
        }

        try {
            await fetch("server.php", {
                method:  "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body:    "save=" + encodeURIComponent(JSON.stringify(this.results))
            });
        } catch (err) {
            console.warn("Server save failed:", err);
        }

        localStorage.setItem("score", JSON.stringify(this.results));
        this.renderLeaderboard();
        this._fillModal(entry, rank, accuracy);
        this._openModal();
    }

    _fillModal(entry, rank, accuracy) {
        document.getElementById("res-name").textContent     = entry.name;
        document.getElementById("res-time").textContent     = entry.time + "s";
        document.getElementById("res-words").textContent    = this.wordsInGame;
        document.getElementById("res-accuracy").textContent = accuracy + "%";
        document.getElementById("res-wpm").textContent      = entry.wpm + " WPM";
        document.getElementById("res-rank").textContent     =
            rank <= 20 ? `#${rank}` : "TOP 20-st väljas";

        const level = SPEED_LEVELS.find(
            l => entry.wpm >= l.min && entry.wpm < l.max
        ) || SPEED_LEVELS[0];

        const badge = document.getElementById("speed-badge");
        badge.className = `speed-badge ${level.cls}`;
        document.getElementById("speed-icon").textContent  = level.icon;
        document.getElementById("speed-label").textContent = level.label;
        document.getElementById("speed-range").textContent = level.range;
    }
}

const typer = new Typer();
