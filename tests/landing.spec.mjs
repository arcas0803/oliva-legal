import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const widths = [320, 375, 768, 1440, 1920];
for (const width of widths) {
  test(`Responsive layout and accessibility at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator('h1')).toBeVisible();
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    await mkdir('audits', { recursive: true });
    await writeFile(`audits/axe-${width}.json`, JSON.stringify(scan, null, 2));
    expect(scan.violations).toEqual([]);
    await page.screenshot({
      path: `docs/screenshots/${width}.png`,
      fullPage: true,
    });
  });
}
test('Contact flow: inline errors, selection and honest confirmation', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Personas y familias/ }).click();
  await expect(page.locator('#area')).toHaveValue('Personas y familias');
  await page.getByRole('button', { name: 'Probar la consulta' }).click();
  await expect(page.locator('#name')).toBeFocused();
  await expect(page.locator('#name-error')).toBeVisible();
  await page.locator('#name').fill('Persona de prueba');
  await page.locator('#email').fill('incorrecto');
  await page.getByRole('button', { name: 'Probar la consulta' }).click();
  await expect(page.locator('#email')).toBeFocused();
  await page.locator('#email').fill('demo@example.com');
  await page.locator('#consent').check();
  const requests = [];
  page.on('request', (r) => requests.push(r.method()));
  await page.getByRole('button', { name: 'Probar la consulta' }).click();
  await expect(page.getByRole('status')).toContainText(
    'No se ha enviado ninguna solicitud',
  );
  await expect(page.getByRole('status')).toBeFocused();
  expect(requests.filter((m) => m === 'POST')).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0);
  await expect(page.locator('#name')).toHaveValue('');
  await page.screenshot({
    path: 'docs/screenshots/form-success.png',
    fullPage: true,
  });
});
test('Mobile menu, FAQ, dialogs and keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Saltar al contenido')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const toggle = page.getByRole('button', { name: 'Menú' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await page.getByRole('link', { name: 'Cómo trabajamos' }).click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page
    .locator('summary')
    .filter({ hasText: '¿Cómo es la primera conversación?' })
    .click();
  await expect(page.locator('details').first()).toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Privacidad', exact: true }).click();
  await expect(page.locator('#privacy')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#privacy')).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Privacidad', exact: true }),
  ).toBeFocused();
});
test('Reduced motion and enlarged text reflow', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 768, height: 950 });
  await page.goto('/');
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe('auto');
  await page.addStyleTag({ content: 'body{font-size:200%}' });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test('No JavaScript keeps content and navigation available', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4377/');
  await expect(
    page.getByRole('link', { name: 'Áreas de práctica', exact: true }),
  ).toBeVisible();
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('noscript p')).toBeVisible();
  await context.close();
});
