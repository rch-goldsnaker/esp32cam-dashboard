#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include <esp_camera.h>

#define CAMERA_MODEL_AI_THINKER
#include "camera_pins.h"

#define LED_BUILTIN 33
#define FLASH_LED 4

Preferences prefs;
WebServer server(80);

struct Config {
  char ssid[33] = "";
  char password[65] = "";
  char hostname[33] = "esp32cam";
  int brightness = 0;
  int contrast = 0;
  int saturation = 0;
  int quality = 30;
  framesize_t resolution = FRAMESIZE_VGA;
  bool flipH = false;
  bool flipV = false;
} config;

bool configMode = false;
bool streamActive = false;
unsigned long streamStarted = 0;

String configToJson() {
  String json = "{";
  json += "\"ssid\":\"" + String(config.ssid) + "\",";
  json += "\"hostname\":\"" + String(config.hostname) + "\",";
  json += "\"brightness\":" + String(config.brightness) + ",";
  json += "\"contrast\":" + String(config.contrast) + ",";
  json += "\"saturation\":" + String(config.saturation) + ",";
  json += "\"quality\":" + String(config.quality) + ",";
  json += "\"resolution\":" + String((int)config.resolution) + ",";
  json += "\"flipH\":" + String(config.flipH ? "true" : "false") + ",";
  json += "\"flipV\":" + String(config.flipV ? "false" : "true");
  json += "}";
  return json;
}

String statusJson() {
  String json = "{";
  json += "\"uptime\":" + String(millis() / 1000) + ",";
  json += "\"freeHeap\":" + String(ESP.getFreeHeap()) + ",";
  json += "\"wifiRSSI\":" + String(WiFi.RSSI()) + ",";
  json += "\"wifiSSID\":\"" + WiFi.SSID() + "\",";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"streamActive\":" + String(streamActive ? "true" : "false") + ",";
  json += "\"streamDuration\":" + String(streamActive ? (millis() - streamStarted) / 1000 : 0);
  json += "}";
  return json;
}

void loadConfig() {
  prefs.begin("esp32cam", true);
  prefs.getString("ssid", config.ssid, 33);
  prefs.getString("password", config.password, 65);
  prefs.getString("hostname", config.hostname, 33);
  config.brightness = prefs.getInt("brightness", 0);
  config.contrast = prefs.getInt("contrast", 0);
  config.saturation = prefs.getInt("saturation", 0);
  config.quality = prefs.getInt("quality", 30);
  config.resolution = (framesize_t)prefs.getInt("resolution", FRAMESIZE_VGA);
  config.flipH = prefs.getBool("flipH", false);
  config.flipV = prefs.getBool("flipV", false);
  prefs.end();
}

void saveConfig() {
  prefs.begin("esp32cam", false);
  prefs.putString("ssid", config.ssid);
  prefs.putString("password", config.password);
  prefs.putString("hostname", config.hostname);
  prefs.putInt("brightness", config.brightness);
  prefs.putInt("contrast", config.contrast);
  prefs.putInt("saturation", config.saturation);
  prefs.putInt("quality", config.quality);
  prefs.putInt("resolution", (int)config.resolution);
  prefs.putBool("flipH", config.flipH);
  prefs.putBool("flipV", config.flipV);
  prefs.end();
}

void applyCameraSettings() {
  sensor_t* s = esp_camera_sensor_get();
  if (!s) return;
  s->set_brightness(s, config.brightness);
  s->set_contrast(s, config.contrast);
  s->set_saturation(s, config.saturation);
  s->set_quality(s, config.quality);
  s->set_framesize(s, config.resolution);
  s->set_hmirror(s, config.flipH ? 1 : 0);
  s->set_vflip(s, config.flipV ? 1 : 0);
}

void initCamera() {
  camera_config_t cam;
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
  cam.xclk_freq_hz = 20000000;
  cam.pixel_format = PIXFORMAT_JPEG;

  cam.frame_size = FRAMESIZE_VGA;
  cam.jpeg_quality = 12;
  cam.fb_count = 1;

  esp_err_t err = esp_camera_init(&cam);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
    return;
  }

  applyCameraSettings();
}

void handleStatus() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", statusJson());
}

void handleConfig() {
  if (server.method() == HTTP_GET) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", configToJson());
  } else if (server.method() == HTTP_POST) {
    String body = server.arg("plain");
    if (body.length() > 0) {
      parseConfigJson(body);
      saveConfig();
      applyCameraSettings();
    }
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\"ok\":true}");
  } else if (server.method() == HTTP_OPTIONS) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  }
}

