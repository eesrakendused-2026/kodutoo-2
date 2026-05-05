import { googleLogin } from "./auth.js";
import { db } from "./firebase.js";
import {
    addDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("Ühendatud!");

class Typer {
    constructor() {
        this.name = "";
        this.wordsInGame = 2;

        this.startTime = 0;
        this.endTime = 0;

        this.word = "";
        this.words = [];
        this.typeWords = [];

        this.wordsTyped = 0;
        this.score = 0;
        this.errors = 0;

        this.results = [];

        this.keyListener = null;
        this.gameRunning = false;
        this.state = "idle";

        this.soundStart = new Audio("sounds/start.mp3");
        this.soundTyping = new Audio("sounds/typing.mp3");
        this.soundEnd = new Audio("sounds/end.mp3");
        this.soundHighscore = new Audio("sounds/highscore.mp3");

        this.init();

        window.addEventListener("keydown", (e) => {
            if (this.state === "finished" && e.key === "Enter") {
                this.restartGame();
            }
        });
    }

    async init() {
        await this.loadFromFile();
        this.loadResultsFromFirestore();
        this.toggleResultsHidden();
    }

    /* ---------------- RESET LOOGIKA ---------------- */
    resetGame() {
        if (this.keyListener) {
            window.removeEventListener("keypress", this.keyListener);
        }

        this.gameRunning = false;
        this.state = "idle";

        this.word = "";
        this.typeWords = [];
        this.wordsTyped = 0;
        this.score = 0;
        this.startTime = 0;
        this.endTime = 0;
        this.errors = 0;
        this.wpm = 0;

        document.querySelector("#wordContainer").style.display = "none";
        document.querySelector("#info").style.display = "none";
        document.querySelector("#counter").style.display = "none";
        document.getElementById("word").innerHTML = "";
        document.getElementById("name").style.display = "flex";

        document.getElementById("word").innerHTML = "";

        // hide restart button again
        document.getElementById("restartBtn").style.display = "none";
    }

    restartGame() {
        if (this.state !== "finished") return;

        this.resetGame();
        this.startCountdown();
    }

    /* ---------------- RESULTS LOOGIKA ---------------- */

    loadResults() {
        const body = document.getElementById("resultsBody");
        body.innerHTML = "";

        for (let i = 0; i < this.results.length; i++) {
            const result = this.results[i];
            const wpm = Number(result.wpm);
            console.log(wpm);
            const level = this.getSpeedLevel(wpm);

            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td>${i + 1}</td>
            <td>${result.name}</td>
            <td>${result.time}</td>
            <td>${wpm} WPM</td>
            <td>${level}</td>
        `;

            body.appendChild(tr);
        }
    }

    async loadResultsFromFirestore() {
        const snapshot = await getDocs(collection(db, "results"));
        this.results = snapshot.docs
            .map(doc => doc.data())
            .sort((a, b) => (Number(b.wpm) || 0) - (Number(a.wpm) || 0))
            .slice(0, 20);                   // TOP 20
        this.loadResults();
    }

    /* ---------------- WORDS LOOGIKA ---------------- */

    async loadFromFile() {
        const response = await fetch("lemmad2013.txt");
        const text = await response.text();
        this.getWords(text);
    }

    getWords(data) {
        const dataFromFile = data.split("\n");
        this.separateWordsByLength(dataFromFile);
    }

    separateWordsByLength(words) {
        for (let word of words) {
            const len = word.length;

            if (!this.words[len]) {
                this.words[len] = [];
            }

            this.words[len].push(word);
        }

        this.askNameOrLogin();
    }

    /* ---------------- LOGIN LOOGIKA ---------------- */

    askNameOrLogin() {
        document.getElementById("submitName").addEventListener("click", () => {
            const typedName = document.getElementById("username").value.trim();
            if (!typedName) return alert("Sisesta nimi!");

            this.name = typedName;
            this.startCountdown();
        });

        document.getElementById("googleLogin").addEventListener("click", async () => {
            const user = await googleLogin();
            this.name = user.displayName;
            this.startCountdown();
        });
    }

    /* ---------------- GAME FLOW LOOGIKA ---------------- */

    startCountdown() {
        document.getElementById("counter").style.display = "flex";
        document.querySelector("#name").style.display = "none";

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
        if (this.state !== "idle") return;
        this.soundStart.play();
        this.state = "playing";
        this.gameRunning = true;

        this.generateWords();
        this.updateInfo();

        document.querySelector("#wordContainer").style.display = "flex";
        document.querySelector("#info").style.display = "flex";

        this.startTime = performance.now();

        // remove old listener safely
        if (this.keyListener) {
            window.removeEventListener("keypress", this.keyListener);
        }

        this.keyListener = (e) => this.handleKey(e);
        window.addEventListener("keypress", this.keyListener);
    }

    handleKey(e) {
        if (this.state !== "playing") return;
        this.soundTyping.currentTime = 0;
        this.soundTyping.play();
        this.shortenWord(e.key);
    }

    shortenWord(key) {
        if (!this.word) return;

        if (this.word[0] === key && this.word.length > 1) {
            this.word = this.word.slice(1);
            this.drawWord();
            return;
        }

        if (this.word[0] === key && this.word.length === 1) {
            this.wordsTyped++;

            if (this.wordsTyped >= this.wordsInGame) {
                this.updateInfo();
                this.endGame();
                return;
            }

            this.updateInfo();
            this.selectWord();
            return;
        }

        // wrong key feedback
        this.errors++;
        this.updateInfo();
        const el = document.getElementById("word");
        el.style.color = "red";
        setTimeout(() => (el.style.color = "black"), 100);
    }

    /* ---------------- END GAME LOOGIKA ---------------- */

    endGame() {
        this.endTime = performance.now();
        this.score = ((this.endTime - this.startTime) / 1000).toFixed(2);

        const wpm = Math.round((this.wordsInGame / this.score) * 60);
        this.wpm = wpm;

        this.soundTyping.pause();
        this.soundEnd.play();
        const msg = this.getEndMessage(wpm);
        const image = this.getEndResultImage(wpm);
        const level = this.getSpeedLevel(wpm);


        document.getElementById("word").innerHTML = `
            <div>Mäng läbi!</div>
            <div>Skill level: ${level}</div>
            <div>Aeg: ${this.score}s</div>
            <div>Kiirus: ${wpm} WPM</div>
            <div>Vigu: ${this.errors}</div>
            <img src="${image}" style="width:150px; margin:10px 0;">`;

        // stop listener
        if (this.keyListener) {
            window.removeEventListener("keypress", this.keyListener);
        }
        this.gameRunning = false;
        this.state = "finished";

        this.showEndButtons();
        this.saveResult();
    }

    showEndButtons() {
        document.getElementById("restartBtn").style.display = "inline-block";
    }

    /* ---------------- FIRESTORE SAVE LOOGIKA ---------------- */

    async saveResult() {
        const result = {
            name: this.name,
            time: this.score,
            wpm: this.wpm
        };

        try {
            await addDoc(collection(db, "results"), result);
            this.soundEnd.play();
            await this.loadResultsFromFirestore();
            this.checkIfHighscore();
            console.log("Saved to Firestore");
        } catch (err) {
            console.error("Failed", err);
        }

        this.loadResultsFromFirestore();
    }

    checkIfHighscore() {
        const top20 = this.results;

        const isInTop20 = top20.some(r => Number(r.wpm) === Number(this.wpm));

        if (isInTop20) {
            this.soundHighscore.currentTime = 0;
            this.soundHighscore.play();
        }
    }

    /* ---------------- WORD GAME AND RESULTS LOOGIKA ---------------- */

    generateWords() {
        this.typeWords = [];

        for (let i = 0; i < this.wordsInGame; i++) {
            const len = this.wordsInGame + i;

            const list = this.words[len];
            if (!list) continue;

            const randomIndex = Math.floor(Math.random() * list.length);
            this.typeWords[i] = list[randomIndex];
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

    updateInfo() {
        document.getElementById("wordCount").innerHTML =
            `Sõnu: ${this.wordsTyped}/${this.wordsInGame} | Vead: ${this.errors}`;
    }

    toggleResultsHidden() {
        const container = document.getElementById("results");
        const showBtn = document.getElementById("showResultsBtn");
        const hideBtn = document.getElementById("hideResultsBtn");

        showBtn.addEventListener("click", () => {
            container.classList.remove("hidden");
            showBtn.classList.add("hidden");
            hideBtn.classList.remove("hidden")
        });

        hideBtn.addEventListener("click", () => {
            container.classList.add("hidden");
            hideBtn.classList.add("hidden");
            showBtn.classList.remove("hidden");
        });
    }

    getSpeedLevel(wpm) {
        if (wpm === null || wpm === undefined || isNaN(wpm)) {
            return "Määramata";
        }

        if (wpm >= 90) return "Võistlustase";
        if (wpm >= 70) return "Kiire";
        if (wpm >= 60) return "Produktiivne";
        if (wpm >= 50) return "Üle keskmise";
        return "Keskmine";
    }

    getEndMessage(wpm) {
        if (wpm >= 90) return "🔥 Ulme trükkija! 🔥";
        if (wpm >= 70) return "💪 Väga kiire! 💪";
        if (wpm >= 50) return "👍 Tubli töö! 👍";
        return "📈 Oh well.... Harjutamine teeb meistriks!";
    }

    getEndResultImage(wpm) {
        if (wpm >= 90) return "images/fastest.png";
        if (wpm >= 70) return "images/fast.png";
        if (wpm >= 60) return "images/aight.png";
        if (wpm >= 50) return "images/medium.png";
        return "images/slowest.png";
    }

}

window.addEventListener("DOMContentLoaded", () => {
    const typer = new Typer();

    document
        .getElementById("restartBtn")
        .addEventListener("click", () => typer.restartGame());
});