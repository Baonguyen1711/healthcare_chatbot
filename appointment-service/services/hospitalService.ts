import { PutCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient, TABLE_NAME } from "../utils/db";

// ===== Hospital =====

export async function createHospitalService(data: {
  id: string;
  name: string;
  address?: string;
  description?: string;
}) {
  const hospitalId = data.id;

  const item = {
    PK: `HOSPITAL#${hospitalId}`,
    SK: `HOSPITAL#${hospitalId}`,
    entityType: "Hospital",
    hospitalId,
    name: data.name,
    address: data.address,
    description: data.description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return ddbDocClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
}

export async function getHospitalByIdService(data: { hospitalId: string }) {
  const { hospitalId } = data;

  const result = await ddbDocClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `HOSPITAL#${hospitalId}`,
        SK: `HOSPITAL#${hospitalId}`,
      },
    })
  );

  return result.Item ?? null;
}

export async function getAllHospitalsService() {
  console.log(TABLE_NAME)
  const result = await ddbDocClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "#et = :etype",
      ExpressionAttributeNames: {
        "#et": "entityType",
      },
      ExpressionAttributeValues: {
        ":etype": "Hospital",
      },
    })
  );

  return result.Items ?? [];
}
