import { PutCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient, TABLE_NAME } from "../utils/db";
import { Doctor, Appointment, Department } from "../models/appointment";
import { bookSlotService } from "./doctorScheduleService";

// Tạo appointment
export async function createAppointmentService(data: {
  appointmentId: string;
  doctorId: string;
  userId: string;
  hospitalId: string;
  patientName: string;
  phone: string;
  email: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format
  symptoms?: string;
}) {
  const appointmentId = data.appointmentId;
  const datetime = new Date(`${data.date}T${data.time}:00`).toISOString();

  // Book the slot first
  await bookSlotService({
    doctorId: data.doctorId,
    date: data.date,
    time: data.time,
  });

  const baseItem = {
    entityType: "Appointment",
    appointmentId,
    doctorId: data.doctorId,
    userId: data.userId,
    hospitalId: data.hospitalId,
    patientName: data.patientName,
    phone: data.phone,
    email: data.email,
    date: data.date,
    time: data.time,
    datetime: datetime,
    symptoms: data.symptoms,
    status: "scheduled",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const items = [
    // Item chính
    {
      PK: `APPOINTMENT#${appointmentId}`,
      SK: `APPOINTMENT#${appointmentId}`,
      ...baseItem,
    },
    // Theo doctor
    {
      PK: `DOCTOR#${data.doctorId}`,
      SK: `APPOINTMENT#${datetime}#${appointmentId}`,
      ...baseItem,
    },
    // Theo user
    {
      PK: `USER#${data.userId}`,
      SK: `APPOINTMENT#${datetime}#${appointmentId}`,
      ...baseItem,
    },
    // Theo hospital
    {
      PK: `HOSPITAL#${data.hospitalId}`,
      SK: `APPOINTMENT#${datetime}#${appointmentId}`,
      ...baseItem,
    },
    // Theo status
    {
      PK: `STATUS#SCHEDULED`,
      SK: `APPOINTMENT#${datetime}#${appointmentId}`,
      ...baseItem,
    },
  ];

  // Batch insert 5 items
  for (const item of items) {
    await ddbDocClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );
  }
  console.log(appointmentId)
  return { appointmentId };
}
//

// Lấy tất cả lịch hẹn của 1 bác sĩ
export async function getAppointmentsByDoctorService(data: {
  doctorId: string;
}) {
  const result = await ddbDocClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `DOCTOR#${data.doctorId}`,
        ":etype": "Appointment",
      },
      FilterExpression: "entityType = :etype",
    })
  );

  return result.Items ?? [];
}

// Lấy tất cả lịch hẹn của 1 user
export async function getAppointmentsByUserService(data: { userId: string }) {
  const result = await ddbDocClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `USER#${data.userId}`,
        ":etype": "Appointment",
      },
      FilterExpression: "entityType = :etype",
    })
  );

  return result.Items ?? [];
}

// Lấy tất cả lịch hẹn theo trạng thái
export async function getAppointmentsByStatusService(data: {
  status: boolean;
}) {
  const statusKey = data.status ? "TRUE" : "FALSE";
  const result = await ddbDocClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `STATUS#${statusKey}`,
        ":etype": "Appointment",
      },
      FilterExpression: "entityType = :etype",
    })
  );

  return result.Items ?? [];
}

// Lấy tất cả lịch hẹn của 1 bệnh viện
export async function getAppointmentsByHospitalService(data: {
  hospitalId: string;
}) {
  const result = await ddbDocClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `HOSPITAL#${data.hospitalId}`,
        ":etype": "Appointment",
      },
      FilterExpression: "entityType = :etype",
    })
  );

  return result.Items ?? [];
}
