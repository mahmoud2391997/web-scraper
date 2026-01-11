import { NextRequest, NextResponse } from "next/server";

interface Item {
  title?: string;
  price?: string;
  image?: string;
  url?: string;
}

async function scrapeVintedWithPlaywright(searchTerm: string, minPrice?: number, maxPrice?: number, retryCount: number = 0): Promise<Item[]> {
  const { chromium } = await import('playwright');
  let browser;
  let context;
  let page;
  
  try {
    console.log(`Scraping attempt ${retryCount + 1} for: ${searchTerm}`);
    
    // Launch browser with minimal resource usage
    browser = await chromium.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images', // Disable images to save memory
        '--disable-javascript', // Try without JS first
      ]
    });
    
    // Create a new context with minimal options
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    
    page = await context.newPage();
    
    // Set shorter timeouts to avoid hanging
    page.setDefaultTimeout(15000);
    
    // Base URL for search
    let url = `https://www.vinted.com/catalog?search_text=${encodeURIComponent(searchTerm)}`;
    
    if (minPrice !== undefined) {
      url += `&price_from=${minPrice}`;
    }
    if (maxPrice !== undefined) {
      url += `&price_to=${maxPrice}`;
    }
    
    console.log('Navigating to:', url);
    
    // Navigate with very short timeout
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    
    // Quick wait for content
    await page.waitForTimeout(1000);
    
    // Check if page is still alive
    if (!page || page.isClosed()) {
      throw new Error('Page was closed before scraping could complete');
    }
    
    console.log('Starting data extraction...');
    
    // Extract data with improved selectors for Vinted
    const itemsData = await page.evaluate(() => {
      try {
        // More comprehensive selector approach for Vinted
        const items = document.querySelectorAll('.feed-grid__item, .item-card, .ProductBox, .catalog-item, .ItemBox');
        const itemsArray = Array.from(items);
        
        if (itemsArray.length === 0) {
          console.log('No items found with any selector');
          return [];
        }
        
        console.log(`Found ${itemsArray.length} items to process`);
        
        return itemsArray.map((el: any, index: number) => {
          try {
            // Try multiple selectors for title (Vinted specific)
            const titleSelectors = [
              '.web_ui__Text__text',
              '.item-title',
              'h3',
              '.title',
              '[data-testid="item-title"]',
              '.ProductBox__title',
              '.item-name'
            ];
            
            let title = null;
            for (const selector of titleSelectors) {
              const titleEl = el.querySelector(selector);
              if (titleEl && titleEl.textContent && titleEl.textContent.trim()) {
                title = titleEl.textContent.trim();
                break;
              }
            }
            
            // Try multiple selectors for price
            const priceSelectors = [
              '.web_ui__Text__text--muted',
              '.price',
              '[data-testid="price"]',
              '.price-new',
              '.ProductBox__price',
              '.item-price',
              '.price-value'
            ];
            
            let price = null;
            for (const selector of priceSelectors) {
              const priceEl = el.querySelector(selector);
              if (priceEl && priceEl.textContent && priceEl.textContent.trim()) {
                price = priceEl.textContent.trim();
                break;
              }
            }
            
            // Get image
            const imgSelectors = [
              '.new-item-box__image img',
              'img',
              '.item-image',
              '.ProductBox__image img',
              '.item-photo img'
            ];
            
            let image = null;
            for (const selector of imgSelectors) {
              const imgEl = el.querySelector(selector);
              if (imgEl && imgEl.src) {
                image = imgEl.src;
                break;
              }
            }
            
            // Get link
            const linkSelectors = [
              '.new-item-box__overlay',
              'a',
              '.item-link',
              '.ProductBox__link'
            ];
            
            let url = null;
            for (const selector of linkSelectors) {
              const linkEl = el.querySelector(selector);
              if (linkEl && linkEl.href) {
                url = linkEl.href;
                break;
              }
            }
            
            // Log what we found for debugging
            if (index < 3) {
              console.log(`Item ${index}: title="${title}", price="${price}", hasImage=${!!image}, hasUrl=${!!url}`);
            }
            
            return {
              title: title,
              price: price,
              image: image,
              url: url
            };
          } catch (err) {
            console.error(`Error processing item ${index}:`, err);
            return null;
          }
        }).filter((item: any) => item !== null && (item.title || item.price));
      } catch (evaluationError) {
        console.error('Evaluation error:', evaluationError);
        return [];
      }
    });
    
    console.log(`Extracted ${itemsData.length} items`);
    
    // Clean and return items
    const cleanItems: Item[] = itemsData.filter((item: any) => 
      item && (item.title || item.price || item.image || item.url)
    ).map((item: any) => ({
      title: item.title || undefined,
      price: item.price || undefined,
      image: item.image || undefined,
      url: item.url || undefined
    }));
    
    return cleanItems;
    
  } catch (error) {
    console.error(`Scraping attempt ${retryCount + 1} failed:`, error);
    
    // Retry logic for specific errors
    if (retryCount < 2 && (
      (error as Error).message.includes('Target page, context or browser has been closed') ||
      (error as Error).message.includes('Page was closed') ||
      (error as Error).message.includes('timeout')
    )) {
      console.log(`Retrying... (${retryCount + 1}/2)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return scrapeVintedWithPlaywright(searchTerm, minPrice, maxPrice, retryCount + 1);
    }
    
    throw error;
  } finally {
    // Clean up resources
    try {
      if (page && !page.isClosed()) await page.close();
    } catch (e) { console.error('Error closing page:', e); }
    
    try {
      if (context) await context.close();
    } catch (e) { console.error('Error closing context:', e); }
    
    try {
      if (browser && browser.isConnected()) await browser.close();
    } catch (e) { console.error('Error closing browser:', e); }
  }
}

// Fallback function for when Playwright completely fails
function getFallbackData(searchTerm: string, minPrice?: number, maxPrice?: number): Item[] {
  // Return empty array with a special structure to indicate fallback mode
  return [{
    title: `Vinted Search Unavailable`,
    price: "N/A",
    image: "https://via.placeholder.com/310x430?text=Vinted+Search+Unavailable",
    url: `https://www.vinted.com/catalog?search_text=${encodeURIComponent(searchTerm)}${minPrice ? `&price_from=${minPrice}` : ''}${maxPrice ? `&price_to=${maxPrice}` : ''}`
  }];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const search_term = searchParams.get("search_term");
  const min_price = searchParams.get("min_price");
  const max_price = searchParams.get("max_price");
  
  if (!search_term) {
    return NextResponse.json(
      { error: "search_term parameter is required" },
      { status: 400 }
    );
  }
  
  const minPriceNum = min_price ? parseFloat(min_price) : undefined;
  const maxPriceNum = max_price ? parseFloat(max_price) : undefined;
  
  try {
    console.log('Starting Vinted scraping for:', search_term);
    
    const items = await scrapeVintedWithPlaywright(search_term, minPriceNum, maxPriceNum);
    console.log('Successfully scraped', items.length, 'items from Vinted');
    
    return NextResponse.json(items);
  } catch (error: any) {
    console.error('Scraping failed:', error);
    
    // Check if it's a browser/session error and provide fallback
    if (error.message.includes('Target page, context or browser has been closed') ||
        error.message.includes('Page was closed') ||
        error.message.includes('Browser session ended unexpectedly') ||
        error.message.includes('Executable doesn\'t exist')) {
      
      console.log('Providing fallback data due to browser issues');
      const fallbackData = getFallbackData(search_term, minPriceNum, maxPriceNum);
      
      const response = NextResponse.json(fallbackData);
      response.headers.set('X-Fallback-Data', 'true');
      response.headers.set('X-Fallback-Reason', 'Browser session issues');
      return response;
    }
    
    // For other errors, return proper error message
    let errorMessage = 'Scraping failed';
    let statusCode = 500;
    
    if (error.message.includes('timeout')) {
      errorMessage = 'Scraping timeout - Vinted took too long to load';
      statusCode = 408;
    } else if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      errorMessage = 'Network error - Unable to reach Vinted.com';
      statusCode = 503;
    } else {
      errorMessage = `Scraping failed: ${error.message}`;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
