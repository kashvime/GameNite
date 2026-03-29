import { useState } from "react";
import type { MatchFilter, SafeUserInfo, GameKey } from "@gamenite/shared";
import { gameNames } from "../util/consts.ts";

interface MatchFilterBarProps {
  filter: MatchFilter;
  setFilter: (filter: MatchFilter) => void;
  friends: SafeUserInfo[];
}

export default function MatchFilterBar({ filter, setFilter, friends }: MatchFilterBarProps) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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
  ].filter(Boolean) as { key: string; label: string }[];

  function removeFilter(key: string) {
    const next = { ...filter };
    delete next[key as keyof MatchFilter];
    setFilter(next);
    if (key === "dateRange") {
      setFromDate("");
      setToDate("");
    }
  }

  function handleDateChange(from: string, to: string) {
    setFromDate(from);
    setToDate(to);
    if (from && to) {
      setFilter({ ...filter, dateRange: { from: new Date(from), to: new Date(to) } });
    }
  }

  return (
    <>
      <div className="filterBar">
        <select
          value=""
          onChange={(e) => e.target.value && setFilter({ ...filter, gameType: e.target.value })}
        >
          <option value="">Filter by game...</option>
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
          <option value="">Filter by result...</option>
          <option value="win">Win</option>
          <option value="loss">Loss</option>
          <option value="draw">Draw</option>
        </select>

        <select
          value=""
          onChange={(e) =>
            e.target.value && setFilter({ ...filter, opponentUsername: e.target.value })
          }
        >
          <option value="">Filter by opponent...</option>
          {friends.map((friend) => (
            <option key={friend.username} value={friend.username}>
              {friend.display}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(e) => handleDateChange(e.target.value, toDate)}
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => handleDateChange(fromDate, e.target.value)}
        />
      </div>

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
            }}
          >
            Clear all
          </button>
        </div>
      )}
    </>
  );
}
