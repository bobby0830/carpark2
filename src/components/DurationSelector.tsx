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
  DialogActions,
  CircularProgress
} from '@mui/material';
import { ChargingStation, ChargingRequest } from '../types/types';
import { formatTime } from '../utils/timeUtils';
import axios from 'axios';

// API 伺服器基本 URL
// 判斷環境，如果是生產環境則使用雲端 API，否則使用本地開發環境
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : window.location.origin; // 使用目前網站的根路徑作為 API 端點

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
    console.log('確認充電時間', { duration, chargingStation });
    
    const durationNum = Number(duration);
    if (isNaN(durationNum) || durationNum <= 0 || durationNum > 120) {
      setError('充電時間必須在 1 至 120 分鐘之間');
      return;
    }

    // 確保充電站數據存在且有正確的結構
    if (!chargingStation) {
      console.error('充電站數據不存在');
      setError('無法讀取充電站狀態，請重試');
      return;
    }

    // Calculate queue information
    const isQueuing = !!chargingStation.currentRequest;
    const queuePosition = Array.isArray(chargingStation.queue) ? chargingStation.queue.length + (isQueuing ? 1 : 0) : (isQueuing ? 1 : 0);
    
    let estimatedWaitTime = 0;
    if (isQueuing) {
      // 先加上當前請求的剩餘時間
      estimatedWaitTime += (chargingStation.currentRequest?.remainingTime ?? chargingStation.currentRequest?.requestedChargingTime ?? 0);
      
      // 再加上佇列中所有請求的時間
      if (Array.isArray(chargingStation.queue) && chargingStation.queue.length > 0) {
        estimatedWaitTime += chargingStation.queue.reduce((acc, curr) => acc + (curr.requestedChargingTime || 0), 0);
      }
    }

    console.log('計算佇列信息', { isQueuing, queuePosition, estimatedWaitTime });
    
    setQueueInfo({
      isQueuing,
      queuePosition,
      estimatedWaitTime
    });
    setConfirmDialogOpen(true);
  };

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

  const handleConfirm = async () => {
    setApiLoading(true);
    setApiError(null);
    
    console.log('===== 開始處理充電請求確認 =====');
    console.log('當前時間:', new Date().toISOString());
    
    if (!stationId) {
      console.error('車位編號不存在');
      setApiError('車位編號不存在');
      setApiLoading(false);
      return;
    }
    console.log('車位編號:', stationId);

    const durationNum = Number(duration);
    if (isNaN(durationNum) || durationNum <= 0 || durationNum > 120) {
      console.error('充電時間無效', duration);
      setApiError('充電時間必須在 1 至 120 分鐘之間');
      setApiLoading(false);
      return;
    }
    console.log('充電時間 (分鐘):', durationNum);

    // 創建新的充電請求
    const newRequest: ChargingRequest = {
      parkingSpotId: stationId,
      status: 'waiting',
      requestedChargingTime: durationNum,
      queuePosition: 0,
      timestamp: new Date(),
      totalWaitingTime: 0
    };

    console.log('創建新的充電請求:', JSON.stringify(newRequest, null, 2));

    // 確保充電站數據存在且有正確的結構
    if (!chargingStation) {
      console.error('充電站數據不存在');
      setApiError('無法讀取充電站狀態，請重試');
      setApiLoading(false);
      return;
    }
    console.log('當前充電站狀態:', JSON.stringify(chargingStation, null, 2));

    // 確保 queue 存在且是陣列
    const safeQueue = Array.isArray(chargingStation.queue) ? chargingStation.queue : [];
    console.log('當前佇列長度:', safeQueue.length);

    // 更新充電站狀態
    let updatedStation: ChargingStation;

    // 如果充電站可用且沒有當前請求，則直接開始充電
    if (chargingStation.isAvailable && !chargingStation.currentRequest) {
      console.log('充電站可用，直接開始充電');
      updatedStation = {
        ...chargingStation,
        currentRequest: {
          ...newRequest,
          status: 'charging',
          remainingTime: durationNum
        },
        queue: safeQueue,
        isAvailable: false
      };
      console.log('更新後的充電站狀態 (直接充電):', JSON.stringify(updatedStation, null, 2));
    } else {
      // 否則加入佇列
      console.log('充電站忙碌，加入佇列');
      newRequest.queuePosition = safeQueue.length + 1;
      
      // 計算總等待時間
      if (chargingStation.currentRequest) {
        newRequest.totalWaitingTime = (chargingStation.currentRequest.remainingTime || chargingStation.currentRequest.requestedChargingTime);
        console.log('當前請求剩餘時間:', newRequest.totalWaitingTime);
        
        // 加上佇列中所有請求的時間
        if (safeQueue.length > 0) {
          let queueTime = 0;
          safeQueue.forEach(req => {
            if (req.status === 'waiting') {
              queueTime += req.requestedChargingTime;
            }
          });
          newRequest.totalWaitingTime += queueTime;
          console.log('佇列中的請求總時間:', queueTime);
        }
        console.log('計算後的總等待時間:', newRequest.totalWaitingTime);
      }
      
      updatedStation = {
        ...chargingStation,
        currentRequest: chargingStation.currentRequest, // 確保保留當前請求
        queue: [...safeQueue, newRequest],
        isAvailable: false
      };
      console.log('更新後的充電站狀態 (加入佇列):', JSON.stringify(updatedStation, null, 2));
    }

    // 先更新本地狀態
    console.log('更新本地狀態...');
    setChargingStation(updatedStation);
    console.log('本地狀態已更新');

    // 然後將數據保存到 MongoDB
    console.log('開始保存到 MongoDB...');
    const success = await updateStationData(updatedStation);
    console.log('MongoDB 保存結果:', success ? '成功' : '失敗');
    
    // 保存後再次檢查數據庫中的數據
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000/stations/1' 
        : `${window.location.origin}/api/stations/1`;
      
      console.log(`保存後檢查數據庫，從 ${apiUrl} 獲取數據...`);
      const checkResponse = await axios.get(apiUrl, {
        timeout: 10000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('數據庫中的數據:', JSON.stringify(checkResponse.data, null, 2));
    } catch (err) {
      console.error('檢查數據庫失敗:', err);
    }
    
    setApiLoading(false);
    console.log('API 載入狀態已重置');
    
    if (success) {
      setConfirmDialogOpen(false);
      console.log('導航到狀態頁面', `/status/${stationId}`);
      navigate(`/status/${stationId}`);
    } else {
      // 即使 API 請求失敗，也導航到狀態頁面，因為本地狀態已經更新
      setConfirmDialogOpen(false);
      console.log('導航到狀態頁面（即使 API 失敗）', `/status/${stationId}`);
      navigate(`/status/${stationId}`);
    }
    
    console.log('===== 充電請求處理完成 =====');
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
