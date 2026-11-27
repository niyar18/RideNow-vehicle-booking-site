import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { sendWhatsAppOtp } from "./whatsapp";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubEnv("WHATSAPP_PROVIDER", "meta");
  vi.stubEnv("WHATSAPP_API_TOKEN", "test-token");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "90000001");
  vi.stubEnv("WHATSAPP_OTP_TEMPLATE_NAME", "jaatri_login_code");
  vi.stubEnv("WHATSAPP_OTP_TEMPLATE_LANGUAGE", "en_US");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("sends the code in the approved authentication template and its copy button", async () => {
  fetchMock.mockResolvedValue(Response.json({ messages: [{ id: "wamid.test" }] }));
  expect(await sendWhatsAppOtp("9000000000", "123456")).toEqual({ success: true, messageId: "wamid.test" });
  const [, init] = fetchMock.mock.calls[0];
  expect(JSON.parse(init.body)).toEqual({
    messaging_product: "whatsapp", recipient_type: "individual", to: "919000000000", type: "template",
    template: {
      name: "jaatri_login_code", language: { code: "en_US" },
      components: [
        { type: "body", parameters: [{ type: "text", text: "123456" }] },
        { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "123456" }] },
      ],
    },
  });
});

it("fails without an approved template setting, even in development", async () => {
  vi.stubEnv("WHATSAPP_OTP_TEMPLATE_NAME", "");
  expect(await sendWhatsAppOtp("9000000000", "123456")).toMatchObject({ success: false });
  expect(fetchMock).not.toHaveBeenCalled();
});

it("does not treat a response without a Meta message ID as sent", async () => {
  fetchMock.mockResolvedValue(Response.json({ messages: [] }));
  expect(await sendWhatsAppOtp("9000000000", "123456")).toMatchObject({ success: false });
});
