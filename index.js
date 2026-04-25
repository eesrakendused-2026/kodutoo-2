
console.log("Test")

class Typer {
    constructor() {
        this.name = "";
        this.correctLetter = 0
        this.incorrectLetter = 0
        this.activeAudio = document.getElementById("activeAudio")
        this.winAudioGood = document.getElementById("winGood")
        this.wordsCounter = 5;
        this.wordLength = 2;
        this.startTime = 0;
        this.endTime = 0;
        this.words = [];
        this.timer = 0
        this.typeWords = []
        this.wordsType = 0
        this.counter = 0
        this.score = 0
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
        this.activeAudio.volume = 0.2
        this.activeAudio.play()

        this.startGame()
    }


    startGame() {
        let i = 0
        this.generateWords();
        window.addEventListener("keypress", (event) => {
            this.shorterWord(event.key)
        })

        let timer = setInterval(() => {
            if (this.counter >= this.wordsCounter) {
                clearInterval(timer)
            }
            this.timer += 1
            document.getElementById("timer").innerHTML = `Timer: ${this.timer}`
        }, 1000)

        timer()
    }

    shorterWord(event) {
        console.log(event)
        if (this.word[0] === event && this.word.length > 1 && this.typeWords.length > this.wordsType) {
            this.word = this.word.slice(1)
            this.correctLetter += 1
            this.drawWord()
        }
        else if (this.word[0] === event && this.word.length == 1 && this.typeWords.length - 2 >= this.wordsType) {
            this.wordsType++
            this.selectWord()
        }
        else if (this.word[0] === event && this.word.length == 1 && this.typeWords.length - 2 == this.wordsType) {
            this.wordsType = 0
            console.log("Game over")
        }
        else if (this.word[0] != event) {
            this.incorrectLetter += 1
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
            this.enterName()
        }

    }

    enterName() {
        console.log("Correct leters:", this.correctLetter, "Incorrect Letters:", this.incorrectLetter)
        this.activeAudio.pause()
        this.winAudioGood.volume = 0.2
        this.winAudioGood.play()
        let nameContainer = document.getElementById("insertNameContainer")
        let nameInput = document.getElementById("nameInput")
        let saveName = document.getElementById("saveName")
        nameContainer.style.visibility = "visible"
        document.getElementById("word").style.visibility = "hidden"
        saveName.addEventListener("click", () => {
            console.log(nameInput.value)
            if (nameInput.value === "") {
                alert("Name cant be empty")
            }
            else {
                document.getElementById("timer").innerHTML = `Timer: 0`
                let wordCont = document.getElementById("wordContainer")
                info.style.visibility = "hidden"
                wordCont.style.visibility = "hidden"
                nameContainer.style.visibility = "hidden"
                document.getElementById("name").style.display = ""
                this.name = nameInput.value
                document.getElementById("word").style.visibility = "hidden"
                this.saveResult()
                location.reload()
            }
        })

    }

    drawWord() {
        document.getElementById("word").innerHTML = this.word
    }

    scoreCalc() { }

    saveResult() {
        let result = {
            name: this.name,
            score: this.correctLetter - this.incorrectLetter,
            time: this.timer
        }
        console.log(result)
        var olddata = JSON.parse(localStorage.getItem("score")) || []
        olddata.push(result)
        localStorage.setItem("score", JSON.stringify(olddata))
    }


}

//Leaderboards controller
let clicked = false
document.getElementById("leaderboardsBtn").addEventListener("click", () => {
    console.log(clicked)
    if (!clicked) {
        document.getElementById('leaderboardContainer').style.left = "0%"
        clicked = true
    }
    else if (clicked) {
        document.getElementById('leaderboardContainer').style.left = "-100%"
        clicked = false
    }
})


//Start game controller
document.getElementById("startGame").addEventListener("click", () => {
    let infoCont = document.getElementById("info")
    let wordCont = document.getElementById("wordContainer")
    document.getElementById("word").style.visibility = "hidden"
    document.getElementById("wordContainer").style.visibility = "visible"
    document.getElementById("info").style.visibility = "visible"
    document.getElementById("name").style.display = "none"
    let count = 3;
    let startAudio = document.getElementById("myAudio")
    setTimeout(() => {
        startAudio.volume = 0.2
        startAudio.play()
    }, 500)
    const countdown = setInterval(() => {
        document.getElementById("word").style.visibility = "visible"
        document.getElementById("word").innerHTML = count
        count--;

        if (count < 0) {
            clearInterval(countdown);
            wordCont.style.visibility = "visible"
            infoCont.style.visibility = "visible"
            new Typer();
        }
    }, 1000);
    countdown()

})
function updateLeaderboard() {
    let users = JSON.parse(localStorage.getItem("score")) || []
    console.log(users[0])
    if (users[0] === undefined) {
        document.getElementById("leaderboardContainer").innerHTML += `<h2>No scores have been submitted</h2>`
    }
    users.sort(function (a, b) {
        return b.score - a.score
    })
    for (let i = 0; i < users.length; i++) {
        document.getElementById("leaderboardContainer").innerHTML += `<h1>${users[i].name}, Score: ${users[i].score}</h1>`
    }
}

function fontChanger() {
    const fonts = [
        "Arial",
        "Helvetica",
        "Verdana",
        "Times New Roman",
        "Tahoma",
        "Trebuchet MS",
        "Archivo Black",
        "Lobster Two"
    ];

    let index = 0;
    const text = document.getElementById("title");

    setInterval(() => {
        text.style.fontFamily = fonts[index];
        index = Math.floor(Math.random() * fonts.length);
    }, 200);
}

window.addEventListener("load", () => {updateLeaderboard(); fontChanger()})
