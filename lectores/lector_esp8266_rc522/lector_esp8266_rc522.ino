#include <SPI.h>
#include <MFRC522.h>
#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <PubSubClient.h>
#include "secrets.h"

#define SS_PIN  D4
#define RST_PIN D2

MFRC522 mfrc522(SS_PIN, RST_PIN);

struct RedConfig {
    const char* ssid;
    const char* password;
    const char* rabbitmqHost;
};

static const RedConfig REDES[] = REDES_CONFIG;
static const int NUM_REDES            = sizeof(REDES) / sizeof(REDES[0]);
static const uint32_t WIFI_TIMEOUT_MS = 15000;

static const uint16_t MQTT_PORT = 1883;

ESP8266WiFiMulti wifiMulti;
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
const char* rabbitmqHostActual = REDES[0].rabbitmqHost;

static const uint32_t SONDEO_TIMEOUT_MS       = 300;
static const uint32_t PRIMERA_PRUEBA_TIMEOUT_MS = 1000;
static const int REINTENTO_CONOCIDAS_CADA      = 20;
static const uint32_t PAUSA_ENTRE_BARRIDOS_MS = 10000;
static const uint32_t REINTENTO_MQTT_MS       = 5000;
static const uint32_t REINTENTO_WIFI_MS       = 30000;
static const int FALLOS_MQTT_PARA_REBUSCAR    = 2;

IPAddress brokerIp;
IPAddress ultimoBrokerIp;
int siguienteIpBarrido      = 0;
uint32_t finUltimoBarridoMs = 0;
bool barridoEnPausa         = false;
uint32_t ultimoIntentoMqttMs = 0;
int fallosMqtt               = 0;
uint32_t ultimoIntentoWifiMs = 0;
bool wifiEstabaConectado     = false;

static const int MAX_PENDIENTES = 20;
String pendientes[MAX_PENDIENTES];
int inicioPendientes   = 0;
int totalPendientes    = 0;

bool puertoAbierto(const IPAddress& ip, uint32_t timeoutMs = SONDEO_TIMEOUT_MS)
{
    WiFiClient prueba;
    prueba.setTimeout(timeoutMs);
    bool ok = prueba.connect(ip, MQTT_PORT);
    prueba.stop();
    return ok;
}

void brokerEncontrado(const IPAddress& ip, const char* como)
{
    brokerIp           = ip;
    ultimoBrokerIp     = ip;
    siguienteIpBarrido = 0;
    barridoEnPausa     = false;
    fallosMqtt         = 0;
    ultimoIntentoMqttMs = 0;
    Serial.printf("Broker RabbitMQ %s: %s\n", como, ip.toString().c_str());
}

void olvidarBroker()
{
    brokerIp           = IPAddress(0, 0, 0, 0);
    siguienteIpBarrido = 0;
    barridoEnPausa     = false;
}

bool probarIpsConocidas(uint32_t timeoutMs)
{
    if (ultimoBrokerIp != IPAddress(0, 0, 0, 0) && puertoAbierto(ultimoBrokerIp, timeoutMs)) {
        brokerEncontrado(ultimoBrokerIp, "en la ultima IP conocida");
        return true;
    }
    IPAddress configurada;
    if (configurada.fromString(rabbitmqHostActual) && configurada != ultimoBrokerIp
        && puertoAbierto(configurada, timeoutMs)) {
        brokerEncontrado(configurada, "en la IP configurada");
        return true;
    }
    return false;
}

