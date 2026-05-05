import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-database.js";

// Firebase seadistus
const firebaseConfig = {
    apiKey: "AIzaSyB51fZ1UX7NuDuExT-GLJ9HEORlbOhLxFo",
    authDomain: "typer-4c796.firebaseapp.com",
    databaseURL: "https://typer-4c796-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "typer-4c796",
    storageBucket: "typer-4c796.firebasestorage.app",
    messagingSenderId: "76061315035",
    appId: "1:76061315035:web:89b4537cfc016a841761fe"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

console.log("Fail ja Firebase õigesti ühendatud");

class Typer {
    constructor() {
        this.name = "";
        this.wordsInGame = 5;
        this.startingWordLength = 2;
        this.startTime = 0;
        this.endTime = 0;
        this.word = "Suvaline";
        this.words = [];
        this.typeWords = [];
        this.wordsTyped = 0;
        this.score = 0;
        this.loginBtn = document.getElementById("googleLoginBtn");
        this.logoutBtn = document.getElementById("logoutBtn");
        this.restartBtn = document.getElementById("restartBtn");
        this.userInfo = document.getElementById("userInfo");
        this.keyListener = null;
        this.initAuth();
        this.loadResultsFromFirebase(); 
        this.loadFromFile();
        this.resultsModal = document.getElementById("myModal");
        this.showResultsBtn = document.getElementById("openBtn");
        this.closeModalBtn = document.querySelector(".close");
        this.initModalEvents();
        this.themeBtn = document.getElementById("themeToggle");
        this.initTheme();
        this.startSound = new Audio('media/game_audio/gamestart.mp3');
        this.celebrationSound = new Audio('media/game_audio/celebration.mp3');
        this.successSound = new Audio('media/game_audio/success.mp3');
        this.musicBtn = document.getElementById("musicToggle");
        this.isMusicMuted = false;
        this.bgMusic = new Audio('media/game_audio/backgroundmusic.mp3');
        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.4;

        this.initMusicToggle();
    }

    //FIREBASE AUTENTIMINE JA NUPUD
    initAuth() {
        this.loginBtn.addEventListener("click", () => {
            signInWithPopup(auth, provider).catch(error => console.error(error));
        });

        this.logoutBtn.addEventListener("click", () => {
            signOut(auth).then(() => {
                this.resetGame();
            });
        });

        this.restartBtn.addEventListener("click", () => {
            this.startCountdown();
        });

        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.name = user.displayName;
                this.loginBtn.style.display = "none";
                this.logoutBtn.style.display = "inline-block";
                this.userInfo.innerText = "Mängija: " + this.name;
                if (this.words.length > 0) {
                    this.startCountdown();
                }
            } else {
                this.name = "";
                this.loginBtn.style.display = "inline-block";
                this.logoutBtn.style.display = "none";
                this.userInfo.innerText = "Tulemuse salvestamiseks logi sisse.";
                this.resetGame();
            }
        });
    }

    initModalEvents() {
        if (this.showResultsBtn && this.resultsModal) {
            this.showResultsBtn.addEventListener("click", () => {
                this.resultsModal.style.display = "block";
            });
        }

        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener("click", () => {
                this.resultsModal.style.display = "none";
            });
        }

        window.addEventListener("click", (event) => {
            if (event.target == this.resultsModal) {
                this.resultsModal.style.display = "none";
            }
        });
    }

    initTheme() {
        const savedTheme = localStorage.getItem("theme");
        
        if (savedTheme === "dark") {
            document.body.classList.add("dark-mode");
            this.themeBtn.innerText = "☀️ Hele";
        }

        this.themeBtn.addEventListener("click", () => {
            document.body.classList.toggle("dark-mode");
            
            if (document.body.classList.contains("dark-mode")) {
                localStorage.setItem("theme", "dark");
                this.themeBtn.innerText = "☀️ Hele";
            } else {
                localStorage.setItem("theme", "light");
                this.themeBtn.innerText = "🌙 Tume";
            }
        });
    }

    initMusicToggle() {
        this.musicBtn.addEventListener("click", () => {
            this.isMusicMuted = !this.isMusicMuted;
            
            if (this.isMusicMuted) {
                this.bgMusic.pause();
                this.musicBtn.innerText = "🔇 Vaikus";
                this.musicBtn.style.opacity = "0.5";
            } else {
                // Mängime muusikat ainult siis, kui mäng käib
                if (this.wordsTyped < this.typeWords.length && this.wordsTyped > 0) {
                    this.bgMusic.play();
                }
                this.musicBtn.innerText = "🔊 Muusika";
                this.musicBtn.style.opacity = "1";
            }
        });
    }

    loadResultsFromFirebase() {
        const resultsRef = ref(db, 'scores');
        onValue(resultsRef, (snapshot) => {
            const resultDiv = document.getElementById("results");
            resultDiv.innerHTML = ""; // Tühjendame vana sisu

            const table = document.createElement("table");
            table.classList.add("results-table");

            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Koht</th>
                        <th>Mängija</th>
                        <th>Aeg (sek)</th>
                    </tr>
                </thead>
                <tbody id="tableBody"></tbody>
            `;
            resultDiv.appendChild(table);
            const tableBody = document.getElementById("tableBody");

            let allResults = [];
            snapshot.forEach((childSnapshot) => {
                allResults.push(childSnapshot.val());
            });

            allResults.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
            allResults = allResults.slice(0, 20);

            allResults.forEach((res, index) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${index + 1}.</td>
                    <td><strong>${res.name || 'Anonüümne'}</strong></td>
                    <td>${res.time} s</td>
                `;
                tableBody.appendChild(row);
            });
        });
    }

    saveResult() {
        const resultsRef = ref(db, 'scores');
        push(resultsRef, {
            name: this.name,
            time: parseFloat(this.score), 
            date: Date.now()
        }).then(() => {
            console.log("Tulemus edukalt salvestatud Firebase'i!");
            this.successSound.play();
        }).catch((err) => {
            console.error("Viga salvestamisel:", err);
        });
    }

    async loadFromFile() {
        console.log("load from file sees");
        const responseFromFile = await fetch("lemmad2013.txt");
        const allWords = await responseFromFile.text();
        this.getWords(allWords);
    }

    getWords(data) {
        const dataFromFile = data.split("\n");
        this.separateWordsByLength(dataFromFile);
    }

    separateWordsByLength(words) {
        for (let word of words) {
            const wordLength = word.length;
            if (!this.words[wordLength]) {
                this.words[wordLength] = [];
            }
            this.words[wordLength].push(word.trim());
        }
        console.log("Sõnad sorteeritud pikkuse järgi");
        if (this.name !== "") {
            this.startCountdown();
        }
    }

    resetGame() {
        this.wordsTyped = 0;
        this.typeWords = [];
        if (this.keyListener) {
            window.removeEventListener("keypress", this.keyListener);
        }
        document.getElementById("word").innerHTML = "";
        document.getElementById("word").style.color = "black";
        
        document.getElementById("counter").style.display = "none";
        document.querySelector("#info").style.display = "none";
        document.querySelector("#wordContainer").style.display = "none";
        this.restartBtn.style.display = "none";
        
        const imgElement = document.getElementById("speedImage");
        const textElement = document.getElementById("speedCategory");
        if(imgElement) imgElement.style.display = "none";
        if(textElement) textElement.innerText = "";
    }

    startCountdown() {
        this.resetGame();
        document.getElementById("counter").style.display = "flex";
        let i = 3;
        document.getElementById("time").innerHTML = i;
        let countdown = setInterval(() => {
            i--;
            if(i > 0) document.getElementById("time").innerHTML = i;
            console.log(i);
            
            if (i === 0) {
                document.getElementById("counter").style.display = "none";
                this.startTyper();
                clearInterval(countdown);
            }
        }, 1000);
    }

    startTyper() {
        document.getElementById("progressBar").style.width = "0%";
        document.getElementById("progressContainer").style.display = "block";
        this.updateProgressBar();

        this.generateWords();
        this.upDateInfo();
        document.querySelector("#info").style.display = "flex";
        document.querySelector("#wordContainer").style.display = "flex";
        this.restartBtn.style.display = "none";
        
        this.startSound.play();
        
        if (!this.isMusicMuted) {
            this.bgMusic.currentTime = 0;
            this.bgMusic.play().catch(e => console.log("Heli mängimine ebaõnnestus:", e));
        }

        this.startTime = performance.now();
        this.keyListener = (e) => {
            this.shorteWord(e.key);
            console.log("keypress sees");
        }

        window.addEventListener("keypress", this.keyListener);
    }

    shorteWord(keypressed) {
        if (this.word[0] === keypressed && this.word.length > 1 && this.typeWords.length > this.wordsTyped) {
            this.word = this.word.slice(1);
            this.drawWord();
        } else if (this.word[0] === keypressed && this.word.length == 1 && this.wordsTyped <= this.typeWords.length - 2) {
            this.wordsTyped++;
            this.upDateInfo();
            this.updateProgressBar();
            this.selectWord();
        } else if (this.word[0] === keypressed && this.word.length == 1 && this.typeWords.length - 1 == this.wordsTyped) {
            this.wordsTyped++;
            this.upDateInfo();
            this.updateProgressBar();
            this.endGame();
        } else if (this.word[0] != keypressed) {
            const container = document.getElementById("wordContainer");
            const wordElement = document.getElementById("word");
            container.classList.add("error-shake");
            wordElement.style.color = "red";
            setTimeout(() => {
                container.classList.remove("error-shake");
                const isDark = document.body.classList.contains("dark-mode");
                wordElement.style.color = isDark ? "#00d2ff" : "#333";
            }, 200);
        }
    }

    updateProgressBar() {
        const progressBar = document.getElementById("progressBar");
        if (progressBar) {
            const percentage = (this.wordsTyped / this.wordsInGame) * 100;
            progressBar.style.width = percentage + "%";
        }
    }

    endGame() {
        this.bgMusic.pause(); 
        this.celebrationSound.play();

        this.endTime = performance.now();
        this.score = ((this.endTime - this.startTime) / 1000).toFixed(2);
        
        const wpm = Math.round((this.wordsInGame / this.score) * 60);
        this.displaySpeedVisual(wpm);

        document.getElementById("word").innerHTML = `Mäng läbi. Sinu aeg on: ${this.score} sekundit.`;
        
        window.removeEventListener("keypress", this.keyListener);
        
        this.restartBtn.style.display = "inline-block";

        this.saveResult();

        setTimeout(() => {
            this.resultsModal.style.display = "block";
        }, 500);
    }

    displaySpeedVisual(wpm) {
        const imgElement = document.getElementById("speedImage");
        const textElement = document.getElementById("speedCategory");
        let imgSrc = "";
        let categoryText = "";

        if (wpm < 20) {
            imgSrc = "https://cdn-icons-png.flaticon.com/512/8334/8334151.png"; 
            categoryText = "Aeglane nagu kilpkonn (Algaja)";
        } else if (wpm >= 20 && wpm < 40) {
            imgSrc = "https://cdn-icons-png.flaticon.com/512/7816/7816744.png"; 
            categoryText = "Sihikindel nagu sipelgas (Keskmine)";
        } else if (wpm >= 40 && wpm < 60) {
            imgSrc = "https://cdn-icons-png.flaticon.com/512/166/166747.png"; 
            categoryText = "Kiire nagu tiiger (Professionaal)";
        } else {
            imgSrc = "https://cdn-icons-png.flaticon.com/512/8569/8569864.png"; 
            categoryText = "Välkkiire! (Meister!)";
        }

        imgElement.src = imgSrc;
        imgElement.style.display = "block";
        imgElement.style.margin = "0 auto"; 
        textElement.innerText = categoryText;
    }

    generateWords() {
        for (let i = 0; i < this.wordsInGame; i++) {
            const len = this.startingWordLength + i; 
            if (this.words[len] && this.words[len].length > 0) {
                const randomIndex = Math.floor(Math.random() * this.words[len].length);
                this.typeWords[i] = this.words[len][randomIndex];
            } else {
                this.typeWords[i] = "puudu"; 
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
        document.getElementById("wordcount").innerHTML = "Sõnu trükitud: " + this.wordsTyped + "/" + this.wordsInGame;
        this.updateProgressBar();
    }
}

let typer = new Typer();