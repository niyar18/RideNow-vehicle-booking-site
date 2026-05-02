import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is missing in .env.local");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendMail = async (
  to: string,
  subject: string,
  html: string
) => {
  try {
    const response = await resend.emails.send({
      from: "RideNow <onboarding@resend.dev>", // default sender
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