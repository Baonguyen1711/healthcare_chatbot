const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function viewAllData() {
    try {
        const command = new ScanCommand({
            TableName: "HospitalBills",
        });

        const response = await docClient.send(command);

        console.log("\n📊 Dữ liệu trong bảng HospitalBills:");
        console.log("=====================================\n");

        if (response.Items && response.Items.length > 0) {
            response.Items.forEach((item, index) => {
                console.log(`Record ${index + 1}:`);
                console.log(JSON.stringify(item, null, 2));
                console.log("-------------------------------------\n");
            });
            console.log(`✅ Tổng số records: ${response.Items.length}`);
        } else {
            console.log("⚠️  Không có dữ liệu trong bảng");
        }
    } catch (error) {
        console.error("❌ Lỗi khi đọc dữ liệu:", error);
    }
}

viewAllData();