void handleStreamToggle() {
  if (server.arg("action") == "start") {
    streamActive = true;
    streamStarted = millis();
  } else if (server.arg("action") == "stop") {
    streamActive = false;
  }
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json",
    "{\"streamActive\":" + String(streamActive ? "true" : "false") + "}");
}

void handleGPIO() {
  if (server.method() == HTTP_GET) {
    String json = "{";
    int pins[] = {0, 2, 4, 12, 13, 14, 15, 16, 21, 22, 32, 33};
    for (int i = 0; i < 12; i++) {
      if (i > 0) json += ",";
      json += "\"IO" + String(pins[i]) + "\":" + String(digitalRead(pins[i]));
    }
    json += ",\"FLASH\":" + String(digitalRead(FLASH_LED));
    json += "}";
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", json);
  } else if (server.method() == HTTP_POST) {
    if (server.hasArg("pin") && server.hasArg("value")) {
      int pin = server.arg("pin").toInt();
      int val = server.arg("value").toInt();
      int mode = server.hasArg("mode") ? server.arg("mode").toInt() : 1;
      if (mode == 1) {
        pinMode(pin, OUTPUT);
        digitalWrite(pin, val ? HIGH : LOW);
      } else if (mode == 2) {
        ledcAttach(pin, 5000, 8);
        ledcWrite(pin, val);
      }
    }
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\"ok\":true}");
  }
}

void handleFlash() {
  if (server.hasArg("state")) {
    bool on = server.arg("state") == "on";
    pinMode(FLASH_LED, OUTPUT);
    digitalWrite(FLASH_LED, on ? HIGH : LOW);
  }
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json",
    "{\"flash\":" + String(digitalRead(FLASH_LED) ? "true" : "false") + "}");
}

void handleStream() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  WiFiClient client = server.client();

  String response = "HTTP/1.1 200 OK\r\n"
    "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n"
    "Access-Control-Allow-Origin: *\r\n"
    "\r\n";
  client.write(response.c_str(), response.length());

  while (streamActive && client.connected()) {
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
      delay(10);
      continue;
    }

    String header = "--frame\r\n"
      "Content-Type: image/jpeg\r\n"
      "Content-Length: " + String(fb->len) + "\r\n\r\n";
    client.write(header.c_str(), header.length());
    client.write(fb->buf, fb->len);
    client.write("\r\n", 2);

    esp_camera_fb_return(fb);
    delay(1);
  }
}

void parseConfigJson(String json) {
  json.replace("{", "");
  json.replace("}", "");
  json.replace("\"", "");

  int pos = 0;
  while (pos < json.length()) {
    int colon = json.indexOf(':', pos);
    int comma = json.indexOf(',', colon);
    if (colon < 0) break;
    if (comma < 0) comma = json.length();

    String key = json.substring(pos, colon);
    String value = json.substring(colon + 1, comma);
    key.trim();
    value.trim();

    if (key == "ssid") { value.toCharArray(config.ssid, 33); }
    else if (key == "password") { value.toCharArray(config.password, 65); }
    else if (key == "hostname") { value.toCharArray(config.hostname, 33); }
    else if (key == "brightness") { config.brightness = value.toInt(); }
    else if (key == "contrast") { config.contrast = value.toInt(); }
    else if (key == "saturation") { config.saturation = value.toInt(); }
    else if (key == "quality") { config.quality = value.toInt(); }
    else if (key == "resolution") { config.resolution = (framesize_t)value.toInt(); }
    else if (key == "flipH") { config.flipH = value == "true"; }
    else if (key == "flipV") { config.flipV = value == "true"; }

    pos = comma + 1;
  }
}

void handleWiFiScan() {
  int n = WiFi.scanNetworks();
  String json = "[";
  for (int i = 0; i < n; i++) {
    if (i > 0) json += ",";
    json += "{";
    json += "\"ssid\":\"" + WiFi.SSID(i) + "\",";
    json += "\"rssi\":" + String(WiFi.RSSI(i)) + ",";
    json += "\"enc\":" + String(WiFi.encryptionType(i));
    json += "}";
  }
  json += "]";
  WiFi.scanDelete();
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void handleOTAFirmware() {
  if (server.method() == HTTP_OPTIONS) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
    return;
  }

  if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
    server.send(500, "text/plain", "Update begin failed");
    return;
  }

  size_t written = Update.writeStream(server.client());
  if (written == server.arg("plain").length()) {
    if (Update.end()) {
      if (Update.isFinished()) {
        server.sendHeader("Access-Control-Allow-Origin", "*");
        server.send(200, "application/json", "{\"ok\":true,\"restart\":true}");
        delay(500);
        ESP.restart();
        return;
      }
    }
  }

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(500, "application/json", "{\"ok\":false}");
}

