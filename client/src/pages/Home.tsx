import useThreadList from "../hooks/useThreadList.ts";
import ThreadSummaryView from "../components/ThreadSummaryView.tsx";
import { useNavigate } from "react-router-dom";
import useGameList from "../hooks/useGameList.ts";
import GameSummaryView from "../components/GameSummaryView.tsx";
import "./Home.css";

export default function Home() {
  const threadList = useThreadList(4);
  const gameList = useGameList(4);
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <div className="home-section">
        <div className="home-section-header">
          <h2>Recent games</h2>
          <button className="primary narrow" onClick={() => navigate("/game/new")}>
            Create New Game
          </button>
        </div>
        <div className="home-section-body">
          {"message" in gameList ? (
            <div style={{ padding: "1rem 1.5rem", color: "var(--color-text-muted)" }}>
              {gameList.message}
            </div>
          ) : (
            <div id="gameList" className="dottedList">
              {gameList.map((game) => (
                <GameSummaryView {...game} key={game.gameId.toString()} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="home-section">
        <div className="home-section-header">
          <h2>Recent forum posts</h2>
          <button className="primary narrow" onClick={() => navigate("/forum/post/new")}>
            Create New Post
          </button>
        </div>
        <div className="home-section-body">
          {"message" in threadList ? (
            <div style={{ padding: "1rem 1.5rem", color: "var(--color-text-muted)" }}>
              {threadList.message}
            </div>
          ) : (
            <div id="threadList" role="list" className="dottedList">
              {threadList.map((thread) => (
                <ThreadSummaryView {...thread} key={thread.threadId.toString()} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
