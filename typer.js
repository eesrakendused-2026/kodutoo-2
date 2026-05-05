import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getDatabase,
    ref,
    push,
    onValue
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCcyvjvr88vZku5yR6OJwYBFPZIsZidCyc",
    authDomain: "typer-game-25fbc.firebaseapp.com",
    databaseURL:
        "https://typer-game-25fbc-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "typer-game-25fbc",
    storageBucket: "typer-game-25fbc.firebasestorage.app",
    messagingSenderId: "323922354842",
    appId: "1:323922354842:web:ede4c1fa78209c47b523"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

class Typer {
    constructor() {
        this.playerName = "";
        this.wordsInGame = 5;
        this.startingWordLength = 2;
        this.startTime = 0;
        this.endTime = 0;
        this.currentWord = "Suvaline";
        this.wordsByLength = [];
        this.gameWords = [];
        this.typedWordCount = 0;
        this.score = 0;

        this.soundEnabled = true;
        this.keyListener = null;

        this.loginButton = document.getElementById("googleLoginBtn");
        this.logoutButton = document.getElementById("logoutBtn");
        this.restartButton = document.getElementById("restartBtn");
        this.userInfoText = document.getElementById("userInfo");

        this.openSidebarButton = document.getElementById("openSidebarBtn");
        this.closeSidebarButton = document.getElementById("closeSidebarBtn");
        this.resultsSidebar = document.getElementById("resultsSidebar");
        this.sidebarOverlay = document.getElementById("sidebarOverlay");
        this.resultsContainer = document.getElementById("results");

        this.speedBadge = document.getElementById("speedBadge");
        this.speedImage = document.getElementById("speedImage");
        this.speedTitle = document.getElementById("speedTitle");
        this.speedDescription = document.getElementById("speedDescription");

        this.difficultySelect = document.getElementById("difficultySelect");
        this.soundToggleButton = document.getElementById("soundToggleBtn");
        this.progressBar = document.getElementById("progressBar");

        this.wordText = document.getElementById("word");
        this.timeText = document.getElementById("time");
        this.wordCountText = document.getElementById("wordcount");
        this.scoreText = document.getElementById("score");
        this.counterContainer = document.getElementById("counter");
        this.infoContainer = document.querySelector("#info");
        this.wordContainer = document.querySelector("#wordContainer");

        this.startSound = new Audio("./start.mp3");
        this.correctSound = new Audio("./correct.mp3");
        this.wrongSound = new Audio("./wrong.mp3");
        this.finishSound = new Audio("./finish.mp3");

        this.startSound.volume = 0.6;
        this.correctSound.volume = 0.35;
        this.wrongSound.volume = 0.45;
        this.finishSound.volume = 0.6;

        this.initSidebar();
        this.initControls();
        this.initAuth();
        this.loadResultsFromFirebase();
        this.loadFromFile();
    }

    playSound(sound) {
        if (!this.soundEnabled) return;

        sound.currentTime = 0;
        sound.play().catch((error) => console.log("Heli ei mängi:", error));
    }

    initControls() {
        this.soundToggleButton.addEventListener("click", () => {
            this.soundEnabled = !this.soundEnabled;
            this.soundToggleButton.textContent = this.soundEnabled
                ? "Heli: sees"
                : "Heli: väljas";
        });

        this.difficultySelect.addEventListener("change", () => {
            this.setDifficulty();
            this.resetGame();

            if (this.playerName !== "" && this.wordsByLength.length > 0) {
                this.startCountdown();
            }
        });
    }

    setDifficulty() {
        const selectedDifficulty = this.difficultySelect.value;

        if (selectedDifficulty === "easy") {
            this.wordsInGame = 4;
            this.startingWordLength = 2;
            return;
        }

        if (selectedDifficulty === "medium") {
            this.wordsInGame = 5;
            this.startingWordLength = 2;
            return;
        }

        if (selectedDifficulty === "hard") {
            this.wordsInGame = 6;
            this.startingWordLength = 3;
        }
    }

    initSidebar() {
        this.openSidebarButton.addEventListener("click", () => {
            this.showSidebar();
        });

        this.closeSidebarButton.addEventListener("click", () => {
            this.hideSidebar();
        });

        this.sidebarOverlay.addEventListener("click", () => {
            this.hideSidebar();
        });
    }

    showSidebar() {
        this.resultsSidebar.classList.add("show");
        this.sidebarOverlay.style.display = "block";
    }

    hideSidebar() {
        this.resultsSidebar.classList.remove("show");
        this.sidebarOverlay.style.display = "none";
    }

    initAuth() {
        this.loginButton.addEventListener("click", () => {
            signInWithPopup(auth, provider).catch((error) => {
                console.error(error);
            });
        });

        this.logoutButton.addEventListener("click", () => {
            signOut(auth).then(() => {
                this.resetGame();
            });
        });

        this.restartButton.addEventListener("click", () => {
            this.startCountdown();
        });

        onAuthStateChanged(auth, (user) => {
            this.handleAuthState(user);
        });
    }

