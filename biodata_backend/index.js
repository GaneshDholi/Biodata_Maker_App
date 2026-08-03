const express = require('express');
const cors = require('cors');
require('dotenv').config();

const paymentRoutes = require('./routes/payment');
const biodataRoutes = require('./routes/biodata');

const app = express();

// Middleware
app.use(cors({
    origin: [
        'https://biodata-maker-app.vercel.app',
        'https://biodata-maker-app-git-main-ganesh-dholis-projects.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));
app.use(express.json()); // Allows Express to read JSON body data
app.use('/api/biodata', biodataRoutes);
// Routes
app.use('/api/payment', paymentRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});