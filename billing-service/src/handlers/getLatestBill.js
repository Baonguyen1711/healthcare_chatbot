const { withAuth } = require("../utils/auth");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE = process.env.BILLS_TABLE;

// Handler chính - nhận userId từ JWT token qua withAuth wrapper
// Endpoint: GET /billing/latest
// Yêu cầu: Authorization header với JWT token
const getLatestBillHandler = async (event, tokenUserId) => {
  console.log("Event:", JSON.stringify(event));
  console.log("UserId from JWT:", tokenUserId);

  try {
    const userId = tokenUserId; // Lấy userId từ JWT token

    console.log("Final userId used:", userId);

    // Query DynamoDB để lấy tất cả bills của user
    const command = new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
      ScanIndexForward: false, // Sort descending by visitId
      Limit: 1, // Chỉ lấy bill mới nhất
    });

    const result = await docClient.send(command);

    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
        },
        body: JSON.stringify({
          message: "Không tìm thấy dữ liệu viện phí cho user này.",
          requestedUserId: userId,
        }),
      };
    }

    const bill = result.Items[0];

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      },
      body: JSON.stringify({
        userId: bill.userId,
        visitId: bill.visitId,
        visitDate: bill.visitDate,
        hospitalId: bill.hospitalId,
        hospitalName: bill.hospitalName,
        hospitalAddress: bill.hospitalAddress,
        doctorName: bill.doctorName,
        department: bill.department,
        diagnosis: bill.diagnosis,
        services: bill.services,
        totalBasePrice: bill.totalBasePrice,
        totalInsuranceCovered: bill.totalInsuranceCovered,
        totalPatientPay: bill.totalPatientPay,
        insuranceType: bill.insuranceType,
        insuranceNumber: bill.insuranceNumber,
        paymentStatus: bill.paymentStatus,
        paymentMethod: bill.paymentMethod,
        paymentDate: bill.paymentDate,
        note: bill.note,
      }),
    };
  } catch (err) {
    console.error("Error getLatestBill:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      },
      body: JSON.stringify({
        message: "Internal server error",
        error: err.message,
      }),
    };
  }
};

// Export handler với authentication wrapper
module.exports.handler = withAuth(getLatestBillHandler);
