const express = require('express');
const router = express.Router();
const ChargingStation = require('../models/ChargingStation');
const ChargingRequest = require('../models/ChargingRequest');

// 取得所有充電站
router.get('/stations', async (req, res) => {
  try {
    const stations = await ChargingStation.find();
    res.json(stations);
  } catch (err) {
    console.error('Error fetching stations:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 取得特定充電站
router.get('/stations/:id', async (req, res) => {
  try {
    let station = await ChargingStation.findOne({ id: req.params.id });
    
    // 如果找不到，建立一個新的充電站
    if (!station) {
      station = new ChargingStation({
        id: req.params.id,
        currentRequest: undefined,
        queue: [],
        isAvailable: true
      });
      await station.save();
    }
    
    res.json(station);
  } catch (err) {
    console.error('Error fetching station:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 更新充電站
router.put('/stations/:id', async (req, res) => {
  try {
    const station = await ChargingStation.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, upsert: true }
    );
    res.json(station);
  } catch (err) {
    console.error('Error updating station:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 取得所有充電請求
router.get('/requests', async (req, res) => {
  try {
    const requests = await ChargingRequest.find();
    res.json(requests);
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 取得特定充電站的請求
router.get('/stations/:stationId/requests', async (req, res) => {
  try {
    const requests = await ChargingRequest.find({ stationId: req.params.stationId });
    res.json(requests);
  } catch (err) {
    console.error('Error fetching station requests:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 新增充電請求
router.post('/requests', async (req, res) => {
  try {
    const newRequest = new ChargingRequest(req.body);
    await newRequest.save();
    
    // 更新充電站的請求隊列
    if (req.body.stationId) {
      const station = await ChargingStation.findOne({ id: req.body.stationId });
      if (station) {
        if (!station.currentRequest) {
          station.currentRequest = newRequest;
          station.isAvailable = false;
        } else {
          station.queue.push(newRequest);
        }
        await station.save();
      }
    }
    
    res.json(newRequest);
  } catch (err) {
    console.error('Error creating request:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 更新充電請求
router.put('/requests/:id', async (req, res) => {
  try {
    const request = await ChargingRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(request);
  } catch (err) {
    console.error('Error updating request:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
