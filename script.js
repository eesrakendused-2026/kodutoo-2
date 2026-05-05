//kasutatud on kohalikku ai mudelit ning cursorit

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCN1OhvuuTqWKPOyWN0wC3QIzCEmQWAWz8",
  authDomain: "typer-bea1d.firebaseapp.com",
  projectId: "typer-bea1d",
  storageBucket: "typer-bea1d.firebasestorage.app",
  messagingSenderId: "39208904856",
  appId: "1:39208904856:web:12b83301a078ded46188ed"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

function clampNumber(n, min, max) {
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
}

async function login() {
    const provider = new GoogleAuthProvider();

    try {
        const result = await signInWithPopup(auth, provider);
        console.log("Sisse logitud:", result.user.displayName);
        return result.user.displayName;
    } catch (error) {
        console.log("Login error:", error);
        return "Anonüümne";
    }
}

function formatSeconds(secondsNumber) {
    const n = Number(secondsNumber);
    if (!Number.isFinite(n)) return "-";
    return `${n.toFixed(2)}s`;
}

function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getBadgeForWpm(wpm) {
    const n = Number(wpm);
    if (!Number.isFinite(n) || n < 40) return { label: "Bronze", file: "mortal_typer_bronze.png" };
    if (n < 60) return { label: "Silver", file: "mortal_typer_silver.png" };
    return { label: "Gold", file: "mortal_typer_gold.png" };
}

function formatMmSs(totalSeconds) {
    const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
}

class SoundManager {
    constructor() {
        this.volume = 0.6;
        this.muted = false;

        this.sndStart = document.getElementById("sndStart");
        this.sndGameplay = document.getElementById("sndGameplay");
        this.sndClick = document.getElementById("sndClick");
        this.sndEnd = document.getElementById("sndEnd");
        this.sndQualify = document.getElementById("sndQualify");

        this._lastClickAt = 0;
        if (this.sndGameplay) this.sndGameplay.loop = true;
        this.apply();
    }

    setVolume(v) {
        this.volume = clampNumber(Number(v), 0, 1);
        this.apply();
    }

    setMuted(m) {
        this.muted = Boolean(m);
        this.apply();
    }

    apply() {
        const vol = this.muted ? 0 : this.volume;
        [this.sndStart, this.sndGameplay, this.sndClick, this.sndEnd, this.sndQualify].forEach(a => {
            if (!a) return;
            a.volume = vol;
        });
    }

    play(audioEl) {
        if (!audioEl) return;
        try {
            audioEl.currentTime = 0;
            audioEl.play();
        } catch {
        
        }
    }

    playStart() { this.play(this.sndStart); }
    playEnd() { this.play(this.sndEnd); }
    playQualify() { this.play(this.sndQualify); }

    startGameplayLoop() {
        if (!this.sndGameplay) return;
        try {
            this.sndGameplay.currentTime = 0;
            this.sndGameplay.play();
        } catch {
            
        }
    }

    pauseGameplayLoop() {
        if (!this.sndGameplay) return;
        try {
            this.sndGameplay.pause();
        } catch {
            
        }
    }

    stopGameplayLoop() {
        if (!this.sndGameplay) return;
        try {
            this.sndGameplay.pause();
            this.sndGameplay.currentTime = 0;
        } catch {
            
        }
    }

    playClickThrottled() {
        const now = performance.now();
        if (now - this._lastClickAt < 25) return;
        this._lastClickAt = now;
        this.play(this.sndClick);
    }
}

class Typer {
    constructor(pname) {
        this.name = pname;

        this.wordsInGame = 3;
        this.startingWordLength = 3;
        this.gameMode = "classic"; 
        this.timeLimitSeconds = 60;

        this.words = [];
        this.word = "";
        this.typeWords = [];

        this.startTime = 0;
        this.endTime = 0;
        this.hasStartedTyping = false;
        this.typedCount = 0;
        this.score = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.pauseStartedAt = 0;
        this.pausedTotalMs = 0;
        this.timeAttackTimerId = null;
        this.timeAttackEndsAt = 0;
        this.timeAttackRemainingMs = 0;
        this.wordsCompleted = 0;

        this.totalCharsTarget = 0;
        this.totalKeypresses = 0;
        this.wrongKeypresses = 0;
        this.lastResult = null;

        this.dbRefClassic = ref(db, "results");
        this.dbRefTime = ref(db, "results_timeattack");
        this.dbRef = this.dbRefClassic;

        this.sound = new SoundManager();
        this.bindUi();
        this.loadResults();
        this.loadWords();
    }

