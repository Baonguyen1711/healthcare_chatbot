import {
  createDoctorScheduleService,
  getDoctorScheduleService,
  getDoctorSchedulesByDateRangeService,
  getAvailableSlotsService,
  bookSlotService,
  cancelSlotService,
} from "../services/doctorScheduleService";
import { formatResponse } from "../utils/response";

// Tạo lịch làm việc cho bác sĩ
export const createDoctorSchedule = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { doctorId, hospitalId, date, workingHours, availableSlots } = body;

    if (!doctorId || !hospitalId || !date || !workingHours) {
      return formatResponse(
        400,
        "doctorId, hospitalId, date, and workingHours are required"
      );
    }

    await createDoctorScheduleService({
      doctorId,
      hospitalId,
      date,
      workingHours,
      availableSlots,
    });

    return formatResponse(200, "Doctor schedule created successfully");
  } catch (error: any) {
    console.error(error);
    return formatResponse(500, { message: error.message });
  }
};

// Lấy lịch làm việc của bác sĩ theo ngày
export const getDoctorSchedule = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { doctorId, date } = body;

    if (!doctorId || !date) {
      return formatResponse(400, "doctorId and date are required");
    }

    const schedule = await getDoctorScheduleService({ doctorId, date });

    if (!schedule) {
      return formatResponse(404, { message: "Schedule not found" });
    }

    return formatResponse(200, schedule);
  } catch (error: any) {
    console.error(error);
    return formatResponse(500, { message: error.message });
  }
};

// Lấy available slots của bác sĩ theo ngày
export const getAvailableSlots = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { doctorId, date } = body;

    if (!doctorId || !date) {
      return formatResponse(400, "doctorId and date are required");
    }

    const slots = await getAvailableSlotsService({ doctorId, date });
    return formatResponse(200, slots);
  } catch (error: any) {
    console.error(error);
    return formatResponse(500, { message: error.message });
  }
};

// Lấy lịch làm việc của bác sĩ trong khoảng thời gian
export const getDoctorSchedulesByDateRange = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { doctorId, startDate, endDate } = body;

    if (!doctorId) {
      return formatResponse(400, "doctorId is required");
    }

    if (!startDate || !endDate) {
      return formatResponse(400, "startDate and endDate are required");
    }

    const schedules = await getDoctorSchedulesByDateRangeService({
      doctorId,
      startDate,
      endDate,
    });

    return formatResponse(200, schedules);
  } catch (error: any) {
    console.error(error);
    return formatResponse(500, { message: error.message });
  }
};

// Book một slot (internal use)
export const bookSlot = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { doctorId, date, time } = body;

    if (!doctorId || !date || !time) {
      return formatResponse(400, "doctorId, date, and time are required");
    }

    await bookSlotService({ doctorId, date, time });
    return formatResponse(200, "Slot booked successfully");
  } catch (error: any) {
    console.error(error);
    return formatResponse(500, { message: error.message });
  }
};

// Cancel một slot
export const cancelSlot = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { doctorId, date, time } = body;

    if (!doctorId || !date || !time) {
      return formatResponse(400, "doctorId, date, and time are required");
    }

    await cancelSlotService({ doctorId, date, time });
    return formatResponse(200, "Slot canceled successfully");
  } catch (error: any) {
    console.error(error);
    return formatResponse(500, { message: error.message });
  }
};
