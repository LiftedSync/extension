import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldDescription, useFieldId } from '@/components/ui/field';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ArrowLeft } from 'lucide-react';

// Custom regex pattern for letters only (A-Z)
const REGEXP_ONLY_CHARS = "^[A-Za-z]*$";

interface JoinRoomPageProps {
  onBack: () => void;
  onJoinRoom: (roomId: string, userName: string) => void;
  isLoading: boolean;
  error?: string;
}

function FieldInput(props: React.ComponentPropsWithoutRef<typeof Input>) {
  const id = useFieldId();
  return <Input id={id} {...props} />;
}

export function JoinRoomPage({ onBack, onJoinRoom, isLoading, error }: JoinRoomPageProps) {
  const [userName, setUserName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length === 4) {
      onJoinRoom(roomCode.toUpperCase(), userName.trim());
    }
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
        <h1 className="text-xl font-bold text-foreground">Join Room</h1>
        <p className="text-sm text-muted-foreground">
          Enter a room code to join
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
          />
        </Field>

        <Field invalid={!!error}>
          <FieldLabel>Room Code</FieldLabel>
          <InputOTP
            maxLength={4}
            value={roomCode}
            onChange={(value) => setRoomCode(value.toUpperCase())}
            disabled={isLoading}
            pattern={REGEXP_ONLY_CHARS}
            autoFocus
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
          <FieldDescription>
            {error}
          </FieldDescription>
        </Field>

        <div className="flex-1" />

        <Button
          type="submit"
          className="w-full"
          disabled={roomCode.length !== 4 || isLoading}
        >
          {isLoading ? 'Joining...' : 'Join Room'}
        </Button>
      </form>
    </div>
  );
}
