import { sendReminder, createReminderService } from "../services/reminderService";
import { AddSubscriptionProps } from "../models/reminderModels";
import { formatResponse } from "../../shared/response";
import { verifyToken } from "../../shared/verifyJwt"
import { withAuth } from "../../shared/authRequire";

export const sendNotificationHandler = async (event: any) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return formatResponse(200, "");
    }

    console.log("Event received in sendNotificationHandler:", event);
    await sendReminder(event);
    return formatResponse(200, { message: "Notification sent" });
  } catch (error) {
    console.error("Error in sendNotificationHandler:", error);
    return formatResponse(500, { message: "Internal Server Error" });
  }
}

const createReminder = async (event: any, userId: string) => {
  try {
    const method = event.requestContext?.http?.method;
    // Handle preflight CORS request
    if (method === "OPTIONS") {
      return formatResponse(200, "");
    }

    // Extract your subscription data from the request body
    const subscription: AddSubscriptionProps = JSON.parse(event.body);

    const createReminderObject = {
      ...subscription,
      userId: userId
    }

    await createReminderService(createReminderObject);
    return formatResponse(201, { message: "Reminder created" });
  } catch (error) {
    console.error("Error in createReminderHandler:", error);
    return formatResponse(500, { message: "Internal Server Error" });
  }
};

export const createReminderHandler = withAuth(createReminder)
