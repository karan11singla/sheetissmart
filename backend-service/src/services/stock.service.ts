import axios from 'axios';

// Stock ticker service for fetching live stock prices
// Using Alpha Vantage API (free tier: 25 requests/day)
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

// Cache to avoid hitting API limits
const stockCache = new Map<string, { data: StockQuote; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute cache

export async function getStockPrice(symbol: string): Promise<number> {
  const normalizedSymbol = symbol.toUpperCase();

  // Check cache first
  const cached = stockCache.get(normalizedSymbol);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data.price;
  }

  try {
    // Try Alpha Vantage API
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: normalizedSymbol,
        apikey: ALPHA_VANTAGE_API_KEY,
      },
      timeout: 5000,
    });

    const quote = response.data['Global Quote'];
    if (!quote || !quote['05. price']) {
      throw new Error('Stock not found');
    }

    const price = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change'] || '0');
    const changePercent = parseFloat(quote['10. change percent']?.replace('%', '') || '0');

    const stockData: StockQuote = {
      symbol: normalizedSymbol,
      price,
      change,
      changePercent,
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    stockCache.set(normalizedSymbol, {
      data: stockData,
      timestamp: Date.now(),
    });

    return price;
  } catch (error) {
    console.error(`Error fetching stock price for ${normalizedSymbol}:`, error);

    // Fallback: return cached data if available (even if expired)
    if (cached) {
      return cached.data.price;
    }

    // If no cache and API fails, return error indicator
    throw new Error(`Unable to fetch stock price for ${normalizedSymbol}`);
  }
}

export async function getStockQuote(symbol: string): Promise<StockQuote> {
  const normalizedSymbol = symbol.toUpperCase();

  // Check cache first
  const cached = stockCache.get(normalizedSymbol);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: normalizedSymbol,
        apikey: ALPHA_VANTAGE_API_KEY,
      },
      timeout: 5000,
    });

    const quote = response.data['Global Quote'];
    if (!quote || !quote['05. price']) {
      throw new Error('Stock not found');
    }

    const stockData: StockQuote = {
      symbol: normalizedSymbol,
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change'] || '0'),
      changePercent: parseFloat(quote['10. change percent']?.replace('%', '') || '0'),
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    stockCache.set(normalizedSymbol, {
      data: stockData,
      timestamp: Date.now(),
    });

    return stockData;
  } catch (error) {
    console.error(`Error fetching stock quote for ${normalizedSymbol}:`, error);

    // Fallback: return cached data if available
    if (cached) {
      return cached.data;
    }

    throw new Error(`Unable to fetch stock quote for ${normalizedSymbol}`);
  }
}

// Clear expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [symbol, cached] of stockCache.entries()) {
    if (now - cached.timestamp > CACHE_DURATION * 10) {
      // Keep cache for 10x duration
      stockCache.delete(symbol);
    }
  }
}, CACHE_DURATION * 5); // Run every 5 minutes
