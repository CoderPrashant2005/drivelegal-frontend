
// axiosClient.js
// Central API client → talks to Python Flask backend
import axios from "axios";

const axiosClient = axios.create({
  baseURL: "https://drivelegal-backend-sdkv.onrender.com/api",
  headers: { "Content-Type": "application/json" },
});

export default axiosClient;



