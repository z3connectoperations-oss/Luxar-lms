import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Button, Card, Textarea, Chip } from "../../components/ui";
import { Plus, Trash2, X, Eye, Settings } from "lucide-react";

interface Block { id: string; key: string; type: string; dataJson: string; position: number; published: boolean }
interface Category { id: string; name: string; slug: string; description: string | null; thumbnailR2Key: string | null; status: string }

interface ExploreColumn {
  title: string;
  categories: string[];
}

export default function Cms() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState<Record<string, "visual" | "json">>({});
  const [editingKeys, setEditingKeys] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState("");

  const load = () => {
    api<{ blocks: Block[] }>("/admin/cms").then((d) => {
      setBlocks(d.blocks);
      setDrafts(Object.fromEntries(d.blocks.map((b) => [b.key, prettify(b.dataJson)])));
    });
    api<{ categories: Category[] }>("/admin/categories")
      .then((d) => setDbCategories(d.categories || []))
      .catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const save = async (b: Block): Promise<boolean> => {
    setMsg("");
    let dataJson = drafts[b.key];
    try {
      dataJson = JSON.stringify(JSON.parse(dataJson)); // validate JSON
    } catch {
      setMsg(`Invalid JSON in "${b.key}"`);
      return false;
    }
    await api(`/admin/cms/${b.key}`, { method: "PUT", body: JSON.stringify({ type: b.type, dataJson, position: b.position, published: b.published }) });
    setMsg(`Saved "${b.key}" — live on the website.`);
    load();
    return true;
  };

  const togglePublish = async (b: Block) => {
    await api(`/admin/cms/${b.key}`, { method: "PUT", body: JSON.stringify({ ...b, published: !b.published }) });
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Website content (CMS)</h1>
      <p className="text-sm text-muted">Edit the landing-page blocks. Changes reflect on the public website immediately when published.</p>
      {msg && <div className="rounded-lg bg-container-blue p-3 text-sm text-ink">{msg}</div>}

      {blocks.map((b) => {
        const isVisual = b.key === "explore_categories" && editMode[b.key] !== "json";

        return (
          <Card key={b.id}>
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-ink">{b.key}</span>
                <Chip tone="blue">{b.type}</Chip>
                <Chip tone={b.published ? "blue" : "yellow"}>{b.published ? "published" : "draft"}</Chip>
              </div>
              <div className="flex gap-2">
                {b.key === "explore_categories" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditMode({
                        ...editMode,
                        [b.key]: editMode[b.key] === "json" ? "visual" : "json",
                      })
                    }
                    className="flex items-center gap-1.5 font-bold text-xs"
                  >
                    {editMode[b.key] === "json" ? <Settings size={14} /> : <Eye size={14} />}
                    {editMode[b.key] === "json" ? "Switch to Visual Editor" : "Switch to Raw JSON"}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => togglePublish(b)}>{b.published ? "Unpublish" : "Publish"}</Button>
                {editingKeys[b.key] ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDrafts((prev) => ({ ...prev, [b.key]: prettify(b.dataJson) }));
                        setEditingKeys((prev) => ({ ...prev, [b.key]: false }));
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        const success = await save(b);
                        if (success) {
                          setEditingKeys((prev) => ({ ...prev, [b.key]: false }));
                        }
                      }}
                    >
                      Save
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingKeys((prev) => ({ ...prev, [b.key]: true }));
                    }}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {isVisual ? (
              <ExploreCategoriesBuilder
                jsonString={drafts[b.key] ?? "[]"}
                dbCategories={dbCategories}
                onChange={(newVal) => setDrafts({ ...drafts, [b.key]: newVal })}
                disabled={!editingKeys[b.key]}
              />
            ) : (
              <Textarea
                value={drafts[b.key] ?? ""}
                onChange={(e) => setDrafts({ ...drafts, [b.key]: e.target.value })}
                className="min-h-32 font-mono text-xs"
                disabled={!editingKeys[b.key]}
              />
            )}
          </Card>
        );
      })}
      {blocks.length === 0 && <Card className="text-muted">No CMS blocks yet.</Card>}
    </div>
  );
}

