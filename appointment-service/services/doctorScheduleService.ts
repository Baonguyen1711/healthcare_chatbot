import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddbDocClient, TABLE_NAME } from "../utils/db";
import { DoctorSchedule } from "../models/appointment";

// Tạo lịch làm việc cho bác sĩ
export async function createDoctorScheduleService(data: {
  doctorId: string;
  hospitalId: string;
  date: string;
  workingHours: {
    start: string;
    end: string;
  };
  availableSlots?: string[];
}) {
  const scheduleId = `SCHEDULE#${data.doctorId}#${data.date}`;

  // Tạo available slots nếu không có
  const slots =
    data.availableSlots ||
    generateTimeSlots(data.workingHours.start, data.workingHours.end);

  const item = {
    PK: `DOCTOR#${data.doctorId}`,
    SK: `SCHEDULE#${data.date}`,
    entityType: "DoctorSchedule",
    doctorId: data.doctorId,
    hospitalId: data.hospitalId,
    date: data.date,
    availableSlots: slots,
    bookedSlots: [],
    workingHours: data.workingHours,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await ddbDocClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return { scheduleId };
}

// Lấy lịch làm việc của bác sĩ theo ngày
export async function getDoctorScheduleService(data: {
  doctorId: string;
  date: string;
}) {
  
  const result = await ddbDocClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `DOCTOR#${data.doctorId}`,
        SK: `SCHEDULE#${data.date}`,
      },
    })
  );
  console.log('dâd',result.Item as DoctorSchedule);
  return result.Item as DoctorSchedule | null;
}

// Lấy tất cả lịch làm việc của bác sĩ trong khoảng thời gian
export async function getDoctorSchedulesByDateRangeService(data: {
  doctorId: string;
  startDate: string;
  endDate: string;
}) {
  const result = await ddbDocClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `DOCTOR#${data.doctorId}`,
        ":sk": "SCHEDULE#",
        ":etype": "DoctorSchedule",
        ":startDate": data.startDate,
        ":endDate": data.endDate,
      },
      FilterExpression:
        "entityType = :etype AND #date BETWEEN :startDate AND :endDate",
      ExpressionAttributeNames: {
        "#date": "date",
      },
    })
  );

  return (result.Items as DoctorSchedule[]) ?? [];
}

// Book một slot
export async function bookSlotService(data: {
  doctorId: string;
  date: string;
  time: string;
}) {
  const schedule = await getDoctorScheduleService({
    doctorId: data.doctorId,
    date: data.date,
  });

  if (!schedule) {
    throw new Error("Doctor schedule not found");
  }

  if (!schedule.availableSlots.includes(data.time)) {
    throw new Error("Time slot not available");
  }

  if (schedule.bookedSlots.includes(data.time)) {
    throw new Error("Time slot already booked");
  }

  // Update booked slots
  const updatedBookedSlots = [...schedule.bookedSlots, data.time];
  const updatedAvailableSlots = schedule.availableSlots.filter(
    (slot) => slot !== data.time
  );

  await ddbDocClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `DOCTOR#${data.doctorId}`,
        SK: `SCHEDULE#${data.date}`,
      },
      UpdateExpression:
        "SET bookedSlots = :bookedSlots, availableSlots = :availableSlots, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":bookedSlots": updatedBookedSlots,
        ":availableSlots": updatedAvailableSlots,
        ":updatedAt": new Date().toISOString(),
      },
    })
  );
  console.log('đasad')
  return { success: true };
}

// Cancel một slot
export async function cancelSlotService(data: {
  doctorId: string;
  date: string;
  time: string;
}) {
  const schedule = await getDoctorScheduleService({
    doctorId: data.doctorId,
    date: data.date,
  });

  if (!schedule) {
    throw new Error("Doctor schedule not found");
  }

  if (!schedule.bookedSlots.includes(data.time)) {
    throw new Error("Time slot not booked");
  }

  // Remove from booked slots and add back to available slots
  const updatedBookedSlots = schedule.bookedSlots.filter(
    (slot) => slot !== data.time
  );
  const updatedAvailableSlots = [...schedule.availableSlots, data.time].sort();

  await ddbDocClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `DOCTOR#${data.doctorId}`,
        SK: `SCHEDULE#${data.date}`,
      },
      UpdateExpression:
        "SET bookedSlots = :bookedSlots, availableSlots = :availableSlots, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":bookedSlots": updatedBookedSlots,
        ":availableSlots": updatedAvailableSlots,
        ":updatedAt": new Date().toISOString(),
      },
    })
  );

  return { success: true };
}

// Lấy available slots của bác sĩ theo ngày
export async function getAvailableSlotsService(data: {
  doctorId: string;
  date: string;
}) {
  const schedule = await getDoctorScheduleService({
    doctorId: data.doctorId,
    date: data.date,
  });

  if (!schedule) {
    return { availableSlots: [], bookedSlots: [] };
  }

  return {
    availableSlots: schedule.availableSlots,
    bookedSlots: schedule.bookedSlots,
  };
}

// Helper function: Tạo time slots từ start time đến end time
function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const start = parseInt(startTime.split(":")[0]);
  const end = parseInt(endTime.split(":")[0]);

  for (let hour = start; hour < end; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`);
    slots.push(`${hour.toString().padStart(2, "0")}:30`);
  }

  return slots;
}
