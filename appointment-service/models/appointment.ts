import { ddbDocClient, TABLE_NAME } from "../utils/db";
import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Kiểu dữ liệu chung cho Item trong DynamoDB (Single Table)
export interface BaseItem {
  PK: string;
  SK: string;
  entityType:
    | "Doctor"
    | "Department"
    | "Appointment"
    | "DoctorSchedule"
    | "Hospital";
  createdAt: string;
  updatedAt?: string;
}

// Doctor
export interface Doctor extends BaseItem {
  entityType: "Doctor";
  doctorId: string;
  name: string;
  departmentId: string;
  hospitalId: string; // Thêm hospitalId để link với hospital
}

// Department
export interface Department extends BaseItem {
  entityType: "Department";
  departmentId: string;
  name: string;
  description?: string;
}

// Hospital
export interface Hospital extends BaseItem {
  entityType: "Hospital";
  hospitalId: string;
  name: string;
  address?: string;
  description?: string;
}

// DoctorSchedule - Quản lý lịch làm việc của bác sĩ
export interface DoctorSchedule extends BaseItem {
  entityType: "DoctorSchedule";
  doctorId: string;
  hospitalId: string;
  date: string; // YYYY-MM-DD format
  availableSlots: string[]; // ["08:00", "09:00", "10:00"]
  bookedSlots: string[]; // ["08:00", "09:00"]
  workingHours: {
    start: string; // "08:00"
    end: string; // "17:00"
  };
}

// Appointment
export interface Appointment extends BaseItem {
  entityType: "Appointment";
  appointmentId: string;
  doctorId: string;
  userId: string;
  hospitalId: string;
  patientName: string;
  phone: string;
  email: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format
  datetime: string; // ISO format for sorting
  location: string;
  symptoms?: string;
  status: "scheduled" | "completed" | "canceled";
}

//
// ===== CRUD Ví dụ =====
//
