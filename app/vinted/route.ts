import { NextRequest, NextResponse } from 'next/server';

interface VintedItem {
  Title: string;
  Price: string;
  Brand: string;
  Size: string;
  Image: string;
  Link: string;
}

interface VintedPagination {
  current_page: number;
  items_per_page: number;
  total_items: number;
  total_pages: number;
  has_more: boolean;
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

  const search = searchParams.get("search") || "";
  const brand = searchParams.get("brand") || "";
  const category = searchParams.get("category") || "";
  const minPrice = searchParams.get("min_price") || "";
  const maxPrice = searchParams.get("max_price") || "";
  const country = searchParams.get("country") || "pl";
  const page = parseInt(searchParams.get("page") || "1");
  const itemsPerPage = parseInt(searchParams.get("items_per_page") || "24");

  try {
    // Build Vinted API URL
    const vintedApiUrl = new URL("https://vinted-scraping.vercel.app/");
    
    if (search) vintedApiUrl.searchParams.append("search", search);
    if (brand) vintedApiUrl.searchParams.append("brand", brand);
    if (category) vintedApiUrl.searchParams.append("category", category);
    if (minPrice) vintedApiUrl.searchParams.append("min_price", minPrice);
    if (maxPrice) vintedApiUrl.searchParams.append("max_price", maxPrice.toString());
    if (country) vintedApiUrl.searchParams.append("country", country);
    vintedApiUrl.searchParams.append("page", page.toString());
    vintedApiUrl.searchParams.append("items_per_page", itemsPerPage.toString());

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

    // Transform Vinted items to match our interface
    const transformedItems = vintedData.data.map((item: VintedItem, index: number) => ({
      itemId: `vinted_${index}_${item.Link.split('/').pop() || ''}`,
      title: item.Title,
      price: {
        value: item.Price,
        currency: item.Price.includes('zł') ? 'PLN' : 'EUR'
      },
      condition: "Unknown",
      seller: {
        username: "Vinted Seller",
        feedbackPercentage: "100.0",
        feedbackScore: 0
      },
      image: {
        imageUrl: item.Image || `https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&auto=format&sig=${index}`
      },
      thumbnailImages: [
        {
          imageUrl: item.Image || `https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&auto=format&sig=${index}`
        }
      ],
      itemWebUrl: item.Link,
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

    // Client-side price filtering since Vinted API doesn't support it
    let filteredItems = transformedItems;
    if (minPrice || maxPrice) {
      filteredItems = transformedItems.filter(item => {
        const priceValue = parseFloat(item.price.value.replace(/[^\d.,]/g, '').replace(',', '.'));
        const min = parseFloat(minPrice) || 0;
        const max = parseFloat(maxPrice) || Infinity;
        return priceValue >= min && priceValue <= max;
      });
    }

    return NextResponse.json({
      success: true,
      items: filteredItems,
      totalResults: vintedData.pagination.total_items,
      totalPages: vintedData.pagination.total_pages,
      currentPage: vintedData.pagination.current_page,
      message: "Vinted search completed successfully."
    });

  } catch (error: any) {
    console.error("Vinted API Error:", error);
    
    return NextResponse.json({
      success: false,
      error: "Vinted API is currently unavailable. Please try again later.",
      items: [],
      totalResults: 0,
      totalPages: 0,
      currentPage: 1,
      message: "Vinted search failed."
    }, { status: 503 });
  }
}
