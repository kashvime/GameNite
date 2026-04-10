import "./GamePanel.css";
import type { GameInfo } from "@gamenite/shared";
import { computeLeague } from "@gamenite/shared";
import { gameNames } from "../util/consts.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import GameDispatch from "../games/GameDispatch.tsx";
import useSocketsForGame, { type RatingChange } from "../hooks/useSocketsForGame.ts";
import useTimeSince from "../hooks/useTimeSince.ts";
import UserLink from "./UserLink.tsx";
import { isSameUser } from "../util/viewerSeat.ts";

/**
 * A game panel allows viewing the status and players of a live game
 */
export default function GamePanel({
  gameId,
  type,
  players: initialPlayers,
  createdAt,
  minPlayers,
}: GameInfo) {
  const { user } = useLoginContext();
  const timeSince = useTimeSince();

  const { view, players, userPlayerIndex, hasWatched, ratingChanges, joinGame, startGame } =
    useSocketsForGame(gameId, initialPlayers);

  return hasWatched ? (
    <div className="gamePanel">
      <div className="gameRoster">
        <h2>{gameNames[type]}</h2>
        <div className="smallAndGray">Game room created {timeSince(createdAt)}</div>
        <div className="dottedList" role="list">
          {players.map((player, index) => {
            const change: RatingChange | undefined = ratingChanges?.find(
              (c: RatingChange) => c.username === player.username,
            );
            const displayRating = change ? change.newRating : (player.ratings[type] ?? 1000);
            const league = computeLeague(displayRating);
            return (
              <div className="dottedListItem playerRow" role="listitem" key={player.username}>
                <span className="playerLabel">
                  {isSameUser(player, user) ? (
                    <strong>You (player #{index + 1})</strong>
                  ) : (
                    <span>
                      Player #{index + 1}: <UserLink user={player} />
                    </span>
                  )}
                </span>
                <span className="playerRating">
                  <>
                    <span className="ratingNumber">{displayRating}</span>
                    {change && (
                      <span
                        className="ratingDelta"
                        style={{ color: change.delta >= 0 ? "#22c55e" : "#ef4444" }}
                      >
                        {change.delta >= 0 ? "+" : ""}
                        {change.delta}
                      </span>
                    )}
                    <span className={`league-badge league-${league}`}>{league}</span>
                  </>
                </span>
              </div>
            );
          })}
        </div>
        {userPlayerIndex < 0 && !view && (
          <button className="primary narrow" onClick={joinGame}>
            Join Game
          </button>
        )}
        {userPlayerIndex >= 0 && !view && players.length >= minPlayers && (
          <button className="primary narrow" onClick={startGame}>
            Start Game
          </button>
        )}
      </div>

      {view ? (
        <div className="gameFrame">
          <GameDispatch
            gameId={gameId}
            userPlayerIndex={userPlayerIndex}
            players={players}
            view={view}
          />
        </div>
      ) : (
        <div className="gameFrame waiting content">waiting for game to begin</div>
      )}
    </div>
  ) : (
    <div></div>
  );
}
