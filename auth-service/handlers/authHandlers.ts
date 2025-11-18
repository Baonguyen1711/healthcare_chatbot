import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
    RegisterAuthDto,
    RegisterCognitoDto,
    SignInCognitoDto,
    ConfirmSignUpDto,
    ForgotPasswordDto,
    ConfirmForgotPasswordDto
} from "../models/authModels";

import {
    signUpService, 
    signInService,
    signOutService, 
    refreshAccessTokenService, 
    confirmSignUpService, 
    forgotPasswordService, 
    confirmForgotPasswordService
} from "../services/cognitoService";

import { User } from '../models/userModels';
import { createRefreshTokenCookie, createUser, getRefreshTokenFromEvent, removeRefreshTokenCookie } from '../services/authService';

import { formatResponse } from '../../shared/response';

// Helper for consistent API Gateway responses
// const success = (message: string, data?: any): APIGatewayProxyResult => ({
//   statusCode: 200,
//   body: JSON.stringify(ResponseObject.create(message, data)),
// });

// const error = (message: string, statusCode = 400): APIGatewayProxyResult => ({
//   statusCode,
//   body: JSON.stringify({ message }),
// });

export const signUp = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('SignUp Event Body:', event.body);
    const registerUser: RegisterAuthDto = JSON.parse(event.body || '{}');

    console.log('Register User Data:', registerUser);
    const awsUserId = await signUpService(registerUser);

    console.log('Cognito UserSub:', awsUserId);
    if (!awsUserId) {
      throw new Error('Failed to get Cognito UserSub');
    }

    await createUser({
        "awsUserId": awsUserId,
        "userName": registerUser.userName,
        "email": registerUser.email,
        "password": registerUser.password,
        "role": registerUser.role,
        "firstName": registerUser.firstName,
        "lastName": registerUser.lastName,
        "phone": registerUser.phone
    } as User);

    return formatResponse(200, 'User registered successfully');
  } catch (err: any) {
    console.error('SignUp Error:', err);
    return formatResponse(500, err.message);
  }
};

export const signIn = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const signInCognitoDto: SignInCognitoDto = JSON.parse(event.body || '{}');
    const authResult = await signInService(signInCognitoDto);

    if(!authResult) {
      return formatResponse(401, 'Authentication failed');
    }

    const { AccessToken, RefreshToken, IdToken } = authResult;

    if(!AccessToken || !RefreshToken || !IdToken) {
      return formatResponse(401, 'Invalid tokens received');
    }

    // if (!isEmailVerified) {
    //   return error('Email not verified', 401);
    // }

    // Example: set refresh token as cookie in headers

    return formatResponse(
        200,
        {
            accessToken: AccessToken,
            idToken: IdToken,
            "message": 'User signed in successfully'
        },
        {
            'Set-Cookie': createRefreshTokenCookie(RefreshToken),
        }
    )
  } catch (err: any) {
    console.error('SignIn Error:', err);
    return formatResponse(500, err.message);
  }
};

export const confirmSignUp = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const confirmSignUpDto: ConfirmSignUpDto = JSON.parse(event.body || '{}');
    await confirmSignUpService(confirmSignUpDto);
    return formatResponse(200, "User's email confirmed");
  } catch (err: any) {
    return formatResponse(500, err.message);
  }
};

export const forgotPassword = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const dto: ForgotPasswordDto = JSON.parse(event.body || '{}');
    await forgotPasswordService(dto);
    return formatResponse(200, 'Forgot password');
  } catch (err: any) {
    return formatResponse(500, err.message);
  }
};

export const confirmForgotPassword = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const dto: ConfirmForgotPasswordDto = JSON.parse(event.body || '{}');
    await confirmForgotPasswordService(dto);
    return formatResponse(200, 'Forgot password confirmed');
  } catch (err: any) {
    return formatResponse(500, err.message);
  }
};

export const refreshToken = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const refreshToken = getRefreshTokenFromEvent(event);
    const { accessToken } = await refreshAccessTokenService(refreshToken);
    return formatResponse(200, 'Access token refreshed', { accessToken });
  } catch (err: any) {
    return formatResponse(500, err.message);
  }
};

// export const oauthCallback = async (
//   event: APIGatewayProxyEvent,
// ): Promise<APIGatewayProxyResult> => {
//   try {
//     const code = event.queryStringParameters?.code;
//     if (!code) return error('Missing OAuth code', 400);

//     const { userInfo, accessToken, refreshToken } =
//       await cognitoService.handleOauth(code);

//     return {
//       statusCode: 200,
//       headers: {
//         'Set-Cookie': authService.createRefreshTokenCookie(refreshToken),
//       },
//       body: JSON.stringify(ResponseObject.create('User signed in', { userInfo, accessToken })),
//     };
//   } catch (err: any) {
//     return error(err.message);
//   }
// };

// export const signOut = async (
//   event: APIGatewayProxyEvent,
// ): Promise<APIGatewayProxyResult> => {
//   try {
//     const user = await getUserFromEvent(event);
//     removeRefreshTokenCookie();
//     await signOutService(user?.userName);
//     return formatResponse(200, 'User signed out');
//   } catch (err: any) {
//     return formatResponse(500, err.message);
//   }
// };