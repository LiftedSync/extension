import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { ColorPicker } from '@/components/ui/color-picker';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import {
  applyPrimaryColor,
  resetPrimaryColor,
  hslToHex,
  DEFAULT_PRIMARY_HSL,
} from '@/lib/color-utils';

interface SettingsPageProps {
  onBack: () => void;
}

const defaultHex = hslToHex(DEFAULT_PRIMARY_HSL);

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [color, setColor] = useState(defaultHex);
  const [loaded, setLoaded] = useState(false);

  // Load persisted color on mount
  useEffect(() => {
    browser.storage.local.get('primaryColor').then((result: Record<string, unknown>) => {
      if (typeof result.primaryColor === 'string') {
        setColor(result.primaryColor);
      }
      setLoaded(true);
    });
  }, []);

  const isDefault =
    color.toLowerCase() === defaultHex.toLowerCase();

  const handleColorChange = (hex: string) => {
    setColor(hex);
    if (hex.length === 7) {
      applyPrimaryColor(hex);
      browser.storage.local.set({ primaryColor: hex });
    }
  };

  const handleReset = () => {
    setColor(defaultHex);
    resetPrimaryColor();
    browser.storage.local.remove('primaryColor');
  };

  if (!loaded) return null;

  return (
    <div className="flex flex-col min-h-[450px] p-6">
      <button
        onClick={onBack}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back
      </button>

      <div className="space-y-2 mb-6">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Customize the extension appearance
        </p>
      </div>

      <div className="space-y-4">
        <Field>
          <FieldLabel>Primary Color</FieldLabel>
          <ColorPicker value={color} onChange={handleColorChange} />
        </Field>

        <Button
          variant="secondary"
          className="w-full"
          disabled={isDefault}
          onClick={handleReset}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Default
        </Button>
      </div>
    </div>
  );
}
