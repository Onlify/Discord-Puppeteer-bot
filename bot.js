import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

async function scrapeHouseholdLimit(url) {
  const browser = await puppeteer.launch({
    headless: true, // switch to false if you want to see the browser
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".sticky-details .attributes .short-details div", { timeout: 10_000 });

    const limit = await page.evaluate(() => {
      let text = document.querySelector(".sticky-details .attributes .short-details div")?.innerText;
      if (!text) return null;

      text = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
      const match = text.match(/Household Order Limit:\s*([\d,]+)/i);
      return match ? parseInt(match[1].replace(/,/g, ""), 10) : null;
    });

    return { url, limit };

  } catch (err) {
    console.error(`Scraping failed for ${url}:`, err.message);
    return { url, limit: null };

  } finally {
    await browser.close();
  }
}
export default scrapeHouseholdLimit;
