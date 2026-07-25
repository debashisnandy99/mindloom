import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as GoogleStrategy, type Profile } from "passport-google-oauth20";
import { env } from "../env.js";
import { findOrCreateUserFromOAuth } from "../models/account.model.js";
import { findUserById } from "../models/user.model.js";
import { childLogger } from "../utils/logger.js";

const log = childLogger("passport");

type DoneFn = (err: unknown, user?: Express.User | false) => void;

function primaryEmail(profile: Profile | GitHubProfile): string | undefined {
  return profile.emails?.find((e) => e.value)?.value;
}

interface GitHubProfile {
  id: string;
  username?: string;
  displayName?: string;
  emails?: { value: string }[];
  photos?: { value: string }[];
}

passport.serializeUser((user, done) => {
  done(null, (user as Express.User).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await findUserById(id);
    // A deleted user with a live session resolves to `false`, not an error.
    done(null, user ?? false);
  } catch (err) {
    done(err);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    },
    async (_accessToken, _refreshToken, profile: Profile, done: DoneFn) => {
      try {
        const email = primaryEmail(profile);
        if (!email) {
          return done(new Error("Google account did not return an email address"));
        }

        const user = await findOrCreateUserFromOAuth({
          provider: "GOOGLE",
          providerAccountId: profile.id,
          email,
          name: profile.displayName || email.split("@")[0],
          avatarUrl: profile.photos?.[0]?.value ?? null,
        });

        done(null, user);
      } catch (err) {
        log.error({ err }, "google oauth failed");
        done(err);
      }
    },
  ),
);

passport.use(
  new GitHubStrategy(
    {
      clientID: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      callbackURL: env.GITHUB_CALLBACK_URL,
      scope: ["user:email"],
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: GitHubProfile,
      done: DoneFn,
    ) => {
      try {
        // GitHub omits the email when the user keeps it private, so fall back
        // to the noreply alias GitHub guarantees for every account.
        const email =
          primaryEmail(profile) ?? `${profile.id}+${profile.username}@users.noreply.github.com`;

        const user = await findOrCreateUserFromOAuth({
          provider: "GITHUB",
          providerAccountId: profile.id,
          email,
          name: profile.displayName || profile.username || email.split("@")[0],
          avatarUrl: profile.photos?.[0]?.value ?? null,
        });

        done(null, user);
      } catch (err) {
        log.error({ err }, "github oauth failed");
        done(err);
      }
    },
  ),
);

export { passport };
