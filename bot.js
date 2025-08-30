import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { delay } from "./botHumanActions.js";

puppeteer.use(StealthPlugin());

const proxies = ["192.168.0.101:1080"];
let currentProxyIndex = 0;
let nmbOfCaptcha = 0, nmbOfRequests = 0;

let browser; // persistent browser singleton

function rotateProxyIndex() {
  const proxy = proxies[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
  return proxy;
}

async function capturePageScreenshot(page) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await page.screenshot({ path: `screenshot-${timestamp}.png`, fullPage: true });
    console.log("📸 Screenshot captured");
  } catch (err) {
    console.error("❌ Failed to capture screenshot:", err.message);
  }
}

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-gpu",
        "--disable-background-networking",
        "--disable-sync",
        "--disable-translate",
        "--disable-default-apps",
        "--mute-audio",
        "--disable-accelerated-2d-canvas",
        "--disable-accelerated-jpeg-decoding",
        "--disable-software-rasterizer",
        "--no-first-run",
        "--no-zygote",
        "--disable-features=site-per-process,TranslateUI,BlinkGenPropertyTrees",
        "--disable-renderer-backgrounding",
      ],
    });
    console.log("🚀 Browser launched");
  }
  return browser;
}

// Safely capture a screenshot
export async function scrapeHouseholdLimit(url) {
  console.log("📌 Current proxy index:", currentProxyIndex);

  const browser = await getBrowser();
  const page = await browser.newPage();
  let pageClosed = false; // Track page closure

  // Block heavy resources to reduce CPU
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    const type = req.resourceType();
    const blockedDomains = [
      "google-analytics.com",
      "googletagmanager.com",
      "quantserve.com",
      "doubleclick.net",
      "adzerk.net",
    ];
    const isResourceToBlock = ["image", "stylesheet", "font", "media"].includes(type);
    const isDomainToBlock = blockedDomains.some(domain => url.includes(domain));

    if (isResourceToBlock || isDomainToBlock) {
      req.abort();
    } else {
      req.continue();
    }
  });

  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
  const PAGE_TIMEOUT = 45_000; // 45 seconds per page

  try {
    await page.goto(url, { waitUntil: "networkidle0", timeout: PAGE_TIMEOUT });
    await delay(Math.floor(Math.random() * 500) + 300);

    const isCaptcha = await page.evaluate(() => {
      if (document.querySelector('[data-cf-turnstile-response]')) return true;
      if (document.querySelector('.zone-name-title') && document.body.innerText.includes('Verifying you are human')) return true;
      if (document.querySelector('.g-recaptcha')) return true;
      if (document.querySelector('[data-sitekey]')) return true;
      const captchaKeywords = ['captcha', 'verifying you are human', 'just a moment'];
      return captchaKeywords.some(k => document.body.innerText.toLowerCase().includes(k.toLowerCase()));
    });

    if (isCaptcha) {
      console.log("⚠️ CAPTCHA triggered, closing browser to rotate");
      try { await browser.close(); } catch {}
      browser = null;
      return { url, limit: undefined, captcha: true };
    }

    await page.waitForSelector(".sticky-details .attributes .short-details div", { timeout: 30_000 });

    const limit = await page.evaluate(() => {
      let text = document.querySelector(".sticky-details .attributes .short-details div")?.innerText;
      if (!text) return null;
      text = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
      const match = text.match(/Household Order Limit:\s*([\d,]+)/i);
      return match ? parseInt(match[1].replace(/,/g, ""), 10) : null;
    });

    const inStock = await page.evaluate(() => {
      return !document.querySelector(".sticky-details .attributes")?.innerText?.toLowerCase().includes("currently unavailable");
    });

    await page.close();
    pageClosed = true;
    return { url, limit, inStock };

  } catch (err) {
    console.error(`❌ Scraping failed for ${url}:`, err.message);
    // await capturePageScreenshot(page);

    return { url, limit: undefined, error: true, message: err.message };

  } finally {
    if (!pageClosed) {
      try { await page.close(); pageClosed = true; } 
      catch (err) { console.error("❌ Failed to close page:", err.message); }
    }
  }
}

export async function safeScrape(url) {
  try {
    const result = await scrapeHouseholdLimit(url);

    if (result.captcha) {
      rotateProxyIndex();
      nmbOfCaptcha++;
      console.log("⚠️ Number of Captcha triggers: " + nmbOfCaptcha);
      console.log("⏳ Cloudflare detected, retrying in 5s...");
      await delay(5000);
      return safeScrape(url);
    }

    if (result.error) throw new Error(result.message || "Unexpected error happened");

    nmbOfRequests++;
    console.log("✅ Number of requests: " + nmbOfRequests);
    return result;

  } catch (err) {
    rotateProxyIndex();
    console.log("🔄 Retrying in 5 seconds due to error:", err.message);
    await delay(5000);
    return safeScrape(url);
  }
}
