import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { randomUserAgent, delay, humanScroll, humanMouse} from "./botHumanActions.js";
puppeteer.use(StealthPlugin());
//  "192.168.0.106:1080"
// `--proxy-server=socks5://${proxies[currentProxyIndex]}`
const proxies = [ "192.168.0.101:1080" ];

let currentProxyIndex = 0; 
let nmbOfCaptcha = 0, nmbOfRequests = 0;;
function rotateProxyIndex() { 
  const proxy = proxies[currentProxyIndex]; 
  currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
  return proxy;
}

export async function scrapeHouseholdLimit(url) {
  console.log(currentProxyIndex);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", ]
  });

  const page = await browser.newPage();

  // random user agent
  
  await page.setUserAgent(randomUserAgent());
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

  // randomize viewport slightly
  await page.setViewport({
    width: Math.floor(1024 + Math.random() * 100),
    height: Math.floor(768 + Math.random() * 100),
  });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // human-like interaction before scraping
    await humanMouse(page);
    await humanScroll(page, 4);
    await delay(Math.floor(Math.random() * 1000) + 500); // 0.5–1.5s pause
    
    //Check for captcha
    const isCaptcha = await page.evaluate(() => {
        // Cloudflare Turnstile
        if (document.querySelector('[data-cf-turnstile-response]')) return true;

        // Cloudflare "Checking your browser"
        if (document.querySelector('.zone-name-title') &&
            document.body.innerText.includes('Verifying you are human')) return true;

        // Google reCAPTCHA v2
        if (document.querySelector('.g-recaptcha')) return true;

        // reCAPTCHA v3 invisible
        if (document.querySelector('[data-sitekey]')) return true;

        // Generic text detection
        const captchaKeywords = ['captcha', 'verifying you are human', 'just a moment'];
        return captchaKeywords.some(k => document.body.innerText.toLowerCase().includes(k.toLowerCase()));
    });

    if (isCaptcha) {
      console.log('CAPTCHA triggered');
      return {url, limit: undefined, captcha: true };
    }

    //----------------------
    await page.waitForSelector(".sticky-details .attributes .short-details div", { timeout: 10_000 });

    const limit = await page.evaluate(() => {
      let text = document.querySelector(".sticky-details .attributes .short-details div")?.innerText;
      if (!text) return null;

      text = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
      const match = text.match(/Household Order Limit:\s*([\d,]+)/i);
      return match ? parseInt(match[1].replace(/,/g, ""), 10) : null;
    });

    const inStock = await page.evaluate(()=>{
      return !document.querySelector(".sticky-details .attributes")?.innerText?.toLowerCase().includes("currently unavailable")
    })
    
    return { url, limit, inStock };

  } catch (err) {
   try {
    if (page && !page.isClosed()) {
      await page.screenshot({ path: "screenshot.png", fullPage: true });
    }
  } catch (screenshotErr) {
    console.error("Screenshot failed:", screenshotErr.message);
  }
  console.error(`Scraping failed for ${url}:`, err.message);
  return { url, limit: undefined, error: true };
  } finally {
    await browser.close();
  }
}

// ---------- safe scraper wrapper ----------
export async function safeScrape(url) {
  try {
    const result = await scrapeHouseholdLimit(url);

    // detect possible Cloudflare block
    if (result.captcha) {
      rotateProxyIndex();
      nmbOfCaptcha++;
      console.log("Number of Captcha triggers: " + nmbOfCaptcha);
      console.log("⚠️ Cloudflare or unexpected page detected, retrying in 5s...");
      await delay(5000); // wait 5 seconds
      return safeScrape(url); // retry
    }
    if(result.error)
      throw new Error("Unexpected error happened");

    nmbOfRequests++;
    console.log("Number of requests : " + nmbOfRequests);
    return result;
  } catch (err) {
    rotateProxyIndex();
    await delay(5000);
    return safeScrape(url); // retry
  }
}

