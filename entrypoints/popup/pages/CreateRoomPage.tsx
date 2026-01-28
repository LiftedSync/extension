import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldDescription, useFieldId } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ArrowLeft } from 'lucide-react';
import {SiYoutube, SiCrunchyroll, SiNetflix, SiPrime} from 'react-icons/si';
import type { Platform } from '@/lib/types';

interface CreateRoomPageProps {
  onBack: () => void;
  onCreateRoom: (userName: string, platform: Platform) => void;
  isLoading: boolean;
  initialPlatform?: Platform | null;
}

function FieldInput(props: React.ComponentPropsWithoutRef<typeof Input>) {
  const id = useFieldId();
  return <Input id={id} {...props} />;
}

export function CreateRoomPage({ onBack, onCreateRoom, isLoading, initialPlatform }: CreateRoomPageProps) {
  const [userName, setUserName] = useState('');
  const [platform, setPlatform] = useState<Platform>(initialPlatform ?? 'crunchyroll');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom(userName.trim(), platform);
  };

  return (
    <div className="flex flex-col min-h-[350px] p-6">
      <button
        onClick={onBack}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back
      </button>

      <div className="space-y-2 mb-6">
        <h1 className="text-xl font-bold text-foreground">Create Room</h1>
        <p className="text-sm text-muted-foreground">
          Start a new watch session
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 space-y-4">
        <Field>
          <FieldLabel>Your Name (Optional)</FieldLabel>
          <FieldInput
            placeholder="Enter your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            disabled={isLoading}
            autoFocus
          />
        </Field>

        <Field>
          <FieldLabel>Platform</FieldLabel>
          <FieldDescription>Select a streaming platform</FieldDescription>
          <ToggleGroup
            type="single"
            value={platform}
            onValueChange={(value) => value && setPlatform(value as Platform)}
            className="grid grid-cols-2 gap-3 mt-2"
            disabled={isLoading}
          >
            <ToggleGroupItem
              value="crunchyroll"
              variant="outline"
              className="flex flex-col items-center justify-center gap-2 h-20 data-[state=on]:border-foreground data-[state=on]:bg-accent"
            >
              <SiCrunchyroll className="w-6 h-6" />
              <span className="text-sm font-medium">Crunchyroll</span>
            </ToggleGroupItem>
            <ToggleGroupItem
                value="youtube"
                variant="outline"
                className="flex flex-col items-center justify-center gap-2 h-20 data-[state=on]:border-foreground data-[state=on]:bg-accent"
            >
              <SiYoutube className="w-6 h-6" />
              <span className="text-sm font-medium">YouTube</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="netflix"
              variant="outline"
              className="flex flex-col items-center justify-center gap-2 h-20 data-[state=on]:border-foreground data-[state=on]:bg-accent"
            >
              <SiNetflix className="w-6 h-6" />
              <span className="text-sm font-medium">Netflix</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="primevideo"
              variant="outline"
              className="flex flex-col items-center justify-center gap-2 h-20 data-[state=on]:border-foreground data-[state=on]:bg-accent"
            >
              <SiPrime className="w-6 h-6" />
              <span className="text-sm font-medium">Prime Video</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>

        <div className="flex-1" />

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Room'}
        </Button>
      </form>
    </div>
  );
}
