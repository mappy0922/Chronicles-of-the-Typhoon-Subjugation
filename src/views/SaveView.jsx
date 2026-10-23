import React from "react";
import { useGame } from "../game/context/GameContext";
import SaveSlotsView from "../components/SaveSlotsView";

export default function SaveView() {
  const { setCurrentView } = useGame();
  return <SaveSlotsView mode="save" onClose={() => setCurrentView("home")} />;
}
