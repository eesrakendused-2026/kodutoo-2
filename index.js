
console.log("Test")

class Typer {
    constructor() {
        this.name = "";
        this.wordsCounter = 6;
        this.wordLength = 2;
        this.startTime = 0;
        this.endTime = 0;
        this.words = [];
        this.typeWords = []
        this.wordsType = 0
        this.counter = 0
        this.score = 999
        this.loadWords()
        this.getWords()
        this.sortWords()
        this.generateWords()
        this.startGame()
        this.selectWord()
        this.shorterWord()
    }

    async loadWords() {
        const loadWords = await fetch("./public/words.txt")
        const words = await loadWords.text()
        this.getWords(words)
    }

    getWords(data) {
        const splitData = data.split("\n")
        this.sortWords(splitData)

    }

    sortWords(data) {
        for (let word of data) {
            const wordLength = word.length
            if (!this.words[wordLength]) {
                this.words[wordLength] = []
            }
            else {
                this.words[wordLength].push(word)
            }
        }
        this.startGame()
    }

    startGame() {
        let i = 0
        this.generateWords();
        window.addEventListener("keypress", (event) => { this.shorterWord(event.key) })
        this.name = document.getElementById("username").value

        setInterval(()=>{
            this.score = parseInt(this.score) - 1
            document.getElementById("score").innerHTML = this.score
        }, 1000)
    }

    shorterWord(event) {
        console.log(event)
        if (this.word[0] === event && this.word.length > 1 && this.typeWords.length > this.wordsType) {
            this.word = this.word.slice(1)
            this.drawWord()
        }
        else if (this.word[0] === event && this.word.length == 1 && this.typeWords.length - 2 >= this.wordsType) {
            this.wordsType++
            this.selectWord()
        }
        else if (this.word[0] === event && this.word.length == 1 && this.typeWords.length - 2 == this.wordsType) {
            this.wordsType = 0
            document.getElementById("word").innerHTML = "Game over"
        }
    }

    generateWords() {
        for (let i = 0; i < this.wordsCounter; i++) {
            const len = this.wordsCounter + i
            const randomIndex = Math.floor(Math.random() * this.words[len].length)
            this.typeWords[i] = this.words[len][randomIndex]
        }

        this.selectWord()

    }

    selectWord() {
        this.counter++
        if (this.counter < this.wordsCounter) {
            console.log(this.counter)
            document.getElementById("wordcount").innerHTML = `${this.counter}/${this.wordsCounter - 1}`
            this.word = this.typeWords[this.wordsType]
            this.drawWord()
        }
        else if (this.counter >= this.wordsCounter) {
            console.log("Läbi mang")
            this.saveResult()
            alert(`Nimi: ${this.name}, Skoor: ${this.score}`)
        }

    }


    drawWord() {
        document.getElementById("word").innerHTML = this.word
    }

    async saveResult() {
        let result = {
            name: this.name,
            time: this.score
        }
        localStorage.setItem("score", json.stringify(result))

        try {
            await fetch("server.php", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: "save=" + encodeURIComponent(JSON.stringify(this.result))
            });
            console.log("Success!")
        }
        catch (err) {
            console.log(err)
        }
    }


}
document.getElementById("saveName").addEventListener("click", () => {
    let infoCont = document.getElementById("info")
    let wordCont = document.getElementById("wordContainer")
    let count = 3;
    const countdown = setInterval(() => {
        document.getElementById("count").innerHTML = count
        document.getElementById("name").style.display = "none"
        count--;

        if (count < 0) {
            clearInterval(countdown);
            wordCont.style.visibility = "visible"
            infoCont.style.visibility = "visible"
            document.getElementById("count").style.display = "none"
            let typer = new Typer();
        }
    }, 1000);
    countdown()

})

