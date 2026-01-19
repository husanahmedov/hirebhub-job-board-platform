import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { EnvUtil } from '../../libs/env.util';

/**
 * Email Service
 *
 * Handles sending emails using SMTP configuration from environment variables.
 * Supports verification emails, password resets, and general notifications.
 *
 * For development: Uses Ethereal (fake SMTP) or Resend
 * For production: Uses Resend or any SMTP provider
 */
@Injectable()
export class EmailService {
	private readonly logger = new Logger(EmailService.name);
	private transporter: Transporter;

	constructor() {
		this.initializeTransporter();
	}

	/**
	 * Initialize email transporter based on environment
	 */
	private async initializeTransporter() {
		const smtpHost = EnvUtil.getSmtpHost();

		// Option 1: Use Resend (recommended - simple and reliable)
		if (smtpHost === 'smtp.resend.com') {
			this.transporter = nodemailer.createTransport({
				host: 'smtp.resend.com',
				port: 465,
				secure: true,
				auth: {
					user: 'resend',
					pass: EnvUtil.getSmtpPassword(), // Resend API Key
				},
			});
			this.logger.log('Using Resend for email delivery');
		}
		// Option 2: Use Ethereal for development (fake emails)
		else if (EnvUtil.isDevelopment() && smtpHost === 'ethereal') {
			try {
				const testAccount = await nodemailer.createTestAccount();
				this.transporter = nodemailer.createTransport({
					host: 'smtp.ethereal.email',
					port: 587,
					secure: false,
					auth: {
						user: testAccount.user,
						pass: testAccount.pass,
					},
				});
				this.logger.log('Using Ethereal Email for development');
				this.logger.log(`Preview emails at: https://ethereal.email`);
			} catch (error) {
				this.logger.error('Failed to create Ethereal account', error);
				throw error;
			}
		}
		// Option 3: Standard SMTP (Gmail App Password, etc.)
		else {
			this.transporter = nodemailer.createTransport({
				host: smtpHost,
				port: EnvUtil.getSmtpPort(),
				secure: EnvUtil.getSmtpPort() === 465,
				auth: {
					user: EnvUtil.getSmtpUser(),
					pass: EnvUtil.getSmtpPassword(),
				},
			});
			this.logger.log(`Using SMTP: ${smtpHost}:${EnvUtil.getSmtpPort()}`);
		}
	}

	/**
	 * Send verification email with code
	 * @param email - Recipient email address
	 * @param code - 6-digit verification code
	 * @param firstName - User's first name for personalization
	 */
	async sendVerificationEmail(email: string, code: string, firstName?: string): Promise<void> {
		const greeting = firstName ? `Hi ${firstName}` : 'Hi';

		const mailOptions = {
			from: EnvUtil.getEmailFrom(),
			to: email,
			subject: 'Verify Your Email - HireHub',
			html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
                        .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
                        .code { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; 
                                letter-spacing: 5px; padding: 20px; background-color: white; 
                                border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to HireHub!</h1>
                        </div>
                        <div class="content">
                            <p>${greeting},</p>
                            <p>Thank you for registering with HireHub. To complete your registration and verify your email address, please use the following verification code:</p>
                            <div class="code">${code}</div>
                            <p>This code will expire in <strong>10 minutes</strong>.</p>
                            <p>If you didn't create an account with HireHub, please ignore this email.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} HireHub. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
			text: `
                ${greeting},
                
                Thank you for registering with HireHub. To complete your registration and verify your email address, please use the following verification code:
                
                ${code}
                
                This code will expire in 10 minutes.
                
                If you didn't create an account with HireHub, please ignore this email.
                
                © ${new Date().getFullYear()} HireHub. All rights reserved.
            `,
		};

		try {
			await this.transporter.sendMail(mailOptions);
			this.logger.log(`Verification email sent to ${email}`);
		} catch (error) {
			this.logger.error(`Failed to send verification email to ${email}`, error);
			throw new Error('Failed to send verification email');
		}
	}

	/**
	 * Send password reset email
	 * @param email - Recipient email address
	 * @param resetToken - Password reset token
	 */
	async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
		const resetUrl = `${EnvUtil.getFrontendUrl()}/reset-password?token=${resetToken}`;

		const mailOptions = {
			from: EnvUtil.getEmailFrom(),
			to: email,
			subject: 'Password Reset Request - HireHub',
			html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
                        .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
                        .button { display: inline-block; padding: 12px 30px; background-color: #4F46E5; 
                                  color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Password Reset Request</h1>
                        </div>
                        <div class="content">
                            <p>Hi,</p>
                            <p>You requested to reset your password. Click the button below to proceed:</p>
                            <div style="text-align: center;">
                                <a href="${resetUrl}" class="button">Reset Password</a>
                            </div>
                            <p>Or copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
                            <p>This link will expire in <strong>1 hour</strong>.</p>
                            <p>If you didn't request a password reset, please ignore this email.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} HireHub. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
		};

		try {
			await this.transporter.sendMail(mailOptions);
			this.logger.log(`Password reset email sent to ${email}`);
		} catch (error) {
			this.logger.error(`Failed to send password reset email to ${email}`, error);
			throw new Error('Failed to send password reset email');
		}
	}
}
