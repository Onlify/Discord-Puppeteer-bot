// Lightweight human-like behavior to avoid Cloudflare detection

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.96 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:118.0) Gecko/20100101 Firefox/118.0"
];

// Random User Agent
export function randomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Small helper for delays
export function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// Simulate lightweight human scrolling
export async function humanScroll(page, times = 2) {
  for (let i = 0; i < times; i++) {
    const y = Math.floor(Math.random() * 100) + 50;
    await page.evaluate(y => window.scrollBy(0, y), y);
    await delay(Math.floor(Math.random() * 300) + 200); // 0.2–0.5s pause
  }
}

// Simulate lightweight human mouse movements
export async function humanMouse(page) {
  const width = await page.evaluate(() => window.innerWidth);
  const height = await page.evaluate(() => window.innerHeight);

  for (let i = 0; i < 3; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    await page.mouse.move(x, y, { steps: 5 });
    await delay(Math.floor(Math.random() * 200) + 100); // 0.1–0.3s pause
  }
}
