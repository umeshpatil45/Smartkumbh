const mongoose = require('mongoose');

const officerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    accessId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    department: { type: String, required: true },
    status: { type: String, default: 'Pending' } // Default status Pending rahil
});

module.exports = mongoose.model('Officer', officerSchema);