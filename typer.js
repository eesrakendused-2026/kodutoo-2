import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js";
import { getDatabase, ref, push, set, get } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";// TODO: Add SDKs for Firebase products that you want to use


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCE6tjt1nTaPn1zSrLhpDnu-j-HgSj9edA",
    authDomain: "typer-er.firebaseapp.com",
    databaseURL: "https://typer-er-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "typer-er",
    storageBucket: "typer-er.firebasestorage.app",
    messagingSenderId: "923329378541",
    appId: "1:923329378541:web:409e3d04519db71edff4e4",
    measurementId: "G-RKJ81MGC55"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

provider.setCustomParameters({ prompt: 'select_account' });

class Typer {
    constructor() {
        this.name = "";
        this.wordsInGame = 3;
        this.startingWordLength = 5;
        this.startTime = 0;
        this.endTime = 0;
        this.words = [];
        this.typeWords = [];
        this.wordsTyped = 0;
        this.score = 0;
        this.typed = 0;
        this.wrongTyped = 0;
        this.accuracy = 0;

        this.results = JSON.parse(localStorage.getItem("score")) || [];

        this.loadFromFile();

        document.getElementById("playAgain").addEventListener("click", () => this.restartGame());
        document.getElementById("changeUser").addEventListener("click", () => this.logout());


    }

    async logout() {
        try {
            await signOut(auth);

            this.name = "";
          
            document.querySelector("#wordContainer").style.display = "none";

            document.querySelector("#info").style.display = "flex";
            document.querySelector("#name").style.display = "flex";

            document.getElementById("changeUser").hidden = true;
            document.getElementById("playAgain").hidden = true;
            document.getElementById("wordcount").innerHTML = "";
            
            console.log("Kasutaja on välja logitud!");
            
        } catch (error) {
            console.error("Viga väljalogimisel:", error);
        }
    }

    loadResults() {
        const resultDiv = document.getElementById("results");
        resultDiv.innerHTML = "";

        const table = document.createElement("table");
        table.className = "results-table";

        const thead = document.createElement("thead");
        thead.innerHTML = `
            <tr>
                <th>Koht</th>
                <th>Mängija Nimi</th>
                <th>Aeg (sek)</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        for (let i = 0; i < this.results.length; i++) {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${i + 1}.</td>
                <td>${this.results[i].name}</td>
                <td>${this.results[i].time}</td>
            `;
            tbody.appendChild(tr);
        }
        
