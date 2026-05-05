const firebaseConfig = {
    apiKey: "AIzaSyD6JjdGgwmLeL2b2VMwxuFYphTSekDK3LE",
    authDomain: "typer-ff39d.firebaseapp.com",
    projectId: "typer-ff39d",
    storageBucket: "typer-ff39d.firebasestorage.app",
    messagingSenderId: "67474472431",
    appId: "1:67474472431:web:60cf5198af37b6f8504a1a",
    measurementId: "G-DKQSR8QZ37",
    databaseURL: "https://typer-ff39d-default-rtdb.europe-west1.firebasedatabase.app" 
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

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
        this.errors = 0; 
        this.results = [];

        // Helid
        this.sounds = {
            start: document.getElementById('sound-start'),
            key: document.getElementById('sound-key'),
            end: document.getElementById('sound-end'),
            win: document.getElementById('sound-win')
        };

        this.initButtons();
        this.setupAuth();
        this.loadWords();
        this.listenToDatabase();
        this.initTheme();
    }

    initTheme() {
        document.getElementById('theme-toggle').onclick = () => {
            document.body.classList.toggle('dark-mode');
        };
    }

    initButtons() {
        document.getElementById("login-btn")?.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider);
        });

        document.getElementById("submitname").addEventListener('click', () => {
            // Proovime heli mängida kohe nupuvajutusel
            if(this.sounds.start) this.sounds.start.play().catch(e => console.log("Heli viga:", e));
            this.startCountdown();
        });

        document.getElementById("logout-btn")?.addEventListener('click', () => auth.signOut());

        const modal = document.getElementById("resultsModal");
        document.getElementById("open-scores").onclick = () => modal.style.display = "block";
        document.querySelector(".close").onclick = () => modal.style.display = "none";

        const restartBtn = document.createElement('button');
        restartBtn.className = "btn";
        restartBtn.textContent = "Uuesti";
        restartBtn.style.display = "none";
        restartBtn.style.marginTop = "20px";
        restartBtn.addEventListener('click', () => this.restartGame());
        document.getElementById("wordContainer").appendChild(restartBtn);
    }

    getSpeedInfo(wpm) {
        if (wpm < 30) return { img: "🐌", title: "Tigu" };
        if (wpm < 50) return { img: "⌨️", title: "Kirjutaja" };
        if (wpm < 75) return { img: "🚀", title: "Kiire" };
        return { img: "⚡", title: "Välk" };
    }

    setupAuth() {
        auth.onAuthStateChanged(user => {
            if (user) {
                this.name = user.displayName;
                document.getElementById("auth-container").style.display = "none";
                document.getElementById("name").style.display = "flex";
                document.getElementById("user-display-name").textContent = this.name;
            } else {
                document.getElementById("auth-container").style.display = "flex";
                document.getElementById("name").style.display = "none";
            }
        });
    }

    async loadWords() {
        try {
            const response = await fetch("lemmad2013.txt");
            const data = await response.text();
            const allWords = data.split("\n");
            allWords.forEach(word => {
                const len = word.trim().length;
                if (len > 0) {
                    if (!this.words[len]) this.words[len] = [];
                    this.words[len].push(word.trim());
                }
            });
        } catch (err) { console.error("Sõnastik puudu!"); }
    }

    listenToDatabase() {
        db.ref("scores").orderByChild("time").limitToFirst(20).on("value", (snapshot) => {
            this.results = [];
            snapshot.forEach(child => { this.results.push(child.val()); });
            this.loadResults();
        });
    }

    loadResults() {
        const resultDiv = document.getElementById("results");
        resultDiv.innerHTML = "";
        this.results.forEach((res, i) => {
            const info = this.getSpeedInfo(res.wpm || 0);
            const row = document.createElement("div");
            row.className = "results-row";
            row.innerHTML = `
                <span>${i + 1}.</span>
                <span>${res.name}</span>
                <span>${res.time}s</span>
                <span>${info.img}</span>
            `;
            resultDiv.appendChild(row);
        });
    }

    startCountdown() {
        this.errors = 0;
        document.getElementById("live-errors").textContent = "Vigu: 0";
        document.getElementById("name").style.display = "none";
        document.getElementById("counter").style.display = "flex";
        let i = 3;
        document.getElementById("time").textContent = i;
        let countdown = setInterval(() => {
            i--;
            document.getElementById("time").textContent = i;
            if (i === 0) {
                document.getElementById("counter").style.display = "none";
                this.startTyper();
                clearInterval(countdown);
            }
        }, 1000);
    }

    startTyper() {
        this.wordsTyped = 0;
        this.generateWords();
        this.upDateInfo();
        document.getElementById("info").style.display = "flex";
        document.getElementById("wordContainer").style.display = "flex";
        document.querySelector("#wordContainer button").style.display = "none";
        this.startTime = performance.now();
        this.keyListener = (e) => this.shortenWord(e.key);
        window.addEventListener("keypress", this.keyListener);
    }

    shortenWord(keypressed) {
        if (this.word[0] === keypressed) {
            if(this.sounds.key) {
                this.sounds.key.currentTime = 0;
                this.sounds.key.play().catch(() => {});
            }
            this.word = this.word.slice(1);
            if (this.word.length === 0) {
                this.wordsTyped++;
                if (this.wordsTyped < this.wordsInGame) {
                    this.selectWord();
                } else {
                    this.endGame();
                }
            }
            this.drawWord();
            this.upDateInfo();
            this.updateLiveWPM();
        } else {
            this.errors++;
            document.getElementById("live-errors").textContent = `Vigu: ${this.errors}`;
            document.getElementById("word").style.color = "red";
            setTimeout(() => { document.getElementById("word").style.color = "inherit"; }, 100);
        }
    }

    updateLiveWPM() {
        const timeSoFar = (performance.now() - this.startTime) / 60000;
        const wpm = Math.round(this.wordsTyped / (timeSoFar || 0.01));
        document.getElementById("live-wpm").textContent = `WPM: ${wpm}`;
    }

    generateWords() {
        this.typeWords = [];
        for (let i = 0; i < this.wordsInGame; i++) {
            const len = 4 + i; 
            const list = this.words[len] || this.words[4];
            const randomIndex = Math.floor(Math.random() * list.length);
            this.typeWords.push(list[randomIndex]);
        }
        this.selectWord();
    }

    selectWord() {
        this.word = this.typeWords[this.wordsTyped];
        this.drawWord();
    }

    drawWord() { document.getElementById("word").innerHTML = this.word; }

    upDateInfo() {
        document.getElementById("wordcount").innerHTML = `Sõnad: ${this.wordsTyped}/${this.wordsInGame}`;
    }

    endGame() {
        this.endTime = performance.now();
        if(this.sounds.end) this.sounds.end.play().catch(() => {});
        window.removeEventListener("keypress", this.keyListener);
        this.score = ((this.endTime - this.startTime) / 1000).toFixed(2);
        
        const wpm = Math.round(this.wordsInGame / ((this.endTime - this.startTime) / 60000));
        const info = this.getSpeedInfo(wpm);
        
        document.getElementById("word").innerHTML = `Mäng läbi! ${info.img}<br>Kiirus: ${wpm} WPM`;
        document.querySelector("#wordContainer button").style.display = "block";
        
        this.saveResult(wpm);
    }

    async saveResult(wpm) {
        const result = {
            name: this.name,
            time: parseFloat(this.score),
            wpm: wpm,
            errors: this.errors
        };
        try {
            await db.ref("scores").push(result);
            if(this.sounds.win) this.sounds.win.play().catch(() => {});
        } catch (err) { console.error(err); }
    }

    restartGame() {
        document.getElementById("wordContainer").style.display = "none";
        document.getElementById("info").style.display = "none";
        document.getElementById("name").style.display = "flex";
        document.getElementById("word").textContent = "";
        document.getElementById("live-wpm").textContent = "WPM: 0";
    }
}

const typer = new Typer();