const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function checkTwilioConfig() {
  try {
    console.log('🔍 Checking Twilio Configuration...');
    console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID);
    console.log('Phone Number:', process.env.TWILIO_PHONE_NUMBER);
    console.log('WhatsApp Number:', process.env.TWILIO_WHATSAPP_NUMBER);
    console.log('');

    // Get account info
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('✅ Account Status:', account.status);
    console.log('Account Name:', account.friendlyName);
    console.log('');

    // Get incoming phone numbers
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    console.log('📱 Incoming Phone Numbers:');
    
    phoneNumbers.forEach((number, index) => {
      console.log(`\n${index + 1}. Phone Number: ${number.phoneNumber}`);
      console.log(`   Friendly Name: ${number.friendlyName}`);
      console.log(`   SMS URL: ${number.smsUrl || 'NOT SET'}`);
      console.log(`   SMS Method: ${number.smsMethod || 'NOT SET'}`);
      console.log(`   Voice URL: ${number.voiceUrl || 'NOT SET'}`);
      console.log(`   Status Callback URL: ${number.statusCallbackUrl || 'NOT SET'}`);
      console.log(`   Capabilities: SMS=${number.capabilities.sms}, Voice=${number.capabilities.voice}`);
    });

    if (phoneNumbers.length === 0) {
      console.log('❌ No phone numbers found in this account!');
    }

    console.log('\n🔍 Checking for SMS webhook configuration...');
    const smsNumber = phoneNumbers.find(num => num.phoneNumber === process.env.TWILIO_PHONE_NUMBER);
    
    if (smsNumber) {
      console.log('✅ Found SMS phone number configuration:');
      console.log('   SMS Webhook URL:', smsNumber.smsUrl || '❌ NOT CONFIGURED');
      console.log('   SMS Method:', smsNumber.smsMethod || 'POST');
      
      if (!smsNumber.smsUrl) {
        console.log('\n🚨 ISSUE FOUND: SMS webhook URL is not configured!');
        console.log('   This is why SMS responses are not being delivered.');
        console.log('   You need to set the SMS webhook URL in Twilio Console.');
      }
    } else {
      console.log('❌ SMS phone number not found in account!');
    }

  } catch (error) {
    console.error('❌ Error checking Twilio configuration:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
  }
}

checkTwilioConfig();