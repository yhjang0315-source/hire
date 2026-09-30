// 아이디어 설명 자료(1쪽 PDF) 빌드: node build.js [--shot]
// 폰트: fonts/ 폴더에 Pretendard OTF 필요 (docs/proposal/README.md 참고)
const path = require("path");
let playwright;
try { playwright = require("playwright"); } catch { playwright = require("/opt/node22/lib/node_modules/playwright"); }

const ROOT = __dirname;
const OUT_PDF = path.join(ROOT, "magam_mate_onepager.pdf");

(async () => {
  const browser = await playwright.chromium.launch();
  const page = await (await browser.newContext({ deviceScaleFactor: 2 })).newPage();
  await page.goto("file://" + path.join(ROOT, "onepager.html"));
  await page.evaluate(() => document.fonts.ready);
  const over = await page.evaluate(() => {
    const p = document.querySelector(".page");
    const last = [...p.querySelectorAll(".content > *")].pop();
    return Math.round(last.getBoundingClientRect().bottom - (p.getBoundingClientRect().bottom - parseFloat(getComputedStyle(p).paddingBottom)));
  });
  console.log(JSON.stringify({ over }));
  await page.pdf({ path: OUT_PDF, preferCSSPageSize: true, printBackground: true });
  if (process.argv.includes("--shot")) {
    await page.locator(".page").screenshot({ path: path.join(process.env.SHOT_DIR || "/tmp", "onepager.png") });
  }
  console.log("pdf ok:", OUT_PDF);
  await browser.close();
})();
