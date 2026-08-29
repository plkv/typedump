/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: the site has no API routes, server actions, middleware or
  // image optimisation, so every page is already prerendered. This makes the
  // build a folder of files that any host can serve.
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors now fail the build. This is what would have caught the
    // font-alias mismatch before it shipped. The codebase type-checks clean
    // (opentype.js declared in types/opentype.d.ts).
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
