console.log("Fail õigesti ühendatud");

class Typer{
    constructor(){
        this.mistakes = 0; 
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

        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.initDarkMode(); 
        this.restartBtn = document.getElementById("restartBtn");
        this.restartBtn.addEventListener('click', () => this.resetGame());

        this.loadFromFile();
        this.initModal();
    }

    initDarkMode() {
        const btn = document.getElementById("darkModeBtn");
        btn.addEventListener('click', () => {
            document.body.classList.toggle("dark-mode");
            if(document.body.classList.contains("dark-mode")) {
                btn.value = "Hele režiim ☀️";
            } else {
                btn.value = "Tume režiim 🌙";
            }
        });
    }

    initModal() {
        const modal = document.getElementById("resultsModal");
        const btn = document.getElementById("showModalBtn");
        const span = document.getElementsByClassName("close")[0];

        btn.addEventListener('click', () => {
            modal.style.display = "flex";
        });

        span.addEventListener('click', () => {
            modal.style.display = "none";
        });

        window.addEventListener('click', (event) => {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        });
    }

    playSound(type) {
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        if (type === 'start') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.1);
        } else if (type === 'correct') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.1);
        } else if (type === 'wrong') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.2);
        } else if (type === 'end') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
            osc.frequency.setValueAtTime(554, this.audioCtx.currentTime + 0.2); 
            osc.frequency.setValueAtTime(659, this.audioCtx.currentTime + 0.4); 
            gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.6);
        }
    }

    loadResults(){
        const resultDiv = document.getElementById("results");
        resultDiv.innerHTML = "";

        const topLimit = Math.min(20, this.results.length);

        for(let i=0; i < topLimit; i++){
            const row = document.createElement("div");
            row.classList.add("result-row");

            const rankSpan = document.createElement("span");
            rankSpan.textContent = `${i+1}.`;

            const nameSpan = document.createElement("span");
            nameSpan.textContent = this.results[i].name || "Tundmatu";

            const timeSpan = document.createElement("span");
            timeSpan.textContent = `${parseFloat(this.results[i].time).toFixed(2)}`;

            const mistakesSpan = document.createElement("span");
            mistakesSpan.textContent = this.results[i].mistakes || 0;

            row.appendChild(rankSpan);
            row.appendChild(nameSpan);
            row.appendChild(timeSpan);
            row.appendChild(mistakesSpan); 
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
        const dataFromFile = data.split("\n").map(word => word.trim());
        this.separateWordsByLength(dataFromFile);
    }

    separateWordsByLength(words){
        for (let word of words){
            const wordLength = word.length;
            if(!this.words[wordLength]){
                this.words[wordLength] = []
            }
            this.words[wordLength].push(word);
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
        let i = 3;

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

    }

    startTyper(){
        this.wordsInGame = parseInt(document.getElementById("difficulty").value);
        this.mistakes = 0; 
        document.getElementById("mistakesCount").innerHTML = "Vigu: " + this.mistakes;

        this.generateWords();
        this.upDateInfo();
        document.querySelector("#info").style.display = "flex";
        document.querySelector("#wordContainer").style.display = "flex";

        this.startTime = performance.now();
        
        this.playSound('start');
        
        this.keyListener = (e) => {
            this.shorteWord(e.key);
        }

        window.addEventListener("keypress", this.keyListener)
    }

    shorteWord(keypressed){
        if(this.word[0] === keypressed && this.word.length > 1 && this.typeWords.length > this.wordsTyped){
            this.word = this.word.slice(1);
            this.drawWord();
            this.playSound('correct'); 
            
        } else if (this.word[0] === keypressed && this.word.length == 1 && this.wordsTyped <= this.typeWords.length-2){
            this.wordsTyped++;
            this.upDateInfo();
            this.selectWord();
            this.playSound('correct'); 
            
        } else if(this.word[0] === keypressed && this.word.length == 1 && this.typeWords.length-1 == this.wordsTyped){
            this.upDateInfo();
            this.wordsTyped = 0;
            this.endGame();
        } else if(this.word[0] != keypressed){
            document.getElementById("word").style.color = "red";
            this.playSound('wrong'); 
            
            this.mistakes++;
            document.getElementById("mistakesCount").innerHTML = "Vigu: " + this.mistakes;
            
            setTimeout(() => {
                document.getElementById("word").style.color = "black";
            }, 100)
        }
    }

    endGame(){
        this.endTime = performance.now();
        this.score = ((this.endTime - this.startTime) / 1000).toFixed(2);
        
        let wpm = Math.round((this.wordsInGame / this.score) * 60);

        let imageUrl = "";
        if (wpm < 20) {
            imageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Tortoise_icon.svg/200px-Tortoise_icon.svg.png";
        } else if (wpm < 40) {
            imageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Person_icon_BLACK-01.svg/200px-Person_icon_BLACK-01.svg.png";
        } else if (wpm < 60) {
            imageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Rabbit_icon.svg/200px-Rabbit_icon.svg.png";
        } else {
            imageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Rocket-icon.svg/200px-Rocket-icon.svg.png";
        }

        document.getElementById("word").innerHTML = `Mäng läbi!<br>Aeg: ${this.score}s | Kiirus: ~${wpm} WPM`;
        
        const imgEl = document.getElementById("playerImage");
        imgEl.src = imageUrl;
        imgEl.style.display = "block";

        this.playSound('end'); 

        window.removeEventListener("keypress", this.keyListener);
        this.loadResultsFromFile();

        this.restartBtn.style.display = "block";
    }

    resetGame() {
        document.querySelector("#info").style.display = "none";
        document.querySelector("#wordContainer").style.display = "none";
        document.querySelector("#counter").style.display = "none";
        this.restartBtn.style.display = "none";
        document.getElementById("playerImage").style.display = "none";
        
        document.querySelector("#name").style.display = "flex";
        
        this.wordsTyped = 0;
        this.typeWords = [];
        this.word = "";
        document.getElementById("word").innerHTML = "";
    }

    async saveResult(){
        let result = {
            name: this.name,
            time: this.score,
            mistakes: this.mistakes 
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
            
            if (this.words[len]) {
                const randomIndex = Math.floor(Math.random() * this.words[len].length);
                this.typeWords[i] = this.words[len][randomIndex];
            } else {
                this.typeWords[i] = "viga"; 
            }
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