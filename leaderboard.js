console.log("leaderboard.js on õigesti ühendatud");

class Leaderboard {
    constructor() {
        this.results = [];
        this.resultsContainer = document.getElementById("resultsContainer");
        this.toggleBtn = document.getElementById("leaderboard");

        if (this.toggleBtn && this.resultsContainer) {
            this.toggleBtn.addEventListener("click", () => {
                this.resultsContainer.classList.toggle("active");
                this.toggleBtn.textContent = this.resultsContainer.classList.contains("active")
                    ? "Peida edetabel"
                    : "Vaata edetabelit";
            });
        }
        this.loadResultsFromFile();
    }

    async loadResultsFromFile() {
        try {
            const response = await fetch("database.txt?t=" + Date.now());
            const data = await response.json();
            
            let content = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
            this.results = Array.isArray(content) ? content : [];
            this.results.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
            this.drawTable();
        } catch (err) {
            console.error("Viga laadimisel:", err);
        }
    }

    drawTable() {
        const resultDiv = document.getElementById("results");
        if (!resultDiv) return;

        let tableHTML = `
        <table class="edetabel">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Nimi</th>
                    <th>Aeg</th>
                </tr>
            </thead>
            <tbody>`;

        this.results.slice(0, 15).forEach((res, i) => {
            tableHTML += `
            <tr>
                <td>${i + 1}.</td>
                <td>${res.name}</td>
                <td>${res.time}s</td>
            </tr>`;
        });

        tableHTML += `</tbody></table>`;

        resultDiv.innerHTML = tableHTML;
    }
}