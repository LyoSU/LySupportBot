import { apiThrottler } from "@grammyjs/transformer-throttler";

const globalConfig = {
  reservoir: 30,                  // Number of new jobs that throttler will accept at start
  reservoirRefreshAmount: 30,     // Number of jobs that throttler will accept after refresh
  reservoirRefreshInterval: 1000, // Interval in milliseconds where reservoir will refresh
};

// Outgoing Group Throttler
const groupConfig = {
  maxConcurrent: 1,                // Only 1 job at a time
  minTime: 1000,                   // Wait this many milliseconds to be ready, after a job
  reservoir: 20,                   // Number of new jobs that throttler will accept at start
  reservoirRefreshAmount: 20,      // Number of jobs that throttler will accept after refresh
  reservoirRefreshInterval: 60000, // Interval in milliseconds where reservoir will refresh
};
// private
const outConfig = {
  maxConcurrent: 10,                // Only 1 job at a time
  minTime: 700,                     // Wait this many milliseconds to be ready, after a job
};


export default apiThrottler({global: globalConfig, group: groupConfig, out:outConfig});