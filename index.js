require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors());
app.use(express.json());

app.get("/api/results", async (req, res) => {
    try {
        const { difficulty } = req.query;

        const allowed = ["Lihtne", "Keskmine", "Raske"];
        if (difficulty && !allowed.includes(difficulty)) {
            return res.status(400).json({ error: "Invalid difficulty" });
        }

        const sql = difficulty
            ? `
                SELECT name, difficulty, time_seconds AS time
                FROM player_results
                WHERE difficulty = $1
                ORDER BY time_seconds ASC, created_at ASC
                LIMIT 20
              `
            : `
                SELECT name, difficulty, time_seconds AS time
                FROM player_results
                ORDER BY time_seconds ASC, created_at ASC
                LIMIT 20
              `;

        const values = difficulty ? [difficulty] : [];
        const { rows } = await pool.query(sql, values);
        res.json(rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Failed to load results" });
    }
});

app.post("/api/results", async (req, res) => {
    try {
        const { name, difficulty, time } = req.body;
        if (!name || !difficulty || time === undefined) {
            return res.status(400).json({ error: "Name, difficulty, and time are required" });
        }

        const sql = `
            INSERT INTO player_results (name, difficulty, time_seconds)
            VALUES ($1, $2, $3)
            RETURNING id, name, difficulty, time_seconds AS time, created_at
            `;

        const values = [name, req.body.difficulty, Number(time)];
        const { rows } = await pool.query(sql, values);

        res.status(201).json(rows[0]);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "failed to save result" });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
    console.log("API running on port", port);
});