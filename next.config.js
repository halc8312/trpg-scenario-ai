/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker などで自前のサーバーに置く場合は、必要なファイルだけをまとめた standalone 形式で出力する
  ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' } : {})
}

module.exports = nextConfig
