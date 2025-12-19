import {useState, useCallback} from "react";

export function EditableName({name, onSave}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(name || "");

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    setValue(name || "");
  }, [name]);

  const handleSave = useCallback(() => {
    const newName = value.trim();
    if (newName === name || newName === "") {
      setIsEditing(false);
      return;
    }
    onSave(newName);
    setIsEditing(false);
  }, [value, name, onSave]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.target.blur();
      } else if (e.key === "Escape") {
        setIsEditing(false);
        setValue(name);
      }
    },
    [name]
  );

  if (!name) return null;

  return isEditing ? (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className="ml-2 text-sm text-gray-600 font-medium bg-transparent border border-gray-400 focus:outline-none focus:border-gray-600 px-1 rounded"
      autoFocus
    />
  ) : (
    <span
      onClick={handleStartEdit}
      className="ml-2 text-sm text-gray-600 font-medium cursor-pointer hover:text-gray-800 hover:border hover:border-gray-400 hover:px-1 rounded"
      title="Click to edit name"
    >
      {name}
    </span>
  );
}

