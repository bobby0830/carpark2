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
// 支持兩種環境變數名稱（MONGODB_URI 和 MONGODB_URL）
const mongoURI = process.env.MONGODB_URI || process.env.MONGODB_URL;

if (!mongoURI) {
  console.error('錯誤: 缺少 MongoDB 連接字串。請設置 MONGODB_URI 或 MONGODB_URL 環境變數。');
  process.exit(1);
}

// 初始化充電站數據
async function initializeChargingStation() {
  try {
    console.log('正在檢查充電站數據...');
    const station = await ChargingStation.findById('1');
    
    if (!station) {
      console.log('充電站數據不存在，創建初始數據...');
      const newStation = new ChargingStation({
        _id: '1',
        currentRequest: undefined,
        queue: [],
        isAvailable: true
      });
      
      await newStation.save();
      console.log('充電站初始數據已創建:', newStation);
    } else {
      console.log('充電站數據已存在:', station);
    }
  } catch (err) {
    console.error('初始化充電站數據錯誤:', err);
  }
}

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

// 定義處理充電站請求的函數
const handleGetStation = async (req, res) => {
  try {
    console.log(`收到獲取充電站請求，ID: ${req.params.id}`);
    
    let station = await ChargingStation.findById(req.params.id);
    console.log('資料庫查詢結果:', station);
    
    if (!station) {
      console.log('充電站不存在，創建新的充電站');
      // 如果不存在，創建一個新的
      station = new ChargingStation({
        _id: req.params.id,
        currentRequest: undefined,
        queue: [],
        isAvailable: true
      });
      
      console.log('嘗試保存新充電站:', station);
      await station.save();
      console.log('充電站已成功保存');
    }
    
    console.log('返回充電站資料:', station);
    res.json(station);
  } catch (err) {
    console.error('獲取充電站錯誤:', err);
    res.status(500).json({ message: '伺服器錯誤', error: err.message });
  }
};

// 定義處理更新充電站的函數
const handleUpdateStation = async (req, res) => {
  try {
    console.log(`收到更新充電站請求，ID: ${req.params.id}`);
    console.log('請求體:', JSON.stringify(req.body, null, 2));
    
    const updatedStation = await ChargingStation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    console.log('更新後的充電站:', updatedStation);
    
    if (!updatedStation) {
      console.log('充電站不存在，返回 404');
      return res.status(404).json({ message: '充電站不存在' });
    }
    
    console.log('成功更新充電站，返回更新後的資料');
    res.json(updatedStation);
  } catch (err) {
    console.error('更新充電站錯誤:', err);
    res.status(500).json({ message: '伺服器錯誤', error: err.message });
  }
};

// 原始路徑
// 獲取充電站
app.get('/stations/:id', handleGetStation);

// 更新充電站
app.put('/stations/:id', handleUpdateStation);

// 新增對 /api 路徑的支持
// 獲取充電站
app.get('/api/stations/:id', handleGetStation);

// 更新充電站
app.put('/api/stations/:id', handleUpdateStation);

// 靜態文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// 在連接到 MongoDB 後啟動伺服器
mongoose.connect(mongoURI)
  .then(async () => {
    console.log('已連接到 MongoDB Atlas');
    
    // 初始化充電站數據
    try {
      console.log('正在檢查充電站數據...');
      const station = await ChargingStation.findById('1');
      
      if (!station) {
        console.log('充電站數據不存在，創建初始數據...');
        const newStation = new ChargingStation({
          _id: '1',
          currentRequest: undefined,
          queue: [],
          isAvailable: true
        });
        
        await newStation.save();
        console.log('充電站初始數據已創建:', newStation);
      } else {
        console.log('充電站數據已存在:', station);
      }
    } catch (err) {
      console.error('初始化充電站數據錯誤:', err);
    }
    
    // 啟動服務器
    app.listen(PORT, () => {
      console.log(`服務器運行在端口 ${PORT}`);
    });
  })
  .catch(err => {
    console.error('連接到 MongoDB 錯誤:', err);
  });
