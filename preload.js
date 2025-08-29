const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  fetchCryptoData: (cryptoId, timeframe) => {
    return ipcRenderer.invoke('fetch-crypto-data', { cryptoId, timeframe });
  },
  fetchMultipleCryptos: (cryptoIds) => {
    return ipcRenderer.invoke('fetch-multiple-cryptos', { cryptoIds });
  }
});

