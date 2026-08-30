import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useI18n,
  useAppStore,
} from "@paca/api";
import type { Category } from "@paca/shared";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

const PALETTE = [
  "#F472B6",
  "#FB7185",
  "#F59E0B",
  "#34D399",
  "#60A5FA",
  "#A78BFA",
  "#F97316",
  "#10B981",
  "#0EA5E9",
];

export function CategoriesPage() {
  const navigate = useNavigate();
  const mode = useAppStore((s) => s.mode);
  const { data: categories = [], isLoading } = useCategories(mode);
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const { t, translateCategory, locale } = useI18n();
  const { toast } = useToast();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await createCategory.mutateAsync({
        name: trimmed,
        icon: trimmed.charAt(0).toUpperCase(),
        color,
        locale,
        mode,
      });
      toast(t.categoryManager.translating);
      setName("");
      setColor(PALETTE[0]);
      setAdding(false);
    } catch {
      toast(t.common.errorBoundaryMessage, "error");
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!window.confirm(t.categoryManager.deleteConfirm)) return;
    try {
      await deleteCategory.mutateAsync({ id: cat.id, is_default: cat.is_default });
    } catch {
      toast(t.common.errorBoundaryMessage, "error");
    }
  };

  const defaults = categories.filter((c) => c.is_default);
  const custom = categories.filter((c) => !c.is_default);

  return (
    <div className="max-w-2xl mx-auto page-enter">
      <div className="flex items-center gap-2 sm:gap-4 mb-6 min-w-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          aria-label={t.common.back}
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-800 dark:text-gray-100 truncate">
            {t.categoryManager.title}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
            {t.categoryManager.description}
          </p>
        </div>
      </div>

      {/* Custom */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 mb-6 overflow-hidden">
        {custom.length === 0 && !adding && (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            —
          </div>
        )}
        {custom.map((cat) => (
          <CategoryRow
            key={cat.id}
            category={cat}
            label={translateCategory(cat)}
            onDelete={() => handleDelete(cat)}
          />
        ))}

        {adding ? (
          <div className="px-5 py-4 border-t border-gray-50 dark:border-gray-700/50 space-y-3">
            <input
              type="text"
              autoFocus
              placeholder={t.categoryManager.newCategoryPlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-primary/50 focus:border-pink-primary"
            />
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                {t.categoryManager.color}
              </p>
              <div className="flex flex-wrap gap-2">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={c}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      color === c ? "ring-2 ring-offset-2 ring-pink-primary scale-110" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleCreate}
                loading={createCategory.isPending}
                disabled={!name.trim()}
              >
                {createCategory.isPending
                  ? t.categoryManager.creating
                  : t.categoryManager.create}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  setName("");
                }}
              >
                {t.categoryManager.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-pink-primary hover:bg-pink-50 dark:hover:bg-pink-primary/10 border-t border-gray-50 dark:border-gray-700/50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.categoryManager.addCategory}
          </button>
        )}
      </div>

      {/* Defaults */}
      {isLoading ? null : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {defaults.map((cat) => (
            <CategoryRow
              key={cat.id}
              category={cat}
              label={translateCategory(cat)}
              defaultBadge={t.categoryManager.defaultBadge}
              onDelete={() => handleDelete(cat)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryRow({
  category,
  label,
  onDelete,
  defaultBadge,
}: {
  category: Category;
  label: string;
  onDelete?: () => void;
  defaultBadge?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 dark:border-gray-700/50 last:border-b-0">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
        style={{ backgroundColor: `${category.color}20`, color: category.color }}
      >
        {label.charAt(0).toUpperCase() || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
          {label}
        </p>
      </div>
      {defaultBadge && (
        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
          {defaultBadge}
        </span>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-primary rounded-lg hover:bg-red-50 dark:hover:bg-red-primary/10 transition-colors"
          aria-label={t.common.delete}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
