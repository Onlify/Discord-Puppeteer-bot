import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { delay } from "./botHumanActions.js";

puppeteer.use(StealthPlugin());

const proxies = ["192.168.0.101:1080"];
let currentProxyIndex = 0;
let nmbOfCaptcha = 0, nmbOfRequests = 0;

let browser; // persistent browser instance

function rotateProxyIndex() {
  const proxy = proxies[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
  return proxy;
}

async function getBrowser() {
  if (!browser || !browser.isConnected?.()) {
    browser = await puppeteer.launch({
      headless: false,
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
      ]
    });
  }
  return browser;
}

async function capturePageScreenshot(page, prefix = "fail") {
  try {
    await page.screenshot({
      path: `screenshots/${prefix}-${Date.now()}.png`,
      fullPage: true
    });
    console.log("Screenshot saved for debugging");
  } catch (e) {
    console.error("Screenshot failed:", e.message);
  }
}

export async function scrapeHouseholdLimit(url) {
  console.log("Current proxy index:", currentProxyIndex);

  const browser = await getBrowser();
  const page = await browser.newPage();

  // Reduce CPU usage
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const type = req.resourceType();
    if (["image", "stylesheet", "font"].includes(type)) req.abort();
    else req.continue();
  });

  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

  const HARD_TIMEOUT = 45_0000; // 45 seconds

  try {
    await Promise.race([
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`⚠️ Scrape timed out for ${url}`)), HARD_TIMEOUT)
      ),
      page.goto(url, { waitUntil: "domcontentloaded", timeout: HARD_TIMEOUT }),
    ]);

    await delay(Math.floor(Math.random() * 500) + 300);

    // CAPTCHA detection
    const isCaptcha = await page.evaluate(() => {
      if (document.querySelector('[data-cf-turnstile-response]')) return true;
      if (document.querySelector('.zone-name-title') && document.body.innerText.includes('Verifying you are human')) return true;
      if (document.querySelector('.g-recaptcha')) return true;
      if (document.querySelector('[data-sitekey]')) return true;
      const captchaKeywords = ['captcha', 'verifying you are human', 'just a moment'];
      return captchaKeywords.some(k => document.body.innerText.toLowerCase().includes(k.toLowerCase()));
    });

    if (isCaptcha) {
      console.log("CAPTCHA triggered, taking screenshot and closing browser");
      await capturePageScreenshot(page, "captcha");
      try { await browser.close(); } catch {}
      browser = null;
      return { url, limit: undefined, captcha: true };
    }

    // Wait for selector
    await page.waitForSelector(".sticky-details .attributes .short-details div", { timeout: 20_000 });

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
    return { url, limit, inStock };

  } catch (err) {
    console.error(`Scraping failed for ${url}:`, err.message);

    await capturePageScreenshot(page);

    try { await page.close(); } catch {}

    return { url, limit: undefined, error: true, message: err.message };
  }
}

export async function safeScrape(url) {
  try {
    const result = await scrapeHouseholdLimit(url);

    if (result.captcha) {
      rotateProxyIndex();
      nmbOfCaptcha++;
      console.log("Number of Captcha triggers: " + nmbOfCaptcha);
      console.log("⚠️ Cloudflare detected, retrying in 5s...");
      await delay(5000);
      return safeScrape(url);
    }

    if (result.error) throw new Error(result.message || "Unexpected error happened");

    nmbOfRequests++;
    console.log("Number of requests: " + nmbOfRequests);
    return result;

  } catch (err) {
    rotateProxyIndex();
    await delay(5000);
    return safeScrape(url);
  }
}
