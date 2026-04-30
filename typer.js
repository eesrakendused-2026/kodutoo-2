
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

        this.loadFromFile();
    }

    loadResults(){
        const resultDiv = document.getElementById("results");
        resultDiv.innerHTML = "";

        for(let i=0; i < this.results.length; i++){
            const row = document.createElement("div");
            row.textContent = `${i+1}. ${this.results[i].name} ${this.results[i].time}`;
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
        const dataFromFile = data.split("\n");
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

    shorteWord(keypressed){
        if(this.word[0] === keypressed && this.word.length > 1 && this.typeWords.length > this.wordsTyped){
            this.word = this.word.slice(1);
            this.drawWord();
        } else if (this.word[0] === keypressed && this.word.length == 1 && this.wordsTyped <= this.typeWords.length-2){
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
            }, 100)
        }
    }

    endGame(){
        this.endTime = performance.now();
        this.score = ((this.endTime - this.startTime) / 1000).toFixed(2);
        document.getElementById("word").innerHTML = "Mäng läbi. Sinu aeg on: " + this.score + " sekundit.";
        window.removeEventListener("keypress", this.keyListener)
        this.loadResultsFromFile();
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
            const len = this.wordsInGame + i;
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
