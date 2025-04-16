export const formatTime = (minutes: number): string => {
  const mins = Math.floor(minutes);
  const secs = Math.floor((minutes % 1) * 60);
  return `${mins}分鐘 ${secs}秒`;
};
