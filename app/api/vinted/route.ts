import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

interface Item {
  title?: string;
  price?: string;
  image?: string;
  url?: string;
}

async function scrapeVinted(searchTerm: string, minPrice?: number, maxPrice?: number): Promise<Item[]> {
  let browser;
  try {
    // Launch browser
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Base URL for search
    let url = `https://www.vinted.com/catalog?search_text=${encodeURIComponent(searchTerm)}`;
    
    if (minPrice !== undefined) {
      url += `&price_from=${minPrice}`;
    }
    if (maxPrice !== undefined) {
      url += `&price_to=${maxPrice}`;
    }
    
    // Navigate and wait for content
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Wait for items to load
    await page.waitForSelector('.feed-grid__item', { timeout: 10000 });
    
    // Extract item data using updated selectors
    const itemsData = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.feed-grid__item')).map(el => {
        // Try multiple selectors for robustness
        const titleEl = el.querySelector('[data-testid$="--description-title"]') || el.querySelector('.web_ui__Text__text');
        const priceEl = el.querySelector('[data-testid$="--price-text"]') || el.querySelector('.web_ui__Text__text--muted');
        const imgEl = el.querySelector('.new-item-box__image img') || el.querySelector('img');
        
        // Fallback to overlay title if specific elements are missing
        const overlayEl = el.querySelector('.new-item-box__overlay') as HTMLAnchorElement;
        const overlayTitle = overlayEl ? overlayEl.getAttribute('title') : null;
        const itemUrl = overlayEl ? overlayEl.href : null;

        return {
          title: titleEl ? (titleEl as HTMLElement).innerText : (overlayTitle || null),
          price: priceEl ? (priceEl as HTMLElement).innerText : null,
          image: imgEl ? (imgEl as HTMLImageElement).src : null,
          url: itemUrl
        };
      });
    });
    
    // Filter out items that might be null/empty if selectors failed
    const cleanItems: Item[] = [];
    for (const item of itemsData) {
      if (item.title || item.price || item.image || item.url) {
        cleanItems.push({
          title: item.title || undefined,
          price: item.price || undefined,
          image: item.image || undefined,
          url: item.url || undefined
        });
      }
    }
    
    return cleanItems;
    
  } catch (error) {
    console.error('Error during scraping:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
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
  
  try {
    const minPriceNum = min_price ? parseFloat(min_price) : undefined;
    const maxPriceNum = max_price ? parseFloat(max_price) : undefined;
    
    const items = await scrapeVinted(search_term, minPriceNum, maxPriceNum);
    
    return NextResponse.json(items);
  } catch (error: any) {
    console.error('Scraping failed:', error);
    return NextResponse.json(
      { error: `Scraping failed: ${error.message}` },
      { status: 500 }
    );
  }
}
