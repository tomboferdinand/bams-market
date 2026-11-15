import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "res.cloudinary.com",
                pathname: "/dcdyzbidu/**",
            },
        ],
    },
    // En ligne, le site et l'API sont sur deux adresses différentes : le navigateur n'enverrait pas
    // le cookie de session à l'API. Avec BACKEND_URL, le site transmet lui-même /api/... au backend,
    // et le cookie reste un cookie du site (avec NEXT_PUBLIC_API_URL=/api).
    // Sans BACKEND_URL (en local), rien ne change : le navigateur appelle directement l'API.
    async rewrites() {
        const backend = process.env.BACKEND_URL?.replace(/\/+$/, "");
        return backend ? [{ source: "/api/:path*", destination: `${backend}/api/:path*` }] : [];
    },
};

export default nextConfig;
