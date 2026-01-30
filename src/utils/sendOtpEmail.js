import apiInstance from "../config/brevo.js";

export const sendOtpEmail = async (email, otp) => {
  try {
    const sendSmtpEmail = {
      to: [{ email }],
      templateId: 4, // 👈 PUT YOUR TEMPLATE ID HERE
      params: {
        otp: otp,
      },
      sender: {
        email: "campusmarketplace11@gmail.com", // 👈 verified sender
        name: "Campus Market",
      },
    };

    const res = await apiInstance.sendTransacEmail(sendSmtpEmail);
console.log("Brevo response:", res);

  } catch (error) {
    console.error("Brevo error:", error);
    throw error;
  }
};
