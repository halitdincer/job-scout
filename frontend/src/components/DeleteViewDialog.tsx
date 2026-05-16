import { useState } from "react";

import { useDeleteSavedView } from "@/api/savedViews";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SavedView } from "@/types/api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: SavedView;
  onDeleted: () => void;
};

export function DeleteViewDialog({
  open,
  onOpenChange,
  view,
  onDeleted,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const deleteMutation = useDeleteSavedView();

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteMutation.mutateAsync(view.id);
      onDeleted();
      onOpenChange(false);
    } catch {
      setError("Could not delete view. Try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete view</DialogTitle>
          <DialogDescription className="break-words">
            Permanently delete the saved view “{view.name}”? This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            Delete view
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
