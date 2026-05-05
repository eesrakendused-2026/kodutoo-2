

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get, push } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBjGfDt0iZsjwk-D9yToC3LHzMx7y5x5RU",
    authDomain: "typer-add.firebaseapp.com",
    projectId: "typer-add",
    storageBucket: "typer-add.firebasestorage.app",
    messagingSenderId: "214276279054",
    appId: "1:214276279054:web:8f4330cb69f4e0c224255f",
    measurementId: "G-KGWMMXZR8B",
    databaseURL: "https://typer-add-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);


const SPEED_LEVELS = [
    { maxWPM: 10, label: "Algaja",        desc: "Alla 10 WPM — alles alustad. Harjuta edasi!" },
    { maxWPM: 20, label: "Aeglane",        desc: "10–20 WPM — aeglane, aga stabiilne. Jätka!" },
    { maxWPM: 35, label: "Rahuliku tempo", desc: "20–35 WPM — keskmisest aeglasem. Tuleb juurde!" },
    { maxWPM: 50, label: "Keskmine",       desc: "35–50 WPM — täiesti tavaline trükkimiskiirus." },
    { maxWPM: 70,  label: "Kiire",          desc: "50–70 WPM — üle keskmise. Hästi tehtud!" },
    { maxWPM: 100,  label: "Väga kiire",     desc: "70–100 WPM — professionaalne tase. Suurepärane!" },
    { maxWPM: Infinity, label: "Masin",     desc: "100+ WPM — sa oled tõeline trükkimismasin!" }
];

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
        this.results = [];
        this.loggedIn = false;
        this.keyListener = null;
        this.colorTimeout = null;
        this.liveTimerInterval = null;

        this.initSidebar();
        this.initButtons();
        this.loadFromFile();
    }

    //Chatgpt aitas selle osa kirjutamisega
    initSidebar() {
        const sidebar = document.getElementById("sidebar");
        const overlay = document.getElementById("sidebarOverlay");
        const openBtn = document.getElementById("openSidebar");
        const closeBtn = document.getElementById("closeSidebar");

        openBtn.addEventListener("click", () => {
            sidebar.classList.add("open");
            overlay.classList.add("active");
        });

        closeBtn.addEventListener("click", () => {
            sidebar.classList.remove("open");
            overlay.classList.remove("active");
        });

        overlay.addEventListener("click", () => {
            sidebar.classList.remove("open");
            overlay.classList.remove("active");
        });
    }

    initButtons() {
        
        document.getElementById("googleLoginBtn").addEventListener("click", async () => {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: "select_account" });
            try {
                await signInWithPopup(auth, provider);
            } catch (err) {
                alert("Sisselogimine ebaõnnestus: " + err.message);
            }
        });

        
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.name = user.displayName || user.email;
                this.loggedIn = true;
                document.getElementById("googleLoginBtn").style.display = "none";
                document.getElementById("loggedInInfo").style.display = "block";
                document.getElementById("loggedInName").textContent = "✓ " + this.name;
                document.getElementById("difficultySelect").style.display = "block";
                document.getElementById("submitname").style.display = "inline-flex";
            }
        });

        
        document.getElementById("submitname").addEventListener("click", () => {
            if (!this.loggedIn) return;
            document.querySelector("#name").style.display = "none";
            document.getElementById("scoreCard").style.display = "none";
            this.startCountdown();
        });

        
        document.getElementById("restartBtn").addEventListener("click", () => {
            this.resetGame();
            document.getElementById("endButtons").style.display = "none";
            document.getElementById("wordContainer").style.display = "none";
            document.getElementById("scoreCard").style.display = "none";
            this.startCountdown();
        });

        
        document.getElementById("switchUserBtn").addEventListener("click", async () => {
            this.loggedIn = false;
            this.resetGame();
            if (this.keyListener) {
                window.removeEventListener("keypress", this.keyListener);
                this.keyListener = null;
            }
            this.stopLiveTimer();
            await signOut(auth);

            document.getElementById("endButtons").style.display = "none";
            document.getElementById("wordContainer").style.display = "none";
            document.getElementById("info").style.display = "none";
            document.getElementById("scoreCard").style.display = "none";
            document.getElementById("name").style.display = "flex";
            document.getElementById("loggedInInfo").style.display = "none";
            document.getElementById("difficultySelect").style.display = "none";
            document.getElementById("submitname").style.display = "none";
            document.getElementById("googleLoginBtn").style.display = "inline-flex";
        });

        
        document.querySelectorAll(".diff-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.wordsInGame = parseInt(btn.dataset.words);
            });
        });
    }

    resetGame() {
        this.wordsTyped = 0;
        this.score = 0;
        this.typeWords = [];
        this.word = "";
    }

    async loadFromFile() {
        const response = await fetch("lemmad2013.txt");
        const data = await response.text();
        this.getWords(data);
        this.loadResultsFromDB();
    }

    async loadResultsFromDB() {
        const resultsRef = ref(db, "results");
        const snapshot = await get(resultsRef);
        const items = [];

        snapshot.forEach((child) => {
            const val = child.val();
            if (val && typeof val.name === "string" && typeof val.time === "number" && !isNaN(val.time)) {
                items.push(val);
            }
        });

        items.sort((a, b) => a.time - b.time);
        this.results = items.slice(0, 20);
        this.loadResults();
    }

    
    loadResults() {
        const resultDiv = document.getElementById("results");
        resultDiv.innerHTML = "";

        if (this.results.length === 0) {
            resultDiv.innerHTML = '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px;font-family:var(--font-mono)">Tulemusi pole veel.</p>'; // Ai aitas seda kirjutada
            return;
        }

        const medals = ["🥇", "🥈", "🥉"];

        this.results.forEach((r, i) => {
            const row = document.createElement("div");
            row.className = "result-row";

            const wpm = r.wpm ? `${r.wpm} WPM` : "";

            row.innerHTML = `
                <span class="result-rank">${medals[i] || (i + 1) + "."}</span>
                <span class="result-name">${this.escHtml(r.name)}</span>
                <span class="result-time">${r.time}s</span>
                ${wpm ? `<span class="result-wpm">${wpm}</span>` : ""}
            `;
            resultDiv.appendChild(row);
        });
    }

    escHtml(str) {
        return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }

    getWords(data) {
        const list = data.split("\n");
        for (let word of list) {
            const trimmed = word.trim();
            if (!trimmed) continue;
            const len = trimmed.length;
            if (!this.words[len]) this.words[len] = [];
            this.words[len].push(trimmed);
        }
    }

    // Claude leidis paar viga siin osas ja parandas ära
    playSound(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.currentTime = 0;
        el.play().catch(() => {}); 
    }

    startCountdown() {
        document.getElementById("counter").style.display = "flex";
        document.querySelector("#name").style.display = "none";

        
        this.playSound("sndStart");

        let i = 3;
        document.getElementById("time").innerHTML = i;

        const countdown = setInterval(() => {
            i--;
            if (i > 0) {
                document.getElementById("time").innerHTML = i;
            } else {
                clearInterval(countdown);
                document.getElementById("counter").style.display = "none";
                this.startTyper();
            }
        }, 1000);
    }

    startTyper() {
        this.generateWords();
        this.updateInfo();
        this.updateProgressDots();
        this.updateProgressBar();

        document.querySelector("#info").style.display = "flex";
        document.querySelector("#wordContainer").style.display = "flex";

        this.startTime = performance.now();

        this.startLiveTimer();

        this.keyListener = (e) => this.shorteWord(e.key);
        window.addEventListener("keypress", this.keyListener);
    }

    
    startLiveTimer() {
        this.liveTimerInterval = setInterval(() => {
            const elapsed = ((performance.now() - this.startTime) / 1000).toFixed(2);
            document.getElementById("livetime").textContent = elapsed;
        }, 50);
    }

    stopLiveTimer() {
        if (this.liveTimerInterval) {
            clearInterval(this.liveTimerInterval);
            this.liveTimerInterval = null;
        }
    }
    //Chatgpt aitas selle osa kirjutamisega
    shorteWord(key) {
        if (!this.word) return;

        if (this.word[0] === key) {
            
            this.playSound("sndType");

            this.word = this.word.slice(1);
            this.drawWord();

            const el = document.getElementById("word");
            el.classList.remove("error");

            if (this.word.length === 0) {
                this.wordsTyped++;
                this.updateProgressBar();

                if (this.wordsTyped >= this.typeWords.length) {
                    this.endGame();
                } else {
                    this.selectWord();
                    this.updateProgressDots();
                }
                this.updateInfo();
            }
        } else {
            const el = document.getElementById("word");
            el.classList.add("error");
            clearTimeout(this.colorTimeout);
            this.colorTimeout = setTimeout(() => el.classList.remove("error"), 300);
        }
    }

    async endGame() {
        this.stopLiveTimer();
        this.endTime = performance.now();
        this.score = (this.endTime - this.startTime) / 1000;

        window.removeEventListener("keypress", this.keyListener);
        this.keyListener = null;

        document.getElementById("wordContainer").style.display = "none";
        document.getElementById("info").style.display = "none";
        document.getElementById("endButtons").style.display = "flex";

        
        const totalChars = this.typeWords.join("").length;
        const minutes = this.score / 60;
        const wpm = Math.round((totalChars / 5) / minutes);

        
        await this.saveResult(wpm);
        await this.loadResultsFromDB();

        
        const isInTop = this.results.some(r => r.name === this.name && Math.abs(r.time - parseFloat(this.score.toFixed(2))) < 0.05);
        if (isInTop && this.results.indexOf(this.results.find(r => r.name === this.name)) < 5) {
            
            this.playSound("sndTop");
        } else {
            this.playSound("sndEnd");
        }

        
        this.showScoreCard(wpm);
    }

   
    showScoreCard(wpm) {
        document.getElementById("resultName").textContent = this.name;
        document.getElementById("resultTime").textContent = this.score.toFixed(2) + "s";
        document.getElementById("resultWPM").textContent = wpm + " WPM";

        const level = SPEED_LEVELS.find(l => wpm < l.maxWPM) || SPEED_LEVELS[SPEED_LEVELS.length - 1];
        document.getElementById("resultLevel").textContent = level.label;
        document.getElementById("speedEmoji").textContent = level.emoji;
        document.getElementById("speedCaption").textContent = level.desc;

        document.getElementById("scoreCard").style.display = "block";
    }

    async saveResult(wpm) {
        if (!this.name) return;
        const time = Number(this.score.toFixed(2));
        if (isNaN(time) || time <= 0) return;

        await push(ref(db, "results"), {
            name: this.name,
            time: time,
            wpm: wpm || 0,
            wordsCount: this.wordsInGame,
            timestamp: Date.now()
        });
    }

    generateWords() {
        this.typeWords = [];
        for (let i = 0; i < this.wordsInGame; i++) {
            const len = this.wordsInGame + i;
            const list = this.words[len];
            if (!list || list.length === 0) continue;
            const randomIndex = Math.floor(Math.random() * list.length);
            this.typeWords.push(list[randomIndex]);
        }

        if (this.typeWords.length === 0) {
            console.error("Sõnu ei leitud! Kontrolli lemmad2013.txt faili.");
            return;
        }

        this.selectWord();
    }

    selectWord() {
        this.word = this.typeWords[this.wordsTyped];
        this.drawWord();
    }

    drawWord() {
        document.getElementById("word").textContent = this.word;
        document.getElementById("word").classList.remove("error");
    }

    updateInfo() {
        document.getElementById("wordcount").textContent =
            `Sõnu: ${this.wordsTyped}/${this.typeWords.length}`;
    }

    
    updateProgressDots() {
        const container = document.getElementById("wordProgress");
        container.innerHTML = "";
        this.typeWords.forEach((_, i) => {
            const dot = document.createElement("div");
            dot.className = "word-dot";
            if (i < this.wordsTyped) dot.classList.add("done");
            else if (i === this.wordsTyped) dot.classList.add("current");
            container.appendChild(dot);
        });
    }

    
    updateProgressBar() {
        const pct = this.typeWords.length > 0
            ? (this.wordsTyped / this.typeWords.length) * 100
            : 0;
        document.getElementById("progressBar").style.width = pct + "%";
    }
}

let typer = new Typer();
