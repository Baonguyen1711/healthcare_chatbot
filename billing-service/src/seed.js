const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

// Region phải trùng region trong serverless.yml
const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE = "HospitalBills";

async function seed() {
  const items = [
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

  for (const item of items) {
    await docClient.send(
      new PutCommand({
        TableName: TABLE,
        Item: item,
      })
    );
    console.log(
      `Inserted bill for userId=${item.userId}, visitId=${item.visitId}`
    );
  }

  console.log("Seeding done.");
}

seed().catch((err) => {
  console.error("Seed error:", err);
});