    handleAuthState(user) {
        if (user) {
            this.playerName = user.displayName;
            this.loginButton.style.display = "none";
            this.logoutButton.style.display = "inline-block";
            this.userInfoText.innerText = "Mängija: " + this.playerName;

            if (this.wordsByLength.length > 0) {
                this.startCountdown();
            }

            return;
        }

        this.playerName = "";
        this.loginButton.style.display = "inline-block";
        this.logoutButton.style.display = "none";
        this.userInfoText.innerText =
            "Tulemuse salvestamiseks logi sisse.";
        this.resetGame();
    }

    loadResultsFromFirebase() {
        const resultsRef = ref(db, "scores");

        onValue(resultsRef, (snapshot) => {
            const results = this.readResults(snapshot);
            const sortedResults = this.sortResults(results);
            const topResults = this.getTopResults(sortedResults);

            this.renderResults(topResults);
        });
    }

    readResults(snapshot) {
        const results = [];

        snapshot.forEach((childSnapshot) => {
            results.push(childSnapshot.val());
        });

        return results;
    }

    sortResults(results) {
        return [...results].sort((firstResult, secondResult) => {
            return parseFloat(firstResult.time) - parseFloat(secondResult.time);
        });
    }

    getTopResults(results) {
        return results.slice(0, 20);
    }

    renderResults(results) {
        this.resultsContainer.innerHTML = "";

        results.forEach((result, index) => {
            const resultRow = this.createResultRow(result, index);
            this.resultsContainer.appendChild(resultRow);
        });
    }

    createResultRow(result, index) {
        const row = document.createElement("div");
        row.className = "result-row";

        const rank = this.createRankElement(index);
        const nameWrap = this.createNameElement(result);
        const timeWrap = this.createTimeElement(result);

        row.appendChild(rank);
        row.appendChild(nameWrap);
        row.appendChild(timeWrap);

        return row;
    }

    createRankElement(index) {
        const rank = document.createElement("div");
        rank.className = "result-rank";
        rank.textContent = `#${index + 1}`;

        return rank;
    }

    createNameElement(result) {
        const nameWrap = document.createElement("div");
        nameWrap.className = "result-name";

        const nameLabel = document.createElement("div");
        nameLabel.className = "label";
        nameLabel.textContent = "Nimi";

        const nameValue = document.createElement("div");
        nameValue.className = "value";
        nameValue.textContent = result.name || "Tundmatu";

        nameWrap.appendChild(nameLabel);
        nameWrap.appendChild(nameValue);

        return nameWrap;
    }

    createTimeElement(result) {
        const timeWrap = document.createElement("div");
        timeWrap.className = "result-time";

        const timeLabel = document.createElement("div");
        timeLabel.className = "label";
        timeLabel.textContent = "Aeg";

        const timeValue = document.createElement("div");
        timeValue.className = "value";
        timeValue.textContent = `${parseFloat(result.time).toFixed(2)} s`;

        timeWrap.appendChild(timeLabel);
        timeWrap.appendChild(timeValue);

        return timeWrap;
    }

    getSpeedLevelByTime(timeInSeconds) {
        if (timeInSeconds < 3) {
            return {
                title: "Very fast",
                description: `${timeInSeconds.toFixed(2)} s — cheetah kiirus!`,
                image: "./cheetah.jpg"
            };
        }

        if (timeInSeconds > 10) {
            return {
                title: "Slow",
                description:
                    `${timeInSeconds.toFixed(2)} s — turtle tempo, ` +
                    "harjutamine aitab.",
                image: "./turtle.jpg"
            };
        }

        return {
            title: "Medium",
            description:
                `${timeInSeconds.toFixed(2)} s — täitsa hea, aga ` +
                "saab veel kiiremini.",
            image: "./cat.jpg"
        };
    }

    updateSpeedBadge() {
        const timeInSeconds = parseFloat(this.score);
        const speedLevel = this.getSpeedLevelByTime(timeInSeconds);

        this.speedImage.onerror = () => {
            this.speedImage.style.display = "none";
        };

        this.speedImage.onload = () => {
            this.speedImage.style.display = "block";
        };

        this.speedImage.src = speedLevel.image;
        this.speedTitle.textContent = speedLevel.title;
        this.speedDescription.textContent = speedLevel.description;
        this.speedBadge.style.display = "flex";
    }

    updateProgressBar() {
        const progress = (this.typedWordCount / this.wordsInGame) * 100;
        this.progressBar.style.width = progress + "%";
    }

    saveResult() {
        const resultsRef = ref(db, "scores");

        push(resultsRef, {
            name: this.playerName,
            time: parseFloat(this.score),
            date: Date.now()
        }).then(() => {
            console.log("Tulemus edukalt salvestatud Firebase'i!");
        }).catch((error) => {
            console.error("Viga salvestamisel:", error);
        });
    }

    async loadFromFile() {
        const fileResponse = await fetch("lemmad2013.txt");
        const fileContent = await fileResponse.text();

        this.getWords(fileContent);
    }

