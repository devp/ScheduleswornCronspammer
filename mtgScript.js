// @ts-check

const { exec } = require("child_process");
const chrono = require("chrono-node");
const fs = require("fs");
const os = require("os");
const path = require("path");

/**
 * Define the path to the configuration file
 * @type {string}
 */
const configFilePath = path.join(os.homedir(), ".mtgrc.json");

/**
 * @typedef {Object} Appointment
 * @property {string} text - The appointment text.
 * @property {string} date - The appointment date in ISO string format.
 * @property {boolean} acked - Indicates if the event has been acknowledged.
 */

/**
 * @type {Appointment[]} - Array of appointments read from the configuration file.
 */
const DEFAULT_CONTENT = [];

/**
 * @type {Appointment[]} - Array of appointments read from the configuration file.
 */
let appointments = DEFAULT_CONTENT;

const NOWISH_INTERVAL_MSEC = 10 * 60 * 1000;

function usage() {
  console.log(
    "commands:\n",
    "\tinit\n",
    "\tall | today\n",
    "\tnowish | nowish-notify | nowish-debug | ACK\n",
    "\tadd | prune | daily-setup\n",
  );
}

/**
 * Main function to execute the script based on the command provided in the command line arguments.
 */
function main() {
  /**
   * The command provided as a command line argument.
   * @type {string}
   */
  const command = process.argv[2];

  if (!command) {
    usage();
    return;
  }

  if (command === "init") {
    // Initialize the configuration file if it does not exist
    initializeConfigFile();
  } else {
    // Read appointments from the configuration file
    appointments = readAppointmentsFromConfig();

    if (command === "add") {
      // Add a new appointment from command line input
      addAppointment();
    } else if (command === "prune") {
      pruneAppointments();
    } else if (command === "daily-setup") {
      dailySetup();
    } else if (command === "nowish") {
      listNowIshSummary();
    } else if (command === "nowish-debug") {
      listNowIshDebug();
    } else if (command === "nowish-notify") {
      listNowIshNotify();
    } else if (command === "ACK") {
      acknowledgeNowIshEvents();
    } else if (command === "all") {
      // List all meetings from the configuration file
      listAllMeetings();
    } else if (command === "today") {
      // List today's meetings by default
      listTodayMeetings();
    } else {
      usage();
    }
  }
}

/**
 * Initializes the configuration file if it does not exist.
 */
function initializeConfigFile() {
  if (!fs.existsSync(configFilePath)) {
    fs.writeFileSync(configFilePath, JSON.stringify(DEFAULT_CONTENT), "utf8");
    console.log("Config file initialized.");
  } else {
    console.log("Config file already exists.");
  }
}

/**
 * Lists all meetings from the configuration file.
 */
function listAllMeetings() {
  console.log("All meetings:");
  appointments.forEach((appointment, index) => {
    console.log(
      `${index + 1}. ${appointment.text} - ${new Date(appointment.date)}`
    );
  });
}

/**
 * Lists today's meetings from the configuration file.
 */
function listTodayMeetings() {
  /**
   * Date representing the current day with hours, minutes, seconds, and milliseconds set to zero.
   * @type {Date}
   */
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /**
   * Array of appointments for today.
   * @type {Appointment[]}
   */
  const todayMeetings = appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.date);
    return appointmentDate >= today;
  });

  console.log("Today's meetings:");
  todayMeetings.forEach((appointment, index) => {
    console.log(
      `${index + 1}. ${appointment.text} - ${new Date(appointment.date)}`
    );
  });
}

/**
 * Lists nowish events where acked is false, in summary format
 */
function listNowIshSummary() {
  const mtgs = listNowIshSummaryImpl();
  if (mtgs.length) {
    console.log(mtgs.map((m) => m.text).join("; "));
  }
}

function listNowIshNotify() {
  const mtgs = listNowIshSummaryImpl();
  if (!mtgs.length) return;
  const mtgMsg = mtgs.map((m) => m.text).join("; ");
  // TODO: move the notifier to configs
  exec(`/usr/local/bin/terminal-notifier -sound Glass -title my-mtg-alerter -message "${mtgMsg}"`);
}

