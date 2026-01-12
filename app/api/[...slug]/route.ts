
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
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") || "1");
  const itemsPerPage = parseInt(searchParams.get("itemsPerPage") || "24");
  const sortBy = searchParams.get("sortBy") || "price-asc";
  const minPrice = searchParams.get("minPrice") || "0";
  const maxPrice = searchParams.get("maxPrice") || "1000";
  const brandsParam = searchParams.get("brands");
  const searchQuery = searchParams.get("search");
  const country = searchParams.get("country") || "EBAY_AU";

  // Handle global search across multiple marketplaces
  const isGlobalSearch = country === "ALL";
  
  // Define marketplace configurations
  const marketplaces = [
    { id: "EBAY_US", name: "United States", currency: "USD" },
    { id: "EBAY_GB", name: "United Kingdom", currency: "GBP" },
    { id: "EBAY_DE", name: "Germany", currency: "EUR" },
    { id: "EBAY_AU", name: "Australia", currency: "AUD" },
    { id: "EBAY_CA", name: "Canada", currency: "CAD" },
    { id: "EBAY_FR", name: "France", currency: "EUR" },
    { id: "EBAY_IT", name: "Italy", currency: "EUR" },
    { id: "EBAY_ES", name: "Spain", currency: "EUR" },
    { id: "EBAY_NL", name: "Netherlands", currency: "EUR" },
    { id: "EBAY_BE", name: "Belgium", currency: "EUR" },
    { id: "EBAY_AT", name: "Austria", currency: "EUR" },
    { id: "EBAY_CH", name: "Switzerland", currency: "CHF" },
    { id: "EBAY_IE", name: "Ireland", currency: "EUR" }
  ];

  // Determine which marketplaces to search
  const searchMarketplaces = isGlobalSearch ? marketplaces : [marketplaces.find(mp => mp.id === country)].filter(Boolean);

  const allBrands = [
      "Dior bag",
      "Louis Vuitton bag",
      "Prada bag",
      "Gucci bag",
      "Christian Dior bag",
      "Michael Kors bag",
      "Coach bag",
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

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json(
      {
        error:
          "Missing eBay credentials. Please set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in .env file",
      },
      { status: 400 }
    );
  }

  try {
    const token = await getAppToken();
    const EBAY_API_LIMIT = 200;

    const promises = searchMarketplaces.map((marketplace) => {
      if (!marketplace) return [];
      return searchQueries.map((query) => {
        const searchUrl = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(
          query
        )}&limit=${EBAY_API_LIMIT}&filter=price:[${minPrice}..${maxPrice}]`;
        return axios.get(searchUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-EBAY-C-MARKETPLACE-ID": marketplace.id,
          },
        });
      });
    }).flat();

    const responses = await Promise.allSettled(promises);

    let allItems: Item[] = [];
    responses.forEach((response) => {
      if (response.status === "fulfilled" && response.value && response.value.data && response.value.data.itemSummaries) {
        allItems = allItems.concat(response.value.data.itemSummaries);
      }
    });

    const uniqueItems = Array.from(
      new Map(allItems.map((item) => [item.itemId, item])).values()
    );

    switch (sortBy) {
      case "price-desc":
        uniqueItems.sort(
          (a, b) => parseFloat(b.price.value) - parseFloat(a.price.value)
        );
        break;
      case "title":
        uniqueItems.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "price-asc":
      default:
        uniqueItems.sort(
          (a, b) => parseFloat(a.price.value) - parseFloat(b.price.value)
        );
        break;
    }

    const totalResults = uniqueItems.length;
    const totalPages = Math.ceil(totalResults / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedItems = uniqueItems.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    return NextResponse.json({
      success: true,
      items: paginatedItems,
      totalResults: totalResults,
      totalPages: totalPages,
      currentPage: page,
      message: `Search completed.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to search luxury bags",
        details: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}
