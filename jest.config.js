/** @type {import('jest').Config} */

const config = {
  passWithNoTests: true,
  roots: ["<rootDir>/test"],
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  }
};

export default config;
