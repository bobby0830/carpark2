const mongoose = require('mongoose');

// 充電請求子文件結構
const ChargingRequestSchema = new mongoose.Schema({
  parkingSpotId: String,
  status: {
    type: String,
    enum: ['waiting', 'charging', 'completed'],
    default: 'waiting'
  },
  requestedChargingTime: Number,
  remainingTime: Number,
  queuePosition: Number,
  totalWaitingTime: Number,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// 充電站主文件結構
const ChargingStationSchema = new mongoose.Schema({
  id: String,
  currentRequest: ChargingRequestSchema,
  queue: [ChargingRequestSchema],
  isAvailable: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('ChargingStation', ChargingStationSchema);
