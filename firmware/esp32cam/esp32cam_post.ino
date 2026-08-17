/*
  ESP32-CAM → Next.js (solo envia JPEG por HTTP POST)
  - WiFi STA
  - Captura frame, POST a http://<pc-ip>:3000/api/frames
  - Sin WebServer, sin MJPEG
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <esp_camera.h>

#define CAMERA_MODEL_AI_THINKER
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

const char* WIFI_SSID = "Xiaomi_8214";
const char* WIFI_PASS = "Pass123456.";

// Cambiar por la IP de tu PC en la red local
const char* NEXTJS_HOST = "http://192.168.31.150";
const int   NEXTJS_PORT = 3000;

String serverUrl;

unsigned long lastFrame = 0;
int frameInterval = 66;  // ~15 FPS
int frameCount = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("\nESP32-CAM → Next.js");

  camera_config_t cam;
  memset(&cam, 0, sizeof(cam));
  cam.ledc_channel = LEDC_CHANNEL_0;
  cam.ledc_timer = LEDC_TIMER_0;
  cam.pin_d0 = Y2_GPIO_NUM;
  cam.pin_d1 = Y3_GPIO_NUM;
  cam.pin_d2 = Y4_GPIO_NUM;
  cam.pin_d3 = Y5_GPIO_NUM;
  cam.pin_d4 = Y6_GPIO_NUM;
  cam.pin_d5 = Y7_GPIO_NUM;
  cam.pin_d6 = Y8_GPIO_NUM;
  cam.pin_d7 = Y9_GPIO_NUM;
  cam.pin_xclk = XCLK_GPIO_NUM;
  cam.pin_pclk = PCLK_GPIO_NUM;
  cam.pin_vsync = VSYNC_GPIO_NUM;
  cam.pin_href = HREF_GPIO_NUM;
  cam.pin_sccb_sda = SIOD_GPIO_NUM;
  cam.pin_sccb_scl = SIOC_GPIO_NUM;
  cam.pin_pwdn = PWDN_GPIO_NUM;
  cam.pin_reset = RESET_GPIO_NUM;
  cam.xclk_freq_hz = 10000000;
  cam.pixel_format = PIXFORMAT_JPEG;
  cam.frame_size = FRAMESIZE_VGA;
  cam.jpeg_quality = 10;
  cam.fb_count = 1;
  cam.fb_location = CAMERA_FB_IN_DRAM;

  esp_err_t err = esp_camera_init(&cam);
  if (err != ESP_OK) {
    Serial.printf("Camera error: 0x%x\n", err);
    return;
  }

  sensor_t* s = esp_camera_sensor_get();
  s->set_framesize(s, FRAMESIZE_VGA);
  s->set_quality(s, 12);
  s->set_brightness(s, 0);
  s->set_contrast(s, 0);
  s->set_saturation(s, 0);

  Serial.print("Free heap: ");
  Serial.print(ESP.getFreeHeap() / 1024.0);
  Serial.println(" KB");

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi OK");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  serverUrl = String(NEXTJS_HOST) + ":" + String(NEXTJS_PORT) + "/api/frames";
  Serial.print("Target: ");
  Serial.println(serverUrl);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    return;
  }

  if (millis() - lastFrame < frameInterval) {
    delay(1);
    return;
  }

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Frame fail");
    delay(10);
    return;
  }

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "image/jpeg");

  int code = http.POST(fb->buf, fb->len);
  esp_camera_fb_return(fb);

  if (code > 0) {
    frameCount++;
    if (frameCount % 30 == 0) {
      Serial.printf("Frames: %d | Last: %d | RPM: %d\n", frameCount, code, 60000 / (millis() - lastFrame));
    }
  } else {
    Serial.printf("POST error: %d\n", code);
  }

  http.end();
  lastFrame = millis();
}
