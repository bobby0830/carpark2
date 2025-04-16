import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { ChargingStation } from '../types/types';

interface WelcomeProps {
  chargingStation: ChargingStation;
}

const VALID_PARKING_SPOTS = ['A001', 'A002', 'A003', 'A004', 'A005', 'B001', 'B002', 'B003', 'B004', 'B005'];

const Welcome: React.FC<WelcomeProps> = ({ chargingStation }) => {
  const { stationId } = useParams();
  const [parkingSpotId, setParkingSpotId] = useState(stationId || '');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (stationId) {
      if (VALID_PARKING_SPOTS.includes(stationId)) {
        setError('');
      } else {
        setError('無效的車位編號');
      }
    }
  }, [stationId]);

  const handleNext = () => {
    if (!parkingSpotId) {
      setError('請輸入車位編號');
      return;
    }

    if (!VALID_PARKING_SPOTS.includes(parkingSpotId)) {
      setError('無效的車位編號');
      return;
    }

    // 檢查該車位是否已經在使用中
    const isSpotInUse = chargingStation.currentRequest?.parkingSpotId === parkingSpotId ||
      chargingStation.queue.some(req => req.parkingSpotId === parkingSpotId);

    if (isSpotInUse) {
      setError('此車位已在充電或等待中');
      return;
    }

    setError('');
    navigate(`/duration/${parkingSpotId}`);
  };

  const handleDeveloperMode = () => {
    navigate('/developer');
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#ffffff', minHeight: '100vh' }}>
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleDeveloperMode}
        >
          Developer Mode
        </Button>
      </Box>

      <Typography variant="h5" component="div" sx={{ color: 'black', mb: 2, textAlign: 'center' }}>
        歡迎使用充電站
      </Typography>
      
      <Box sx={{ maxWidth: 400, mx: 'auto' }}>
        {stationId ? (
          <Typography sx={{ mb: 2, textAlign: 'center' }}>
            車位編號：{parkingSpotId}
          </Typography>
        ) : (
          <TextField
            fullWidth
            label="請輸入車位編號"
            value={parkingSpotId}
            onChange={(e) => setParkingSpotId(e.target.value.toUpperCase())}
            error={!!error}
            helperText={error}
            sx={{ mb: 2 }}
          />
        )}
        <Button
          fullWidth
          variant="contained"
          onClick={handleNext}
          disabled={!parkingSpotId || !!error}
        >
          下一步
        </Button>
      </Box>
    </Box>
  );
};

export default Welcome;
