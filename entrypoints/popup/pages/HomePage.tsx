import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Users, Plus } from 'lucide-react';
import liftedLogo from '@/assets/lifted.png';

interface HomePageProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export function HomePage({ onCreateRoom, onJoinRoom }: HomePageProps) {
  return (
    <div className="flex flex-col min-h-[350px] p-6">
      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
        <div className="text-center space-y-2">
          <Avatar className="h-16 w-16 mx-auto mb-2 rounded-none">
            <AvatarImage src={liftedLogo} alt="LiftedSync" className="object-contain" />
            <AvatarFallback>LS</AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold text-foreground">LiftedSync</h1>
          <p className="text-sm text-muted-foreground">
            Watch content together with your friends
          </p>
        </div>

        <div className="flex flex-col w-full space-y-3">
          <Button
            onClick={onCreateRoom}
            className="w-full h-12 text-base"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Room
          </Button>

          <Button
            onClick={onJoinRoom}
            variant="outline"
            className="w-full h-12 text-base"
            size="lg"
          >
            <Users className="mr-2 h-5 w-5" />
            Join Room
          </Button>
        </div>
      </div>
    </div>
  );
}
