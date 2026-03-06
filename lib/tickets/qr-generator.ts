// QR code generation and storage utilities
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";

const TICKET_CODE_LENGTH = 12;
const TICKET_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No O/0/I/1

/**
 * Generate a URL-safe ticket code (12 chars, no ambiguous characters)
 */
export function generateTicketCode(): string {
  let code = "";
  for (let i = 0; i < TICKET_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * TICKET_CODE_CHARS.length);
    code += TICKET_CODE_CHARS[randomIndex];
  }
  return code;
}

/**
 * Generate QR code PNG buffer for a ticket verification URL
 */
export async function generateQRCodeBuffer(
  ticketCode: string
): Promise<Buffer> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "http://localhost:3000"}/verify/${ticketCode}`;

  const buffer = await QRCode.toBuffer(verifyUrl, {
    type: "png",
    width: 400,
    margin: 2,
    color: {
      dark: "#1D3557",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  });

  return buffer;
}

/**
 * Generate QR code and upload to Supabase Storage
 * Returns the public URL of the uploaded QR code image
 */
export async function generateAndStoreQRCode(
  ticketCode: string,
  orgId: string
): Promise<string | null> {
  try {
    const buffer = await generateQRCodeBuffer(ticketCode);
    const supabase = createAdminClient();

    const filePath = `${orgId}/${ticketCode}.png`;

    const { error: uploadError } = await supabase.storage
      .from("tickets")
      .upload(filePath, buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("QR code upload error:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("tickets")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error("QR code generation error:", error);
    return null;
  }
}