    bindUi() {
        this.$statusText = $("#statusText");
        this.$startBtn = $("#startBtn");
        this.$pauseBtn = $("#pauseBtn");
        this.$restartBtn = $("#restartBtn");
        this.$openResultsBtn = $("#openResultsBtn");
        this.$closeResultsBtn = $("#closeResultsBtn");
        this.$resultsModal = $("#resultsModal");
        this.$yourResult = $("#yourResult");

        this.$wordsInGame = $("#wordsInGame");
        this.$startingWordLength = $("#startingWordLength");
        this.$gameMode = $("#gameMode");
        this.$timeLimit = $("#timeLimit");

        $("#volume").on("input", (e) => this.sound.setVolume(e.target.value));
        $("#mute").on("change", (e) => this.sound.setMuted(e.target.checked));

        this.$gameMode.on("change", () => this.applyModeUi());
        this.$timeLimit.on("input", () => this.applyModeUi());

        this.$startBtn.on("click", () => this.startGame());
        this.$pauseBtn.on("click", () => this.togglePause());
        this.$restartBtn.on("click", () => this.restartGame());

        this.$openResultsBtn.on("click", () => this.openResults());
        this.$closeResultsBtn.on("click", () => this.closeResults());
        $(document).on("keydown", (e) => {
            if (e.key === "Escape") this.closeResults();
            if (e.key === " " && (this.isRunning || this.isPaused)) {
                e.preventDefault();
                this.togglePause();
            }
        });
        $(document).on("click", "[data-close='true']", () => this.closeResults());
        $(document).on("keydown", (e) => this.handleKeyDown(e));
    }

    loadResults() {
        onValue(this.dbRefClassic, (snapshot) => {
            this.allResultsClassic = [];
            snapshot.forEach(child => {
                this.allResultsClassic.push(child.val());
            });
            this.allResultsClassic.sort((a, b) => parseFloat(a.score) - parseFloat(b.score));
            if (this.isResultsOpen()) this.renderResults();
        });

        onValue(this.dbRefTime, (snapshot) => {
            this.allResultsTime = [];
            snapshot.forEach(child => {
                this.allResultsTime.push(child.val());
            });

            this.allResultsTime.sort((a, b) => {
                const wa = Number(a.wordsCompleted) || 0;
                const wb = Number(b.wordsCompleted) || 0;
                if (wa !== wb) return wb - wa;
                return (Number(b.wpm) || 0) - (Number(a.wpm) || 0);
            });
            if (this.isResultsOpen()) this.renderResults();
        });
    }

    loadWords() {
        $.get("lemmad2013.txt", (data) => {
            const dataFromFile = data.split("\n");
            this.separateWordsByLength(dataFromFile);
        }).fail(() => {
            this.$statusText.text("Ei leia lemmad2013.txt faili");
        });
    }

    separateWordsByLength(data) {
        for (let i = 0; i < data.length; i++) {
            const w = String(data[i] ?? "").trim();
            if (!w) continue;
            const len = w.length;

            if (!this.words[len]) {
                this.words[len] = [];
            }

            this.words[len].push(w);
        }

        this.$statusText.text("Valmis. Vajuta Start.");
        this.$startBtn.prop("disabled", false);
        this.applyModeUi();
    }

    applyModeUi() {
        const mode = String(this.$gameMode.val() ?? "classic");
        this.gameMode = mode === "time" ? "time" : "classic";

        const isClassic = this.gameMode === "classic";
        this.$wordsInGame.prop("disabled", !isClassic);
        this.$timeLimit.prop("disabled", isClassic);
        this.timeLimitSeconds = clampNumber(parseInt(this.$timeLimit.val(), 10), 10, 300);

        if (isClassic) {
            $("#timer").text("⏱ 00:00");
        } else {
            $("#timer").text(`⏱ ${formatMmSs(this.timeLimitSeconds)}`);
        }
    }

