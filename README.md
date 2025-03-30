# Crypto Price Tracker

A responsive web application built with Next.js that displays real-time cryptocurrency prices. Includes interactive features like search filtering and manual refresh.

## Features

- 📊 **Live Price Tracking**: Fetches real-time data for 5 major cryptocurrencies
- 🔍 **Search Functionality**: Filter coins by name
- 🔄 **Manual Refresh**: Get the latest prices on demand
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 📚 **Documentation**: Developer docs powered by Docusaurus

## Supported Cryptocurrencies

1. Bitcoin (BTC)
2. Ethereum (ETH)
3. Ripple (XRP)
4. Litecoin (LTC)
5. Cardano (ADA)

## Technologies Used

- **Frontend**: Next.js, React
- **State Management**: React Query
- **API**: CoinGecko API
- **Styling**: CSS Modules
- **Documentation**: Docusaurus

## Project Structure
crypto-price-tracker/
├── web-app/               # Next.js application
│   ├── components/        # React components
│   │   ├── CryptoCard.js  # Individual coin display
│   │   ├── SearchBar.js   # Search functionality
│   │   └── RefreshButton.js # Manual refresh control
│   ├── pages/             # Application routes
│   │   └── index.js       # Main dashboard page
│   ├── public/            # Static assets
│   ├── styles/            # CSS modules
│   ├── utils/             # Helper functions
│   │   └── fetchCryptoPrices.js # API handler
│   └── package.json       # Frontend dependencies
├── docs/                  # Documentation site
│   ├── docs/              # Markdown files
│   └── package.json       # Docs dependencies
├── .gitignore             # Git exclusion rules
└── README.md              # Project documentation
