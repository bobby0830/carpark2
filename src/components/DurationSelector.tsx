import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { ChargingStation, ChargingRequest } from '../types/types';
import { formatTime } from '../utils/timeUtils';

interface DurationSelectorProps {
  chargingStation: ChargingStation;
  setChargingStation: React.Dispatch<React.SetStateAction<ChargingStation>>;
}

const DurationSelector: React.FC<DurationSelectorProps> = ({ chargingStation, setChargingStation }) => {
  const navigate = useNavigate();
  const { stationId } = useParams<{ stationId: string }>();
  const [duration, setDuration] = useState<string>('15');
  const [error, setError] = useState<string>('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [queueInfo, setQueueInfo] = useState<{
    isQueuing: boolean;
    queuePosition: number;
    estimatedWaitTime: number;
  } | null>(null);

  const handleDurationSubmit = () => {
    const durationNum = Number(duration);
    if (isNaN(durationNum) || durationNum <= 0 || durationNum > 120) {
      setError('充電時間必須在 1 至 120 分鐘之間');
      return;
    }

    // Calculate queue information
    const isQueuing = !!chargingStation.currentRequest;
    const queuePosition = chargingStation.queue.length + (isQueuing ? 1 : 0);
    const estimatedWaitTime = isQueuing ? (
      // Sum up waiting time from current request and queue
      (chargingStation.currentRequest?.remainingTime ?? chargingStation.currentRequest?.requestedChargingTime ?? 0) +
      chargingStation.queue.reduce((acc, curr) => acc + curr.requestedChargingTime, 0)
    ) : 0;

    setQueueInfo({
      isQueuing,
      queuePosition,
      estimatedWaitTime
    });
    setConfirmDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!queueInfo) return;

    const newRequest: ChargingRequest = {
      parkingSpotId: stationId || '',
      status: queueInfo.isQueuing ? 'waiting' : 'charging',
      requestedChargingTime: Number(duration),
      queuePosition: queueInfo.queuePosition,
      timestamp: new Date(),
      totalWaitingTime: queueInfo.estimatedWaitTime
    };

    if (!queueInfo.isQueuing) {
      // Start charging immediately
      setChargingStation({
        ...chargingStation,
        currentRequest: { 
          ...newRequest, 
          status: 'charging',
          remainingTime: Number(duration)
        },
        isAvailable: false
      });
    } else {
      // Add to queue
      setChargingStation({
        ...chargingStation,
        queue: [...chargingStation.queue, newRequest],
        isAvailable: false
      });
    }

    setConfirmDialogOpen(false);
    navigate(`/status/${stationId}`);
  };

  const handleDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDuration(event.target.value);
    setError('');
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Card sx={{ maxWidth: 400, mx: 'auto', bgcolor: '#ffffff', boxShadow: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" component="div" sx={{ color: '#1976d2', mb: 3, textAlign: 'center', fontWeight: 'bold' }}>
            請輸入充電時間
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              type="number"
              label="充電時間"
              value={duration}
              onChange={handleDurationChange}
              error={!!error}
              helperText={error || '充電時間必須在 1 至 120 分鐘之間'}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#fafafa'
                  }
                }
              }}
              InputProps={{
                endAdornment: <InputAdornment position="end">分鐘</InputAdornment>,
              }}
              inputProps={{
                min: 1,
                max: 120,
                step: 1
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
            <Button
              variant="contained"
              color="primary"
              sx={{
                fontWeight: 'bold',
                px: 4,
                py: 1.5
              }}
              onClick={handleDurationSubmit}
            >
              確認充電
            </Button>
            <Button
              variant="outlined"
              sx={{
                px: 4,
                py: 1.5
              }}
              onClick={() => navigate(`/${stationId}`)}
            >
              返回
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>充電站狀態</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {queueInfo?.isQueuing ? (
              <>
                目前充電站正在使用中
                <br />
                您的排隊位置：{queueInfo.queuePosition}
                <br />
                預估等待時間：{formatTime(queueInfo.estimatedWaitTime)}
              </>
            ) : (
              '充電站目前可以使用，可以立即開始充電'
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} color="primary">
            取消
          </Button>
          <Button onClick={handleConfirm} color="primary" autoFocus>
            確認
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DurationSelector;
