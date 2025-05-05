"use client"

import * as React from "react"
import { HexColorPicker, HexColorInput } from "react-colorful"
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover"
import { Button } from "./ui/button"

export interface ColorPickerProps {
  color: string | null | undefined; // Keep allowing null/undefined
  onChange: (v: string) => void;
  label?: string;
}

export function ColorPicker({ color, onChange, label }: ColorPickerProps) {
  const [open, setOpen] = React.useState(false)
  // Default to white if color is null or undefined for display
  const displayColor = color || '#ffffff';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label={label ?? "choose colour"}
          className="h-10 w-10 rounded-full p-0 shadow border border-border/20"
          style={{ backgroundColor: displayColor }}
        />
      </PopoverTrigger>

      <PopoverContent className="w-56 space-y-2 p-4">
        <HexColorPicker 
          color={displayColor} 
          onChange={onChange} 
          className="rounded-md"
        />

        <HexColorInput
          color={displayColor}
          onChange={onChange}
          prefixed
          aria-label="Hex input"
          className="w-full rounded-md border px-2 py-1 text-sm"
        />
      </PopoverContent>
    </Popover>
  )
} 