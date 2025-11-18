import {sendNotification} from "../utils/webPush";
import { addSubscription } from "../utils/webPush";
import { AddSubscriptionProps } from "../models/reminderModels";
export const sendReminder = async (event: any) => {
  console.log("sendReminder event:", event);
  const { userId, message, pushSubscription } = event;
  console.log("Sending reminder to user:", userId);
  console.log("Reminder message:", message);
  console.log("Push subscription:", pushSubscription);

  await sendNotification(pushSubscription, { title: "Reminder", message });
}

export const createReminderService = async (subscription: AddSubscriptionProps) => {

  await addSubscription(subscription);

  return { 
    statusCode: 201, 
    body: JSON.stringify({ message: "Reminder created" }) 
  };
}


