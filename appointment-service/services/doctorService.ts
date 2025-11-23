import { PutCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient, TABLE_NAME } from "../utils/db";
import { Doctor, Appointment, Department } from "../models/appointment";
// import { v4 as uuidv4 } from "uuid";

// Thêm bác sĩ
export async function createDoctorService(data: {
  id: string;
  name: string;
  departmentId: string;
  hospitalId: string;
}) {
  const doctorId = data.id;
  const departmentId = data.departmentId;
  const hospitalId = data.hospitalId;

  // Item gốc cho doctor (truy vấn theo doctorId)
  const doctorItem = {
    PK: `DOCTOR#${doctorId}`,
    SK: `DOCTOR#${doctorId}`,
    entityType: "Doctor",
    doctorId,
    name: data.name,
    departmentId,
    hospitalId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Item phụ để group doctor theo department (truy vấn theo departmentId)
  const doctorInDeptItem = {
    PK: `DEPARTMENT#${departmentId}`,
    SK: `DOCTOR#${doctorId}`,
    entityType: "DoctorRef",
    doctorId,
    name: data.name,
    hospitalId,
    createdAt: doctorItem.createdAt,
  };

  // Item phụ để group doctor theo hospital (truy vấn theo hospitalId)
  const doctorInHospitalItem = {
    PK: `HOSPITAL#${hospitalId}`,
    SK: `DOCTOR#${doctorId}`,
    entityType: "DoctorRef",
    doctorId,
    name: data.name,
    departmentId,
    createdAt: doctorItem.createdAt,
  };

  // Lưu cả 3 items
  await ddbDocClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: doctorItem,
    })
  );

  await ddbDocClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: doctorInDeptItem,
    })
  );

  await ddbDocClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: doctorInHospitalItem,
    })
  );

  return { doctorId, departmentId, hospitalId };
}
// Lấy bác sĩ theo ID

// Lấy danh sách bác sĩ theo department
export async function getDoctorsByDepartmentService(data: {
  departmentId: string;
}) {
  const departmentId = data.departmentId;
  const result = await ddbDocClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `DEPARTMENT#${departmentId}`,
        ":etype": "DoctorRef",
      },
      FilterExpression: "entityType = :etype",
    })
  );

  return result.Items ?? [];
}

// Lấy danh sách bác sĩ theo hospital
export async function getDoctorsByHospitalService(data: {
  hospitalId: string;
}) {
  const hospitalId = data.hospitalId;
  const result = await ddbDocClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `HOSPITAL#${hospitalId}`,
        ":etype": "DoctorRef",
      },
      FilterExpression: "entityType = :etype",
    })
  );

  return result.Items ?? [];
}

// Lấy bác sĩ theo ID
export async function getDoctorByIdService(data: { doctorId: string }) {
  const pk = `DOCTOR#${data.doctorId}`;
  const sk = `DOCTOR#${data.doctorId}`;
  const result = await ddbDocClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: pk,
        SK: sk,
      },
    })
  );

  return result.Item ?? null;
}
