export function isMediaFile(file: File): boolean {
  return /\.(mp3|wav|flac|aac|ogg|m4a|mp4|webm|mkv|wma)$/i.test(file.name);
}

export function fileIdentity(file: File): string {
  return `${file.name.toLowerCase()}\0${file.size}`;
}

export async function collectDroppedFiles(items: DataTransferItemList, fallback: FileList): Promise<File[]> {
  const entries = Array.from(items).map(item => item.webkitGetAsEntry?.()).filter((entry): entry is FileSystemEntry => !!entry);
  if (!entries.length) return Array.from(fallback);
  async function walk(entry: FileSystemEntry): Promise<File[]> {
    if (entry.isFile) return [await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject))];
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const files: File[] = [];
    while (true) {
      const children = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
      if (!children.length) break;
      for (const child of children) files.push(...await walk(child));
    }
    return files;
  }
  const files: File[] = [];
  for (const entry of entries) files.push(...await walk(entry));
  return files;
}
