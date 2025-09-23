import { addUserService, getUserService } from "../services/userService"
import {formatResponse} from "../../utils/response";

export const addUser = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { userId, name, email } = body;

    if (!userId || !name || !email) {
      return formatResponse(400, "Missing required fields");
    }

    await addUserService({ userId, name, email });
    return formatResponse(201, { message: "User added successfully" });
  } catch (error: any) {
    console.error(error);
    return formatResponse(
      error.name === "ConditionalCheckFailedException" ? 409 : 500,
      { message: error.message }
    );
  }
};

export const getUser = async (event: any) => {
  try {
    const userId = event.pathParameters.userId;
    if (!userId) return formatResponse(400, "Missing userId");

    const user = await getUserService(userId);
    if (!user) return formatResponse(404, { message: "User not found" });

    return formatResponse(200, user);
  } catch (error) {
    console.error(error);
    return formatResponse(500, { message: "Error retrieving user" });
  }
};
