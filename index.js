import axios from "axios"; // npm install axios

async function getHouseholdLimit() {
  try {
    const res = await axios.get("https://www.usmint.gov/2025-laser-engraved-american-eagle-one-ounce-silver-proof-coin-25EALE.html/");
    const data = res.data;
    const householdLimit = data?.productLimits?.householdLimit;
    return householdLimit;
  } catch (err) {
    console.error("Error fetching household limit:", err.message);
  }
}

getHouseholdLimit().then(limit => console.log(limit));