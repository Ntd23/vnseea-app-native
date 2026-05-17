Terminal 1: chạy Metro
    pnpm start
    
Terminal 2: chạy app
    adb reverse tcp:8081 tcp:8081
    pnpm android

Nếu cắm máy không nhận, kiểm tra:
    adb devices
    -> Hiện: xxxxxxxx    device

kết nối qua wifi: adb connect IP:PORT
                  