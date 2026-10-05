import type { NextConfig } from "next";






const e2eDistDir = process.env.PLAYWRIGHT_NEXT_DIST_DIR;






const e2eUnoptimizedImages =
  process.env.PLAYWRIGHT_UNOPTIMIZED_IMAGES === "1";

const nextConfig: NextConfig = {
  ...(e2eDistDir && {
    distDir: e2eDistDir,
    typescript: { tsconfigPath: "tsconfig.e2e.json" },
  }),
  reactCompiler: true,
  images: {
    ...(e2eUnoptimizedImages && { unoptimized: true }),
    
    remotePatterns: [
      {
        protocol: "https", 
        hostname: "lh3.googleusercontent.com", 
      },
      {
        protocol: "https", 
        hostname: "avatars.githubusercontent.com", 
      },
      {
        protocol: 'https',
        
        hostname: '**.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;