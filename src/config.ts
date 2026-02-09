import dotenv from "dotenv";
dotenv.config();

export const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// 👇 central role guard
export const PERMISSIONS = {
  PROJECT_CREATE: [
    "1321122630744412241",// Neotrix
    "1468897007530672202" //developer noetrix
  ],
};
