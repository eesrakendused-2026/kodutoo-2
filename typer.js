/*
   TYPER - eesti sõnade trükkimismäng
   Kogu mänguloogika ühes klassis (Typer).
*/

// === Sõnastikud raskuse järgi ===
const easyWords = [
    "tere", "maja", "koer", "kass", "vesi", "leib", "raha", "pere",
    "tuba", "päev", "käsi", "jalg", "silm", "keel", "suvi", "talv",
    "kevad", "sügis", "töö", "kool", "auto", "laps", "tark",
    "ilus", "hea", "halb", "suur", "kiire", "soe", "külm", "must",
    "valge", "lill", "puu", "mets", "isa", "ema", "vend", "õde",
    "sõna", "linn", "küla", "põld", "raamat"
];

const mediumWords = [
    "sõnastik", "koolitee", "hommikul", "õhtuti", "järvele", "mereäär",
    "tegutsema", "mõtlema", "kirjutama", "õppima", "kuulama", "vaatama",
    "töötama", "jooksma", "kõndima", "magama", "lugema", "rääkima",
    "naeratama", "uurima", "mängima", "valima", "kohtuma", "tähtis",
    "lihtne", "huvitav", "rahulik", "vaikne", "lähedal", "kaugel",
    "tihti", "harva", "alati", "mõnikord", "tavaliselt", "võimalus"
];

const hardWords = [
    "raamatukogu", "õppematerjal", "ülikoolilinn", "programmeerimine",
    "arvutiteadus", "infotehnoloogia", "kõrgkoolide", "õppejõududel",
    "üliõpilased", "valitsemine", "rahvusvaheline", "ettevalmistus",
    "kahjustada", "ülesanne", "lahendamine", "vastutusrikas",
    "kättesaadav", "kohaldatav", "kogemustega", "kvaliteetne"
];

// Mitu sõna ühes mängus
const wordsPerGame = 15;


// === Mängu peaklass ===
class Typer {
    constructor() {
        // Mängija andmed
        this.playerName = "";
        this.difficulty = "medium";

        // Mängu olek
        this.words = [];
        this.currentIndex = 0;
        this.startTime = 0;
        this.totalChars = 0;
        this.correctChars = 0;
        this.timerInterval = null;
        this.gameRunning = false;

        // Audio jaoks
        this.audioContext = null;
        this.firebaseAuth = null;
        this.currentUser = null;

        // Käivita
        this.bindEvents();
        this.loadTheme();
        this.initFirebase();
    }