    startGame() {
        if (!this.words || this.words.length === 0) return;
        if (this.isRunning) return;

        this.applyModeUi();

        this.wordsInGame = clampNumber(parseInt(this.$wordsInGame.val(), 10), 1, 20);
        this.startingWordLength = clampNumber(parseInt(this.$startingWordLength.val(), 10), 2, 12);

        this.sound.playStart();
        this.sound.startGameplayLoop();

        this.isRunning = true;
        this.isPaused = false;
        this.hasStartedTyping = false;
        this.wordsCompleted = 0;
        this.pausedTotalMs = 0;
        this.pauseStartedAt = 0;
        this.typedCount = 0;
        this.score = 0;
        this.totalKeypresses = 0;
        this.wrongKeypresses = 0;
        this.lastResult = null;

        $("#score").hide().text("");
        $("#wordDiv").show();

        if (this.gameMode === "classic") {
            this.generateWords();
            $("#timer").text("⏱ 00:00");
        } else {
            this.generateWordsTimeAttackFirstWord();
            $("#timer").text(`⏱ ${formatMmSs(this.timeLimitSeconds)}`);
        }
        this.startTime = 0;

        this.$statusText.text("Kirjuta esimene täht, et alustada. (Paus: Space)");
        this.$startBtn.prop("disabled", true);
        this.$pauseBtn.prop("disabled", false).text("Paus");
        this.$restartBtn.prop("disabled", false);
    }

    generateWords() {
        this.typeWords = [];
        for (let i = 0; i < this.wordsInGame; i++) {
            const len = this.startingWordLength + i;
            const bucket = this.words[len] ?? [];
            const safeBucket = bucket.length ? bucket : (this.words[this.startingWordLength] ?? []);
            const randomIndex = Math.floor(Math.random() * safeBucket.length);
            this.typeWords[i] = safeBucket[randomIndex] ?? "start";
        }

        this.totalCharsTarget = this.typeWords.reduce((sum, w) => sum + String(w).length, 0);
        this.selectWord();
    }

    generateWordsTimeAttackFirstWord() {
        this.typeWords = [];
        this.typedCount = 0;
        this.totalCharsTarget = 0;
        this.setNextTimeAttackWord();
    }

    setNextTimeAttackWord() {
        const len = clampNumber(this.startingWordLength + Math.floor(Math.random() * 4), 2, 14);
        const bucket = this.words[len] ?? this.words[this.startingWordLength] ?? [];
        const randomIndex = Math.floor(Math.random() * bucket.length);
        const next = bucket[randomIndex] ?? "start";
        this.word = String(next);
        this.totalCharsTarget += this.word.length;
        this.drawWord();
        $("#info").html(`${this.wordsCompleted} sõna`);
    }

    selectWord() {
        this.word = this.typeWords[this.typedCount];
        this.typedCount++;

        this.drawWord();
        this.updateInfo();
    }

    drawWord() {
        $("#wordDiv").html(this.word);
    }

    updateInfo() {
        if (this.gameMode === "classic") {
            $("#info").html(this.typedCount + "/" + this.wordsInGame);
        } else {
            $("#info").html(`${this.wordsCompleted} sõna`);
        }
        this.updateAccuracyUi();
    }

    updateAccuracyUi() {
        const total = this.totalKeypresses;
        const wrong = this.wrongKeypresses;
        const acc = total === 0 ? 100 : Math.max(0, Math.round(((total - wrong) / total) * 100));
        $("#accuracy").text(`Täpsus: ${acc}%`);
    }

