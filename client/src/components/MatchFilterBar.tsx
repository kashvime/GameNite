import { useState } from "react";
import type { MatchFilter, SafeUserInfo, GameKey } from "@gamenite/shared";
import { gameNames } from "../util/consts.ts";
import "./MatchFilterBar.css";

interface MatchFilterBarProps {
  /** The current active filter */
  filter: MatchFilter;
  /** Callback to update the filter */
  setFilter: (filter: MatchFilter) => void;
  /** The authenticated user's friends, used to populate the opponent dropdown */
  friends: SafeUserInfo[];
}

/**
 * A filter bar for the match history page. Allows filtering by game type,
 * result, opponent, and date range. Active filters are shown as removable chips.
 */

export default function MatchFilterBar({ filter, setFilter, friends }: MatchFilterBarProps) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const sortLabels: Record<NonNullable<MatchFilter["sortOrder"]>, string> = {
    newest: "Newest first",
    oldest: "Oldest first",
    score: "Highest score",
  };

  const activeFilters = [
    filter.gameType && {
      key: "gameType",
      label: `Game: ${gameNames[filter.gameType as GameKey] ?? filter.gameType}`,
    },
    filter.result && { key: "result", label: `Result: ${filter.result}` },
    filter.opponentUsername && {
      key: "opponentUsername",
      label: `Opponent: ${filter.opponentUsername}`,
    },
    filter.dateRange && { key: "dateRange", label: `Date: ${fromDate} → ${toDate}` },
    filter.sortOrder && { key: "sortOrder", label: `Sort: ${sortLabels[filter.sortOrder]}` },
  ].filter(Boolean) as { key: string; label: string }[];

  /**
   * Removes a single filter by key and clears date state if needed.
   * @param key - The filter key to remove
   */
  function removeFilter(key: string) {
    const next = { ...filter };
    delete next[key as keyof MatchFilter];
    setFilter(next);
    if (key === "dateRange") {
      setFromDate("");
      setToDate("");
    }
  }

  /**
   * Validates and applies a date range filter.
   * Rejects future dates and ranges where from is after to.
   *
   * @param from - The start date string from the input
   * @param to - The end date string from the input
   */
  function handleDateChange(from: string, to: string) {
    setFromDate(from);
    setToDate(to);
    setDateError(null);
    if (from && to) {
      const fromD = new Date(from);
      const toD = new Date(to);
      const todayD = new Date(today);
      if (fromD > todayD || toD > todayD) {
        setDateError("Dates cannot be in the future.");
        return;
      }
      if (fromD > toD) {
        setDateError("Start date cannot be after end date.");
        return;
      }
      setFilter({ ...filter, dateRange: { from: fromD, to: toD } });
    }
  }

  return (
    <>
      <div className="filterBar">
        <select
          value=""
          onChange={(e) => e.target.value && setFilter({ ...filter, gameType: e.target.value })}
        >
          <option value="">Games</option>
          {Object.entries(gameNames).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>

        <select
          value=""
          onChange={(e) =>
            e.target.value &&
            setFilter({ ...filter, result: e.target.value as MatchFilter["result"] })
          }
        >
          <option value="">Result</option>
          <option value="win">Won</option>
          <option value="loss">Lost</option>
          <option value="draw">Draw</option>
        </select>

        <select
          value=""
          onChange={(e) =>
            e.target.value && setFilter({ ...filter, opponentUsername: e.target.value })
          }
        >
          <option value="">Friends</option>
          {friends.map((friend) => (
            <option key={friend.username} value={friend.username}>
              {friend.display}
            </option>
          ))}
        </select>

        <select
          value={filter.sortOrder ?? ""}
          onChange={(e) =>
            setFilter({
              ...filter,
              sortOrder: (e.target.value as MatchFilter["sortOrder"]) || undefined,
            })
          }
        >
          <option value="">Sort</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="score">Highest score</option>
        </select>

        <div className="dateInputs">
          <label>
            From:{" "}
            <input
              type="date"
              value={fromDate}
              max={today}
              onChange={(e) => handleDateChange(e.target.value, toDate)}
            />
          </label>
          <label>
            To:{" "}
            <input
              type="date"
              value={toDate}
              max={today}
              onChange={(e) => handleDateChange(fromDate, e.target.value)}
            />
          </label>
        </div>
      </div>

      {dateError && <span className="dateError">{dateError}</span>}

      {activeFilters.length > 0 && (
        <div className="filterChips">
          {activeFilters.map(({ key, label }) => (
            <span key={key} className="filterChip">
              {label}
              <button onClick={() => removeFilter(key)}>✕</button>
            </span>
          ))}
          <button
            className="clearAll"
            onClick={() => {
              setFilter({});
              setFromDate("");
              setToDate("");
              setDateError(null);
            }}
          >
            Clear all
          </button>
        </div>
      )}
    </>
  );
}
