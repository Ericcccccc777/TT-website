import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all paths except: api routes, _next internals, static files with
  // extensions, and the extensionless metadata image routes at the app root
  // (opengraph-image / twitter-image / apple-icon / icon). Those have no dot,
  // so without excluding them here the locale middleware would 307-redirect
  // them to /en/… and the OG image + touch icon would break.
  matcher: ["/((?!api|_next|_vercel|opengraph-image|twitter-image|apple-icon|icon|.*\\..*).*)"],
};
