import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // MUST be false for 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // 🔥 THIS IS IMPORTANT
    await transporter.verify();
    console.log("SMTP connection verified");

    const info = await transporter.sendMail({
      from: `"Campus Market" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });

    console.log("Email sent:", info.messageId);
    return info;

  } catch (error) {
    console.error("SEND EMAIL ERROR:", error);
    throw error; // 👈 MUST rethrow
  }
};
