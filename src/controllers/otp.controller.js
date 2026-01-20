import Otp from "../models/otp.model.js";
import { generateOtp } from "../utils/generateOtp.js";
import { sendOtpEmail } from "../utils/sendOtpEmail.js";
import user from "../models/user.model.js";

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email required" });

    const otp = generateOtp();

    await Otp.findOneAndDelete({ email });

    await Otp.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOtpEmail(email, otp);

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP" });
  }
};


export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
console.log("ENTERED OTP:", otp);
console.log("HASHED OTP:", user.otp);
  const record = await Otp.findOne({ email, otp });

  if (!record)
    return res.status(400).json({ message: "Invalid OTP" });

  if (record.expiresAt < new Date())
    return res.status(400).json({ message: "OTP expired" });

  await Otp.deleteOne({ email });

  res.json({ message: "OTP verified successfully" });
};
