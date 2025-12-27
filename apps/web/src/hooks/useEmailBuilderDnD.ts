import { useState } from "react";
import { UISection } from "../app/(authenticated)/admin/marketing-email/builder/types";

export function useEmailBuilderDnD(
  sections: UISection[],
  setSections: (v: UISection[]) => void,
  saveToHistory: () => void
) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [draggedOver, setDraggedOver] = useState<string | null>(null);

  const onDragStart = (id: string) => setDragId(id);
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const targetId = target
      .closest("[data-section-id]")
      ?.getAttribute("data-section-id");
    if (targetId && targetId !== draggedOver) {
      setDraggedOver(targetId);
    }
  };
  const onDragLeave = () => setDraggedOver(null);
  const onDropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = sections.findIndex((s) => s._id === dragId);
    const to = sections.findIndex((s) => s._id === targetId);
    if (from < 0 || to < 0) return;
    const next = sections.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSections(next);
    setDragId(null);
    setDraggedOver(null);
    saveToHistory();
  };

  return {
    dragId,
    draggedOver,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDropOn,
  };
}