    // === Sündmuste sidumine nupukotega ===
    bindEvents() {
        document.getElementById("startBtn").addEventListener("click", () => {
            this.startGame();
        });

        document.getElementById("typingInput").addEventListener("input", (e) => {
            this.checkInput(e);
        });

        document.getElementById("restartBtn").addEventListener("click", () => {
            this.startGame();
        });

        document.getElementById("quitBtn").addEventListener("click", () => {
            this.quitGame();
        });

        document.getElementById("closeResultsBtn").addEventListener("click", () => {
            this.closeResults();
        });

        document.getElementById("playAgainBtn").addEventListener("click", () => {
            this.closeResults();
        });

        document.getElementById("themeBtn").addEventListener("click", () => {
            this.toggleTheme();
        });

        document.getElementById("leaderboardBtn").addEventListener("click", () => {
            this.openLeaderboard();
        });

        document.getElementById("openAuthBtn").addEventListener("click", () => {
            this.openAuth();
        });

        document.getElementById("closeAuthBtn").addEventListener("click", () => {
            this.closeAuth();
        });

        document.getElementById("closeLeaderboardBtn").addEventListener("click", () => {
            this.closeLeaderboard();
        });

        document.getElementById("clearLeaderboardBtn").addEventListener("click", () => {
            this.clearLeaderboard();
        });

        document.getElementById("loginBtn").addEventListener("click", () => {
            this.login();
        });

        document.getElementById("registerBtn").addEventListener("click", () => {
            this.register();
        });

        document.getElementById("googleLoginBtn").addEventListener("click", () => {
            this.loginWithGoogle();
        });

        document.getElementById("logoutBtn").addEventListener("click", () => {
            this.logout();
        });

        document.getElementById("headerLogoutBtn").addEventListener("click", () => {
            this.logout();
        });

        // Esc-klahv sulgeb modaalid
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.closeResults();
                this.closeLeaderboard();
                this.closeAuth();
            }
        });
    }

    // === Mängu alustamine ===
    startGame() {
        // Kontrolli, et nimi oleks sisestatud
        const name = document.getElementById("playerName").value.trim();
        if (name === "") {
            alert("Palun sisesta oma nimi!");
            return;
        }

        this.playerName = name;
        this.difficulty = document.querySelector(
            'input[name="difficulty"]:checked'
        ).value;

        // Vali sõnad
        this.words = this.pickWords();

        // Lähtesta loendurid
        this.currentIndex = 0;
        this.totalChars = 0;
        this.correctChars = 0;

        // Käivita audio (vajab kasutaja klikki)
        this.initAudio();

        // Sulge tulemuste modal kui on lahti
        document.getElementById("resultsModal").hidden = true;

        // Käivita countdown
        this.runCountdown();
    }

    // === Audio loomine ===
    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (this.audioContext.state === "suspended") {
            this.audioContext.resume();
        }
    }

    // Mängib lihtsa heli (sagedus Hz, kestus sekundites)
    playSound(frequency, duration) {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.frequency.value = frequency;
        oscillator.type = "sine";

        // Heli vaibub aeglaselt
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start();
        oscillator.stop(now + duration);
    }

    // 4 erinevat heli olukorra järgi
    playStartSound() {
        this.initAudio();
        this.playSound(523, 0.18);
        setTimeout(() => this.playSound(659, 0.18), 180);
        setTimeout(() => this.playSound(784, 0.25), 360);
    }

    playKeySound() {
        this.playSound(800, 0.08);
    }

    playEndSound() {
        this.playSound(659, 0.2);
        setTimeout(() => this.playSound(523, 0.2), 200);
        setTimeout(() => this.playSound(392, 0.35), 400);
    }

    playLeaderboardSound() {
        this.playSound(523, 0.16);
        setTimeout(() => this.playSound(659, 0.16), 160);
        setTimeout(() => this.playSound(784, 0.16), 320);
        setTimeout(() => this.playSound(1047, 0.35), 480);
    }

    // === Sõnade juhuvalik raskuse järgi ===
    pickWords() {
        let pool;
        if (this.difficulty === "easy") {
            pool = easyWords;
        } else if (this.difficulty === "medium") {
            pool = mediumWords;
        } else {
            pool = hardWords;
        }

        const selected = [];
        for (let i = 0; i < wordsPerGame; i++) {
            const randomIndex = Math.floor(Math.random() * pool.length);
            selected.push(pool[randomIndex]);
        }
        return selected;
    }

    // === Countdown 3-2-1 ===
    runCountdown() {
        document.getElementById("setup").hidden = true;
        document.getElementById("game").hidden = true;
        document.getElementById("countdown").hidden = false;

        const numbers = ["3", "2", "1", "Mine!"];
        let i = 0;
        document.getElementById("countdownNumber").textContent = numbers[0];

        const countdownInterval = setInterval(() => {
            i++;
            if (i < numbers.length) {
                const numberEl = document.getElementById("countdownNumber");
                numberEl.textContent = numbers[i];
                // Animatsiooni uuesti käivitamine
                numberEl.style.animation = "none";
                setTimeout(() => {
                    numberEl.style.animation = "";
                }, 10);
            } else {
                clearInterval(countdownInterval);
                document.getElementById("countdown").hidden = true;
                this.beginTyping();
            }
        }, 800);
    }

    // === Mängu algus ===
    beginTyping() {
        document.getElementById("game").hidden = false;

        // Näita sõnu
        this.showWords();

        // Lähtesta sisend
        const input = document.getElementById("typingInput");
        input.value = "";
        input.disabled = false;
        input.focus();

        // Käivita ajaarvestus
        this.startTime = performance.now();
        this.gameRunning = true;

        // Mängi alustamise heli
        this.playStartSound();

        // Värskenda statistikat iga 100ms järel
        this.timerInterval = setInterval(() => {
            this.updateStats();
        }, 100);
    }

    // === Sisestuse kontroll ===
    checkInput(event) {
        if (!this.gameRunning) return;

        const value = event.target.value;
        const targetWord = this.words[this.currentIndex];

        // Kui kasutaja vajutas tühikut - sõna lõpetatud
        if (value.endsWith(" ")) {
            const typedWord = value.trim();

            // Loe märke (sõna pikkus + tühik)
            this.totalChars += targetWord.length + 1;

            // Kui sõna on õige, loe õigeid märke
            if (typedWord === targetWord) {
                this.correctChars += targetWord.length + 1;
            }

            // Mine järgmisele sõnale
            this.currentIndex++;
            event.target.value = "";
            event.target.style.color = "";

            // Kontrolli, kas mäng on läbi
            if (this.currentIndex >= this.words.length) {
                this.endGame();
                return;
            }

            this.showWords();
        } else {
            // Kontrolli, kas täht on õige
            const isCorrect = targetWord.startsWith(value);

            if (isCorrect) {
                // Õige täht - mängi heli
                event.target.style.color = "";
                this.playKeySound();
            } else {
                // Vale täht - näita punaselt
                event.target.style.color = "red";
            }
        }
    }

    // === Sõnade kuvamine ekraanil ===
    showWords() {
        let html = "";
        for (let i = 0; i < this.words.length; i++) {
            if (i < this.currentIndex) {
                // Juba trükitud sõnad
                html += '<span class="done-word">' + this.words[i] + '</span> ';
            } else if (i === this.currentIndex) {
                // Praegune sõna
                html += '<span class="current-word">' + this.words[i] + '</span> ';
            } else {
                // Tulevased sõnad
                html += '<span>' + this.words[i] + '</span> ';
            }
        }
        document.getElementById("wordDisplay").innerHTML = html;
    }

    // === Statistika värskendamine ===
    updateStats() {
        const elapsedSeconds = (performance.now() - this.startTime) / 1000;
        const minutes = elapsedSeconds / 60;

        // WPM = (õigete märkide arv / 5) / minutid
        let wpm = 0;
        if (minutes > 0) {
            wpm = Math.round((this.correctChars / 5) / minutes);
        }

        // Täpsus = õigeid / kokku * 100
        let accuracy = 100;
        if (this.totalChars > 0) {
            accuracy = Math.round((this.correctChars / this.totalChars) * 100);
        }

        document.getElementById("liveTime").textContent =
            elapsedSeconds.toFixed(1) + "s";
        document.getElementById("liveWpm").textContent = wpm + " WPM";
        document.getElementById("liveAccuracy").textContent = accuracy + "%";
        document.getElementById("liveProgress").textContent =
            this.currentIndex + " / " + this.words.length;
    }

    // === Mängu lõpp ===
    endGame() {
        this.gameRunning = false;
        clearInterval(this.timerInterval);

        document.getElementById("typingInput").disabled = true;

        // Arvuta lõpptulemused
        const elapsedSeconds = (performance.now() - this.startTime) / 1000;
        const minutes = elapsedSeconds / 60;
        const wpm = Math.round((this.correctChars / 5) / minutes);
        const accuracy = Math.round((this.correctChars / this.totalChars) * 100);

        // Pane tulemus kokku
        const result = {
            name: this.playerName,
            wpm: wpm,
            accuracy: accuracy,
            time: elapsedSeconds.toFixed(1)
        };

        // Salvesta ja kontrolli, kas jõudis edetabelisse
        const reachedLeaderboard = this.saveResult(result);

        // Mängi lõpu heli
        this.playEndSound();
        if (reachedLeaderboard) {
            // Kui jõudis edetabelisse - mängi eraldi heli
            setTimeout(() => this.playLeaderboardSound(), 800);
        }

        // Näita tulemusi
        this.showResults(result, reachedLeaderboard);
    }

    // === Mängu katkestamine ===
    quitGame() {
        if (this.gameRunning) {
            clearInterval(this.timerInterval);
            this.gameRunning = false;
        }
        document.getElementById("game").hidden = true;
        document.getElementById("setup").hidden = false;
    }

    // === Tulemuste salvestamine localStorage'i ===
    saveResult(result) {
        // Lae olemasolevad tulemused
        let scores = JSON.parse(localStorage.getItem("typerScores") || "[]");

        scores.push(result);

        // Sorteeri WPM järgi (suurim üleval)
        scores.sort((a, b) => b.wpm - a.wpm);

        // Hoia ainult top 10
        scores = scores.slice(0, 10);

        localStorage.setItem("typerScores", JSON.stringify(scores));
        this.saveResultToBackend(result);

        // Kas see tulemus on edetabelis?
        for (let i = 0; i < scores.length; i++) {
            if (scores[i].name === result.name &&
                scores[i].wpm === result.wpm &&
                scores[i].time === result.time) {
                return true;
            }
        }
        return false;
    }

    // === Tulemuste salvestamine backend'i ===
    async saveResultToBackend(result) {
        const token = await this.getUserToken();
        const headers = {
            "Content-Type": "application/json"
        };

        if (token) {
            headers.Authorization = "Bearer " + token;
        }

        fetch("/results", {
            method: "POST",
            headers: headers,
            body: JSON.stringify(result)
        }).then((response) => {
            if (!response.ok) {
                throw new Error("Backend vastas veaga");
            }
            if (this.currentUser) {
                this.loadMyResults();
            }
        }).catch((error) => {
            console.warn("Backend'i salvestamine ebaõnnestus:", error);
        });
    }

    // === Firebase autentimine ===
    async initFirebase() {
        if (!window.firebase) {
            this.setAuthStatus("Firebase SDK ei laadinud. Ava leht serveri kaudu ja kontrolli internetiühendust.");
            return;
        }

        try {
            const response = await fetch("/firebase-config");
            if (!response.ok) {
                throw new Error("Firebase config puudub");
            }

            const config = await response.json();
            if (!config.apiKey || !config.authDomain || !config.projectId) {
                throw new Error("Firebase config on poolik");
            }

            firebase.initializeApp(config);
            this.firebaseAuth = firebase.auth();

            this.firebaseAuth.onAuthStateChanged((user) => {
                this.currentUser = user;
                this.updateAuthUi(user);
                if (user) {
                    this.loadMyResults();
                } else {
                    this.renderMyAttempts([]);
                }
            });
        } catch (error) {
            this.setAuthStatus("Firebase kontoühendus pole seadistatud. Kohalik salvestus töötab edasi.");
            console.warn("Firebase init ebaõnnestus:", error);
        }
    }

    getAuthValues() {
        return {
            email: document.getElementById("authEmail").value.trim(),
            password: document.getElementById("authPassword").value
        };
    }

    async login() {
        if (!this.firebaseAuth) {
            alert("Firebase pole seadistatud.");
            return;
        }

        const { email, password } = this.getAuthValues();
        try {
            await this.firebaseAuth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            alert("Sisselogimine ebaõnnestus: " + error.message);
        }
    }

    async register() {
        if (!this.firebaseAuth) {
            alert("Firebase pole seadistatud.");
            return;
        }

        const { email, password } = this.getAuthValues();
        try {
            await this.firebaseAuth.createUserWithEmailAndPassword(email, password);
        } catch (error) {
            alert("Konto loomine ebaõnnestus: " + error.message);
        }
    }

    async loginWithGoogle() {
        if (!this.firebaseAuth) {
            alert("Firebase pole seadistatud.");
            return;
        }

        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await this.firebaseAuth.signInWithPopup(provider);
        } catch (error) {
            alert("Google'iga sisselogimine ebaõnnestus: " + error.message);
        }
    }

    async logout() {
        if (this.firebaseAuth) {
            await this.firebaseAuth.signOut();
        }
    }

    updateAuthUi(user) {
        const authForm = document.getElementById("authForm");
        const userPanel = document.getElementById("userPanel");
        const userEmail = document.getElementById("userEmail");
        const openAuthBtn = document.getElementById("openAuthBtn");
        const headerLogoutBtn = document.getElementById("headerLogoutBtn");

        authForm.hidden = Boolean(user);
        userPanel.hidden = !user;
        headerLogoutBtn.hidden = !user;

        if (user) {
            userEmail.textContent = user.email;
            openAuthBtn.textContent = user.email;
            this.setAuthStatus("Oled sisse logitud. Uued tulemused salvestatakse sinu kontole.");
            const nameInput = document.getElementById("playerName");
            if (!nameInput.value.trim()) {
                nameInput.value = user.email.split("@")[0].slice(0, 20);
            }
        } else {
            userEmail.textContent = "-";
            openAuthBtn.textContent = "Logi sisse";
            this.setAuthStatus("Logi sisse, et sinu katsed salvestuksid kontole.");
        }
    }

    setAuthStatus(message) {
        document.getElementById("authStatus").textContent = message;
    }

    async getUserToken() {
        if (!this.currentUser) {
            return null;
        }

        return this.currentUser.getIdToken();
    }

    async loadMyResults() {
        const token = await this.getUserToken();
        if (!token) return;

        try {
            const response = await fetch("/my-results", {
                headers: {
                    "Authorization": "Bearer " + token
                }
            });

            if (!response.ok) {
                throw new Error("Katseid ei saanud laadida");
            }

            const results = await response.json();
            this.renderMyAttempts(results);
        } catch (error) {
            this.setAuthStatus("Sisselogimine töötab, aga varasemaid katseid ei saanud laadida.");
            console.warn("Katsete laadimine ebaõnnestus:", error);
        }
    }

    renderMyAttempts(results) {
        const list = document.getElementById("myAttemptsList");

        if (!this.currentUser) {
            list.innerHTML = "<li>Logi sisse, et näha oma tulemusi.</li>";
            return;
        }

        if (results.length === 0) {
            list.innerHTML = "<li>Sul pole veel salvestatud katseid.</li>";
            return;
        }

        let html = "";
        results.slice(0, 10).forEach((result) => {
            html += "<li>";
            html += "<span>" + result.wpm + " WPM, " + result.accuracy + "%</span>";
            html += "<span>" + result.time + "s</span>";
            html += "</li>";
        });
        list.innerHTML = html;
    }

    openAuth() {
        document.getElementById("authModal").hidden = false;
    }

    closeAuth() {
        document.getElementById("authModal").hidden = true;
    }

    // === Tulemuste näitamine modaalis ===
    showResults(result, reachedLeaderboard) {
        // Kiirusepõhine hinnang - 4 vahemikku
        let emoji = "🐌";
        let label = "Tigu";

        if (result.wpm >= 70) {
            emoji = "🚀";
            label = "Rakett";
        } else if (result.wpm >= 40) {
            emoji = "🏃";
            label = "Jooksja";
        } else if (result.wpm >= 20) {
            emoji = "🚶";
            label = "Jalutaja";
        }

        document.getElementById("speedEmoji").textContent = emoji;
        document.getElementById("speedLabel").textContent = label;

        // Tulemused eraldi väljadel
        document.getElementById("resultName").textContent = result.name;
        document.getElementById("resultWpm").textContent = result.wpm + " WPM";
        document.getElementById("resultAccuracy").textContent = result.accuracy + "%";
        document.getElementById("resultTime").textContent = result.time + "s";

        // Staatuse tekst
        const statusEl = document.getElementById("resultStatus");
        if (reachedLeaderboard) {
            statusEl.textContent = "Sa jõudsid edetabelisse!";
        } else {
            statusEl.textContent = "Hea sõit! Proovi veelkord.";
        }

        document.getElementById("resultsModal").hidden = false;
    }

    // Modaali sulgemine - tagasi setup'isse
    closeResults() {
        document.getElementById("resultsModal").hidden = true;
        document.getElementById("game").hidden = true;
        document.getElementById("setup").hidden = false;
    }

    // === Edetabel ===
    openLeaderboard() {
        this.showLeaderboard();
        document.getElementById("leaderboardSidebar").hidden = false;
    }

    closeLeaderboard() {
        document.getElementById("leaderboardSidebar").hidden = true;
    }

    showLeaderboard() {
        const scores = JSON.parse(localStorage.getItem("typerScores") || "[]");
        const list = document.getElementById("leaderboardList");

        if (scores.length === 0) {
            list.innerHTML =
                '<p class="leaderboard-empty">Edetabel on tühi!</p>';
            return;
        }

        let html = "";
        for (let i = 0; i < scores.length; i++) {
            const s = scores[i];
            html += '<li>';
            html += '<span class="leaderboard-name">' +
                (i + 1) + '. ' + s.name + '</span>';
            html += '<span class="leaderboard-score">' +
                s.wpm + ' WPM · ' + s.accuracy + '%</span>';
            html += '</li>';
        }
        list.innerHTML = html;
    }

    clearLeaderboard() {
        if (confirm("Kustutada kõik tulemused?")) {
            localStorage.removeItem("typerScores");
            this.showLeaderboard();
        }
    }

    // === Tume/hele teema ===
    toggleTheme() {
        document.body.classList.toggle("dark");

        if (document.body.classList.contains("dark")) {
            localStorage.setItem("theme", "dark");
            document.getElementById("themeBtn").textContent = "Hele";
        } else {
            localStorage.setItem("theme", "light");
            document.getElementById("themeBtn").textContent = "Tume";
        }
    }

    loadTheme() {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark") {
            document.body.classList.add("dark");
            document.getElementById("themeBtn").textContent = "Hele";
        }
    }
}


// === Käivita mäng ===
const game = new Typer();
