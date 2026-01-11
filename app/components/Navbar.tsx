"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import VintedInterface from "./VintedInterface";

interface VintedItem {
  title: string;
  price: string;
  image: string;
  url: string;
}

interface NavbarProps {
  bags: any[];
  searchParams: {
    minPrice: number;
    maxPrice: number;
    selectedBrands: string[];
  };
  children?: React.ReactNode;
}

export default function Navbar({ bags, searchParams, children }: NavbarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'ebay' | 'vinted'>('ebay');

  const fetchVintedData = async (): Promise<VintedItem[]> => {
    try {
      const searchTerms = searchParams.selectedBrands.length > 0 
        ? searchParams.selectedBrands.map(brand => brand.replace(' bag', '')).join(' ')
        : 'luxury bags';
      
      const url = `/api/vinted?search_term=${encodeURIComponent(searchTerms)}&min_price=${searchParams.minPrice}&max_price=${searchParams.maxPrice}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch Vinted data');
      }
      
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching Vinted data:', error);
      return [];
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    
    try {
      // Fetch Vinted data
      const vintedData = await fetchVintedData();
      
      // Prepare eBay data
      const ebayData = bags.map(bag => ({
        Title: bag.title,
        Price: `$${parseFloat(bag.price.value).toFixed(2)}`,
        Currency: bag.price.currency,
        Condition: bag.condition || 'Unknown',
        Seller: bag.seller?.username || 'Unknown Seller',
        Item_URL: bag.itemWebUrl || '',
        Image_URL: bag.image?.imageUrl || bag.thumbnailImages?.[0]?.imageUrl || '',
        Item_ID: bag.itemId
      }));
      
      // Prepare Vinted data
      const vintedFormattedData = vintedData.map((item: VintedItem) => ({
        Title: item.title,
        Price: item.price,
        Currency: 'EUR',
        Condition: 'Unknown',
        Seller: 'Unknown Seller',
        Item_URL: item.url,
        Image_URL: item.image,
        Item_ID: item.url.split('/').pop() || 'Unknown'
      }));
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Create eBay worksheet
      const wsEbay = XLSX.utils.json_to_sheet(ebayData);
      XLSX.utils.book_append_sheet(wb, wsEbay, "eBay");
      
      // Create Vinted worksheet
      const wsVinted = XLSX.utils.json_to_sheet(vintedFormattedData);
      XLSX.utils.book_append_sheet(wb, wsVinted, "Vinted");
      
      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `luxury-bags-export-${timestamp}.xlsx`;
      
      // Save file
      saveAs(blob, filename);
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>Luxury Bags Scraper</h1>
        </div>
        
        <div className="navbar-tabs">
          <button
            className={`tab-button ${activeTab === 'ebay' ? 'active' : ''}`}
            onClick={() => setActiveTab('ebay')}
          >
            eBay
          </button>
          <button
            className={`tab-button ${activeTab === 'vinted' ? 'active' : ''}`}
            onClick={() => setActiveTab('vinted')}
          >
            Vinted
          </button>
        </div>
        
        <div className="navbar-actions">
          <button
            onClick={exportToExcel}
            disabled={isExporting || bags.length === 0}
            className="export-button"
          >
            {isExporting ? 'Exporting...' : 'Export as Excel'}
          </button>
        </div>
      </div>
      
      <div className="tab-content">
        {activeTab === 'ebay' ? children : <VintedInterface />}
      </div>
      
      <style jsx>{`
        .navbar {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 1000;
        }
        
        .navbar-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .navbar-brand h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }
        
        .navbar-tabs {
          display: flex;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          padding: 0.25rem;
          border-radius: 25px;
          backdrop-filter: blur(10px);
        }
        
        .tab-button {
          background: transparent;
          color: rgba(255, 255, 255, 0.8);
          border: none;
          padding: 0.5rem 1.5rem;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }
        
        .tab-button:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
        }
        
        .tab-button.active {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          font-weight: 600;
        }
        
        .navbar-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        
        .export-button {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          padding: 0.5rem 1.5rem;
          border-radius: 25px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }
        
        .export-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-2px);
        }
        
        .export-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .tab-content {
          background: white;
          margin-top: 1rem;
          border-radius: 0 0 20px 20px;
          overflow: hidden;
        }
        
        @media (max-width: 768px) {
          .navbar-container {
            flex-direction: column;
            padding: 1rem;
          }
          
          .navbar-brand h1 {
            font-size: 1.2rem;
          }
          
          .navbar-tabs {
            order: 3;
            width: 100%;
            justify-content: center;
          }
          
          .navbar-actions {
            order: 2;
          }
          
          .tab-button {
            padding: 0.4rem 1rem;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </nav>
  );
}
