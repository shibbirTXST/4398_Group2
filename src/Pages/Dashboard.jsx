import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import bgImage from "../assets/homepage.png"; // adjust path if needed



function Dashboard({ logout }) {
  const navigate = useNavigate();
  async function handleLogout() {
    await supabase.auth.signOut();
    alert("Logout successful!");
    logout();
  }

  return (
    <div
      className="min-h-screen w-full bg-center bg-cover bg-no-repeat flex items-center justify-center px-4"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="w-full max-w-md flex flex-col items-center text-center gap-6 mt-130">

        {/* Main Actions */}
        <div className="flex gap-[40px] mt-25">

          {/* Explore Button */}
          <button
            onClick={() => navigate("/explore")}
            className="min-w-[200px] bg-gray-300/90 hover:bg-gray-200 text-black font-semibold py-3 px-6 rounded-full shadow-md transition"
          >
            Explore
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="min-w-[200px] bg-gray-300/90 hover:bg-gray-200 text-black font-semibold py-3 px-6 rounded-full shadow-md transition"
          >
            Log Out
          </button>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;