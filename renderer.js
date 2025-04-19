// App State Management
const appState = {
  isInitialized: false,
  currentChart: null,
  currentCrypto: 'bitcoin',
  currentTimeframe: '7d',
  domElements: {}
};

// Initialize Application
async function initializeApplication() {
  try {
    initializeDOMElements();
    verifyCriticalElements();
    setupEventListeners();
    await loadCryptoData();
    
    appState.isInitialized = true;
    hideLoadingOverlay();
    showApplication();

  } catch (error) {
    console.error('Initialization failed:', error);
    handleCriticalError(error.message);
  }
}

// DOM Element Initialization
function initializeDOMElements() {
  appState.domElements = {
    loadingOverlay: document.getElementById('loading-overlay'),
    errorContainer: document.getElementById('error-container'),
    errorMessage: document.getElementById('error-message'),
    reloadButton: document.getElementById('reload-button'),
    appContainer: document.getElementById('app-container'),
    cryptoSelector: document.getElementById('crypto-selector'),
    cryptoIcon: document.getElementById('crypto-icon'),
    cryptoName: document.getElementById('crypto-name'),
    currentPrice: document.getElementById('current-price'),
    priceChange: document.getElementById('price-change'),
    chartCanvas: document.getElementById('price-chart'),
    timeframeTabs: document.querySelectorAll('.timeframe-tab'),
    chartContainer: document.querySelector('.chart-container')
  };
}

// Verify Required Elements Exist
function verifyCriticalElements() {
  const requiredElements = [
    'loadingOverlay', 'appContainer', 'chartCanvas',
    'cryptoSelector', 'errorContainer'
  ];

  const missingElements = requiredElements.filter(
    element => !appState.domElements[element]
  );

  if (missingElements.length > 0) {
    throw new Error(`Missing critical elements: ${missingElements.join(', ')}`);
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // Crypto Selector
  appState.domElements.cryptoSelector.addEventListener('change', async (event) => {
    appState.currentCrypto = event.target.value;
    await reloadData();
  });

  // Timeframe Tabs
  appState.domElements.timeframeTabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      appState.domElements.timeframeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      appState.currentTimeframe = tab.dataset.timeframe;
      await reloadData();
    });
  });

  // Reload Button
  appState.domElements.reloadButton.addEventListener('click', () => {
    window.location.reload();
  });

  // Window Resize
  window.addEventListener('resize', handleWindowResize);
}

// Data Loading and Rendering
async function loadCryptoData() {
  showLoadingOverlay();
  
  try {
    destroyChart();
    
    // Make sure electronAPI is available
    if (!window.electronAPI || !window.electronAPI.fetchCryptoData) {
      throw new Error('Electron API not available');
    }

    const cryptoData = await window.electronAPI.fetchCryptoData(
      appState.currentCrypto,
      appState.currentTimeframe
    );

    if (!cryptoData?.historicalData?.length) {
      throw new Error('No historical data received from API');
    }

    updateCryptoInfoUI(cryptoData);
    renderPriceChart(cryptoData);

  } catch (error) {
    console.error('Data loading failed:', error);
    throw new Error(`Failed to load ${appState.currentCrypto} data: ${error.message}`);
  } finally {
    hideLoadingOverlay();
  }
}

// Chart Rendering
function renderPriceChart(data) {
  try {
    destroyChart();
    const canvas = appState.domElements.chartCanvas;
    if (!canvas) throw new Error('Chart canvas element not found');

    // Reset canvas dimensions
    const container = canvas.parentElement;
    canvas.width = container ? container.clientWidth : 800;
    canvas.height = container ? container.clientHeight : 400;

    if (typeof Chart === 'undefined') {
      throw new Error('Chart.js library not loaded');
    }

    // Prepare data for chart
    const chartData = {
      datasets: [{
        label: `${data.name} Price`,
        data: data.historicalData.map(item => ({
          x: item.timestamp,
          y: item.price
        })),
        borderColor: '#8b5cf6',
        backgroundColor: createChartGradient(canvas),
        borderWidth: 2,
        tension: 0.1,
        fill: true,
        pointRadius: 0
      }]
    };

    appState.currentChart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `$${context.parsed.y.toFixed(2)}`
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: getTimeUnit(data.timeframe),
              tooltipFormat: 'MMM d, yyyy h:mm a'
            },
            grid: { display: false }
          },
          y: {
            ticks: {
              callback: (value) => '$' + value.toLocaleString()
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('Chart rendering error:', error);
    throw new Error('Failed to render chart. Please try again.');
  }
}

