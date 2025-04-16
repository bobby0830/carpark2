import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { Link } from 'react-router-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { ChargingRequest, ChargingStation } from '../types/types';
import { formatTime } from '../utils/timeFormat';

interface StatusProps {
  chargingStation: ChargingStation;
  setChargingStation: React.Dispatch<React.SetStateAction<ChargingStation>>;
}

const Status: React.FC<StatusProps> = ({ chargingStation, setChargingStation }) => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const [currentRequest, setCurrentRequest] = useState<ChargingRequest | undefined>(undefined);

  // Global countdown effect for charging station
  useEffect(() => {
    const timer = setInterval(() => {
      setChargingStation((prev: ChargingStation) => {
        if (!prev.currentRequest || prev.currentRequest.status !== 'charging') return prev;

        // Update remaining time for current charging request
        const currentTime = prev.currentRequest.remainingTime ?? prev.currentRequest.requestedChargingTime;
        const newRemainingTime = Math.max(0, currentTime - (1/60));

        if (newRemainingTime === 0) {
          const [nextInQueue, ...remainingQueue] = prev.queue;
          
          if (nextInQueue) {
            // Start charging the next request
            return {
              ...prev,
              currentRequest: {
                ...nextInQueue,
                status: 'charging',
                remainingTime: nextInQueue.requestedChargingTime
              },
              queue: remainingQueue,
              isAvailable: false
            };
          } else {
            // No more requests in queue
            return {
              ...prev,
              currentRequest: undefined,
              isAvailable: true
            };
          }
        }

        // Continue charging current request
        return {
          ...prev,
          currentRequest: {
            ...prev.currentRequest,
            remainingTime: newRemainingTime
          },
          queue: prev.queue.map(req => {
            if (req.status !== 'waiting') return req;
            const totalWaitingTime = newRemainingTime + 
              prev.queue
                .filter(r => r.status === 'waiting' && r.queuePosition < req.queuePosition)
                .reduce((acc, r) => acc + r.requestedChargingTime, 0);
            return { ...req, totalWaitingTime };
          })
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setChargingStation]);

  // Sync with database every second
  useEffect(() => {
    if (!stationId) return;

    const syncWithDatabase = () => {
      // Find the request in the charging station
      const dbRequest = chargingStation.currentRequest?.parkingSpotId === stationId
        ? chargingStation.currentRequest
        : chargingStation.queue.find(r => r.parkingSpotId === stationId);

      if (dbRequest) {
        setCurrentRequest(dbRequest);
      } else {
        setCurrentRequest(undefined);
      }
    };

    // Initial sync
    syncWithDatabase();

    // Set up timer for regular syncs
    const timer = setInterval(syncWithDatabase, 1000);

    return () => clearInterval(timer);
  }, [chargingStation, stationId]);

  // Helper function to calculate waiting time (in seconds)
  const calculateWaitingTime = (request: ChargingRequest, queue: ChargingRequest[], currentRequest: ChargingRequest): number => {
    if (request.status !== 'waiting') return 0;
    if (request.parkingSpotId === currentRequest.parkingSpotId) return 0;

    // Convert minutes to seconds for the current request
    let totalWaitingTime = currentRequest.remainingTime || (currentRequest.requestedChargingTime * 60);
    const requestIndex = queue.findIndex(r => r.parkingSpotId === request.parkingSpotId);
    const requestsAhead = queue.slice(0, requestIndex);

    requestsAhead.forEach(r => {
      if (r.status === 'waiting') {
        // Convert minutes to seconds for each request in queue
        totalWaitingTime += r.requestedChargingTime;
      }
    });

    return totalWaitingTime;
  };

  if (!currentRequest) {
    return (
      <Box sx={{ p: 3, bgcolor: '#ffffff', minHeight: '100vh' }}>
        <Typography sx={{ color: 'black', mb: 2, textAlign: 'center' }}>
          找不到充電請求
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/')}
          sx={{ mx: 'auto', display: 'block' }}
        >
          返回首頁
        </Button>
      </Box>
    );
  }

  const handleConfirmLeave = () => {
    setChargingStation((prev: ChargingStation) => ({
      ...prev,
      currentRequest: undefined,
      isAvailable: true
    }));
    setConfirmDialogOpen(false);
    navigate('/');
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#ffffff', minHeight: '100vh' }}>
      <Card sx={{ maxWidth: 400, mx: 'auto', bgcolor: '#ffffff' }}>
        <CardContent>
          <Typography variant="h5" component="div" sx={{ color: 'black', mb: 2, textAlign: 'center' }}>
            充電狀態
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ color: 'black', mb: 1 }}>
              車位編號：{currentRequest.parkingSpotId}
            </Typography>

            <Typography sx={{ color: 'black', mb: 1 }}>
              狀態：
              {currentRequest.status === 'waiting' && '等待中'}
              {currentRequest.status === 'charging' && '充電中'}
              {currentRequest.status === 'completed' && '充電完成'}
            </Typography>

            {currentRequest.status === 'waiting' && (
              <>
                <Typography sx={{ color: 'black', mb: 1 }}>
                  排隊位置：{currentRequest.queuePosition}
                </Typography>
                <Typography sx={{ color: 'black' }}>
                  等待時間：{formatTime(currentRequest.totalWaitingTime || 0)}
                </Typography>
              </>
            )}

            {currentRequest.status === 'charging' && (
              <Typography sx={{ color: 'black' }}>
                剩餘時間：{formatTime(currentRequest.remainingTime ?? currentRequest.requestedChargingTime)}
              </Typography>
            )}

            {currentRequest.status === 'completed' && (
              <Typography sx={{ color: 'black' }}>
                請按下確認離開
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            {currentRequest.status === 'completed' ? (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setConfirmDialogOpen(true)}
              >
                確認離開
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                component={Link}
                to="/"
              >
                返回首頁
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>確認離開</DialogTitle>
        <DialogContent>
          <DialogContentText>
            確定要結束充電並離開嗎？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} color="primary">
            取消
          </Button>
          <Button onClick={handleConfirmLeave} color="primary" autoFocus>
            確認
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Status;
