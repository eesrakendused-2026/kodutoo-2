class Typer {
    constructor() {
        this.name = "";
        this.correctLetter = 0
        this.incorrectLetter = 0
        this.activeAudio = document.getElementById("activeAudio")
        this.winAudioGood = document.getElementById("winGood")
        this.loseAudio = document.getElementById("winBad")
        this.keypressAudio = document.getElementById("keypress")
        this.wordsCounter = this.setDifficulty().words;
        this.max = this.setDifficulty().maxlength;
        this.min = this.setDifficulty().minlength;
        this.difficulty = this.setDifficulty().difficulty;
        this.multiplier = this.setDifficulty().multiplier
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
        this.imageController()
    }

    async loadWords() {
        const loadWords = await fetch("./public/words.txt")
        const words = await loadWords.text()
        this.getWords(words)
    }

    setDifficulty() {
        let difficulty = { words: 0, length: 0 }
        switch (document.getElementById("difficulyDropdown").value) {
            case "easy":
                difficulty = { words: 6, maxlength: 6, minlength: 1, multiplier: 1, difficulty: "easy" }
                return difficulty;
                break;
            case "normal":
                this.difficulty = "normal"
                difficulty = { words: 11, maxlength: 10, minlength: 4, multiplier: 1.25, difficulty: "Normal" }
                return difficulty;
                break;
            case "hard":
                this.difficulty = "hard"
                difficulty = { words: 21, maxlength: 15, minlength: 6, multiplier: 1.5, difficulty: "Hard" }
                return difficulty;
                break;
            case "death sentence":
                this.difficulty = "death sentence"
                difficulty = { words: 101, maxlength: 30, minlength: 15, multiplier: 5, difficulty: "Death Sentence" };
                return difficulty
                break;
        }
    }

    setWordLength() {
        switch (document.getElementById("difficulyDropdown").value) {
            case "easy":
                return 5;
                break;
            case "normal":
                return 10;
                break;
            case "hard":
                return 15;
                break;
            case "death sentence":
                return;
                break;
        }
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
        //Start music during game
        this.activeAudio.volume = 0.2
        this.activeAudio.play()
        this.startGame()
    }


    startGame() {
        let i = 0
        this.generateWords();
        window.addEventListener("keypress", (event) => {
            this.keypressAudio.volume = Math.random() * 0.6;
            this.keypressAudio.playbackRate = 2;
            this.keypressAudio.play()
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
        }
        else if (this.word[0] != event) {
            this.incorrectLetter += 1
        }
    }

    generateWords() {
        for (let i = 0; i < this.wordsCounter; i++) {
            const len = Math.floor(Math.random() * (this.max - this.min)) + this.min;
            const randomIndex = Math.floor(Math.random() * 10)
            this.typeWords[i] = this.words[len][randomIndex]
        }

        this.selectWord()

    }

    selectWord() {
        this.counter++
        if (this.counter < this.wordsCounter) {
            document.getElementById("wordcount").innerHTML = `${this.counter}/${this.wordsCounter - 1}`
            this.word = this.typeWords[this.wordsType]
            this.drawWord()
        }
        else if (this.counter >= this.wordsCounter) {
            this.enterName()
        }

    }
//Name input controller
    enterName() {
        this.activeAudio.pause()
        this.imageController()
        //Name input controller
        let nameContainer = document.getElementById("insertNameContainer")
        let nameInput = document.getElementById("nameInput")
        let saveName = document.getElementById("saveName")
        nameContainer.style.visibility = "visible"
        document.getElementById("word").style.visibility = "hidden"
        saveName.addEventListener("click", () => {
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

//Controller for which image is shown at the end
    imageController() {
        let imgContainer = document.getElementById("imgContainer")
        let imgText = document.getElementById("imgText")
        if (this.timer >= Math.ceil(15 * this.multiplie)) {
            imgContainer.src = "./public/grave.png"
            imgText.innerText = "Your speed: Corpse"
            this.loseAudio.volume = 0.2
            this.loseAudio.play()
        }
        else if (this.timer > Math.ceil(10 * this.multiplier) && this.timer < Math.ceil(15 * this.multiplier)) {
            imgContainer.src = "./public/epona.png"
            imgText.innerText = "Your speed: Horse"
            this.winAudioGood.volume = 0.2
            this.winAudioGood.play()
        }
        else {
            imgContainer.src = "./public/cheetah.png"
            imgText.innerText = "Your speed: Cheetah"
            this.winAudioGood.volume = 0.2
            this.winAudioGood.play()
        }
    }

    drawWord() {
        document.getElementById("word").innerHTML = this.word
    }

    saveResult() {
        let result = {
            name: this.name,
            score: Math.floor(((this.correctLetter - this.incorrectLetter) / this.timer) * 100),
            time: this.timer,
            difficulty: this.difficulty
        }
        var olddata = JSON.parse(localStorage.getItem("score")) || []
        olddata.push(result)
        localStorage.setItem("score", JSON.stringify(olddata))
    }
}

//Leaderboards menu controller
let clickedLb = false
function leaderboardMenu() {
    document.getElementById("leaderboardsBtn").addEventListener("click", () => {
        if (!clickedLb) {
            document.getElementById('leaderboardContainer').style.left = "0%"
            clickedLb = true
            document.getElementById('customizationContainer').style.left = "-100%"
            clickedCz = false
        }
        else if (clickedLb) {
            document.getElementById('results').innerHTML = ""
            document.getElementById('leaderboardContainer').style.left = "-100%"
            clickedLb = false
        }
    })
}

//Customization menu controller
let clickedCz = false
function customizationMenu() {
    let container = document.getElementById("customizationContainer")
    let customizeBtn = document.getElementById("customizeBtn")
    let colors = document.getElementsByClassName("color")
    customizeBtn.addEventListener("click", () => {
        for (let i = 0; i < colors.length; i++) {
            colors[i].addEventListener("click", () => {
                document.body.style.backgroundColor = `${colors[i].id}`
            })
        }
        if (!clickedCz) {
            document.getElementById('customizationContainer').style.left = "0%"
            clickedCz = true
            document.getElementById('leaderboardContainer').style.left = "-100%"
            document.getElementById('results').innerHTML = ""
            clickedLb = false
        }
        else if (clickedCz) {
            document.getElementById('customizationContainer').style.left = "-100%"
            clickedCz = false
        }
    })
}


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


//Leaderboards updater cotroller

function updateLeaderboard() {
    let users = JSON.parse(localStorage.getItem("score")) || []
    document.getElementById("results").innerHTML = ""
    let difficulty = ""
    document.getElementById("leaderboardsBtn").addEventListener('click', () => {
        if (users[0] === undefined) {
            document.getElementById("results").innerHTML += `<h2>No scores have been submitted</h2>`
        }
        document.getElementById("score").addEventListener('click', () => {
            document.getElementById('results').innerHTML = ""
            users.sort(function (a, b) {
                return b.score - a.score
            })
            for (let i = 0; i < users.length; i++) {
                document.getElementById("results").innerHTML += `<h1>${users[i].name}, Score: ${users[i].score}, Time: ${users[i].time},  Difficulty: ${users[i].difficulty} </h1>`
            }
        })
        document.getElementById("time").addEventListener('click', () => {
            document.getElementById('results').innerHTML = ""
            users.sort(function (a, b) {
                return a.time - b.time
            })
            for (let i = 0; i < users.length; i++) {
                document.getElementById("results").innerHTML += `<h1>${users[i].name}, Score: ${users[i].score}, Time: ${users[i].time},  Difficulty: ${users[i].difficulty} </h1>`
            }
        })

        document.getElementById("sortByDiff").addEventListener("click", () => {
            difficulty = document.getElementById("difficulySortDropdown").value
            document.getElementById("results").innerHTML = ""
            users.sort(function (a, b) {
                return b.score - a.score
            })
            for (let i = 0; i < users.length; i++) {
                if (users[i].difficulty.toLowerCase() == difficulty) {
                    document.getElementById("results").innerHTML += `<h1>${users[i].name}, Score: ${users[i].score}, Time: ${users[i].time},  Difficulty: ${users[i].difficulty} </h1>`
                }
            }
        })

        for (let i = 0; i < users.length; i++) {
            document.getElementById("results").innerHTML += `<h1>${users[i].name}, Score: ${users[i].score}, Time: ${users[i].time},  Difficulty: ${users[i].difficulty} </h1>`
        }
    })
}

//Font changer controller
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
    }, 250);
}

window.addEventListener("load", () => { updateLeaderboard(); fontChanger(); customizationMenu(), leaderboardMenu() })
