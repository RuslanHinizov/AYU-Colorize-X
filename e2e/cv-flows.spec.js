import { expect, test } from '@playwright/test';
import path from 'node:path';

const API_URL = 'http://127.0.0.1:8000/api';
const password = 'password123';

test.setTimeout(1_200_000);

async function login(page, email) {
  await page.goto('/login');
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);
}

async function runImageFlow(page, route, filePath, resultSelector) {
  await page.goto(route);
  await expect(page.locator('input[type="file"]')).toBeAttached();
  await page.locator('input[type="file"]').setInputFiles(filePath);
  await expect(page.locator('img[alt="Preview"]')).toBeVisible();
  await page.locator('button.btn-primary').last().click();
  await expect(page.locator(resultSelector)).toBeVisible({ timeout: 900_000 });
}

async function runVideoFlow(page, filePath) {
  await page.goto('/video');
  await expect(page.locator('input[type="file"]')).toBeAttached();
  await page.locator('input[type="file"]').setInputFiles(filePath);
  await expect(page.locator('video').first()).toBeVisible();
  await page.locator('button.btn-primary').last().click();
  await expect(page.locator('video[src*="media/outputs"]').first()).toBeVisible({ timeout: 900_000 });
}

test('login and complete all CV editor flows from the frontend', async ({ page, request }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const imagePath = path.resolve('backend/e2e_assets/gray_test.jpg');
  const videoPath = path.resolve('backend/e2e_assets/gray_test.mp4');

  const register = await request.post(`${API_URL}/auth/register`, {
    data: { email, password },
  });
  expect([200, 400]).toContain(register.status());

  await login(page, email);

  await runImageFlow(page, '/photo', imagePath, 'img[alt="After"]');
  await runImageFlow(page, '/restore', imagePath, 'img[alt="After"]');
  await runImageFlow(page, '/upscale', imagePath, 'img[alt="After"]');
  await runVideoFlow(page, videoPath);
});
