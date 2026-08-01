const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const imagekit = require('../config/imagekit');

// ==========================================
// 1. IMAGEKIT SECURE UPLOAD AUTHENTICATION
// ==========================================
// Frontend calls this to get a signature before uploading a photo directly to ImageKit
router.get('/imagekit-auth', (req, res) => {
    try {
        const authenticationParameters = imagekit.getAuthenticationParameters();
        res.status(200).json(authenticationParameters);
    } catch (error) {
        console.error("ImageKit Auth Error:", error);
        res.status(500).json({ success: false, message: "Could not generate ImageKit auth parameters" });
    }
});

// ==========================================
// 2. SAVE BIODATA TO FIRESTORE
// ==========================================
router.post('/save', async (req, res) => {
    try {
        // Extract data sent from your frontend
        const { userId, templateId, formData, isPremium } = req.body;

        // Save a new document to the "biodatas" collection
        const biodataRef = await db.collection('biodatas').add({
            userId: userId || "guest", // Useful if you add Firebase Login later
            templateId: templateId || "Design_1",
            formData: formData || {},
            isPremium: isPremium || false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        res.status(200).json({ 
            success: true, 
            message: "Biodata saved successfully", 
            biodataId: biodataRef.id 
        });
    } catch (error) {
        console.error("Save Biodata Error:", error);
        res.status(500).json({ success: false, message: "Failed to save biodata" });
    }
});

// ==========================================
// 3. FETCH SAVED BIODATA (For editing later)
// ==========================================
router.get('/:id', async (req, res) => {
    try {
        const biodataId = req.params.id;
        const doc = await db.collection('biodatas').doc(biodataId).get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: "Biodata not found" });
        }

        res.status(200).json({ success: true, data: doc.data() });
    } catch (error) {
        console.error("Fetch Biodata Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch biodata" });
    }
});

module.exports = router;    