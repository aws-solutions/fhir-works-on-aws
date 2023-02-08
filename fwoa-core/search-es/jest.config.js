// set timezone for consistency in snapshot tests that involve dates
process.env.TZ = "UTC";

module.exports = {
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "\\.(ts)$": "ts-jest",
  },
  testRegex: ".test.(ts|js)$",
  setupFilesAfterEnv: ["<rootDir>/jest.env.js"],
};
