import React from 'react';
import { Box, Typography, Grid as MuiGrid, Paper } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';

const VALID_PARKING_SPOTS = ['A001', 'A002', 'A003', 'A004', 'A005', 'B001', 'B002', 'B003', 'B004', 'B005'];

const QRCodeGenerator: React.FC = () => {
  const baseUrl = window.location.origin;

  return (
    <Box sx={{ p: 3, bgcolor: '#ffffff', minHeight: '100vh' }}>
      <Typography variant="h5" component="div" sx={{ color: 'black', mb: 2, textAlign: 'center' }}>
        停車場 QR Code 列表
      </Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        {VALID_PARKING_SPOTS.map((spotId) => (
          <Box key={spotId}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}
            >
              <Typography variant="h6">
                車位編號：{spotId}
              </Typography>
              <QRCodeSVG
                value={`${baseUrl}/spot/${spotId}`}
                size={200}
                level="H"
                includeMargin
              />
            </Paper>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default QRCodeGenerator;
