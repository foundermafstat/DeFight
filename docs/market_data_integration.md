# Market Data Integration (Binance)

This project uses a **Server-Side Proxy** architecture to fetch real-time market data from **Binance** via the `MarketDataService`.

## Architecture

1. **Backend (`gamemaster`):**
    * `MarketDataService` fetches market snapshots from Binance API (`api.binance.com`).
    * Exposes `GET /market/price/:symbol` endpoint.
    * Handles errors and provides fallback mechanisms.

2. **Frontend (`web`):**
    * `forge/page.tsx` calls the local backend endpoint (`/market/price/:symbol`).
    * Features a **Dropdown Selector** to choose between pairs (BCH, BTC, ETH, SOL).
    * Updates price every 10 seconds.

## API Endpoint (Internal)

* **URL:** `GET /market/price/{symbol}`
* **Example:** `GET /market/price/BCHUSDT`
* **Response:**

  ```json
  {
    "symbol": "BCHUSDT",
    "price": 620.50,
    "priceChangePercent": 2.5,
    "volume": 500000,
    "quoteVolume": 300000000,
    "timestamp": 1740000000000
  }
  ```

## Implementation Details

### Backend

- **Service:** `packages/gamemaster/src/services/MarketDataService.ts`
* **Route:** `packages/gamemaster/src/index.ts`

### Frontend

- **Page:** `apps/web/src/app/forge/page.tsx`

## Configuration

* **Backend:** `BINANCE_BASE_URL` (optional, defaults to `https://api.binance.com`)
* **Frontend:** `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`)
