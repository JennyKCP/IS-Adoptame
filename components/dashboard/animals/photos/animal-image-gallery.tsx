"use client";

import { useOptimistic, useState, useTransition } from "react";
import Image from "next/image";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { AnimalImageModel } from "@/prisma/generated/models/AnimalImage";
import {
  deleteAnimalImage,
  reorderAnimalImages,
} from "@/app/lib/actions/animal.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AnimalImageGalleryProps {
  images: AnimalImageModel[];
  animalId: string;
  canManage: boolean;
}

const GRID_CLASS = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4";



const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "To reorder a photo, press space or enter to pick it up. While dragging, use the arrow keys to move it. Press space or enter again to drop it in its new position, or press escape to cancel.",
};

type DeleteTarget = { id: string; url: string };

interface TileContentProps {
  image: AnimalImageModel;
  index: number;
  canManage: boolean;
  isDeleting: boolean;
  onDelete: (target: DeleteTarget) => void;
}




function TileContent({
  image,
  index,
  canManage,
  isDeleting,
  onDelete,
}: TileContentProps) {
  return (
    <>
      <Image
        src={image.url}
        alt="Animal image"
        width={300}
        height={300}
        draggable={false}
        className="object-cover w-full h-full aspect-square select-none"
        loading={index === 0 ? "eager" : "lazy"}
        priority={index === 0}
      />

      {index === 0 && (
        <div className="absolute top-2 left-2">
          <Badge>Primary photo</Badge>
        </div>
      )}

      <div className="absolute top-2 right-2">
        <Tooltip>
          <TooltipTrigger asChild>
            
            <span
              className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex"
              tabIndex={canManage ? undefined : 0}
            >
              <Button
                size="icon"
                variant="destructive"
                onClick={() => onDelete({ id: image.id, url: image.url })}
                disabled={isDeleting || !canManage}
                className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Delete image"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          {!canManage && (
            <TooltipContent>
              You don&apos;t have permission to delete images
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </>
  );
}




function SortableImageTile(props: TileContentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.image.id });

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setActivatorNodeRef(node);
      }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(
        "relative group border rounded-lg overflow-hidden bg-card",
        "cursor-grab touch-none outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <TileContent {...props} />
      <div className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-background/80 p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        <GripVertical className="h-4 w-4" />
      </div>
    </div>
  );
}

export default function AnimalImageGallery({
  images,
  animalId,
  canManage,
}: AnimalImageGalleryProps) {
  const [isDeleting, startDeleteTransition] = useTransition();
  const [, startReorderTransition] = useTransition();

  const [imageToDelete, setImageToDelete] = useState<DeleteTarget | null>(null);

  
  
  
  const [orderedImages, setOrderedImages] = useState(images);
  const [syncedImages, setSyncedImages] = useState(images);
  if (images !== syncedImages) {
    setSyncedImages(images);
    setOrderedImages(images);
  }

  
  
  
  
  const [displayImages, setDisplayImages] = useOptimistic(
    orderedImages,
    (_state, next: AnimalImageModel[]) => next,
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    
    
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const executeDelete = () => {
    if (!imageToDelete) return;

    startDeleteTransition(async () => {
      const result = await deleteAnimalImage(
        imageToDelete.id,
        imageToDelete.url,
        animalId,
      );
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      
      setImageToDelete(null);
    });
  };

  const total = displayImages.length;
  const positionOf = (id: UniqueIdentifier) =>
    displayImages.findIndex((image) => image.id === id) + 1;

  const announcements: Announcements = {
    onDragStart({ active }) {
      return `Picked up photo, position ${positionOf(active.id)} of ${total}.`;
    },
    onDragOver({ over }) {
      return over
        ? `Photo moved to position ${positionOf(over.id)} of ${total}.`
        : "Photo is no longer over a drop position.";
    },
    onDragEnd({ over }) {
      return over
        ? `Photo dropped at position ${positionOf(over.id)} of ${total}.`
        : "Photo dropped. Order unchanged.";
    },
    onDragCancel({ active }) {
      return `Reordering cancelled. Photo returned to position ${positionOf(
        active.id,
      )} of ${total}.`;
    },
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragCancel = () => setActiveId(null);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = displayImages.findIndex((image) => image.id === active.id);
    const newIndex = displayImages.findIndex((image) => image.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const nextOrder = arrayMove(displayImages, oldIndex, newIndex);

    startReorderTransition(async () => {
      setDisplayImages(nextOrder);
      try {
        const result = await reorderAnimalImages(
          animalId,
          nextOrder.map((image) => image.id),
        );
        if (result.success) {
          
          
          setOrderedImages(nextOrder);
        } else {
          
          
          toast.error(result.message);
        }
      } catch (error) {
        console.error("Failed to reorder animal images:", error);
        toast.error(
          "Something went wrong reordering the photos. Please try again.",
        );
      }
    });
  };

  if (images.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8 font-medium">
        This animal has no images yet.
      </div>
    );
  }

  const activeImage =
    activeId != null
      ? (displayImages.find((image) => image.id === activeId) ?? null)
      : null;

  const deleteDialog = (
    <AlertDialog
      open={imageToDelete !== null}
      onOpenChange={(open) => {
        if (!open && !isDeleting) setImageToDelete(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this image? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              executeDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive/20 text-red-800 hover:bg-destructive/30"
          >
            {isDeleting ? "Deleting..." : "Delete Image"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  
  
  if (!canManage) {
    return (
      <>
        <div className={GRID_CLASS}>
          {displayImages.map((image, index) => (
            <div
              key={image.id}
              className="relative group border rounded-lg overflow-hidden bg-card"
            >
              <TileContent
                image={image}
                index={index}
                canManage={canManage}
                isDeleting={isDeleting}
                onDelete={setImageToDelete}
              />
            </div>
          ))}
        </div>
        {deleteDialog}
      </>
    );
  }

  return (
    <>
      <DndContext
        id="animal-image-gallery"
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={{ announcements, screenReaderInstructions }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={displayImages.map((image) => image.id)}
          strategy={rectSortingStrategy}
        >
          <div className={GRID_CLASS}>
            {displayImages.map((image, index) => (
              <SortableImageTile
                key={image.id}
                image={image}
                index={index}
                canManage={canManage}
                isDeleting={isDeleting}
                onDelete={setImageToDelete}
              />
            ))}
          </div>
        </SortableContext>

        
        <DragOverlay dropAnimation={null}>
          {activeImage ? (
            <div className="relative border rounded-lg overflow-hidden bg-card shadow-lg ring-1 ring-border">
              <Image
                src={activeImage.url}
                alt=""
                width={300}
                height={300}
                draggable={false}
                className="object-cover w-full h-full aspect-square select-none"
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {deleteDialog}
    </>
  );
}
