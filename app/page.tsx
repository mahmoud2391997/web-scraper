"use client";

import { useState, useEffect, ChangeEvent, SyntheticEvent, useCallback } from "react";
import * as XLSX from 'xlsx';

interface Bag {
  itemId: string;
  title: string;
  Price: string;
  Brand: string;
  Size: string;
  Image: string;
  Link: string;
  Condition: string;
  Seller: string;
  listingMarketplaceId?: string;
}

interface BagCardProps {
  bag: Bag;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (pageNumber: number) => void;
}

export default function Home() {
  const [bags, setBags] = useState<Bag[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<"ebay" | "vinted">("ebay");
  const itemsPerPage = 24; // Constant 24 items per page

  const allBrands = [
    "Dior bag",
    "Louis Vuitton bag", 
    "Prada bag",
    "Gucci bag",
    "Christian Dior bag",
    "Michael Kors bag",
    "Coach bag",
  ];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultsCount, setResultsCount] = useState(0);
  const [sortBy, setSortBy] = useState("price-asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("ALL");

  // Platform-specific state configurations
  const platformConfigs = {
    ebay: {
      defaultSearchQuery: "",
      defaultBrands: ["Dior bag"],
      defaultCountry: "ALL",
      defaultItemsPerPage: 24,
      defaultMinPrice: 0,
      defaultMaxPrice: 1000
    },
    vinted: {
      defaultSearchQuery: "dior bags",
      defaultBrands: ["Dior bag"],
      defaultCountry: "pl",
      defaultItemsPerPage: 24,
      defaultMinPrice: 0,
      defaultMaxPrice: 1000
    }
  };

  // Handle platform switching with proper state management
  useEffect(() => {
    const config = platformConfigs[selectedPlatform];
    
    // Reset to platform-specific defaults when switching
    setSearchQuery(config.defaultSearchQuery);
    setSelectedBrands(config.defaultBrands);
    setSelectedCountry(config.defaultCountry);
    // itemsPerPage is now constant (24), no need to set
    setMinPrice(config.defaultMinPrice);
    setMaxPrice(config.defaultMaxPrice);
    setCurrentPage(1);
    setBags([]); // Clear previous results
    setResultsCount(0); // Reset results count
    setTotalPages(0); // Reset total pages
  }, [selectedPlatform]);

  // Handle brand filter changes for Vinted
  useEffect(() => {
    if (selectedPlatform === "vinted" && selectedBrands.length > 0) {
      const brandSearch = selectedBrands.join(" ");
      setSearchQuery(brandSearch);
    }
  }, [selectedBrands, selectedPlatform]);

  const searchBags = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);

    // If there's a search query, search the entire site (ignore brand filters)
    // If no search query, use brand filters
    const hasSearchQuery = searchQuery.trim().length > 0;
    
    let url;
    if (selectedPlatform === "vinted") {
      // Vinted API parameters
      const vintedParams = new URLSearchParams();
      
      // Use search query for Vinted (includes brand filters when they're added to search)
      if (hasSearchQuery) {
        vintedParams.append("search", searchQuery.trim());
      }
      
      // Add brand filter if selected and not already in search
      if (selectedBrands.length > 0 && !searchQuery.toLowerCase().includes(selectedBrands[0].toLowerCase())) {
        vintedParams.append("brand", selectedBrands[0].replace(" bag", ""));
      }
      
      vintedParams.append("min_price", minPrice.toString());
      vintedParams.append("max_price", maxPrice.toString());
      vintedParams.append("country", selectedCountry === "ALL" ? "pl" : selectedCountry.replace("EBAY_", "").toLowerCase());
      vintedParams.append("page", page.toString()); // Use page parameter for pagination
      vintedParams.append("items_per_page", itemsPerPage.toString()); // Use items_per_page for pagination
      
      url = `/vinted?${vintedParams.toString()}`;
    } else {
      // eBay API parameters
      if (hasSearchQuery) {
        // Search entire site with query
        url = `/api/luxury-bags?page=${page}&itemsPerPage=${itemsPerPage}&sortBy=${sortBy}&minPrice=${minPrice}&maxPrice=${maxPrice}&search=${encodeURIComponent(searchQuery.trim())}&country=${selectedCountry}`;
      } else {
        // Use brand filters when no search query
        const brandsQuery = selectedBrands.join(',');
        url = `/api/luxury-bags?page=${page}&itemsPerPage=${itemsPerPage}&sortBy=${sortBy}&minPrice=${minPrice}&maxPrice=${maxPrice}&brands=${brandsQuery}&country=${selectedCountry}`;
      }
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ details: "Server returned an invalid response." }));
        throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setBags(data.data || []);
        setResultsCount(data.totalResults || 0);
        setTotalPages(data.totalPages || 0);
        setCurrentPage(data.currentPage || 1);
      } else {
        throw new Error(data.details || 'API returned an error.');
      }
    } catch (e: any) {
      setError(e.message);
      setBags([]);
      setResultsCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [selectedBrands, itemsPerPage, sortBy, minPrice, maxPrice, searchQuery, selectedCountry, selectedPlatform]);

  const exportToExcel = useCallback(() => {
    if (bags.length === 0) {
      alert('No data to export');
      return;
    }

    setIsExporting(true);
    
    try {
      // Prepare data for Excel
      const excelData = bags.map((bag, index) => ({
        'No.': index + 1,
        'Title': bag.title,
        'Price': `€${parseFloat(bag.Price).toFixed(2)}`,
        'Currency': bag.Price.includes('zł') ? 'PLN' : 'EUR',
        'Condition': bag.Condition || 'Unknown',
        'Seller': bag.Seller || 'Unknown',
        'Item URL': bag.Link || '',
        'Image URL': bag.Image || 'https://via.placeholder.com/300x250?text=No+Image',
        'Item ID': bag.itemId
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Luxury Bags');

      // Set column widths
      const colWidths = [
        { wch: 8 },  // No.
        { wch: 40 }, // Title
        { wch: 12 }, // Price
        { wch: 10 }, // Currency
        { wch: 15 }, // Condition
        { wch: 20 }, // Seller
        { wch: 50 }, // Item URL
        { wch: 50 }, // Image URL
        { wch: 20 }  // Item ID
      ];
      ws['!cols'] = colWidths;

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `luxury-bags-${timestamp}.xlsx`;

      // Save the file
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [bags]);

  useEffect(() => {
    searchBags(1);
  }, [searchBags]);

  const handleSearch = () => {
    setCurrentPage(1);
    searchBags(1);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleBrandChange = (brand: string) => {
    setSelectedBrands([brand]); // Only allow one brand at a time
  };

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
    searchBags(pageNumber);
    window.scrollTo(0, 0);
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Luxury Bags Search</h1>
        <p>Find your perfect designer bag from eBay's premium collection</p>
        <div className="header-actions">
          <button
            onClick={exportToExcel}
            disabled={isExporting || bags.length === 0}
            className="export-button"
          >
            {isExporting ? 'Exporting...' : '📊 Export to Excel'}
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="platform-toggle">
          <label>Platform</label>
          <div className="platform-buttons">
            <button
              className={`platform-button ${selectedPlatform === "ebay" ? "active" : ""}`}
              onClick={() => setSelectedPlatform("ebay")}
            >
              🛒 eBay
            </button>
            <button
              className={`platform-button ${selectedPlatform === "vinted" ? "active" : ""}`}
              onClick={() => setSelectedPlatform("vinted")}
            >
              👗 Vinted
            </button>
          </div>
        </div>

        <div className="search-section">
          <div className="search-bar">
            <label htmlFor="searchQuery">Search</label>
            <div className="search-container">
              <input
                type="text"
                id="searchQuery"
                placeholder="Search for bags, brands, or keywords..."
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="search-input"
              />
              <button onClick={handleSearch} className="search-button">
                🔍 Search
              </button>
              {searchQuery && (
                <button onClick={handleClearSearch} className="clear-button" title="Clear search">
                  ✕
                </button>
              )}
            </div>
          </div>
          
          <div className="country-section">
            <label htmlFor="country">Country</label>
            <select
              id="country"
              value={selectedCountry}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedCountry(e.target.value)}
              className="country-select"
            >
              <option value="ALL">All Countries (Global)</option>
              <option value="EBAY_AU">Australia</option>
              <option value="EBAY_US">United States</option>
              <option value="EBAY_GB">United Kingdom</option>
              <option value="EBAY_DE">Germany</option>
              <option value="EBAY_CA">Canada</option>
              <option value="EBAY_FR">France</option>
              <option value="EBAY_IT">Italy</option>
              <option value="EBAY_ES">Spain</option>
              <option value="EBAY_NL">Netherlands</option>
              <option value="EBAY_BE">Belgium</option>
              <option value="EBAY_AT">Austria</option>
              <option value="EBAY_CH">Switzerland</option>
              <option value="EBAY_IE">Ireland</option>
            </select>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label htmlFor="minPrice">Min Price (€)</label>
            <input
              type="number"
              id="minPrice"
              value={minPrice}
              min="0"
              step="10"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setMinPrice(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="maxPrice">Max Price (€)</label>
            <input
              type="number"
              id="maxPrice"
              value={maxPrice}
              min="0"
              step="50"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setMaxPrice(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>Brands</label>
          <div className="brand-checkboxes">
            {allBrands.map((brand) => (
              <div
                key={brand}
                className={`brand-checkbox ${selectedBrands.includes(brand) ? "selected" : ""}`}
                onClick={() => handleBrandChange(brand)}
              >
                <input type="radio" name="brand" value={brand} checked={selectedBrands.includes(brand)} readOnly />
                <span>{brand.replace(" bag", "")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!loading && resultsCount > 0 && (
        <div id="resultsInfo" className="results-info">
          <div className="results-count">
            Showing <strong>{bags.length}</strong> of <strong>{resultsCount}</strong> bags found
          </div>
          <div className="sort-options">
            <label>Sort by:</label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value)}
            >
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="title">Title: A to Z</option>
            </select>
          </div>
        </div>
      )}

      <div id="content">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Searching for luxury bags...</p>
          </div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : resultsCount > 0 ? (
          <div className="bags-grid">
            {bags.map((bag) => (
              <BagCard key={bag.itemId} bag={bag} />
            ))}
          </div>
        ) : (
          <div className="loading">
            <p>No bags found. Try adjusting your filters.</p>
          </div>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      )}
    </div>
  );
}

const BagCard = ({ bag }: BagCardProps) => {
  const imageUrl =
    bag.Image ||
    "https://via.placeholder.com/300x250?text=No+Image";
  const price = parseFloat(bag.Price || '0').toFixed(2);
  const condition = bag.Condition || "Unknown";
  const seller = bag.Seller || "Unknown Seller";
  const itemUrl = bag.Link || "#";
  const isVintedItem = bag.listingMarketplaceId?.startsWith("VINTED");

  return (
    <div className="bag-card" onClick={() => window.open(itemUrl, "_blank")}>
      <img
        src={imageUrl}
        alt={bag.title}
        className="bag-image"
        onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
          (e.target as HTMLImageElement).src = "https://via.placeholder.com/300x250?text=No+Image";
        }}
      />
      <div className="bag-info">
        <div className="bag-title" title={bag.title}>{bag.title}</div>
        <div className="bag-price">{`€${price}`}</div>
        <div className="bag-condition">{condition}</div>
        <div className="bag-seller">Seller: {seller}</div>
        <a href={itemUrl} target="_blank" rel="noopener noreferrer" className="bag-link" onClick={(e) => e.stopPropagation()}>
          View on {isVintedItem ? "Vinted" : "eBay"}
        </a>
      </div>
    </div>
  );
};

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
