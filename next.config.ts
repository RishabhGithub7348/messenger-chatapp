/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Optional: Keep domains for backward compatibility (if using an older Next.js version)
    domains: ["eojyvdbezoxsbykekjga.supabase.co"],
    // Use remotePatterns for better control (recommended for Next.js 13+)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "eojyvdbezoxsbykekjga.supabase.co",
        pathname: "/storage/v1/object/public/**", // Match all public storage objects
      },
    ],
  },
};

module.exports = nextConfig;
