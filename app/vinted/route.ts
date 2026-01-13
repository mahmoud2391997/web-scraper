import { NextRequest, NextResponse } from 'next/server';

interface VintedItem {
  Title: string;
  Price: string;
  Currency: string;
  Brand: string;
  Size: string;
  URL: string;
  ImageURL: string;
}

interface VintedResponse {
  success: boolean;
  data: VintedItem[];
  count: number;
  error: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search") || "";
  const brand = searchParams.get("brand") || "";
  const category = searchParams.get("category") || "";
  const minPrice = searchParams.get("min_price") || "";
  const maxPrice = searchParams.get("max_price") || "";
  const country = searchParams.get("country") || "pl";
  const pages = parseInt(searchParams.get("pages") || "1");

  try {
    // Build Vinted API URL
    const vintedApiUrl = new URL("https://vinted-scraping.vercel.app/api");
    
    if (search) vintedApiUrl.searchParams.append("search", search);
    if (brand) vintedApiUrl.searchParams.append("brand", brand);
    if (category) vintedApiUrl.searchParams.append("category", category);
    if (minPrice) vintedApiUrl.searchParams.append("min_price", minPrice);
    if (maxPrice) vintedApiUrl.searchParams.append("max_price", maxPrice);
    if (country) vintedApiUrl.searchParams.append("country", country);
    vintedApiUrl.searchParams.append("pages", pages.toString());

    console.log("Fetching Vinted data from:", vintedApiUrl.toString());

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

    const vintedData: VintedResponse = await response.json();

    if (!vintedData.success) {
      console.log("Vinted API error response:", vintedData);
      throw new Error(vintedData.error || "Vinted API returned error");
    }

    // Transform Vinted data to match our existing Item structure
    const transformedItems = vintedData.data.map((item, index) => ({
      itemId: `vinted_${index}_${Date.now()}`,
      title: item.Title,
      price: {
        value: item.Price,
        currency: item.Currency
      },
      condition: "Unknown", // Vinted doesn't provide condition
      seller: {
        username: "Vinted Seller",
        feedbackPercentage: "100.0",
        feedbackScore: 0
      },
      image: {
        imageUrl: item.ImageURL
      },
      thumbnailImages: [{
        imageUrl: item.ImageURL
      }],
      itemWebUrl: item.URL,
      itemLocation: {
        postalCode: "",
        country: country.toUpperCase()
      },
      additionalImages: [],
      adultOnly: false,
      legacyItemId: `vinted_${index}`,
      availableCoupons: false,
      itemOriginDate: new Date().toISOString(),
      itemCreationDate: new Date().toISOString(),
      topRatedBuyingExperience: false,
      priorityListing: false,
      listingMarketplaceId: `VINTED_${country.toUpperCase()}`
    }));

    return NextResponse.json({
      success: true,
      items: transformedItems,
      totalResults: vintedData.count,
      totalPages: pages,
      currentPage: 1,
      message: "Vinted search completed successfully."
    });

  } catch (error: any) {
    console.error("Vinted API Error:", error);
    
    // Return mock data for demonstration when API is unavailable
    const mockItems: VintedItem[] = [
      {
        Title: "Vinted API Unavailable",
        Price: "0.00",
        Currency: "EUR",
        Brand: "Demo",
        Size: "N/A",
        URL: "https://vinted.com",
        ImageURL: "https://via.placeholder.com/300x250?text=Vinted+API+Unavailable"
      }
    ];

    const transformedMockItems = mockItems.map((item, index) => ({
      itemId: `vinted_demo_${index}`,
      title: item.Title,
      price: {
        value: item.Price,
        currency: item.Currency
      },
      condition: "Unknown",
      seller: {
        username: "Vinted Seller",
        feedbackPercentage: "100.0",
        feedbackScore: 0
      },
      image: {
        imageUrl: item.ImageURL
      },
      thumbnailImages: [{
        imageUrl: item.ImageURL
      }],
      itemWebUrl: item.URL,
      itemLocation: {
        postalCode: "",
        country: country.toUpperCase()
      },
      additionalImages: [],
      adultOnly: false,
      legacyItemId: `vinted_demo_${index}`,
      availableCoupons: false,
      itemOriginDate: new Date().toISOString(),
      itemCreationDate: new Date().toISOString(),
      topRatedBuyingExperience: false,
      priorityListing: false,
      listingMarketplaceId: `VINTED_${country.toUpperCase()}`
    }));

    return NextResponse.json({
      success: true,
      items: transformedMockItems,
      totalResults: 1,
      totalPages: 1,
      currentPage: 1,
      message: "Vinted API is currently unavailable. Showing demo data."
    });
  }
}
