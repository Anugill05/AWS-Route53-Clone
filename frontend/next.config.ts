import type {NextConfig} from "next"; 

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN; 

const nextConfig: NextConfig = {
  async rewrites() {
       if(!BACKEND_ORIGIN) return []; 
return [
{
source: "/api/:path*", 
destination: `${BACKEND_ORIGIN}/api/:path`, 
}, 
]; 
}, 
}; 

export default nextConfig;