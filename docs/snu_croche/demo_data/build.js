// 시연용 가상 자료 빌드: node build.js
// 폰트: ../onepager/fonts 에 Pretendard OTF 필요
const path = require("path");
let playwright;
try { playwright = require("playwright"); } catch { playwright = require("/opt/node22/lib/node_modules/playwright"); }

const SRC = path.join(__dirname, "src");
const OUT = path.join(__dirname, "files");

(async () => {
  require("fs").mkdirSync(OUT, { recursive: true });
  const browser = await playwright.chromium.launch();
  const page = await (await browser.newContext({ deviceScaleFactor: 2 })).newPage();
  const open = async (f) => { await page.goto("file://" + path.join(SRC, f)); await page.evaluate(() => document.fonts.ready); };

  for (const [src, out] of [["report.html", "report_management.pdf"], ["coding.html", "coding_ds_hw3.pdf"]]) {
    await open(src);
    await page.pdf({ path: path.join(OUT, out), preferCSSPageSize: true, printBackground: true });
  }
  for (const [src, out] of [["lecture.html", "lecture_stats_week7.png"], ["timetable.html", "timetable.png"]]) {
    await open(src);
    await page.locator("#cap").screenshot({ path: path.join(OUT, out) });
  }
  console.log("ok:", OUT);
  await browser.close();
})();
