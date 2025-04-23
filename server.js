const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// 載入環境變數
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 中間件
app.use(cors());
app.use(express.json());

// 連接到 MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('已連接到 MongoDB Atlas'))
  .catch(err => console.error('MongoDB 連接錯誤:', err));

// 定義充電站模型
const chargingStationSchema = new mongoose.Schema({
  _id: { type: String, default: '1' },
  currentRequest: {
    parkingSpotId: String,
    status: String,
    requestedChargingTime: Number,
    remainingTime: Number,
    queuePosition: Number,
    timestamp: Date,
    totalWaitingTime: Number
  },
  queue: [{
    parkingSpotId: String,
    status: String,
    requestedChargingTime: Number,
    remainingTime: Number,
    queuePosition: Number,
    timestamp: Date,
    totalWaitingTime: Number
  }],
  isAvailable: Boolean
});

const ChargingStation = mongoose.model('ChargingStation', chargingStationSchema);

// API 端點

// 獲取充電站
app.get('/stations/:id', async (req, res) => {
  try {
    let station = await ChargingStation.findById(req.params.id);
    
    if (!station) {
      // 如果不存在，創建一個新的
      station = new ChargingStation({
        _id: req.params.id,
        currentRequest: undefined,
        queue: [],
        isAvailable: true
      });
      await station.save();
    }
    
    res.json(station);
  } catch (err) {
    console.error('獲取充電站錯誤:', err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// 更新充電站
app.put('/stations/:id', async (req, res) => {
  try {
    const station = await ChargingStation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, upsert: true }
    );
    
    res.json(station);
  } catch (err) {
    console.error('更新充電站錯誤:', err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// 靜態文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// 啟動服務器
app.listen(PORT, () => {
  console.log(`服務器運行在端口 ${PORT}`);
});
