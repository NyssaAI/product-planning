from .model import User
from shared import Result


def create_user(user_id: str) -> Result:
    return Result.ok(User(user_id))
