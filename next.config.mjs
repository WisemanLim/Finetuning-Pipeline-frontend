/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Docker 배포 — node_modules 자동 추적 + 최소 런타임 산출물
  output: "standalone",
  // Gradio playground iframe 허용
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-src 'self' http://localhost:7860 https://*.gradio.app;" },
        ],
      },
    ];
  },
};

export default nextConfig;
