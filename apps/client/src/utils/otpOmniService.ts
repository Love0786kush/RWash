// src/utils/otpOmniService.ts
/**
 * Wrapper for the OmniOTP HTTP API.
 * Requires two Vite env variables:
 *   VITE_OMNIOTP_API_URL – base URL (e.g. https://omniotp.onrender.com)
 *   VITE_OMNIOTP_API_KEY – secret key from https://omniotp.onrender.com/settings
 */

const BASE_URL = import.meta.env.VITE_OMNIOTP_API_URL as string;
const API_KEY = import.meta.env.VITE_OMNIOTP_API_KEY as string;

/** Send an OTP to a phone number.
 * @param phone Phone number in international format (+91xxxxxxxxxx or 10‑digit number)
 * @param appName Optional app identifier sent to the API
 * @returns { success, message, session_id } – session_id is needed for verification
 */
export async function omniSendOtp(
  phone: string,
  appName = 'RWash'
): Promise<{ success: boolean; message: string; session_id?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/otp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({ phone, app_name: appName }),
    });
    const data = await res.json();
    if (data.success) {
      return { success: true, message: data.message ?? 'OTP sent', session_id: data.session_id };
    }
    return { success: false, message: data.message ?? 'Failed to send OTP' };
  } catch (err: any) {
    console.error('[OmniOTP] send error', err);
    return { success: false, message: err.message ?? 'Network error' };
  }
}

/** Verify an OTP using the session ID returned by omniSendOtp.
 * @param sessionId The session_id from the send call
 * @param otp The 6‑digit code entered by the user
 */
export async function omniVerifyOtp(
  sessionId: string,
  otp: string
): Promise<{ verified: boolean; message: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({ session_id: sessionId, otp }),
    });
    const data = await res.json();
    return { verified: data.verified, message: data.message ?? '' };
  } catch (err: any) {
    console.error('[OmniOTP] verify error', err);
    return { verified: false, message: err.message ?? 'Network error' };
  }
}
