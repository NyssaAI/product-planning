from .model import Order


def validate_order(order: Order) -> bool:
    return bool(order.order_id)
