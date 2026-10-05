import {
  closestCorners,
  getFirstCollision,
  KeyboardCode,
  type DroppableContainer,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";

const directions: string[] = [
  KeyboardCode.Down,
  KeyboardCode.Right,
  KeyboardCode.Up,
  KeyboardCode.Left,
];





export const boardKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { context: { active, collisionRect, droppableRects, droppableContainers } },
) => {
  if (!directions.includes(event.code)) {
    return undefined;
  }

  event.preventDefault();

  if (!active || !collisionRect) {
    return undefined;
  }

  const filteredContainers: DroppableContainer[] = [];
  droppableContainers.getEnabled().forEach((entry) => {
    if (!entry || entry.disabled) {
      return;
    }
    const rect = droppableRects.get(entry.id);
    if (!rect) {
      return;
    }

    switch (event.code) {
      case KeyboardCode.Down:
        if (collisionRect.top < rect.top) {
          filteredContainers.push(entry);
        }
        break;
      case KeyboardCode.Up:
        if (collisionRect.top > rect.top) {
          filteredContainers.push(entry);
        }
        break;
      case KeyboardCode.Left:
        if (collisionRect.left > rect.left) {
          filteredContainers.push(entry);
        }
        break;
      case KeyboardCode.Right:
        if (collisionRect.left < rect.left) {
          filteredContainers.push(entry);
        }
        break;
    }
  });

  const collisions = closestCorners({
    active,
    collisionRect,
    droppableRects,
    droppableContainers: filteredContainers,
    pointerCoordinates: null,
  });
  const closestId = getFirstCollision(collisions, "id");

  if (closestId != null) {
    const newRect = droppableRects.get(closestId);
    if (newRect) {
      
      
      return { x: newRect.left + 8, y: newRect.top + 8 };
    }
  }

  return undefined;
};
