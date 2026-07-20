# Hướng dẫn Backup & Restore Database (MySQL)

Tài liệu này hướng dẫn cách backup và khôi phục cơ sở dữ liệu MySQL trên môi trường production.

## 1. Tần suất backup đề xuất
- **Daily Backup**: Backup định kỳ mỗi ngày vào 02:00 AM (GMT+7).
- **Retention**: Lưu trữ các bản sao lưu trong 30 ngày gần nhất.
- **Lưu trữ**: Đẩy trực tiếp bản backup lên AWS S3 hoặc dịch vụ Storage an toàn bên ngoài, tránh lưu trên cùng server database.

## 2. Quy trình Backup thủ công
Sử dụng công cụ `mysqldump` để tạo bản backup:

```bash
# Backup toàn bộ database với nén gzip
mysqldump -u [username] -p[password] -h [host] -P [port] --single-transaction --routines --triggers website_banhang | gzip > backup_website_banhang_$(date +%F_%H%M%S).sql.gz
```

Lưu ý:
- `--single-transaction`: Tránh lock tables trong quá trình backup (áp dụng cho InnoDB tables).
- Không để password hiển thị rõ trong script chạy tự động (sử dụng `.my.cnf` hoặc environment variables).

## 3. Quy trình Restore Database
Khôi phục dữ liệu từ file backup `.sql.gz`:

```bash
# Giải nén và restore vào database đích
gunzip -c backup_file_name.sql.gz | mysql -u [username] -p[password] -h [host] -P [port] website_banhang
```

*Lưu ý an toàn:*
- Luôn kiểm tra kết nối mạng và đảm bảo database đích đang trống hoặc đã được clone dự phòng trước khi khôi phục.
- Chạy test restore định kỳ (Restore rehearsal) trên môi trường staging ít nhất mỗi quý một lần để đảm bảo file backup không bị lỗi.