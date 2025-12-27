export type BuilderCTA = { label: string; url: string };

export type Hero = {
  type: "hero";
  title: string;
  subtitle?: string;
  cta?: BuilderCTA;
  imageUrl?: string;
  align?: "left" | "center";
};

export type Paragraph = { type: "paragraph"; text: string };

export type RichParagraph = {
  type: "richParagraph";
  html: string;
  align?: "left" | "center";
};

export type ButtonSection = {
  type: "button";
  cta: BuilderCTA;
  align?: "left" | "center";
};

export type ImageOnly = {
  type: "image";
  src: string;
  alt?: string;
  width?: number;
  align?: "left" | "center";
};

export type ImageText = {
  type: "imageText";
  image: { src: string; alt?: string; width?: number };
  html: string;
  imagePosition?: "left" | "right";
};

export type ColumnsSec = {
  type: "columns";
  columns: Array<{ html: string }>;
  columnCount?: 2 | 3;
};

export type Divider = { type: "divider" };

export type Spacer = { type: "spacer"; size?: number };

export type Section =
  | Hero
  | Paragraph
  | RichParagraph
  | ButtonSection
  | ImageOnly
  | ImageText
  | ColumnsSec
  | Divider
  | Spacer;

export type BuilderSchema = {
  subject: string;
  preheader?: string;
  sections: Section[];
};

export type UISection = Section & { _id: string };

export type HistoryState = {
  subject: string;
  preheader: string;
  sections: UISection[];
};
