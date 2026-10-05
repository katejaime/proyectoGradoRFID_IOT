# Sistema de Alertas de Accesibilidad con RFID

Sistema para el transporte público que avisa al conductor cuando una persona con
discapacidad que porta un llavero RFID llega a una parada. Proyecto de grado (UTS).

Los lectores RFID instalados en las paradas leen el llavero y publican el UID por
MQTT; el backend crea la alerta y la envía en tiempo real, por WebSocket, al
conductor del bus asignado. Los administradores gestionan todo desde un panel web.

## Arquitectura

```
Parada (lector RFID + ESP8266 / M5 AtomS3)
   │  MQTT :1883  ·  tópico parada/<idLector>  ·  {"uidRfid": "...", "idLector": 13}
   ▼
RabbitMQ (plugin MQTT) ── exchange "personas_discapacidad" (clave parada.#)
   │  AMQP :5672
   ▼
Backend FastAPI ── PostgreSQL
   │  REST + JWT        │  WebSocket /ws/alertas
   ▼                    ▼
Frontend React (panel de administración y pantalla del conductor)
```

| Servicio | Tecnología | Puerto |
| --- | --- | --- |
| `frontend` | React + Vite, servido con nginx | 5173 |
| `backend` | FastAPI (Python 3.12), JWT, WebSocket | 8000 |
| `db` | PostgreSQL 17 | 5432 |
| `rabbitmq` | RabbitMQ 4.3.5 con plugin MQTT | 1883 (MQTT), 5672 (AMQP), 15672 (panel) |

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) con Docker Compose.
- Nada más: Python, Node y PostgreSQL **no** hace falta instalarlos.

## Puesta en marcha con Docker

1. **Crear el archivo de configuración del backend** (no se versiona porque contiene secretos):

   ```powershell
   Copy-Item back_fast_api-main\.env.example back_fast_api-main\.env
   ```

   Edita `SECRET_KEY` en ese archivo con una clave propia. Las direcciones de la base de
   datos y de RabbitMQ las define `docker-compose.yml`, no hace falta cambiarlas.

2. **Colocar el respaldo de la base de datos** en `db/backup_db` (formato `pg_dump -Fc`).
   Este archivo no se sube al repositorio porque contiene datos reales; se entrega por
   separado.

3. **Levantar todo:**

   ```powershell
   docker compose up -d --build
   ```

4. **Abrir el sistema:** http://localhost:5173

La primera vez, PostgreSQL restaura automáticamente `db/backup_db` (lo hace
`db/restore.sh`). Esto ocurre **solo cuando el volumen está vacío**; los arranques
siguientes conservan los datos.

### Direcciones útiles

| Qué | Dónde |
| --- | --- |
| Aplicación web | http://localhost:5173 |
| Documentación de la API (Swagger) | http://localhost:8000/docs |
| Estado del backend | http://localhost:8000/health |
| Panel de RabbitMQ | http://localhost:15672 |

El inicio de sesión de la aplicación usa los usuarios que trae el respaldo de la base de
datos (roles `administrador` y `conductor`). Las credenciales de PostgreSQL y RabbitMQ
están en `docker-compose.yml`.

### Comandos habituales

```powershell
docker compose ps                      # estado de los servicios
docker compose logs -f backend         # logs del backend
docker compose up -d --build backend   # reconstruir tras cambiar código
docker compose down                    # apagar conservando los datos
docker compose down -v                 # apagar y BORRAR la base de datos
```

## Lectores RFID (paradas físicas)

El firmware de los lectores se programa por separado (placas ESP8266 con RC522 y
M5 AtomS3 con RFID2). Cada lector:

- Se conecta a una red WiFi configurada en su firmware.
- **Busca solo la IP del servidor**: prueba la IP configurada y, si no responde, recorre la
  subred buscando quién tiene abierto el puerto `1883`. No requiere IP fija.
- Publica en MQTT (usuario y clave de RabbitMQ) en el tópico `parada/<idLector>`.

