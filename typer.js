class Typer {
    constructor() {
        this.name = "";
        this.wordsInGame = 5;
        this.startTime = 0;
        this.endTime = 0;
        this.word = "";
        this.words = [];
        this.typeWords = [];
        this.wordsTyped = 0;
        this.score = 0;
        this.gameOver = false;
        this.results = [];
        this.lastSessionWpm = 0;
        this.lastTierLabel = "";
        this.gameLoopSound = null;
        this.scoreStoreKey = "typer_scoreboard";
        this.phpSaveReady = null;

        this.audioStart = new Audio(
            "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3"
        );
        this.audioGame = new Audio(
            "https://assets.mixkit.co/active_storage/sfx/2409/2409-preview.mp3"
        );
        this.audioEnd = new Audio(
            "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3"
        );
        this.audioBoard = new Audio(
            "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3"
        );
        [this.audioStart, this.audioGame, this.audioEnd, this.audioBoard].forEach(
            (a) => {
                a.preload = "auto";
            }
        );

        this.bindUi();
        this.loadFromFile();
    }

    bindUi() {
        document.getElementById("modalClose").addEventListener("click", () =>
            this.closeModal()
        );
        document.getElementById("modalBackdrop").addEventListener("click", () =>
            this.closeModal()
        );
        document.getElementById("showResultsBtn").addEventListener("click", () =>
            this.openModal()
        );
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !document.getElementById("modal").classList.contains("is-hidden")) {
                this.closeModal();
            }
        });
    }

    loadResults(rows) {
        const resultDiv = document.getElementById("results");
        resultDiv.innerHTML = "";
        for (let i = 0; i < rows.length; i++) {
            const row = document.createElement("div");
            const left = document.createElement("span");
            left.className = "result-rank";
            left.textContent = `${i + 1}. ${rows[i].name}`;
            const right = document.createElement("span");
            right.className = "result-meta";
            right.textContent = `${rows[i].time} s`;
            row.appendChild(left);
            row.appendChild(right);
            resultDiv.appendChild(row);
        }
    }

    tierFromWpm(wpm) {
        if (wpm < 35) {
            return {
                label: "Algaja",
                img: "https://picsum.photos/seed/slowtype/640/360",
                note: "Alla 35 wpm on tavapärane algusjärgus."
            };
        }
        if (wpm < 45) {
            return {
                label: "Keskmine",
                img: "https://picsum.photos/seed/midtype/640/360",
                note: "35–45 wpm on tavaline igapäevane kiirus."
            };
        }
        if (wpm < 60) {
            return {
                label: "Hea",
                img: "https://picsum.photos/seed/goodtype/640/360",
                note: "45–60 wpm on sageli heaks peetav kiirus."
            };
        }
        if (wpm < 75) {
            return {
                label: "Väga hea",
                img: "https://picsum.photos/seed/fasttype/640/360",
                note: "60–75 wpm on professionaalsele sammule lähedane."
            };
        }
        return {
            label: "Professionaalne",
            img: "https://picsum.photos/seed/protype/640/360",
            note: "Üle 75 wpm loetakse sageli tipptasemeks."
        };
    }

    wpmFromSession() {
        const sec = parseFloat(this.score);
        if (!sec || sec <= 0) return 0;
        return Math.round((this.wordsInGame / sec) * 60 * 10) / 10;
    }

    updateProgress() {
        const pct = this.wordsInGame
            ? Math.min(100, (this.wordsTyped / this.wordsInGame) * 100)
            : 0;
        document.getElementById("progressFill").style.width = `${pct}%`;
        const track = document.getElementById("progressTrack");
        track.setAttribute("aria-valuenow", String(Math.round(pct)));
    }

    async loadFromFile() {
        const responseFromFile = await fetch("lemmad2013.txt");
        const allWords = await responseFromFile.text();
        await this.loadResultsFromFile();
        this.getWords(allWords);
    }

    mergeStored(a, b) {
        const rows = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])];
        const seen = new Set();
        const out = [];
        for (const r of rows) {
            if (!r || r.name == null || r.time == null) continue;
            const k = `${r.name}\t${r.time}`;
            if (seen.has(k)) continue;
            seen.add(k);
            out.push({ name: String(r.name), time: String(r.time) });
        }
        out.sort((x, y) => parseFloat(x.time) - parseFloat(y.time));
        return out;
    }

    async loadResultsFromFile() {
        let fromFile = [];
        try {
            const resultsResponse = await fetch("database.txt");
            const resultsText = await resultsResponse.text();
            const parsed = JSON.parse(resultsText);
            fromFile = JSON.parse(parsed.content || "[]") || [];
        } catch {
            fromFile = [];
        }
        let fromLs = [];
        try {
            fromLs = JSON.parse(localStorage.getItem(this.scoreStoreKey) || "null") || [];
        } catch {
            fromLs = [];
        }
        this.results = this.mergeStored(fromFile, fromLs);
        this.loadResults(this.results.slice(0, 20));
    }

    getWords(data) {
        const dataFromFile = data.split("\n").map((w) => w.trim()).filter(Boolean);
        this.separateWordsByLength(dataFromFile);
    }

    separateWordsByLength(wordList) {
        for (const word of wordList) {
            const wordLength = word.length;
            if (!this.words[wordLength]) {
                this.words[wordLength] = [];
            }
            this.words[wordLength].push(word);
        }
        this.askName();
    }

    askName() {
        document.getElementById("submitname").addEventListener("click", () => {
            this.name = document.getElementById("username").value.trim();
            const pick = document.getElementById("wordCountPick");
            const n = parseInt(pick.value, 10);
            this.wordsInGame = Number.isFinite(n) ? n : 5;
            if (!this.name) return;
            this.startCountdown();
        });
    }

    playSafe(audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }

    stopGameAmbience() {
        if (this.gameLoopSound) {
            this.gameLoopSound.pause();
            this.gameLoopSound.currentTime = 0;
            this.gameLoopSound = null;
        }
    }

    startCountdown() {
        document.getElementById("namePanel").classList.add("is-hidden");
        document.getElementById("counterPanel").classList.remove("is-hidden");
        this.playSafe(this.audioStart);
        let i = 3;
        const tick = () => {
            document.getElementById("time").textContent = i > 0 ? String(i) : "";
            if (i === 0) {
                document.getElementById("counterPanel").classList.add("is-hidden");
                this.startTyper();
                return;
            }
            i--;
            setTimeout(tick, 1000);
        };
        document.getElementById("time").textContent = String(i);
        i--;
        setTimeout(tick, 1000);
    }

    startTyper() {
        this.gameOver = false;
        this.wordsTyped = 0;
        this.typeWords = [];
        this.generateWords();
        this.upDateInfo();
        document.getElementById("infoPanel").classList.remove("is-hidden");
        document.getElementById("wordPanel").classList.remove("is-hidden");
        document.getElementById("showResultsBtn").classList.add("is-hidden");
        this.updateProgress();
        this.startTime = performance.now();
        this.audioGame.loop = true;
        this.audioGame.volume = 0.22;
        this.gameLoopSound = this.audioGame;
        this.playSafe(this.audioGame);
        this.keyListener = (e) => {
            this.shorteWord(e.key);
        };
        window.addEventListener("keypress", this.keyListener);
    }

    pickWordLength(index) {
        const target = this.wordsInGame + index;
        let len = Math.min(target, this.words.length - 1);
        while (len > 0 && (!this.words[len] || !this.words[len].length)) {
            len--;
        }
        if (len < 1) len = 1;
        while (!this.words[len] || !this.words[len].length) {
            len++;
            if (len >= this.words.length) return 1;
        }
        return len;
    }

    generateWords() {
        for (let i = 0; i < this.wordsInGame; i++) {
            const len = this.pickWordLength(i);
            const pool = this.words[len];
            const randomIndex = Math.floor(Math.random() * pool.length);
            this.typeWords[i] = pool[randomIndex];
        }
        this.selectWord();
    }

    shorteWord(keypressed) {
        if (this.gameOver) return;
        if (this.word[0] === keypressed && this.word.length > 1 && this.typeWords.length > this.wordsTyped) {
            this.word = this.word.slice(1);
            this.drawWord();
        } else if (
            this.word[0] === keypressed &&
            this.word.length === 1 &&
            this.wordsTyped <= this.typeWords.length - 2
        ) {
            this.wordsTyped++;
            this.upDateInfo();
            this.updateProgress();
            this.selectWord();
        } else if (
            this.word[0] === keypressed &&
            this.word.length === 1 &&
            this.typeWords.length - 1 === this.wordsTyped
        ) {
            this.wordsTyped++;
            this.upDateInfo();
            this.updateProgress();
            this.endGame();
        } else if (this.word[0] !== keypressed) {
            const el = document.getElementById("word");
            el.style.color = "var(--accent)";
            setTimeout(() => {
                el.style.color = "";
            }, 110);
        }
    }

    endGame() {
        this.gameOver = true;
        this.endTime = performance.now();
        this.score = ((this.endTime - this.startTime) / 1000).toFixed(2);
        this.stopGameAmbience();
        this.playSafe(this.audioEnd);
        window.removeEventListener("keypress", this.keyListener);
        document.getElementById("word").textContent = "Mäng läbi.";
        this.lastSessionWpm = this.wpmFromSession();
        const tier = this.tierFromWpm(this.lastSessionWpm);
        this.lastTierLabel = tier.label;
        this.fillModalPreview(tier);
        document.getElementById("showResultsBtn").classList.remove("is-hidden");
        this.persistScore();
    }

    fillModalPreview(tier) {
        document.getElementById("resultName").textContent = this.name;
        document.getElementById("resultTime").textContent = `${this.score} s`;
        document.getElementById("resultWordCount").textContent = String(this.wordsInGame);
        document.getElementById("resultWpm").textContent = `${this.lastSessionWpm} wpm`;
        document.getElementById("resultTier").textContent = tier.label;
        const img = document.getElementById("speedTierImage");
        img.src = tier.img;
        img.alt = tier.label;
        document.getElementById("speedCaption").textContent = tier.note;
    }

    openModal() {
        const modal = document.getElementById("modal");
        modal.classList.remove("is-hidden");
        const tier = this.tierFromWpm(this.lastSessionWpm);
        this.fillModalPreview(tier);
    }

    closeModal() {
        document.getElementById("modal").classList.add("is-hidden");
    }

    async getPhpSaveReady() {
        if (this.phpSaveReady !== null) {
            return this.phpSaveReady;
        }
        try {
            const r = await fetch("server.php?ping=1", { cache: "no-store" });
            const t = await r.text();
            this.phpSaveReady = r.ok && t.trim() === "ok";
        } catch {
            this.phpSaveReady = false;
        }
        return this.phpSaveReady;
    }

    async persistScore() {
        await this.loadResultsFromFile();
        const timeNum = parseFloat(this.score);
        const entry = { name: this.name, time: this.score };
        this.results = this.mergeStored(this.results, [entry]);
        const rank = this.results.findIndex(
            (r) => r.name === this.name && parseFloat(r.time) === timeNum
        );
        if (rank >= 0 && rank < 20) {
            this.playSafe(this.audioBoard);
        }
        const canPost = await this.getPhpSaveReady();
        let posted = false;
        if (canPost) {
            try {
                const res = await fetch("server.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: "save=" + encodeURIComponent(JSON.stringify(this.results))
                });
                posted = res.ok;
            } catch {
                posted = false;
            }
        }
        if (!posted) {
            try {
                localStorage.setItem(this.scoreStoreKey, JSON.stringify(this.results));
            } catch {
            }
        }
        this.loadResults(this.results.slice(0, 20));
    }

    selectWord() {
        this.word = this.typeWords[this.wordsTyped];
        this.drawWord();
    }

    drawWord() {
        document.getElementById("word").textContent = this.word;
    }

    upDateInfo() {
        document.getElementById("wordcount").textContent =
            `Sõnu trükitud: ${this.wordsTyped}/${this.wordsInGame}`;
    }
}

new Typer();
