#include <M5Unified.h>
#include <M5UnitUnified.h>
#include <M5UnitUnifiedNFC.h>
#include <M5UnitUnifiedRFID.h>
#include <wiring/m5_unit_unified_wiring.hpp>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <PubSubClient.h>
#include <vector>
#include "secrets.h"

using namespace m5::nfc::a;

struct RedConfig {
    const char* ssid;
    const char* password;
    const char* rabbitmqHost;
};

static const RedConfig REDES[] = REDES_CONFIG;
static const int NUM_REDES            = sizeof(REDES) / sizeof(REDES[0]);
static const uint32_t WIFI_TIMEOUT_MS = 15000;

static const uint16_t MQTT_PORT = 1883;

WiFiMulti wifiMulti;
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
const char* rabbitmqHostActual = REDES[0].rabbitmqHost;

static const uint32_t BUSQUEDA_TIMEOUT_MS  = 200;
static const uint32_t BUSQUEDA_COOLDOWN_MS = 30000;
IPAddress brokerIp;
uint32_t ultimaBusquedaMs = 0;

bool puertoAbierto(const IPAddress& ip)
{
    WiFiClient prueba;
    bool ok = prueba.connect(ip, MQTT_PORT, BUSQUEDA_TIMEOUT_MS);
    prueba.stop();
    return ok;
}

bool buscarBroker()
{
    ultimaBusquedaMs = millis();

    IPAddress candidato;
    if (candidato.fromString(rabbitmqHostActual) && puertoAbierto(candidato)) {
        brokerIp = candidato;
        M5.Log.printf("Broker RabbitMQ en la IP configurada: %s\n", brokerIp.toString().c_str());
        return true;
    }

    IPAddress local = WiFi.localIP();
    M5.Log.printf("RabbitMQ no responde en %s; buscando en %d.%d.%d.x ...\n", rabbitmqHostActual,
                  local[0], local[1], local[2]);
    for (int i = 1; i < 255; ++i) {
        if (i == local[3]) {
            continue;
        }
        IPAddress ip(local[0], local[1], local[2], i);
        if (puertoAbierto(ip)) {
            brokerIp = ip;
            M5.Log.printf("Broker RabbitMQ encontrado en %s\n", brokerIp.toString().c_str());
            return true;
        }
        yield();
    }
    M5.Log.printf("No se encontro ningun broker RabbitMQ en la red\n");
    return false;
}

m5::unit::UnitUnified Units;
m5::unit::UnitRFID2 unit{};
m5::nfc::NFCLayerA nfc_a{unit};

void conectarWifi()
{
    WiFi.mode(WIFI_STA);
    for (int i = 0; i < NUM_REDES; ++i) {
        wifiMulti.addAP(REDES[i].ssid, REDES[i].password);
    }
    M5.Log.printf("Conectando a WiFi (%d redes configuradas)...\n", NUM_REDES);

    uint32_t inicio = millis();
    while (wifiMulti.run() != WL_CONNECTED && (millis() - inicio) < WIFI_TIMEOUT_MS) {
        delay(300);
    }

    if (WiFi.status() != WL_CONNECTED) {
        M5.Log.printf("No se pudo conectar a WiFi tras %lu ms; se seguira leyendo sin enviar alertas\n",
                      (unsigned long)WIFI_TIMEOUT_MS);
        return;
    }

    String ssidConectado = WiFi.SSID();
    for (int i = 0; i < NUM_REDES; ++i) {
        if (ssidConectado == REDES[i].ssid) {
            rabbitmqHostActual = REDES[i].rabbitmqHost;
            break;
        }
    }
    M5.Log.printf("WiFi conectado a '%s', IP: %s\n", ssidConectado.c_str(),
                  WiFi.localIP().toString().c_str());
    buscarBroker();
}

void asegurarMqtt()
{
    if (mqttClient.connected()) {
        return;
    }
    String clientId = "AtomS3-Lector" + String(ID_LECTOR) + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);

    for (int intento = 0; intento < 2; ++intento) {
        if (brokerIp == IPAddress(0, 0, 0, 0) && (millis() - ultimaBusquedaMs) > BUSQUEDA_COOLDOWN_MS) {
            buscarBroker();
        }
        if (brokerIp == IPAddress(0, 0, 0, 0)) {
            M5.Log.printf("Broker RabbitMQ desconocido\n");
            return;
        }
        mqttClient.setServer(brokerIp, MQTT_PORT);
        M5.Log.printf("Conectando a RabbitMQ (MQTT) %s:%d...\n", brokerIp.toString().c_str(), MQTT_PORT);
        if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD)) {
            M5.Log.printf("Conectado a RabbitMQ via MQTT como '%s'\n", clientId.c_str());
            return;
        }
        int rc = mqttClient.state();
        M5.Log.printf("No se pudo conectar a RabbitMQ (MQTT), rc=%d\n", rc);
        if (rc != MQTT_CONNECT_FAILED) {
            return;
        }
        brokerIp = IPAddress(0, 0, 0, 0);
    }
}

void enviarUidAlBackend(const String& uid)
{
    if (WiFi.status() != WL_CONNECTED) {
        M5.Log.printf("WiFi desconectado, no se envia UID %s\n", uid.c_str());
        return;
    }
    asegurarMqtt();
    if (!mqttClient.connected()) {
        M5.Log.printf("Sin conexion a RabbitMQ, no se envia UID %s\n", uid.c_str());
        return;
    }

    String topico = String("parada/") + ID_LECTOR;
    String body   = String("{\"uidRfid\":\"") + uid + "\",\"idLector\":" + ID_LECTOR + "}";
    bool ok       = mqttClient.publish(topico.c_str(), body.c_str());
    M5.Log.printf("MQTT publish '%s' %s -> %s\n", topico.c_str(), body.c_str(), ok ? "OK" : "FALLO");
}

void setup()
{
    M5.begin();
    conectarWifi();

    bool lectorListo = m5::unit::wiring::addI2C(Units, unit, 0, m5::unit::wiring::NessoPort::PortA) && Units.begin();
    if (!lectorListo) {
        M5.Log.printf("No se pudo inicializar el lector RFID (WS1850S)\n");
        m5::unit::wiring::failStop();
    }
    M5.Log.printf("Lector RFID (UnitRFID2 / WS1850S) listo\n");
}

void loop()
{
    M5.update();
    Units.update();
    mqttClient.loop();

    std::vector<PICC> piccs;
    if (!nfc_a.detect(piccs)) {
        return;
    }

    for (auto&& u : piccs) {
        M5.Speaker.tone(6000, 5);
        if (!nfc_a.identify(u)) {
            M5.Log.printf("No se pudo identificar una tarjeta detectada\n");
            continue;
        }
        String uid = u.uidAsString().c_str();
        M5.Log.printf("UID leido: %s (%s)\n", uid.c_str(), u.typeAsString().c_str());
        enviarUidAlBackend(uid);
    }
    M5.Speaker.tone(3000, 10);
    nfc_a.deactivate();
}
