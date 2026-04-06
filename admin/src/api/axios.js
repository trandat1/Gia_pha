import axios from 'axios';

const api = axios.create({
    // Đường dẫn gốc đến API Backend của bạn
    baseURL: 'http://localhost:8000/api/v1',
    
    // CỰC KỲ QUAN TRỌNG: 
    // Cho phép trình duyệt gửi và nhận Cookie (chứa Access Token) tự động.
    withCredentials: true, 
    
    headers: {
        'Content-Type': 'application/json',
    }
});

export default api;