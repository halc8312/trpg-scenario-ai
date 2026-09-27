import '@testing-library/jest-dom'

// jsdom には structuredClone がないため、IndexedDB のテスト用に Node の実装で補う
if (typeof globalThis.structuredClone !== 'function') {
  const v8 = require('v8')
  globalThis.structuredClone = value => v8.deserialize(v8.serialize(value))
}
