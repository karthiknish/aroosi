declare module "emoji-picker-react" {
  export interface EmojiClickData {
    emoji: string;
  }

  export interface EmojiPickerProps {
    onEmojiClick: (emojiData: EmojiClickData) => void;
    theme?: string;
    width?: number;
    height?: number;
    className?: string;
  }

  export const Theme: {
    LIGHT: "light";
    DARK: "dark";
    AUTO: "auto";
  };

  const EmojiPicker: React.ComponentType<EmojiPickerProps>;
  export default EmojiPicker;
}