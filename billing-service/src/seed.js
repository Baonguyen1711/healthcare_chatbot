const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

// Region phải trùng region trong serverless.yml
const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE = "HospitalBills";

async function seed() {
  const items = [
    {
      // Primary Keys
      userId: "U001",
      visitId: "V001",

      // Visit Information
      visitDate: "2025-11-10",
      hospitalId: "H001",
      hospitalName: "Bệnh viện Đa khoa ABC",
      hospitalAddress: "123 Đường ABC, Quận 1, TP.HCM",
      doctorName: "BS. Nguyễn Văn A",
      department: "Khoa Nội",
      diagnosis: "Viêm họng cấp",

      // Services - Cấu trúc đúng với frontend interface
      services: [
        {
          serviceId: "SV001",
          serviceName: "Phí khám bệnh",
          quantity: 1,
          unitPrice: 150000,
          totalPrice: 150000,
        },
        {
          serviceId: "SV002",
          serviceName: "Xét nghiệm máu tổng quát",
          quantity: 1,
          unitPrice: 200000,
          totalPrice: 200000,
        },
        {
          serviceId: "SV003",
          serviceName: "Chụp X-quang ngực",
          quantity: 1,
          unitPrice: 180000,
          totalPrice: 180000,
        },
        {
          serviceId: "SV004",
          serviceName: "Thuốc kháng sinh",
          quantity: 2,
          unitPrice: 85000,
          totalPrice: 170000,
        },
      ],

      // Billing Summary
      totalBasePrice: 700000,
      totalInsuranceCovered: 450000,
      totalPatientPay: 250000,
      insuranceType: "BHYT 80%",
      insuranceNumber: "DN123456789",

      // Payment Information
      paymentStatus: "PAID",
      paymentMethod: "CASH",
      paymentDate: "2025-11-10",

      // Additional Info
      note: "Bệnh nhân đã thanh toán đầy đủ. Tái khám sau 1 tuần.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      userId: "U001",
      visitId: "V002",
      visitDate: "2025-10-15",
      hospitalId: "H002",
      hospitalName: "Bệnh viện Quận 5",
      hospitalAddress: "456 Đường XYZ, Quận 5, TP.HCM",
      doctorName: "BS. Trần Thị B",
      department: "Khoa Da liễu",
      diagnosis: "Dị ứng da",
      services: [
        {
          serviceId: "SV001",
          serviceName: "Phí khám bệnh",
          quantity: 1,
          unitPrice: 150000,
          totalPrice: 150000,
        },
        {
          serviceId: "SV005",
          serviceName: "Test dị ứng",
          quantity: 1,
          unitPrice: 300000,
          totalPrice: 300000,
        },
        {
          serviceId: "SV006",
          serviceName: "Thuốc bôi da",
          quantity: 1,
          unitPrice: 120000,
          totalPrice: 120000,
        },
      ],
      totalBasePrice: 570000,
      totalInsuranceCovered: 370000,
      totalPatientPay: 200000,
      insuranceType: "BHYT 80%",
      insuranceNumber: "DN123456789",
      paymentStatus: "PAID",
      paymentMethod: "CARD",
      paymentDate: "2025-10-15",
      note: "Tránh tiếp xúc với chất gây dị ứng",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      userId: "U001",
      visitId: "V003",
      visitDate: "2025-09-20",
      hospitalId: "H001",
      hospitalName: "Bệnh viện Đa khoa ABC",
      hospitalAddress: "123 Đường ABC, Quận 1, TP.HCM",
      doctorName: "BS. Lê Văn C",
      department: "Khoa Răng Hàm Mặt",
      diagnosis: "Sâu răng",
      services: [
        {
          serviceId: "SV001",
          serviceName: "Phí khám bệnh",
          quantity: 1,
          unitPrice: 150000,
          totalPrice: 150000,
        },
        {
          serviceId: "SV007",
          serviceName: "Hàn răng",
          quantity: 2,
          unitPrice: 250000,
          totalPrice: 500000,
        },
        {
          serviceId: "SV008",
          serviceName: "Vệ sinh răng miệng",
          quantity: 1,
          unitPrice: 200000,
          totalPrice: 200000,
        },
      ],
      totalBasePrice: 850000,
      totalInsuranceCovered: 0, // BHYT không chi trả răng
      totalPatientPay: 850000,
      insuranceType: "Không áp dụng BHYT",
      insuranceNumber: "DN123456789",
      paymentStatus: "PAID",
      paymentMethod: "TRANSFER",
      paymentDate: "2025-09-20",
      note: "Dịch vụ nha khoa không được BHYT chi trả",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // Thêm dữ liệu cho user khác để test
    {
      userId: "U002",
      visitId: "V001",
      visitDate: "2025-11-15",
      hospitalId: "H003",
      hospitalName: "Bệnh viện Chợ Rẫy",
      hospitalAddress: "201B Nguyễn Chí Thanh, Quận 5, TP.HCM",
      doctorName: "BS. Phạm Văn D",
      department: "Khoa Tim mạch",
      diagnosis: "Huyết áp cao",
      services: [
        {
          serviceId: "SV001",
          serviceName: "Phí khám bệnh",
          quantity: 1,
          unitPrice: 150000,
          totalPrice: 150000,
        },
        {
          serviceId: "SV009",
          serviceName: "Điện tâm đồ",
          quantity: 1,
          unitPrice: 250000,
          totalPrice: 250000,
        },
        {
          serviceId: "SV010",
          serviceName: "Siêu âm tim",
          quantity: 1,
          unitPrice: 400000,
          totalPrice: 400000,
        },
        {
          serviceId: "SV011",
          serviceName: "Thuốc hạ huyết áp",
          quantity: 3,
          unitPrice: 100000,
          totalPrice: 300000,
        },
      ],
      totalBasePrice: 1100000,
      totalInsuranceCovered: 880000,
      totalPatientPay: 220000,
      insuranceType: "BHYT 80%",
      insuranceNumber: "HN987654321",
      paymentStatus: "PAID",
      paymentMethod: "CASH",
      paymentDate: "2025-11-15",
      note: "Uống thuốc đều đặn, tái khám sau 2 tuần",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  console.log(`Starting to seed ${items.length} items to ${TABLE}...`);

  for (const item of items) {
    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE,
          Item: item,
        })
      );
      console.log(
        `✅ Inserted bill: userId=${item.userId}, visitId=${item.visitId}, hospital=${item.hospitalName}`
      );
    } catch (error) {
      console.error(
        `❌ Failed to insert userId=${item.userId}, visitId=${item.visitId}:`,
        error.message
      );
    }
  }

  console.log("\n🎉 Seeding completed!");
  console.log(`Total items seeded: ${items.length}`);
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
