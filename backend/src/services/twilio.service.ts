import twilio from 'twilio';
import { env } from '../config/env';

export class TwilioService {
  private client: twilio.Twilio;

  constructor() {
    this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }

  /**
   * Send SMS message
   */
  async sendSMS(to: string, message: string): Promise<void> {
    try {
      await this.client.messages.create({
        body: message,
        from: env.TWILIO_PHONE_NUMBER,
        to: to
      });
      console.log(`📱 SMS sent to ${to}`);
    } catch (error) {
      console.error(`❌ Failed to send SMS to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Send WhatsApp message
   */
  async sendWhatsApp(to: string, message: string): Promise<void> {
    try {
      // Ensure WhatsApp format
      const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      
      await this.client.messages.create({
        body: message,
        from: env.TWILIO_WHATSAPP_NUMBER,
        to: whatsappTo
      });
      console.log(`💬 WhatsApp message sent to ${to}`);
    } catch (error) {
      console.error(`❌ Failed to send WhatsApp message to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Send message via appropriate channel (SMS or WhatsApp)
   */
  async sendMessage(to: string, message: string, channel: 'sms' | 'whatsapp' = 'sms'): Promise<void> {
    if (channel === 'whatsapp') {
      await this.sendWhatsApp(to, message);
    } else {
      await this.sendSMS(to, message);
    }
  }
}

// Export singleton instance
export const twilioService = new TwilioService();