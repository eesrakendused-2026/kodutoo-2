console.log("Töötab");
 
class Typer {
    constructor() {
        this.name = "";
        this.words = [];
        this.currentWord = "";
        this.wordsTyped = 0;
        this.startTime = 0;
        this.endTime = 0;
        this.timeLeft = 0;
        this.timer = null;
        this.results = [];
        this.lastWpm = 0;
        this.selectedDuration = 0;
        this.typeSound  = new Audio("sound/type.mp3");
        this.typeSound.loop = true;
        this.startSound = new Audio("sound/start.mp3");
        this.endSound   = new Audio("sound/end.mp3");
        this.winSound   = new Audio("sound/win.mp3");
        this.init();
    }

    async init() {
        await this.loadWords();
        await this.loadResultsFromFile();
        this.bindUI();
    }

    bindUI() {
        document.getElementById("startBtn").onclick = () =>
            this.startGame();
        // https://www.w3schools.com/howto/howto_js_toggle_class.asp

        document.getElementById("themeToggle").onclick = () => {
            document.body.classList.toggle("dark");
            const btn = document.getElementById("themeToggle");
            btn.textContent = btn.textContent === "🌙" ? "☀️" : "🌙";
        };

        document.getElementById("showResults").onclick = () =>
            this.openModal(false);

        document.getElementById("close").onclick = () =>
            this.closeModal();
    }
 
    async loadWords() {
        const res  = await fetch("lemmad2013.txt");
        const text = await res.text();
 
        this.words = text
            .split("\n")
            .map(w => w.trim())
            .filter(w => w.length > 0);
    }
 
    async loadResultsFromFile() {
        try {
            const res = await fetch("database.txt");
            const text = await res.text();
            const parsed = JSON.parse(text);
            this.results = JSON.parse(parsed.content) || [];
        } catch {
            this.results = [];
        }
 
        this.renderResults();
    }
 
    getWord() {
        const difficulty = document.getElementById("difficulty").value;
 
        let pool;
        if (difficulty === "easy") {
            pool = this.words.filter(w => w.length <= 3);
        } else if (difficulty === "medium") {
            pool = this.words.filter(w => w.length <= 5);
        } else {
            pool = this.words;
        }
        return pool[Math.floor(Math.random() * pool.length)];
    }
 
    startGame() {
        const input = document.getElementById("mainInput");
        if (input.value) this.name = input.value;
        if (!this.name) return;
        input.value = "";
        input.placeholder = "Kirjuta sõna...";
        input.focus();
        this.wordsTyped  = 0;
        this.startTime   = performance.now();
        this.currentWord = this.getWord();
        this.drawWord();
        if (this.timer) clearInterval(this.timer);
        this.startTimer();
        this.startSound.play();
        this.typeSound.play();
        input.oninput = (e) => this.handleInput(e);
    }
 
    startTimer() {
        this.timeLeft = parseInt(
            document.getElementById("duration").value
        );
        this.selectedDuration = this.timeLeft;
        document.getElementById("countdown").innerText = this.timeLeft;
 
        // https://developer.mozilla.org/en-US/docs/Web/API/setInterval
        this.timer = setInterval(() => {
            this.timeLeft--;
            document.getElementById("countdown").innerText = this.timeLeft;
 
            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.endGame();
            }
        }, 1000);
    }
 
    handleInput(e) {
        if (e.target.value === this.currentWord) {
            this.wordsTyped++;
            e.target.value   = "";
            this.currentWord = this.getWord();
            this.drawWord();
        }
    }
 
    drawWord() {
        document.getElementById("word").innerText = this.currentWord;
        document.getElementById("wordcount").innerText =
            `Sõnu: ${this.wordsTyped}`;
    }
 
    endGame() {
        this.endTime  = performance.now();
        const seconds = (this.endTime - this.startTime) / 1000;
        this.lastWpm  = Math.round((this.wordsTyped / seconds) * 60);
 
        const isHighScore = !this.results.length ||
            this.lastWpm > Math.max(...this.results.map(r => r.wpm));
 
        if (isHighScore) {
            this.winSound.play();
        } else {
            this.endSound.play();
        }
 
        this.typeSound.pause();
        this.typeSound.currentTime = 0;
 
        this.showResult();
        this.saveResult();
    }

    // https://www.typingpal.com/en/blog/good-typing-speed
    showResult() {
        const img = this.lastWpm < 40 ? "slow.png"
                  : this.lastWpm < 70 ? "average.png"
                  : "fast.png";
 
        document.getElementById("resultDetails").innerHTML = `
            <h2>${this.name}</h2>
            <p>WPM: ${this.lastWpm}</p>
            <p>Sõnu: ${this.wordsTyped}</p>
        `;
 
        document.getElementById("speedImage").src = img;
        this.openModal(true);
    }

    // https://www.w3schools.com/howto/howto_css_modals.asp
    openModal(showResult) {
        if (!showResult) {
            document.getElementById("resultDetails").innerHTML = "";
            document.getElementById("speedImage").src = "";
        }
        document.getElementById("modal").style.display = "flex";
    }
 
    closeModal() {
        document.getElementById("modal").style.display = "none";
    }
 
    renderResults() {
        const el = document.getElementById("results");
        el.innerHTML = "";
 
        [...this.results]
            .sort((a, b) => b.wpm - a.wpm)
            .slice(0, 10)
            .forEach((r, i) => {
                const div = document.createElement("div");
                div.className = "lbRow";
                div.innerHTML = `
                    <span class="lbRank">#${i + 1}</span>
                    <span class="lbName">${r.name}</span>
                    <span class="lbWpm">${r.wpm} WPM</span>
                    <span class="lbTime">${r.duration}s</span>
                `;
                el.appendChild(div);
            });
    }
 
    async saveResult() {
        const newResult = {
            name: this.name,
            wpm: this.lastWpm,
            duration: this.selectedDuration
        };
 
        this.results.push(newResult);
        this.results.sort((a, b) => b.wpm - a.wpm);
 
        try {
            await fetch("server.php", {
                method:  "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: "save=" + encodeURIComponent(
                    JSON.stringify(this.results)
                )
            });
        } catch (err) {
            console.warn("Salvestamine ebaõnnestus:", err);
        }
 
        this.renderResults();
    }
}
 
new Typer();