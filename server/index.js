// 基本 Express + Mongoose API server（不更動資料邏輯）
// 先檢查是否在 Vercel 環境中
const isVercel = process.env.VERCEL === '1';

// 在 Vercel 環境中使用環境變數，否則使用本地 .env 檔案
if (!isVercel) {
  require('dotenv').config({ path: '../.env' });
} else {
  require('dotenv').config();
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// 設定 CORS，允許所有來源存取
app.use(cors({
  origin: '*', // 允許所有來源
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 連接 MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected (API Server)'))
  .catch((err) => console.error('MongoDB connection error:', err));

// 引入 models
require('./models/ChargingStation');
require('./models/ChargingRequest');

// 引入 API 路由
// 在 Vercel 上使用根路徑作為 API 端點
app.use('/', require('./routes/api'));

// 添加一個簡單的測試端點
app.get('/test', (req, res) => {
  res.json({ message: 'API server is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API Server running on port ${PORT}`));
