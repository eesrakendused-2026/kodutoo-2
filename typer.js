class Typer {
    constructor() {
        this.name = "";
        this.wordsInGame = 5;
        this.wordsTyped = 0;
        this.typeWords = [];
        this.results = [];
        this.startTime = 0;
        this.errorCount = 0;
        this.timerInterval = null;
        this.isMuted = false;
        this.gameEnded = false;
        this.handler = null;
        this.currentWord = null;

        this.countdownAudio = new Audio('audio/countdown.mp3');
        this.backgroundMusic = new Audio('audio/backgroundmusic.mp3');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.5;
        this.endAudio = new Audio('audio/finish.mp3');

        this.init();
        this.tryStartMusic();
    }

    init() {
        this.loadResultsFromFile();

        const soundOnIcon = "https://img.icons8.com/ios-filled/50/ffffff/high-volume--v1.png";
        const soundOffIcon = "https://img.icons8.com/ios-filled/50/ffffff/mute--v1.png";

        const muteBtn = document.getElementById("muteControl");
        const muteImg = document.getElementById("muteIcon");

        if (muteBtn) {
            muteBtn.onclick = () => {
                this.isMuted = !this.isMuted;

                const vol = this.isMuted ? 0 : 0.5;
                this.backgroundMusic.volume = vol;
                this.countdownAudio.volume = this.isMuted ? 0 : 1;
                this.endAudio.volume = this.isMuted ? 0 : 1;

                if (muteImg) {
                    muteImg.src = this.isMuted ? soundOffIcon : soundOnIcon;
                }
            };
        }

        document.getElementById("openModalBtn").onclick = () => {
            document.getElementById("resultsModal").style.display = "block";
        };

        document.getElementById("submitname").onclick = () => this.askName();

        document.getElementById("newGameBtn").addEventListener("click", () => {
            this.resetGame();
        });

        document.addEventListener("click", (e) => {
            if (e.target.classList.contains("delete-btn")) {
                const index = e.target.dataset.index;
                this.deleteResult(Number(index));
            }
        });
    }

    tryStartMusic() {
        this.backgroundMusic.play().catch(() => {
            const startOnClick = () => {
                if (!this.isMuted) {
                    this.backgroundMusic.play();
                }
                document.removeEventListener("click", startOnClick);
            };
            document.addEventListener("click", startOnClick);
        });
    }

    resetGame() {
        clearInterval(this.timerInterval);

        if (this.handler) {
            window.removeEventListener("keydown", this.handler);
            this.handler = null;
        }

        this.backgroundMusic.currentTime = 0;

        this.endAudio.pause();
        this.endAudio.currentTime = 0;

        this.wordsTyped = 0;
        this.errorCount = 0;
        this.typeWords = [];
        this.gameEnded = false;
        this.name = "";
        this.currentWord = null;

        document.getElementById("resultsModal").style.display = "none";
        document.getElementById("counter").style.display = "none";
        document.getElementById("info").style.display = "none";
        document.getElementById("wordContainer").style.display = "none";
        document.getElementById("name").style.display = "block";

        document.getElementById("username").value = "";
        document.getElementById("timerDisplay").innerHTML = "0.00";
        document.getElementById("errors").innerHTML = "Vigu: 0";
        document.getElementById("word").innerHTML = "";
        document.getElementById("wordcount").innerHTML = "Sõna: 0 / 0";

        document.getElementById("ratingText").innerHTML = "";
        document.getElementById("ratingImg").style.display = "none";
    }

    askName() {
        this.name = document.getElementById("username").value;

        if (this.name.trim().length > 1) {
            document.getElementById("name").style.display = "none";
            this.startCountdown();
        }
    }

    startCountdown() {
        const counterDiv = document.getElementById("counter");
        const timeSpan = document.getElementById("time");

        counterDiv.style.display = "block";

        let i = 3;
        timeSpan.innerHTML = i;

        if (!this.isMuted) {
            this.countdownAudio.play().catch(() => {});
        }

        let interval = setInterval(() => {
            i--;
            if (i > 0) {
                timeSpan.innerHTML = i;
            } else {
                clearInterval(interval);
                counterDiv.style.display = "none";
                this.startTyper();
            }
        }, 1000);
    }

    async startTyper() {
        try {
            const resp = await fetch("lemmad2013.txt");
            const text = await resp.text();
            const allWords = text.split("\n");

            this.typeWords = [];

            for (let i = 0; i < this.wordsInGame; i++) {
                let randomWord = allWords[Math.floor(Math.random() * allWords.length)].trim();
                if (randomWord.length > 0) {
                    this.typeWords.push(randomWord);
                } else {
                    i--;
                }
            }

            document.getElementById("info").style.display = "flex";
            document.getElementById("wordContainer").style.display = "block";

            this.startTime = performance.now();

            this.timerInterval = setInterval(() => {
                const elapsed = (performance.now() - this.startTime) / 1000;
                document.getElementById("timerDisplay").innerHTML = elapsed.toFixed(2);
            }, 16);

            this.showNext();

            this.handler = (e) => this.checkChar(e);
            window.addEventListener("keydown", this.handler);

        } catch (err) {
            console.error("Sõnu pole:", err);
        }
    }

    showNext() {
        this.currentWord = this.typeWords[this.wordsTyped];

        document.getElementById("word").innerHTML = this.currentWord;
        document.getElementById("wordcount").innerHTML =
            `Sõna: ${this.wordsTyped + 1} / ${this.wordsInGame}`;
    }

    checkChar(e) {
        if (this.gameEnded || !this.currentWord) return;

        if (this.currentWord[0].toLowerCase() === e.key.toLowerCase()) {
            this.currentWord = this.currentWord.slice(1);

            if (this.currentWord.length === 0) {
                this.wordsTyped++;

                if (this.wordsTyped < this.wordsInGame) {
                    this.showNext();
                } else {
                    this.endGame();
                }

            } else {
                document.getElementById("word").innerHTML = this.currentWord;
            }

        } else {
            this.errorCount++;
            document.getElementById("errors").innerHTML = `Vigu: ${this.errorCount}`;

            document.body.classList.remove("error-flash");
            void document.body.offsetWidth;
            document.body.classList.add("error-flash");

            setTimeout(() => {
                document.body.classList.remove("error-flash");
            }, 100);
        }
    }

    endGame() {
        if (this.gameEnded) return;
        this.gameEnded = true;

        if (!this.isMuted) this.endAudio.play();

        if (typeof confetti === 'function') {
            confetti({
                origin: { y: 0.7 },
                particleCount: 100,
                spread: 70
            });
        }

        window.removeEventListener("keydown", this.handler);
        clearInterval(this.timerInterval);

        document.getElementById("wordContainer").style.display = "none";
        document.getElementById("info").style.display = "none";

        const finalTime = (performance.now() - this.startTime) / 1000;

        this.showSpeedRating(finalTime.toFixed(2), this.errorCount);
    }

    showSpeedRating(seconds, errors) {
        const img = document.getElementById("ratingImg");
        const txt = document.getElementById("ratingText");

        img.style.display = "block";

        let rating = "";
        let iconUrl = "";
        const s = parseFloat(seconds);

        if (s < 12) {
            rating = "RAKETT 🚀";
            iconUrl = "https://img.icons8.com/color/96/rocket.png";
        } else if (s <= 20) {
            rating = "AUTO 🚗";
            iconUrl = "https://img.icons8.com/color/96/car--v1.png";
        } else {
            rating = "TIGU 🐌";
            iconUrl = "https://img.icons8.com/color/96/snail.png";
        }

        img.src = iconUrl;

        txt.innerHTML = `
            <div class="rating-label">TULEMUS:</div>
            <div class="rating-title">${rating}</div>
            <div class="rating-stats">Aeg: ${seconds}s | Vigu: ${errors}</div>
        `;

        this.saveResult(this.name, seconds, errors);

        document.getElementById("resultsModal").style.display = "block";
    }

    async saveResult(name, time, errors) {
        let res = { name, time, errors };

        this.results.push(res);
        this.results.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
        this.results = this.results.slice(0, 10);

        const formData = new FormData();
        formData.append('save', JSON.stringify(this.results));

        await fetch("server.php", {
            method: "POST",
            body: formData
        });

        this.renderTable();
    }

    renderTable() {
        let html = `<table>
            <tr>
                <th>#</th>
                <th>Tase</th>
                <th>Nimi</th>
                <th>Aeg</th>
                <th>Vigu</th>
                <th></th>
            </tr>`;

        if (this.results.length === 0) {
            html += `<tr><td colspan="6">Pole veel tulemusi</td></tr>`;
        }

        this.results.forEach((r, i) => {
            const s = parseFloat(r.time);

            let icon = "https://img.icons8.com/color/48/snail.png";
            if (s < 12) icon = "https://img.icons8.com/color/48/rocket.png";
            else if (s <= 20) icon = "https://img.icons8.com/color/48/car--v1.png";

            html += `<tr>
                <td>${i + 1}.</td>
                <td><img src="${icon}" width="24"></td>
                <td>${r.name}</td>
                <td>${s.toFixed(2)}s</td>
                <td>${r.errors}</td>
                <td>
                    <span class="delete-btn" data-index="${i}" style="cursor:pointer;color:red;">&times;</span>
                </td>
            </tr>`;
        });

        document.getElementById("results").innerHTML = html + "</table>";
    }

    async deleteResult(index) {
        if (confirm("Kas oled kindel?")) {
            this.results.splice(index, 1);
            this.renderTable();

            const formData = new FormData();
            formData.append('save', JSON.stringify(this.results));

            await fetch("server.php", {
                method: "POST",
                body: formData
            });
        }
    }

    async loadResultsFromFile() {
        try {
            const r = await fetch("server.php");
            const text = await r.text();

            try {
                const data = JSON.parse(text);
                this.results = data.content ? JSON.parse(data.content) : [];
            } catch {
                this.results = [];
            }

            this.renderTable();
        } catch {
            console.error("Laadimine ebaõnnestus");
        }
    }
}

window.typer = new Typer();