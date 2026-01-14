
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const CLIENT_ID = process.env.EBAY_CLIENT_ID;
const CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;

const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

async function getAppToken() {
  try {
    const res = await axios.post(
      "https://api.ebay.com/identity/v1/oauth2/token",
      "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
      {
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return res.data.access_token;
  } catch (err: any) {
    if (axios.isAxiosError(err)) {
      console.error(err.response?.data || err.message);
    } else {
      console.error(err);
    }
    throw err;
  }
}

interface Item {
  itemId: string;
  price: { value: string; currency: string };
  title: string;
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  const { pathname } = new URL(request.url);
  
  // Route Vinted requests to Vinted route
  if (pathname.includes('/vinted')) {
    // Forward to Vinted route
    const vintedUrl = new URL(request.url, `http://localhost:3000/vinted`);
    const response = await fetch(vintedUrl.toString());
    const data = await response.json();
    return NextResponse.json(data);
  }
  
  // Route eBay requests to eBay route
  if (pathname.includes('/ebay')) {
    // Import and call the eBay route handler directly
    const { GET: ebayHandler } = await import('../../ebay/route');
    return ebayHandler(request);
  }
  
  // Route luxury-bags requests to eBay route
  if (pathname.includes('/luxury-bags')) {
    // Import and call the eBay route handler directly
    const { GET: ebayHandler } = await import('../../ebay/route');
    return ebayHandler(request);
  }

  // For all other routes, use Vinted scraping API approach
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") || "1");
  const itemsPerPage = parseInt(searchParams.get("itemsPerPage") || "24");
  const sortBy = searchParams.get("sortBy") || "price-asc";
  const minPrice = searchParams.get("minPrice") || "0";
  const maxPrice = searchParams.get("maxPrice") || "1000";
  const brandsParam = searchParams.get("brands");
  const searchQuery = searchParams.get("search");
  const country = searchParams.get("country") || "ALL";

  const allBrands = [
      "bag",
      "handbag", 
      "purse",
      "shoulder bag",
      "leather bag",
      "travel bag",
      "crossbody bag",
  ];

  const selectedBrands = (brandsParam && brandsParam.length > 0) ? brandsParam.split(',') : allBrands;

  // Build search queries based on search query vs brand filters
  let searchQueries: string[] = [];
  
  if (searchQuery && searchQuery.trim()) {
    // If custom search query is provided, use it instead of brands
    searchQueries = [searchQuery.trim()];
  } else {
    // Otherwise use selected brands
    searchQueries = selectedBrands;
  }

  try {
    // Use Vinted eBay API for eBay-related searches
    const vintedApiUrl = new URL("https://vinted-scraping.vercel.app/ebay");
    
    // Use first search query for Vinted eBay API
    const primaryQuery = searchQueries[0] || "bag";
    vintedApiUrl.searchParams.append("search", primaryQuery);
    vintedApiUrl.searchParams.append("page", page.toString());
    vintedApiUrl.searchParams.append("items_per_page", itemsPerPage.toString());
    vintedApiUrl.searchParams.append("min_price", minPrice);
    vintedApiUrl.searchParams.append("max_price", maxPrice);

    console.log("Fetching data from Vinted eBay API:", vintedApiUrl.toString());

    const response = await fetch(vintedApiUrl.toString(), {
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

    const vintedData = await response.json();

    if (!vintedData.success) {
      console.log("Vinted API error response:", vintedData);
      throw new Error(vintedData.error || "Vinted API returned error");
    }

    // Return the exact Vinted eBay API response format as specified in documentation
    return NextResponse.json(vintedData);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to search items",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
