/**
 * OAuth 콜백 페이지.
 * 실제로는 NextAuth가 /api/auth/callback/[provider] 핸들러에서 처리.
 * 이 페이지는 백업 / 커스텀 처리용.
 */
export default function CallbackPage() {
  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground">인증 중...</p>
    </div>
  );
}
