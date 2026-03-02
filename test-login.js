#!/usr/bin/env node

const axios = require("axios");

async function testLogin() {
  try {
    console.log("Testing login endpoint...");
    const response = await axios.post("http://localhost:3000/api/bot/login", {
      username: "sourav",
      password: "8636521212",
    });

    console.log("Response Status:", response.status);
    console.log("Response Data:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Full Error:", error);
    if (error.response) {
      console.error("Response Status:", error.response.status);
      console.error("Response Data:", error.response.data);
    } else if (error.code) {
      console.error("Error Code:", error.code);
    }
  }
}

testLogin();
