
import { User } from "../models/userModels";
import { addUserToGroupService } from "./cognitoService"

import { dbPut } from "../../shared/db";

import { tableNames } from "../../shared/constants";


export async function createUser( user : User) {
    try {
        const savedUser = await dbPut(
            tableNames.USERS_TABLE, 
            user
        );
        console.log("User created:", savedUser);
        await addUserToGroupService(user.userName, user.role);
    
        return savedUser;
    } catch (error) {
        throw new Error('Error creating user: ' + (error as Error).message);
    }
}

export function createRefreshTokenCookie(token: string) {
  return `refresh_token=${token}; HttpOnly; Secure; SameSite=None; Path=/;`;
}

export function getRefreshTokenFromEvent(event: any) {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/refresh_token=([^;]+)/);
  return match ? match[1] : null;
}

export function removeRefreshTokenCookie() {
  return `refresh_token=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0;`;
}
