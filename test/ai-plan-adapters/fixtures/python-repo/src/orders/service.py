from .model import Order
from .validator import validate_order
from shared.result import Result
from users.model import User
import importlib


def create_order(order_id: str, user: User) -> Result:
    order = Order(order_id)
    validate_order(order)
    importlib.import_module("shared.result")
    return Result.ok(order)
