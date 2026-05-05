console.log("Typer v2 loaded");

// viide: https://www.typingpal.com/en/blog/good-typing-speed
const SPEED_TIERS = [
    {
        maxWpm: 20,
        label: "Algaja",
        emoji: "🐢",
        img: "https://em-content.zobj.net/source/twitter/376/turtle_1f422.png",
        color: "#e74c3c",
        msg: "Harjuta rohkem!"
    },
    {
        maxWpm: 40,
        label: "Õppija",
        emoji: "🚶",
        img: "https://em-content.zobj.net/source/twitter/376/person-walking_1f6b6.png",
        color: "#e67e22",
        msg: "Tubli algus!"
    },
    {
        maxWpm: 60,
        label: "Keskmine",
        emoji: "🚴",
        img: "https://em-content.zobj.net/source/twitter/376/person-biking_1f6b4.png",
        color: "#f1c40f",
        msg: "Üle keskmise!"
    },
    {
        maxWpm: 80,
        label: "Kiire",
        emoji: "🏃",
        img: "https://em-content.zobj.net/source/twitter/376/person-running_1f3c3.png",
        color: "#2ecc71",
        msg: "Kiire trükkija!"
    },
    {
        maxWpm: 100,
        label: "Ekspert",
        emoji: "🚗",
        img: "https://em-content.zobj.net/source/twitter/376/racing-car_1f3ce-fe0f.png",
        color: "#3498db",
        msg: "Ekspert tase!"
    },
    {
        maxWpm: Infinity,
        label: "Meister",
        emoji: "🚀",
        img: "https://em-content.zobj.net/source/twitter/376/rocket_1f680.png",
        color: "#9b59b6",
        msg: "Absoluutne meister!"
    }
];

const WORDS_IN_GAME = 5;

class AudioManager {
    constructor() {
        this.ctx = null;
    }

    getCtx() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.ctx;
    }

    // heli
    playTone(freq, dur, type = "sine", vol = 0.3) {
        try {
            const ctx = this.getCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(vol, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(
                0.001, ctx.currentTime + dur
            );
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + dur);
        } catch (e) {
            console.warn("Audio error:", e);
        }
    }

    // mängu algus
    playStart() {
        this.playTone(523, 0.15, "square", 0.2);
        setTimeout(() => this.playTone(659, 0.15, "square", 0.2), 150);
        setTimeout(() => this.playTone(784, 0.3, "square", 0.25), 300);
    }

    // klaviatuur
    playKeypress() {
        this.playTone(880, 0.05, "sine", 0.1);
    }

    // meloodia
    playGameOver() {
        const notes = [784, 659, 523, 392];
        notes.forEach((n, i) => {
            setTimeout(() => this.playTone(n, 0.2, "triangle", 0.25), i * 180);
        });
    }

    // highscore
    playHighScore() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((n, i) => {
            setTimeout(() => this.playTone(n, 0.2, "square", 0.2), i * 120);
        });
        setTimeout(() => this.playTone(1047, 0.5, "square", 0.3), 500);
    }

    // viga
    playError() {
        this.playTone(150, 0.08, "sawtooth", 0.15);
    }
}

class Typer {
    constructor() {
        this.name = "";
        this.wordsInGame = WORDS_IN_GAME;
        this.startTime = 0;
        this.endTime = 0;
        this.word = "";
        this.words = [];
        this.typeWords = [];
        this.wordsTyped = 0;
        this.score = 0;
        this.wpm = 0;
        this.accuracy = 0;
        this.totalKeystrokes = 0;
        this.correctKeystrokes = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.results = [];
        this.keyListener = null;
        this.audio = new AudioManager();
        this.timerInterval = null;
        this.elapsedTime = 0;

        this.bindUI();
        this.loadFromFile();
    }

    bindUI() {
        document.getElementById("submitname")
            .addEventListener("click", () => this.handleNameSubmit());

        document.getElementById("username")
            .addEventListener("keypress", (e) => {
                if (e.key === "Enter") this.handleNameSubmit();
            });

        document.getElementById("showResults")
            .addEventListener("click", () => this.openModal());

        document.getElementById("modalClose")
            .addEventListener("click", () => this.closeModal());

        document.getElementById("modalOverlay")
            .addEventListener("click", (e) => {
                if (e.target === document.getElementById("modalOverlay")) {
                    this.closeModal();
                }
            });

        document.getElementById("restartBtn")
            .addEventListener("click", () => this.restartGame());

        
        document.getElementById("themeToggle")
            .addEventListener("click", () => this.toggleTheme());

    
        document.getElementById("difficultySelect")
            .addEventListener("change", (e) => {
                this.wordsInGame = parseInt(e.target.value);
            });
    }

    handleNameSubmit() {
        const val = document.getElementById("username").value.trim();
        if (!val) {
            document.getElementById("nameError").style.display = "block";
            return;
        }
        document.getElementById("nameError").style.display = "none";
        this.name = val;
        this.startCountdown();
    }

