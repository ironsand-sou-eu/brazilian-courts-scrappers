/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
  preset: "ts-jest",
  testEnvironment: "jest-environment-node",
  testPathIgnorePatterns: ["<rootDir>/nome_modules/", "<rootDir>/dist/"],
  // setupFilesAfterEnv: ["<rootDir>/setupTests.js"],
  transform: {},
};

export default config;
