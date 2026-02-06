import * as React from "react"
import { HexColorPicker } from "react-colorful"
import { cn } from "@/lib/utils"
import { useForwardedRef } from "@/lib/use-forwarded-ref"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
}

const ColorPicker = React.forwardRef<HTMLInputElement, ColorPickerProps>(
  ({ value, onChange, onBlur }, forwardedRef) => {
    const ref = useForwardedRef(forwardedRef)
    const [open, setOpen] = React.useState(false)

    const parsedValue = value || "#ffffff"

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <div
              className="h-4 w-4 rounded !bg-center !bg-cover transition-all border border-border mr-2"
              style={{ backgroundColor: parsedValue }}
            />
            <span className="truncate">{parsedValue}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-3" align="start" side="top">
          <HexColorPicker
            color={parsedValue}
            onChange={onChange}
            style={{ width: "100%", height: "160px" }}
          />
          <Input
            ref={ref}
            maxLength={7}
            onChange={(e) => {
              const val = e.currentTarget.value
              if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                onChange(val)
              }
            }}
            value={parsedValue}
            onBlur={onBlur}
            className="mt-3"
          />
        </PopoverContent>
      </Popover>
    )
  }
)
ColorPicker.displayName = "ColorPicker"

export { ColorPicker }
