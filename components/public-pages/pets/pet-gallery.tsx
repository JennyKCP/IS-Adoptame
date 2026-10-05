"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X as XMarkIcon } from "lucide-react";
import type { AnimalImageModel } from "@/prisma/generated/models/AnimalImage";
import { shimmer, toBase64 } from "@/app/lib/utils/image-loading-placeholder";
import { PET_PHOTO_COMING_SOON_IMAGE } from "@/app/lib/constants/constants";
import FavoriteButton from "../favorite-button";
import clsx from "clsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface PetGalleryProps {
  images: AnimalImageModel[];
  currentUserPersonId: string | undefined;
  animalId: string;
  isFavoritedByCurrentUser: boolean;
}

const PetGallery = ({
  images,
  currentUserPersonId,
  animalId,
  isFavoritedByCurrentUser,
}: PetGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState(
    images.length > 0 ? images[0].url : "",
  );
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState("");

  const openLightbox = (imageUrl: string) => {
    setLightboxImageUrl(imageUrl);
    setIsLightboxOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-y-2">
        
        <div
          className="group relative flex h-75 w-full cursor-pointer items-center justify-center overflow-hidden rounded-[28px] bg-card"
          onClick={() => selectedImage && openLightbox(selectedImage)}
        >
          {selectedImage ? (
            <Image
              
              
              
              
              
              key={selectedImage}
              className="object-cover group-hover:opacity-90 transition-opacity"
              src={selectedImage}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              
              
              
              
              
              
              
              
              
              
              
              loading="eager"
              fetchPriority="high"
              placeholder={`data:image/svg+xml;base64,${toBase64(
                shimmer(600, 600),
              )}`}
              alt="Imagen seleccionada de la mascota; haz clic para ampliar"
            />
          ) : (
            
            
            
            <Image
              className="object-contain"
              src={PET_PHOTO_COMING_SOON_IMAGE}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              
              
              loading="eager"
              fetchPriority="high"
              alt="Próximamente habrá una foto"
            />
          )}
          <div className="absolute top-3 right-3 z-10">
            <FavoriteButton
              animalId={animalId}
              currentUserPersonId={currentUserPersonId}
              isFavoritedByCurrentUser={isFavoritedByCurrentUser}
            />
          </div>
        </div>

        
        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                className={clsx(
                  "group relative aspect-square cursor-pointer overflow-hidden rounded-[16px] transition-opacity duration-150 ease-in-out focus:outline-none",
                  selectedImage === image.url
                    ? "opacity-100 ring-2 ring-ring ring-offset-1 ring-offset-background"
                    : "opacity-70 hover:opacity-100 focus:ring-2 focus:ring-ring ring-offset-1 ring-offset-background",
                )}
                onClick={() => setSelectedImage(image.url)}
                aria-label={`Select pet image ${index + 1}`}
              >
                <Image
                  className="object-cover transition-transform duration-150 ease-in-out group-hover:scale-110"
                  src={image.url}
                  fill
                  sizes="(max-width: 1024px) 25vw, 12vw"
                  placeholder={`data:image/svg+xml;base64,${toBase64(
                    shimmer(100, 100),
                  )}`}
                  alt={`Pet image thumbnail ${index + 1}`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        
        <DialogContent
          className="theme-organic max-w-3xl border-none p-2 sm:rounded-[28px]"
          
          
          
          
          
          showCloseButton={false}
        >
          
          <DialogTitle className="sr-only">Imagen ampliada de la mascota</DialogTitle>
          <DialogClose className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full bg-background/85 shadow-organic-sm transition-colors hover:bg-background focus:ring-2 focus:ring-ring focus:outline-none">
            <XMarkIcon className="size-[18px]" aria-hidden="true" />
            <span className="sr-only">Cerrar</span>
          </DialogClose>

          {lightboxImageUrl && (
            <Image
              src={lightboxImageUrl}
              alt="Enlarged pet image"
              width={1200}
              height={800}
              className="h-auto max-h-[80vh] w-full rounded-[20px] object-contain"
              placeholder={`data:image/svg+xml;base64,${toBase64(
                shimmer(1200, 800),
              )}`}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PetGallery;
