import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
export default function FacultyLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { logout(); navigate("/login", { replace: true }); }, []);
  return null;
}
