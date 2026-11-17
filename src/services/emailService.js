import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporter = null;
/**
 * Initialize or get active Nodemailer transporter
 */
const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const user = process.env.EMAIL_USER || (process.env.EMAIL_FROM && process.env.EMAIL_FROM.includes('@') ? process.env.EMAIL_FROM.replace(/.*<([^>]+)>.*/, '$1').trim() : '');
  const pass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
  const port = Number(process.env.EMAIL_PORT) || 587;
  const secure = process.env.EMAIL_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
    return transporter;
  }

  return null;
};

/**
 * Send 6-Digit Password Reset OTP Email
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6-digit one-time password
 * @param {string} userName - Recipient display name
 */
export const sendPasswordResetOtpEmail = async (toEmail, otp, userName = 'Valued Customer') => {
  try {
    const mailer = getTransporter();
    const fromAddress = process.env.EMAIL_FROM || (process.env.EMAIL_USER ? `"RS Gifts" <${process.env.EMAIL_USER}>` : '"RS Gifts Support" <no-reply@rsgifts.com>');

    // Graceful fallback if SMTP is not yet configured in .env (for local dev and testing)
    if (!mailer) {
      console.log('\n======================================================');
      console.log('[PASSWORD RESET OTP SERVICE - CONSOLE FALLBACK]');
      console.log(`To: ${toEmail} (${userName})`);
      console.log(`6-Digit OTP Code: ${otp}`);
      console.log('Validity: 10 Minutes');
      console.log('(Add EMAIL_HOST, EMAIL_USER, EMAIL_PASS to .env to deliver real emails)');
      console.log('======================================================\n');
      return { success: true, simulated: true };
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset OTP - RS Gifts</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FFF9F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E1217;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF9F5; padding: 30px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="540" cellpadding="0" cellspacing="0" style="max-width: 540px; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #ECE7EC;">
                
                <!-- Header -->
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #821D38 0%, #561023 100%); padding: 26px 20px;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">
                      RS <span style="color: #F8D7DA;">GIFTS</span>
                    </h1>
                    <p style="margin: 5px 0 0 0; color: #FCE8E6; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">
                      Password Reset Verification
                    </p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 30px 30px 20px 30px;">
                    <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #1E1217;">
                      Hello ${userName || 'there'},
                    </p>
                    <p style="margin: 0 0 22px 0; font-size: 13.5px; line-height: 1.5; color: #62575C;">
                      We received a request to reset the password for your RS Gifts account. Use the 6-digit verification code below to securely reset your password:
                    </p>

                    <!-- OTP Code Box -->
                    <div style="background-color: #FDF4F6; border: 2px dashed #821D38; border-radius: 14px; padding: 18px 20px; text-align: center; margin: 0 0 24px 0;">
                      <div style="font-size: 11px; font-weight: 700; color: #821D38; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px;">
                        Your One-Time Password (OTP)
                      </div>
                      <div style="font-family: monospace, Courier; font-size: 34px; font-weight: 800; color: #821D38; letter-spacing: 8px;">
                        ${otp}
                      </div>
                      <div style="font-size: 11px; color: #8C7B83; margin-top: 6px;">
                        ⏱ Valid for <strong>10 minutes</strong> only
                      </div>
                    </div>

                    <p style="margin: 0 0 8px 0; font-size: 12.5px; line-height: 1.5; color: #705E67;">
                      For your safety, <strong>never share this OTP with anyone</strong>. RS Gifts support will never ask for your verification code.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #9A8991;">
                      If you did not request a password reset, you can safely ignore this email. Your current password remains unchanged.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #FAF6F8; border-top: 1px solid #ECE7EC; padding: 16px 30px; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #9A8991;">
                      &copy; ${new Date().getFullYear()} RS Gifts. Thoughtful & Personalized Gifting Platform.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const info = await mailer.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `${otp} is your RS Gifts Password Reset Code`,
      text: `Your RS Gifts password reset verification code is: ${otp}. It is valid for 10 minutes. If you did not request this, please ignore this email.`,
      html: htmlContent,
    });

    console.log(`[Email] Password reset OTP sent to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Error] Failed to send OTP to ${toEmail}:`, error.message);
    throw new Error('Unable to send verification email. Please try again later.');
  }
};

export default {
  sendPasswordResetOtpEmail,
};
