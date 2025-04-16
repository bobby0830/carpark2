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
} from '@mui/material';
import { ChargingStation, ChargingRequest } from '../types/types';
import { formatTime } from '../utils/timeFormat';

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
            return {
              ...prev,
              currentRequest: {
                ...nextInQueue,
                status: 'charging',
                remainingTime: nextInQueue.requestedChargingTime
              },
              queue: remainingQueue.map(req => ({
                ...req,
                totalWaitingTime: calculateWaitingTime(req, remainingQueue, nextInQueue)
              })),
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
        return {
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
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleInitializeDB = () => {
    // Initialize with empty data
    const emptyStation: ChargingStation = {
      currentRequest: undefined,
      queue: [],
      isAvailable: true
    };
    setChargingStation(emptyStation);
    alert('資料庫已成功初始化！');
    navigate('/');
  };



  return (
    <Box sx={{ p: 3, bgcolor: '#ffffff', minHeight: '100vh' }}>
      <Typography variant="h4" sx={{ color: '#1976d2', mb: 3, fontWeight: 'bold' }}>
        開發者模式
      </Typography>
      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          color="warning" 
          onClick={handleInitializeDB}
          sx={{ 
            fontWeight: 'bold',
            px: 3,
            py: 1
          }}
        >
          初始化資料庫
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
