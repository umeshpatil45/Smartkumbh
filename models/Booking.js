const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    hotel: String,
    userName: String,
    checkInDate: String,
    userPhone: String
});

// HI LINE CHECK KARA:
module.exports = mongoose.model('Booking', bookingSchema);