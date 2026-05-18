// @ts-check
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,   // sıralı çalıştır — aynı oturum paylaşılıyor
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],
  webServer: [
    {
      command: 'cmd.exe /d /c call scripts\\run_backend_local.cmd',
      url: 'http://127.0.0.1:8000/health',
      timeout: 180_000,
      reuseExistingServer: true,
    },
    {
      command: 'cmd.exe /d /c call scripts\\run_frontend_local.cmd',
      url: 'http://127.0.0.1:5173',
      timeout: 120_000,
      reuseExistingServer: true,
    },
  ],

  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'off',
    // konsol hatalarını yakala
    ignoreHTTPSErrors: true,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
