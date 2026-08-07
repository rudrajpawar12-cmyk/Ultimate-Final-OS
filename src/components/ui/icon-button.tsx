import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface IconButtonProps extends Omit<ButtonProps, "size"> {
  /** Accessible name — required, icon-only buttons have no text. */
  label: string;
  size?: "icon" | "icon-sm";
  tooltip?: boolean;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, size = "icon", tooltip = true, children, ...props }, ref) => {
    const button = (
      <Button ref={ref} size={size} aria-label={label} {...props}>
        {children}
      </Button>
    );

    if (!tooltip) return button;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  },
);
IconButton.displayName = "IconButton";

export { IconButton, Slot };
