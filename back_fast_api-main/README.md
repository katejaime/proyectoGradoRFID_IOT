# Mi Proyecto FastAPI

## Inicio rápido

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Abre `http://127.0.0.1:8000/docs` para la documentación interactiva.

Para probar desde el celular u otro dispositivo en la misma red Wi-Fi, levanta el
servidor escuchando en todas las interfaces:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Luego, desde el celular, entra a `http://<IP-de-tu-PC>:8000/docs` para confirmar
que el backend responde antes de probar el frontend.

## PostgreSQL

1. Crea una base de datos llamada `mi_proyecto` y un usuario con permisos.
2. Ajusta `DATABASE_URL` en `.env`:

```env
DATABASE_URL=postgresql+psycopg://usuario:contrasena@localhost:5432/mi_proyecto
```

3. Crea las tablas iniciales una sola vez:

```powershell
.\.venv\Scripts\python.exe -c "from app.core.database import Base, engine; import app.models; Base.metadata.create_all(bind=engine)"
```

La tabla `usuario` contiene `id`, `nombre`, `correo` (único), `password` (hash),
`rol` (`conductor` o `administrador`) y `estado`.

## Autenticación

| Método | Ruta | Acceso |
| --- | --- | --- |
| `POST` | `/api/v1/auth/login` | Público |
| `GET` | `/api/v1/users/me` | JWT válido |
| `GET` | `/api/v1/users/?skip=0&limit=20` | Administrador |

Inicia sesión enviando JSON a `/api/v1/auth/login`:

```json
{
  "correo": "admin@example.com",
  "password": "ClaveSegura123"
}
```

Usa el valor devuelto en `access_token` con el encabezado:

```http
Authorization: Bearer <access_token>
```

El listado paginado nunca incluye contraseñas ni hashes, incluso para administradores.

## Pasajeros

Todas las rutas de pasajeros requieren el encabezado `Authorization: Bearer <access_token>`
de un usuario con rol `administrador`.

| Método | Ruta | Acción |
| --- | --- | --- |
| `POST` | `/api/v1/passengers/` | Crear pasajero |
| `GET` | `/api/v1/passengers/?skip=0&limit=20` | Listar pasajeros paginados |
| `GET` | `/api/v1/passengers/{passenger_id}` | Consultar un pasajero |
| `PUT` | `/api/v1/passengers/{passenger_id}` | Actualizar un pasajero |
| `DELETE` | `/api/v1/passengers/{passenger_id}` | Eliminar un pasajero |

Ejemplo de creación:

```json
{
  "nombre": "María Pérez",
  "tipo_discapacidad": "Movilidad reducida",
  "telefono": "3001234567",
  "estado": "activo"
}
```

Ejecuta las pruebas con:

```powershell
pytest
```

## Docker

```powershell
docker build -t mi-proyecto-fastapi .
docker run --env-file .env -p 8000:8000 mi-proyecto-fastapi
```