        table.appendChild(tbody);
        resultDiv.appendChild(table);
    }

    async loadFromFile() {
        const responseFromFile = await fetch("lemmad2013.txt");
        const allWords = await responseFromFile.text();
        this.loadResultsFromFile()

        this.getWords(allWords);
    }

    async loadResultsFromFile() {
        try {
            const scoresRef = ref(database, 'scores');   
            const snapshot = await get(scoresRef);

            if (snapshot.exists()) {
                const data = snapshot.val();

                this.results = Object.values(data);

                this.results.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
            } else {
                this.results = [];
            }

            console.log("Laetud tulemused Firebase'ist:", this.results);

            this.loadResults();
            
        } catch (error) {
            console.error("Viga andmete laadimisel Firebase'ist:", error);
            this.results = [];
        }
    }


    getWords(data) {
        console.log("Data laetud");
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
        }
        this.askName();
    }

    askName() {
        document.getElementById("loginButton").addEventListener('click', async () => {
            try {
                const result = await signInWithPopup(auth, provider);
                this.name = result.user.displayName;
                
                console.log("Kasutaja: ", this.name);

                document.getElementById('myAudio').play();

                this.startCountdown();
                
            } catch (error) {
                console.error("Viga sisselogimisel: ", error);
                alert("Sisselogimine ebaõnnestus");
            }
        });
    }

    startCountdown() {
        document.getElementById("counter").style.display = "flex";
        document.querySelector("#name").style.display = "none";
        document.getElementById("openModal").hidden = true;
        let i = 3;
        document.getElementById("time").innerHTML = "";

        let countdown = setInterval(() => {
            document.getElementById("time").innerHTML = i;
            i--;
            console.log(i+1)
            if (i == -1) {
                this.startTyper();
                document.getElementById("counter").style.display = "none";
                clearInterval(countdown);
            }
        }, 1000);
    }

    startTyper() {
        this.generateWords();
        this.upDateInfo();
        document.querySelector("#wordContainer").style.display = "flex";
        document.querySelector("#info").style.display = "flex";

        this.startTime = performance.now();

        this.keyListener = (e) => {
            this.shortenWord(e.key);

        }
        window.addEventListener("keypress", this.keyListener);
    }

    shortenWord(keypressed) {

        const typingAudio = document.getElementById('typingAudio');
        const correctAudio = document.getElementById('correctAudio');
        const wrongAudio = document.getElementById('wrongAudio');

        if (this.word[0] === keypressed && this.word.length > 1 && this.typeWords.length > this.wordsTyped) {
            this.word = this.word.slice(1);
            this.typed++

            typingAudio.currentTime = 0; 
            typingAudio.play();
            
            this.drawWord();

        } else if (this.word[0] === keypressed && this.word.length == 1 && this.wordsTyped <= this.typeWords.length - 2) {
            this.wordsTyped++;
            this.typed++

            typingAudio.currentTime = 0; 
            typingAudio.play();
            correctAudio.currentTime = 0;
            correctAudio.play();

            this.selectWord();
            this.upDateInfo();

        } else if (this.word[0] === keypressed && this.word.length == 1 && this.typeWords.length - 1 == this.wordsTyped) {
            this.wordsTyped = 0;
            this.typed++

            typingAudio.currentTime = 0; 
            typingAudio.play();
            correctAudio.currentTime = 0;
            correctAudio.play();

            this.endGame();

        } else if (this.word[0] != keypressed) {
            this.wrongTyped++

            wrongAudio.currentTime = 0;
            wrongAudio.play();

            document.getElementById("word").style.color = "red";
            
            setTimeout(() => {
                document.getElementById("word").style.color = "white";
            }, 100)
        }
    }

    async endGame() {
        window.removeEventListener("keypress", this.keyListener);
        document.getElementById('victoryAudio').play();

        this.endTime = performance.now()
        this.score = ((this.endTime - this.startTime) / 1000).toFixed(2);

        this.accuracy = Math.round(((this.typed - this.wrongTyped) * 100) / this.typed);

        let wpm = Math.round((this.wordsInGame / this.score) * 60);

        let imgSrc = "";
        let feedback = "";

        if (wpm <= 25) {
            imgSrc = "https://cdn-icons-png.flaticon.com/512/2619/2619073.png";
            feedback = `Algaja: ${wpm} WPM`;
        } else if (wpm > 25 && wpm <= 45) {
            imgSrc = "https://cdn-icons-png.flaticon.com/512/2972/2972185.png";
            feedback = `Keskmine: ${wpm} WPM`;
        } else if (wpm > 45 && wpm <= 60) {
            imgSrc = "https://cdn-icons-png.flaticon.com/512/741/741407.png";
            feedback = `Hea: ${wpm} WPM`;
        } else if (wpm > 60 && wpm <= 80) {
            imgSrc = "https://cdn-icons-png.flaticon.com/512/1048/1048313.png";
            feedback = `Suurepärane: ${wpm} WPM`;
        } else {
            imgSrc = "https://cdn-icons-png.flaticon.com/512/1356/1356479.png";
            feedback = `Meister: ${wpm} WPM!`;
        }

        document.getElementById("wpmText").innerHTML = feedback;
        document.getElementById("speedImage").src = imgSrc;
        document.getElementById("word").innerHTML = "Mäng läbi";
        document.getElementById("score").innerHTML = this.score + " sekundit " + this.accuracy + "% täpsus";
        document.getElementById("playAgain").hidden = false;
        document.getElementById("changeUser").hidden = false;
        document.getElementById("openModal").hidden = false;
        
        await this.saveResult();

        this.loadResultsFromFile();

    }

    async saveResult() {
        let result = {
            name: this.name,
            time: this.score
        }

        this.results.push(result);
        this.results.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
        localStorage.setItem("score", JSON.stringify(this.results));

        try {     
            const scoresRef = ref(database, 'scores');
            const newScoreRef = push(scoresRef);

            await set(newScoreRef, result);

            console.log("Salvestamine õnnestus");
        } catch (err) {
            alert("Failed " + err)
        } finally {
            console.log("Salvestamise päring lõppenud")

        }
    }

    generateWords() {
        for (let i = 0; i < this.wordsInGame; i++) {
            const len = this.wordsInGame + i;
            const randomIndex = Math.floor(Math.random() * this.words[len].length);
            this.typeWords[i] = this.words[len][randomIndex];
        }

        this.selectWord();
    }

    selectWord() {
        this.word = this.typeWords[this.wordsTyped];
        this.drawWord();

    }


    drawWord() {
        document.getElementById("word").innerHTML = this.word;
        console.log(this.word)
    }

    upDateInfo() {
        document.getElementById("wordcount").innerHTML = (this.wordsTyped + 1) + "/" + this.wordsInGame;
    }

    restartGame() {
        this.wordsTyped = 0;
        this.score = 0;
        this.typeWords = [];
        this.startTime = 0;
        this.endTime = 0;
        this.typed = 0;
        this.wrongTyped = 0;
        this.accuracy = 0;

        document.getElementById("word").innerHTML = "";
        document.getElementById("score").innerHTML = "";

        document.getElementById("openModal").hidden = true;
        document.getElementById("playAgain").hidden = true;
        document.getElementById("changeUser").hidden = true;

        document.getElementById("wpmText").innerHTML = "";
        document.getElementById("speedImage").src = "";
        
        this.startCountdown();
    }

}

let typer = new Typer();