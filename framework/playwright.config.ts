// Carga las variables de entorno desde el archivo .env.{TEST_ENV}
import './src/config/env';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['dot'], ['allure-playwright'], ['github']]
    : [['list'], ['allure-playwright']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
