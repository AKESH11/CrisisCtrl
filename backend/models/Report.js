const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., Fire, Flood, Medical
  description: { type: String, required: true },
  location: { 
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  severity: { type: String, enum: ['Low', 'Medium', 'Critical'], default: 'Medium' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', ReportSchema);