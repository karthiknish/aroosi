"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Grid3X3, Type, Layout, Settings, Image as ImageIcon } from "lucide-react";

type Section = Hero | Paragraph | RichParagraph | ButtonSection | ImageOnly | ImageText | ColumnsSec | Divider | Spacer;
type Hero = { type: "hero"; title: string; subtitle?: string; cta?: BuilderCTA; imageUrl?: string; align?: "left" | "center" };
type Paragraph = { type: "paragraph"; text: string };
type RichParagraph = { type: "richParagraph"; html: string; align?: "left" | "center" };
type ButtonSection = { type: "button"; cta: BuilderCTA; align?: "left" | "center" };
type BuilderCTA = { label: string; url: string };
type ImageOnly = { type: "image"; src: string; alt?: string; width?: number; align?: "left" | "center" };
type ImageText = { type: "imageText"; image: { src: string; alt?: string; width?: number }; html: string; imagePosition?: "left" | "right" };
type ColumnsSec = { type: "columns"; columns: Array<{ html: string }>; columnCount?: 2 | 3 };
type Divider = { type: "divider" };
type Spacer = { type: "spacer"; size?: number };

interface AddSectionsProps {
  addSection: (type: Section["type"]) => void;
}

export function AddSections({ addSection }: AddSectionsProps) {
  const sectionTypes = [
    { type: "hero", label: "Hero", icon: Layout },
    { type: "paragraph", label: "Text", icon: Type },
    { type: "button", label: "Button", icon: Settings },
    { type: "image", label: "Image", icon: ImageIcon },
    { type: "imageText", label: "Image+Text", icon: Grid3X3 },
    { type: "columns", label: "Columns", icon: Grid3X3 },
    { type: "divider", label: "Divider", icon: Layout },
    { type: "spacer", label: "Spacer", icon: Layout },
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Sections
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {sectionTypes.map(({ type, label, icon: Icon }) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => addSection(type as Section["type"])}
              className="flex flex-col items-center gap-1 h-auto p-3"
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
