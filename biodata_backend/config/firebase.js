const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require("dotenv").config();

// Parse the private key properly to handle newline characters from the .env file
const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

// Create the credentials object
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
};

// Initialize Firebase using the modern modular syntax
initializeApp({
    credential: cert(serviceAccount)
});

// Initialize Firestore
const db = getFirestore();

module.exports = { db };