import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldContextValue {
  id: string;
  invalid?: boolean;
}

const FieldContext = React.createContext<FieldContextValue | null>(null);

function useFieldContext() {
  const context = React.useContext(FieldContext);
  if (!context) {
    throw new Error("Field components must be used within a Field");
  }
  return context;
}

function useFieldId() {
  const context = React.useContext(FieldContext);
  return context?.id;
}

interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  invalid?: boolean;
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, invalid, children, ...props }, ref) => {
    const id = React.useId();

    return (
      <FieldContext.Provider value={{ id, invalid }}>
        <div
          ref={ref}
          className={cn("space-y-2", className)}
          data-invalid={invalid ? "" : undefined}
          {...props}
        >
          {children}
        </div>
      </FieldContext.Provider>
    );
  }
);
Field.displayName = "Field";

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  const { id } = useFieldContext();

  return (
    <Label
      ref={ref}
      htmlFor={id}
      className={className}
      {...props}
    />
  );
});
FieldLabel.displayName = "FieldLabel";

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { invalid } = useFieldContext();

  return (
    <p
      ref={ref}
      className={cn(
        "text-sm text-muted-foreground",
        invalid && "text-destructive",
        className
      )}
      {...props}
    />
  );
});
FieldDescription.displayName = "FieldDescription";

export { Field, FieldLabel, FieldDescription, useFieldId, useFieldContext };
