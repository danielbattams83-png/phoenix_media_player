import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Images, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import type { ImageAsset, ImageCollection } from '../types';

interface ImagesViewProps {
  collections: ImageCollection[];
  images: ImageAsset[];
  onCreateCollection: (name: string) => string;
  onDeleteCollection: (collectionId: string) => void;
  onDeleteImage: (imageId: string) => void;
  onRenameCollection: (collectionId: string, name: string) => void;
  onUploadImages: (collectionId: string, files: File[]) => void;
}

export const ImagesView: React.FC<ImagesViewProps> = ({
  collections,
  images,
  onCreateCollection,
  onDeleteCollection,
  onDeleteImage,
  onRenameCollection,
  onUploadImages
}) => {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(collections[0]?.id ?? null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null);
  const selectedCollection = collections.find((collection) => collection.id === selectedCollectionId) ?? null;
  const collectionImages = useMemo(
    () => images.filter((image) => image.collectionId === selectedCollectionId),
    [images, selectedCollectionId]
  );

  useEffect(() => {
    if (selectedCollectionId && collections.some((collection) => collection.id === selectedCollectionId)) return;
    setSelectedCollectionId(collections[0]?.id ?? null);
  }, [collections, selectedCollectionId]);

  const createCollection = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newCollectionName.trim();
    if (!name) return;
    setSelectedCollectionId(onCreateCollection(name));
    setNewCollectionName('');
    setIsCreating(false);
  };

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4 animate-fadeIn sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">Images</h2>
          <p className="text-xs text-zinc-400">Keep your pictures organized into collections</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsCreating((creating) => !creating)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"><Plus className="h-4 w-4" /> New collection</button>
          <button disabled={!selectedCollection} onClick={() => uploadRef.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-indigo-400 px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-indigo-300 disabled:opacity-40"><Upload className="h-4 w-4" /> Add images</button>
          <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => {
            if (selectedCollectionId && event.target.files) onUploadImages(selectedCollectionId, Array.from(event.target.files));
            event.target.value = '';
          }} />
        </div>
      </div>

      {isCreating && (
        <form onSubmit={createCollection} className="flex flex-wrap gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
          <input autoFocus value={newCollectionName} onChange={(event) => setNewCollectionName(event.target.value)} placeholder="Collection name" aria-label="New collection name" className="min-w-48 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-indigo-300/50" />
          <button type="submit" className="rounded-full bg-indigo-400 px-4 py-2 text-xs font-bold text-zinc-950">Create</button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {collections.map((collection) => (
          <button key={collection.id} onClick={() => { setSelectedCollectionId(collection.id); setIsRenaming(false); }} className={`rounded-full border px-4 py-2 text-xs font-medium ${selectedCollectionId === collection.id ? 'border-indigo-300/30 bg-indigo-400/15 text-indigo-100' : 'border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white'}`}>
            {collection.name} <span className="ml-1 text-zinc-500">{images.filter((image) => image.collectionId === collection.id).length}</span>
          </button>
        ))}
      </div>

      {!selectedCollection ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
          <Images className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-400">Create a collection to start adding images.</p>
        </div>
      ) : (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            {isRenaming ? (
              <form onSubmit={(event) => { event.preventDefault(); if (renameValue.trim()) onRenameCollection(selectedCollection.id, renameValue.trim()); setIsRenaming(false); }} className="flex gap-2">
                <input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} aria-label="Rename collection" className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm text-white" />
                <button type="submit" className="text-xs text-indigo-300">Save</button>
              </form>
            ) : (
              <h3 className="text-sm font-semibold text-zinc-200">{selectedCollection.name}</h3>
            )}
            <div className="flex gap-1">
              {!isRenaming && <button onClick={() => { setRenameValue(selectedCollection.name); setIsRenaming(true); }} title="Rename collection" aria-label="Rename collection" className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"><Pencil className="h-4 w-4" /></button>}
              <button onClick={() => onDeleteCollection(selectedCollection.id)} title="Delete collection" aria-label="Delete collection" className="rounded-lg p-2 text-zinc-400 hover:bg-rose-400/10 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          {collectionImages.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {collectionImages.map((image) => (
                <article key={image.id} className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                  <div className="relative aspect-square bg-black/20">
                    <img src={image.url} alt={image.name} className="h-full w-full object-cover" />
                    <button onClick={() => onDeleteImage(image.id)} aria-label={`Delete ${image.name}`} className="absolute right-2 top-2 rounded-full bg-black/65 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <p className="truncate px-3 py-2 text-xs text-zinc-300">{image.name}</p>
                </article>
              ))}
            </div>
          ) : (
            <button onClick={() => uploadRef.current?.click()} className="flex w-full flex-col items-center rounded-2xl border border-dashed border-white/10 p-10 text-center text-zinc-500 hover:border-indigo-300/30 hover:text-zinc-300">
              <ImagePlus className="mb-3 h-8 w-8" />
              <span className="text-sm">Upload images to this collection</span>
            </button>
          )}
        </section>
      )}
    </div>
  );
};