    getWords(data) {
        const wordsFromFile = data.split("\n");
        this.separateWordsByLength(wordsFromFile);
    }

    separateWordsByLength(words) {
        for (const word of words) {
            const trimmedWord = word.trim();
            const wordLength = trimmedWord.length;

            if (!this.wordsByLength[wordLength]) {
                this.wordsByLength[wordLength] = [];
            }

            this.wordsByLength[wordLength].push(trimmedWord);
        }

        if (this.playerName !== "") {
            this.startCountdown();
        }
    }

    resetGame() {
        this.typedWordCount = 0;
        this.gameWords = [];

        if (this.keyListener) {
            window.removeEventListener("keypress", this.keyListener);
            this.keyListener = null;
        }

        this.resetGameView();
    }

    resetGameView() {
        this.wordText.innerHTML = "";
        this.wordText.style.color = "#0f3d66";
        this.counterContainer.style.display = "none";
        this.infoContainer.style.display = "none";
        this.wordContainer.style.display = "none";
        this.restartButton.style.display = "none";
        this.speedBadge.style.display = "none";
        this.speedImage.style.display = "block";
        this.speedImage.src = "";
        this.progressBar.style.width = "0%";
        this.wordCountText.innerHTML = "";
        this.scoreText.innerHTML = "";
    }

    startCountdown() {
        this.resetGame();
        this.counterContainer.style.display = "flex";

        let countdownValue = 3;
        this.timeText.innerHTML = countdownValue;
        this.playSound(this.startSound);

        const countdown = setInterval(() => {
            countdownValue--;

            if (countdownValue > 0) {
                this.timeText.innerHTML = countdownValue;
            }

            if (countdownValue === 0) {
                this.counterContainer.style.display = "none";
                this.startTyper();
                clearInterval(countdown);
            }
        }, 1000);
    }

    startTyper() {
        this.generateWords();
        this.updateInfo();
        this.infoContainer.style.display = "flex";
        this.wordContainer.style.display = "flex";
        this.restartButton.style.display = "none";
        this.startTime = performance.now();

        this.keyListener = (event) => {
            this.handleKey(event.key);
        };

        window.addEventListener("keypress", this.keyListener);
    }

    handleKey(keyPressed) {
        const isCorrectKey = this.currentWord[0] === keyPressed;
        const isLastLetter = this.currentWord.length === 1;
        const hasMoreWords =
            this.typedWordCount <= this.gameWords.length - 2;
        const isLastWord =
            this.gameWords.length - 1 === this.typedWordCount;

        if (isCorrectKey && !isLastLetter) {
            this.currentWord = this.currentWord.slice(1);
            this.drawWord();
            this.playSound(this.correctSound);
            return;
        }

        if (isCorrectKey && isLastLetter && hasMoreWords) {
            this.typedWordCount++;
            this.updateInfo();
            this.selectWord();
            this.playSound(this.correctSound);
            return;
        }

        if (isCorrectKey && isLastLetter && isLastWord) {
            this.typedWordCount++;
            this.updateInfo();
            this.playSound(this.correctSound);
            this.endGame();
            return;
        }

        this.showWrongKeyFeedback();
    }

    showWrongKeyFeedback() {
        this.wordText.style.color = "red";
        this.playSound(this.wrongSound);

        setTimeout(() => {
            this.wordText.style.color = "#0f3d66";
        }, 100);
    }

    endGame() {
        this.endTime = performance.now();
        this.score = ((this.endTime - this.startTime) / 1000).toFixed(2);

        this.wordText.innerHTML =
            "Mäng läbi. Sinu aeg on: " + this.score + " sekundit.";

        window.removeEventListener("keypress", this.keyListener);
        this.keyListener = null;

        this.restartButton.style.display = "inline-block";
        this.updateSpeedBadge();
        this.playSound(this.finishSound);
        this.saveResult();
    }

    generateWords() {
        this.gameWords = [];

        for (let index = 0; index < this.wordsInGame; index++) {
            const wordLength = this.startingWordLength + index;
            this.gameWords[index] = this.getRandomWordByLength(wordLength);
        }

        this.selectWord();
    }

    getRandomWordByLength(wordLength) {
        if (
            this.wordsByLength[wordLength] &&
            this.wordsByLength[wordLength].length > 0
        ) {
            const randomIndex = Math.floor(
                Math.random() * this.wordsByLength[wordLength].length
            );

            return this.wordsByLength[wordLength][randomIndex];
        }

        return "puudu";
    }

    selectWord() {
        this.currentWord = this.gameWords[this.typedWordCount];
        this.drawWord();
    }

    drawWord() {
        this.wordText.innerHTML = this.currentWord;
    }

    updateInfo() {
        this.wordCountText.innerHTML =
            "Sõnu trükitud: " +
            this.typedWordCount +
            "/" +
            this.wordsInGame;

        this.updateProgressBar();
    }
}

const typer = new Typer();