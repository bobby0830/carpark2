const express = require('express');
const router = express.Router();
const ChargingStation = require('../models/ChargingStation');
const ChargingRequest = require('../models/ChargingRequest');

// 取得所有充電站
router.get('/stations', async (req, res) => {
  const stations = await ChargingStation.find();
  res.json(stations);
});

// 取得所有充電請求
router.get('/requests', async (req, res) => {
  const requests = await ChargingRequest.find();
  res.json(requests);
});

// 新增充電請求
router.post('/requests', async (req, res) => {
  const newRequest = new ChargingRequest(req.body);
  await newRequest.save();
  res.json(newRequest);
});

// 其他API請根據你現有的資料操作需求補齊

module.exports = router;
