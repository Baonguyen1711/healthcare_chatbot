import webpush, { PushSubscription } from "web-push";
import { CONTACT_EMAIL } from "../../shared/constants";
import { AddSubscriptionProps } from "../models/reminderModels";
import { dbPut, dbGet, dbDelete, dbQuery } from "../../shared/db";
import { SchedulerClient, CreateScheduleCommand, DeleteScheduleCommand } from "@aws-sdk/client-scheduler";
import { convertToUTCCron } from "./convertUTCToCron";
const scheduler = new SchedulerClient({ region: process.env.AWS_REGION });
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || "";
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "";
const TABLE_NAME = process.env.SUBSCRIPTION_TABLE!;


console.log("Loaded VAPID keys:", {
  hasPublic: !!publicVapidKey,
  hasPrivate: !!privateVapidKey,
  publicKeyPreview: publicVapidKey?.slice(0, 10),
});
webpush.setVapidDetails(
  CONTACT_EMAIL,
  publicVapidKey,
  privateVapidKey
);


let subscriptions: PushSubscription[] = [];

/**
 * Save a new subscription
 */
export async function addSubscription(subscription: AddSubscriptionProps): Promise<void> {

  //add schedule to db
  dbPut<AddSubscriptionProps>(TABLE_NAME, subscription);

  const { endpoint, keys, userId, notifyAt } = subscription;
  const pushSubscription: PushSubscription = {
    endpoint: endpoint,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  };

  const sanitizedDate = notifyAt.replace(/[:.]/g, '-'); // replace : and . with -
  console.log("Sanitized date:", sanitizedDate);
  const scheduleName = `u-${userId?.slice(0, 8)}-${sanitizedDate}`;
  console.log("Schedule name:", scheduleName);


  //check and delete if schedule already exists
  scheduler.send(new DeleteScheduleCommand({ Name: scheduleName })).catch(() => {
    //ignore error if schedule does not exist
  });

  // Convert notifyAt (HH:mm) to cron expression in UTC
  const cronExpr = convertToUTCCron(notifyAt, "Asia/Ho_Chi_Minh"); // assuming notifyAt is in UTC

  //create new schedule
  const command = new CreateScheduleCommand({
    Name: scheduleName,
    ScheduleExpression: cronExpr, // e.g., "cron(30 8 * * ? *)"
    FlexibleTimeWindow: { Mode: "OFF" },
    Target: {
      Arn: process.env.NOTIFY_LAMBDA_ARN, // or EventBridge → Lambda / API endpoint
      RoleArn: process.env.ARN_ROLE,
      Input: JSON.stringify({
        userId: userId,
        pushSubscription: pushSubscription,
        message: `You have a new reminder at ${notifyAt}!`
      }),
    },
  });

  await scheduler.send(command);
  console.log(`Created schedule for ${userId} at ${notifyAt} `);
}

/**
 * Send a push notification to all subscribers
 */
export async function sendNotification(subscription: PushSubscription, payload: Record<string, unknown>): Promise<void> {
  console.log("Sending notification to:", subscription);
  console.log("Notification payload:", payload);
  const notificationPayload = JSON.stringify(payload);

  try {
    await webpush.sendNotification(subscription, notificationPayload);
  } catch (error) {
    console.error("Error sending notification, deleting subscription", error);
    // If the subscription is no longer valid, delete it from the database
    await dbDelete(TABLE_NAME, { endpoint: subscription.endpoint });
  }
}
