import {
  createAppointmentService,
  getAppointmentsByDoctorService,
  getAppointmentsByUserService,
  getAppointmentsByStatusService,
  getAppointmentsByHospitalService,
} from "../services/appoinmentService";
import { formatResponse } from "../utils/response";
export const addAppointment = async (event: any) => {
  try {
    
    const body = JSON.parse(event.body);

    const {
      appointmentId,
      doctorId,
      userId,
      hospitalId,
      patientName,
      phone,
      email,
      date,
      time,
      symptoms,
    } = body;

    const res =await createAppointmentService({
      appointmentId,
      doctorId,
      userId,
      hospitalId,
      patientName,
      phone,
      email,
      date,
      time,
      symptoms,
    });
    return formatResponse(200, res);
  } catch (error: any) {
    console.error(error);
    return formatResponse(
      error.name === "ConditionalCheckFailedException" ? 409 : 500,
      { message: error.message }
    );
  }
};

export const getAppointmentsByDoctor = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { doctorId } = body;
    if (!doctorId) {
      return formatResponse(400, "doctorId is required");
    }
    const items = await getAppointmentsByDoctorService({ doctorId });
    return formatResponse(200, items);
  } catch (error: any) {
    console.error(error);
    return formatResponse(
      error.name === "ConditionalCheckFailedException" ? 409 : 500,
      { message: error.message }
    );
  }
};

export const getAppointmentsByUser = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { userId } = body;
    if (!userId) {
      return formatResponse(400, "userId is required");
    }
    const items = await getAppointmentsByUserService({ userId });
    return formatResponse(200, items);
  } catch (error: any) {
    console.error(error);
    return formatResponse(
      error.name === "ConditionalCheckFailedException" ? 409 : 500,
      { message: error.message }
    );
  }
};

export const getAppointmentsByStatus = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { status } = body;
    if (typeof status === "undefined") {
      return formatResponse(400, "status is required");
    }
    const statusBoolean = String(status).toLowerCase() === "true";
    const items = await getAppointmentsByStatusService({
      status: statusBoolean,
    });
    return formatResponse(200, items);
  } catch (error: any) {
    console.error(error);
    return formatResponse(
      error.name === "ConditionalCheckFailedException" ? 409 : 500,
      { message: error.message }
    );
  }
};

export const getAppointmentsByHospital = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { hospitalId } = body;
    if (!hospitalId) {
      return formatResponse(400, "hospitalId is required");
    }
    const items = await getAppointmentsByHospitalService({ hospitalId });
    return formatResponse(200, items);
  } catch (error: any) {
    console.error(error);
    return formatResponse(
      error.name === "ConditionalCheckFailedException" ? 409 : 500,
      { message: error.message }
    );
  }
};
