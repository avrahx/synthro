/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'export',
  trailingSlash: true,              // required for GitHub Pages nested routes
  basePath: isProd ? '/synthro' : '',
  assetPrefix: isProd ? '/synthro/' : '',
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    config.externals.push(
      'pino-pretty',
      'lokijs',
      'encoding',
      '@base-org/account',
      '@coinbase/wallet-sdk',
      '@metamask/connect-evm',
      '@safe-global/safe-apps-sdk',
      '@safe-global/safe-apps-provider',
      '@walletconnect/ethereum-provider',
      'accounts'
    );
    return config;
  },
};

export default nextConfig;
