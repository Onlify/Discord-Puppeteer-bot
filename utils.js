// small helper for delays so the bot waits
export function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// Helper for random delay between min and max -> ex: random number between 30 seconds to 45 seconds
export function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
