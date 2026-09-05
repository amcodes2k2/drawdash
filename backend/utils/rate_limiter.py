import asyncio
from time import time
from typing import List, Dict, Optional

class RateLimiter:
    def __init__(self, limit: int, window_size_in_seconds: float) -> None:
        self.limit: int = limit
        self.window_size: float = window_size_in_seconds
        self.timestamp_logs: Dict[str, List[float]] = dict()
        self.expired_timestamps_cleanup_task: Optional[asyncio.Task] = None

    def cancel_expired_timestamps_cleanup_task(self) -> None:
        if self.expired_timestamps_cleanup_task != None and self.expired_timestamps_cleanup_task.done() == False:
            self.expired_timestamps_cleanup_task.cancel()
            
        self.expired_timestamps_cleanup_task = None

    async def expired_timestamps_cleanup_loop(self) -> None:
        try:
            while True:
                current_timestamp: float = time()
                keys_snapshot: List[str] = list(self.timestamp_logs.keys())

                for key in keys_snapshot:
                    valid_timestamps: List[float] = [
                        timestamp for timestamp in self.timestamp_logs[key] if current_timestamp - timestamp <= self.window_size
                    ]

                    if len(valid_timestamps) == 0:
                        del self.timestamp_logs[key]
                    else:
                        self.timestamp_logs[key] = valid_timestamps

                await asyncio.sleep(max(self.window_size, 60.0))
        except asyncio.CancelledError:
            pass

    def is_rate_limit_exceeded(self, key: str) -> bool:
        current_timestamp: float = time()
        current_window_start_timestamp: float = current_timestamp - self.window_size

        if self.expired_timestamps_cleanup_task == None:
            self.expired_timestamps_cleanup_task = asyncio.create_task(self.expired_timestamps_cleanup_loop())

        if key not in self.timestamp_logs:
            self.timestamp_logs[key] = [current_timestamp]
        else:
            valid_timestamps: List[float] = [
                timestamp for timestamp in self.timestamp_logs[key] if timestamp >= current_window_start_timestamp
            ]

            valid_timestamps.append(current_timestamp)
            self.timestamp_logs[key] = valid_timestamps

            if len(self.timestamp_logs[key]) > self.limit:
                return True
        
        return False