function listNowIshDebug() {
  const mtgs = listNowIshSummaryImpl();
  console.log("nowish non-acked:");
  if (mtgs.length) {
    mtgs.forEach((m, i) => {
      console.log(`${i}. `, m.text);
    })
  } else {
    console.log("- none")
  }
}

function listNowIshSummaryImpl() {
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - NOWISH_INTERVAL_MSEC);
  const fifteenMinutesFuture = new Date(now.getTime() + NOWISH_INTERVAL_MSEC);

  const nowIshMeetings = appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.date);
    return (
      !appointment.acked &&
      appointmentDate >= fifteenMinutesAgo &&
      appointmentDate <= fifteenMinutesFuture
    );
  });

  return nowIshMeetings;
}

/**
 * Marks nowish non-acked events as acked=true and lists the changed events.
 */
function acknowledgeNowIshEvents() {
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - NOWISH_INTERVAL_MSEC);
  const fifteenMinutesFuture = new Date(now.getTime() + NOWISH_INTERVAL_MSEC);

  const nowIshMeetings = appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.date);
    return (
      !appointment.acked &&
      appointmentDate >= fifteenMinutesAgo &&
      appointmentDate <= fifteenMinutesFuture
    );
  });

  console.log("Acknowledging nowish meetings:");
  nowIshMeetings.forEach((appointment, index) => {
    console.log(
      `${index + 1}. ${appointment.text} - ${new Date(appointment.date)}`
    );
    appointment.acked = true;
  });

  // Save the updated appointments to the configuration file
  saveAppointmentsToConfig();
}

/**
 * Adds a new appointment based on the command line input.
 */
function addAppointment() {
  const text = process.argv.slice(3).join(" ");

  if (text.trim() === "") {
    console.error("Please provide appointment details.");
    return;
  }

  const results = chrono.parse(text);

  if (results.length > 0) {
    const parsedDate = results[0].start.date();
    console.log("Parsed meeting time:", parsedDate);

    appointments.push({
      text: text,
      date: parsedDate.toISOString(),
      acked: false,
    });

    saveAppointmentsToConfig();
    console.log("Appointment saved.");
  } else {
    console.log("Could not parse meeting time.");
  }
}

/**
 * Prunes appointments that are older than today.
 */
function pruneAppointments() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let numPruned = 0;

  appointments = appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.date);
    if (appointmentDate < today) {
      console.log(`Appointment pruned: ${appointment.text}`);
      numPruned += 1;
      return false;
    }
    return true;
  });

  saveAppointmentsToConfig();
  console.log(`Appointments pruned: ${numPruned}.`);
}

/**
 * Runs the daily setup, including pruning and adding events for today.
 */
function dailySetup() {
  pruneAppointments();

  // Assuming you want to add multiple events interactively
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  (function addEvents() {
    rl.question("Enter an event for today (or press Enter to finish): ", (text) => {
      if (text.trim() === "") {
        rl.close();
        return;
      }

      const results = chrono.parse(text);

      if (results.length > 0) {
        const parsedDate = results[0].start.date();
        console.log("Parsed meeting time:", parsedDate);

        appointments.push({
          text: text,
          date: parsedDate.toISOString(),
          acked: false
        });

        saveAppointmentsToConfig();
        console.log("Appointment saved.");
      } else {
        console.log("Could not parse meeting time.");
      }

      addEvents(); // Continue adding events recursively
    });
  })();
}

/**
 * Reads appointments from the configuration file.
 * @returns {Appointment[]} Array of appointments.
 */
function readAppointmentsFromConfig() {
  try {
    const configFileData = fs.readFileSync(configFilePath, "utf8");
    return JSON.parse(configFileData);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Error reading config file:", error);
    }
    return [];
  }
}

/**
 * Saves appointments to the configuration file.
 */
function saveAppointmentsToConfig() {
  try {
    const configData = JSON.stringify(appointments, null, 2);
    fs.writeFileSync(configFilePath, configData, "utf8");
  } catch (error) {
    console.error("Error saving config file:", error);
  }
}

main();
