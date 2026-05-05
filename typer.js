class Typer{
    constructor(){
        this.name = "";
        this.wordsInGame = 3;
        this.startTime = 0;
        this.endTime = 0;
        this.word = "";
        this.words = [];
        this.typeWords = [];
        this.wordsTyped = 0;
        this.score = 0;
        this.results = [];
        this.mistakes = 0;
        this.keystrokes = 0;
        this.gameActive = false;
        this.audioContext = null;
        this.defaultWords = [
            "auto", "maja", "kool", "laud", "tool", "mets", "meri", "sild",
            "aken", "uks", "vihm", "paike", "lumi", "raamat", "pliiats",
            "kass", "koer", "lind", "kevad", "suvi", "sugis", "talv",
            "arvuti", "telefon", "ekraan", "klaviatuur", "hiir", "tuba",
            "tund", "minut", "sekund", "sober", "opilane", "opetaja"
        ]; // Fallback sõnad juhuks, kui faili laadimine ebaõnnestub (lokaalses arvutis ''fetch'' ei pruugi töötada)
        this.loadFromFile();
        this.bindButtons();
    }

    bindButtons(){
        document.getElementById("showResults").addEventListener("click", () => {
            document.getElementById("resultsModal").style.display = "block";
        });

        document.getElementById("closeModal").addEventListener("click", () => {
            document.getElementById("resultsModal").style.display = "none";
        });

        document.getElementById("restart").addEventListener("click", () => {
            location.reload();
        });
    }

    loadResults(){
        const resultDiv = document.getElementById("results");
        resultDiv.innerHTML = "";

        for(let i = 0; i < this.results.length; i++){
            const row = document.createElement("div");
            row.className = "resultRow";
            row.innerHTML = `
                <div>${i + 1}.</div>
                <div>
                    <div><strong>Nimi:</strong> ${this.results[i].name}</div>
                    <div><strong>Tase:</strong> ${this.results[i].level || "-"}</div>
                </div>
                <div><strong>Aeg:</strong><br>${this.results[i].time}</div>
                <div><strong>Kiirus:</strong><br>${this.results[i].speed || 0} spm</div>
            `;
            resultDiv.appendChild(row);
        }
    }

    async loadFromFile(){
        try{
            const responseFromFile = await fetch("lemmad2013.txt");
            const allWords = await responseFromFile.text();
            this.getWords(allWords);
        } catch(error){
            this.getWords(this.defaultWords.join("\n"));
        }

        await this.loadResultsFromFile();
    }

    async loadResultsFromFile(){
        try{
            const resultsResponse = await fetch("database.txt");
            const resultsText = await resultsResponse.text();
            const content = JSON.parse(resultsText).content;
            this.results = JSON.parse(content) || [];
        } catch(error){
            this.results = JSON.parse(localStorage.getItem("results") || "[]");
        }

        this.results = this.results.filter(result => result.name && parseFloat(result.time) > 0);
        this.loadResults();
    }

    getWords(data){
        const dataFromFile = data.split("\n");
        this.separateWordsByLength(dataFromFile);
    }

    separateWordsByLength(words){
        for (let word of words){
            const cleanWord = word.trim().toLowerCase();
            const wordLength = cleanWord.length;

            if(wordLength > 1){
                if(!this.words[wordLength]){
                    this.words[wordLength] = [];
                }
                this.words[wordLength].push(cleanWord);
            }
        }

        this.askName();
    }

    askName(){
        document.getElementById("submitname").addEventListener("click", () => {
            this.name = document.getElementById("username").value.trim();

            if(this.name.length < 2){
                alert("Sisesta nimi");
                return;
            }

            this.setLevel();
            this.startCountdown();
        });
    }

    setLevel(){
        const level = document.getElementById("difficulty").value;

        if(level === "easy"){
            this.wordsInGame = 3;
            this.startingWordLength = 3;
        } else if(level === "medium"){
            this.wordsInGame = 5;
            this.startingWordLength = 4;
        } else {
            this.wordsInGame = 7;
            this.startingWordLength = 5;
        }

        document.getElementById("leveltext").innerHTML = "Raskusaste: " + this.getLevelName();
    }

    getLevelName(){
        const level = document.getElementById("difficulty").value;

        if(level === "easy"){
            return "Lihtne";
        }

        if(level === "medium"){
            return "Keskmine";
        }

        return "Raske";
    }

    startCountdown(){
        document.getElementById("counter").style.display = "flex";
        document.querySelector("#name").style.display = "none";
        let i = 3;
        document.getElementById("time").innerHTML = i;
        this.playSound(500, 0.2);

        const countdown = setInterval(() => {
            i--;
            document.getElementById("time").innerHTML = i;

            if(i === 0){
                document.getElementById("counter").style.display = "none";
                this.startTyper();
                clearInterval(countdown);
            }
        }, 1000);
    }

    startTyper(){
        this.generateWords();
        this.upDateInfo();
        document.querySelector("#info").style.display = "flex";
        document.querySelector("#wordContainer").style.display = "flex";
        document.getElementById("resultBox").style.display = "none";
        this.startTime = performance.now();
        this.gameActive = true;
        this.playSound(650, 0.15);

        this.keyListener = (e) => {
            this.keystrokes++;
            this.shorteWord(e.key.toLowerCase());
        };

        window.addEventListener("keypress", this.keyListener);
    }

    shorteWord(keypressed){
        if(!this.gameActive){
            return;
        }

        if(this.word[0] === keypressed && this.word.length > 1 && this.typeWords.length > this.wordsTyped){
            this.word = this.word.slice(1);
            this.drawWord();
            this.playSound(400, 0.03);
        } else if (this.word[0] === keypressed && this.word.length === 1 && this.wordsTyped <= this.typeWords.length - 2){
            this.wordsTyped++;
            this.upDateInfo();
            this.selectWord();
            this.playSound(400, 0.03);
        } else if(this.word[0] === keypressed && this.word.length === 1 && this.typeWords.length - 1 === this.wordsTyped){
            this.wordsTyped++;
            this.upDateInfo();
            this.endGame();
        } else if(this.word[0] !== keypressed){
            this.mistakes++;
            document.getElementById("word").style.color = "red";
            setTimeout(() => {
                document.getElementById("word").style.color = "black";
            }, 100);
        }

        this.updateAccuracy();
    }

    endGame(){
        this.endTime = performance.now();
        this.score = ((this.endTime - this.startTime) / 1000).toFixed(2);
        this.gameActive = false;
        window.removeEventListener("keypress", this.keyListener);
        this.playSound(750, 0.25);
        this.showResult();
        this.saveResult();
    }

    showResult(){
        const speed = this.getSpeed();
        const accuracy = this.getAccuracy();
        document.getElementById("resultBox").style.display = "flex";
        document.getElementById("resultText").innerHTML =
            "Aeg: " + this.score + " s<br>" +
            "Kiirus: " + speed + " spm<br>" +
            "Täpsus: " + accuracy + "%";
        document.getElementById("speedImage").src = this.getSpeedImage(speed);
    }

    getSpeed(){
        const letters = this.typeWords.join("").length;
        return Math.round((letters / parseFloat(this.score)) * 60);
    }

    getAccuracy(){
        if(this.keystrokes === 0){
            return 100;
        }

        return Math.round(((this.keystrokes - this.mistakes) / this.keystrokes) * 100);
    }

    getSpeedImage(speed){
        if(speed < 150){
            return "images/aeglane.svg";
        }

        if(speed < 250){
            return "images/keskmine.svg";
        }

        return "images/kiire.svg";
    }

    async saveResult(){
        const result = {
            name: this.name,
            time: this.score,
            speed: this.getSpeed(),
            level: this.getLevelName()
        };

        this.results.push(result);
        this.results.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
        this.results = this.results.slice(0, 20);
        localStorage.setItem("results", JSON.stringify(this.results));
        this.loadResults();

        if(this.results.findIndex(item => item.name === result.name && item.time === result.time) !== -1){
            this.playSound(900, 0.3);
        }

        try{
            await fetch("server.php", {
                method: "POST",
                headers: {"Content-Type" : "application/x-www-form-urlencoded"},
                body: "save=" + encodeURIComponent(JSON.stringify(this.results))
            });
        } catch(err){
            alert("Salvestamine ebaõnnestus");
        }
    }

    generateWords(){
        this.typeWords = [];

        for(let i = 0; i < this.wordsInGame; i++){
            const len = this.startingWordLength + i;
            const list = this.words[len] || this.words[this.startingWordLength];
            const randomIndex = Math.floor(Math.random() * list.length);
            this.typeWords[i] = list[randomIndex];
        }

        this.wordsTyped = 0;
        this.selectWord();
    }

    selectWord(){
        this.word = this.typeWords[this.wordsTyped];
        this.drawWord();
        this.drawNextWord();
    }

    drawWord(){
        document.getElementById("word").innerHTML = this.word;
    }

    drawNextWord(){
        const nextWord = this.typeWords[this.wordsTyped + 1] || "-";
        document.getElementById("nextword").innerHTML = "Järgmine sõna: " + nextWord;
    }

    upDateInfo(){
        document.getElementById("wordcount").innerHTML =
            "Sõnu trükitud: " + this.wordsTyped + "/" + this.wordsInGame;
        this.updateAccuracy();
    }

    updateAccuracy(){
        document.getElementById("accuracy").innerHTML =
            "Täpsus: " + this.getAccuracy() + "%";
    }

    playSound(frequency, duration){
        if(!this.audioContext){
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(this.audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.start();
        gain.gain.setValueAtTime(0.05, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + duration);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
}

let typer = new Typer();