void buscarBrokerPaso()
{
    if (barridoEnPausa) {
        if (millis() - finUltimoBarridoMs < PAUSA_ENTRE_BARRIDOS_MS) {
            return;
        }
        barridoEnPausa = false;
    }

    IPAddress local = WiFi.localIP();

    if (siguienteIpBarrido == 0) {
        if (probarIpsConocidas(PRIMERA_PRUEBA_TIMEOUT_MS)) {
            return;
        }
        Serial.printf("RabbitMQ no responde en %s; buscando en %d.%d.%d.x (sin dejar de leer llaveros)...\n",
                      rabbitmqHostActual, local[0], local[1], local[2]);
        siguienteIpBarrido = 1;
        return;
    }

    int i = siguienteIpBarrido++;
    if (i % REINTENTO_CONOCIDAS_CADA == 0 && probarIpsConocidas(SONDEO_TIMEOUT_MS)) {
        return;
    }
    if (i != local[3]) {
        IPAddress ip(local[0], local[1], local[2], i);
        if (puertoAbierto(ip)) {
            brokerEncontrado(ip, "encontrado en");
            return;
        }
    }

    if (siguienteIpBarrido > 254) {
        Serial.printf("No se encontro ningun broker RabbitMQ en la red; se reintenta en %lu s\n",
                      (unsigned long)(PAUSA_ENTRE_BARRIDOS_MS / 1000));
        siguienteIpBarrido = 0;
        barridoEnPausa     = true;
        finUltimoBarridoMs = millis();
    }
}

void actualizarHostConfigurado()
{
    String ssidConectado = WiFi.SSID();
    for (int i = 0; i < NUM_REDES; ++i) {
        if (ssidConectado == REDES[i].ssid) {
            rabbitmqHostActual = REDES[i].rabbitmqHost;
            break;
        }
    }
}

void conectarWifi()
{
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    for (int i = 0; i < NUM_REDES; ++i) {
        wifiMulti.addAP(REDES[i].ssid, REDES[i].password);
    }
    Serial.printf("Conectando a WiFi (%d redes configuradas)...\n", NUM_REDES);

    uint32_t inicio = millis();
    while (wifiMulti.run() != WL_CONNECTED && (millis() - inicio) < WIFI_TIMEOUT_MS) {
        delay(300);
    }
    ultimoIntentoWifiMs = millis();

    if (WiFi.status() != WL_CONNECTED) {
        Serial.printf("No se pudo conectar a WiFi tras %lu ms; se seguira leyendo y se reintentara\n",
                      (unsigned long)WIFI_TIMEOUT_MS);
    }
}

void revisarWifi()
{
    bool conectado = WiFi.status() == WL_CONNECTED;

    if (conectado && !wifiEstabaConectado) {
        actualizarHostConfigurado();
        Serial.printf("WiFi conectado a '%s', IP: %s\n", WiFi.SSID().c_str(),
                      WiFi.localIP().toString().c_str());
        olvidarBroker();
    } else if (!conectado && wifiEstabaConectado) {
        Serial.println("WiFi desconectado; se seguira leyendo llaveros");
    }
    wifiEstabaConectado = conectado;

    if (!conectado && millis() - ultimoIntentoWifiMs > REINTENTO_WIFI_MS) {
        ultimoIntentoWifiMs = millis();
        wifiMulti.run(3000);
    }
}

void guardarPendiente(const String& body)
{
    if (totalPendientes == MAX_PENDIENTES) {
        inicioPendientes = (inicioPendientes + 1) % MAX_PENDIENTES;
        totalPendientes--;
    }
    pendientes[(inicioPendientes + totalPendientes) % MAX_PENDIENTES] = body;
    totalPendientes++;
}

void enviarPendientes()
{
    String topico = String("parada/") + ID_LECTOR;
    while (totalPendientes > 0 && mqttClient.connected()) {
        const String& body = pendientes[inicioPendientes];
        if (!mqttClient.publish(topico.c_str(), body.c_str())) {
            return;
        }
        Serial.printf("MQTT publish pendiente '%s' %s -> OK\n", topico.c_str(), body.c_str());
        pendientes[inicioPendientes] = "";
        inicioPendientes = (inicioPendientes + 1) % MAX_PENDIENTES;
        totalPendientes--;
    }
}

