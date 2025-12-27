import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  gridClassName?: string;
  defaultOpen?: boolean;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  children,
  gridClassName,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-6 border border-neutral/10 shadow-sm rounded-3xl overflow-hidden bg-base-light/50 backdrop-blur-sm">
        <CollapsibleTrigger asChild>
          <CardHeader className="border-b border-neutral/5 bg-base-light/50 cursor-pointer hover:bg-base-light transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg md:text-xl font-semibold text-neutral-dark">
                {title}
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-neutral-light" />
              ) : (
                <ChevronDown className="h-5 w-5 text-neutral-light" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent
            className={
              gridClassName ||
              "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 p-6"
            }
          >
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
