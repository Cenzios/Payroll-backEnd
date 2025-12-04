import prisma from '../src/config/db';
import * as authService from '../src/services/auth.service';

const testSignupFlow = async () => {
    const testEmail = 'test_signup@example.com';
    const testName = 'Test User';
    const testPassword = 'password123';

    try {
        console.log('--- Starting Signup Flow Test ---');

        // 1. Cleanup
        console.log('1. Cleaning up previous test data...');
        await prisma.subscription.deleteMany({ where: { user: { email: testEmail } } });
        await prisma.company.deleteMany({ where: { owner: { email: testEmail } } });
        await prisma.user.deleteMany({ where: { email: testEmail } });
        console.log('   Cleanup done.');

        // 2. Start Signup
        console.log('2. Testing startSignup...');
        const signupResult = await authService.startSignup({
            fullName: testName,
            email: testEmail
        });
        console.log('   startSignup result:', signupResult);

        // Verify DB state
        const userAfterSignup = await prisma.user.findUnique({ where: { email: testEmail } });
        if (!userAfterSignup) throw new Error('User not created');
        if (userAfterSignup.isEmailVerified) throw new Error('User should not be verified yet');
        if (!userAfterSignup.emailVerifyToken) throw new Error('Token not generated');
        console.log('   User created and token generated.');

        // 3. Verify Email
        console.log('3. Testing verifyEmail...');
        const verifyResult = await authService.verifyEmail(userAfterSignup.emailVerifyToken);
        console.log('   verifyEmail result:', verifyResult);

        // Verify DB state
        const userAfterVerify = await prisma.user.findUnique({ where: { email: testEmail } });
        if (!userAfterVerify?.isEmailVerified) throw new Error('User verification failed');
        if (userAfterVerify.emailVerifyToken) throw new Error('Token not cleared');
        console.log('   User verified.');

        // 4. Try Login (Should fail)
        console.log('4. Testing premature login (should fail)...');
        try {
            await authService.login(testEmail, testPassword);
            throw new Error('Login should have failed!');
        } catch (error: any) {
            console.log('   Login failed as expected:', error.message);
        }

        // 5. Set Password
        console.log('5. Testing setPassword...');
        const setPassResult = await authService.setPassword(testEmail, testPassword);
        console.log('   setPassword result:', setPassResult);

        // Verify DB state
        const userAfterPass = await prisma.user.findUnique({ where: { email: testEmail } });
        if (!userAfterPass?.isPasswordSet) throw new Error('Password set flag not true');
        console.log('   Password set.');

        // 6. Login (Should success)
        console.log('6. Testing login...');
        const loginResult = await authService.login(testEmail, testPassword);
        console.log('   Login successful. User ID:', loginResult.user.id);

        console.log('--- Test Passed Successfully ---');

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
};

testSignupFlow();
