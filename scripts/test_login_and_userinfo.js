const axios = require("axios");

async function main() {
  try {
    console.log("Posting login...");
    const loginRes = await axios.post(
      "http://localhost:3000/api/bot/login",
      {
        username: "sourav",
        password: "8636521212",
      },
      { validateStatus: () => true },
    );

    console.log("Login status:", loginRes.status);
    console.log("Login body:", loginRes.data);

    let encoded = "";
    const setCookie = loginRes.headers["set-cookie"];
    if (setCookie) {
        // setCookie is an array of strings
        const botAuthCookie = setCookie.find(c => c.startsWith("bot_auth_data="));
        if (botAuthCookie) {
             // Extract value: bot_auth_data=VALUE; Path=/; ...
             encoded = botAuthCookie.split(";")[0].split("=")[1];
        }
    }

    if (!encoded) {
      console.error("No bot_auth_data cookie in login response");
      process.exit(1);
    }

    const cookieHeader = `bot_auth_data=${encoded}`;
    console.log("Using cookie header:", cookieHeader.slice(0, 60) + "...");

    const userRes = await axios.get(
      "http://localhost:3000/api/justapedia?action=query&meta=userinfo&uiprop=groups%7Crights%7Ceditcount%7Cregistration%7Cemail%7Crealname&format=json",
      {
        headers: {
          Cookie: cookieHeader,
        },
        validateStatus: () => true,
      },
    );

    console.log("Userinfo status:", userRes.status);
    console.log("Userinfo body:", userRes.data);
  } catch (err) {
    console.error("Error:", err.message);
    console.error(err.stack);
    if (err.response) {
      try {
        console.error("Response status:", err.response.status);
      } catch (e) {}
      try {
        console.error("Response headers:", err.response.headers);
      } catch (e) {}
      try {
        console.error("Response data:", JSON.stringify(err.response.data));
      } catch (e) {
        console.error("Response data (raw):", err.response.data);
      }
    }
  }
}

main();
