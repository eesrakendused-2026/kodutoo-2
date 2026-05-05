console.log("Fail õigesti ühendatud");

class Typer{
    constructor(){
        this.name = "";
        this.wordsInGame = 10;
        this.startingWordLength = 1;
        this.startTime = 0;
        this.endTime = 0;
        this.word = "Suvaline";
        this.words = [];
        this.typeWords = [];
        this.wordsTyped = 0;
        this.score = 0;
        this.keySound = new Audio("media/creatorshome-keyboard-click-327728.mp3");
        this.keySound.preload = "auto";
        this.startSound = new Audio("media/49447089-game-start-317318.mp3");
        this.startSound.preload = "auto";
        this.endSound = new Audio("media/freesound_community-good-6081.mp3");
        this.endSound.preload = "auto";
        this.showResultsSound = new Audio("media/alexis_gaming_cam-accepter-2-394924.mp3");
        this.showResultsSound.preload = "auto";

        this.results = [];

        this.loadFromFile();
    }

    playKeySound(){
        this.keySound.currentTime = 0;
        this.keySound.play().catch(() => {
        });
    }

    playStartSound(){
        this.startSound.currentTime = 0;
        this.startSound.play().catch(() => {
        });
    }

    playEndSound(){
        this.endSound.currentTime = 0;
        this.endSound.play().catch(() => {
        });
    }

    playShowResultsSound(){
        this.showResultsSound.currentTime = 0;
        this.showResultsSound.play().catch(() => {
        });
    }

    loadResults(){
        const resultDiv = document.getElementById("results");
        resultDiv.innerHTML = "";

        for(let i=0; i < this.results.length; i++){
            const row = document.createElement("div");
            row.className = "result-row";
            row.innerHTML = `
                <span class="result-rank">${i+1}</span>
                <span class="result-name">${this.results[i].name}</span>
                <span class="result-time">${this.results[i].time}s</span>
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
        const resultsResponse = await fetch("database.txt");
        const resultsText = await resultsResponse.text();
        let content = JSON.parse(resultsText).content;

        console.log(content);

        this.results = JSON.parse(content) || [];
        this.loadResults();
        this.saveResult();
    }

    getWords(data){
        //console.log(data);
        const dataFromFile = data.split("\n").map(w => w.trim()).filter(w => w.length > 0);
        this.separateWordsByLength(dataFromFile);
    }

    separateWordsByLength(words){
        for (let word of words){
            const wordLength = word.length;
            if(!this.words[wordLength]){
                this.words[wordLength] = []
            }
            this.words[wordLength].push(word);
            //[["a", "b"], ["as", "nm"]]
        }

        console.log(this.words);
        this.askName();
    }

    askName(){
        document.getElementById("submitname").addEventListener('click', () => {
           console.log(document.getElementById("username").value);
           this.name = document.getElementById("username").value
           this.startCountdown();
        })
    }

    startCountdown(){
        document.getElementById("counter").style.display = "flex";
        document.querySelector("#name").style.display = "none";
        document.getElementById("time").innerHTML = `Tere, ${this.name}!`;
        let i = 3;

        setTimeout(() => {
        let countdown = setInterval(() => {
            document.getElementById("time").innerHTML = i-1;
            i--;
            console.log(i)
            if(i == 0){
                document.getElementById("counter").style.display = "none";
                this.startTyper();
                clearInterval(countdown);
            }
        }, 1000);
        }, 1000);

    }

    startTyper(){
        this.generateWords();
        this.playStartSound();
        this.upDateInfo();
        document.querySelector("#info").style.display = "flex";
        document.querySelector("#wordContainer").style.display = "flex";

        this.startTime = performance.now();
        
        this.keyListener = (e) => {
            this.playKeySound();
            this.shorteWord(e.key);
            console.log("keypress sees")
        }

        window.addEventListener("keypress", this.keyListener)
    }

    shorteWord(keypressed){
        if(this.word[0] === keypressed && this.word.length > 1 && this.typeWords.length > this.wordsTyped){
            this.word = this.word.slice(1);
            this.drawWord();
        } else if (this.word[0] === keypressed && this.word.length == 1 && this.wordsTyped <= this.typeWords.length-2){
            this.wordsTyped++;
            this.upDateInfo();
            this.flashCorrect();
            this.selectWord();
        } else if(this.word[0] === keypressed && this.word.length == 1 && this.typeWords.length-1 == this.wordsTyped){
            this.upDateInfo();
            this.wordsTyped = 0;
            this.flashCorrect();
            this.endGame();
        } else if(this.word[0] != keypressed){
            document.getElementById("word").style.color = "red";
            setTimeout(() => {
                document.getElementById("word").style.color = "black";
            }, 100)
        }
    }

    flashCorrect(){
        const wordEl = document.getElementById("word");
        wordEl.classList.add("flash-correct");
        setTimeout(() => wordEl.classList.remove("flash-correct"), 350);
    }

    endGame(){
        this.endTime = performance.now();
        this.score = ((this.endTime - this.startTime) / 1000).toFixed(2);
        this.playEndSound();
        document.getElementById("word").innerHTML = "Mäng läbi. Sinu aeg on: " + this.score + " sekundit.";
        window.removeEventListener("keypress", this.keyListener)
        document.getElementById("showResultsBtn").style.display = "block";
        document.getElementById("playAgainBtn").style.display = "block";
        this.loadResultsFromFile();
        this.setupModal();
    }

    setupModal(){
        const modal = document.getElementById("resultsContainer");
        const closeBtn = document.querySelector(".close");
        const showBtn = document.getElementById("showResultsBtn");

        this.displayUserScore();

        showBtn.onclick = () => {
            this.playShowResultsSound();
            modal.classList.add("show");
        };

        closeBtn.addEventListener('click', () => {
            modal.classList.remove("show");
        });

        window.addEventListener('click', (event) => {
            if (event.target == modal) {
                modal.classList.remove("show");
            }
        });
    }

    getCategory(time){
        const timeNum = parseFloat(time);
        if(timeNum < 8){
            return { name: "Kiire", image: "media/cheetah.jpeg" };
        } else if(timeNum < 12){
            return { name: "Keskmine", image: "media/bunny.jpg" };
        } else {
            return { name: "Aeglane", image: "media/turtle.jpeg" };
        }
    }

    displayUserScore(){
        const scoreBox = document.getElementById("scoreContent");
        const category = this.getCategory(this.score);
        
        scoreBox.innerHTML = `
            <div class="score-name">${this.name}</div>
            <div class="score-time">${this.score} sekundit</div>
            <img src="${category.image}" alt="Kategooria" class="score-image">
            <div class="score-category">${category.name}</div>
        `;
    }

    async saveResult(){
        let result = {
            name: this.name,
            time: this.score
        }

        console.log(typeof(this.results))
        console.log(this.results)

        this.results.push(result);
        this.results.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
        localStorage.setItem("score", JSON.stringify(this.results));

        try{
            await fetch("server.php", {
                method: "POST",
                headers: {"Content-Type" : "application/x-www-form-urlencoded"},
                body: "save=" + encodeURIComponent(JSON.stringify(this.results))
            });
            console.log("success" + encodeURIComponent(JSON.stringify(this.results)))
        } catch(err){
            alert("Failed " + err)
        } finally{
            console.log("päring lõpetud")
            this.loadResults();
        }

        console.log(this.results);

    }

    generateWords(){
        for(let i=0; i<this.wordsInGame; i++){
            const len = this.startingWordLength + i;
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