import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/conversations/:path*",
    "/api/messages/:path*",
    "/chat/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/groups/:path*",
  ],
};
