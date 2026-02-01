import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const smtpSecure = smtpPort === 465; // true for 465, false for other ports

console.log('SMTP Config:', {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    user: process.env.SMTP_USER
});

const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    // Add timeout settings
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
});

// Verify connection configuration on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('SMTP Connection Error:', error);
    } else {
        console.log('SMTP Server is ready to send emails');
    }
});

export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
    const frontendUrl = process.env.FRONTEND_URL;
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Verify Your Email Address',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Verify your email address</h2>
                <p>Thank you for signing up. Please click the link below to verify your email address:</p>
                <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Verify Email</a>
                <p>This link will expire in 15 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${email}. Message ID: ${info.messageId}`);
    } catch (error) {
        console.error('Error sending verification email:', error);
        // Re-throw the error so it can be caught by the calling function
        throw new Error('Failed to send verification email. Please try again later.');
    }
}

export const sendFailedLoginWarning = async (email: string, attemptCount: number, time: Date): Promise<void> => {
    const formattedTime = time.toLocaleString();

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: '⚠️ Alert: Multiple Failed Login Attempts',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
                <h2 style="color: #d32f2f;">High Security Alert</h2>
                <p>We detected <strong>${attemptCount} consecutive failed login attempts</strong> for your account.</p>
                <div style="background-color: #fce4e4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Time:</strong> ${formattedTime}</p>
                </div>
                <p>For your security, your account has been temporarily locked for 3 hours.</p>
                <p>If this was you, please wait for the lockout to expire. If you did not attempt these logins, please reset your password immediately or contact support.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Failed login warning sent to ${email}`);
    } catch (error) {
        console.error('Error sending failed login warning:', error);
    }
};

export const sendSuspiciousLoginWarning = async (email: string, device: string, location: string, time: Date): Promise<void> => {
    const formattedTime = time.toLocaleString();

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: '⚠️ Unusual Login Activity Detected',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
                <h2 style="color: #ff9800;">Unusual Login Activity</h2>
                <p>We noticed an unusual login attempt to your Cenzios account from a device or location you don't usually use.</p>
                <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Device:</strong> ${device}</p>
                    <p style="margin: 5px 0;"><strong>Location:</strong> ${location}</p>
                    <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
                </div>
                <p>If this was you, you can ignore this message.</p>
                <p style="color: #d32f2f;"><strong>If you do not recognize this activity, please change your password immediately.</strong></p>
                <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; padding: 10px 20px; background-color: #d32f2f; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">Secure My Account</a>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Suspicious login warning sent to ${email}`);
    } catch (error) {
        console.error('Error sending suspicious login warning:', error);
    }
};