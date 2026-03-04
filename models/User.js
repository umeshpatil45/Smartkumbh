const mongoose = require('mongoose'); // ही ओळ महत्त्वाची आहे

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, unique: true, required: true },
    email: { type: String }, // ऐच्छिक
    password: { type: String, required: true }
});

module.exports = mongoose.model('User', userSchema);