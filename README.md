# healthcare_chatbot

- Tạo branch tương ứng với tên service
- Chạy npm install nếu chưa có node_modules
- Thêm AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY vào file .env
- cd vào thư mục service của mình code (mỗi service cơ bản có handlers, services)
- sau khi code xong chạy: serverless deploy để deploy lên cloud 

# Cập nhật thêm
- Đã hoàn thiện phần đăng ký, đăng nhập. Khi xử lý những endpoint liên quan đến userId (và role) thì xử dụng những hàm trong shared/authRequire
- **Thêm đoạn sau vào serverless.yml:**
```yaml
package:
  include:
    - ../shared/**   
  exclude:
    - node_modules/**