    handleKeyDown(e) {
        if (!this.isRunning || this.isPaused) return;
        if (this.isResultsOpen()) return;

        const key = e.key;
        if (key.length !== 1) return;

        this.sound.playClickThrottled();

        if (!this.hasStartedTyping) {
            this.hasStartedTyping = true;
            this.startTime = performance.now();
            this.$statusText.text("Mäng käib. (Paus: Space)");

            if (this.gameMode === "time") {
                this.startTimeAttackCountdown();
            }
        }

        this.totalKeypresses++;

        if (key !== this.word.charAt(0)) {
            this.wrongKeypresses++;
            $("#container").addClass("shake bad");

            setTimeout(() => {
                $("#container").removeClass("shake bad");
            }, 100);
            this.updateAccuracyUi();
            return;
        }

        if (this.word.length === 1) {
            if (this.gameMode === "classic") {
                if (this.typedCount === this.wordsInGame) {
                    this.endGame();
                } else {
                    this.selectWord();
                }
            } else {
                this.wordsCompleted++;
                this.updateInfo();
                this.setNextTimeAttackWord();
            }
        } else {
            this.word = this.word.slice(1);
        }

        this.drawWord();
        this.updateAccuracyUi();
    }

    endGame() {
        if (!this.startTime) return;
        this.endTime = performance.now();

        $("#wordDiv").hide();

        const elapsedMs = (this.endTime - this.startTime) - this.pausedTotalMs;
        const elapsedSeconds = Math.max(0.01, elapsedMs / 1000);
        this.score = Number(elapsedSeconds.toFixed(2));

        const minutes = elapsedMs / 60000;
        const cpm = this.totalCharsTarget / minutes;
        const wpm = (this.totalCharsTarget / 5) / minutes;
        const acc = this.totalKeypresses === 0 ? 100 : Math.max(0, ((this.totalKeypresses - this.wrongKeypresses) / this.totalKeypresses) * 100);

        const qualifiesTop10 = this.isTop10ByTime(this.score);

        this.lastResult = {
            name: this.name,
            score: this.score,
            wpm: Number(wpm.toFixed(1)),
            cpm: Number(cpm.toFixed(1)),
            accuracy: Number(acc.toFixed(1)),
            mode: "classic",
            createdAt: Date.now()
        };

        $("#score").html(`${formatSeconds(this.score)}`).show();

        this.saveResult();

        this.sound.stopGameplayLoop();
        this.sound.playEnd();
        if (qualifiesTop10) this.sound.playQualify();

        this.isRunning = false;
        this.isPaused = false;
        this.$statusText.text("Valmis! Ava tulemused nupust.");
        this.$startBtn.prop("disabled", false);
        this.$pauseBtn.prop("disabled", true);
    }

    endGameTimeAttack() {
        if (!this.startTime) return;
        this.endTime = performance.now();
        $("#wordDiv").hide();

        const elapsedMs = (this.endTime - this.startTime) - this.pausedTotalMs;
        const minutes = Math.max(0.01, elapsedMs / 60000);
        const cpm = this.totalCharsTarget / minutes;
        const wpm = (this.totalCharsTarget / 5) / minutes;
        const acc = this.totalKeypresses === 0 ? 100 : Math.max(0, ((this.totalKeypresses - this.wrongKeypresses) / this.totalKeypresses) * 100);

        const qualifiesTop10 = this.isTop10TimeAttack(this.wordsCompleted, wpm);

        this.lastResult = {
            name: this.name,
            timeLimit: this.timeLimitSeconds,
            wordsCompleted: this.wordsCompleted,
            wpm: Number(wpm.toFixed(1)),
            cpm: Number(cpm.toFixed(1)),
            accuracy: Number(acc.toFixed(1)),
            mode: "time",
            createdAt: Date.now()
        };

        $("#score").html(`${this.wordsCompleted} sõna`).show();

        this.saveResult();

        this.sound.stopGameplayLoop();
        this.sound.playEnd();
        if (qualifiesTop10) this.sound.playQualify();

        this.isRunning = false;
        this.isPaused = false;
        this.$statusText.text("Aeg läbi! Ava tulemused nupust.");
        this.$startBtn.prop("disabled", false);
        this.$pauseBtn.prop("disabled", true);
    }

