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

import { createNotification } from './notification.service';

// ... (existing code)

export const sendFailedLoginWarning = async (email: string, userId: string, attemptCount: number, time: Date): Promise<void> => {
    const formattedTime = time.toLocaleString();

    // Create In-App Notification
    createNotification(
        userId,
        'Security Alert: Failed Logins',
        `We detected ${attemptCount} consecutive failed login attempts on your account.`,
        'WARNING'
    ).catch(err => console.error('Failed to create notification:', err));

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

export const sendSuspiciousLoginWarning = async (email: string, userId: string, device: string, location: string, time: Date): Promise<void> => {
    const formattedTime = time.toLocaleString();

    // Create In-App Notification
    createNotification(
        userId,
        'Unusual Login Detected',
        `New login detected from ${location} on ${device}.`,
        'WARNING'
    ).catch(err => console.error('Failed to create notification:', err));

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

export const sendWelcomeEmail = async (
    email: string,
    userName: string,
    transactionId: string,
    currency: string,
    amount: number,
    date: Date,
    planName: string
): Promise<void> => {
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const dashboardLink = `${process.env.FRONTEND_URL}/dashboard`;

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Welcome to Payroll! Your Account is Ready & Payment Confirmed',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
                <h2 style="color: #2c3e50;">Welcome to Payroll!</h2>
                <p>Hi ${userName},</p>
                <p>We are thrilled to have you on board. By choosing us, you have picked the right place to handle your payroll with ease and precision. Your account has been successfully registered, and we are ready to help you streamline your work.</p>
                <p>This email also confirms that your initial payment was successful. You now have full access to all the features included in your plan.</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #2c3e50;">Payment Details:</h3>
                    <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${transactionId}</p>
                    <p style="margin: 5px 0;"><strong>Amount:</strong> ${currency} ${amount.toFixed(2)}</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
                    <p style="margin: 5px 0;"><strong>Plan:</strong> ${planName}</p>
                </div>

                <p><strong>Next Steps:</strong> You can view your detailed invoice and billing history at any time from your account dashboard.</p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${dashboardLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to My Dashboard</a>
                </div>

                <p style="margin-top: 30px;">We are excited to see what you achieve with us!</p>
                <p style="margin-bottom: 0;">Best regards,</p>
                <p style="margin-top: 5px;"><strong>The Payroll Team</strong></p>
            </div>
        `,
    };

    try {
        console.log(`📨 [SENDING EMAIL] To: ${email}, Subject: ${mailOptions.subject}`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ [EMAIL SENT] Message ID: ${info.messageId}`);
    } catch (error) {
        console.error('❌ [EMAIL ERROR] Failed to send welcome email:', error);
    }
};