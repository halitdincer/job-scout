import { useSavedViews } from "@/api/savedViews";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SavedView } from "@/types/api";

type Props = {
  currentViewId: number | null;
  onLoadView: (view: SavedView) => void;
  onSaveAs: () => void;
  onSaveChanges: (view: SavedView) => void;
  onDelete: (view: SavedView) => void;
};

export function SavedViewsMenu({
  currentViewId,
  onLoadView,
  onSaveAs,
  onSaveChanges,
  onDelete,
}: Props) {
  const { data: views = [] } = useSavedViews();
  const currentView = views.find((v) => v.id === currentViewId) ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id="views-select"
          aria-label="Saved views"
        >
          Saved views
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel>Saved views</DropdownMenuLabel>
        {views.length === 0 ? (
          <DropdownMenuItem disabled>No saved views yet</DropdownMenuItem>
        ) : (
          views.map((view) => (
            <DropdownMenuItem
              key={view.id}
              onSelect={() => onLoadView(view)}
              title={view.name}
            >
              <span className="min-w-0 truncate">{view.name}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSaveAs}>Save as new view…</DropdownMenuItem>
        {currentView ? (
          <>
            <DropdownMenuItem
              onSelect={() => onSaveChanges(currentView)}
              title={`Save changes to ${currentView.name}`}
            >
              <span className="min-w-0 truncate">
                Save changes to “{currentView.name}”
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDelete(currentView)}
              className="text-destructive focus:text-destructive"
              title={`Delete view ${currentView.name}`}
            >
              <span className="min-w-0 truncate">
                Delete view “{currentView.name}”
              </span>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
