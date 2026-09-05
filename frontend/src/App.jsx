import "./index.css";
import Home from "./pages/Home.jsx";
import Room from "./pages/Room.jsx";
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <Routes>
      <Route
        index
        element={<Home></Home>}
      >
      </Route>
      <Route
        path="/rooms/:roomId"
        element={<Room></Room>}
      >
      </Route>
    </Routes>
  )
}

export default App