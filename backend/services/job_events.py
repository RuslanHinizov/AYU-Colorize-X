import asyncio
import json
import logging
from typing import Any

from config import settings

logger = logging.getLogger(__name__)

JOB_EVENTS_CHANNEL = "ayu:job-events"


def publish_job_event(user_id: str, event_type: str, **payload: Any) -> None:
    """Publish a job event from any process.

    Celery workers cannot access the FastAPI process-local WebSocket manager.
    Redis pub/sub is the bridge between worker processes and connected clients.
    """
    try:
        import redis

        client = redis.from_url(settings.REDIS_URL, socket_connect_timeout=1, socket_timeout=1)
        message = {"user_id": str(user_id), "type": event_type, **payload}
        client.publish(JOB_EVENTS_CHANNEL, json.dumps(message))
    except Exception as exc:
        logger.warning("Could not publish job event: %s", exc)


async def start_job_event_bridge(stop_event: asyncio.Event) -> None:
    """Subscribe to Redis job events and forward them to WebSocket clients."""
    try:
        import redis.asyncio as redis
        from routers.websocket import manager

        client = redis.from_url(settings.REDIS_URL, socket_connect_timeout=2, socket_timeout=2)
        pubsub = client.pubsub()
        await pubsub.subscribe(JOB_EVENTS_CHANNEL)
        logger.info("Job event bridge subscribed to %s", JOB_EVENTS_CHANNEL)

        while not stop_event.is_set():
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if not message:
                continue

            raw = message.get("data")
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8")

            try:
                event = json.loads(raw)
                user_id = event.pop("user_id")
                await manager.send_to_user(str(user_id), event)
            except Exception as exc:
                logger.warning("Invalid job event payload: %s", exc)
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        logger.warning("Job event bridge disabled: %s", exc)
    finally:
        try:
            await pubsub.unsubscribe(JOB_EVENTS_CHANNEL)
            await pubsub.close()
            await client.close()
        except Exception:
            pass
