# VNSEEA — React Native App

App mobile (iOS + Android) của mạng xã hội VNSEEA. Viết bằng React Native 0.85 + TypeScript, backend là WoWonder (PHP).

> ℹ️ **Backend thật nằm ở repo riêng [Ntd23/demo.vnseea](https://github.com/Ntd23/demo.vnseea).** Thư mục [phtml/](phtml/) trong repo này **chỉ là bản mirror** để tra cứu, có thể đã lệch so với bản thật. Muốn đọc hay sửa backend, hãy làm trên `demo.vnseea`, không sửa trực tiếp trong `phtml/`.

Tài liệu này hướng dẫn từ lúc **mới clone repo** đến lúc **chạy được app** trên simulator/emulator, thiết bị thật, và **build bản release**, cho cả macOS và Windows.

## Mục lục

1. [Tổng quan nhanh](#1-tổng-quan-nhanh)
2. [Cài môi trường trên macOS](#2-cài-môi-trường-trên-macos)
3. [Cài môi trường trên Windows](#3-cài-môi-trường-trên-windows)
4. [Clone repo, cài package và tạo file .env](#4-clone-repo-cài-package-và-tạo-file-env)
5. [Chạy iOS (chỉ trên macOS)](#5-chạy-ios-chỉ-trên-macos)
6. [Chạy Android (macOS và Windows)](#6-chạy-android-macos-và-windows)
7. [Build release](#7-build-release)
8. [Xử lý lỗi thường gặp](#8-xử-lý-lỗi-thường-gặp)
9. [Cấu trúc dự án và tài liệu liên quan](#9-cấu-trúc-dự-án-và-tài-liệu-liên-quan)

---

## 1. Tổng quan nhanh

| Hạng mục | Giá trị |
|---|---|
| React Native | 0.85.3 (New Architecture + Hermes) |
| Package manager | **pnpm 10.23.0** (bắt buộc, xem lưu ý bên dưới) |
| Node.js | ≥ 22.11 (khuyến nghị Node 22 LTS) |
| Android | JDK 17, compileSdk/targetSdk 36, minSdk 24, NDK 27.0.12077973, chỉ build ABI `arm64-v8a` |
| iOS | Xcode bản mới nhất, iOS ≥ 15.1, CocoaPods qua Bundler |
| Bundle ID iOS | `com.vnseea.vnseea` (Team ID `7M6MAXNF4W`) |
| Application ID Android | `com.vnseea.android` |

Có thể build gì trên máy nào:

| | iOS | Android |
|---|---|---|
| macOS | ✅ Simulator + iPhone thật | ✅ Emulator + điện thoại thật |
| Windows | ❌ Không thể (Apple chỉ cho build iOS trên Mac) | ✅ Điện thoại thật (khuyến nghị), emulator cần chỉnh tạm |

> ⚠️ **Chỉ dùng `pnpm`, không dùng `npm install` hay `yarn`.**
> Dự án vá 9 thư viện native (LiveKit, CallKeep, react-native-video, react-native-maps…) bằng các file trong [patches/](patches/). Các bản vá này chỉ được áp dụng tự động khi cài bằng `pnpm` (khai báo ở `pnpm.patchedDependencies` trong `package.json`). Cài bằng npm/yarn thì bản vá không được áp dụng: app vẫn build được nhưng cuộc gọi, PiP, âm thanh, bản đồ… sẽ lỗi.

---

## 2. Cài môi trường trên macOS

Hướng dẫn dưới đây giả định dùng Homebrew và shell `zsh` (mặc định trên macOS).

### 2.1. Công cụ chung

```sh
# Homebrew (bỏ qua nếu đã có)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node 22 LTS và Watchman (Metro dùng để theo dõi file)
brew install node@22 watchman
echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
node -v   # phải ≥ 22.11

# pnpm đúng phiên bản dự án dùng
npm install -g pnpm@10.23.0
pnpm -v   # 10.23.0
```

> Nếu bạn quản lý Node bằng `nvm`, `fnm` hay `volta` thì cũng được. Dự án có khai báo `volta.node = 22.11.0`.

### 2.2. Dành cho iOS

1. Cài **Xcode** từ App Store, mở một lần để Xcode cài thêm các thành phần cần thiết.
2. Cài Command Line Tools và chọn đúng Xcode:
   ```sh
   xcode-select --install
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```
3. Trong Xcode > **Settings > Components**, tải **iOS Simulator** runtime (nếu chưa có).
4. Cài Ruby + Bundler để chạy CocoaPods theo đúng phiên bản trong [Gemfile](Gemfile). Ruby hệ thống của macOS dùng được, nhưng khuyến nghị dùng Ruby của Homebrew:
   ```sh
   brew install ruby
   echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   gem install bundler
   ```

### 2.3. Dành cho Android

1. Cài **JDK 17** (React Native yêu cầu đúng JDK 17):
   ```sh
   brew install --cask zulu@17
   ```
2. Cài **Android Studio**: <https://developer.android.com/studio>.
3. Mở Android Studio > **More Actions > SDK Manager**:
   - Tab **SDK Platforms**: tick **Android 16 (API 36)**.
   - Tab **SDK Tools** (tick **Show Package Details** ở góc dưới):
     - Android SDK Build-Tools → **36.0.0**
     - NDK (Side by side) → **27.0.12077973**
     - CMake → bản mới nhất
     - Android SDK Platform-Tools, Android Emulator
4. Thêm biến môi trường vào `~/.zshrc`:
   ```sh
   export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
   ```
   Sau đó chạy `source ~/.zshrc` và kiểm tra:
   ```sh
   java -version   # 17.x
   adb --version
   ```

---

## 3. Cài môi trường trên Windows

Trên Windows chỉ build được **Android**. Mọi lệnh dưới đây chạy trong **PowerShell**.

### 3.1. Chuẩn bị Git và đường dẫn ngắn

Build native của React Native tạo ra các đường dẫn rất dài, dễ vượt giới hạn 260 ký tự của Windows. Vì vậy cần:

1. Cài **Git for Windows**: <https://git-scm.com/download/win>.
2. Bật hỗ trợ đường dẫn dài. Mở PowerShell bằng **Run as Administrator** và chạy:
   ```powershell
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   git config --system core.longpaths true
   ```
3. **Clone repo vào thư mục có đường dẫn ngắn**, ví dụ `C:\dev\vnseea`. Không nên để trong `Desktop`, `Documents` hay thư mục có dấu tiếng Việt hoặc khoảng trắng.

### 3.2. Node, pnpm, JDK

```powershell
# Dùng winget (có sẵn trên Windows 10/11)
winget install OpenJS.NodeJS.LTS
winget install Azul.Zulu.17.JDK

# Mở lại PowerShell rồi kiểm tra
node -v        # ≥ 22.11
java -version  # 17.x

npm install -g pnpm@10.23.0
pnpm -v        # 10.23.0
```

### 3.3. Android Studio và Android SDK

1. Cài **Android Studio**, sau đó vào **SDK Manager** và tick đúng các mục như [mục 2.3, bước 3](#23-dành-cho-android).
2. Đặt biến môi trường. Mở **System Properties > Environment Variables**, phần **User variables**:
   - `JAVA_HOME` = thư mục JDK 17, ví dụ `C:\Program Files\Zulu\zulu-17`
   - `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
   - Thêm vào `Path`: `%ANDROID_HOME%\platform-tools` và `%ANDROID_HOME%\emulator`
3. Mở PowerShell mới và kiểm tra bằng `adb --version`.

> 💾 **Về RAM:** Gradle được cấu hình dùng tới 6 GB heap (`android/gradle.properties`), và phần C++ build tuần tự để tránh tràn bộ nhớ. Nên dùng máy **≥ 16 GB RAM**. Khi build lần đầu, hãy đóng bớt Chrome và Android Studio.

---

## 4. Clone repo, cài package và tạo file .env

### 4.1. Clone và cài dependencies

macOS:
```sh
git clone <URL-repo-GitHub> vnseea-app-native
cd vnseea-app-native
pnpm install --frozen-lockfile
```

Windows (PowerShell):
```powershell
cd C:\dev
git clone <URL-repo-GitHub> vnseea
cd vnseea
pnpm install --frozen-lockfile
```

Khi cài xong, pnpm sẽ in ra danh sách các patch đã áp dụng. Nếu thấy lỗi `ERR_PNPM_PATCH_FAILED`, nghĩa là phiên bản thư viện không khớp với patch. Kiểm tra lại xem bạn có vô tình chạy `pnpm update` hay sửa `package.json` không.

### 4.2. Tạo file `.env`

App đọc cấu hình qua `react-native-config`. File `.env` **không được commit**, mỗi máy tự tạo:

```sh
cp .env.example .env            # macOS
```
```powershell
Copy-Item .env.example .env     # Windows
```

Sau đó điền giá trị thật. Bảng dưới cho biết lấy từng giá trị ở đâu. Admin panel của backend nằm ở `https://vnseea.vn/admin-cp` (cần tài khoản admin).

| Biến | Bắt buộc | Lấy ở đâu |
|---|---|---|
| `API_BASE_URL` | ✅ | `https://vnseea.vn/api` |
| `WEB_BASE_URL` | ✅ | `https://vnseea.vn` |
| `MEDIA_BASE_URL` | | `https://media.vnseea.vn`. Nếu để trống sẽ dùng `WEB_BASE_URL`. |
| `SOCKET_URL` | | `https://vnseea.vn`, tức server Node.js realtime (Admin panel > **Node**). |
| `SERVER_KEY` | ✅ | Admin panel > **Manage API Access Keys** > ô **"Khóa máy chủ (API v2)"**. Đây chính là giá trị `widnows_app_api_key` trong config WoWonder. Sai key thì mọi API trả lỗi `server_key`. |
| `REQUEST_TIMEOUT_MS` | ✅ | `15000` |
| `ONESIGNAL_APP_ID` | | Admin panel > **Push Notifications System** (các ô "ID ứng dụng OneSignal" cho Android/iOS), hoặc OneSignal Dashboard > app VNSEEA > **Settings > Keys & IDs**. Để trống thì app vẫn chạy nhưng không nhận push. |
| `GOOGLE_MAPS_API_KEY` | | Google Cloud Console (project VNSEEA mobile) > **APIs & Services > Credentials**, key Android đã giới hạn cho `com.vnseea.android`. |
| `GOOGLE_MAPS_ANDROID_CERT_SHA1` | | SHA-1 của **debug keystore** trong repo: `5E8F16062EA3CD2C4A0D547876BAA6F38CABF625`. Chuỗi viết liền, không có dấu `:`. |
| `GOOGLE_MAPS_ANDROID_CERT_SHA1_RELEASE` | ✅ khi build release | Google Play Console > app VNSEEA > **Test and release > App integrity > App signing** > SHA-1 của *App signing key certificate*. Viết liền, không có dấu `:`. |
| `GOOGLE_MAPS_IOS_API_KEY` | | Google Cloud Console, key iOS giới hạn cho `com.vnseea.vnseea`. Xem [duong/google-maps-ios-setup.md](duong/google-maps-ios-setup.md). |
| `GOOGLE_MAPS_MAP_ID` | | Google Cloud Console > **Google Maps Platform > Map Management**. |
| `LIVEKIT_WS_URL` | | Admin panel > **Video Settings** > mục **LiveKit Call Settings** > ô `livekit_host` (dạng `wss://...`). Thiếu thì không gọi điện/livestream được. |

> 🔁 **Mỗi lần sửa `.env` phải build lại native** (`pnpm ios` / `pnpm android`, hoặc Run lại trong Xcode/Android Studio). Reload Metro là **không đủ** vì `react-native-config` ghi giá trị vào code native lúc build.
>
> Nếu mở app thấy lỗi `Missing environment variable: API_BASE_URL` (hoặc biến khác), nghĩa là `.env` thiếu biến đó hoặc chưa build lại native.

---

## 5. Chạy iOS (chỉ trên macOS)

### 5.1. Cài CocoaPods (lần đầu, và mỗi khi thư viện native thay đổi)

```sh
bundle install                 # cài CocoaPods theo Gemfile (chỉ cần lần đầu)
cd ios
bundle exec pod install
cd ..
```

Chạy lại `bundle exec pod install` mỗi khi `pnpm install` có thay đổi thư viện native, hoặc khi pull về thấy `ios/Podfile.lock` thay đổi.

> Dự án dùng thêm **Swift Package** (LiveKit Swift SDK, WebRTC). Lần đầu mở workspace, Xcode sẽ tự tải các package này từ GitHub, mất vài phút. Nếu bị kẹt, vào **File > Packages > Resolve Package Versions**.

### 5.2. Chạy trên iOS Simulator

```sh
# Terminal 1: Metro bundler
pnpm start

# Terminal 2: build và mở simulator
pnpm ios
# hoặc chọn máy cụ thể:
pnpm ios --simulator "iPhone 16 Pro"
```

Xem danh sách simulator có sẵn: `xcrun simctl list devices available`.

Simulator **không** hỗ trợ push notification thật, VoIP/CallKit hay camera. Muốn kiểm tra các tính năng đó, hãy chạy trên iPhone thật.

### 5.3. Chạy trên iPhone thật

#### Bước chung

1. Cắm iPhone vào Mac bằng cáp. Trên iPhone chọn **Trust This Computer**.
2. Bật **Developer Mode**: iPhone > **Settings > Privacy & Security > Developer Mode** > bật, rồi khởi động lại máy. Mục này chỉ hiện sau khi iPhone đã kết nối với Xcode ít nhất một lần.
3. Mở **`ios/VNSEEA.xcworkspace`** (lưu ý là `.xcworkspace`, **không phải** `.xcodeproj`).
4. Chọn target **VNSEEA** > tab **Signing & Capabilities**, rồi làm theo **cách A** hoặc **cách B** bên dưới.
5. Trên thanh công cụ của Xcode, chọn iPhone của bạn làm thiết bị chạy, rồi bấm **Run (⌘R)**.
   Hoặc chạy bằng dòng lệnh:
   ```sh
   pnpm ios --device "Tên iPhone của bạn"
   ```
6. iPhone và Mac phải **cùng mạng Wi-Fi** để app debug kết nối được với Metro. Nếu app báo không kết nối được Metro, lắc máy để mở Dev Menu > **Configure Bundler** và nhập IP của Mac (xem bằng `ipconfig getifaddr en0`), port `8081`.

#### Cách A — Dùng Apple Developer Team của VNSEEA (khuyến nghị)

Đây là cách duy nhất để **push notification, VoIP/CallKit và Google Maps iOS** hoạt động đầy đủ.

1. Nhờ admin tài khoản Apple Developer của VNSEEA mời Apple ID của bạn vào team (App Store Connect > **Users and Access**).
   - Muốn build và chạy trên máy thật: cần vai trò **Developer** trở lên.
   - Muốn tự đăng ký UDID thiết bị và upload bản release: cần **Admin** hoặc **App Manager**.
2. Xcode > **Settings > Accounts** > **+** > đăng nhập Apple ID đó.
3. Trong **Signing & Capabilities**: tick **Automatically manage signing**, Team chọn team VNSEEA (`7M6MAXNF4W`), **giữ nguyên** Bundle Identifier `com.vnseea.vnseea`.
4. Nếu Xcode báo thiết bị chưa được đăng ký, gửi UDID của iPhone (xem ở Xcode > **Window > Devices and Simulators**) cho admin để thêm vào [Apple Developer > Devices](https://developer.apple.com/account/resources/devices/list).

#### Cách B — Dùng Apple ID cá nhân (Personal Team, miễn phí)

Dùng khi chưa được mời vào team, chỉ để thử giao diện và luồng cơ bản.

**Giới hạn:**
- Không có push notification, VoIP/CallKit.
- Google Maps trên iOS sẽ không hiển thị, vì key iOS bị giới hạn theo bundle ID gốc.
- App hết hạn sau 7 ngày, phải build lại.

**Cách làm:**

1. Xcode > **Settings > Accounts** > thêm Apple ID cá nhân.
2. Trong **Signing & Capabilities**:
   - Team: chọn *Tên bạn (Personal Team)*.
   - Bundle Identifier: đổi thành một ID duy nhất, ví dụ `com.<tenban>.vnseea.dev`.
   - Xoá capability **Push Notifications** (bấm dấu **×** bên cạnh). Personal Team không được dùng capability này.
   - Nếu Xcode vẫn báo lỗi entitlement `multitasking-camera-access`, mở `ios/VNSEEA/VNSEEA.entitlements` và xoá tạm key đó.
3. Lần đầu mở app trên iPhone, vào **Settings > General > VPN & Device Management** > tin cậy Apple ID của bạn.
4. ⚠️ **Không commit các thay đổi này.** Trước khi commit, hãy hoàn tác:
   ```sh
   git checkout -- ios/VNSEEA.xcodeproj/project.pbxproj ios/VNSEEA/VNSEEA.entitlements
   ```

---

## 6. Chạy Android (macOS và Windows)

Các lệnh `pnpm ...` giống nhau trên cả hai hệ điều hành. Lệnh Gradle thì khác: trên macOS dùng `./gradlew`, trên Windows dùng `.\gradlew.bat`.

> Lần build Android đầu tiên khá lâu (15–40 phút tuỳ máy) vì phải tải Gradle 9.3.1 và dependencies, rồi biên dịch C++ cho New Architecture. Những lần sau sẽ nhanh hơn nhiều.

### 6.1. Chạy trên điện thoại Android thật (khuyến nghị)

1. Trên điện thoại: **Settings > About phone** > chạm 7 lần vào **Build number** để bật Developer options. Sau đó vào **Developer options** > bật **USB debugging**.
   - Máy Xiaomi/Redmi (MIUI/HyperOS): bật thêm **Install via USB** và **USB debugging (Security settings)**.
2. Cắm cáp USB, trên điện thoại chọn **Allow USB debugging**.
3. Kiểm tra máy tính đã nhận thiết bị:
   ```sh
   adb devices
   # Phải thấy một dòng dạng: R58N12345AB    device
   ```
4. Chạy app:
   ```sh
   # Terminal 1
   pnpm start

   # Terminal 2
   pnpm android
   ```
   Lệnh này tự build, cài APK debug và tự chạy `adb reverse` để điện thoại kết nối Metro qua cáp USB.
5. Nếu rút cáp ra cắm lại mà app báo không kết nối được Metro, chạy:
   ```sh
   adb reverse tcp:8081 tcp:8081
   ```
   Sau đó lắc máy > **Reload**.
6. **Debug qua Wi-Fi** (không cần cáp): lắc máy > **Settings > Debug server host & port for device**, nhập `<IP-máy-tính>:8081`. IP máy tính xem bằng `ipconfig getifaddr en0` trên macOS, hoặc `ipconfig` trên Windows.

Nếu có nhiều thiết bị cùng kết nối, chọn một máy cụ thể bằng:
```sh
pnpm android --deviceId <serial-trong-adb-devices>
```

### 6.2. Chạy trên Android Emulator

App **chỉ build cho ABI `arm64-v8a`** (xem `reactNativeArchitectures` trong `android/gradle.properties` và `abiFilters` trong `android/app/build.gradle`). Vì vậy:

- **Mac Apple Silicon (M1/M2/M3…)**: dùng được emulator bình thường.
  1. Android Studio > **Device Manager** > **Create Virtual Device** > chọn ví dụ Pixel 8.
  2. Chọn system image **API 35 hoặc 36, ABI `arm64-v8a`, loại "Google Play" hoặc "Google APIs"**. Bản Google APIs là cần thiết để có Google Maps và push.
  3. Khởi động emulator, rồi chạy `pnpm start` và `pnpm android`.

- **Windows và Mac Intel**: emulator dùng system image `x86_64` nên **không cài được** APK chỉ có `arm64-v8a`. Khuyến nghị **dùng điện thoại thật**. Nếu bắt buộc phải dùng emulator, hãy **sửa tạm (không commit)** hai chỗ:
  - `android/gradle.properties`:
    ```properties
    reactNativeArchitectures=arm64-v8a,x86_64
    ```
  - `android/app/build.gradle`, trong `defaultConfig > ndk`:
    ```groovy
    abiFilters "arm64-v8a", "x86_64"
    ```

  Tạo emulator với image `x86_64`, Google APIs, rồi chạy `pnpm android`. Trước khi commit thì hoàn tác:
  ```sh
  git checkout -- android/gradle.properties android/app/build.gradle
  ```

### 6.3. Cài APK debug chạy độc lập (không cần Metro)

Dùng khi cần gửi APK cho tester, hoặc cài lên máy không kết nối được tới Metro. Cờ `-PstandaloneDebug` sẽ đóng gói JS bundle hiện tại vào trong APK:

macOS:
```sh
cd android
./gradlew assembleDebug -PstandaloneDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Windows:
```powershell
cd android
.\gradlew.bat assembleDebug -PstandaloneDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

Trên Windows, nếu gặp lỗi đường dẫn quá dài khi build C++, có thể chỉ định thư mục build ngắn hơn:
```powershell
.\gradlew.bat assembleDebug -PstandaloneDebug -PstandaloneNativeBuildDirectory=C:\t\cxx
```

---

## 7. Build release

### 7.1. Checklist nâng phiên bản (làm trước mỗi lần phát hành)

App có cơ chế **nhắc người dùng cập nhật**: app so sánh phiên bản ghi trong code với phiên bản server trả về, nếu khác nhau thì hiện thông báo. Vì vậy cần cập nhật **cả 4 chỗ** sau, đúng thứ tự:

1. **Android**, file [android/app/build.gradle](android/app/build.gradle):
   - `versionCode`: số nguyên, **phải lớn hơn** bản đang có trên Google Play.
   - `versionName`: ví dụ `"9.0.22"`.
2. **iOS**, trong Xcode > target **VNSEEA** > tab **General**:
   - **Version** (`MARKETING_VERSION`): ví dụ `2.0.7`.
   - **Build** (`CURRENT_PROJECT_VERSION`): phải tăng sau mỗi lần upload, kể cả khi Version giữ nguyên.
3. **Phiên bản trong code**, file [src/shared-kernel/application/app-update/appRelease.ts](src/shared-kernel/application/app-update/appRelease.ts): đặt `APP_RELEASE_VERSION` bằng đúng phiên bản sắp phát hành (`ios` = Version iOS, `android` = `versionName`).
4. **Sau khi bản mới đã duyệt và lên store**: vào Admin panel > **Site Settings** > mục **Android & IOS Apps**, cập nhật `vnseea_ios_app_version` / `vnseea_android_app_version`. Người dùng bản cũ sẽ được nhắc cập nhật.
   ⚠️ **Đừng cập nhật bước này trước khi bản mới có trên store**, nếu không người dùng sẽ bị nhắc cập nhật trong khi store chưa có bản mới.

### 7.2. Android: build AAB/APK release (macOS hoặc Windows)

Điều kiện:
- `.env` phải có `GOOGLE_MAPS_ANDROID_CERT_SHA1_RELEASE` hợp lệ (40 ký tự hex). Nếu thiếu, Gradle sẽ **dừng build** và báo lỗi.
- Keystore upload là `android/app/upload-keystore.jks`. Alias và mật khẩu được khai báo ở các biến `MYAPP_UPLOAD_*` trong `android/gradle.properties`.

**AAB** để upload lên Google Play:

macOS:
```sh
cd android
./gradlew clean
./gradlew bundleRelease
```

Windows:
```powershell
cd android
.\gradlew.bat clean
.\gradlew.bat bundleRelease
```

File kết quả: `android/app/build/outputs/bundle/release/app-release.aab`.
Upload file này tại Google Play Console > app VNSEEA > **Test and release** > chọn track (Internal testing / Production) > **Create new release**.

**APK release** để cài thử trực tiếp lên máy:
```sh
./gradlew assembleRelease          # Windows: .\gradlew.bat assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

> APK release được ký bằng upload key, không phải key của Google Play. Vì vậy Google Maps có thể không hiển thị trong APK này, trừ khi SHA-1 của upload key cũng được thêm vào giới hạn của API key. Bản tải từ Google Play thì hiển thị bình thường.

### 7.3. iOS: Archive và upload lên TestFlight / App Store (chỉ macOS)

Điều kiện: Apple ID có vai trò **Admin** hoặc **App Manager** trong team VNSEEA (xem [cách A](#cách-a--dùng-apple-developer-team-của-vnseea-khuyến-nghị)), và `.env` đã điền đầy đủ.

1. Chạy `pnpm install --frozen-lockfile`, rồi `cd ios && bundle exec pod install`.
2. Mở `ios/VNSEEA.xcworkspace`, kiểm tra Version/Build đã nâng theo [mục 7.1](#71-checklist-nâng-phiên-bản-làm-trước-mỗi-lần-phát-hành).
3. Ở ô chọn thiết bị, chọn **Any iOS Device (arm64)**.
4. Vào **Product > Archive**. Bước Archive dùng cấu hình Release, `aps-environment = production`, JS được bundle sẵn vào app.
5. Khi build xong, cửa sổ **Organizer** sẽ mở ra. Chọn bản archive > **Distribute App** > **App Store Connect** > **Upload**, giữ các tuỳ chọn mặc định (tự động quản lý signing).
6. Sau khoảng 10–30 phút, build sẽ xuất hiện trong App Store Connect > **TestFlight**. Từ đó có thể mời tester, hoặc gửi duyệt ở tab **App Store**.

---

## 8. Xử lý lỗi thường gặp

| Triệu chứng | Cách xử lý |
|---|---|
| App mở ra báo `Missing environment variable: ...` | Kiểm tra `.env`, rồi **build lại native** (không chỉ reload). |
| Mọi API trả lỗi `server_key` | `SERVER_KEY` sai. Lấy lại theo [mục 4.2](#42-tạo-file-env). |
| Xcode: `The sandbox is not in sync with the Podfile.lock` | `cd ios && bundle exec pod install` |
| Lỗi CocoaPods khó hiểu sau khi đổi thư viện | `cd ios && rm -rf Pods build && bundle exec pod install`. Nếu vẫn lỗi, xoá thêm DerivedData: `rm -rf ~/Library/Developer/Xcode/DerivedData/VNSEEA-*` |
| Xcode báo thiếu package `LiveKit` / `WebRTC` | **File > Packages > Reset Package Caches**, sau đó **Resolve Package Versions**. |
| Metro báo lỗi lạ hoặc code mới không được áp dụng | `pnpm start --reset-cache` |
| `Port 8081 already in use` | Tắt Metro cũ. macOS: `lsof -ti:8081 \| xargs kill`. Windows: `netstat -ano \| findstr :8081` rồi `taskkill /PID <pid> /F` |
| Build Android lỗi C++/CMake sau khi pull code | Xoá cache native rồi build lại: `cd android && ./gradlew clean`, xoá thư mục `android/app/.cxx` và `android/app/build`. |
| Windows: lỗi `Filename longer than 260 characters`, `ninja: error` | Làm lại [mục 3.1](#31-chuẩn-bị-git-và-đường-dẫn-ngắn). Chuyển repo vào đường dẫn ngắn (`C:\dev\vnseea`), sau đó xoá `android/app/.cxx`. |
| Gradle `OutOfMemoryError` / máy treo khi build | Đóng bớt ứng dụng, đảm bảo RAM ≥ 16 GB, build lại. |
| `INSTALL_FAILED_NO_MATCHING_ABIS` | Đang cài lên emulator `x86_64`. Xem [mục 6.2](#62-chạy-trên-android-emulator). |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Trên máy đã có app VNSEEA ký bằng key khác (ví dụ bản cài từ Play). Gỡ app cũ: `adb uninstall com.vnseea.android` |
| Bản đồ Android trống (chỉ thấy logo Google) | SHA-1 debug `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` + package `com.vnseea.android` chưa được thêm vào giới hạn của API key trên Google Cloud. |
| Không nhận push / cuộc gọi đến | Push và VoIP chỉ hoạt động trên **máy thật**, iOS cần ký bằng [cách A](#cách-a--dùng-apple-developer-team-của-vnseea-khuyến-nghị), và `ONESIGNAL_APP_ID` phải đúng. |
| Cuộc gọi/video lỗi kỳ lạ sau khi cài package | Có thể các patch chưa được áp dụng. Xoá `node_modules`, chạy lại `pnpm install --frozen-lockfile` (không dùng npm/yarn), rồi `pod install` / build lại. |

---

## 9. Cấu trúc dự án và tài liệu liên quan

```
App.tsx, index.js       Điểm vào: provider cuộc gọi, push, điều hướng
src/<domain>/           ~40 domain theo DDD + MVVM (auth, feed, messages, reels, live, market…)
  domain/               types, repository interfaces
  application/          ViewModel (custom hook), use case
  infrastructure/       repository gọi API qua apiBridge
  presentation/         screens, components
src/shared-kernel/      Phần dùng chung: api, push, livekit, upload (Bunny), storage, i18n
src/navigation/         AppNavigator, route
patches/                Bản vá thư viện native, pnpm tự áp dụng
phtml/                  Bản mirror backend WoWonder (backend thật: repo demo.vnseea)
docs/                   Hướng dẫn nội bộ
```

Các script thường dùng:

```sh
pnpm start      # Metro bundler
pnpm ios        # build + chạy iOS
pnpm android    # build + chạy Android
pnpm lint       # ESLint
pnpm test       # Jest
```

Tài liệu nên đọc tiếp:
- [DESIGN.md](DESIGN.md): design system và token giao diện.
- [docs/guides/API_CONTEXT_GUIDE.md](docs/guides/API_CONTEXT_GUIDE.md): cách nối API cho một domain.
- [docs/skills/php-bridge-safety/SKILL.md](docs/skills/php-bridge-safety/SKILL.md): quy tắc khi sửa backend PHP mà không làm hỏng web.
- [duong/google-maps-ios-setup.md](duong/google-maps-ios-setup.md): cấu hình Google Maps cho iOS.
- [src/messages/CALL_OFFLINE_NOTIFICATION.md](src/messages/CALL_OFFLINE_NOTIFICATION.md): luồng thông báo cuộc gọi khi app tắt.
