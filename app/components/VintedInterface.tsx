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
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState("relevance");

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
    handleSearchTermChange(term);
    setTimeout(() => performSearch(), 100);
  };

  const performSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError("");
    setItems([]);
    setEmptyState(false);
    setUsingFallbackData(false);
    setCurrentPage(1);

    try {
      let url = `/api/vinted?search_term=${encodeURIComponent(searchTerm)}`;
      
      if (minPrice) url += `&min_price=${encodeURIComponent(minPrice)}`;
      if (maxPrice) url += `&max_price=${encodeURIComponent(maxPrice)}`;
      if (sortBy !== "relevance") url += `&sort_by=${encodeURIComponent(sortBy)}`;

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
      
      // Handle both array and response object formats
      let itemsArray: VintedItem[] = [];
      if (Array.isArray(data)) {
        itemsArray = data;
      } else if (data.items && Array.isArray(data.items)) {
        itemsArray = data.items;
        setTotalResults(data.totalResults || data.items.length);
      } else {
        itemsArray = data || [];
      }
      
      setItems(itemsArray);
      setTotalResults(itemsArray.length);
      
      // Check if using fallback data from header
      const isFallbackData = response.headers.get('X-Fallback-Data') === 'true';
      setUsingFallbackData(isFallbackData);

      if (itemsArray.length === 0) {
        setEmptyState(true);
      }
    } catch (err: any) {
      console.error('Full error:', err);
      setError(`Error: ${err.message}`);
      setEmptyState(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > Math.ceil(totalResults / itemsPerPage)) return;
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  // Auto-search when options change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    if (searchTerm.trim()) {
      performSearch();
    }
  };

  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    setCurrentPage(1);
    if (searchTerm.trim()) {
      performSearch();
    }
  };

  // Clear results when search term changes
  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    if (!value.trim()) {
      // Clear all results when search term is empty
      setItems([]);
      setTotalResults(0);
      setCurrentPage(1);
      setEmptyState(true);
      setError("");
    }
  };

  interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (pageNumber: number) => void;
  }

  const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
    const getPageNumbers = () => {
      const pages = [];
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        if (currentPage > 4) {
          pages.push('...');
        }
        let start = Math.max(2, currentPage - 2);
        let end = Math.min(totalPages - 1, currentPage + 2);

        if (currentPage <= 4) {
          start = 2;
          end = 6;
        }
        if (currentPage >= totalPages - 3) {
          start = totalPages - 5;
          end = totalPages - 1;
        }

        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
        if (currentPage < totalPages - 3) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
      return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
      <nav className="pagination-nav">
        <ul className="pagination">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <a onClick={(e) => { e.preventDefault(); onPageChange(1); }} href="#" className="page-link">First</a>
          </li>
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <a onClick={(e) => { e.preventDefault(); onPageChange(currentPage - 1); }} href="#" className="page-link">Prev</a>
          </li>
          {pageNumbers.map((num, index) => (
            <li key={index} className={`page-item ${num === currentPage ? 'active' : ''} ${num === '...' ? 'disabled' : ''}`}>
              <a onClick={(e) => { e.preventDefault(); if(typeof num === 'number') onPageChange(num); }} href="#" className="page-link">
                {num}
              </a>
            </li>
          ))}
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <a onClick={(e) => { e.preventDefault(); onPageChange(currentPage + 1); }} href="#" className="page-link">Next</a>
          </li>
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <a onClick={(e) => { e.preventDefault(); onPageChange(totalPages); }} href="#" className="page-link">Last</a>
          </li>
        </ul>
      </nav>
    );
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalResults / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  return (
    <div className="vinted-interface">
      <div className="vinted-header">
        <div className="search-container">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchTermChange(e.target.value)}
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
        <div className="search-options">
          <div className="items-per-page">
            <label>Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
              className="items-select"
            >
              <option value="12">12</option>
              <option value="24">24</option>
              <option value="48">48</option>
              <option value="96">96</option>
            </select>
          </div>
          <div className="sort-options">
            <label>Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="sort-select"
            >
              <option value="relevance">Relevance</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
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
        {!loading && totalResults > 0 && (
          <div className="results-info">
            <div className="results-count">
              <strong>{totalResults}</strong> items found
              {totalResults > itemsPerPage && (
                <span> (showing {startIndex + 1}-{Math.min(endIndex, totalResults)})</span>
              )}
            </div>
          </div>
        )}
        
        {loading && (
          <div className="loading">Searching Vinted... Please wait...</div>
        )}
        {error && <div className="error">{error}</div>}
        {emptyState && !loading && !error && (
          <div className="empty-state">
            {searchTerm ? "No items found. Try adjusting your filters." : "Enter a search term above to start scraping."}
          </div>
        )}
        {currentItems.length > 0 && (
          <div className="results-grid">
            {usingFallbackData && (
              <div className="fallback-data-notice">
                <strong>Note:</strong> Vinted scraping is currently unavailable. You can search directly on Vinted using the link below.
              </div>
            )}
            {currentItems.map((item, index) => (
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
        )}
        
        {!loading && totalPages > 1 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
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

        .search-container {
          display: flex;
          gap: 10px;
          max-width: 800px;
          width: 90%;
          flex-wrap: wrap;
          justify-content: center;
        }

        .search-options {
          display: flex;
          gap: 20px;
          justify-content: center;
          align-items: center;
          margin-top: 10px;
          flex-wrap: wrap;
        }

        .items-per-page,
        .sort-options {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .items-per-page label,
        .sort-options label {
          font-size: 14px;
          font-weight: 500;
        }

        .items-select,
        .sort-select {
          padding: 4px 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
          background: white;
        }

        .results-info {
          text-align: center;
          margin: 20px 0;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .results-count {
          font-size: 16px;
          color: var(--text);
        }

        .results-count span {
          color: #666;
          font-size: 14px;
        }

        .pagination-nav {
          margin-top: 30px;
          text-align: center;
        }

        .pagination {
          display: flex;
          justify-content: center;
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .page-item {
          margin: 0 2px;
        }

        .page-link {
          display: block;
          padding: 8px 12px;
          text-decoration: none;
          color: var(--primary);
          border: 1px solid #ddd;
          border-radius: 4px;
          transition: all 0.3s ease;
        }

        .page-link:hover {
          background-color: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .page-item.active .page-link {
          background-color: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .page-item.disabled .page-link {
          color: #ccc;
          cursor: not-allowed;
          background-color: #f8f9fa;
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

        .fallback-data-notice {
          text-align: center;
          margin: 20px 0;
          padding: 15px;
          background: #e3f2fd;
          color: #1565c0;
          border: 1px solid #90caf9;
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
