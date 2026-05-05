console.log("Fail õigesti ühendatud");

class Typer{
    constructor(){
        this.name = "";
        this.wordsInGame = 1;
        this.startingWordLength = 2;
        this.startTime = 0;
        this.endTime = 0;
        this.word = "Suvaline";
        this.words = [];
        this.typeWords = [];
        this.wordsTyped = 0;
        this.score = 0;

        this.results = [];

        this.setupModal();
        this.loadFromFile();
    }

    setupModal(){
        document.getElementById("openModal").addEventListener("click", () => {
            document.getElementById("modal").classList.add("open");
        });
        document.getElementById("closeModal").addEventListener("click", () => {
            document.getElementById("modal").classList.remove("open");
        });
        document.getElementById("modal").addEventListener("click", (e) => {
            if(e.target === document.getElementById("modal")){
                document.getElementById("modal").classList.remove("open");
            }
        });
    }

    getSpeedLabel(wpm){
        if(wpm >= 80) return "Tipptegija";
        if(wpm >= 60) return "Kiire";
        if(wpm >= 40) return "Keskmine";
        if(wpm >= 20) return "Alustaja";
        return "Ei ole lootust";
    }

    loadResults(){
        const resultDiv = document.getElementById("results");
        resultDiv.innerHTML = "";

        for(let i=0; i < this.results.length; i++){
            const row = document.createElement("div");
            row.className = "result-row";

            const totalChars = this.typeWords.length > 0 ? this.typeWords.join("").length : 10;
            const wpm = Math.round((totalChars / 5) / (parseFloat(this.results[i].time) / 60));

            row.innerHTML = `
                <span>${i+1}.</span>
                <span>${this.results[i].name}</span>
                <span>${this.results[i].time}s</span>
                <span>${this.getSpeedLabel(wpm)}</span>
            `;
            resultDiv.appendChild(row);
        }
    }

    async loadFromFile(){
        console.log("load from file sees");
        const responseFromFile = await fetch("lemmad2013.txt");
        const allWords = await responseFromFile.text();
        this.loadResultsFromFile();

        this.getWords(allWords);
    }

    async loadResultsFromFile(){
        try {
            const resultsResponse = await fetch("");
            const resultsText = await resultsResponse.text();
            let content = JSON.parse(resultsText).content;
            console.log(content);
            this.results = JSON.parse(content) || [];
        } catch(e) {
            this.results = [];
        }
        this.loadResults();
        this.saveResult()
    }

    getWords(data){
        const dataFromFile = data.split("\n");
        this.separateWordsByLength(dataFromFile);
    }

    separateWordsByLength(words){
        for(let word of words){
            const cleanWord = word.trim();
            if(!cleanWord) continue;
            const wordLength = cleanWord.length;
            if(!this.words[wordLength]){
                this.words[wordLength] = [];
            }
            this.words[wordLength].push(cleanWord);
        }

        console.log(this.words);
        this.askName();
    }

    askName(){
        document.getElementById("submitname").addEventListener("click", () => {
            console.log(document.getElementById("username").value);
            this.name = document.getElementById("username").value;
            this.wordsInGame = parseInt(document.getElementById("difficulty").value);
            this.startCountdown();
        });
    }

    startCountdown(){
        document.getElementById("counter").style.display = "flex";
        document.querySelector("#name").style.display = "none";
        let i = 3;

        let countdown = setInterval(() => {
            document.getElementById("time").innerHTML = i-1;
            i--;
            console.log(i);
            if(i == 0){
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

        this.startTime = performance.now();

        this.keyListener = (e) => {
            this.shorteWord(e.key);
            console.log("keypress sees");
        };

        window.addEventListener("keypress", this.keyListener);
    }

    shorteWord(keypressed){
        if(this.word[0] === keypressed && this.word.length > 1 && this.typeWords.length > this.wordsTyped){
            this.word = this.word.slice(1);
            this.drawWord();
        } else if(this.word[0] === keypressed && this.word.length == 1 && this.wordsTyped <= this.typeWords.length-2){
            this.wordsTyped++;
            this.upDateInfo();
            this.selectWord();
        } else if(this.word[0] === keypressed && this.word.length == 1 && this.typeWords.length-1 == this.wordsTyped){
            this.upDateInfo();
            this.wordsTyped = 0;
            this.endGame();
        } else if(this.word[0] != keypressed){
            document.getElementById("word").style.color = "red";
            setTimeout(() => {
                document.getElementById("word").style.color = "black";
            }, 100);
        }
    }

    endGame(){
        this.endTime = performance.now();
        this.score = ((this.endTime - this.startTime) / 1000).toFixed(2);

        const totalChars = this.typeWords.join("").length;
        const wpm = Math.round((totalChars / 5) / (parseFloat(this.score) / 60));
        const speedLabel = this.getSpeedLabel(wpm);

        document.getElementById("word").innerHTML = "Mäng labi! Aeg: " + this.score + "s | " + speedLabel + " (" + wpm + " WPM)";
        window.removeEventListener("keypress", this.keyListener);

        const btn = document.createElement("input");
        btn.type = "button";
        btn.value = "Mängi uuesti";
        btn.addEventListener("click", () => { location.reload(); });
        document.getElementById("wordContainer").appendChild(btn);

        this.loadResultsFromFile();
    }

    async saveResult(){
        let result = {
            name: this.name,
            time: this.score
        };

        console.log(typeof(this.results));
        console.log(this.results);

        this.results.push(result);
        this.results.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
        localStorage.setItem("score", JSON.stringify(this.results));

        try{
            await fetch("server.php", {
                method: "POST",
                headers: {"Content-Type": "application/x-www-form-urlencoded"},
                body: "save=" + encodeURIComponent(JSON.stringify(this.results))
            });
            console.log("success" + encodeURIComponent(JSON.stringify(this.results)));
        } catch(err){
            alert("Failed " + err);
        } finally{
            console.log("päring lopetud");
            this.loadResults();
        }

        console.log(this.results); 
    }

    generateWords(){
        this.typeWords = [];
        for(let i=0; i<this.wordsInGame; i++){
            const len = this.wordsInGame + i + 2;
            const randomIndex = Math.floor(Math.random() * this.words[len].length);
            this.typeWords[i] = this.words[len][randomIndex];
        }

        this.selectWord();
    }

    selectWord(){
        this.word = this.typeWords[this.wordsTyped];
        this.drawWord();
    }

    drawWord(){
        document.getElementById("word").innerHTML = this.word;
    }

    upDateInfo(){
        document.getElementById("wordcount").innerHTML = "Sõnu trükitud: " + this.wordsTyped + "/" + this.wordsInGame;
    }
}

let typer = new Typer();