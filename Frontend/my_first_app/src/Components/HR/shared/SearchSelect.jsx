import React, { useEffect, useRef, useState } from "react";
import Icon from "../Attendance/Icon";
import "./SearchSelect.css";

/**
 * The design's searchable select (type to filter, pick from the list).
 * value: selected option value ("" = none). createLabel + onCreate add an
 * "Add new …" row that hands the typed text back to the parent.
 */
export default function SearchSelect({ value, onChange, options, placeholder, createLabel, onCreate, id }) {
  const selected = options.find((o) => String(o.value) === String(value));
  const [text, setText] = useState(selected?.label || "");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // Keep the input text in sync when the selection changes from outside
  useEffect(() => {
    if (!open) setText(selected?.label || "");
  }, [selected, open]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const term = text.trim().toLowerCase();
  const showAll = !term || (selected && text === selected.label);
  const filtered = showAll ? options : options.filter((o) => o.label.toLowerCase().includes(term));
  const exact = options.some((o) => o.label.toLowerCase() === term);

  const pick = (option) => {
    onChange(option.value);
    setText(option.label);
    setOpen(false);
  };

  return (
    <div className="hr-search-select" ref={boxRef}>
      <input
        id={id}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          if (value !== "") onChange("");
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            e.stopPropagation();
            setOpen(false);
          }
          if (e.key === "Enter" && open) {
            e.preventDefault();
            if (filtered.length) pick(filtered[0]);
          }
        }}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
      />
      <Icon name="chevron" size={16} />
      {open && (
        <div className="hr-select-options" role="listbox">
          {filtered.map((o) => (
            <button
              type="button"
              role="option"
              aria-selected={String(o.value) === String(value)}
              key={o.value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(o)}
            >
              {o.label}
              {o.hint && <small>{o.hint}</small>}
            </button>
          ))}
          {!filtered.length && <p>No matches</p>}
          {onCreate && (
            <button
              type="button"
              className="hr-add-option"
              disabled={!term || exact}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onCreate(text.trim());
                setOpen(false);
              }}
            >
              <Icon name="plus" size={15} /> {term && !exact ? `${createLabel} “${text.trim()}”` : `${createLabel}…`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
