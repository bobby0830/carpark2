import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { ChargingStation, ChargingRequest } from '../types/types';
import { formatTime } from '../utils/timeFormat';
import axios from 'axios';

// API 伺服器基本 URL
// 判斷環境，如果是生產環境則使用雲端 API，否則使用本地開發環境
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : window.location.origin; // 使用目前網站的根路徑作為 API 端點

interface DeveloperModeProps {
  chargingStation: ChargingStation;
  setChargingStation: React.Dispatch<React.SetStateAction<ChargingStation>>;
}

const DeveloperMode: React.FC<DeveloperModeProps> = ({ chargingStation, setChargingStation }) => {
  const navigate = useNavigate();

  // Helper function to calculate waiting time
  const calculateWaitingTime = (request: ChargingRequest, queue: ChargingRequest[], currentRequest: ChargingRequest): number => {
    if (request.status !== 'waiting') return 0;
    if (request.parkingSpotId === currentRequest.parkingSpotId) return 0;

    let totalWaitingTime = currentRequest.remainingTime || currentRequest.requestedChargingTime;
    const requestIndex = queue.findIndex(r => r.parkingSpotId === request.parkingSpotId);
    const requestsAhead = queue.slice(0, requestIndex);

    requestsAhead.forEach(r => {
      if (r.status === 'waiting') {
        totalWaitingTime += r.requestedChargingTime;
      }
    });

    return totalWaitingTime;
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 從 API 獲取充電站資料
  const fetchStationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 打印更詳細的調試信息
      console.log('開發者模式正在嘗試獲取充電站資料...');
      console.log('當前環境:', process.env.NODE_ENV);
      console.log('當前主機名:', window.location.hostname);
      console.log('完整的 URL:', window.location.href);
      console.log('當前路徑:', window.location.pathname);
      
      // 直接嘗試使用完整的 URL
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000/stations/1' 
        : `${window.location.origin}/api/stations/1`;
      
      console.log(`嘗試連接到 API URL: ${apiUrl}`);
      
      // 添加随机参数避免缓存
      const timestamp = new Date().getTime();
      const urlWithTimestamp = `${apiUrl}?t=${timestamp}`;
      console.log(`带有随机参数的 URL: ${urlWithTimestamp}`);
      
      const response = await axios.get(urlWithTimestamp, {
        timeout: 10000, // 10 秒超時
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('收到回應:', response.status);
      console.log('回應資料:', JSON.stringify(response.data, null, 2));
      
      if (response.data) {
        console.log('設置充電站資料:', JSON.stringify(response.data, null, 2));
        setChargingStation(response.data);
        console.log('充電站資料已設置');
      } else {
        console.error('回應資料為空');
        setError('無法獲取充電站資料，回應資料為空');
      }
    } catch (err: any) {
      console.error('獲取充電站資料失敗:', err);
      
      if (err.response) {
        // 服務器回應了，但狀態碼不是 2xx
        console.error('回應狀態:', err.response.status);
        console.error('回應資料:', err.response.data);
        setError(`獲取失敗 (${err.response.status}): 請確認 API server 是否正確設定`);
      } else if (err.request) {
        // 請求已發送，但沒有收到回應
        console.error('無回應:', err.request);
        setError('無法連接到 API server，請確認它是否啟動');
      } else {
        // 設置請求時發生錯誤
        console.error('請求錯誤:', err.message);
        setError(`請求錯誤: ${err.message}`);
      }
      
      // 不在錯誤情況下設置空的充電站對象
      // 保留原來的狀態
    } finally {
      setLoading(false);
    }
  };

  // 更新充電站資料
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
      // 更新成功後清除任何先前的錯誤
      setError(null);
    } catch (err: any) {
      console.error('更新充電站資料失敗:', err);
      
      if (err.response) {
        // 服務器回應了，但狀態碼不是 2xx
        console.error('回應狀態:', err.response.status);
        console.error('回應資料:', err.response.data);
        setError(`更新失敗 (${err.response.status}): 請確認 API server 是否正確設定`);
      } else if (err.request) {
        // 請求已發送，但沒有收到回應
        console.error('無回應:', err.request);
        setError('更新失敗: 無法連接到 API server');
      } else {
        // 設置請求時發生錯誤
        console.error('請求錯誤:', err.message);
        setError(`更新失敗: ${err.message}`);
      }
    }
  };

  // 初始載入資料
  useEffect(() => {
    console.log('開發者模式組件已載入');
    console.log('API URL:', API_URL);
    console.log('嘗試載入充電站資料...');
    fetchStationData();

    // 添加一個備用的錯誤處理
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('全局錯誤:', message, source, lineno, colno, error);
      setError(`頁面發生錯誤: ${message}`);
      return false;
    };

    return () => {
      // 清除錯誤處理
      window.onerror = null;
    };
  }, []);

  // 在組件加載時從 API 獲取充電站資料
  useEffect(() => {
    console.log('DeveloperMode 組件加載，開始獲取充電站資料');
    fetchStationData();
  }, []);

  // 計時器更新充電狀態 - 只在非開發者模式下使用
  useEffect(() => {
    // 判斷當前是否在開發者模式頁面
    const isDeveloperMode = window.location.pathname.includes('/developer');
    
    // 如果是開發者模式，不啟動計時器
    if (isDeveloperMode) {
      console.log('在開發者模式中，不啟動充電狀態更新計時器');
      return;
    }
    
    console.log('在非開發者模式中，啟動充電狀態更新計時器');
    
    const timer = setInterval(() => {
      setChargingStation(prev => {
        // 確保 prev 存在且有正確的結構
        if (!prev || !prev.currentRequest) return prev;

        // Update remaining time for current charging request
        const newRemainingTime = Math.max(0, (prev.currentRequest.remainingTime || prev.currentRequest.requestedChargingTime) - 1/60);

        if (newRemainingTime === 0) {
          // If charging is complete, move to next request
          // 確保 queue 存在
          if (!prev.queue || !Array.isArray(prev.queue)) {
            console.error('佇列不存在或不是陣列:', prev.queue);
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

        // Update current request and waiting times
        const updatedStation: ChargingStation = {
          ...prev,
          currentRequest: {
            ...prev.currentRequest,
            remainingTime: newRemainingTime
          },
          queue: prev.queue.map(req => ({
            ...req,
            totalWaitingTime: calculateWaitingTime(req, prev.queue, {
              ...prev.currentRequest!,
              remainingTime: newRemainingTime
            })
          }))
        };
        
        // 每分鐘更新一次資料庫（避免過於頻繁的 API 請求）
        if (Math.floor(newRemainingTime * 60) % 60 === 0) {
          updateStationData(updatedStation);
        }
        
        return updatedStation;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleInitializeDB = async () => {
    try {
      setLoading(true);
      // Initialize with empty data
      const emptyStation: ChargingStation = {
        currentRequest: undefined,
        queue: [],
        isAvailable: true
      };
      
      // 直接嘗試使用完整的 URL
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000/stations/1' 
        : `${window.location.origin}/api/stations/1`;
      
      console.log(`嘗試初始化資料庫，API URL: ${apiUrl}`);
      console.log('發送資料:', JSON.stringify(emptyStation, null, 2));
      
      // 透過 API 更新資料庫
      const response = await axios.put(apiUrl, emptyStation);
      console.log('初始化成功:', response.status);
      console.log('回應資料:', JSON.stringify(response.data, null, 2));
      
      setChargingStation(emptyStation);
      alert('資料庫已成功初始化！所有裝置都會共用這個資料庫。');
      navigate('/');
    } catch (err: any) {
      console.error('初始化資料庫失敗:', err);
      
      if (err.response) {
        console.error('回應狀態:', err.response.status);
        console.error('回應資料:', err.response.data);
        setError(`初始化失敗 (${err.response.status}): 請確認 API server 是否正確設定`);
      } else if (err.request) {
        console.error('無回應:', err.request);
        setError('初始化失敗: 無法連接到 API server');
      } else {
        console.error('請求錯誤:', err.message);
        setError(`初始化失敗: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <Box sx={{ p: 3, bgcolor: '#ffffff', minHeight: '100vh' }}>
      <Typography variant="h4" sx={{ color: '#1976d2', mb: 3, fontWeight: 'bold' }}>
        開發者模式
      </Typography>
      
      {/* 顯示錯誤訊息 */}
      {error && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 3, 
            bgcolor: '#ffebee', 
            color: '#d32f2f',
            border: '1px solid #ffcdd2',
            borderRadius: 1 
          }}
        >
          <Typography variant="body1">{error}</Typography>
          <Button 
            size="small" 
            sx={{ mt: 1 }} 
            onClick={() => fetchStationData()}
          >
            重試連線
          </Button>
        </Paper>
      )}
      
      {/* 顯示 API 連線狀態 */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 3, 
          bgcolor: error ? '#ffebee' : '#e8f5e9', 
          color: error ? '#d32f2f' : '#2e7d32',
          border: `1px solid ${error ? '#ffcdd2' : '#c8e6c9'}`,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <Typography variant="body1">
          MongoDB Atlas 雲端資料庫狀態：
          <span style={{ fontWeight: 'bold' }}>
            {loading ? '連線中...' : error ? '連線失敗' : '已連線 ✓'}
          </span>
        </Typography>
        <Typography variant="body2" sx={{ color: '#616161' }}>
          {error ? '請確認 API server 是否啟動' : '所有裝置都會共用同一份資料庫'}
        </Typography>
      </Paper>
      
      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          color="warning" 
          onClick={handleInitializeDB}
          disabled={loading}
          sx={{ 
            fontWeight: 'bold',
            px: 3,
            py: 1
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : '初始化資料庫'}
        </Button>
        <Button
          variant="contained"
          onClick={() => navigate('/qrcodes')}
        >
          查看 QR Codes
        </Button>
      </Box>

      <TableContainer 
        component={Paper} 
        sx={{ 
          bgcolor: '#ffffff',
          boxShadow: 3,
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>車位編號</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>狀態</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>排隊位置</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>要求充電時間</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>等待時間</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>剩餘時間</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {chargingStation.currentRequest ? (
              <TableRow
                sx={{ 
                  bgcolor: '#e3f2fd',
                  '&:hover': { bgcolor: '#bbdefb' }
                }}
              >
                <TableCell sx={{ py: 2 }}>{chargingStation.currentRequest.parkingSpotId}</TableCell>
                <TableCell sx={{ py: 2, color: '#1976d2', fontWeight: 'bold' }}>充電中</TableCell>
                <TableCell sx={{ py: 2 }}>0</TableCell>
                <TableCell sx={{ py: 2 }}>{formatTime(chargingStation.currentRequest.requestedChargingTime)}</TableCell>
                <TableCell sx={{ py: 2 }}>-</TableCell>
                <TableCell sx={{ py: 2 }}>{formatTime(chargingStation.currentRequest.remainingTime || 0)}</TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, bgcolor: '#f5f5f5' }}>無正在充電的車輛</TableCell>
              </TableRow>
            )}
            {chargingStation.queue && chargingStation.queue.length > 0 ? (
              chargingStation.queue.map((request, index) => (
                <TableRow 
                  key={request.parkingSpotId}
                  sx={{ 
                    '&:nth-of-type(odd)': { bgcolor: '#fafafa' },
                    '&:hover': { bgcolor: '#f5f5f5' }
                  }}
                >
                  <TableCell sx={{ py: 2 }}>{request.parkingSpotId}</TableCell>
                  <TableCell sx={{ py: 2, color: '#ed6c02' }}>等待中</TableCell>
                  <TableCell sx={{ py: 2 }}>{index + 1}</TableCell>
                  <TableCell sx={{ py: 2 }}>{formatTime(request.requestedChargingTime)}</TableCell>
                  <TableCell sx={{ py: 2 }}>{formatTime(request.totalWaitingTime || 0)}</TableCell>
                  <TableCell sx={{ py: 2 }}>-</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3 }}>無等待中的充電請求</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DeveloperMode;
