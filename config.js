/* ZYPHRA site config. Every link and number on the page reads from here.
   CA     Solana mint address. Empty = "CA posts at launch"; Buy / Chart wait for it.
   BUY    Empty = https://pump.fun/coin/<CA>
   CHART  Empty = https://gmgn.ai/sol/token/<CA>
   X      Full https://x.com/... link. Empty = "at launch".
   LOGO   Logo image path or URL (svg/png/webp). Also used as the favicon.
   CREATOR_FEE_PCT  Example creator fee % used as the calculator default.
   MIN_HOLD         Minimum $ZYPHRA held at the hourly snapshot to qualify.
   MIN_PAYOUT_ZEC   Payouts below this roll over to the next hour.
   SUPPLY           Total token supply. */
window.ZYPHRA_CFG = {
  NAME: "ZYPHRA",
  TICKER: "ZYPHRA",
  CA: "",
  CHAIN: "solana",
  PAD: "pumpfun",
  X: "",
  BUY: "",
  CHART: "",
  LOGO: "logo.svg",
  CREATOR_FEE_PCT: 0.3,
  MIN_HOLD: 500000,
  MIN_PAYOUT_ZEC: 0.001,
  SUPPLY: 1000000000
};
