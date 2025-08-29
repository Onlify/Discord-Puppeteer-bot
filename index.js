import { safeScrape } from "./bot.js"; // safeScrape handles Cloudflare retries
import client from "./discord.js";
import { randomDelay } from "./utils.js";

const alertChannelId = "1409862539889872999"; 

// URLs object
const URLS = {
  urlOne: {
    url: "https://www.usmint.gov/american-liberty-2025-high-relief-gold-coin-25DA.html",
    mode: "BOTH",
    alerted: false,
  },
  urlTwo: {
    url: "https://www.usmint.gov/2025-laser-engraved-american-eagle-one-ounce-silver-proof-coin-25EALE.html/",
    mode: "BOTH",
    alerted: false,
  },
};

// ---------- Discord command handling ----------
client.on("messageCreate", async (message) => {
  try {
    message.content = message.content.trim();

    if (message.content === "!help") {
      message.reply(
        "`!url1 <mode> <url>` → set urlOne\n" +
        "`!url2 <mode> <url>` → set urlTwo\n" +
        "`!url1` → clear urlOne\n" +
        "`!url2` → clear urlTwo\n" +
        "`!listurls` → show currently active URLs\n" 
      );

    } else if (message.content.startsWith("!url1")) {
      const args = message.content.split(" ");
      const mode = args[1]?.toUpperCase(); 
      const url = args[2];

      if (args.length !== 3) {
        URLS.urlOne = { url: null, mode: null };
        message.reply(`\`URL 1\` -> (mode: ${URLS.urlOne.mode}) ${URLS.urlOne.url}`);
        return;
      }

      if (!mode || !url) {
        message.reply("Wrong format. -> !url1 <mode> <url>");
        return;
      } else if (mode !== "HHL" && mode !== "INSTOCK" && mode !== "BOTH") {
        message.reply("Mode can only be `HHL`, `INSTOCK`, or `BOTH`");
        return;
      }

      URLS.urlOne.url = url;
      URLS.urlOne.mode = mode;
      URLS.urlOne.alerted = false;
      message.reply(`\`URL 1\` -> (mode: ${URLS.urlOne.mode}) ${URLS.urlOne.url}`);

    } else if (message.content.startsWith("!url2")) {
      const args = message.content.split(" ");
      const mode = args[1]?.toUpperCase(); 
      const url = args[2];

      if (args.length !== 3) {
        URLS.urlTwo = { url: null, mode: null };
        message.reply(`\`URL 2\` -> (mode: ${URLS.urlTwo.mode}) ${URLS.urlTwo.url}`);
        return;
      }

      if (!mode || !url) {
        message.reply("Wrong format. -> !url2 <mode> <url>");
        return;
      } else if (mode !== "HHL" && mode !== "INSTOCK" && mode !== "BOTH") {
        message.reply("Mode can only be `HHL`, `INSTOCK`, or `BOTH`");
        return;
      }

      URLS.urlTwo.url = url;
      URLS.urlTwo.mode = mode;
      URLS.urlTwo.alerted = false;
      message.reply(`\`URL 2\` -> (mode: ${URLS.urlTwo.mode}) ${URLS.urlTwo.url}`);

    } else if (message.content === "!listurls") {
      message.reply(
        `\`URL 1\` -> (mode: ${URLS.urlOne.mode}) ${URLS.urlOne.url}\n` +
        `\`URL 2\` -> (mode: ${URLS.urlTwo.mode}) ${URLS.urlTwo.url}`
      );
    }
  } catch (err) {
    console.error("Error handling message:", err);
    message.reply("⚠️ An unexpected error occurred. Please try again or make sure you're using a proper command.");
  }
});


// ---------- Log in Discord ----------
client.login(process.env.DISCORD_TOKEN);

// ---------- Alternating scraper logic ----------
let toggle = true; // true = urlOne, false = urlTwo
async function runAlternatingScraper() {
  const MIN_INTERVAL = 30 * 1000; // 30s
  const MAX_INTERVAL = 35 * 1000; // 45s
  const key = toggle ? "urlOne" : "urlTwo";
  toggle = !toggle; // flip for next run

  const { url, mode } = URLS[key];

  if (!url) return;

  try {
    const result = await safeScrape(url);
    console.log(result);

    const channel = client.channels.cache.get(alertChannelId);

    if (channel && channel.isTextBased()) {
      // HHL mode
      if (mode === "HHL") {
        if (result.limit !== null) {
          // Condition failed, reset alerted
          URLS[key].alerted = false;
        } else if (!URLS[key].alerted) {
          channel.send("Household limit has been lifted! -> " + url);
          URLS[key].alerted = true;
          return;
        }
      }

      // INSTOCK mode
      if (mode === "INSTOCK") {
        if (!result.inStock) {
          // Condition failed, reset alerted
          URLS[key].alerted = false;
        } else if (!URLS[key].alerted) {
          channel.send("Product is in stock! -> " + url);
          URLS[key].alerted = true;
          return;
        }
      }

      // BOTH mode
      if (mode === "BOTH") {
        if (result.limit !== null || !result.inStock) {
          // Condition failed, reset alerted
          URLS[key].alerted = false;
        } else if (!URLS[key].alerted) {
          channel.send(
            "Household order limit has been lifted and product is in stock! -> " + url
          );
          URLS[key].alerted = true;
          return;
        }
      }
    } else {
      console.error("Channel not found or not text-based");
    }

  } catch (err) {
    console.error(`Error scraping ${key}:`, err.message);
  }finally{
    // console.log(URLS);
    // Schedule next run with random delay
    const nextRun = randomDelay(MIN_INTERVAL, MAX_INTERVAL);
    console.log(`⏳ Next run in ${(nextRun / 1000).toFixed(1)}s...`);
    setTimeout(runAlternatingScraper, nextRun);
  }
}

console.log(new Date());

// Start first scrape
runAlternatingScraper();
