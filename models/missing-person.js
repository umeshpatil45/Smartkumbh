const mongoose = require('mongoose');

const missingPersonSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true }, // यामध्ये आपण Base64 फोटो साठवू
    zone: { type: String, default: "General" },
    officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, default: "Missing" }, // Missing किंवा Found
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MissingPerson', missingPersonSchema); 