export interface SignInCognitoDto {
  userName: string;
  password: string;
}

export interface RegisterCognitoDto {
  userName: string;
  email: string;
  password: string;
  name: string;
}


export interface ResendConfirmationCodeDto {
  userName: string;
}


export interface RegisterAuthDto {
  userName: string;
  email: string;
  password: string;
  role: 'USER' | 'EXPERT' | 'ADMIN';
  firstName?: string; // Nullable field
  lastName?: string; // Nullable field
  phone?: string; // Nullable field
}

export interface ForgotPasswordDto {
  userName: string;
}


export interface ConfirmSignUpDto {
  userName: string;
  code: string;
}

export interface ConfirmForgotPasswordDto {
  userName: string;
  confirmationCode: string;
  newPassword: string;
}

