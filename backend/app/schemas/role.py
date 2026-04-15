from pydantic import BaseModel, ConfigDict
from typing import Optional

class RoleBase(BaseModel):
    name: str

class RoleResponse(RoleBase):
    id: int
    model_config = ConfigDict(from_attributes=True)