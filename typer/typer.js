//console.log("fail ühendatud");
//const API_BASE = "http://10.10.10.148:3000/api";
//const API_BASE = "http://localhost:3000/api";
const API_BASE = `${window.location.protocol}//${window.location.hostname}:3000/api`;
//const API_BASE = "/api";

//TODO: tulemuste tabelis raskusastme järgi sorteerimine


class Typer {
    constructor() {
        this.name = "";
        this.wordsInGame = 0;
        this.wordLength = 0;
        this.startTime = 0;
        this.endTime = 0;
        this.word = "suvaline";
        this.words = [];
        this.typeWords = [];
        this.wordsTyped = 0;
        this.score = 0;

        this.results = [];

        this.mobileInput = document.getElementById("mobileTyperInput");
        this.isMobileMode = window.matchMedia("(pointer: coarse)").matches;
        this.mobileInputHandler = null;
        this.mobileBlurHandler = null;

        this.loadFromFile();

        const resultDifficulty = document.getElementById("resultDifficulty");
        resultDifficulty.addEventListener("change", () => {
            this.loadResultsFromFile();
        });

        this.playAgain();
    }

    loadResults() {
        const resultDiv = document.getElementById("results");
        resultDiv.innerHTML = "";

        const header = document.createElement("div");
        header.className = "resultsHeader";
        header.innerHTML = `
            <div class="resultRank">Koht</div>
            <div class="resultName">Nimi</div>
            <div class="resultTime">Aeg</div>
            <div class="resultWPM">WPM</div>
        `;
        resultDiv.appendChild(header);

        for (let i = 0; i < this.results.length; i++) {
            const row = document.createElement("div");
            row.className = "resultRow";

            const time = parseFloat(this.results[i].time);
            const difficultResult = this.getGameDifficulty(this.results[i].difficulty);
            const wpm = time > 0 ? ((difficultResult / time) * 60).toFixed(2) : "0.00";

            row.innerHTML = `
                <div class="resultRank">${i + 1}</div>
                <div class="resultName">${this.results[i].name}</div>
                <div class="resultTime">${this.results[i].time}s</div>
                <div class="resultWPM">${wpm}</div>
            `;

            resultDiv.appendChild(row);
        }
    }

    async loadFromFile() {
        //console.log("load from file sees");
        try {
            const responseFromFile = await fetch("words.txt");
            const allWords = await responseFromFile.text();
            this.loadResultsFromFile();

            this.getWords(allWords);
        } catch (err) {
            throw new Error("Failed to load words from file");
        }
    }

    async loadResultsFromFile() {
        const difficultySelect = document.getElementById("resultDifficulty").value;

        const res = await fetch(`${API_BASE}/results?difficulty=${encodeURIComponent(difficultySelect)}`);
        if (!res.ok) throw new Error("Failed to load results");
        this.results = await res.json();
        this.loadResults();
    }

    getWords(data) {
        //console.log(data);
        const dataFromFile = data.split("\n");

        this.separateWordsByLength(dataFromFile);
    }

    separateWordsByLength(words) {
        for (let word of words) {
            word = word.trim();
            const wordLength = word.length;
            if (!this.words[wordLength]) {
                this.words[wordLength] = [];
            }
            this.words[wordLength].push(word);
        }
        //console.log(this.words);
        this.askName();

    }

    askName() {
        document.getElementById("submitName").addEventListener("click", () => {
            this.name = document.getElementById("username").value
            this.startCountdown();
        });
    }

    startCountdown() {
        this.playSound("countdown");
        document.getElementById("counter").style.display = "flex";
        document.querySelector("#name").style.display = "none";
        let i = 3;

        let countdown = setInterval(() => {
            if (i > 1) {
                this.playSound("countdown");
            }
            document.getElementById("time").innerHTML = i - 1;
            i--;
            if (i == 0) {
                document.getElementById("counter").style.display = "none";
                this.playSound("start");
                this.startTyper();
                clearInterval(countdown);
            }
        }, 1000);
    }

    startTyper() {
        this.generateWords();
        this.updateInfo();

        document.querySelector("#info").style.display = "flex";
        document.querySelector("#wordContainer").style.display = "flex";
        document.querySelector("#name").style.display = "none";
        document.querySelector("#playAgain").style.display = "none";
        document.querySelector("#wordCount").style.display = "flex";

        this.startTime = performance.now();

        if (this.keyListener) {
            window.removeEventListener("keydown", this.keyListener);
            this.keyListener = null;
        }
        if (this.mobileInput && this.mobileInputHandler) {
            this.mobileInput.removeEventListener("input", this.mobileInputHandler);
            this.mobileInputHandler = null;
        }
        if (this.mobileInput && this.mobileBlurHandler) {
            this.mobileInput.removeEventListener("blur", this.mobileBlurHandler);
            this.mobileBlurHandler = null;
        }

        if (this.isMobileMode && this.mobileInput) {
            this.mobileInput.style.display = "block";
            this.mobileInput.value = "";
            this.mobileInput.focus();

            this.mobileInputHandler = (e) => {
                const value = e.target.value;
                if (!value) return;

                const lastChar = value[value.length - 1];
                this.shortenWord(lastChar);
                e.target.value = "";
            };

            this.mobileBlurHandler = () => {
                setTimeout(() => this.mobileInput && this.mobileInput.focus(), 50);
            };

            this.mobileInput.addEventListener("input", this.mobileInputHandler);
            this.mobileInput.addEventListener("blur", this.mobileBlurHandler);
        } else {
            this.keyListener = (e) => {
                this.shortenWord(e.key);
            };
            window.addEventListener("keydown", this.keyListener);
        }
    }

    shortenWord(keypressed) {
        if (!keypressed || keypressed.length !== 1) return;

        const key = (keypressed || "").toLowerCase();
        const expected = (this.word[0] || "").toLowerCase();

        if (expected === key && this.word.length > 1 && this.typeWords.length > this.wordsTyped) {
            this.playSound("wordClick");
            this.word = this.word.slice(1);
            this.drawWord();
        } else if (expected === key && this.word.length == 1 && this.wordsTyped <= this.typeWords.length - 2) {
            //console.log( this.typeWords.length -1, this.wordsTyped);
            this.wordsTyped++;
            this.updateInfo();
            this.selectWord();
        } else if (expected === key && this.word.length == 1 && this.typeWords.length - 1 == this.wordsTyped) {
            this.wordsTyped++;
            this.updateInfo();
            this.endGame();
        } else if (expected !== key) {
            document.getElementById("word").style.color = "red";
            this.playSound("error");
            setTimeout(() => {
                document.getElementById("word").style.color = "black";
            }, 100);
        }

    }

    async endGame() {
        this.playSound("gameover");
        this.endTime = performance.now();
        this.score = ((this.endTime - this.startTime) / 1000).toFixed(2); //
        const wpm = ((this.wordsInGame / this.score) * 60).toFixed(2);

        if (this.keyListener) {
            window.removeEventListener("keydown", this.keyListener);
            this.keyListener = null;
        }
        if (this.mobileInput && this.mobileInputHandler) {
            this.mobileInput.removeEventListener("input", this.mobileInputHandler);
            this.mobileInputHandler = null;
        }
        if (this.mobileInput && this.mobileBlurHandler) {
            this.mobileInput.removeEventListener("blur", this.mobileBlurHandler);
            this.mobileBlurHandler = null;
        }
        if (this.mobileInput) {
            this.mobileInput.blur();
            this.mobileInput.style.display = "none";
        }

        this.endImage(wpm);

        document.getElementById("word").textContent = `Suurepärane!!`;

        document.getElementById("gameOverModal").classList.remove("hidden");
        document.getElementById("playAgain").style.display = "flex";


        await this.saveResult();
    }

