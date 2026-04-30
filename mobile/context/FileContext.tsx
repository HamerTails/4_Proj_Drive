import React, { createContext, useContext, useState } from 'react';

export type FileItem = {
  id: string;
  name: string;
  type: 'folder' | 'pdf' | 'document' | 'image' | 'file';
  size: string;
  date: string;
  parentId: string | null;
};

type FileContextType = {
  files: FileItem[];
  trash: FileItem[];
  addFile: (file: Omit<FileItem, 'id' | 'date'>) => void;
  deleteFile: (file: FileItem) => void;
  restoreFile: (file: FileItem) => void;
  deleteForever: (fileId: string) => void;
};

const FileContext = createContext<FileContextType | null>(null);

const initialFiles: FileItem[] = [
  { id: '1', name: 'Rapport projet.pdf', type: 'pdf', size: '2.4 MB', date: 'Aujourd’hui', parentId: null },
  { id: '2', name: 'Images', type: 'folder', size: '12 fichiers', date: 'Hier', parentId: null },
  { id: '3', name: 'Présentation.pptx', type: 'document', size: '5.1 MB', date: '12 mars', parentId: null },
  { id: '4', name: 'photo-test.png', type: 'image', size: '820 KB', date: 'Aujourd’hui', parentId: '2' },
];

export function FileProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [trash, setTrash] = useState<FileItem[]>([]);

  const addFile = (file: Omit<FileItem, 'id' | 'date'>) => {
    setFiles((prev) => [
      {
        ...file,
        id: Date.now().toString(),
        date: 'Aujourd’hui',
      },
      ...prev,
    ]);
  };

  const deleteFile = (file: FileItem) => {
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    setTrash((prev) => [file, ...prev]);
  };

  const restoreFile = (file: FileItem) => {
    setTrash((prev) => prev.filter((f) => f.id !== file.id));
    setFiles((prev) => [file, ...prev]);
  };

  const deleteForever = (fileId: string) => {
    setTrash((prev) => prev.filter((f) => f.id !== fileId));
  };

  return (
    <FileContext.Provider value={{ files, trash, addFile, deleteFile, restoreFile, deleteForever }}>
      {children}
    </FileContext.Provider>
  );
}

export function useFiles() {
  const context = useContext(FileContext);
  if (!context) throw new Error('useFiles doit être utilisé dans FileProvider');
  return context;
}