// Filled with human like behaviour to avoid being detected by cloudflare


const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.96 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:118.0) Gecko/20100101 Firefox/118.0"
];

//Random User Agent
export function randomUserAgent(){
    return  userAgents[Math.floor(Math.random() * userAgents.length)];
}
// small helper for delays
export function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// simulate human-like scrolling
export async function humanScroll(page, times = 3) {
  for (let i = 0; i < times; i++) {
    const y = Math.floor(Math.random() * 200) + 100;
    await page.evaluate(y => window.scrollBy(0, y), y);
    await delay(Math.floor(Math.random() * 500) + 500); // 0.5–1s pause
  }
}

// simulate human-like mouse movements
export async function humanMouse(page) {
  const width = await page.evaluate(() => window.innerWidth);
  const height = await page.evaluate(() => window.innerHeight);

  for (let i = 0; i < 5; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    await page.mouse.move(x, y, { steps: 10 });
    await delay(Math.floor(Math.random() * 300) + 200); // 0.2–0.5s pause
  }
}