void handleClearConfig() {
  prefs.begin("esp32cam", false);
  prefs.clear();
  prefs.end();
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"ok\":true,\"restart\":true}");
  delay(500);
  ESP.restart();
}

void handleRestart() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"ok\":true}");
  delay(500);
  ESP.restart();
}

void startServer() {
  server.on("/api/status", handleStatus);
  server.on("/api/config", handleConfig);
  server.on("/api/stream", handleStreamToggle);
  server.on("/api/gpio", handleGPIO);
  server.on("/api/flash", handleFlash);
  server.on("/api/wifi-scan", handleWiFiScan);
  server.on("/api/ota", HTTP_POST, handleOTAFirmware);
  server.on("/api/clear-config", handleClearConfig);
  server.on("/api/restart", handleRestart);

  server.on("/stream", handleStream);

  server.on("/", []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", statusJson());
  });

  server.begin();
}

void runSerialConfig() {
  Serial.println("{\"mode\":\"config\"}");

  while (configMode) {
    if (Serial.available()) {
      String cmd = Serial.readStringUntil('\n');
      cmd.trim();

      if (cmd.startsWith("{\"cmd\":\"scan\"")) {
        int n = WiFi.scanNetworks();
        Serial.print("{\"networks\":[");
        for (int i = 0; i < n; i++) {
          if (i > 0) Serial.print(",");
          Serial.print("{\"ssid\":\"" + WiFi.SSID(i) + "\",\"rssi\":" + String(WiFi.RSSI(i)) + "}");
        }
        Serial.println("]}");
        WiFi.scanDelete();
      }
      else if (cmd.startsWith("{\"cmd\":\"config\"")) {
        parseConfigJson(cmd);
        saveConfig();
        Serial.println("{\"ok\":true}");
      }
      else if (cmd.startsWith("{\"cmd\":\"save\"")) {
        saveConfig();
        Serial.println("{\"ok\":true}");
      }
      else if (cmd.startsWith("{\"cmd\":\"load\"")) {
        loadConfig();
        Serial.println(configToJson());
      }
      else if (cmd.startsWith("{\"cmd\":\"reboot\"")) {
        Serial.println("{\"ok\":true}");
        delay(500);
        ESP.restart();
      }
      else if (cmd.startsWith("{\"cmd\":\"exit\"")) {
        configMode = false;
        Serial.println("{\"ok\":true,\"exit\":true}");
      }
      else {
        Serial.println("{\"error\":\"unknown command\"}");
      }
    }
    delay(10);
  }
}

void initGPIO() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(FLASH_LED, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);
  digitalWrite(FLASH_LED, LOW);
}

void connectWiFi() {
  if (strlen(config.ssid) == 0) return;

  WiFi.mode(WIFI_STA);
  WiFi.begin(config.ssid, config.password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(LED_BUILTIN, LOW);
    if (MDNS.begin(config.hostname)) {
      MDNS.addService("http", "tcp", 80);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  initGPIO();

  loadConfig();

  if (strlen(config.ssid) == 0) {
    configMode = true;
    Serial.println("{\"mode\":\"config\",\"reason\":\"no_wifi_config\"}");
    Serial.flush();
    runSerialConfig();
  }

  initCamera();

  if (configMode) {
    Serial.flush();
    runSerialConfig();
    return;
  }

  connectWiFi();

  if (WiFi.status() != WL_CONNECTED) {
    configMode = true;
    WiFi.disconnect(true);
    Serial.println("{\"mode\":\"config\",\"reason\":\"wifi_failed\"}");
    Serial.flush();
    runSerialConfig();
    return;
  }

  startServer();

  Serial.println("{\"mode\":\"wifi\",\"ip\":\"" + WiFi.localIP().toString() +
    "\",\"ssid\":\"" + String(config.ssid) + "\"}");
}

void loop() {
  if (configMode) return;

  server.handleClient();
  delay(1);

  if (WiFi.status() != WL_CONNECTED) {
    configMode = true;
    WiFi.disconnect(true);
  }
}