function getTimeUnit(timeframe) {
  const units = {
    '1h': 'hour',
    '24h': 'hour',
    '7d': 'day',
    '30d': 'day',
    '90d': 'day',
    'ytd': 'month',
    '1y': 'month',
    'all': 'year'
  };
  return units[timeframe] || 'day';
}

// Chart Configuration
function getChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => `$${context.parsed.y.toFixed(2)}`
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          tooltipFormat: 'MMM d, yyyy h:mm a',
          displayFormats: {
            hour: 'ha',
            day: 'MMM d',
            week: 'MMM d',
            month: 'MMM yyyy',
            year: 'yyyy'
          }
        },
        grid: { display: false, drawBorder: false },
        ticks: { color: '#94a3b8' }
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false },
        ticks: {
          color: '#94a3b8',
          callback: (value) => '$' + value.toLocaleString()
        }
      }
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false }
  };
}

// UI Management
function showLoadingOverlay() {
  if (appState.domElements.loadingOverlay) {
    appState.domElements.loadingOverlay.style.display = 'flex';
  }
  if (appState.domElements.appContainer) {
    appState.domElements.appContainer.style.display = 'none';
  }
}

function hideLoadingOverlay() {
  if (appState.domElements.loadingOverlay) {
    appState.domElements.loadingOverlay.style.display = 'none';
  }
}

function showApplication() {
  if (appState.domElements.appContainer) {
    appState.domElements.appContainer.style.display = 'block';
  }
}

function showError(message) {
  console.error(message);
  if (appState.domElements.errorContainer && appState.domElements.errorMessage) {
    appState.domElements.errorMessage.textContent = message;
    appState.domElements.errorContainer.style.display = 'flex';
  }
}

// Helper Functions
function destroyChart() {
  if (appState.currentChart) {
    appState.currentChart.destroy();
    appState.currentChart = null;
  }
}

function updateCryptoInfoUI(data) {
  if (!appState.domElements.cryptoIcon || !appState.domElements.cryptoName || 
      !appState.domElements.currentPrice || !appState.domElements.priceChange) {
    return;
  }

  // Update Crypto Icon
  if (data.image) {
    appState.domElements.cryptoIcon.src = data.image;
    appState.domElements.cryptoIcon.onerror = () => {
      appState.domElements.cryptoIcon.src = 'assets/default-crypto.png';
    };
  }

  // Update Other Info
  appState.domElements.cryptoName.textContent = data.symbol || '--';
  appState.domElements.currentPrice.textContent = 
    data.currentPrice ? `$${data.currentPrice.toLocaleString()}` : '$--.--';

  if (data.priceChange !== undefined) {
    const isPositive = data.priceChange >= 0;
    appState.domElements.priceChange.textContent = 
      `${isPositive ? '+' : ''}${data.priceChange.toFixed(2)}%`;
    appState.domElements.priceChange.className = 
      `price-change ${isPositive ? 'positive' : 'negative'}`;
  }
}

function handleWindowResize() {
  if (appState.currentChart) {
    const canvas = appState.domElements.chartCanvas;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    appState.currentChart.resize();
    appState.currentChart.update();
  }
}

async function reloadData() {
  try {
    await loadCryptoData();
  } catch (error) {
    showError(error.message);
  }
}

function handleCriticalError(message) {
  hideLoadingOverlay();
  showError(message);
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApplication);