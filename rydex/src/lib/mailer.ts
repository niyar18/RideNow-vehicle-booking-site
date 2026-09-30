import { Resend } from "resend";

export const sendMail = async (
  to: string,
  subject: string,
  html: string
) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is missing in environment variables");
    return null;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const response = await resend.emails.send({
      from: "RideNow <otp-verify@ridenow.publicvm.com>", // default sender
      to,
      subject,
      html,
    });

    return response;
  } catch (error) {
    console.error("Resend Email Error:", error);
    throw new Error("Failed to send email");
  }
};