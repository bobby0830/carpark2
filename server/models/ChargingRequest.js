const mongoose = require('mongoose');

const ChargingRequestSchema = new mongoose.Schema({
  id: String,
  stationId: String,
  userId: String,
  startTime: Date,
  endTime: Date,
  // 根據你的 types.ts 裡的定義補齊欄位
});

module.exports = mongoose.model('ChargingRequest', ChargingRequestSchema);
