import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress } from '@mui/material';
import { Link } from 'react-router-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { ChargingRequest, ChargingStation } from '../types/types';
import { formatTime } from '../utils/timeFormat';
import axios from 'axios';

// API 伺服器基本 URL
// 判斷環境，如果是生產環境則使用雲端 API，否則使用本地開發環境
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : window.location.origin; // 使用目前網站的根路徑作為 API 端點

interface StatusProps {
  chargingStation: ChargingStation;
  setChargingStation: React.Dispatch<React.SetStateAction<ChargingStation>>;
}

const Status: React.FC<StatusProps> = ({ chargingStation, setChargingStation }) => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const [currentRequest, setCurrentRequest] = useState<ChargingRequest | undefined>(undefined);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // 更新充電站資料到 MongoDB
  const updateStationData = async (updatedStation: ChargingStation) => {
    try {
      // 直接嘗試使用完整的 URL
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000/stations/1' 
        : `${window.location.origin}/api/stations/1`;
      
      console.log(`嘗試更新充電站資料到 ${apiUrl}`);
      console.log('發送資料:', JSON.stringify(updatedStation, null, 2));
      
      const response = await axios.put(apiUrl, updatedStation, {
        timeout: 10000, // 10 秒超時
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('更新成功:', response.status);
      console.log('回應資料:', JSON.stringify(response.data, null, 2));
      setApiError(null);
      return true;
    } catch (err: any) {
      console.error('更新充電站資料失敗:', err);
      
      if (err.response) {
        console.error('回應狀態:', err.response.status);
        console.error('回應資料:', err.response.data);
        setApiError(`更新失敗 (${err.response.status}): 請確認 API server 是否正確設定`);
      } else if (err.request) {
        console.error('無回應:', err.request);
        setApiError('更新失敗: 無法連接到 API server');
      } else {
        console.error('請求錯誤:', err.message);
        setApiError(`更新失敗: ${err.message}`);
      }
      return false;
    }
  };

  // Global countdown effect for charging station
  useEffect(() => {
    console.log('全局計時器初始化');
    
    const timer = setInterval(() => {
      setChargingStation((prev: ChargingStation) => {
        // 確保 prev 存在且有正確的結構
        if (!prev) {
          console.error('充電站數據不存在');
          return prev;
        }
        
        if (!prev.currentRequest || prev.currentRequest.status !== 'charging') {
          return prev;
        }

        // Update remaining time for current charging request
        const currentTime = prev.currentRequest.remainingTime ?? prev.currentRequest.requestedChargingTime;
        const newRemainingTime = Math.max(0, currentTime - (1/60));

        if (newRemainingTime === 0) {
          // 確保 queue 存在且是陣列
          if (!Array.isArray(prev.queue)) {
            console.error('佇列不是陣列');
            return {
              ...prev,
              currentRequest: undefined,
              queue: [],
              isAvailable: true
            };
          }
          
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
        // 確保 queue 存在且是陣列
        if (!Array.isArray(prev.queue)) {
          return {
            ...prev,
            currentRequest: {
              ...prev.currentRequest,
              remainingTime: newRemainingTime
            },
            queue: [],
            isAvailable: false
          };
        }
        
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
                .reduce((acc, r) => acc + (r.requestedChargingTime || 0), 0);
            return { ...req, totalWaitingTime };
          })
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setChargingStation]);

  // Sync with database every second
  useEffect(() => {
    if (!stationId) {
      console.log('無車位編號');
      return;
    }

    console.log('同步資料庫狀態', { stationId, chargingStation });

    const syncWithDatabase = () => {
      // 確保 chargingStation 和 queue 存在
      if (!chargingStation) {
        console.error('充電站數據不存在');
        return;
      }

      // Find the request in the charging station
      const dbRequest = chargingStation.currentRequest?.parkingSpotId === stationId
        ? chargingStation.currentRequest
        : (Array.isArray(chargingStation.queue) 
           ? chargingStation.queue.find(r => r.parkingSpotId === stationId)
           : undefined);

      console.log('找到請求', { dbRequest });

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

  // Helper function to calculate waiting time (in minutes)
  const calculateWaitingTime = (request: ChargingRequest, queue: ChargingRequest[], currentRequest: ChargingRequest): number => {
    if (request.status !== 'waiting') return 0;
    if (!currentRequest) return 0;
    if (request.parkingSpotId === currentRequest.parkingSpotId) return 0;

    console.log('計算等待時間，請求:', request.parkingSpotId);
    console.log('當前請求:', currentRequest.parkingSpotId);
    console.log('佇列長度:', queue.length);

    // 使用當前請求的剩餘時間或請求時間（單位：分鐘）
    let totalWaitingTime = currentRequest.remainingTime || currentRequest.requestedChargingTime;
    console.log('當前請求時間 (分鐘):', totalWaitingTime);

    // 找出請求在佇列中的位置
    const requestIndex = queue.findIndex(r => r.parkingSpotId === request.parkingSpotId);
    console.log('請求在佇列中的位置:', requestIndex);

    // 計算前面所有請求的時間
    const requestsAhead = queue.slice(0, requestIndex);
    console.log('前面的請求數量:', requestsAhead.length);

    let queueTime = 0;
    requestsAhead.forEach(r => {
      if (r.status === 'waiting') {
        queueTime += r.requestedChargingTime;
        console.log(`前面的請求 ${r.parkingSpotId} 時間:`, r.requestedChargingTime);
      }
    });
    console.log('佇列中前面請求的總時間 (分鐘):', queueTime);

    totalWaitingTime += queueTime;
    console.log('總等待時間 (分鐘):', totalWaitingTime);

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

  const handleConfirmLeave = async () => {
    setApiLoading(true);
    setApiError(null);
    
    // 創建更新後的充電站狀態
    const updatedStation: ChargingStation = {
      ...chargingStation,
      currentRequest: undefined,
      isAvailable: true
    };
    
    // 先更新本地狀態
    setChargingStation(updatedStation);
    
    // 然後將數據保存到 MongoDB
    const success = await updateStationData(updatedStation);
    
    setApiLoading(false);
    setConfirmDialogOpen(false);
    
    // 無論 API 請求成功與否，都導航回首頁
    navigate('/');
    
    if (!success) {
      console.error('離開充電站時更新資料庫失敗，但本地狀態已更新');
    }
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
