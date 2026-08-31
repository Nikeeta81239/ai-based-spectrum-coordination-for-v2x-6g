/**
 * Utility formatters for metrics, channel labels, and numbers.
 */

export const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined || isNaN(num)) return '0.00';
  return Number(num).toFixed(decimals);
};

export const formatPercent = (num, decimals = 1) => {
  if (num === null || num === undefined || isNaN(num)) return '0.0%';
  return `${(Number(num) * 100).toFixed(decimals)}%`;
};

export const getChannelColor = (channelId) => {
  const colors = [
    '#3b82f6', // Ch 1 - Blue
    '#10b981', // Ch 2 - Green
    '#f59e0b', // Ch 3 - Amber
    '#ef4444', // Ch 4 - Red
    '#8b5cf6', // Ch 5 - Purple
    '#06b6d4', // Ch 6 - Cyan
  ];
  return colors[channelId % colors.length];
};

export const getAppTypeBadgeClass = (appType) => {
  switch (appType?.toLowerCase()) {
    case 'safety':
    case 'emergency':
      return 'bg-red-500/20 text-red-400 border-red-500/40';
    case 'traffic_info':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    case 'normal':
    default:
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
  }
};
