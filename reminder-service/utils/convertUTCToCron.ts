import moment from "moment-timezone";

export const convertToUTCCron = (notifyTime: string, timezone: string): string => {
  const m = moment.tz(notifyTime, timezone); // parse ISO string in given timezone
  console.log("moment", m.format(), "in timezone", timezone);
  const utcHour = m.utc().hour() - 7; // convert to UTC by subtracting 7 hours
  console.log("UTC hour:", utcHour);
  const utcMinute = m.utc().minute();
  console.log("UTC minute:", utcMinute);
  return `cron(${utcMinute} ${utcHour} * * ? *)`;
}
