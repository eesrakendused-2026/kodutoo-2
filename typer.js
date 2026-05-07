// Typer game logic
console.log("Typer JS Loaded");

const SOUNDS = {
    start: 'https://s3.amazonaws.com/freecodecamp/drums/Chord_1.mp3',
    key: 'https://s3.amazonaws.com/freecodecamp/drums/Heater-1.mp3',
    end: 'https://s3.amazonaws.com/freecodecamp/drums/Chord_2.mp3',
    leaderboard: 'https://s3.amazonaws.com/freecodecamp/drums/Chord_3.mp3'
};

class Typer {
    constructor() {
        this.playerName = "";
        this.totalWords = 10;
        this.wordsCompleted = 0;
        this.totalCharsTyped = 0;
        this.startTime = 0;
        this.currentWord = "";
        this.allWordsByLength = [];
        this.wordsToType = [];
        this.leaderboard = [];

        this.init();
    }

    init() {
        this.startSound = new Audio(SOUNDS.start);
        this.keySound = new Audio(SOUNDS.key);
        this.endSound = new Audio(SOUNDS.end);
        this.leadSound = new Audio(SOUNDS.leaderboard);
        
        this.keySound.volume = 0.5;
        this.startSound.volume = 0.5;

        this.setupDarkMode();
        this.setupNameInput();
        this.setupModal();
        this.loadGameData();
    }

