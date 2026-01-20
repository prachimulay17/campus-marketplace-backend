import apiInstance from "../config/brevo.js";

export const sendOtpEmail = async (email, otp) => {
  try {
    const sendSmtpEmail = {
      to: [{ email }],
      templateId: 7, // 👈 PUT YOUR TEMPLATE ID HERE
      params: {
        otp: otp,
      },
      sender: {
        email: "campusmarketplace11@gmail.com", // 👈 verified sender
        name: "Campus Market",
      },
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);
  } catch (error) {
    console.error("Brevo error:", error);
    throw error;
  }
};