    isTop10ByTime(newScoreSeconds) {
        const list = this.allResultsClassic ?? [];
        if (!list || list.length === 0) return true;
        const times = list
            .map(r => Number(r.score))
            .filter(n => Number.isFinite(n))
            .sort((a, b) => a - b);
        const candidate = Number(newScoreSeconds);
        if (!Number.isFinite(candidate)) return false;
        const combined = [...times, candidate].sort((a, b) => a - b);
        const idx = combined.indexOf(candidate);
        return idx > -1 && idx < 10;
    }

    isTop10TimeAttack(wordsCompleted, wpm) {
        const list = this.allResultsTime ?? [];
        if (!list || list.length === 0) return true;
        const candidate = { wordsCompleted: Number(wordsCompleted) || 0, wpm: Number(wpm) || 0 };
        const combined = [...list.map(r => ({
            wordsCompleted: Number(r.wordsCompleted) || 0,
            wpm: Number(r.wpm) || 0
        })), candidate].sort((a, b) => {
            if (a.wordsCompleted !== b.wordsCompleted) return b.wordsCompleted - a.wordsCompleted;
            return b.wpm - a.wpm;
        });
        const idx = combined.findIndex(x => x === candidate);
        return idx > -1 && idx < 10;
    }

    saveResult() {
        if (!this.lastResult) return;
        const target = this.lastResult.mode === "time" ? this.dbRefTime : this.dbRefClassic;
        push(target, this.lastResult);
    }

    openResults() {
        this.$resultsModal.attr("aria-hidden", "false").addClass("open");
        this.renderResults();
    }

    closeResults() {
        this.$resultsModal.attr("aria-hidden", "true").removeClass("open");
    }

    isResultsOpen() {
        return this.$resultsModal.hasClass("open");
    }

    renderResults() {
        this.renderYourResult();
        this.renderLeaderboard();
    }

    renderYourResult() {
        this.$yourResult.html("");
        if (!this.lastResult) {
            this.$yourResult.append(`<div class="emptyState">Tee üks mäng, et näha oma tulemust.</div>`);
            return;
        }

        const badge = getBadgeForWpm(this.lastResult.wpm);
        const safeName = escapeHtml(this.lastResult.name);

        this.$yourResult.append(`
            <div class="resultCard">
                <div class="resultMain">
                    <div class="resultHeading">${safeName}</div>
                    <div class="pillRow">
                        <div class="pill"><span class="pillLabel">Aeg</span><span class="pillValue">${formatSeconds(this.lastResult.score)}</span></div>
                        <div class="pill"><span class="pillLabel">WPM</span><span class="pillValue">${this.lastResult.wpm}</span></div>
                        <div class="pill"><span class="pillLabel">CPM</span><span class="pillValue">${this.lastResult.cpm}</span></div>
                        <div class="pill"><span class="pillLabel">Täpsus</span><span class="pillValue">${this.lastResult.accuracy}%</span></div>
                    </div>
                </div>
                <div class="badgeBox" title="${badge.label}">
                    <img class="badgeImg" src="${badge.file}" alt="${badge.label}" onerror="this.style.display='none'">
                    <div class="badgeLabel">${badge.label}</div>
                </div>
            </div>
        `);
    }

