document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const cryptoSelector = document.getElementById('crypto-selector');
  const timeframeTabs = document.querySelectorAll('.timeframe-tab');
  const currentPriceEl = document.getElementById('current-price');
  const priceChangeEl = document.getElementById('price-change');
  const chartCanvas = document.getElementById('price-chart');
  
  // State
  let currentChart;
  let currentCrypto = 'bitcoin';
  let currentTimeframe = '720'; // Default to 1 month
  
  // Initialize
  loadCryptoData(currentCrypto, currentTimeframe);
  
  // Event Listeners
  cryptoSelector.addEventListener('change', (e) => {
    currentCrypto = e.target.value;
    loadCryptoData(currentCrypto, currentTimeframe);
  });
  
  timeframeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      timeframeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTimeframe = tab.dataset.timeframe;
      loadCryptoData(currentCrypto, currentTimeframe);
    });
  });
  
  // Data Loading
  async function loadCryptoData(cryptoId, timeframe) {
    try {
      const data = await window.electronAPI.fetchCryptoData(cryptoId, timeframe);
      updatePriceDisplay(data.currentPrice, data.priceChange);
      renderChart(data.historicalData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }
  
  function updatePriceDisplay(price, change) {
    currentPriceEl.textContent = `$${price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })}`;
    
    const isPositive = change >= 0;
    priceChangeEl.textContent = `${isPositive ? '+' : ''}${change.toFixed(2)}%`;
    priceChangeEl.className = `price-change ${isPositive ? 'positive' : 'negative'}`;
  }
  
  function renderChart(data) {
    if (currentChart) {
      currentChart.destroy();
    }
    
    const ctx = chartCanvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
    
    currentChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => new Date(d[0])),
        datasets: [{
          label: 'Price',
          data: data.map(d => d[1]),
          borderColor: '#6366f1',
          backgroundColor: gradient,
          borderWidth: 2,
          tension: 0.1,
          fill: true,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (context) => {
                return `$${context.parsed.y.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: timeframeToUnit(currentTimeframe)
            },
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          },
          y: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }
  
  function timeframeToUnit(timeframe) {
    if (timeframe === '1') return 'minute';
    if (timeframe === '24') return 'hour';
    if (timeframe === '168') return 'day';
    if (timeframe === '720') return 'day';
    if (timeframe === '2160') return 'month';
    if (timeframe === '8760') return 'month';
    return 'year';
  }
});