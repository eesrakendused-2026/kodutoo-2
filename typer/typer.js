const API_BASE =
  window.location.port === "5500"
    ? `${window.location.protocol}//${window.location.hostname}:3000/api`
    : new URL("/api", window.location.origin).toString();


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
        this.cacheDomElements();

        this.mobileInput = document.getElementById("mobileTyperInput");
        this.isMobileMode = window.matchMedia("(pointer: coarse)").matches;
        this.mobileInputHandler = null;
        this.mobileBlurHandler = null;

        
        this.loadFromFile();

        const resultDifficulty = this.dom.resultDifficulty;
        resultDifficulty.addEventListener("change", () => {
            this.loadResultsFromFile();
        });

        this.preloadSounds();

        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.5;
            sound.preload = "auto";
        });

        this.playAgain();
    }

    cacheDomElements() {
        this.dom = {
            counter: document.getElementById("counter"),
            nameBox: document.getElementById("name"),
            info: document.getElementById("info"),
            wordContainer: document.getElementById("wordContainer"),
            wordCount: document.getElementById("wordCount"),
            word: document.getElementById("word"),
            time: document.getElementById("time"),
            playAgain: document.getElementById("playAgain"),
            difficulty: document.getElementById("difficulty"),
            resultDifficulty: document.getElementById("resultDifficulty"),
            results: document.getElementById("results"),
            gameOverModal: document.getElementById("gameOverModal"),
            finalScore: document.getElementById("finalScore"),
            endImage: document.getElementById("endImage"),
            submitName: document.getElementById("submitName"),
            username: document.getElementById("username"),
            playAgainBtn: document.getElementById("playAgainBtn"),
            closeModalBtn: document.getElementById("closeModalBtn"),
            gameOverModal: document.getElementById("gameOverModal")
        };
    }

    preloadSounds() {
        this.sounds = {
            countdown: new Audio("countdown.wav"),
            gameover: new Audio("gameover.mp3"),
            start: new Audio("start.wav"),
            click: new Audio("click.wav"),
            wordClick: new Audio("wordClick.wav"),
            error: new Audio("error.wav")
        };
    }

    loadResults() {
        const resultDiv = this.dom.results;
        resultDiv.textContent = "";

        const header = document.createElement("div");
        header.className = "resultsHeader";

        const rank = document.createElement("div");
        rank.className = "resultRank";
        rank.textContent = "Koht";

        const name = document.createElement("div");
        name.className = "resultName";
        name.textContent = "Nimi";

        const time = document.createElement("div");
        time.className = "resultTime";
        time.textContent = "Aeg";

        const wpm = document.createElement("div");
        wpm.className = "resultWPM";
        wpm.textContent = "WPM";

        header.appendChild(rank);
        header.appendChild(name);
        header.appendChild(time);
        header.appendChild(wpm);
        resultDiv.appendChild(header);

        for (let i = 0; i < this.results.length; i++) {
            const row = document.createElement("div");
            row.className = "resultRow";

            const time = parseFloat(this.results[i].time);
            const difficultResult = this.getGameDifficulty(this.results[i].difficulty);
            const wpm = time > 0 ? ((difficultResult.wordsInGame / time) * 60).toFixed(2) : "0.00";

            const rankDiv = document.createElement("div");
            rankDiv.className = "resultRank";
            rankDiv.textContent = i + 1;

            const nameDiv = document.createElement("div");
            nameDiv.className = "resultName";
            nameDiv.textContent = this.results[i].name;

            const timeDiv = document.createElement("div");
            timeDiv.className = "resultTime";
            timeDiv.textContent = this.results[i].time + "s";

            const wpmDiv = document.createElement("div");
            wpmDiv.className = "resultWPM";
            wpmDiv.textContent = wpm;

            row.appendChild(rankDiv);
            row.appendChild(nameDiv);
            row.appendChild(timeDiv);
            row.appendChild(wpmDiv);

            resultDiv.appendChild(row);
        }
    }

    async loadFromFile() {
        try {
            const responseFromFile = await fetch("words.txt");
            if (!responseFromFile.ok) console.error("Failed to load words from file");
            const allWords = await responseFromFile.text();
            this.loadResultsFromFile();

            this.getWords(allWords);
        } catch (err) {
            console.error("Failed to load words from file");
        }
    }

    async loadResultsFromFile() {
        const difficultySelect = this.dom.resultDifficulty.value;

        const res = await fetch(`${API_BASE}/results?difficulty=${encodeURIComponent(difficultySelect)}`);
        if (!res.ok) console.error("Failed to load results");
        this.results = await res.json();
        this.loadResults();
    }

    getWords(data) {
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
        this.dom.submitName.addEventListener("click", () => {
            this.name = this.dom.username.value;
            this.startCountdown();
        });
    }

    startCountdown() {
        this.playSound("countdown");
        this.dom.counter.style.display = "flex";
        this.dom.nameBox.style.display = "none";
        let i = 3;

        let countdown = setInterval(() => {
            if (i > 1) {
                this.playSound("countdown");
            }
            this.dom.time.textContent = i - 1;
            i--;
            if (i == 0) {
                this.dom.counter.style.display = "none";
                this.playSound("start");
                this.startTyper();
                clearInterval(countdown);
            }
        }, 1000);
    }

    startTyper() {
        this.generateWords();
        this.updateInfo();

        this.dom.info.style.display = "flex";
        this.dom.wordContainer.style.display = "flex";
        this.dom.nameBox.style.display = "none";
        this.dom.playAgain.style.display = "none";
        this.dom.wordCount.style.display = "flex";

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

        const key = this.isMobileMode ? keypressed.toLowerCase() : keypressed;
        const expected = this.isMobileMode ? this.word[0].toLowerCase() : this.word[0];

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
            this.dom.word.style.color = "red";
            this.playSound("error");
            setTimeout(() => {
                this.dom.word.style.color = "black";
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

        this.dom.word.textContent = `Suurepärane!!`;

        this.dom.gameOverModal.classList.remove("hidden");
        this.dom.playAgain.style.display = "flex";

        await this.saveResult();
    }

    async saveResult() {
        if (this.name && this.score) {
            const result = { name: this.name.trim(), difficulty: this.dom.difficulty.value, time: Number(this.score) };
            try {
                const res = await fetch(`${API_BASE}/results`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(result)
                });
            } catch (err) {
                console.error("Failed to save result");
            }

            if (!res.ok) {
                console.error("Failed to save result:", res.statusText);
                return;
            }

            await this.loadResultsFromFile();
        } else {
            console.warn("Name or score is missing, result not saved");
        }
    }

    generateWords() {
        this.typeWords = [];

        const difficulty = this.dom.difficulty.value;
        this.applyGameDifficulty(difficulty);

        const allowedLengths = [];
        for (let len = 1; len <= this.wordLength; len++) {
            if (this.words[len] && this.words[len].length > 0) {
                allowedLengths.push(len);
            }
        }

        if (allowedLengths.length === 0) {
            console.error("No words available for the specified lengths");
            return;
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
        this.dom.word.textContent = this.word;
    }

    updateInfo() {
        this.dom.wordCount.textContent = "Sõnu trükitud: " + this.wordsTyped + "/" + this.wordsInGame;
    }

    playAgain() {
        this.dom.playAgainBtn.addEventListener("click", () => {

            this.wordsTyped = 0;
            this.score = 0;
            this.startTime = 0;
            this.endTime = 0;
            this.word = "";
            this.typeWords = [];

            this.dom.word.style.color = "black";
            this.dom.nameBox.style.display = "none";
            this.dom.info.style.display = "flex";
            this.dom.time.textContent = "3";
            this.dom.wordContainer.style.display = "none";
            this.dom.wordCount.style.display = "none";

            this.startCountdown();

        });
    }

    playSound(name) {
        const sound = this.sounds[name];
        if (!sound) return;
        sound.currentTime = 0;
        sound.play().catch((err) => console.error("Failed to play sound:", err.message));
    }

    getGameDifficulty(difficulty) {
        switch (difficulty) {
            case "Lihtne":
                return { wordsInGame: 5, wordLength: 4 };
            case "Keskmine":
                return { wordsInGame: 10, wordLength: 6 };
            case "Raske":
                return { wordsInGame: 15, wordLength: 8 };
            default:
                return { wordsInGame: 5, wordLength: 4 };
        }
    }

    applyGameDifficulty(difficulty) {
        const gameSettings = this.getGameDifficulty(difficulty);
        this.wordsInGame = gameSettings.wordsInGame;
        this.wordLength = gameSettings.wordLength;
    }

    endImage(wpm) {
    const endImage = this.dom.endImage;

    switch (true) {
        case wpm < 20:
            endImage.src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80";
            endImage.alt = "Slow typing";
            this.dom.finalScore.textContent = "Sa pead rohkem harjutama! Sinu WPM on: " + wpm;
            break;

        case wpm >= 20 && wpm < 40:
            endImage.src = "https://images.unsplash.com/photo-1516382799247-87df95d790b7?auto=format&fit=crop&w=900&q=80";
            endImage.alt = "Average typing";
            this.dom.finalScore.textContent = "Hea töö! Sinu WPM on: " + wpm;
            break;

        case wpm >= 40 && wpm < 60:
            endImage.src = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80";
            endImage.alt = "Fast typing";
            this.dom.finalScore.textContent = "Väga hea! Sinu WPM on: " + wpm;
            break;

        case wpm >= 60:
            endImage.src = "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80";
            endImage.alt = "Very fast typing";
            this.dom.finalScore.textContent = "Suurepärane! Sinu WPM on: " + wpm;
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

typer.dom.closeModalBtn.addEventListener("click", () => {
    typer.dom.gameOverModal.classList.add("hidden");
});
