import { createDepartmentService,getAllDepartmentService,getDepartmentsByHospitalService } from "../services/departmentService";
import { formatResponse } from "../utils/response";
export const addDepartment = async(event:any) => {
    try{
        const body = JSON.parse(event.body);
        const {name,description,id,hospitalId} = body
        console.log(body)
        if ( !name ) {
            return formatResponse(400,'departmentName');
        }
        await createDepartmentService({name,description,id,hospitalId});
        return formatResponse(200,'add department successfully')
    }
    catch(error:any){
            console.error(error);
            return formatResponse(
              error.name === "ConditionalCheckFailedException" ? 409 : 500,
              { message: error.message }
            );
    }
};
export const getDepartmentsByHospitalId = async(event:any) =>{
    try {
        const body = JSON.parse(event.body);
        const {hospitalId} = body
        return await getDepartmentsByHospitalService({hospitalId});
    }    
    catch(error:any){
            console.error(error);
            return formatResponse(
              error.name === "ConditionalCheckFailedException" ? 409 : 500,
              { message: error.message }
            );
    }
  }
export const getAllDepartment = async(event:any) => {
    try{
        return await getAllDepartmentService()
    }    
    catch(error:any){
            console.error(error);
            return formatResponse(
              error.name === "ConditionalCheckFailedException" ? 409 : 500,
              { message: error.message }
            );
    }
}