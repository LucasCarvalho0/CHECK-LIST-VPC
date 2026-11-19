/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pacotes que precisam rodar como módulos Node (não empacotados): geração de PDF, hash de senha e Prisma.
  experimental: { serverComponentsExternalPackages: ['playwright', 'playwright-core', 'bcryptjs', '@prisma/client', 'prisma'] },
};
export default nextConfig;