Para que las alertas lleguen:

1. El PC con Docker y los lectores deben estar **en la misma red**, sin aislamiento de
   clientes (algunas redes de universidades lo activan; un hotspot propio evita el problema).
2. El **firewall de Windows** debe permitir conexiones entrantes al puerto **1883**.
3. El `idLector` de cada lector (por ejemplo 2 y 13) debe existir en la tabla `lectorRfid`.
4. El UID del llavero debe estar registrado y asociado a un pasajero; de lo contrario se
   guarda la detección pero no se genera alerta.
5. Para que el conductor reciba la alerta debe existir una asignación diaria
   (`asignacionDiaria`) que vincule conductor, bus y ruta.

RabbitMQ entrega los mensajes MQTT directamente en el exchange `personas_discapacidad`
gracias a `rabbitmq/20-mqtt.conf` (`mqtt.exchange`); el backend declara la cola
`backend_alertas_rfid` y la enlaza con la clave `parada.#`.

## Estructura del repositorio

```
.
├── docker-compose.yml        Orquesta los 4 servicios
├── back_fast_api-main/       Backend FastAPI (API REST, JWT, WebSocket, consumidor RabbitMQ)
│   └── app/                  api · core · models · schemas · services
├── front_react/              Frontend React + TypeScript + Tailwind
│   └── src/                  pages (admin, conductor) · components · lib
├── db/
│   ├── restore.sh            Restaura el respaldo en el primer arranque
│   └── backup_db             Respaldo de la base (no versionado)
└── rabbitmq/
    ├── enabled_plugins       Activa el plugin MQTT y el panel
    └── 20-mqtt.conf          Configuración MQTT
```

## Desarrollo sin Docker (opcional)

**Backend** (requiere PostgreSQL y RabbitMQ accesibles; ajusta `.env`):

```powershell
cd back_fast_api-main
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**

```powershell
cd front_react
npm ci
npm run dev
```

Con `npm run dev` la URL de la API sale de `front_react/.env` (`VITE_API_URL`; ver
`.env.example`). Pruebas del backend: `pytest`.

## Notas sobre la configuración

- **`VITE_API_URL` se incrusta al compilar.** Está en `docker-compose.yml` como argumento de
  build (`http://localhost:8000/api/v1`). Si abres la aplicación desde otro dispositivo,
  cámbiala por la IP del servidor y reconstruye con `docker compose up -d --build frontend`.
- **CORS:** el backend acepta orígenes `localhost`, `127.0.0.1` y `192.168.x.x`
  (`app/main.py`).
- **Credenciales de ejemplo:** los valores de `docker-compose.yml` son de desarrollo. Cámbialos
  antes de exponer el sistema fuera de una red de pruebas.

## Solución de problemas

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| El navegador dice "bloqueado por CORS" | Suele ser un error 500 del backend | `docker compose logs backend` y revisa el error real |
| Error "la relación ... no existe" | La base nació vacía | Verifica `db/backup_db`; luego `docker compose down -v` y vuelve a levantar |
| Cambié el respaldo y no se nota | El volumen ya existía | `docker compose down -v` (borra los datos) |
| `env file ... .env not found` | Falta crear el `.env` del backend | Ver paso 1 de la puesta en marcha |
| Las paradas no generan alertas | Firewall, otra red, o lector/llavero sin registrar | Revisa la sección de lectores RFID |
| El monitoreo en vivo no recibe alertas | Falta la asignación diaria o el WebSocket falló | Revisa `docker compose logs backend` |

## API (resumen)

Prefijo `/api/v1`; autenticación con JWT (`Authorization: Bearer <token>`). Recursos:
`auth`, `users`, `passengers`, `keyringRfids`, `rfidReaders`, `rfidDetections`, `buses`,
`busStations`, `routes`, `schedules`, `alerts`, y el WebSocket `/ws/alertas`. El detalle
completo está en http://localhost:8000/docs.
