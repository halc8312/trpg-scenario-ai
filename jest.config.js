const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  // ロジック部分（src/lib）のカバレッジを計測する。画面全体の動作はE2Eテストで確認する
  collectCoverageFrom: ['src/lib/**/*.{ts,tsx}', '!src/lib/**/*.d.ts'],
  coverageThreshold: {
    global: { lines: 80, branches: 70 }
  }
})
