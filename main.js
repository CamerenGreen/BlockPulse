const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('renderer.html');
}

// API call handler for single crypto
ipcMain.handle('fetch-crypto-data', async (event, { cryptoId, timeframe }) => {
  try {
    const currentResponse = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${cryptoId}`,
      { timeout: 5000 }
    );
    
    if (!currentResponse.data?.market_data?.current_price?.usd) {
      throw new Error('Invalid API response structure');
    }

    const currentData = currentResponse.data;
    const timeParams = getTimeParameters(timeframe);
    
    const now = Math.floor(Date.now() / 1000);
    const fromTime = now - (timeParams.days * 24 * 60 * 60);
    
    const historicalResponse = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart/range`,
      {
        params: {
          vs_currency: 'usd',
          from: fromTime,
          to: now
        },
        timeout: 10000
      }
    );

    if (!historicalResponse.data?.prices?.length) {
      throw new Error('No historical price data received');
    }

    return {
      id: cryptoId,
      name: currentData.name,
      symbol: currentData.symbol.toUpperCase(),
      currentPrice: currentData.market_data.current_price.usd,
      priceChange: getPriceChange(currentData, timeParams.interval),
      image: currentData.image?.small || '',
      historicalData: historicalResponse.data.prices.map(item => ({
        timestamp: item[0],
        price: item[1]
      })),
      timeframe
    };

  } catch (error) {
    console.error(`API Error for ${cryptoId}:`, error);
    throw new Error(`Failed to fetch ${cryptoId} data: ${error.message}`);
  }
});

// API call handler for multiple cryptos
ipcMain.handle('fetch-multiple-cryptos', async (event, { cryptoIds }) => {
  try {
    if (!cryptoIds || !Array.isArray(cryptoIds) || cryptoIds.length === 0) {
      throw new Error('Invalid crypto IDs provided');
    }

    // Fetch current prices for multiple cryptocurrencies
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
          ids: cryptoIds.join(','),
          order: 'market_cap_desc',
          per_page: cryptoIds.length,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h,7d'
        },
        timeout: 10000
      }
    );

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid API response structure');
    }

    return response.data.map(coin => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      currentPrice: coin.current_price,
      priceChange: coin.price_change_percentage_24h || 0,
      priceChange7d: coin.price_change_percentage_7d_in_currency || 0,
      image: coin.image,
      marketCap: coin.market_cap,
      marketCapRank: coin.market_cap_rank,
      totalVolume: coin.total_volume
    }));

  } catch (error) {
    console.error('API Error for multiple cryptos:', error);
    throw new Error(`Failed to fetch multiple crypto data: ${error.message}`);
  }
});

// Helper functions (same as before)
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

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});