import "dotenv/config";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

// ⚡ Khởi tạo Document Client
// const client = new DynamoDBClient({
//   region: process.env.AWS_REGION,
//   endpoint: process.env.AWS_DYNAMODB_ENDPOINT, // nếu dùng local
// });
const client = new DynamoDBClient({
  region: process.env.AWS_REGION, // bắt buộc
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "appointmentTable"; // tên bảng của bạn

async function testGetDoctor(doctorId: string) {
  const pk = `DOCTOR#${doctorId}`;
  const sk = `DOCTOR#${doctorId}`;

  console.log("🔑 Key truy vấn:", { PK: pk, SK: sk });

  try {
    const result = await ddbDocClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: pk,
          SK: sk,
        },
      })
    );

    if (result.Item) {
      console.log("✅ Kết quả truy vấn:", result.Item);
    } else {
      console.log("❌ Không tìm thấy doctor với ID:", doctorId);
    }
  } catch (err) {
    console.error("🚨 Lỗi khi truy vấn:", err);
  }
}

// 🧪 Gọi test
testGetDoctor("bs4");
