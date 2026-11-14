import { expect, test, type Page } from '@playwright/test';

const QUIET = { sound: false, voice: false, countAloud: true, stepMode: 'single', baseplate: null, allowSwap: true, target: 6 };

async function fresh(page: Page, settings: object = QUIET) {
  await page.goto('/');
  await page.evaluate((s) => {
    localStorage.clear();
    localStorage.setItem('duplify-settings', JSON.stringify({ state: s, version: 1 }));
  }, settings);
  await page.reload();
  await expect(page.getByTestId('go-ideas')).toBeVisible();
}

async function holdParentLock(page: Page, ms: number) {
  const box = (await page.getByTestId('parent-lock').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/** Prüft, ob die 3D-Fläche wirklich etwas zeigt (nicht einfarbig). */
async function canvasHasContent(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return false;
    const tmp = document.createElement('canvas');
    tmp.width = 64;
    tmp.height = 64;
    const ctx = tmp.getContext('2d')!;
    ctx.drawImage(c, 0, 0, 64, 64);
    const d = ctx.getImageData(0, 0, 64, 64).data;
    const seen = new Set<string>();
    for (let i = 0; i < d.length; i += 4) seen.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
    return seen.size > 12;
  });
}

test('Eltern-Sperre öffnet erst nach langem Halten', async ({ page }) => {
  await fresh(page);
  await holdParentLock(page, 600);
  await page.waitForTimeout(300);
  expect(page.url()).not.toContain('eltern');
  await holdParentLock(page, 3400);
  await expect(page).toHaveURL(/#\/eltern/);
  await expect(page.getByTestId('to-inventory')).toBeVisible();
});

test('Steine-Kiste: Antippen zählt hoch und bleibt nach dem Neuladen', async ({ page }) => {
  await fresh(page);
  await page.goto('/#/eltern/kiste');
  await page.locator('[data-testid=tile-brick-2x4] .inv-add').click();
  await page.locator('[data-testid=tile-brick-2x4] .inv-add').click();
  await page.getByTestId('color-gelb').click();
  await page.locator('[data-testid=tile-brick-2x4-eyes] .inv-add').click();
  await expect(page.getByTestId('inv-total')).toHaveText('3 Teile in der Kiste');
  await page.reload();
  await expect(page.getByTestId('inv-total')).toHaveText('3 Teile in der Kiste');
});

test('Steine-Kiste: kompletten Katalog durchsuchen und Originalteile eintragen', async ({ page }) => {
  await fresh(page);
  await page.goto('/#/eltern/kiste');
  // Suche (deutsch + Maße) findet den großen Bogen
  await page.getByTestId('inv-search').fill('Bogen 2 x 10');
  const arch = page.getByTestId('tile-ld-51704');
  await expect(arch).toBeVisible();
  await arch.locator('.inv-add').click();
  await expect(arch.getByTestId('count')).toHaveText('1');
  // Kategorie „Platten“
  await page.getByTestId('inv-search').fill('');
  await page.getByTestId('inv-cat-platten').click();
  await page.locator('[data-testid=tile-ld-40666] .inv-add').click();
  await expect(page.getByTestId('inv-total')).toHaveText('2 Teile in der Kiste');
  // Übersicht zeigt beide
  await page.getByTestId('inv-cat-liste').click();
  await expect(page.locator('.inv-list-row')).toHaveCount(2);
  await expect(page.locator('.inv-list')).toContainText('Platte 2 x 4');
});

test('Über & Lizenzen nennt die LDraw-Bibliothek und alle Autoren', async ({ page }) => {
  await fresh(page);
  await page.goto('/#/eltern/lizenzen');
  await expect(page.getByTestId('about')).toContainText('LDraw.org Parts Library');
  await expect(page.getByTestId('about')).toContainText('CC BY 4.0');
  const href = await page.getByTestId('credits-link').getAttribute('href');
  const res = await page.request.get(new URL(href!, page.url()).toString());
  expect(res.ok()).toBe(true);
  expect(await res.text()).toContain('Autorinnen und Autoren');
});

test('Ablauf: Beispiel-Kiste → Idee → bauen → fertig → Meine Bauwerke', async ({ page }) => {
  await fresh(page);
  await page.getByTestId('go-ideas').click();
  await page.getByTestId('load-sample').click();
  const cards = page.getByTestId('idea-card');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThanOrEqual(2);
  await cards.first().click();
  await expect(page.getByTestId('start')).toBeVisible();
  await page.waitForTimeout(800);
  expect(await canvasHasContent(page)).toBe(true);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('part-card')).toBeVisible();
  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId('done').isVisible()) break;
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('done')).toBeVisible();
  await page.getByTestId('home').click();
  await page.getByTestId('go-gallery').click();
  await expect(page.getByTestId('gallery-card')).toHaveCount(1);
  await page.reload();
  await expect(page.getByTestId('gallery-card')).toHaveCount(1);
});

test('Größen-Regler: mehr Steine → größere Bauwerke', async ({ page }) => {
  await fresh(page, { ...QUIET, target: 5 });
  await page.getByTestId('go-ideas').click();
  await page.getByTestId('load-sample').click();
  await expect(page.getByTestId('idea-card').first()).toBeVisible();
  const small = await page.locator('[data-testid=idea-card] .idea-count').first().textContent();
  await page.getByRole('button', { name: '40 Steine' }).click();
  await expect(page.getByTestId('size-slider')).toContainText('40');
  await expect(async () => {
    const big = await page.locator('[data-testid=idea-card] .idea-count').first().textContent();
    expect(Number(big)).toBeGreaterThan(Number(small) * 3);
  }).toPass({ timeout: 10_000 });
});

test('Läuft nach dem ersten Besuch auch offline', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'tablet', 'einmal reicht');
  await fresh(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('go-ideas')).toBeVisible();
  await page.getByTestId('go-ideas').click();
  await page.getByTestId('load-sample').click();
  await expect(page.getByTestId('idea-card').first()).toBeVisible();
  await context.setOffline(false);
});
