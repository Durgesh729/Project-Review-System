const nodemailer = require('nodemailer');

// Create a transporter object using the default SMTP transport
const createTransporter = () => {
  console.log('Creating transporter with config:', {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true' || false,
    user: process.env.EMAIL_USER || 'en23172488@git-india.edu.in'
  });

  // Configuration for Gmail with App Password
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true' || false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || 'en23172488@git-india.edu.in',
      pass: process.env.EMAIL_PASS || 'cjqc wocj odjk nnmt'
    },
    tls: {
      rejectUnauthorized: false // Set to true in production with proper certificates
    }
  });

  return transporter;
};

// Send email function
const sendContactEmail = async (contactData) => {
  try {
    console.log('Attempting to send contact email with data:', contactData);
    const transporter = createTransporter();

    // Verify transporter configuration
    console.log('Verifying transporter...');
    await transporter.verify();
    console.log('Transporter verified successfully');

    // Email to admin (site owner) - Professional Template
    const adminMailOptions = {
      from: process.env.EMAIL_FROM || '"Project Review Platform" <en23172488@git-india.edu.in>',
      to: process.env.ADMIN_EMAIL || 'gitengineer742@gmail.com',
      subject: `New Contact Form Submission - ${contactData.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>New Contact Form Submission</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">New Contact Form Submission</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333;">Contact Details</h2>
              
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Name:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${contactData.name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${contactData.email}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Submission Time:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date().toLocaleString()}</td>
                </tr>
              </table>
              
              <div style="margin-bottom: 20px;">
                <h3 style="color: #333; margin-bottom: 10px;">Message:</h3>
                <div style="background: white; padding: 15px; border-left: 4px solid #667eea; border-radius: 4px;">
                  <p style="margin: 0; white-space: pre-wrap;">${contactData.message}</p>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  This message was sent from the Project Review Platform contact form.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Email to user (confirmation) - Professional Template
    const userMailOptions = {
      from: process.env.EMAIL_FROM || '"Project Review Platform" <en23172488@git-india.edu.in>',
      to: contactData.email,
      subject: 'Thank you for contacting us!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Thank you for contacting us</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Thank You for Reaching Out!</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333;">Hello ${contactData.name},</h2>
              
              <p>We have received your message and appreciate you taking the time to contact us.</p>
              
              <p>Our team will review your inquiry and get back to you within 1-2 business days.</p>
              
              <div style="margin: 20px 0;">
                <h3 style="color: #333; margin-bottom: 10px;">Your Message:</h3>
                <div style="background: white; padding: 15px; border-left: 4px solid #667eea; border-radius: 4px;">
                  <p style="margin: 0; white-space: pre-wrap;">${contactData.message}</p>
                </div>
              </div>
              
              <div style="background: #e8f4fd; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2c5282;">Need Immediate Assistance?</h3>
                <p style="margin-bottom: 0;">If this is urgent, please contact us directly at <strong>en23172488@git-india.edu.in</strong></p>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  Best regards,<br>
                  <strong>The Project Review Platform Team</strong>
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log('Sending admin email to:', adminMailOptions.to);
    // Send emails
    const adminResult = await transporter.sendMail(adminMailOptions);
    console.log('Admin email sent successfully, message ID:', adminResult.messageId);

    console.log('Sending user confirmation email to:', userMailOptions.to);
    const userResult = await transporter.sendMail(userMailOptions);
    console.log('User confirmation email sent successfully, message ID:', userResult.messageId);

    console.log('Contact emails sent successfully');
    return { adminResult, userResult };
  } catch (error) {
    console.error('Error sending contact emails:', error);
    // Provide more specific error information
    if (error.code === 'EAUTH') {
      console.error('Email authentication failed. Check EMAIL_USER and EMAIL_PASS in .env file.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Email connection refused. Check EMAIL_HOST and EMAIL_PORT in .env file.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('Email host not found. Check EMAIL_HOST in .env file.');
    }
    throw error;
  }
};

module.exports = { sendContactEmail };