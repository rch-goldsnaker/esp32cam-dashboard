/*
  ESP32-CAM Stream – MJPEG puro, mínima huella
  Abrir http://<ip>/stream
*/

#include <WiFi.h>
#include <WebServer.h>
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

const char* AP_SSID = "ESP32-CAM";
const char* AP_PASS = "12345678";

WebServer server(80);

void setup() {
  Serial.begin(115200);
  Serial.println("\nESP32-CAM Stream");

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

  Serial.print("Resolution: VGA (640x480) | ");
  Serial.print("Free heap: ");
  Serial.print(ESP.getFreeHeap() / 1024.0);
  Serial.println(" KB");

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);

  server.on("/stream", []() {
    WiFiClient client = server.client();
    client.write("HTTP/1.1 200 OK\r\nContent-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n");

    while (client.connected()) {
      camera_fb_t* fb = esp_camera_fb_get();
      if (!fb) { delay(10); continue; }
      String hdr = "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: " + String(fb->len) + "\r\n\r\n";
      client.write(hdr.c_str(), hdr.length());
      client.write(fb->buf, fb->len);
      client.write("\r\n", 2);
      esp_camera_fb_return(fb);
      delay(1);
    }
  });

  server.begin();
  Serial.print("Stream: http://");
  Serial.print(WiFi.softAPIP());
  Serial.println("/stream");
}

void loop() {
  server.handleClient();
  delay(1);
}
