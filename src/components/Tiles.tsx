import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { icon as resolveIcon } from "./icons";

export interface TileOption {
  id: string;
  label: string;
  icon: string | LucideIcon;
  color?: string;
}

function iconOf(option: TileOption): LucideIcon {
  return typeof option.icon === "string" ? resolveIcon(option.icon) : option.icon;
}

interface Props {
  options: TileOption[];
  value: string | null;
  justPicked: string | null;
  onSelect: (id: string) => void;
  /** Fallback accent when an option carries no colour of its own. */
  color?: string;
}

/** Square icon tiles — used for short option sets (age, yes/no, interest). */
export function TileGrid({ options, value, justPicked, onSelect, color = "var(--pink)" }: Props) {
  return (
    <div className="tile-grid" role="radiogroup">
      {options.map((option) => {
        const Icon = iconOf(option);
        const active = value === option.id;
        return (
          <button
            key={option.id}
            className="tile-grid__item"
            role="radio"
            aria-checked={active}
            data-active={active}
            data-picked={justPicked === option.id}
            style={{ ["--tile-color" as string]: option.color ?? color }}
            onClick={() => onSelect(option.id)}
          >
            {active && (
              <span className="tile-grid__check">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
            <span className="tile-grid__icon">
              <Icon size={20} />
            </span>
            <span className="tile-grid__label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Full-width rows — used where labels are sentences (goal, level). */
export function TileList({ options, value, justPicked, onSelect, color = "var(--pink)" }: Props) {
  return (
    <div className="tile-list" role="radiogroup">
      {options.map((option) => {
        const Icon = iconOf(option);
        const active = value === option.id;
        return (
          <button
            key={option.id}
            className="tile"
            role="radio"
            aria-checked={active}
            data-active={active}
            data-picked={justPicked === option.id}
            style={{ ["--tile-color" as string]: option.color ?? color }}
            onClick={() => onSelect(option.id)}
          >
            <span className="tile__icon">
              <Icon size={18} />
            </span>
            <span className="tile__label">{option.label}</span>
            <span className="tile__check">{active && <Check size={13} strokeWidth={3} />}</span>
          </button>
        );
      })}
    </div>
  );
}
