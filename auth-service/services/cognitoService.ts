import { createHmac } from 'crypto';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminInitiateAuthCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ResendConfirmationCodeCommand,
  AdminUserGlobalSignOutCommand,
  AdminAddUserToGroupCommand
} from '@aws-sdk/client-cognito-identity-provider';

import axios from 'axios';

const region = process.env.LOCAL_AWS_REGION!;
const userPoolId = process.env.COGNITO_USER_POOL_ID!;
const clientId = process.env.COGNITO_CLIENT_ID!;
const clientSecret = process.env.COGNITO_CLIENT_SECRET!;
const cognitoDomain = process.env.COGNITO_DOMAIN!;
const redirectUri = process.env.COGNITO_REDIRECT_URI!;
const accessKeyId = process.env.LOCAL_AWS_ACCESS_KEY_ID!;
const secretAccessKey = process.env.LOCAL_AWS_SECRET_ACCESS_KEY!;
console.log("region:", region);
console.log("accessKeyId", accessKeyId);
console.log("secretAccessKey", secretAccessKey);
const cognitoClient = new CognitoIdentityProviderClient({
  region,
  credentials: { accessKeyId, secretAccessKey },
});

const getSecretHash = (username: string) => {
  const hmac = createHmac('sha256', clientSecret);
  hmac.update(username + clientId);
  return hmac.digest('base64');
};

export const signUpService = async (data: { userName: string; password: string; email: string; firstName?: string; lastName?: string; }) => {
  console.log("Signing up user:", data.userName);
  console.log("Using Client ID:", clientId);
  console.log("Signing up password:", data.password);
  console.log("Signing up name:", data.firstName, data.lastName);
  const command = new SignUpCommand({
    ClientId: clientId,
    Username: data.userName,
    Password: data.password,
    SecretHash: getSecretHash(data.userName),
    UserAttributes: [
      { Name: 'email', Value: data.email },
      { Name: 'name', Value: data.firstName + ' ' + data.lastName },
    //   { Name: 'given_name', Value: data.name },
    ],
  });

  const res = await cognitoClient.send(command);
  return res.UserSub;
};

export const signInService = async (data: { userName: string; password: string; }) => {
  console.log("Signing in user:", data.userName);
  console.log("Using Client ID:", clientId);
  console.log("Signing in password:", data.password);
  console.log("user pool", userPoolId);
  const command = new AdminInitiateAuthCommand({
    UserPoolId: userPoolId,
    ClientId: clientId,
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    AuthParameters: {
      USERNAME: data.userName,
      PASSWORD: data.password,
      SECRET_HASH: getSecretHash(data.userName),
    },
  });
  const res = await cognitoClient.send(command);
  console.log("Sign-in response:", res);
  console.log("Authentication result:", res.AuthenticationResult);
  return res.AuthenticationResult;
};

export const confirmSignUpService = async (data: { userName: string; code: string; }) => {
  const command = new ConfirmSignUpCommand({
    ClientId: clientId,
    Username: data.userName,
    SecretHash: getSecretHash(data.userName),
    ConfirmationCode: data.code,
  });
  return await cognitoClient.send(command);
};

export const forgotPasswordService = async (data: { userName: string }) => {
  const command = new ForgotPasswordCommand({
    ClientId: clientId,
    Username: data.userName,
    SecretHash: getSecretHash(data.userName),
  });
  return await cognitoClient.send(command);
};

export const confirmForgotPasswordService = async (data: { userName: string; confirmationCode: string; newPassword: string }) => {
  const command = new ConfirmForgotPasswordCommand({
    ClientId: clientId,
    Username: data.userName,
    ConfirmationCode: data.confirmationCode,
    Password: data.newPassword,
    SecretHash: getSecretHash(data.userName),
  });
  return await cognitoClient.send(command);
};

export const refreshAccessTokenService = async (refreshToken: string) => {
  const response = await axios.post(
    `${cognitoDomain}/oauth2/token`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
    },
  );
  return response.data.access_token;
};

export const oauthCallbackService = async (code: string) => {
  const tokenRes = await axios.post(
    `${cognitoDomain}/oauth2/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
    },
  );
  const accessToken = tokenRes.data.access_token;
  const userRes = await axios.get(`${cognitoDomain}/oauth2/userInfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return { user: userRes.data, accessToken };
};

export const addUserToGroupService = async (username: string, groupName: string) => {
    const command = new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: username,
      GroupName: groupName,
    });

    try {
      await cognitoClient.send(command);
    } catch (error: any) {
      if (error.code === 'UserNotFoundException') {
        throw Error('User not found');
      }
      if (error.code === 'GroupNotFoundException') {
        throw Error('Group not found');
      }
      if (error.code === 'ResourceNotFoundException') {
        throw Error('Resource not found');
      }
    }
  }

export const signOutService = async (username: string) => {
  const command = new AdminUserGlobalSignOutCommand({
    UserPoolId: userPoolId,
    Username: username,
  });
  return await cognitoClient.send(command);
};
