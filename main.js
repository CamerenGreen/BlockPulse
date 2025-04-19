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

// API call handler
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
      historicalData: historicalResponse.data.prices,
      timeframe
    };

  } catch (error) {
    console.error(`API Error for ${cryptoId}:`, error);
    throw new Error(`Failed to fetch ${cryptoId} data: ${error.message}`);
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