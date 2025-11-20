/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['@google-cloud/documentai', 'sharp'],
    },
};

export default nextConfig;
