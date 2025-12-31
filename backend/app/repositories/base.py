"""Base repository with common database operations."""

from typing import Any, Generic, TypeVar

from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorDatabase
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class BaseRepository(Generic[T]):
    """Base repository providing common CRUD operations."""

    def __init__(
        self,
        database: AsyncIOMotorDatabase,
        collection_name: str,
        model_class: type[T],
    ) -> None:
        """Initialize repository with database and collection."""
        self._database = database
        self._collection: AsyncIOMotorCollection = database[collection_name]
        self._model_class = model_class

    async def find_one(self, filter_dict: dict[str, Any]) -> T | None:
        """Find a single document matching the filter."""
        doc = await self._collection.find_one(filter_dict)
        if doc is None:
            return None
        doc.pop("_id", None)
        return self._model_class.model_validate(doc)

    async def find_many(
        self,
        filter_dict: dict[str, Any],
        limit: int = 100,
        skip: int = 0,
    ) -> list[T]:
        """Find multiple documents matching the filter."""
        cursor = self._collection.find(filter_dict).skip(skip).limit(limit)
        results = []
        async for doc in cursor:
            doc.pop("_id", None)
            results.append(self._model_class.model_validate(doc))
        return results

    async def insert_one(self, model: T) -> None:
        """Insert a single document."""
        doc = model.model_dump(by_alias=True)
        await self._collection.insert_one(doc)

    async def update_one(
        self,
        filter_dict: dict[str, Any],
        update_dict: dict[str, Any],
    ) -> bool:
        """Update a single document. Returns True if document was modified."""
        result = await self._collection.update_one(filter_dict, {"$set": update_dict})
        return result.modified_count > 0

    async def delete_one(self, filter_dict: dict[str, Any]) -> bool:
        """Delete a single document. Returns True if document was deleted."""
        result = await self._collection.delete_one(filter_dict)
        return result.deleted_count > 0

    async def delete_many(self, filter_dict: dict[str, Any]) -> int:
        """Delete multiple documents. Returns count of deleted documents."""
        result = await self._collection.delete_many(filter_dict)
        return result.deleted_count

    async def count(self, filter_dict: dict[str, Any]) -> int:
        """Count documents matching the filter."""
        return await self._collection.count_documents(filter_dict)

    async def exists(self, filter_dict: dict[str, Any]) -> bool:
        """Check if a document matching the filter exists."""
        return await self.count(filter_dict) > 0