void mantenerMqtt()
{
    if (WiFi.status() != WL_CONNECTED || mqttClient.connected()) {
        return;
    }
    if (brokerIp == IPAddress(0, 0, 0, 0)) {
        buscarBrokerPaso();
        return;
    }
    if (ultimoIntentoMqttMs != 0 && millis() - ultimoIntentoMqttMs < REINTENTO_MQTT_MS) {
        return;
    }
    ultimoIntentoMqttMs = millis();

    String clientId = "ESP8266-Lector" + String(ID_LECTOR) + "-" + String(ESP.getChipId(), HEX);
    mqttClient.setServer(brokerIp, MQTT_PORT);
    Serial.printf("Conectando a RabbitMQ (MQTT) %s:%d...\n", brokerIp.toString().c_str(), MQTT_PORT);
    if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD)) {
        Serial.printf("Conectado a RabbitMQ via MQTT como '%s'\n", clientId.c_str());
        fallosMqtt = 0;
        enviarPendientes();
        return;
    }

    int rc = mqttClient.state();
    Serial.printf("No se pudo conectar a RabbitMQ (MQTT), rc=%d\n", rc);
    if (rc == MQTT_CONNECT_FAILED || rc == MQTT_CONNECTION_TIMEOUT) {
        if (++fallosMqtt >= FALLOS_MQTT_PARA_REBUSCAR) {
            Serial.println("Broker sin respuesta; se vuelve a buscar en la red");
            fallosMqtt = 0;
            olvidarBroker();
        }
    }
}

void enviarUidAlBackend(const String& uid)
{
    String body = String("{\"uidRfid\":\"") + uid + "\",\"idLector\":" + ID_LECTOR + "}";
    if (!mqttClient.connected()) {
        guardarPendiente(body);
        Serial.printf("Sin conexion a RabbitMQ; UID %s guardado (%d pendientes)\n", uid.c_str(),
                      totalPendientes);
        return;
    }
    enviarPendientes();
    String topico = String("parada/") + ID_LECTOR;
    bool ok       = mqttClient.publish(topico.c_str(), body.c_str());
    Serial.printf("MQTT publish '%s' %s -> %s\n", topico.c_str(), body.c_str(), ok ? "OK" : "FALLO");
    if (!ok) {
        guardarPendiente(body);
    }
}

static const uint32_t REVISION_RC522_MS = 5000;
uint32_t ultimaRevisionRc522Ms = 0;
static const int FALLOS_RC522_PARA_REINICIAR = 3;
int fallosRc522 = 0;

void iniciarRc522()
{
    mfrc522.PCD_Init();
    mfrc522.PCD_SetAntennaGain(mfrc522.RxGain_max);
}

void revisarRc522()
{
    if (millis() - ultimaRevisionRc522Ms < REVISION_RC522_MS) {
        return;
    }
    ultimaRevisionRc522Ms = millis();

    byte version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
    if (version == 0x00 || version == 0xFF) {
        Serial.printf("RC522 sin respuesta (version 0x%02X); reiniciando lector\n", version);
        iniciarRc522();
    } else if ((mfrc522.PCD_ReadRegister(mfrc522.TxControlReg) & 0x03) != 0x03) {
        Serial.println("Antena del RC522 apagada; reiniciando lector");
        iniciarRc522();
    } else {
        fallosRc522 = 0;
        return;
    }

    if (++fallosRc522 >= FALLOS_RC522_PARA_REINICIAR) {
        Serial.println("RC522 no se recupera; reiniciando placa");
        delay(100);
        ESP.restart();
    }
}

String uidComoTexto(const MFRC522::Uid& uid)
{
    String texto;
    for (byte i = 0; i < uid.size; i++) {
        if (uid.uidByte[i] < 0x10) {
            texto += '0';
        }
        texto += String(uid.uidByte[i], HEX);
    }
    texto.toUpperCase();
    return texto;
}

void setup()
{
    Serial.begin(115200);
    delay(2000);

    SPI.begin();
    iniciarRc522();
    Serial.println("Lector RFID (RC522) listo");
    Serial.print("Version del RC522: ");
    mfrc522.PCD_DumpVersionToSerial();

    wifiClient.setTimeout(2000);
    mqttClient.setSocketTimeout(5);

    conectarWifi();
}

void loop()
{
    revisarWifi();
    mantenerMqtt();
    mqttClient.loop();
    revisarRc522();

    if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
        return;
    }

    String uid = uidComoTexto(mfrc522.uid);
    Serial.printf("UID leido: %s\n", uid.c_str());
    enviarUidAlBackend(uid);

    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
}
