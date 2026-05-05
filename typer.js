console.log("typer.js on õigesti ühendatud");

class Typer {
    constructor() {
        this.name = "";
        this.wordsInGame = 5;
        this.startingWordLength = 2;
        this.startTime = 0;
        this.endTime = 0;
        this.word = "Suvaline";
        this.words = [];
        this.typeWords = [];
        this.wordsTyped = 0;
        this.score = 0;
        this.results = [];
        this.combo = 0;

        document.getElementById("restartGame").addEventListener("click", () => this.restart());
        this.leaderboard = new Leaderboard();
        this.loadFromFile();
    }

    async loadFromFile() {
        console.log("load from file sees");
        const responseFromFile = await fetch("lemmad2013.txt");
        const allWords = await responseFromFile.text();

        this.getWords(allWords);
    }

    getWords(data) {
        //console.log(data);
        const dataFromFile = data.split("\n");
        this.separateWordsByLength(dataFromFile);
    }

    separateWordsByLength(words) {
        for (let word of words) {
            const wordLength = word.length;
            if (!this.words[wordLength]) {
                this.words[wordLength] = []
            }
            this.words[wordLength].push(word);
            //[["a", "b"], ["as", "nm"]]
        }

        console.log(this.words);
        this.askName();
    }

    askName() {
        document.getElementById("submitname").addEventListener('click', () => {
            console.log(document.getElementById("username").value);

            this.name = document.getElementById("username").value
            this.difficulty = document.getElementById("difficulty").value;
            this.startCountdown();
        })
    }

    startCountdown() {
        const startSound = new Audio("start.mp3");
        const gameMusic = new Audio("rainbow.mp3");
        startSound.play();
        document.getElementById("counter").style.display = "flex";
        document.querySelector("#name").style.display = "none";
        let i = 5;

        let countdown = setInterval(() => {
            document.getElementById("time").innerHTML = i - 1;
            i--;
            console.log(i)
            if (i == 0) {
                document.getElementById("counter").style.display = "none";

                gameMusic.loop = true;
                gameMusic.play();
                this.gameMusic = gameMusic;
                this.startTyper();
                clearInterval(countdown);
            }
        }, 1000);

    }

    startTyper() {
        this.generateWords();
        this.upDateInfo();
        document.querySelector("#info").style.display = "flex";
        document.querySelector("#wordContainer").style.display = "flex";

        this.startTime = performance.now();

        this.keyListener = (e) => {
            this.shorteWord(e.key);
            console.log("keypress sees")
        }

        window.addEventListener("keypress", this.keyListener)
    }

    shorteWord(keypressed) {
        if (this.word[0] === keypressed) {
            // ÕIGE TÄHT -> Suurenda combot
            this.combo++;
            this.updateCombo();

            if (this.word.length > 1 && this.typeWords.length > this.wordsTyped) {
                this.word = this.word.slice(1);
                this.drawWord();
            } else if (this.word.length == 1 && this.wordsTyped <= this.typeWords.length - 2) {
                this.wordsTyped++;
                this.upDateInfo();
                this.selectWord();
            } else if (this.word.length == 1 && this.typeWords.length - 1 == this.wordsTyped) {
                this.upDateInfo();
                this.wordsTyped = 0;
                this.endGame();
            }
        } else {
            // VALE TÄHT -> Combo nulli!
            this.combo = 0;
            this.updateCombo();

            document.getElementById("word").style.color = "red";
            setTimeout(() => {
                document.getElementById("word").style.color = "black";
            }, 100);
        }
    }

    updateCombo() {
        document.getElementById("comboCounter").innerHTML = this.combo;

        if (this.combo === 10) {
            const sound10 = new Audio("combo10.mp3");
            sound10.play();
        } else if (this.combo === 20) {
            const sound20 = new Audio("combo20.mp3");
            sound20.play();
        }

        const comboElement = document.getElementById("comboCounter");
        if (this.combo > 20) {
            comboElement.style.color = "red";
            comboElement.style.fontSize = "60px";
        } else if (this.combo >= 10) {
            comboElement.style.color = "orange";
            comboElement.style.fontSize = "45px";
        } else {
            comboElement.style.color = "black";
            comboElement.style.fontSize = "36px";
        }
    }

    async endGame() {
        if (this.gameMusic) {
            this.gameMusic.pause();
            this.gameMusic.currentTime = 0;
        }

        //  Mängime lõpu heli
        const endSound = new Audio("cheer.mp3");
        this.endMusic = new Audio("end.mp3");
        endSound.play();
        this.endMusic.play();
        this.endTime = performance.now();
        this.score = ((this.endTime - this.startTime) / 1000).toFixed(2);

        if (parseFloat(this.score) > 0) {
            this.saveResult();
        }

        document.getElementById("word").innerHTML = "Mäng läbi. Sinu aeg on: " + this.score + " sekundit.";
        window.removeEventListener("keypress", this.keyListener)

        document.getElementById("restartGame").style.display = "block";

        this.loadResultsFromFile();
    }

    restart() {
        // NulliN mängu andmed
        this.wordsTyped = 0;
        this.typeWords = [];
        this.score = 0;
        this.combo = 0;
        document.getElementById("comboCounter").innerHTML = "0";

        if (this.endMusic) {
            this.endMusic.pause();
            this.endMusic.currentTime = 0;
        }

        document.getElementById("restartGame").style.display = "none";
        document.getElementById("word").innerHTML = "";
        document.getElementById("info").style.display = "none";
        document.getElementById("wordContainer").style.display = "none";

        document.getElementById("name").style.display = "flex";
        document.getElementById("username").value = "";
    }

    async saveResult() {
        if (parseFloat(this.score) <= 0 || !this.name) return;

        try {
            const responseLoad = await fetch("database.txt?t=" + Date.now());
            const data = await responseLoad.json();
            let content = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
            this.results = Array.isArray(content) ? content : [];
        } catch (err) {
            console.error("Ei saanud vana edetabelit kätte, alustan uut:", err);
            this.results = [];
        }

        let newResult = {
            name: this.name,
            time: this.score
        };
        this.results.push(newResult);

        this.results.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
        this.results = this.results.slice(0, 15);

        try {
            const response = await fetch("server.php", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: "save=" + encodeURIComponent(JSON.stringify(this.results))
            });

            if (response.ok) {
                console.log("Andmed salvestatud!");
                if (this.leaderboard) {
                    await this.leaderboard.loadResultsFromFile();
                }
            }
        } catch (err) {
            console.error("Võrguviga salvestamisel:", err);
        }
    }

    generateWords() {
        for (let i = 0; i < this.wordsInGame; i++) {
            let wordLength;

            if (this.difficulty === "easy") {
                wordLength = Math.floor(Math.random() * 3) + 3;
            } else if (this.difficulty === "hard") {
                wordLength = Math.floor(Math.random() * 5) + 8;
            } else {
                wordLength = this.startingWordLength + i;
            }

            if (this.words[wordLength]) {
                const randomIndex = Math.floor(Math.random() * this.words[wordLength].length);
                this.typeWords[i] = this.words[wordLength][randomIndex];
            } else {
                this.typeWords[i] = "viga";
            }
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

    upDateInfo() {
        document.getElementById("wordcount").innerHTML = "Sõnu trükitud: " + this.wordsTyped + "/" + this.wordsInGame;
    }
}

window.addEventListener('load', () => {
    let typer = new Typer();
});