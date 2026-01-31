import Otp from "../models/otp.model.js";
import { generateOtp } from "../utils/generateOtp.js";
import { sendOtpEmail } from "../utils/sendOtpEmail.js";
import bcrypt from "bcrypt";

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email required" });

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await Otp.findOneAndUpdate(
      { email },
      { email, otp: hashedOtp, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
      { upsert: true }
    );

    await sendOtpEmail(email, otp);

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP" });
  }
};


export const verifyOtp = async (req, res) => {
  try {
    const email = req.body.email;
const otp = String(req.body.otp);


    const record = await Otp.findOne({ email });

    if (!record) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (Date.now() > record.expiresAt) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const isMatch = await bcrypt.compare(otp, record.otp);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await Otp.deleteOne({ email });

    res.json({ message: "OTP verified" });
  } catch (error) {
    res.status(500).json({ message: "Failed to verify OTP" });
  }
};