    playSound(audio) {
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(function(e) {
                console.log("Heli mängimine ebaõnnestus");
            });
        }
    }

    setupDarkMode() {
        let btn = document.getElementById("darkModeToggle");
        
        if (localStorage.getItem("darkMode") === "true") {
            document.body.classList.add("dark-mode");
            btn.innerHTML = "☀️";
        }

        btn.addEventListener("click", function() {
            document.body.classList.toggle("dark-mode");
            let isDark = document.body.classList.contains("dark-mode");
            localStorage.setItem("darkMode", isDark);
            
            if (isDark) {
                btn.innerHTML = "☀️";
            } else {
                btn.innerHTML = "🌙";
            }
        });
    }

    setupNameInput() {
        let input = document.getElementById("username");
        let submitBtn = document.getElementById("submitname");
        
        submitBtn.addEventListener("click", () => {
            if (input.value.trim() !== "") {
                this.playerName = input.value.trim();
                this.startCountdown();
            } else {
                input.style.borderColor = "red";
                setTimeout(() => {
                    input.style.borderColor = "";
                }, 1000);
            }
        });
    }

    setupModal() {
        let modal = document.getElementById("resultsContainer");
        let showBtn = document.getElementById("showResultsBtn");
        let closeBtn = document.querySelector(".close");

        showBtn.addEventListener("click", () => {
            modal.classList.add("show");
        });

        closeBtn.addEventListener("click", () => {
            modal.classList.remove("show");
        });
    }

    async loadGameData() {
        try {
            let response = await fetch("lemmad2013.txt");
            let text = await response.text();
            
            let words = text.split("\n");
            for (let i = 0; i < words.length; i++) {
                let word = words[i].trim();
                if (word.length > 0) {
                    let len = word.length;
                    if (this.allWordsByLength[len] === undefined) {
                        this.allWordsByLength[len] = [];
                    }
                    this.allWordsByLength[len].push(word);
                }
            }
            
            this.fetchLeaderboard();
        } catch (error) {
            console.error("Sõnade laadimine ebaõnnestus", error);
        }
    }

    async fetchLeaderboard() {
        try {
            let response = await fetch("database.txt");
            let data = await response.json();
            this.leaderboard = JSON.parse(data.content);
        } catch (error) {
            let localData = localStorage.getItem("score");
            if (localData) {
                this.leaderboard = JSON.parse(localData);
            } else {
                this.leaderboard = [];
            }
        }
        this.renderLeaderboard();
    }

    startCountdown() {
        document.getElementById("name").style.display = "none";
        document.getElementById("counter").style.display = "flex";
        
        let timeEl = document.getElementById("time");
        timeEl.innerHTML = "Valmistu, " + this.playerName + "!";
        
        let left = 3;
        setTimeout(() => {
            let timer = setInterval(() => {
                left--;
                if (left > 0) {
                    timeEl.innerHTML = left;
                } else {
                    clearInterval(timer);
                    document.getElementById("counter").style.display = "none";
                    this.startGame();
                }
            }, 1000);
        }, 1000);
    }

    startGame() {
        for (let i = 0; i < this.totalWords; i++) {
            let wordLen = 1 + i;
            let list = this.allWordsByLength[wordLen];
            if (list && list.length > 0) {
                let randomIndex = Math.floor(Math.random() * list.length);
                this.wordsToType.push(list[randomIndex]);
            } else {
                this.wordsToType.push("varusõna");
            }
        }
        
        this.playSound(this.startSound);
        document.getElementById("gameUI").style.display = "block";
        this.startTime = performance.now();
        this.nextWord();
        
        this.keyHandler = (e) => this.handleKey(e.key);
        window.addEventListener("keypress", this.keyHandler);
    }

    handleKey(key) {
        if (this.currentWord[0] === key) {
            this.playSound(this.keySound);
            this.totalCharsTyped++;
            
            this.currentWord = this.currentWord.slice(1);
            document.getElementById("word").innerHTML = this.currentWord;
            this.updateStats();

            if (this.currentWord.length === 0) {
                this.wordsCompleted++;
                
                let wordEl = document.getElementById("word");
                wordEl.classList.add("flash-correct");
                setTimeout(() => {
                    wordEl.classList.remove("flash-correct");
                }, 300);
                
                if (this.wordsCompleted < this.totalWords) {
                    this.nextWord();
                } else {
                    this.finishGame();
                }
            }
        } else {
            let wordEl = document.getElementById("word");
            wordEl.classList.add("flash-error");
            setTimeout(() => {
                wordEl.classList.remove("flash-error");
            }, 300);
        }
    }

    nextWord() {
        this.currentWord = this.wordsToType[this.wordsCompleted];
        document.getElementById("word").innerHTML = this.currentWord;
        this.updateStats();
    }

    updateStats() {
        document.getElementById("wordcount").innerHTML = "Sõnu: " + this.wordsCompleted + " / " + this.totalWords;
        
        let percent = (this.wordsCompleted / this.totalWords) * 100;
        document.getElementById("progressBar").style.width = percent + "%";
        
        let timeNow = performance.now();
        let minutes = ((timeNow - this.startTime) / 1000) / 60;
        
        if (minutes > 0) {
            let wpm = Math.round((this.totalCharsTyped / 5) / minutes);
            document.getElementById("wpmDisplay").innerHTML = "WPM: " + wpm;
        }
    }

    finishGame() {
        window.removeEventListener("keypress", this.keyHandler);
        this.playSound(this.endSound);
        
        document.getElementById("word").innerHTML = "Mäng läbi!";
        document.getElementById("showResultsBtn").style.display = "inline-block";
        document.getElementById("playAgainBtn").style.display = "inline-block";
        
        let timeSecs = ((performance.now() - this.startTime) / 1000).toFixed(2);
        let wpm = Math.round((this.totalCharsTyped / 5) / (timeSecs / 60));
        
        this.renderUserScore(timeSecs, wpm);
        
        setTimeout(() => {
            document.getElementById("showResultsBtn").click();
        }, 500);
        
        this.saveScore(timeSecs, wpm);
    }

    renderUserScore(time, wpm) {
        let img = "slow.png";
        let category = "Aeglane";
        
        if (wpm >= 60) {
            img = "fast.png";
            category = "Kiire";
        } else if (wpm >= 30) {
            img = "average.png";
            category = "Keskmine";
        }
        
        let htmlContent = "";
        htmlContent += "<div class='score-name'>" + this.playerName + "</div>";
        htmlContent += "<div class='score-time'>" + time + " s &bull; " + wpm + " WPM</div>";
        htmlContent += "<img src='" + img + "' class='score-image'>";
        htmlContent += "<div class='score-category'>" + category + "</div>";
        
        document.getElementById("scoreContent").innerHTML = htmlContent;
    }

    async saveScore(time, wpm) {
        let newScore = {
            name: this.playerName,
            time: time,
            wpm: wpm
        };
        
        this.leaderboard.push(newScore);
        
        // Sorteerime aja järgi
        this.leaderboard.sort((a, b) => {
            return parseFloat(a.time) - parseFloat(b.time);
        });
        
        localStorage.setItem("score", JSON.stringify(this.leaderboard));
        this.renderLeaderboard();

        try {
            await fetch("server.php", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: "save=" + encodeURIComponent(JSON.stringify(this.leaderboard))
            });
            this.playSound(this.leadSound);
        } catch (e) { 
            console.error("Salvestamine ebaõnnestus", e); 
        }
    }

    renderLeaderboard() {
        let resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = "";
        
        for (let i = 0; i < this.leaderboard.length; i++) {
            let entry = this.leaderboard[i];
            
            let row = document.createElement("div");
            row.className = "result-row";
            
            let wpmValue = entry.wpm;
            if (wpmValue === undefined) {
                wpmValue = "-";
            }
            
            row.innerHTML = `
                <span class="result-rank">${i + 1}.</span>
                <span class="result-name">${entry.name}</span>
                <span class="result-time">${entry.time}</span>
                <span class="result-wpm">${wpmValue}</span>
            `;
            
            resultsDiv.appendChild(row);
        }
    }
}

let game = new Typer();