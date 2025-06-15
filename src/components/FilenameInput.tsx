
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-center">Anna failile nimi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="filename">Failinimi</Label>
            <Input
              id="filename"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Sisesta failinimi..."
              autoFocus
              className="w-full"
            />
          </div>
          <div className="flex space-x-2">
            <Button 
              type="submit" 
              disabled={!fileName.trim()}
              className="flex-1"
            >
              <Check size={16} className="mr-2" />
              Kinnita
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="flex-1"
            >
              <X size={16} className="mr-2" />
              Tühista
            </Button>
          </div>
        </form>
      </CardContent>
    </div>
  );
};
