import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000', // Change this one line when you deploy!
  withCredentials: true // Important: This sends the cookies/token to the backend automatically
});

export default api;