import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "utils/protected-route"
import Layout from "components/layout/Layout";
import Calendar from "pages/Calendar";
import Login from 'pages/Login';
import Saved from 'pages/Saved';
import GroupPage from 'pages/GroupPage';
import Home from 'pages/Home';
import Call from "pages/Call";


export default function AppRouter() {
  return (
    <Routes>
      <Route element={/*<ProtectedRoute>*/<Layout />/*</ProtectedRoute>*/}>
        <Route path="/home" element={<Home />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/call" element={<Call />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="groups/:groupId" element={<GroupPage />} />
      </Route>

      <Route path="/login" element={<Login />} />
    </Routes>
  );
}