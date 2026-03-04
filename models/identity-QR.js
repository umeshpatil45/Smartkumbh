const mongoose = require('mongoose');

const identitySchema = new mongoose.Schema({
    leaderName: String,
    visitReason: String,
    personCount: Number,
    qrId: String,
    timestamp: { type: Date, default: Date.now }
});

// HI LINE CHECK KARA: 'module.exports' asne garjeche aahe
module.exports = mongoose.model('Identity', identitySchema);