function ExploreCategoriesBuilder({
  jsonString,
  dbCategories,
  onChange,
  disabled,
}: {
  jsonString: string;
  dbCategories: Category[];
  onChange: (newJson: string) => void;
  disabled?: boolean;
}) {
  let columns: ExploreColumn[] = [];
  let isInvalid = false;
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      columns = parsed;
    } else {
      isInvalid = true;
    }
  } catch (e) {
    isInvalid = true;
  }

  const assignedSet = new Set<string>();
  columns.forEach((col) => {
    (col.categories || []).forEach((c) => {
      assignedSet.add(c.toLowerCase().trim());
    });
  });

  const updateColumns = (newCols: ExploreColumn[]) => {
    onChange(JSON.stringify(newCols, null, 2));
  };

  const handleTitleChange = (colIdx: number, newTitle: string) => {
    const next = [...columns];
    next[colIdx] = { ...next[colIdx], title: newTitle };
    updateColumns(next);
  };

  const handleAddCategory = (colIdx: number, catName: string) => {
    if (!catName.trim()) return;
    const next = [...columns];
    const existing = next[colIdx].categories || [];
    next[colIdx] = {
      ...next[colIdx],
      categories: [...existing, catName.trim()],
    };
    updateColumns(next);
  };

  const handleRemoveCategory = (colIdx: number, catIdx: number) => {
    const next = [...columns];
    const filtered = (next[colIdx].categories || []).filter((_, i) => i !== catIdx);
    next[colIdx] = { ...next[colIdx], categories: filtered };
    updateColumns(next);
  };

  const handleAddColumn = () => {
    const next = [...columns, { title: "New Category Group", categories: [] }];
    updateColumns(next);
  };

  const handleRemoveColumn = (colIdx: number) => {
    const next = columns.filter((_, i) => i !== colIdx);
    updateColumns(next);
  };

  const handleResetDefault = () => {
    updateColumns([]);
  };

  if (isInvalid) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        <p className="font-extrabold text-base mb-2">Invalid CMS Category Structure</p>
        <p className="mb-4 text-xs opacity-90 leading-relaxed">
          The current data in this block is not in a visual-editable format (list of groups with categories).
        </p>
        <Button variant="outline" onClick={handleResetDefault} size="sm">
          Reset to Clean Template
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="rounded-2xl border border-border bg-canvas p-4 flex flex-col justify-between shadow-xs">
            <div>
              {/* Group Header */}
              <div className="flex items-center justify-between gap-3 mb-4 pb-2 border-b border-border">
                <input
                  type="text"
                  value={col.title}
                  disabled={disabled}
                  onChange={(e) => handleTitleChange(colIdx, e.target.value)}
                  placeholder="Group Title..."
                  className="font-extrabold text-sm bg-transparent outline-none w-full text-ink focus:border-brand-500 border-b border-transparent py-0.5"
                />
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveColumn(colIdx)}
                    className="text-muted hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition shrink-0"
                    title="Delete Group"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              {/* Categories list */}
              <ul className="space-y-2 mb-4">
                {(col.categories || []).map((cat, catIdx) => (
                  <li key={catIdx} className="flex items-center justify-between gap-2 bg-card px-3 py-1.5 rounded-xl border border-border">
                    <span className="text-xs text-ink font-semibold truncate" title={cat}>
                      {cat}
                    </span>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(colIdx, catIdx)}
                        className="text-faint hover:text-red-600 p-0.5 transition shrink-0"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </li>
                ))}
                {(col.categories || []).length === 0 && (
                  <p className="text-center text-[11px] text-faint py-3 italic">No categories inside this group yet.</p>
                )}
              </ul>
            </div>

            {/* Add input */}
            {!disabled && (
              <CategoryAddInput
                options={dbCategories.filter(
                  (dbCat) => !assignedSet.has(dbCat.name.toLowerCase().trim())
                )}
                onAdd={(val) => handleAddCategory(colIdx, val)}
              />
            )}
          </div>
        ))}
      </div>

      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddColumn}
          className="flex items-center gap-1.5 border-dashed border-brand-300 hover:border-brand-500 hover:bg-brand-50 text-brand-700 font-bold"
        >
          <Plus size={16} />
          Add Category Group
        </Button>
      )}
    </div>
  );
}

function CategoryAddInput({
  options,
  onAdd,
}: {
  options: Category[];
  onAdd: (val: string) => void;
}) {
  const [selected, setSelected] = useState("");

  useEffect(() => {
    if (options.length > 0) {
      setSelected(options[0].name);
    } else {
      setSelected("");
    }
  }, [options]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected) {
      onAdd(selected);
    }
  };

  if (options.length === 0) {
    return (
      <div className="mt-4 border-t border-border pt-4 text-center text-[11px] text-faint italic">
        All categories added
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4 border-t border-border pt-4 shrink-0">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full bg-card rounded-xl border border-border px-2.5 py-1.5 text-xs text-ink outline-none focus:border-brand-400 transition"
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.name}>
            {opt.name}
          </option>
        ))}
      </select>
      <Button
        type="submit"
        size="sm"
        className="font-bold shrink-0 rounded-xl"
        disabled={!selected}
      >
        Add
      </Button>
    </form>
  );
}

function prettify(json: string) {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}
