/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/discord',
        destination: 'https://discord.gg/Rm7PSe699b',
        permanent: false,
      },
      {
        source: '/discord/:code',
        destination: 'https://discord.gg/:code',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
