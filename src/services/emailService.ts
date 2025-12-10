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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5090';
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