    async loadFromFile() {
        try {
            const res = await fetch("lemmad2013.txt");
            const text = await res.text();
            this.getWords(text);
            await this.loadResultsFromFile();
        } catch (e) {
            console.error("File load error:", e);
        }
    }

    async loadResultsFromFile() {
        try {
            const res = await fetch("database.txt");
            const text = await res.text();
            const content = JSON.parse(text).content;
            this.results = JSON.parse(content) || [];
            // Filter out empty placeholder entries
            this.results = this.results.filter(
                r => r.name && r.name.trim() !== "" && r.time > 0
            );
        } catch (e) {
            console.error("Results load error:", e);
            this.results = [];
        }
    }

    getWords(data) {
        const lines = data.split("\n");
        this.separateWordsByLength(lines);
    }

    separateWordsByLength(words) {
        for (const word of words) {
            const len = word.trim().length;
            if (len < 2) continue;
            if (!this.words[len]) this.words[len] = [];
            this.words[len].push(word.trim());
        }
        this.showNameScreen();
    }

    showNameScreen() {
        document.getElementById("name").style.display = "flex";
        document.getElementById("loadingScreen").style.display = "none";
    }

    startCountdown() {
        document.getElementById("counter").style.display = "flex";
        document.getElementById("name").style.display = "none";
        let i = 3;
        document.getElementById("time").innerHTML = i;

        const countdown = setInterval(() => {
            i--;
            document.getElementById("time").innerHTML = i || "GO!";
            if (i === 0) {
                clearInterval(countdown);
                setTimeout(() => {
                    document.getElementById("counter").style.display = "none";
                    this.startTyper();
                }, 600);
            }
        }, 1000);
    }

    startTyper() {
        this.wordsTyped = 0;
        this.totalKeystrokes = 0;
        this.correctKeystrokes = 0;
        this.streak = 0;
        this.bestStreak = 0;

        this.generateWords();
        this.updateInfo();

        document.getElementById("info").style.display = "flex";
        document.getElementById("wordContainer").style.display = "flex";
        document.getElementById("liveStats").style.display = "flex";

        this.startTime = performance.now();
        this.startLiveTimer();
        this.audio.playStart();

        this.keyListener = (e) => this.handleKey(e.key);
        window.addEventListener("keypress", this.keyListener);
    }

    startLiveTimer() {
        this.timerInterval = setInterval(() => {
            this.elapsedTime = (
                (performance.now() - this.startTime) / 1000
            ).toFixed(1);
            document.getElementById("liveTimer").textContent =
                this.elapsedTime + "s";
        }, 100);
    }

    handleKey(key) {
        this.totalKeystrokes++;

        if (this.word[0] === key) {
            this.correctKeystrokes++;
            this.streak++;
            if (this.streak > this.bestStreak) this.bestStreak = this.streak;
            this.audio.playKeypress();
            this.updateStreakDisplay();

            if (this.word.length > 1) {
                this.word = this.word.slice(1);
                this.drawWord();
            } else if (this.wordsTyped < this.typeWords.length - 1) {
                this.wordsTyped++;
                this.updateInfo();
                this.selectWord();
            } else {
                this.endGame();
            }
        } else {
            this.streak = 0;
            this.updateStreakDisplay();
            this.audio.playError();
            this.flashError();
        }
    }

    flashError() {
        const el = document.getElementById("word");
        el.classList.add("error-flash");
        setTimeout(() => el.classList.remove("error-flash"), 150);
    }

    updateStreakDisplay() {
        const el = document.getElementById("streakDisplay");
        if (this.streak >= 5) {
            el.textContent = `🔥 ${this.streak} streak!`;
            el.style.opacity = "1";
        } else {
            el.style.opacity = "0";
        }
    }

    endGame() {
        this.endTime = performance.now();
        clearInterval(this.timerInterval);
        window.removeEventListener("keypress", this.keyListener);

        this.score = ((this.endTime - this.startTime) / 1000).toFixed(2);
        this.accuracy = this.totalKeystrokes > 0
            ? Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100)
            : 0;

        const totalChars = this.typeWords.join("").length;
        this.wpm = Math.round((totalChars / 5) / (parseFloat(this.score) / 60));

        document.getElementById("wordContainer").style.display = "none";
        document.getElementById("info").style.display = "none";
        document.getElementById("liveStats").style.display = "none";

