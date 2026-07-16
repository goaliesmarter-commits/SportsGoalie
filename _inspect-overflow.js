const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1900, height: 950 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  const metrics = await page.evaluate(() => {
    const innerWidth = window.innerWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;

    const all = Array.from(document.querySelectorAll('body *'));
    const offenders = [];
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.right > innerWidth + 1 && r.width > 0) {
        offenders.push({
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 80),
          right: Math.round(r.right),
          width: Math.round(r.width),
          left: Math.round(r.left),
        });
      }
    }
    offenders.sort((a, b) => b.right - a.right);

    const heroSection = document.querySelector('section');
    const heroRect = heroSection ? heroSection.getBoundingClientRect() : null;

    return {
      innerWidth,
      scrollWidth,
      bodyScrollWidth,
      offendersTop10: offenders.slice(0, 10),
      heroRect: heroRect ? { left: heroRect.left, right: heroRect.right, width: heroRect.width } : null,
    };
  });

  console.log(JSON.stringify(metrics, null, 2));

  await page.screenshot({ path: 'C:/Users/hp/Desktop/projects/sports_goalie/SportsGoalie/_hero-check.png', clip: { x: 0, y: 0, width: 1900, height: 950 } });
  await page.screenshot({ path: 'C:/Users/hp/Desktop/projects/sports_goalie/SportsGoalie/_hero-edge.png', clip: { x: 1780, y: 0, width: 120, height: 950 } });

  await browser.close();
})();
