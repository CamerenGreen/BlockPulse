const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  fetchCryptoData: (cryptoId, timeframe) => {
    return ipcRenderer.invoke('fetch-crypto-data', { cryptoId, timeframe });
  }
});
const axios = require('axios');

contextBridge.exposeInMainWorld('electronAPI', {
  fetchCryptoData: async (cryptoId, timeframe) => {
    try {
      // Validate input
      if (!cryptoId || !timeframe) {
        throw new Error('Missing required parameters');
      }

      // Fetch current price data
      const currentResponse = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${cryptoId}`,
        { 
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!currentResponse.data?.market_data?.current_price?.usd) {
        throw new Error('Invalid API response structure');
      }

      const currentData = currentResponse.data;
      const timeParams = getTimeParameters(timeframe);
      
      // Calculate time range (convert to seconds)
      const now = Math.floor(Date.now() / 1000);
      const fromTime = now - (timeParams.days * 24 * 60 * 60);
      
      // Fetch historical data
      const historicalResponse = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart/range`,
        {
          params: {
            vs_currency: 'usd',
            from: fromTime,
            to: now
          },
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!historicalResponse.data?.prices?.length) {
        throw new Error('No historical price data received');
      }

      // Format data for chart
      const historicalData = historicalResponse.data.prices.map(item => ({
        timestamp: item[0],
        price: item[1]
      }));

      return {
        id: cryptoId,
        name: currentData.name,
        symbol: currentData.symbol.toUpperCase(),
        currentPrice: currentData.market_data.current_price.usd,
        priceChange: getPriceChange(currentData, timeParams.interval),
        image: currentData.image?.small || '',
        historicalData,
        timeframe
      };

    } catch (error) {
      console.error(`API Error for ${cryptoId}:`, error);
      throw new Error(`Failed to fetch ${cryptoId} data: ${error.message}`);
    }
  }
});

function getTimeParameters(timeframe) {
  const params = {
    '1h': { days: 1, interval: 'hourly' },
    '24h': { days: 1, interval: 'hourly' },
    '7d': { days: 7, interval: 'daily' },
    '30d': { days: 30, interval: 'daily' },
    '90d': { days: 90, interval: 'daily' },
    'ytd': { 
      days: Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)),
      interval: 'daily' 
    },
    '1y': { days: 365, interval: 'daily' },
    'all': { days: 365 * 5, interval: 'daily' }
  };

  return params[timeframe] || params['24h'];
}

function getPriceChange(data, interval) {
  try {
    const changeKey = `price_change_percentage_${interval}_in_currency`;
    return data.market_data[changeKey]?.usd || 
           data.market_data.price_change_percentage_24h_in_currency?.usd || 0;
  } catch {
    return 0;
  }
}