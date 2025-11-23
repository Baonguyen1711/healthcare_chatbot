import { PutCommand, GetCommand,QueryCommand ,ScanCommand} from "@aws-sdk/lib-dynamodb";
import { ddbDocClient, TABLE_NAME } from "../utils/db";
import { Department} from "../models/appointment";
import { v4 as uuidv4 } from "uuid";

// ===== Department =====
//
export async function createDepartmentService(data: { id: string; name: string; description: string ,hospitalId:string}) {
  const departmentId = data.id || uuidv4();
  const hospitalId = data.hospitalId;
  const timestamp = new Date().toISOString();

  // ✅ Bản ghi chính — giữ như hiện tại
  const departmentItem = {
    PK: `DEPARTMENT#${departmentId}`,
    SK: `DEPARTMENT#${departmentId}`,
    entityType: "Department",
    departmentId,
    hospitalId,
    name: data.name,
    description: data.description,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // ✅ Bản ghi phụ — để query theo hospital
  const mappingItem = {
    PK: `HOSPITAL#${hospitalId}`,
    SK: `DEPARTMENT#${departmentId}`,
    entityType: "HospitalDepartment",
    hospitalId,
    departmentId,
    name: data.name,
    createdAt: timestamp,
  };

  // 📝 Ghi 2 bản ghi
  await ddbDocClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: departmentItem,
    })
  );

  await ddbDocClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: mappingItem,
    })
  );

  return departmentItem;
}

export async function getDepartmentsByHospitalService(data: { hospitalId: string }) {
  const hospitalId = data.hospitalId;

  const result = await ddbDocClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `HOSPITAL#${hospitalId}`,
        ":skPrefix": "DEPARTMENT#",
      },
      // Optionally chọn các trường cần thiết để giảm payload:
      // ProjectionExpression: "departmentId, name, createdAt, hospitalId",
    })
  );

  // result.Items sẽ chỉ chứa items có SK bắt đầu bằng "DEPARTMENT#"
  return result.Items ?? [];
}

export async function getAllDepartmentService() {
  const result = await ddbDocClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "#et = :etype",
      ExpressionAttributeNames: {
        "#et": "entityType",
      },
      ExpressionAttributeValues: {
        ":etype": "Department",
      },
    })
  );

  return result.Items ?? [];
}

