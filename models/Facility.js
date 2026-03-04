const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema({
    name: String,
    count: String,
    status: String,
    icon: String // उदा. "fa-solid fa-hotel"
});

module.exports = mongoose.model('Facility', facilitySchema);