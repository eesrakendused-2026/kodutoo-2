console.log("Fail õigesti ühendatud");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getDatabase, ref, push, onValue, query, orderByChild, limitToFirst } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDRXxsG0GHj_J6PBCVA7jt7lnE95_MPKxg",
  authDomain: "typer-d1815.firebaseapp.com",
  databaseURL: "https://typer-d1815-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "typer-d1815",
  storageBucket: "typer-d1815.firebasestorage.app",
  messagingSenderId: "1060331046219",
  appId: "1:1060331046219:web:c0e71b23bbe376d07d14ce"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getDatabase(app);

class Typer {
    constructor() {
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

        this.initFirebase();
        this.bindButtons();
        this.loadFromFile();
    }

    initFirebase() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.name = user.displayName;
                document.getElementById("authContainer").style.display = "none";
                document.getElementById("gameMenu").style.display = "flex";
                document.getElementById("welcomeMsg").innerText = `Tere, ${this.name}!`;
            } else {
                document.getElementById("authContainer").style.display = "flex";
                document.getElementById("gameMenu").style.display = "none";
                this.name = "";
            }
        });

        const scoresRef = query(ref(db, 'scores'), orderByChild('time'), limitToFirst(20));
        onValue(scoresRef, (snapshot) => {
            const resultDiv = document.getElementById("results");
            resultDiv.innerHTML = "";
            
            let resultsArray = [];
            snapshot.forEach((childSnapshot) => {
                resultsArray.push(childSnapshot.val());
            });
            
            resultsArray.sort((a, b) => a.time - b.time);

            for (let i = 0; i < resultsArray.length; i++) {
                const row = document.createElement("div");
                row.textContent = `${i + 1}. ${resultsArray[i].name} - ${resultsArray[i].time} s`;
                resultDiv.appendChild(row);
            }
        });
    }

    bindButtons() {
        document.getElementById("loginBtn").addEventListener("click", () => {
            signInWithPopup(auth, provider).catch(error => console.error("Sisselogimine ebaõnnestus:", error));
        });

        document.getElementById("logoutBtn").addEventListener("click", () => {
            signOut(auth).then(() => {
                this.resetGameState();
            });
        });

        document.getElementById("startGameBtn").addEventListener("click", () => {
            document.getElementById("gameMenu").style.display = "none";
            this.startCountdown();
        });

        document.getElementById("restartBtn").addEventListener("click", () => {
            this.resetGameState();
            this.startCountdown();
        });
    }

    async loadFromFile() {
        try {
            const responseFromFile = await fetch("lemmad2013.txt");
            const allWords = await responseFromFile.text();
            this.getWords(allWords);
        } catch(e) {
            console.error("Sõnastiku laadimine ebaõnnestus. Kontrolli, et lemmad2013.txt eksisteeriks.", e);
        }
    }

    getWords(data) {
        const dataFromFile = data.split("\n").map(word => word.trim()).filter(word => word.length > 0);
        this.separateWordsByLength(dataFromFile);
    }

    separateWordsByLength(words) {
        for (let word of words) {
            const wordLength = word.length;
            if (!this.words[wordLength]) {
                this.words[wordLength] = [];
            }
            this.words[wordLength].push(word);
        }
    }

    resetGameState() {
        this.wordsTyped = 0;
        this.typeWords = [];
        this.score = 0;
        document.getElementById("restartBtn").style.display = "none";
        document.getElementById("word").style.color = "black";
        document.getElementById("word").innerHTML = "";
        document.getElementById("info").style.display = "none";
        document.getElementById("wordContainer").style.display = "none";
    }

    startCountdown() {
        document.getElementById("counter").style.display = "flex";
        let i = 3;

        document.getElementById("time").innerHTML = i;

        let countdown = setInterval(() => {
            i--;
            if (i === 0) {
                document.getElementById("counter").style.display = "none";
                this.startTyper();
                clearInterval(countdown);
            } else {
                document.getElementById("time").innerHTML = i;
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
        };

        window.addEventListener("keypress", this.keyListener);
    }

    shorteWord(keypressed) {
        if (this.word[0] === keypressed && this.word.length > 1 && this.typeWords.length > this.wordsTyped) {
            this.word = this.word.slice(1);
            this.drawWord();
        } else if (this.word[0] === keypressed && this.word.length == 1 && this.wordsTyped <= this.typeWords.length - 2) {
            this.wordsTyped++;
            this.upDateInfo();
            this.selectWord();
        } else if (this.word[0] === keypressed && this.word.length == 1 && this.typeWords.length - 1 == this.wordsTyped) {
            this.upDateInfo();
            this.wordsTyped = 0;
            this.endGame();
        } else if (this.word[0] != keypressed) {
            document.getElementById("word").style.color = "red";
            setTimeout(() => {
                document.getElementById("word").style.color = "black";
            }, 100);
        }
    }

    endGame() {
        this.endTime = performance.now();
        this.score = ((this.endTime - this.startTime) / 1000).toFixed(2);
        
        document.getElementById("word").innerHTML = `Mäng läbi. Sinu aeg on: ${this.score} sekundit.`;
        window.removeEventListener("keypress", this.keyListener);
        
        document.getElementById("restartBtn").style.display = "block";
        
        this.saveResult();
    }

    saveResult() {
        if (this.score > 0) {
            push(ref(db, 'scores'), {
                name: this.name,
                time: parseFloat(this.score),
                timestamp: Date.now()
            }).catch(err => {
                console.error("Viga andmete salvestamisel:", err);
            });
        }
    }

    generateWords() {
        for (let i = 0; i < this.wordsInGame; i++) {
            const len = this.wordsInGame + i;
            if(this.words[len]) {
                const randomIndex = Math.floor(Math.random() * this.words[len].length);
                this.typeWords[i] = this.words[len][randomIndex];
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
        document.getElementById("wordcount").innerHTML = `Sõnu trükitud: ${this.wordsTyped}/${this.wordsInGame}`;
    }
}

let typer = new Typer();