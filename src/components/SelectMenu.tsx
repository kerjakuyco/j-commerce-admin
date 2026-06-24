import clsx from "clsx";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const menuGap = 6;
const viewportGap = 12;
const defaultMenuMaxHeight = 320;
const minimumMenuHeight = 64;

type MenuPlacement = "bottom" | "top";
type MenuAlignment = "start" | "end";

export type SelectMenuOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function SelectMenu({
  id,
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  placeholder = "-",
  className = "",
  menuClassName = "",
  optionClassName = "",
  triggerLabel,
  renderOption,
}: {
  id?: string;
  value: string;
  options: SelectMenuOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  optionClassName?: string;
  triggerLabel?: ReactNode;
  renderOption?: (option: SelectMenuOption) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<MenuPlacement>("bottom");
  const [alignment, setAlignment] = useState<MenuAlignment>("start");
  const [maxHeight, setMaxHeight] = useState(defaultMenuMaxHeight);
  const generatedId = useId();
  const menuId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  const buttonId = id ?? generatedId;
  const shownValue = triggerLabel ?? selected?.label ?? placeholder;

  const updatePlacement = useCallback(() => {
    const wrapper = wrapperRef.current;
    const list = listRef.current;
    if (!wrapper || !list) return;

    const rect = wrapper.getBoundingClientRect();
    const menuHeight = Math.min(list.scrollHeight, defaultMenuMaxHeight);
    const spaceBelow = window.innerHeight - rect.bottom - viewportGap - menuGap;
    const spaceAbove = rect.top - viewportGap - menuGap;
    const nextPlacement =
      menuHeight > spaceBelow && spaceAbove > spaceBelow ? "top" : "bottom";
    const availableSpace = nextPlacement === "top" ? spaceAbove : spaceBelow;
    const measuredWidth = Math.max(list.scrollWidth, rect.width);
    const nextAlignment =
      rect.left + measuredWidth > window.innerWidth - viewportGap &&
      rect.right - measuredWidth >= viewportGap
        ? "end"
        : "start";

    setPlacement(nextPlacement);
    setAlignment(nextAlignment);
    setMaxHeight(
      Math.min(
        defaultMenuMaxHeight,
        Math.max(minimumMenuHeight, Math.floor(availableSpace)),
      ),
    );
  }, []);

  useLayoutEffect(() => {
    if (open) updatePlacement();
  }, [open, options.length, updatePlacement]);

  useEffect(() => {
    if (!open) return undefined;

    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);

    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [open, updatePlacement]);

  return (
    <div
      className={clsx("select-menu", className)}
      ref={wrapperRef}
      onBlur={(event) => {
        const nextFocus = event.relatedTarget;
        if (nextFocus instanceof Node && event.currentTarget.contains(nextFocus)) {
          return;
        }
        setOpen(false);
      }}
    >
      <button
        id={buttonId}
        className="select-menu-trigger"
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown") setOpen(true);
        }}
      >
        <span>{shownValue}</span>
      </button>
      {open && (
        <div
          className={clsx("select-menu-list", menuClassName)}
          id={menuId}
          ref={listRef}
          role="listbox"
          aria-labelledby={buttonId}
          data-placement={placement}
          data-align={alignment}
          style={{ maxHeight }}
        >
          {options.map((option) => (
            <button
              className={clsx(
                "select-menu-option",
                option.value === value && "active",
                optionClassName,
              )}
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              key={option.value}
              onClick={() => {
                if (option.disabled) return;
                onChange(option.value);
                setOpen(false);
              }}
            >
              {renderOption ? renderOption(option) : option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
