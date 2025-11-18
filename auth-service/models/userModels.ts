export interface User {
  awsUserId: string;
  userName: string;
  email: string;
  password: string;
  role: 'USER' | 'EXPERT' | 'ADMIN';
  firstName?: string; // Nullable field
  lastName?: string; // Nullable field
  phone?: string; // Nullable field
}