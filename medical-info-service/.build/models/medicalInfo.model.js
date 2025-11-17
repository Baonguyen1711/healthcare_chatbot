"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceType = exports.MedicalCategory = void 0;
var MedicalCategory;
(function (MedicalCategory) {
    MedicalCategory["DISEASE"] = "disease";
    MedicalCategory["PREVENTION"] = "prevention";
    MedicalCategory["TREATMENT"] = "treatment";
    MedicalCategory["NUTRITION"] = "nutrition";
    MedicalCategory["MENTAL_HEALTH"] = "mental_health";
    MedicalCategory["MEDICATION"] = "medication";
    MedicalCategory["FIRST_AID"] = "first_aid";
    MedicalCategory["VACCINATION"] = "vaccination";
    MedicalCategory["COVID19"] = "covid19";
})(MedicalCategory || (exports.MedicalCategory = MedicalCategory = {}));
var SourceType;
(function (SourceType) {
    SourceType["WHO"] = "WHO";
    SourceType["CDC"] = "CDC";
    SourceType["MOH_VN"] = "MOH_VN";
    SourceType["VERIFIED"] = "VERIFIED";
})(SourceType || (exports.SourceType = SourceType = {}));
//# sourceMappingURL=medicalInfo.model.js.map