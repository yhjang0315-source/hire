// 기획안 PDF 빌드: node build.js
// 1) src/figures.html의 그림을 images/*.png로 저장
// 2) src/proposal.html을 A4 PDF로 변환, 쪽별 넘침 검사
// 폰트: fonts/ 폴더에 Pretendard OTF 필요 (npm pack pretendard 후 dist/public/static에서 복사)
const path = require("path");
const fs = require("fs");
let playwright;
try { playwright = require("playwright"); } catch { playwright = require("/opt/node22/lib/node_modules/playwright"); }

const ROOT = __dirname;
const url = (f) => "file://" + path.join(ROOT, "src", f);
const OUT_PDF = path.join(ROOT, "career_ladder_proposal.pdf");

(async () => {
  const browser = await playwright.chromium.launch({ executablePath: fs.existsSync("/opt/pw-browsers/chromium") ? undefined : undefined });
  const ctx = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1500, height: 1000 } });
  const page = await ctx.newPage();

  await page.goto(url("figures.html"));
  await page.evaluate(() => document.fonts.ready);
  for (const id of ["fig1", "fig2", "fig3", "fig4", "fig5", "fig6", "fig7", "fig8", "fig9"]) {
    await page.locator("#" + id).screenshot({ path: path.join(ROOT, "images", id + ".png") });
  }
  console.log("figures ok");

  if (process.argv.includes("--figs-only")) { await browser.close(); return; }

  await page.goto(url("proposal.html"));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll(".page")].map((p, i) => {
      const inner = p.querySelector(".content");
      return { page: i + 1, over: inner.scrollHeight - inner.clientHeight };
    })
  );
  console.log(JSON.stringify(overflow));
  await page.pdf({ path: OUT_PDF, preferCSSPageSize: true, printBackground: true });
  if (process.argv.includes("--shots")) {
    const pages = await page.locator(".page").all();
    for (let i = 0; i < pages.length; i++) {
      await pages[i].screenshot({ path: path.join(process.env.SHOT_DIR || "/tmp", `page${i + 1}.png`) });
    }
  }
  console.log("pdf ok:", OUT_PDF);
  await browser.close();
})();
