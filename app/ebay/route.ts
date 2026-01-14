import { NextRequest, NextResponse } from 'next/server';

interface VintedItem {
  Title: string;
  Price: string;
  Brand: string;
  Size: string;
  Image: string;
  Link: string;
  Condition: string;
  Seller: string;
}

interface VintedPagination {
  current_page: number;
  total_pages: number;
  has_more: boolean;
  items_per_page: number;
  total_items: number;
  start_index: number;
  end_index: number;
}

interface VintedResponse {
  success: boolean;
  data: VintedItem[];
  count: number;
  pagination: VintedPagination;
  error: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search") || "laptop";
  const page = parseInt(searchParams.get("page") || "1");
  const itemsPerPage = parseInt(searchParams.get("items_per_page") || "50");
  const minPrice = searchParams.get("min_price") || "";
  const maxPrice = searchParams.get("max_price") || "";

  try {
    // Build Vinted eBay API URL to use as data source
    const vintedEbayApiUrl = new URL("https://vinted-scraping.vercel.app/ebay");
    
    vintedEbayApiUrl.searchParams.append("search", search);
    vintedEbayApiUrl.searchParams.append("page", page.toString());
    vintedEbayApiUrl.searchParams.append("items_per_page", itemsPerPage.toString());
    
    if (minPrice) vintedEbayApiUrl.searchParams.append("min_price", minPrice);
    if (maxPrice) vintedEbayApiUrl.searchParams.append("max_price", maxPrice);

    console.log("Fetching data from Vinted eBay API:", vintedEbayApiUrl.toString());

    const response = await fetch(vintedEbayApiUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (!response.ok) {
      console.log("Vinted API response status:", response.status, response.statusText);
      throw new Error(`Vinted API error: ${response.status} ${response.statusText}`);
    }

    const vintedData: VintedResponse = await response.json();

    if (!vintedData.success) {
      console.log("Vinted API error response:", vintedData);
      throw new Error(vintedData.error || "Vinted API returned error");
    }

    // Return the exact Vinted eBay API response format as specified in documentation
    return NextResponse.json(vintedData);

  } catch (error: any) {
    console.error("eBay API Error:", error);
    
    return NextResponse.json({
      success: false,
      error: "eBay API is currently unavailable. Please try again later.",
      items: [],
      totalResults: 0,
      totalPages: 0,
      currentPage: 1,
      message: "eBay search failed."
    }, { status: 503 });
  }
}
