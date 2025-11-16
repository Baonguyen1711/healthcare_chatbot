const MOCK_BILLS = [
  {
    userId: "U001",
    visitId: "V001",
    visitDate: "2025-11-10",
    hospitalName: "Bệnh viện Đa khoa ABC",
    services: [
      {
        code: "LAB_BLOOD",
        name: "Xét nghiệm máu",
        basePrice: 300000,
        insuranceCovered: 200000,
        patientPay: 100000,
      },
      {
        code: "XRAY_CHEST",
        name: "Chụp X-quang ngực",
        basePrice: 400000,
        insuranceCovered: 250000,
        patientPay: 150000,
      },
    ],
    totalBasePrice: 700000,
    totalInsuranceCovered: 450000,
    totalPatientPay: 250000,
    insuranceType: "BHYT 80%",
    note: "Demo đồ án - lần khám gần nhất của U001",
  },
  {
    userId: "U001",
    visitId: "V000",
    visitDate: "2025-10-01",
    hospitalName: "Bệnh viện Quận XYZ",
    services: [
      {
        code: "CONSULT_GENERAL",
        name: "Khám tổng quát",
        basePrice: 200000,
        insuranceCovered: 150000,
        patientPay: 50000,
      },
    ],
    totalBasePrice: 200000,
    totalInsuranceCovered: 150000,
    totalPatientPay: 50000,
    insuranceType: "BHYT 80%",
    note: "Demo đồ án - lần khám cũ hơn của U001",
  },
];

module.exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event));

  try {
    const { userId } = event.pathParameters || {};

    if (!userId) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Missing userId" }),
      };
    }

    // Lọc tất cả hoá đơn của user
    const billsOfUser = MOCK_BILLS.filter((b) => b.userId === userId);

    if (!billsOfUser.length) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          message:
            "Không tìm thấy dữ liệu viện phí cho user này (demo, mock data).",
        }),
      };
    }

    billsOfUser.sort((a, b) => (a.visitDate < b.visitDate ? 1 : -1));
    const bill = billsOfUser[0];

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        userId: bill.userId,
        visitId: bill.visitId,
        visitDate: bill.visitDate,
        hospitalName: bill.hospitalName,
        services: bill.services,
        totalBasePrice: bill.totalBasePrice,
        totalInsuranceCovered: bill.totalInsuranceCovered,
        totalPatientPay: bill.totalPatientPay,
        insuranceType: bill.insuranceType,
        note: bill.note,
      }),
    };
  } catch (err) {
    console.error("Error getLatestBill (mock):", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        message: "Internal server error",
        error: err.message,
      }),
    };
  }
};

// const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
// const {
//   DynamoDBDocumentClient,
//   QueryCommand,
// } = require("@aws-sdk/lib-dynamodb");

// const client = new DynamoDBClient({});
// const docClient = DynamoDBDocumentClient.from(client);

// const TABLE = process.env.BILLS_TABLE;

// module.exports.handler = async (event) => {
//   console.log("Event:", JSON.stringify(event));

//   try {
//     const { userId } = event.pathParameters || {};

//     if (!userId) {
//       return {
//         statusCode: 400,
//         headers: {
//           "Access-Control-Allow-Origin": "*",
//         },
//         body: JSON.stringify({ message: "Missing userId" }),
//       };
//     }

//     // Query tất cả lần khám của user, lấy lần mới nhất (demo)
//     const command = new QueryCommand({
//       TableName: TABLE,
//       KeyConditionExpression: "userId = :u",
//       ExpressionAttributeValues: {
//         ":u": userId,
//       },
//       ScanIndexForward: false, // false = sort giảm dần theo sort key
//       Limit: 1,
//     });

//     const result = await docClient.send(command);

//     if (!result.Items || result.Items.length === 0) {
//       return {
//         statusCode: 404,
//         headers: {
//           "Access-Control-Allow-Origin": "*",
//         },
//         body: JSON.stringify({
//           message: "Không tìm thấy dữ liệu viện phí cho user này (demo).",
//         }),
//       };
//     }

//     const bill = result.Items[0];

//     return {
//       statusCode: 200,
//       headers: {
//         "Access-Control-Allow-Origin": "*",
//       },
//       body: JSON.stringify({
//         userId: bill.userId,
//         visitId: bill.visitId,
//         visitDate: bill.visitDate,
//         hospitalName: bill.hospitalName,
//         services: bill.services,
//         totalBasePrice: bill.totalBasePrice,
//         totalInsuranceCovered: bill.totalInsuranceCovered,
//         totalPatientPay: bill.totalPatientPay,
//         insuranceType: bill.insuranceType,
//         note: bill.note,
//       }),
//     };
//   } catch (err) {
//     console.error("Error getLatestBill:", err);
//     return {
//       statusCode: 500,
//       headers: {
//         "Access-Control-Allow-Origin": "*",
//       },
//       body: JSON.stringify({
//         message: "Internal server error",
//         error: err.message,
//       }),
//     };
//   }
// };
