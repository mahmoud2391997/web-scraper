"use client";

import { useState, useEffect } from "react";

interface VintedItem {
  title: string;
  price: string;
  image: string;
  url: string;
}

export default function VintedInterface() {
  const [searchTerm, setSearchTerm] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<VintedItem[]>([]);
  const [emptyState, setEmptyState] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);

  const quickSearchTags = [
    "Dior bag",
    "Louis Vuitton bag", 
    "Prada bag",
    "Gucci bag",
    "Christian Dior bag",
    "Michael Kors bag",
    "Coach bag",
  ];

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      performSearch();
    }
  };

  const quickSearch = (term: string) => {
    setSearchTerm(term);
    setTimeout(() => performSearch(), 100);
  };

  const performSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError("");
    setItems([]);
    setEmptyState(false);
    setUsingMockData(false); // Reset mock data flag

    try {
      let url = `/api/vinted?search_term=${encodeURIComponent(searchTerm)}`;
      
      if (minPrice) url += `&min_price=${encodeURIComponent(minPrice)}`;
      if (maxPrice) url += `&max_price=${encodeURIComponent(maxPrice)}`;

      console.log('Fetching from URL:', url);
      
      // Add timeout and headers for better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for web scraping
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(`Server error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Received data:', data);
      setItems(data || []);
      setUsingMockData(false);

      if (data.length === 0) {
        setEmptyState(true);
      }
    } catch (err: any) {
      console.error('Full error:', err);
      
      // If it's a network error or timeout, show mock data
      if (err.name === 'AbortError') {
        console.log('Request timed out, showing mock data for demonstration');
        const mockData = getMockData(searchTerm);
        setItems(mockData);
        setUsingMockData(true);
        setError('');
        return;
      }
      
      // For other errors, show the error message instead of mock data
      setError(`Error: ${err.message}`);
      setEmptyState(true);
    } finally {
      setLoading(false);
    }
  };

  // Mock data function for demonstration when API is down
  const getMockData = (term: string): VintedItem[] => {
    return [
      {
        title: `Luxury ${term} - Premium Quality`,
        price: "150€",
        image: "https://via.placeholder.com/310x430?text=Luxury+Bag",
        url: "https://www.vinted.com/item/mock1"
      },
      {
        title: `Designer ${term} - Like New`,
        price: "180€",
        image: "https://via.placeholder.com/310x430?text=Designer+Bag",
        url: "https://www.vinted.com/item/mock2"
      },
      {
        title: `Vintage ${term} - Excellent Condition`,
        price: "120€",
        image: "https://via.placeholder.com/310x430?text=Vintage+Bag",
        url: "https://www.vinted.com/item/mock3"
      },
      {
        title: `${term} - Limited Edition`,
        price: "220€",
        image: "https://via.placeholder.com/310x430?text=Limited+Edition",
        url: "https://www.vinted.com/item/mock4"
      }
    ];
  };

  return (
    <div className="vinted-interface">
      <div className="vinted-header">
        <div className="search-container">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search for items..."
            className="search-input"
          />
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min $"
            min="0"
            className="price-input"
          />
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max $"
            min="0"
            className="price-input"
          />
          <button
            onClick={performSearch}
            disabled={loading}
            className="search-button"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
        <div className="quick-search">
          {quickSearchTags.map((tag) => (
            <span
              key={tag}
              onClick={() => quickSearch(tag)}
              className="quick-tag"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="vinted-main">
        {loading && (
          <div className="loading">Searching Vinted... Please wait...</div>
        )}
        {error && <div className="error">{error}</div>}
        {emptyState && !loading && !error && (
          <div className="empty-state">
            {searchTerm ? "No items found." : "Enter a search term above to start scraping."}
          </div>
        )}
        {items.length > 0 && (
          <>
            {usingMockData && (
              <div className="mock-data-notice">
                <strong>Note:</strong> Vinted API is currently unavailable. Showing demonstration data.
              </div>
            )}
            <div className="results-grid">
            {items.map((item, index) => (
              <div key={index} className="item-card">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="item-link"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="item-image"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/310x430?text=Error";
                    }}
                  />
                  <div className="item-details">
                    <div className="item-price">{item.price}</div>
                    <div className="item-title" title={item.title}>
                      {item.title}
                    </div>
                    <div className="view-on-vinted">View on Vinted →</div>
                  </div>
                </a>
              </div>
            ))}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .vinted-interface {
          --primary: #007782;
          --bg: #f5f6f7;
          --card-bg: #ffffff;
          --text: #171717;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: var(--bg);
          color: var(--text);
          padding: 20px;
          min-height: 400px;
        }

        .vinted-header {
          background-color: var(--card-bg);
          padding: 1rem 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }

        .search-container {
          display: flex;
          gap: 10px;
          max-width: 800px;
          width: 90%;
          flex-wrap: wrap;
          justify-content: center;
        }

        .search-input {
          flex-grow: 1;
          padding: 10px 15px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 16px;
          outline: none;
          min-width: 200px;
        }

        .price-input {
          width: 100px;
          padding: 10px 15px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 16px;
          outline: none;
        }

        .search-input:focus,
        .price-input:focus {
          border-color: var(--primary);
        }

        .search-button {
          background-color: var(--primary);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: background-color 0.2s;
        }

        .search-button:hover:not(:disabled) {
          background-color: #005c65;
        }

        .search-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .quick-search {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 900px;
          width: 90%;
        }

        .quick-tag {
          background-color: #e0f7fa;
          color: var(--primary);
          padding: 6px 12px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.2s;
          border: 1px solid transparent;
        }

        .quick-tag:hover {
          background-color: #b2ebf2;
          border-color: var(--primary);
        }

        .vinted-main {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }

        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
          width: 100%;
        }

        .item-card {
          background-color: var(--card-bg);
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: transform 0.2s;
          display: flex;
          flex-direction: column;
        }

        .item-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .item-link {
          text-decoration: none;
          color: inherit;
        }

        .item-image {
          width: 100%;
          height: 250px;
          object-fit: cover;
          background-color: #eee;
        }

        .item-details {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .item-price {
          font-weight: 700;
          font-size: 18px;
          color: var(--text);
        }

        .item-title {
          font-size: 14px;
          color: #666;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .view-on-vinted {
          font-size: 12px;
          color: #007782;
          margin-top: 5px;
        }

        .loading {
          text-align: center;
          margin-top: 40px;
          font-size: 18px;
          color: #666;
        }

        .error {
          text-align: center;
          margin-top: 40px;
          color: #d32f2f;
          background: #ffebee;
          padding: 10px;
          border-radius: 4px;
        }

        .mock-data-notice {
          text-align: center;
          margin: 20px 0;
          padding: 15px;
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
          border-radius: 4px;
          font-size: 14px;
        }

        .empty-state {
          text-align: center;
          margin-top: 50px;
          color: #888;
        }

        @media (max-width: 768px) {
          .search-container {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-input,
          .price-input {
            min-width: auto;
          }
          
          .results-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
