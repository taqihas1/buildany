export function getSessionCookieOptions(req?: any) {
  return { httpOnly: true, secure: true, sameSite: 'strict' as const };
}