    renderLeaderboard() {
        $("#results").html("");

        const isTime = this.gameMode === "time";
        const list = isTime ? (this.allResultsTime ?? []) : (this.allResultsClassic ?? []);

        if (!list || list.length === 0) {
            $("#results").append(`<div class="emptyState">Edetabel on tühi.</div>`);
            return;
        }

        const top = isTime
            ? list.slice(0, 20)
            : list.slice().sort((a, b) => Number(a.score) - Number(b.score)).slice(0, 20);

        top.forEach((r, i) => {
            const wpm = Number(r.wpm);
            const acc = Number(r.accuracy);
            const badge = getBadgeForWpm(wpm);

            $("#results").append(`
                <article class="leaderRow">
                    <div class="leaderRank">#${i + 1}</div>
                    <div class="leaderContent">
                        <div class="leaderName">${escapeHtml(r.name ?? "Anon")}</div>
                        <div class="leaderMeta">
                            ${isTime
                                ? `<div class="metaItem"><span class="metaLabel">Sõnu</span><span class="metaValue">${Number(r.wordsCompleted) || 0}</span></div>`
                                : `<div class="metaItem"><span class="metaLabel">Aeg</span><span class="metaValue">${formatSeconds(Number(r.score))}</span></div>`
                            }
                            <div class="metaItem"><span class="metaLabel">WPM</span><span class="metaValue">${Number.isFinite(wpm) ? wpm.toFixed(1) : "-"}</span></div>
                            <div class="metaItem"><span class="metaLabel">Täpsus</span><span class="metaValue">${Number.isFinite(acc) ? `${acc.toFixed(1)}%` : "-"}</span></div>
                        </div>
                    </div>
                    <div class="leaderBadge">
                        <img class="badgeImg small" src="${badge.file}" alt="${badge.label}" onerror="this.style.display='none'">
                    </div>
                </article>
            `);
        });
    }

    togglePause() {
        if (!this.isRunning && !this.isPaused) return;

        if (this.isPaused) {
            this.isPaused = false;
            const now = performance.now();
            const pausedMs = Math.max(0, now - this.pauseStartedAt);
            this.pausedTotalMs += pausedMs;
            this.pauseStartedAt = 0;
            this.$pauseBtn.text("Paus");
            this.$statusText.text("Mäng käib. (Paus: Space)");
            this.sound.startGameplayLoop();
            if (this.gameMode === "time" && this.timeAttackRemainingMs > 0) {
                this.timeAttackEndsAt = performance.now() + this.timeAttackRemainingMs;
                this.timeAttackRemainingMs = 0;
                this.startTimeAttackCountdown();
            }
            return;
        }

        if (this.isRunning) {
            this.isPaused = true;
            const now = performance.now();
            this.pauseStartedAt = now;
            this.$pauseBtn.text("Jätka");
            this.$statusText.text("Pausil. (Jätka: Space)");
            this.sound.pauseGameplayLoop();
            if (this.gameMode === "time") {
                this.timeAttackRemainingMs = Math.max(0, this.timeAttackEndsAt - now);
                this.stopTimeAttackCountdown();
            }
        }
    }

    restartGame() {
        this.isRunning = false;
        this.isPaused = false;
        this.hasStartedTyping = false;
        this.pauseStartedAt = 0;
        this.pausedTotalMs = 0;
        this.totalKeypresses = 0;
        this.wrongKeypresses = 0;
        this.typedCount = 0;
        this.word = "";

        this.stopTimeAttackCountdown();
        this.sound.stopGameplayLoop();
        $("#score").hide().text("");
        $("#wordDiv").show().text("Vajuta Start");
        this.updateInfo();
        this.$statusText.text("Valmis. Vajuta Start.");
        this.$startBtn.prop("disabled", false);
        this.$pauseBtn.prop("disabled", true).text("Paus");
        this.$restartBtn.prop("disabled", true);
    }

    startTimeAttackCountdown() {
        this.stopTimeAttackCountdown();
        this.timeAttackEndsAt = performance.now() + (this.timeLimitSeconds * 1000);
        this.timeAttackRemainingMs = 0;

        const tick = () => {
            if (!this.isRunning) return;
            if (this.isPaused) return;
            const remainingMs = this.timeAttackEndsAt - performance.now();
            const remainingSec = Math.ceil(remainingMs / 1000);
            $("#timer").text(`⏱ ${formatMmSs(remainingSec)}`);
            if (remainingMs <= 0) {
                $("#timer").text("⏱ 00:00");
                this.endGameTimeAttack();
                return;
            }
            this.timeAttackTimerId = window.setTimeout(tick, 200);
        };

        tick();
    }

    stopTimeAttackCountdown() {
        if (this.timeAttackTimerId) {
            window.clearTimeout(this.timeAttackTimerId);
            this.timeAttackTimerId = null;
        }
        this.timeAttackEndsAt = 0;
    }
}

let typerInstance;

login().then(name => {
    typerInstance = new Typer(name);
});