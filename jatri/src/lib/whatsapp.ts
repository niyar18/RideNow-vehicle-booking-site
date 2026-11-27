/**
 * RideNow WhatsApp Service
 * Dispatches verification OTPs and ride updates via WhatsApp.
 * Supports:
 * 1. Persistent Baileys WhatsApp Gateway (via socketServer microservice)
 * 2. Meta WhatsApp Cloud API (Graph API)
 * 3. Safe Development Console Fallback
 */

interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  devOtp?: string;
  error?: string;
}

export async function sendWhatsAppOtp(
  toPhone: string,
  otp: string
): Promise<WhatsAppResult> {
  // Normalize Indian mobile number to 91XXXXXXXXXX
  const cleanedDigits = toPhone.replace(/\D/g, "");
  const formattedPhone =
    cleanedDigits.length === 10
      ? `91${cleanedDigits}`
      : cleanedDigits.startsWith("91") && cleanedDigits.length === 12
      ? cleanedDigits
      : `91${cleanedDigits.slice(-10)}`;

  const provider = (process.env.WHATSAPP_PROVIDER || "baileys").toLowerCase().trim();

  // ── 1. Baileys Gateway via Persistent Node.js Service ─────────────────────
  if (provider === "baileys") {
    const socketServerUrl =
      process.env.WHATSAPP_BAILEYS_URL ||
      process.env.NEXT_PUBLIC_SOCKET_SERVER ||
      process.env.SOCKET_SERVER_URL ||
      "http://localhost:5000";

    try {
      const res = await fetch(`${socketServerUrl.replace(/\/$/, "")}/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formattedPhone,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          messageId: data.messageId,
          devOtp: data.devOtpHint,
        };
      }

      if (data?.error && process.env.NODE_ENV === "production") {
        return {
          success: false,
          error: data.error,
        };
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        console.warn("[WhatsApp Baileys Service] Gateway fetch note:", err?.message || err);
      }
    }
  }

  // ── 2. Meta WhatsApp Cloud API (Graph API v21.0) ───────────────────────────
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.WHATSAPP_OTP_TEMPLATE_NAME?.trim();
  const language = process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE?.trim() || "en_US";
  const isMetaConfigured =
    token &&
    phoneNumberId &&
    token.trim() !== "" &&
    phoneNumberId.trim() !== "" &&
    !token.includes("your_") &&
    !phoneNumberId.includes("your_");

  if (isMetaConfigured && template && /^[a-z0-9_]+$/.test(template)) {
    try {
      const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "template",
        template: {
          name: template,
          language: { code: language },
          components: [
            { type: "body", parameters: [{ type: "text", text: otp }] },
            { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: otp }] },
          ],
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
        redirect: "error",
      });

      const data = await res.json();

      const messageId = data.messages?.[0]?.id;
      if (!res.ok || typeof messageId !== "string" || !messageId) {
        console.warn("Meta WhatsApp did not accept the authentication template", res.status);
        return { success: false, error: "WhatsApp dispatch failed" };
      }
      return { success: true, messageId };
    } catch {
      console.warn("Meta WhatsApp authentication request failed");
      return { success: false, error: "WhatsApp dispatch failed" };
    }
  }

  // An explicitly selected provider must not silently simulate a sent code.
  if (provider === "meta") {
    return { success: false, error: "WhatsApp authentication template is not configured" };
  }

  // ── 3. Development / Simulation Mode Fallback ─────────────────────────────
  if (process.env.NODE_ENV === "production") {
    console.error("WhatsApp credentials missing in production environment");
    return {
      success: false,
      error: "WhatsApp service is unconfigured in production",
    };
  }

  console.log("\n=======================================================");
  console.log(`💬 [WHATSAPP OTP - DEV/FALLBACK] To: +${formattedPhone}`);
  console.log(`🔐 Verification Code: ${otp}`);
  console.log(`⏰ Valid for 5 minutes.`);
  console.log("=======================================================\n");

  return {
    success: true,
    devOtp: otp,
  };
}
