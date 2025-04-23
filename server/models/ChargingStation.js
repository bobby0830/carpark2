const mongoose = require('mongoose');

const ChargingStationSchema = new mongoose.Schema({
  id: String,
  name: String,
  location: String,
  status: String,
  // 根據你的 types.ts 裡的定義補齊欄位
});

module.exports = mongoose.model('ChargingStation', ChargingStationSchema);
