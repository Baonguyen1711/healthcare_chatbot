import { Doctor } from "../models/appointment";
import {
  createDoctorService,
  getDoctorsByDepartmentService,
  getDoctorsByHospitalService,
  getDoctorByIdService,
} from "../services/doctorService";
import { formatResponse } from "../utils/response";
export const addDoctor = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { name, departmentId, id, hospitalId } = body;
    if (!name || !hospitalId) {
      return formatResponse(400, "name and hospitalId are required");
    }
    await createDoctorService({ name, departmentId, id, hospitalId });
    return formatResponse(200, "add Doctor successfully");
  } catch (error: any) {
    console.error(error);
    return formatResponse(
      error.name === "ConditionalCheckFailedException" ? 409 : 500,
      { message: error.message }
    );
  }
};

export const getDoctorByDepartment = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { departmentId } = body;
    if (!departmentId) {
      return formatResponse(400, "departmentId is required");
    }
    const doctors = await getDoctorsByDepartmentService({ departmentId });
    return formatResponse(200, doctors);
  } catch (error: any) {
    console.error(error);
    return formatResponse(
      error.name === "ConditionalCheckFailedException" ? 409 : 500,
      { message: error.message }
    );
  }
};

export const getDoctorsByHospital = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { hospitalId } = body;
    if (!hospitalId) {
      return formatResponse(400, "hospitalId is required");
    }
    const doctors = await getDoctorsByHospitalService({ hospitalId });
    return formatResponse(200, doctors);
  } catch (error: any) {
    console.error(error);
    return formatResponse(
      error.name === "ConditionalCheckFailedException" ? 409 : 500,
      { message: error.message }
    );
  }
};

export const getDoctorById = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    console.log(event);
    const { doctorId } = body;
    if (!doctorId) {
      return formatResponse(400, "doctorId is required");
    }
    const doctor = await getDoctorByIdService({ doctorId });
    if (!doctor) {
      return formatResponse(404, { message: "Doctor not found" });
    }
    return formatResponse(200, doctor);
  } catch (error: any) {
    console.error(error);
    return formatResponse(
      error.name === "ConditionalCheckFailedException" ? 409 : 500,
      { message: error.message }
    );
  }
};
