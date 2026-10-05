from fastapi import APIRouter,HTTPException, Query, Response, status
from app.api.deps import CurrentAdmin, DatabaseSession
from app.schemas.keyringRfid import KeyringRfidCreate, KeyringRfidRead, KeyringRfidsPage, KeyringRfidUpdate
from app.services.keyringRfid_service import ( create_keyringrfid,get_keyringrfid,list_keyringrfids,update_keyringrfid,delete_keyringrfid)


router=APIRouter()

@router.post("/",response_model=KeyringRfidRead,status_code=status.HTTP_201_CREATED)
def create_new_keyringrfid(
    keyringrfid:KeyringRfidCreate, db: DatabaseSession, _: CurrentAdmin
)-> KeyringRfidRead:
    """Para crear un llavero, debes ser administrador autorizado"""
    try:
        return create_keyringrfid(db, keyringrfid)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

@router.get("/",response_model= KeyringRfidsPage)
def get_keyrringrrfids(
    db: DatabaseSession,
    _:CurrentAdmin,
    skip:int=Query(default=0,ge=0),
    limit:int=Query(default=20, ge=1, le=100),
)-> KeyringRfidsPage:
    """El listado de pasajeros es paginado, y requiere un administrador autorizado"""
    return list_keyringrfids(db, skip, limit)

@router.get("/{uidRfid}",response_model=KeyringRfidRead)
def get_keyringrfid_by_uidRfid(
    uidRfid:str, db: DatabaseSession, _: CurrentAdmin
)-> KeyringRfidRead:
    keyringrfid=get_keyringrfid(db, uidRfid)
    if keyringrfid is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Llavero no encontrado")
    return keyringrfid

@router.put("/{uidRfid}",response_model=KeyringRfidRead)
def update_keyringrfid_by_uidRfid(
    uidRfid:str, changes: KeyringRfidUpdate, db: DatabaseSession, _: CurrentAdmin
)-> KeyringRfidRead:
    try:
        keyringrfid=update_keyringrfid(db, uidRfid, changes)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    if keyringrfid is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Llavero no encontrado")
    return keyringrfid

@router.delete("/{uidRfid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_keyringrfid_by_uidRfid(
    uidRfid:str, db: DatabaseSession, _: CurrentAdmin
)-> Response:
    if not delete_keyringrfid(db, uidRfid):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Llavero no encontrado")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


