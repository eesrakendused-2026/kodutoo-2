class Typer{
    constructor(){
        this.name="";
        this.wordsInGame=5;
        this.words=[];
        this.typeWords=[];
        this.wordsTyped=0;
        this.word="";
        this.startTime=0;
        this.score=0;
        this.results=[];
        this.soundUnlocked=false;

        this.loadFromFile();
    }

    async loadFromFile(){
        const res=await fetch("lemmad2013.txt");
        const text=await res.text();
        this.getWords(text);
        this.loadResults();
    }

    loadResults(){
        let saved=localStorage.getItem("score");
        this.results=saved?JSON.parse(saved):[];

        const div=document.getElementById("results");
        div.innerHTML="";

        this.results.forEach(r=>{
            const row=document.createElement("div");
            row.innerHTML=`<span>${r.name}</span><span>${r.time}s</span>`;
            div.appendChild(row);
        });
    }

    getWords(data){
        let list=data.split("\n");

        list.forEach(w=>{
            let len=w.length;
            if(!this.words[len]) this.words[len]=[];
            this.words[len].push(w);
        });

        this.askName();
    }

    askName(){
        document.getElementById("submitname").addEventListener("click",()=>{
            this.name=document.getElementById("username").value;

            if(!this.soundUnlocked){
                document.getElementById("startSound").play().catch(()=>{});
                this.soundUnlocked=true;
            }

            this.startCountdown();
        });
    }

    startCountdown(){
        document.getElementById("counter").style.display="flex";
        document.getElementById("name").style.display="none";

        let i=3;

        let int=setInterval(()=>{
            document.getElementById("time").innerText=i;
            i--;

            if(i<0){
                clearInterval(int);
                document.getElementById("counter").style.display="none";
                this.startGame();
            }
        },1000);
    }

    startGame(){
        this.generateWords();

        document.getElementById("info").style.display="flex";
        document.getElementById("wordContainer").style.display="flex";

        this.startTime=performance.now();

        this.listener=(e)=>this.handleKey(e.key);
        window.addEventListener("keypress",this.listener);
    }

    generateWords(){
        for(let i=0;i<this.wordsInGame;i++){
            let len=5;
            let rand=Math.floor(Math.random()*this.words[len].length);
            this.typeWords.push(this.words[len][rand]);
        }
        this.nextWord();
    }

    nextWord(){
        this.word=this.typeWords[this.wordsTyped];
        document.getElementById("word").innerText=this.word;
        document.getElementById("wordcount").innerText=
            `${this.wordsTyped}/${this.wordsInGame}`;
    }

    handleKey(key){
        let sound=document.getElementById("typeSound");
        sound.currentTime=0;
        sound.play();

        if(key===this.word[0]){
            this.word=this.word.slice(1);
            document.getElementById("word").innerText=this.word;

            if(this.word.length===0){
                this.wordsTyped++;

                if(this.wordsTyped<this.wordsInGame){
                    this.nextWord();
                }else{
                    this.endGame();
                }
            }
        }
    }

    endGame(){
        window.removeEventListener("keypress",this.listener);

        let time=((performance.now()-this.startTime)/1000).toFixed(2);
        this.score=time;

        document.getElementById("endSound").play();

        document.getElementById("word").innerText="Aeg: "+time+"s";

        let img=document.getElementById("resultImage");

        if(time<5){
            img.src="https://via.placeholder.com/150/00ff00?text=Pro";
        }else if(time<10){
            img.src="https://via.placeholder.com/150/ffff00?text=OK";
        }else{
            img.src="https://via.placeholder.com/150/ff0000?text=Slow";
        }

        this.saveResult();
    }

    saveResult(){
        document.getElementById("winSound").play();

        this.results.push({name:this.name,time:this.score});
        this.results.sort((a,b)=>a.time-b.time);

        localStorage.setItem("score",JSON.stringify(this.results));
        this.loadResults();
    }
}

document.addEventListener("DOMContentLoaded",()=>{
    new Typer();

    let modal=document.getElementById("modal");

    document.getElementById("openResults").onclick=()=>{
        modal.style.display="block";
    };

    document.getElementById("closeModal").onclick=()=>{
        modal.style.display="none";
    };
});