import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useCreateSavedView,
  useUpdateSavedView,
} from "@/api/savedViews";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { SavedView, SavedViewPayload } from "@/types/api";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "update";
  payload: Omit<SavedViewPayload, "name">;
  view?: SavedView;
  onSaved: (view: SavedView) => void;
};

export function SaveViewDialog({
  open,
  onOpenChange,
  mode,
  payload,
  view,
  onSaved,
}: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const initialName = mode === "update" && view ? view.name : "";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initialName },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: initialName });
      setServerError(null);
    }
  }, [open, initialName, form]);

  const createMutation = useCreateSavedView();
  const updateMutation = useUpdateSavedView();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const body: SavedViewPayload = { ...payload, name: values.name.trim() };
    try {
      if (mode === "update" && view) {
        const saved = await updateMutation.mutateAsync({
          id: view.id,
          payload: body,
        });
        onSaved(saved);
      } else {
        const saved = await createMutation.mutateAsync(body);
        onSaved(saved);
      }
      onOpenChange(false);
    } catch {
      setServerError("Could not save view. Try a different name.");
    }
  });

  const submitLabel = mode === "update" ? "Save changes" : "Save view";
  const title = mode === "update" ? "Save changes" : "Save view";
  const description =
    mode === "update"
      ? "Update this saved view with the current filters, sort, and page size."
      : "Save the current filters, sort, and page size as a new view.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="saved-view-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="saved-view-name"
              autoFocus
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
            {serverError ? (
              <p role="alert" className="text-sm text-destructive">
                {serverError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
