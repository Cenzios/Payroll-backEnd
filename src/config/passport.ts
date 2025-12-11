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

                // ✅ STEP 1: CHECK IF USER EXISTS IN DATABASE
                let user = await prisma.user.findUnique({
                    where: { email },
                });

                let isNewUser = false;

                if (!user) {
                    // ✅ USER DOESN'T EXIST → CREATE NEW USER
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

                    // ✅ NEW USER → MUST GO TO /get-plan
                    const token = signToken(user.id, user.role, user.fullName, user.email);

                    console.log(`✅ New user created. Redirect to /get-plan`);

                    return done(null, {
                        user,
                        token,
                        isNewUser: true // ✅ NEW USER = TRUE
                    });
                }

                // ✅ STEP 2: USER EXISTS → CHECK IF THEY HAVE ACTIVE SUBSCRIPTION
                console.log(`👤 Existing user found: ${email}`);

                const subscription = await prisma.subscription.findFirst({
                    where: {
                        userId: user.id,
                        status: 'ACTIVE',
                    },
                });

                const hasSubscription = !!subscription;

                if (!hasSubscription) {
                    // ✅ USER EXISTS BUT NO SUBSCRIPTION → REDIRECT TO /get-plan
                    console.log(`⚠️ User exists but NO active subscription. Redirect to /get-plan`);

                    const token = signToken(user.id, user.role, user.fullName, user.email);

                    return done(null, {
                        user,
                        token,
                        isNewUser: true // ✅ NO SUBSCRIPTION = TREAT AS NEW USER
                    });
                }

                // ✅ STEP 3: USER EXISTS + HAS SUBSCRIPTION → REDIRECT TO /dashboard
                console.log(`✅ User exists with active subscription. Redirect to /dashboard`);

                const token = signToken(user.id, user.role, user.fullName, user.email);

                return done(null, {
                    user,
                    token,
                    isNewUser: false // ✅ HAS SUBSCRIPTION = EXISTING USER
                });

            } catch (err) {
                console.error('❌ Google OAuth Error:', err);
                return done(err as any, undefined);
            }
        }
    )
);

export default passport;