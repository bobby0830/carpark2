export interface ChargingRequest {
  parkingSpotId: string;  // 車位編號
  status: 'waiting' | 'charging' | 'completed';
  requestedChargingTime: number;  // 用家要求的充電時間
  queuePosition: number;  // 排隊位置
  remainingTime?: number;  // 如果正在充電，剩餘時間
  totalWaitingTime?: number;  // 前面所有人的充電時間總和
  timestamp: Date;  // 請求時間
}

export interface ChargingStation {
  currentRequest?: ChargingRequest;  // 目前正在充電的請求
  queue: ChargingRequest[];  // 等待中的請求隊列
  isAvailable: boolean;  // 充電站是否可用
}
