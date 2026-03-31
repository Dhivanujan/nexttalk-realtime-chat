import webpush from "web-push";

let configured = false;

export const initWebPush = () => {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (publicKey && privateKey) {
    webpush.setVapidDetails(
      "mailto:admin@example.com",
      publicKey,
      privateKey
    );
    configured = true;
    console.log("Web Push configured");
  } else {
    console.warn("VAPID keys not found. Push notifications disabled.");
  }
};

export const sendPushNotification = async (subscription, payload) => {
  if (!configured || !subscription) return;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    if (error.statusCode === 410) {
      // The subscription is no longer valid, could delete it from DB here
      console.log("Push subscription expired.");
    } else {
      console.error("Error sending push notification", error);
    }
  }
};