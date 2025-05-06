'use client';

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Image from 'next/image'; // For displaying images
import { Loader2, AlertCircle } from 'lucide-react'; // Icons for loading/error

import { useGenerateAndSaveImageMutation } from '@/hooks/useGenerateAndSaveImageMutation';
import { useAdminImagesQuery } from '@/hooks/useAdminImagesQuery';
import { useToggleImagePublicMutation } from '@/hooks/useToggleImagePublicMutation';
import { GeneratedImage } from '@/types/images';

interface ImageLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  // We need wizardId and stepId for the generation mutation
  wizardId: string | undefined; // Make potentially undefined if modal can open without context
  stepId: string | undefined;   // Make potentially undefined if modal can open without context
}

// Helper component for displaying an image card
const ImageCard: React.FC<{ 
  image: GeneratedImage; 
  onSelect: (url: string) => void; 
  showToggle?: boolean;
}> = ({ image, onSelect, showToggle = false }) => {
  const toggleMutation = useToggleImagePublicMutation();

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent the card click from triggering selection when toggling
    event.stopPropagation(); 
    toggleMutation.mutate({ imageId: image.id });
  };

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow relative group"
      onClick={() => onSelect(image.storage_url)}
    >
      <CardContent className="p-0 aspect-square flex items-center justify-center bg-muted">
        <Image 
          src={image.storage_url}
          alt={`Generated image for prompt: ${JSON.stringify(image.prompt_structured)}`}
          width={200} // Adjust as needed
          height={200} // Adjust as needed
          className="object-cover w-full h-full"
          unoptimized // If using external storage like S3, avoids Next.js optimization issues
        />
      </CardContent>
      {showToggle && (
        <CardFooter className="p-2 absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex justify-end items-center">
          <div className="flex items-center space-x-2">
            <Label htmlFor={`public-toggle-${image.id}`} className="text-xs">Public</Label>
            <Switch 
              id={`public-toggle-${image.id}`}
              checked={image.is_public}
              onClick={handleToggle} // Use onClick on Switch/Button, not onCheckedChange
              disabled={toggleMutation.isPending}
              aria-label="Toggle public visibility"
            />
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export const ImageLibraryModal: React.FC<ImageLibraryModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelect,
  wizardId,
  stepId
}) => {

  const [subject, setSubject] = useState('');
  const [style, setStyle] = useState('');
  const [mood, setMood] = useState('');
  const [lastGeneratedImageUrl, setLastGeneratedImageUrl] = useState<string | null>(null);

  const generateMutation = useGenerateAndSaveImageMutation();
  const myImagesQuery = useAdminImagesQuery({ scope: 'mine' });
  const publicImagesQuery = useAdminImagesQuery({ scope: 'public' });

  const handleGenerate = () => {
    if (!wizardId || !stepId) {
        console.error('Wizard ID and Step ID are required for generation.');
        // Optionally show a toast message to the user
        return;
    }
    
    // Add validation for subject, style, and mood
    if (!subject.trim() || !style.trim() || !mood.trim()) {
        console.error('Subject, style, and mood are all required for image generation.');
        // Optionally show a toast message to the user
        return;
    }
    
    setLastGeneratedImageUrl(null); // Clear previous preview
    generateMutation.mutate(
      { 
        wizardId,
        stepId,
        structuredPrompt: { subject, style, mood } 
      },
      {
        onSuccess: (data) => {
          setLastGeneratedImageUrl(data.imageUrl);
          // Optionally auto-select the new image?
          // onSelect(data.imageUrl);
          // onClose();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Image Library</DialogTitle>
          <DialogDescription>
            Generate a new background image or select an existing one from your library.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="generate" className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate">Generate New</TabsTrigger>
            <TabsTrigger value="mine">My Images</TabsTrigger>
            <TabsTrigger value="public">Public Images</TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate" className="flex-grow overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="subject">Subject / Scene</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Abstract space landscape" />
              </div>
              <div>
                <Label htmlFor="style">Art Style</Label>
                <Input id="style" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="e.g., cyberpunk, watercolor" />
              </div>
              <div>
                <Label htmlFor="mood">Mood / Colors</Label>
                <Input id="mood" value={mood} onChange={(e) => setMood(e.target.value)} placeholder="e.g., vibrant, dark blue" />
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={generateMutation.isPending || !wizardId || !stepId || !subject.trim() || !style.trim() || !mood.trim()}>
              {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
              Generate Image
            </Button>
            {generateMutation.isError && (
              <p className="text-sm text-destructive flex items-center"><AlertCircle className="mr-1 h-4 w-4"/> {generateMutation.error.message}</p>
            )}
            {generateMutation.isPending && (
                <div className="text-sm text-muted-foreground flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Generating... this may take a minute.</div>
            )}
            {lastGeneratedImageUrl && (
              <div>
                <Label>Last Generated:</Label>
                <Card className="mt-2 w-40 h-40 overflow-hidden cursor-pointer hover:ring-2 ring-primary" onClick={() => onSelect(lastGeneratedImageUrl)}>
                  <Image 
                    src={lastGeneratedImageUrl}
                    alt="Last generated image"
                    width={160}
                    height={160}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                </Card>
              </div>
            )}
          </TabsContent>

          {/* My Images Tab */}
          <TabsContent value="mine" className="flex-grow overflow-y-auto p-4">
            {myImagesQuery.isLoading && <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>}
            {myImagesQuery.isError && <p className="text-destructive text-center"><AlertCircle className="inline mr-1 h-4 w-4"/> Error loading your images: {myImagesQuery.error.message}</p>}
            {myImagesQuery.data && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {myImagesQuery.data.images.map(img => (
                  <ImageCard key={img.id} image={img} onSelect={onSelect} showToggle />
                ))}
                {myImagesQuery.data.images.length === 0 && <p className="text-muted-foreground col-span-full text-center">You haven't generated any images yet.</p>}
              </div>
            )}
          </TabsContent>

          {/* Public Images Tab */}
          <TabsContent value="public" className="flex-grow overflow-y-auto p-4">
            {publicImagesQuery.isLoading && <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>}
            {publicImagesQuery.isError && <p className="text-destructive text-center"><AlertCircle className="inline mr-1 h-4 w-4"/> Error loading public images: {publicImagesQuery.error.message}</p>}
            {publicImagesQuery.data && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {publicImagesQuery.data.images.map(img => (
                  <ImageCard key={img.id} image={img} onSelect={onSelect} />
                ))}
                 {publicImagesQuery.data.images.length === 0 && <p className="text-muted-foreground col-span-full text-center">No public images found in this community.</p>}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {/* Optional: Add a 'Select' button if needed, otherwise clicking image card selects */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 