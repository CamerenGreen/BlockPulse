// App State Management
const appState = {
  isInitialized: false,
  currentChart: null,
  currentCrypto: 'bitcoin',
  currentTimeframe: '7d',
  currentView: 'single', // 'single' or 'dashboard'
  dashboardCryptos: ['bitcoin', 'ethereum', 'cardano', 'solana', 'ripple', 'litecoin', 'chainlink', 'polkadot'],
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
    chartContainer: document.querySelector('.chart-container'),
    singleViewBtn: document.getElementById('single-view-btn'),
    dashboardViewBtn: document.getElementById('dashboard-view-btn'),
    singleView: document.getElementById('single-view'),
    dashboardView: document.getElementById('dashboard-view'),
    cryptoGrid: document.getElementById('crypto-grid'),
    refreshDashboard: document.getElementById('refresh-dashboard')
  };
}

// Verify Required Elements Exist
function verifyCriticalElements() {
  const requiredElements = [
    'loadingOverlay', 'appContainer', 'chartCanvas',
    'cryptoSelector', 'errorContainer', 'singleViewBtn', 'dashboardViewBtn'
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

  // View Toggle Buttons
  appState.domElements.singleViewBtn.addEventListener('click', () => {
    switchView('single');
  });

  appState.domElements.dashboardViewBtn.addEventListener('click', () => {
    switchView('dashboard');
  });

  // Dashboard Refresh
  appState.domElements.refreshDashboard.addEventListener('click', async () => {
    if (appState.currentView === 'dashboard') {
      await loadDashboardData();
    }
  });
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

function createChartGradient(canvas) {
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
  gradient.addColorStop(1, 'rgba(139, 92, 246, 0.05)');
  return gradient;
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

// View Management Functions
function switchView(view) {
  if (view === appState.currentView) return;

  appState.currentView = view;

  // Update button states
  if (view === 'single') {
    appState.domElements.singleViewBtn.classList.add('active');
    appState.domElements.dashboardViewBtn.classList.remove('active');
    appState.domElements.singleView.style.display = 'block';
    appState.domElements.dashboardView.style.display = 'none';
  } else {
    appState.domElements.singleViewBtn.classList.remove('active');
    appState.domElements.dashboardViewBtn.classList.add('active');
    appState.domElements.singleView.style.display = 'none';
    appState.domElements.dashboardView.style.display = 'block';
    loadDashboardData();
  }
}

// Dashboard Functions
async function loadDashboardData() {
  showLoadingOverlay();
  
  try {
    if (!window.electronAPI || !window.electronAPI.fetchMultipleCryptos) {
      throw new Error('Multiple crypto API not available');
    }

    const cryptosData = await window.electronAPI.fetchMultipleCryptos(appState.dashboardCryptos);
    
    if (!cryptosData || !Array.isArray(cryptosData)) {
      throw new Error('No dashboard data received from API');
    }

    renderDashboard(cryptosData);

  } catch (error) {
    console.error('Dashboard loading failed:', error);
    showError(`Failed to load dashboard: ${error.message}`);
  } finally {
    hideLoadingOverlay();
  }
}

function renderDashboard(cryptosData) {
  const grid = appState.domElements.cryptoGrid;
  grid.innerHTML = '';

  cryptosData.forEach(crypto => {
    const card = createCryptoCard(crypto);
    grid.appendChild(card);
  });
}

function createCryptoCard(crypto) {
  const card = document.createElement('div');
  card.className = 'crypto-card';
  card.onclick = () => {
    // Switch to single view with this crypto
    appState.currentCrypto = crypto.id;
    switchView('single');
    reloadData();
    // Update the selector
    appState.domElements.cryptoSelector.value = crypto.id;
  };

  const isPositive = crypto.priceChange >= 0;
  const priceChangeClass = isPositive ? 'positive' : 'negative';

  card.innerHTML = `
    <div class="crypto-card-header">
      <img class="crypto-card-icon" src="${crypto.image}" alt="${crypto.name}" onerror="this.src='assets/default-crypto.png'">
      <div class="crypto-card-info">
        <div class="crypto-card-name">${crypto.name}</div>
        <div class="crypto-card-symbol">${crypto.symbol}</div>
      </div>
    </div>
    <div class="crypto-card-price">$${crypto.currentPrice.toLocaleString()}</div>
    <div class="crypto-card-change ${priceChangeClass}">
      ${isPositive ? '+' : ''}${crypto.priceChange.toFixed(2)}%
    </div>
    <div class="crypto-card-stats">
      <div class="crypto-card-stat">
        <div class="crypto-card-stat-label">Market Cap</div>
        <div class="crypto-card-stat-value">$${formatLargeNumber(crypto.marketCap)}</div>
      </div>
      <div class="crypto-card-stat">
        <div class="crypto-card-stat-label">Volume</div>
        <div class="crypto-card-stat-value">$${formatLargeNumber(crypto.totalVolume)}</div>
      </div>
    </div>
  `;

  return card;
}

function formatLargeNumber(num) {
  if (num >= 1e12) {
    return (num / 1e12).toFixed(1) + 'T';
  } else if (num >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B';
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  } else {
    return num.toLocaleString();
  }
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApplication);