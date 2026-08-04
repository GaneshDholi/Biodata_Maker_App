const razorpayInstance = require('../config/razorpay');
const crypto = require('crypto');

// 1. Create Order
exports.createOrder = async (req, res) => {
    try {
        const options = {
            amount: 1000,
            currency: "INR",
            receipt: "receipt_" + Date.now(),
        };
        
        const order = await razorpayInstance.orders.create(options);
        
        res.status(200).json({ success: true, order });
    } catch (error) {
        console.error("Order creation error:", error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

// 2. Verify Payment
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
        // Generate the expected signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        // Compare signatures to prevent spoofing
        if (razorpay_signature === expectedSign) {
            // Payment is legit! Here you would normally update your database
            return res.status(200).json({ success: true, message: "Payment verified successfully" });
        } else {
            return res.status(400).json({ success: false, message: "Invalid signature sent!" });
        }
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ success: false, message: "Verification failed" });
    }
};