        this.audio.playGameOver();
        this.showEndScreen();
        this.saveResult();
    }

    showEndScreen() {
        const tier = this.getSpeedTier(this.wpm);
        const endEl = document.getElementById("endScreen");
        const isHighScore = this.checkIfHighScore();

        endEl.style.display = "flex";
        document.getElementById("endTime").textContent = this.score + "s";
        document.getElementById("endWpm").textContent = this.wpm + " WPM";
        document.getElementById("endAccuracy").textContent =
            this.accuracy + "%";
        document.getElementById("endStreak").textContent = this.bestStreak;
        document.getElementById("speedLabel").textContent = tier.label;
        document.getElementById("speedLabel").style.color = tier.color;
        document.getElementById("speedEmoji").textContent = tier.emoji;
        document.getElementById("speedMsg").textContent = tier.msg;
        document.getElementById("speedImg").src = tier.img;
        document.getElementById("speedImg").alt = tier.label;

        if (isHighScore) {
            document.getElementById("highScoreBanner").style.display = "block";
            this.audio.playHighScore();
        }
    }

    checkIfHighScore() {
        if (this.results.length === 0) return true;
        const best = this.results[0];
        return parseFloat(this.score) < parseFloat(best.time);
    }

    getSpeedTier(wpm) {
        return SPEED_TIERS.find(t => wpm <= t.maxWpm) || SPEED_TIERS.at(-1);
    }

    async saveResult() {
        const result = { name: this.name, time: this.score, wpm: this.wpm };
        this.results.push(result);
        this.results.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
        localStorage.setItem("typerResults", JSON.stringify(this.results));

        try {
            await fetch("server.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: "save=" + encodeURIComponent(JSON.stringify(this.results))
            });
        } catch (err) {
            console.warn("Save failed, using localStorage:", err);
        }

        this.renderResults();
    }

    renderResults() {
        const container = document.getElementById("results");
        container.innerHTML = "";

        const top = this.results.slice(0, 20);

        top.forEach((r, i) => {
            if (!r.name || r.name.trim() === "") return;

            const row = document.createElement("div");
            row.className = "result-row";
            if (i === 0) row.classList.add("result-gold");
            if (i === 1) row.classList.add("result-silver");
            if (i === 2) row.classList.add("result-bronze");

            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";

            row.innerHTML = `
                <span class="result-rank">${medal || (i + 1) + "."}</span>
                <span class="result-name">${this.escHtml(r.name)}</span>
                <span class="result-time">${r.time}s</span>
                <span class="result-wpm">${r.wpm || "—"} WPM</span>
            `;
            container.appendChild(row);
        });
    }

    escHtml(str) {
        const d = document.createElement("div");
        d.textContent = str;
        return d.innerHTML;
    }

    openModal() {
        this.renderResults();
        document.getElementById("modalOverlay").classList.add("active");
        document.body.style.overflow = "hidden";
    }

    closeModal() {
        document.getElementById("modalOverlay").classList.remove("active");
        document.body.style.overflow = "";
    }

    restartGame() {
        document.getElementById("endScreen").style.display = "none";
        document.getElementById("highScoreBanner").style.display = "none";
        document.getElementById("liveStats").style.display = "none";
        document.getElementById("name").style.display = "flex";
        document.getElementById("username").value = "";
        this.typeWords = [];
        this.wordsTyped = 0;
        this.score = 0;
        this.wpm = 0;
        this.elapsedTime = 0;
    }

    generateWords() {
        this.typeWords = [];
        for (let i = 0; i < this.wordsInGame; i++) {
            const len = Math.min(i + 3, this.words.length - 1);
            const bucket = this.words[len] || this.words[3];
            const idx = Math.floor(Math.random() * bucket.length);
            this.typeWords[i] = bucket[idx];
        }
        this.selectWord();
    }

    selectWord() {
        this.word = this.typeWords[this.wordsTyped];
        this.drawWord();
    }

    drawWord() {
        const el = document.getElementById("word");
        const typed = this.typeWords[this.wordsTyped].length - this.word.length;
        const doneChars = this.typeWords[this.wordsTyped].slice(0, typed);
        const remaining = this.word;
        el.innerHTML =
            `<span class="typed-chars">${doneChars}</span>${remaining}`;
    }

    updateInfo() {
        document.getElementById("wordcount").textContent =
            `Sõna ${this.wordsTyped + 1} / ${this.wordsInGame}`;

        const dots = document.getElementById("progressDots");
        dots.innerHTML = "";
        for (let i = 0; i < this.wordsInGame; i++) {
            const dot = document.createElement("span");
            dot.className = "dot" + (i < this.wordsTyped ? " done"
                : i === this.wordsTyped ? " active" : "");
            dots.appendChild(dot);
        }
    }

    toggleTheme() {
        document.body.classList.toggle("light-theme");
        const btn = document.getElementById("themeToggle");
        btn.textContent = document.body.classList.contains("light-theme")
            ? "🌙" : "☀️";
        localStorage.setItem(
            "typerTheme",
            document.body.classList.contains("light-theme") ? "light" : "dark"
        );
    }

    loadTheme() {
        const saved = localStorage.getItem("typerTheme");
        if (saved === "light") {
            document.body.classList.add("light-theme");
            document.getElementById("themeToggle").textContent = "🌙";
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.typer = new Typer();
    window.typer.loadTheme();
});
