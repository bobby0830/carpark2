export const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.floor(minutes % 60);
  
  if (hours > 0) {
    return `${hours}小時${remainingMinutes > 0 ? ` ${remainingMinutes}分鐘` : ''}`;
  }
  return `${remainingMinutes}分鐘`;
};
