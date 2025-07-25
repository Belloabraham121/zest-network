const twilio = require("twilio");
require("dotenv").config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function updateWebhookURL() {
  try {
    console.log("🔧 Updating Twilio SMS Webhook URL...");

    // Get the phone number SID first
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    const smsNumber = phoneNumbers.find(
      (num) => num.phoneNumber === process.env.TWILIO_PHONE_NUMBER
    );

    if (!smsNumber) {
      console.error(
        "❌ SMS phone number not found:",
        process.env.TWILIO_PHONE_NUMBER
      );
      return;
    }

    console.log("📱 Found phone number:", smsNumber.phoneNumber);
    console.log("📋 Current SMS URL:", smsNumber.smsUrl);

    // Check if we can reach the current webhook URL
    if (smsNumber.smsUrl) {
      try {
        const response = await fetch(
          smsNumber.smsUrl.replace("/webhook", "/health")
        );
        if (response.ok) {
          console.log("✅ Current webhook URL is reachable");
          console.log("🎯 Testing SMS webhook...");

          // Test the webhook
          const testResponse = await fetch(smsNumber.smsUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body:
              "Body=TEST&From=%2B2347060713184&To=" +
              encodeURIComponent(process.env.TWILIO_PHONE_NUMBER),
          });

          if (testResponse.ok) {
            const responseText = await testResponse.text();
            console.log("✅ SMS webhook is working correctly!");
            console.log("📤 Response:", responseText.substring(0, 200) + "...");

            console.log("\n🎉 SMS webhook is properly configured and working!");
            console.log("\n💡 If you're not receiving SMS responses, check:");
            console.log(
              "   1. Your phone can receive SMS from",
              process.env.TWILIO_PHONE_NUMBER
            );
            console.log(
              "   2. The phone number format is correct (+2347060713184)"
            );
            console.log("   3. Your Twilio account has SMS credits");
            console.log("   4. The phone number is not blocked by Twilio");

            return;
          } else {
            console.log(
              "❌ SMS webhook test failed:",
              testResponse.status,
              testResponse.statusText
            );
          }
        } else {
          console.log(
            "❌ Current webhook URL is not reachable:",
            response.status
          );
        }
      } catch (error) {
        console.log("❌ Cannot reach current webhook URL:", error.message);
      }
    }

    // If we get here, we need to update the webhook URL
    console.log(
      "\n🔧 Current webhook URL is not working. Please provide a new URL."
    );
    console.log("\n📋 Options:");
    console.log("   1. Use ngrok: ngrok http 3000");
    console.log(
      "   2. Use localhost tunnel: ssh -R 80:localhost:3000 serveo.net"
    );
    console.log("   3. Deploy to a public server");
    console.log(
      "\n💡 After setting up a tunnel, run this script again with the new URL."
    );

    // Uncomment and modify this section to update the webhook URL
    /*
    const newWebhookUrl = 'https://your-new-url.ngrok-free.app/webhooks/sms/webhook';
    
    const updatedNumber = await client.incomingPhoneNumbers(smsNumber.sid)
      .update({
        smsUrl: newWebhookUrl,
        smsMethod: 'POST'
      });
    
    console.log('✅ Updated SMS webhook URL to:', updatedNumber.smsUrl);
    */
  } catch (error) {
    console.error("❌ Error updating webhook URL:", error.message);
    if (error.code) {
      console.error("Error Code:", error.code);
    }
  }
}

// Add command line argument support
const args = process.argv.slice(2);
if (args.length > 0 && args[0].startsWith("http")) {
  const newUrl = args[0];
  console.log("🔧 Updating webhook URL to:", newUrl);

  (async () => {
    try {
      const phoneNumbers = await client.incomingPhoneNumbers.list();
      const smsNumber = phoneNumbers.find(
        (num) => num.phoneNumber === process.env.TWILIO_PHONE_NUMBER
      );

      if (!smsNumber) {
        console.error("❌ SMS phone number not found");
        return;
      }

      const updatedNumber = await client
        .incomingPhoneNumbers(smsNumber.sid)
        .update({
          smsUrl: newUrl,
          smsMethod: "POST",
        });

      console.log("✅ Updated SMS webhook URL to:", updatedNumber.smsUrl);
    } catch (error) {
      console.error("❌ Error:", error.message);
    }
  })();
} else {
  updateWebhookURL();
}
