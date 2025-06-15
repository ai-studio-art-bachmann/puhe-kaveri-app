
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X } from 'lucide-react';

interface FilenameInputProps {
  onSubmit: (fileName: string) => void;
  onCancel: () => void;
}

export const FilenameInput: React.FC<FilenameInputProps> = ({ onSubmit, onCancel }) => {
  const [fileName, setFileName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fileName.trim()) {
      onSubmit(fileName.trim());
    }
  };

  return (
    <div className="w-full max-w-md p-4 bg-white rounded-lg shadow-lg border">
      <h3 className="text-lg font-semibold mb-3 text-center">Anna failile nimi</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="Sisesta failinimi..."
          className="w-full"
          autoFocus
        />
        <div className="flex space-x-2">
          <Button 
            type="submit" 
            disabled={!fileName.trim()}
            className="flex-1"
          >
            <Check size={16} className="mr-1" />
            Kinnita
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            <X size={16} className="mr-1" />
            Tühista
          </Button>
        </div>
      </form>
    </div>
  );
};
