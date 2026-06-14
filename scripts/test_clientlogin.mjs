import axios from "axios";

const API = "https://justapedia.org/api.php";
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json,text/plain,*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://justapedia.org",
  Referer: "https://justapedia.org/wiki/Special:UserLogin",
};

const tokenRes = await axios.get(API, {
  params: {
    action: "query",
    meta: "tokens",
    type: "login",
    format: "json",
  },
  validateStatus: () => true,
  maxRedirects: 0,
  headers,
});

const cookies = (tokenRes.headers["set-cookie"] || [])
  .map((c) => c.split(";")[0])
  .join("; ");

const loginToken = tokenRes.data?.query?.tokens?.logintoken;
const body = new URLSearchParams({
  action: "clientlogin",
  username: process.argv[2] || "test",
  password: process.argv[3] || "test",
  logintoken: loginToken,
  loginreturnurl: "https://justapedia.org/",
  rememberMe: "1",
  format: "json",
  formatversion: "2",
});

const loginRes = await axios.post(API, body.toString(), {
  validateStatus: () => true,
  maxRedirects: 0,
  headers: {
    ...headers,
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie: cookies,
  },
});

console.log("token status", tokenRes.status);
console.log("login status", loginRes.status);
console.log("location", loginRes.headers.location || "(none)");
if (loginRes.data?.clientlogin) {
  console.log("clientlogin", JSON.stringify(loginRes.data.clientlogin, null, 2));
} else {
  console.log("body", String(loginRes.data).slice(0, 400));
}
