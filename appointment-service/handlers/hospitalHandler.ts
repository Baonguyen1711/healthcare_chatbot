import {
  createHospitalService,
  getHospitalByIdService,
  getAllHospitalsService,
} from "../services/hospitalService";
import { formatResponse } from "../utils/response";

export const addHospital = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { id, name, address, description } = body;

    if (!id || !name) {
      return formatResponse(400, "id and name are required");
    }

    await createHospitalService({ id, name, address, description });
    return formatResponse(200, "add hospital successfully");
  } catch (error: any) {
    console.error(error);
    return formatResponse(
      error.name === "ConditionalCheckFailedException" ? 409 : 500,
      { message: error.message }
    );
  }
};

export const getHospitalById = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { hospitalId } = body;
    if (!hospitalId) {
      return formatResponse(400, "hospitalId is required");
    }

    const item = await getHospitalByIdService({ hospitalId });
    if (!item) {
      return formatResponse(404, { message: "Hospital not found" });
    }
    return formatResponse(200, item);
  } catch (error: any) {
    console.error(error);
    return formatResponse(
      error.name === "ConditionalCheckFailedException" ? 409 : 500,
      { message: error.message }
    );
  }
};

export const getAllHospitals = async (event: any) => {
  try {
    const items = await getAllHospitalsService();
    return formatResponse(200, items);
  } catch (error: any) {
    console.error(error);
    return formatResponse(
      error.name === "ConditionalCheckFailedException" ? 409 : 500,
      { message: error.message }
    );
  }
};
