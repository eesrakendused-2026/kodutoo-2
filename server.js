const express = require('express');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const resultsFilePath = path.join(__dirname, 'results.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Endpoint to serve Firebase config to frontend
app.get('/firebase-config', (req, res) => {
    res.json({
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
    });
});

let db;

function readLocalResults() {
    if (!fs.existsSync(resultsFilePath)) {
        return [];
    }

    try {
        return JSON.parse(fs.readFileSync(resultsFilePath, 'utf8'));
    } catch (error) {
        console.error('Could not read local results:', error);
        return [];
    }
}

function saveLocalResult(result) {
    const results = readLocalResults();
    results.push(result);
    results.sort((a, b) => b.wpm - a.wpm);
    fs.writeFileSync(resultsFilePath, JSON.stringify(results.slice(0, 20), null, 2));
}

// Middleware to check Firebase token
const checkAuth = async (req, res, next) => {
    if (!db) {
        return res.status(500).send('Database not initialized');
    }

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            req.user = decodedToken;
            return next();
        } catch (error) {
            console.error('Error while verifying Firebase ID token:', error);
            return res.status(403).send('Unauthorized');
        }
    } else {
        return res.status(401).send('No token provided');
    }
};

const attachUserIfPresent = async (req, res, next) => {
    if (!db || !req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return next();
    }

    const idToken = req.headers.authorization.split('Bearer ')[1];
    try {
        req.user = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
        console.error('Error while verifying Firebase ID token:', error);
    }

    next();
};

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH && process.env.FIREBASE_DATABASE_URL) {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });

        db = admin.database();
        console.log("Firebase Admin SDK initialized successfully.");

    } else {
        throw new Error("Firebase environment variables not set.")
    }
} catch (error) {
    console.warn(`Firebase Admin SDK could not be initialized. API endpoints requiring authentication will not work. Error: ${error.message}`);
}

if (!db && process.env.FIREBASE_DATABASE_URL) {
    console.warn("Server will use local results.json fallback until serviceAccountKey.json is added.");
}

// API to get all results, sorted by speed (publicly accessible)
app.get('/results', (req, res) => {
    if (!db) {
        return res.json(readLocalResults());
    }

    const resultsRef = db.ref('results');
    resultsRef.orderByChild('wpm').once('value', (snapshot) => {
        const results = [];
        snapshot.forEach((childSnapshot) => {
            results.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
        results.sort((a, b) => b.wpm - a.wpm);
        res.json(results.slice(0, 20)); // Return only top 20
    });
});

// API to get current user's previous attempts
app.get('/my-results', checkAuth, (req, res) => {
    const resultsRef = db.ref('results');
    resultsRef.orderByChild('uid').equalTo(req.user.uid).once('value', (snapshot) => {
        const results = [];
        snapshot.forEach((childSnapshot) => {
            results.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
        results.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        res.json(results);
    });
});

// API to save a new result
app.post('/results', attachUserIfPresent, (req, res) => {
    const newResult = {
        name: String(req.body.name || '').trim().slice(0, 20),
        wpm: Number(req.body.wpm) || 0,
        accuracy: Number(req.body.accuracy) || 0,
        time: parseFloat(req.body.time),
        uid: req.user ? req.user.uid : null,
        email: req.user ? req.user.email : null,
        createdAt: new Date().toISOString()
    };

    if (!newResult.name || !Number.isFinite(newResult.time)) {
        return res.status(400).send('Invalid result');
    }

    if (!db) {
        saveLocalResult(newResult);
        return res.status(201).json({ saved: true, storage: 'local-file' });
    }

    const resultsRef = db.ref('results');
    const newResultRef = resultsRef.push();
    newResultRef.set(newResult, (error) => {
        if (error) {
            res.status(500).send(error);
        } else {
            res.status(201).json({ id: newResultRef.key, storage: 'firebase' });
        }
    });
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`Server is running! Open http://localhost:${port} to see your application.`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Stop the old server or set a different PORT in .env.`);
        process.exit(1);
    }

    throw error;
});
