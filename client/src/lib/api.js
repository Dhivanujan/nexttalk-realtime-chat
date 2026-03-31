import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Crucial: Send cookies on every request!
});

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);
  
  const response = await api.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  
  return response.data.url;
};
