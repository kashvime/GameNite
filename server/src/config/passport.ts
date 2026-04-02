import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { ssoLogin } from "../services/auth.service.js";

/**
 * Configure Passport to use Google OAuth 2.0 strategy for authentication.
 * When a user authenticates with Google, the callback function will be called
 * with the user's profile information. We then use this information to log the
 * user in or create a new account if necessary.
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:8000/auth/google/callback",
      },
      async (_accessToken: string, _refreshToken: string, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName;

          if (!email) {
            return done(new Error("No email found"));
          }

          const user = await ssoLogin(email, name);

          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      },
    ),
  );
}
export default passport;
