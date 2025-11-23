#!/usr/bin/env node

import { createHospitalService } from "./appointment-service/services/hospitalService";
import { createDepartmentService } from "./appointment-service/services/departmentService";
import { createDoctorService } from "./appointment-service/services/doctorService";
import { createDoctorScheduleService } from "./appointment-service/services/doctorScheduleService";

async function seedData() {
  console.log("🌱 Starting data seeding...");

  try {
    // 1. Tạo Hospitals
    console.log("Creating hospitals...");
    await createHospitalService({
      id: "bv1",
      name: "Bệnh viện Đa khoa Trung ương",
      address: "123 Đường Nguyễn Huệ, Q.1, TP.HCM",
      description: "Bệnh viện đa khoa hàng đầu tại TP.HCM",
    });

    await createHospitalService({
      id: "bv2",
      name: "Phòng khám Đa khoa Gia Đình",
      address: "456 Lê Lợi, Q.3, TP.HCM",
      description: "Phòng khám gia đình uy tín",
    });

    await createHospitalService({
      id: "bv3",
      name: "Bệnh viện Nhi Đồng 1",
      address: "789 Trần Hưng Đạo, Q.5, TP.HCM",
      description: "Chuyên khoa nhi",
    });

    // 2. Tạo Departments
    console.log("Creating departments...");
    await createDepartmentService({
      id: "dept1",
      name: "Tim mạch",
      description: "Chuyên khoa tim mạch",
      hospitalId: "bv1",
    });

    await createDepartmentService({
      id: "dept2",
      name: "Nội khoa",
      description: "Chuyên khoa nội",
      hospitalId: "bv1",
    });

    await createDepartmentService({
      id: "dept3",
      name: "Nhi khoa",
      description: "Chuyên khoa nhi",
      hospitalId: "bv1",
    });

    await createDepartmentService({
      id: "dept4",
      name: "Da liễu",
      description: "Chuyên khoa da liễu",
      hospitalId: "bv2",
    });

    await createDepartmentService({
      id: "dept5",
      name: "Tai mũi họng",
      description: "Chuyên khoa tai mũi họng",
      hospitalId: "bv2",
    });

    // 3. Tạo Doctors
    console.log("Creating doctors...");
    await createDoctorService({
      id: "bs1",
      name: "BS. Nguyễn Văn A",
      departmentId: "dept1",
      hospitalId: "bv1",
    });

    await createDoctorService({
      id: "bs2",
      name: "BS. Trần Thị B",
      departmentId: "dept2",
      hospitalId: "bv1",
    });

    await createDoctorService({
      id: "bs3",
      name: "BS. Lê Văn C",
      departmentId: "dept3",
      hospitalId: "bv1",
    });

    await createDoctorService({
      id: "bs4",
      name: "BS. Phạm Thị D",
      departmentId: "dept4",
      hospitalId: "bv2",
    });

    await createDoctorService({
      id: "bs5",
      name: "BS. Hoàng Văn E",
      departmentId: "dept5",
      hospitalId: "bv2",
    });

    await createDoctorService({
      id: "bs6",
      name: "BS. Võ Thị F",
      departmentId: "dept3",
      hospitalId: "bv3",
    });

    // 4. Tạo Doctor Schedule
    console.log("Creating doctor schedules...");
    const doctors = ["bs1", "bs2", "bs3", "bs4", "bs5", "bs6"];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      for (const doctorId of doctors) {
        await createDoctorScheduleService({
          doctorId,
          hospitalId:
            doctorId === "bs4" || doctorId === "bs5"
              ? "bv2"
              : doctorId === "bs6"
              ? "bv3"
              : "bv1",
          date: dateStr,
          workingHours: {
            start: "08:00",
            end: "17:00",
          },
          availableSlots: [
            "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
            "11:00", "11:30", "14:00", "14:30", "15:00", "15:30",
            "16:00", "16:30"
          ],
        });
      }
    }

    console.log("✅ Data seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
}

seedData();
