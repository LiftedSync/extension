import {Button} from '@/components/ui/button';
import {Avatar, AvatarImage, AvatarFallback} from '@/components/ui/avatar';
import liftedLogo from '@/assets/lifted.png';

interface HomePageProps {
    onCreateRoom: () => void;
    onJoinRoom: () => void;
}

export function HomePage({onCreateRoom, onJoinRoom}: HomePageProps) {
    return (
        <div className="relative flex flex-col min-h-[400px] p-6">
            <div className="flex-1 flex flex-col items-center justify-center -mt-[50px] space-y-6">
                <div className="text-center space-y-2">
                    <Avatar className="h-16 w-16 mx-auto mb-2 rounded-none">
                        <AvatarImage src={liftedLogo} alt="LiftedSync" className="object-contain"/>
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
                        Create Room
                    </Button>

                    <Button
                        onClick={onJoinRoom}
                        variant="secondary"
                        className="w-full h-12 text-base"
                        size="lg"
                    >
                        Join Room
                    </Button>
                </div>
            </div>
            <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
          v{browser.runtime.getManifest().version}
        </span>
        </div>
    );
}
