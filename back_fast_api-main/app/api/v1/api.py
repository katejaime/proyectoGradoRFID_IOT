from fastapi import APIRouter

from app.api.v1.endpoints import (
    alerts,
    auth,
    busStations,
    buses,
    keyringRfids,
    passengers,
    rfidDetections,
    rfidReaders,
    routes,
    schedules,
    users,
    ws,
)


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(passengers.router, prefix="/passengers", tags=["passengers"])
api_router.include_router(keyringRfids.router, prefix="/keyringRfids", tags=["keyringRfids"])
api_router.include_router(busStations.router, prefix="/busStations", tags=["busStations"])
api_router.include_router(rfidReaders.router, prefix="/rfidReaders", tags=["rfidReaders"])
api_router.include_router(buses.router, prefix="/buses", tags=["buses"])
api_router.include_router(routes.router, prefix="/routes", tags=["routes"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])
api_router.include_router(rfidDetections.router, prefix="/rfidDetections", tags=["rfidDetections"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(ws.router, prefix="/ws", tags=["websocket"])
