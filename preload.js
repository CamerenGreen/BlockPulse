const { contextBridge } = require('electron');
const axios = require('axios');

contextBridge.exposeInMainWorld('electronAPI', {
  fetchCryptoData: async (cryptoId, timeframe) => {
    try {
      // Fetch current price
      const currentResponse = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${cryptoId}`
      );
      const currentData = currentResponse.data;
      
      // Fetch historical data based on timeframe
      let days, interval;
      if (timeframe === '1') {
        // Live data (last 24 hours)
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart`,
          { params: { vs_currency: 'usd', days: 1 } }
        );
        return {
          currentPrice: currentData.market_data.current_price.usd,
          priceChange: currentData.market_data.price_change_percentage_24h,
          historicalData: response.data.prices
        };
      } else if (timeframe === 'ytd') {
        // Year to date
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), 0, 1);
        const diffTime = Math.abs(today - firstDay);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        days = diffDays;
        interval = 'daily';
      } else if (timeframe === 'max') {
        // All time
        days = 'max';
        interval = 'daily';
      } else {
        // Convert hours to days
        days = Math.ceil(parseInt(timeframe) / 24);
        interval = timeframe <= 720 ? 'hourly' : 'daily';
      }
      
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart`,
        { params: { vs_currency: 'usd', days } }
      );
      
      return {
        currentPrice: currentData.market_data.current_price.usd,
        priceChange: currentData.market_data[`price_change_percentage_${interval}_in_currency`].usd,
        historicalData: response.data.prices
      };
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
});