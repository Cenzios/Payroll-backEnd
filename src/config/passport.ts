import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';
import { signToken } from '../utils/jwt';

const prisma = new PrismaClient();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
        },
        async (_accessToken, _refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;
                const fullName = profile.displayName;

                if (!email) {
                    return done(new Error('Google account has no email'), undefined);
                }

                let user = await prisma.user.findUnique({ where: { email } });
                let isNewUser = false;

                if (!user) {
                    console.log(`🆕 Creating new Google user: ${email}`);
                    user = await prisma.user.create({
                        data: {
                            email,
                            fullName,
                            role: 'ADMIN',
                            isEmailVerified: true,
                            isPasswordSet: false,
                        },
                    });
                    isNewUser = true;
                }

                const subscription = await prisma.subscription.findFirst({
                    where: { userId: user.id, status: 'ACTIVE' },
                });

                const hasSubscription = !!subscription;

                if (!hasSubscription) {
                    isNewUser = true; // Treat as new if no active plan
                }

                const token = signToken(user.id, user.role, user.fullName || '', user.email);

                // Instead of done(), we will redirect from route handler
                // So just return the info via done
                return done(null, { token, isNewUser });

            } catch (err) {
                console.error('❌ Google OAuth Error:', err);
                return done(err as any, undefined);
            }
        }
    )
);

export default passport;