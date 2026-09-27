import { defineConfig, devices } from '@playwright/test'

const PORT = 3100

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: {
      // ブラウザを別途インストール済みの環境では、そのパスを指定できる
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined
    }
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    // AIの呼び出しはテスト内で差し替えるため、キーはダミーでよい
    env: { OPENAI_API_KEY: 'test', ANTHROPIC_API_KEY: 'test', GEMINI_API_KEY: '', DEEPSEEK_API_KEY: '' }
  }
})
