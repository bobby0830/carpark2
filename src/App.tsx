import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Welcome from './components/Welcome';
import DurationSelector from './components/DurationSelector';
import Status from './components/Status';
import DeveloperMode from './components/DeveloperMode';
import QRCodeGenerator from './components/QRCodeGenerator';
import { ChargingStation, ChargingRequest } from './types/types';
import './App.css';

function App() {
  const [chargingStation, setChargingStation] = useState<ChargingStation>({
    queue: [],
    isAvailable: true
  });

  // Initialize empty charging station
  useEffect(() => {
    setChargingStation({
      currentRequest: undefined,
      queue: [],
      isAvailable: true
    });
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome chargingStation={chargingStation} />} />
        <Route path="/spot/:stationId?" element={<Welcome chargingStation={chargingStation} />} />
        <Route path="/duration/:stationId" element={<DurationSelector chargingStation={chargingStation} setChargingStation={setChargingStation} />} />
        <Route path="/status/:stationId" element={<Status chargingStation={chargingStation} setChargingStation={setChargingStation} />} />
        <Route path="/developer" element={<DeveloperMode chargingStation={chargingStation} setChargingStation={setChargingStation} />} />
        <Route path="/qrcodes" element={<QRCodeGenerator />} />
      </Routes>
    </Router>
  );
}

export default App;
