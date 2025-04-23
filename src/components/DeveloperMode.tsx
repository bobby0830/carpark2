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
  ? 'http://localhost:5000/api' 
  : 'https://carpark2-api.vercel.app'; // Vercel 部署的 API 不需要 /api 前綴

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
      const response = await axios.get(`${API_URL}/stations/1`); // 假設 ID 為 1
      if (response.data) {
        setChargingStation(response.data);
      }
    } catch (err) {
      console.error('獲取充電站資料失敗:', err);
      setError('無法連接到資料庫，請確認 API server 是否啟動');
    } finally {
      setLoading(false);
    }
  };

  // 更新充電站資料
  const updateStationData = async (updatedStation: ChargingStation) => {
    try {
      await axios.put(`${API_URL}/stations/1`, updatedStation);
    } catch (err) {
      console.error('更新充電站資料失敗:', err);
      setError('更新資料失敗，請確認 API server 是否啟動');
    }
  };

  // 初始載入資料
  useEffect(() => {
    fetchStationData();
  }, []);

  // 計時器更新充電狀態
  useEffect(() => {
    const timer = setInterval(() => {
      setChargingStation(prev => {
        if (!prev.currentRequest) return prev;

        // Update remaining time for current charging request
        const newRemainingTime = Math.max(0, (prev.currentRequest.remainingTime || prev.currentRequest.requestedChargingTime) - 1/60);

        if (newRemainingTime === 0) {
          // If charging is complete, move to next request
          const [nextInQueue, ...remainingQueue] = prev.queue;
          if (nextInQueue) {
            // Start charging the next request
            const updatedStation: ChargingStation = {
              ...prev,
              currentRequest: {
                ...nextInQueue,
                status: 'charging' as 'charging', // 明確指定為充電狀態
                remainingTime: nextInQueue.requestedChargingTime
              },
              queue: remainingQueue.map(req => ({
                ...req,
                totalWaitingTime: calculateWaitingTime(req, remainingQueue, nextInQueue)
              })),
              isAvailable: false
            };
            
            // 更新到資料庫
            updateStationData(updatedStation);
            return updatedStation;
          } else {
            // No more requests in queue
            const updatedStation: ChargingStation = {
              ...prev,
              currentRequest: undefined,
              isAvailable: true
            };
            
            // 更新到資料庫
            updateStationData(updatedStation);
            return updatedStation;
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
      
      // 透過 API 更新資料庫
      await axios.put(`${API_URL}/stations/1`, emptyStation);
      setChargingStation(emptyStation);
      alert('資料庫已成功初始化！所有裝置都會共用這個資料庫。');
      navigate('/');
    } catch (err) {
      console.error('初始化資料庫失敗:', err);
      setError('初始化資料庫失敗，請確認 API server 是否啟動');
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
          bgcolor: '#e8f5e9', 
          color: '#2e7d32',
          border: '1px solid #c8e6c9',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <Typography variant="body1">
          MongoDB Atlas 雲端資料庫狀態：
          <span style={{ fontWeight: 'bold' }}>
            {loading ? '連線中...' : '已連線 ✓'}
          </span>
        </Typography>
        <Typography variant="body2" sx={{ color: '#616161' }}>
          所有裝置都會共用同一份資料庫
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
            {chargingStation.currentRequest && (
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
            )}
            {chargingStation.queue.map((request, index) => (
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DeveloperMode;