    async saveResult() {
        const result = { name: this.name, difficulty: document.getElementById("difficulty").value, time: this.score };

        try {
            const res = await fetch(`${API_BASE}/results`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result)
            });
        } catch (err) {
            throw new Error("Failed to save result");
        }

        await this.loadResultsFromFile();
    }

    generateWords() {
        this.typeWords = [];

        const difficulty = document.getElementById("difficulty").value;
        this.getGameDifficulty(difficulty);

        const allowedLengths = [];
        for (let len = 1; len <= this.wordLength; len++) {
            if (this.words[len] && this.words[len].length > 0) {
                allowedLengths.push(len);
            }
        }

        if (allowedLengths.length === 0) {
            throw new Error("No words available for the specified lengths");
        }

        for (let i = 0; i < this.wordsInGame; i++) {
            const randomLength = allowedLengths[Math.floor(Math.random() * allowedLengths.length)];
            const randomIndex = Math.floor(Math.random() * this.words[randomLength].length);

            this.typeWords.push(this.words[randomLength][randomIndex]);
        }

        this.wordsTyped = 0;
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
        document.getElementById("wordCount").innerHTML = "Sõnu trükitud: " + this.wordsTyped + "/" + this.wordsInGame;
    }

    playAgain() {
        document.getElementById("playAgainBtn").addEventListener("click", () => {

            this.wordsTyped = 0;
            this.score = 0;
            this.startTime = 0;
            this.endTime = 0;
            this.word = "";
            this.typeWords = [];

            document.getElementById("word").style.color = "black";
            document.querySelector("#name").style.display = "none";
            document.querySelector("#info").style.display = "flex";
            document.querySelector("#time").innerHTML = "3";
            document.querySelector("#wordContainer").style.display = "none";
            document.querySelector("#wordCount").style.display = "none";

            this.startCountdown();

        });
    }

    playSound(name) {
        let audio;
        switch (name) {
            case "countdown":
                audio = new Audio("countdown.wav");
                audio.volume = 0.5;
                audio.play();
                break;
            case "gameover":
                audio = new Audio("gameover.mp3");
                audio.volume = 0.5;
                audio.play();
                break;
            case "start":
                audio = new Audio("start.wav");
                audio.volume = 0.5;
                audio.play();
                break;
            case "click":
                audio = new Audio("click.wav");
                audio.volume = 0.5;
                audio.play();
                break;
            case "wordClick":
                audio = new Audio("wordClick.wav");
                audio.volume = 0.5;
                audio.play();
                break;
            case "error":
                audio = new Audio("error.wav");
                audio.volume = 0.5;
                audio.play();
                break;
            default:
                break;
        }
    }

    getGameDifficulty(difficulty) {
        switch (difficulty) {
            case "Lihtne":
                this.wordLength = 4;
                this.wordsInGame = 5;
                return 5;
            case "Keskmine":
                this.wordLength = 6;
                this.wordsInGame = 10;
                return 10;
            case "Raske":
                this.wordLength = 8;
                this.wordsInGame = 15;
                return 15;
            default:
                return 0;
        }
    }

    endImage(wpm) {
    const endImage = document.getElementById("endImage");

    switch (true) {
        case wpm < 20:
            endImage.src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80";
            endImage.alt = "Slow typing";
            document.getElementById("finalScore").innerHTML = "Sa pead rohkem harjutama! Sinu WPM on: " + wpm;
            break;

        case wpm >= 20 && wpm < 40:
            endImage.src = "https://images.unsplash.com/photo-1516382799247-87df95d790b7?auto=format&fit=crop&w=900&q=80";
            endImage.alt = "Average typing";
            document.getElementById("finalScore").innerHTML = "Hea töö! Sinu WPM on: " + wpm;
            break;

        case wpm >= 40 && wpm < 60:
            endImage.src = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80";
            endImage.alt = "Fast typing";
            document.getElementById("finalScore").innerHTML = "Väga hea! Sinu WPM on: " + wpm;
            break;

        case wpm >= 60:
            endImage.src = "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80";
            endImage.alt = "Very fast typing";
            document.getElementById("finalScore").innerHTML = "Suurepärane! Sinu WPM on: " + wpm;
            break;
        }
    }
}

class Sidebar {
    constructor({
        toggleButtonId = "toggleSide",
        sideContainerId = "sideContainer",
        gameContainerId = "gameContainer"
    } = {}) {

        this.toggleButton = document.getElementById(toggleButtonId);
        this.sideContainer = document.getElementById(sideContainerId);
        this.gameContainer = document.getElementById(gameContainerId);

        if (!this.toggleButton || !this.sideContainer || !this.gameContainer) {
            console.error("Sidebar init failed: missing required elements");
            return;
        }

        this.isOpen = true;
        this.handleToggle = this.handleToggle.bind(this);

        this.toggleButton.addEventListener("click", this.handleToggle);
    }

    handleToggle() {
        this.isOpen = !this.isOpen;
        this.sideContainer.classList.toggle("closed", !this.isOpen);

        if (this.isOpen) {
            this.gameContainer.style.flexBasis = "80%";
            this.gameContainer.style.width = "80%";
        } else {
            this.gameContainer.style.flexBasis = "100%";
            this.gameContainer.style.width = "100%";
        }
    }

    open() {
        if (!this.isOpen) this.handleToggle();
    }

    close() {
        if (this.isOpen) this.handleToggle();
    }

    destroy() {
        this.toggleButton.removeEventListener("click", this.handleToggle);
    }
}

let typer = new Typer();
let sidebar = new Sidebar();

document.getElementById("closeModalBtn").addEventListener("click", () => {
    document.getElementById("gameOverModal").classList.add("hidden");
});
