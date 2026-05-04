class Typer {
    constructor() {
        this.name = "";
        this.user = null;

        this.auth = firebase.auth();
        this.db = firebase.database();
        this.provider = new firebase.auth.GoogleAuthProvider();

        this.wordsInGame = 5;
        this.startTime = 0;
        this.endTime = 0;
        this.wordsTyped = 0;
        this.totalChars = 0;
        this.lives = 5;
        
        this.word = "";
        this.words = [];
        this.typeWords = [];
        this.results = [];

        this.sounds = {
            start: new Audio('assets/start.mp3'),
            key: new Audio('assets/key.mp3'),
            end: new Audio('assets/end.mp3'),
            top: new Audio('assets/top.mp3')
        };

        this.initAuth();
        this.initControls();
        this.initModal();
        this.loadFromFile();
        this.loadResultsFromFirebase();
    }

    initAuth() {
        const loginBtn = document.getElementById("googleLogin");
        if (loginBtn) {
            loginBtn.addEventListener("click", () => {
                this.auth.signInWithPopup(this.provider)
                    .then((result) => this.handleUser(result.user))
                    .catch((error) => console.error("Login error:", error));
            });
        }

        this.auth.onAuthStateChanged((user) => {
            if (user) this.handleUser(user);
        });
    }

    handleUser(user) {
        if (this.user) return;
        this.user = user;
        this.name = user.displayName;
        document.getElementById("name").style.display = "none";
        document.getElementById("googleLogin").style.display = "none";
        document.getElementById("submitname").style.display = "inline-block";
        document.getElementById("logout").style.display = "inline-block";
        this.startCountdown();
    }

    initControls() {
        document.getElementById("restart").addEventListener("click", () => location.reload());
        const logoutBtn = document.getElementById("logout");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                this.auth.signOut();
                location.reload();
            });
        }
        
        document.getElementById("submitname").addEventListener("click", () => {
            if (this.user) return;
            const inputName = document.getElementById("username").value;
            if(inputName.length > 1) {
                this.name = inputName;
                this.startCountdown();
            } else {
                alert("Palun sisesta nimi!");
            }
        });
    }

    initModal() {
        const modal = document.getElementById("resultsModal");
        const btn = document.getElementById("showResultsBtn");
        const span = document.getElementsByClassName("close-modal")[0];

        btn.onclick = () => modal.style.display = "block";
        span.onclick = () => modal.style.display = "none";
        window.onclick = (event) => {
            if (event.target == modal) modal.style.display = "none";
        };
    }

    async loadFromFile() {
        try {
            const response = await fetch("lemmad2013.txt");
            const text = await response.text();
            const words = text.split("\n");
            this.separateWordsByLength(words);
        } catch (err) {
            console.error("Faili laadimine ebaõnnestus, kasutan asendussõnu.");
            this.separateWordsByLength(["tere", "kool", "auto", "majas", "tarkvara", "programmeerimine"]);
        }
    }

    separateWordsByLength(words) {
        for (let word of words) {
            const len = word.trim().length;
            if (len > 0) {
                if (!this.words[len]) this.words[len] = [];
                this.words[len].push(word.trim());
            }
        }
    }

    startCountdown() {
        this.sounds.start.play();
        document.getElementById("name").style.display = "none";
        document.getElementById("counter").style.display = "flex";
        let i = 3;
        const countdown = setInterval(() => {
            document.getElementById("time").innerHTML = i;
            i--;
            if (i < 0) {
                clearInterval(countdown);
                document.getElementById("counter").style.display = "none";
                this.startTyper();
            }
        }, 1000);
    }

    startTyper() {
        this.generateWords();
        document.getElementById("game-area").style.display = "block";
        this.startTime = performance.now();
        this.keyListener = (e) => this.shortenWord(e.key);
        window.addEventListener("keypress", this.keyListener);
    }

    shortenWord(key) {
        this.sounds.key.currentTime = 0;
        this.sounds.key.play();

        if (this.word[0] === key) {
            this.totalChars++;
            
            if (this.word.length > 1) {
                this.sounds.key.play();
                this.word = this.word.slice(1);
                this.drawWord();
            } else {
                this.wordsTyped++;
                this.updateProgressBar();
                this.updateLiveWPM();
                this.updateWordCount();

                if (this.wordsTyped < this.typeWords.length) {
                    this.selectWord();
                } else {
                    this.word = "";
                    this.drawWord();
                    
                    setTimeout(() => {
                        this.endGame();
                    }, 100);
                }
            }
        } else {
            this.handleMistake();
        }
    }

    updateWordCount() {
        const wordCountEl = document.getElementById("wordcount");
        if (wordCountEl) {
            wordCountEl.innerText = `Sõnu: ${this.wordsTyped}/${this.wordsInGame}`;
        }
    }
    
    handleMistake() {
        this.lives--;
        const livesEl = document.getElementById("lives-display");
        livesEl.innerHTML = `Elud: ${"❤️".repeat(this.lives)}${"🖤".repeat(5 - this.lives)}`;
        
        const wordEl = document.getElementById("word");
        wordEl.style.color = "red";
        setTimeout(() => wordEl.style.color = "white", 150);

        if (this.lives <= 0) {
            this.endGame(true);
        }
    }

    updateProgressBar() {
        const percent = (this.wordsTyped / this.wordsInGame) * 100;
        document.getElementById("progress-fill").style.width = percent + "%";
    }

    updateLiveWPM() {
        const timePassed = (performance.now() - this.startTime) / 60000;
        const wpm = Math.round((this.totalChars / 5) / timePassed);
        document.getElementById("live-wpm").innerText = `WPM: ${wpm || 0}`;
    }

    generateWords() {
        for (let i = 0; i < this.wordsInGame; i++) {
            const len = 4 + i;
            const wordList = this.words[len] || this.words[4];
            const randomIndex = Math.floor(Math.random() * wordList.length);
            this.typeWords[i] = wordList[randomIndex];
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

    endGame(failed = false) {
        window.removeEventListener("keypress", this.keyListener);
        this.endTime = performance.now();
        this.sounds.end.play();

        const finalScore = ((this.endTime - this.startTime) / 1000).toFixed(2);
        const wpm = Math.round((this.totalChars / 5) / (finalScore / 60));

        if (failed) {
            document.getElementById("word").innerHTML = "MÄNG LÄBI! Elud said otsa.";
        } else {
            this.showRank(wpm);
            this.saveResult(finalScore, wpm);
        }
        
        document.getElementById("resultsModal").style.display = "block";
    }

    showRank(wpm) {
        const img = document.getElementById("rank-img");
        const text = document.getElementById("rank-text");
        img.style.display = "block";

        if (wpm < 30) {
            img.src = "assets/snail.png";
            text.innerText = `Sinu kiirus: ${wpm} WPM (Aeglane nagu tigu!)`;
        } else if (wpm < 60) {
            img.src = "assets/rabbit.png";
            text.innerText = `Sinu kiirus: ${wpm} WPM (Tubli jänes!)`;
        } else {
            img.src = "assets/cheetah.png";
            text.innerText = `Sinu kiirus: ${wpm} WPM (Kiire nagu gepard!)`;
        }
    }

    loadResultsFromFirebase() {
        this.db.ref("results").on("value", snapshot => {
            const data = snapshot.val();
            if (!data) return;
            this.results = Object.values(data);
            this.results.sort((a, b) => a.time - b.time);
            this.results = this.results.slice(0, 20);
            this.renderResults();
        });
    }

    renderResults() {
        const list = document.getElementById("results-list");
        list.innerHTML = `
            <div class="result-item" style="font-weight:bold; border-bottom:2px solid #e94560">
                <span>Koht</span><span>Nimi</span><span>Aeg</span><span>WPM</span>
            </div>`;

        this.results.forEach((res, i) => {
            const row = document.createElement("div");
            row.className = "result-item";
            row.innerHTML = `
                <span>${i + 1}.</span>
                <span>${res.name}</span>
                <span>${res.time}s</span>
                <span>${res.wpm || '-'}</span>
            `;
            list.appendChild(row);
        });
    }

    async saveResult(score, wpm) {
        if (!this.name) return;
        const result = {
            name: this.name,
            time: parseFloat(score),
            wpm: wpm,
            date: new Date().toISOString()
        };

        if (this.results.length < 3 || result.time < this.results[2].time) {
            this.sounds.top.play();
        }

        try {
            await this.db.ref("results").push(result);
        } catch (err) {
            console.error("Salvestamine ebaõnnestus:", err);
        }
    }
}

window.addEventListener("DOMContentLoaded", () => {
    new Typer();
});

