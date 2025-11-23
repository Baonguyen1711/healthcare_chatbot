import { 
  ListTablesCommand,
  CreateTableCommand,
  ScanCommand,
  DescribeTableCommand,
  ScalarAttributeType,
  KeyType 
} from "@aws-sdk/client-dynamodb";
import { ddbDocClient } from "./db"; // Kết nối DynamoDB

// 🧾 Liệt kê tất cả bảng
export async function listTables() {
  try {
    const data = await ddbDocClient.send(new ListTablesCommand({}));
    console.log("📄 Danh sách bảng:", data.TableNames);
  } catch (err) {
    console.error("❌ Lỗi khi liệt kê bảng:", err);
  }
}

// 🏗️ Tạo bảng
export async function createTable(tableName: string) {
  try {
    const params = {
      TableName: tableName,
      AttributeDefinitions: [
        { AttributeName: "PK", AttributeType: ScalarAttributeType.S },
        { AttributeName: "SK", AttributeType: ScalarAttributeType.S },
      ],
      KeySchema: [
        { AttributeName: "PK", KeyType: KeyType.HASH },
        { AttributeName: "SK", KeyType: KeyType.RANGE },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    };

    const command = new CreateTableCommand(params);
    const result = await ddbDocClient.send(command);

    console.log(`✅ Tạo bảng thành công: ${tableName}`);
    console.log(result.TableDescription);
  } catch (err) {
    console.error("❌ Lỗi khi tạo bảng:", err);
  }
}

// 📝 In dữ liệu bảng
export async function printTable(name: string) {
  try {
    const cmd = new ScanCommand({ TableName: name });
    const data = await ddbDocClient.send(cmd);
    console.log("📋 Danh sách item trong table:");
    console.table(data.Items);
  } catch (err) {
    console.error("❌ Lỗi khi đọc table:", err);
  }
}

// 📐 Kiểm tra schema bảng
export async function describeTable(name: string) {
  try {
    const cmd = new DescribeTableCommand({ TableName: name });
    const data = await ddbDocClient.send(cmd);

    console.log(`📌 Thông tin schema của bảng "${name}":`);
    console.log(" - Partition key:", data.Table?.KeySchema?.find(k => k.KeyType === "HASH")?.AttributeName);
    console.log(" - Sort key:", data.Table?.KeySchema?.find(k => k.KeyType === "RANGE")?.AttributeName);
    console.log(" - Attribute definitions:", data.Table?.AttributeDefinitions);
    console.log(" - Provisioned Throughput:", data.Table?.ProvisionedThroughput);
    console.log(" - Table Status:", data.Table?.TableStatus);
  } catch (err) {
    console.error("❌ Lỗi khi mô tả bảng:", err);
  }
}

// ✅ Test
// listTables()
printTable("appointmentTable")
// (async () => {
//   await describeTable("appointmentTable");
//   await printTable("appointmentTable");
// })();

