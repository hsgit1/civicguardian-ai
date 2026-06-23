import { useState } from "react";
import { GoogleGenAI } from "@google/genai";
import {
  MapPin,
  AlertTriangle,
  Shield,
  ShieldCheck,
  CheckCircle,
  BarChart3,
  Award,
  Camera,
  Eye,
  Users,
  Trophy,
} from "lucide-react";

const aiClient = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

async function analyzeWithGemini(title, description, location) {
  const prompt = `
You are CivicGuardian AI, an expert civic infrastructure agent for Kolkata and Hooghly communities.

Analyze this community issue and return ONLY valid JSON.

Issue Title: ${title}
Description: ${description}
Location: ${location}

Return JSON exactly in this structure:
{
  "category": "Road Damage | Water Leakage | Streetlight Issue | Waste Management | Public Infrastructure | Drainage Issue | Electrical Hazard | Other",
  "severity": "Low | Medium | High | Critical",
  "aiSummary": "2 sentence civic impact summary",
  "recommendedAction": "what authority/community should do next",
  "priorityReason": "why this priority was selected"
}
`;

  const response = await aiClient.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  return JSON.parse(text);
}

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const [issues, setIssues] = useState([
    {
      id: 1,
      category: "Road Damage",
      title: "Large pothole near station",
      desc: "Deep pothole creating accident risk for students, bikes and autos near railway station.",
      location: "Rishra Station Area , Hooghly",
      status: "In Progress",
      votes: 18,
      severity: "High",
      points: 80,
      aiSummary:
        "Gemini AI classified this as a high-risk road safety issue. Immediate repair is recommended because it can cause accidents and traffic slowdown.",
    },
    {
      id: 2,
      category: "Water Leakage",
      title: "Water leakage near main road",
      desc: "Continuous water leakage causing road damage and wastage near busy public area.",
      location: "Salt Lake Sector V, Kolkata",
      status: "Verified",
      votes: 11,
      severity: "Critical",
      points: 70,
      aiSummary:
        "Gemini AI detected a critical civic issue. Water leakage can damage roads, waste resources and create sanitation concerns.",
    },
    {
      id: 3,
      category: "Streetlight Issue",
      title: "Streetlight not working near station",
      desc: "Streetlight is completely off, making the road unsafe during night hours.",
      location: "Gariahat Crossing, Kolkata",
      status: "Reported",
      votes: 7,
      severity: "High",
      points: 50,
      aiSummary:
        "Gemini AI classified this as a public safety issue. Poor lighting increases risk for pedestrians and commuters.",
    },
    {
      id: 4,
      category: "Waste Management",
      title: "Garbage pile blocking sidewalk",
      desc: "Garbage pile is blocking pedestrian movement and creating hygiene problems.",
      location: "Rishra Market Area, Hooghly",
      status: "Resolved",
      votes: 28,
      severity: "Medium",
      points: 120,
      aiSummary:
        "Gemini AI identified this as a waste management issue affecting cleanliness and public movement.",
    },
  ]);

  const [form, setForm] = useState({
    title: "",
    location: "Fetching current GPS coordinates...",
    description: "",
    image: null,
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeIssue = async () => {
    if (!form.title || !form.description) {
      alert("Please enter issue title and description");
      return;
    }

    setIsAnalyzing(true);

    try {
      const ai = await analyzeWithGemini(
        form.title,
        form.description,
        form.location
      );

      const newIssue = {
        id: Date.now(),
        category: ai.category,
        title: form.title,
        desc: form.description,
        location:
          form.location === "Fetching current GPS coordinates..."
            ? "Detected: Kolkata Community Zone"
            : form.location,
        status: "Reported",
        votes: 1,
        severity: ai.severity,
        points: 20,
        aiSummary: ai.aiSummary,
        recommendedAction: ai.recommendedAction,
        priorityReason: ai.priorityReason,
      };

      setIssues([newIssue, ...issues]);

      setForm({
        title: "",
        location: "Fetching current GPS coordinates...",
        description: "",
        image: null,
      });

      setActiveTab("dashboard");
    } catch (error) {
      console.error("Gemini Core Error:", error);
      alert("Gemini analysis failed. Check API key, .env file, or browser console.");
    } finally {
      setIsAnalyzing(false);
    }
  };
  const handleVote = (id) => {
    setIssues(
      issues.map((issue) =>
        issue.id === id
          ? { ...issue, votes: issue.votes + 1, points: issue.points + 10 }
          : issue
      )
    );
  };

  const moveStatus = (id) => {
    setIssues(
      issues.map((issue) =>
        issue.id === id
          ? {
              ...issue,
              status:
                issue.status === "Reported"
                  ? "Verified"
                  : issue.status === "Verified"
                  ? "In Progress"
                  : issue.status === "In Progress"
                  ? "Resolved"
                  : "Resolved",
            }
          : issue
      )
    );
  };

  const totalVotes = issues.reduce((sum, issue) => sum + issue.votes, 0);
  const totalPoints = issues.reduce((sum, issue) => sum + issue.points, 0);
  const highRisk = issues.filter(
    (issue) => issue.severity === "High" || issue.severity === "Critical"
  ).length;
  const resolved = issues.filter((issue) => issue.status === "Resolved").length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl font-black text-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20">
            <Shield size={24} />
            <span>CivicGuardian AI</span>
          </div>
          <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700">
            Vibe2Ship 2026
          </span>
        </div>

        <nav className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "dashboard"
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-2">
              <BarChart3 size={16} /> Dashboard
            </span>
          </button>

          <button
            onClick={() => setActiveTab("report")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "report"
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-2">
              <AlertTriangle size={16} /> Report
            </span>
          </button>

          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "leaderboard"
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-2">
              <Award size={16} /> Heroes
            </span>
          </button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 shadow-xl">
              <h1 className="text-3xl font-bold mb-2 text-white">
                Community Hero — Hyperlocal Problem Solver
              </h1>
              <p className="text-emerald-100 max-w-3xl">
                Report potholes, water leakage, broken streetlights and garbage
                issues. Gemini-powered civic agents classify, prioritize,
                summarize and track community problems transparently.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <AlertTriangle className="text-rose-400" />
                <h3 className="text-3xl font-bold mt-2">{issues.length}</h3>
                <p className="text-sm text-slate-400">Total Issues</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <ShieldCheck className="text-amber-400" />
                <h3 className="text-3xl font-bold mt-2">{highRisk}</h3>
                <p className="text-sm text-slate-400">High Risk</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <Users className="text-blue-400" />
                <h3 className="text-3xl font-bold mt-2">{totalVotes}</h3>
                <p className="text-sm text-slate-400">Verifications</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <Trophy className="text-emerald-400" />
                <h3 className="text-3xl font-bold mt-2">{resolved}</h3>
                <p className="text-sm text-slate-400">Resolved Issues</p>
              </div>
            </div>

            <h2 className="text-lg font-bold tracking-wide text-slate-400 uppercase">
              Active Kolkata Neighborhood Alerts
            </h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-emerald-500/40 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3 gap-3">
                      <span className="text-xs font-bold px-2 py-1 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                        {issue.category}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded font-semibold ${
                          issue.status === "Resolved"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : issue.status === "In Progress"
                            ? "bg-amber-500/10 text-amber-400"
                            : issue.status === "Verified"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {issue.status}
                      </span>
                    </div>

                    <h3 className="text-white font-bold mb-2">{issue.title}</h3>
                    <p className="text-slate-300 text-sm mb-3">{issue.desc}</p>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 bg-slate-900/60 p-2 rounded-lg">
                      <MapPin size={14} className="text-emerald-500 shrink-0" />
                      <span className="truncate">{issue.location}</span>
                    </div>

                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 mb-4">
                      <p className="text-xs text-emerald-400 font-bold mb-1">
                        Gemini AI Analysis
                      </p>
                      <p className="text-xs text-slate-300">{issue.aiSummary}</p>
                      {issue.recommendedAction && (
                        <p className="text-xs text-slate-300 mt-2">
                          <b className="text-emerald-400">Recommended Action:</b>{" "}
                          {issue.recommendedAction}
                        </p>
                      )}

                      {issue.priorityReason && (
                        <p className="text-xs text-slate-300 mt-2">
                          <b className="text-amber-400">Priority Reason:</b>{" "}
                          {issue.priorityReason}
                        </p>
                      )}
                                          </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-3 border-t border-slate-900">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => handleVote(issue.id)}
                        className="flex items-center gap-2 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-3 py-2 rounded-lg border border-slate-800 hover:border-emerald-500/40 transition"
                      >
                        <Eye size={14} />
                        Verify ({issue.votes})
                      </button>

                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${
                          issue.severity === "Critical"
                            ? "text-red-500"
                            : issue.severity === "High"
                            ? "text-rose-400"
                            : issue.severity === "Medium"
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {issue.severity} Priority
                      </span>
                    </div>

                    <button
                      onClick={() => moveStatus(issue.id)}
                      className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-lg transition"
                    >
                      Move Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "report" && (
          <div className="max-w-xl mx-auto bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-white">
              <Camera className="text-emerald-500" /> Smart AI Report Console
            </h2>

            <p className="text-xs text-slate-400 mb-6">
              Upload or describe a civic issue. Gemini AI will classify the
              category, assess severity, generate a summary and create a public
              issue card.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Issue Photo Attachment
                </label>
                <label className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-900/30 hover:border-emerald-500/40 transition cursor-pointer flex flex-col items-center justify-center gap-2">
                  <Camera size={32} className="text-slate-500" />
                  <span className="text-sm text-slate-300 font-medium">
                    Click to upload image
                  </span>
                  <span className="text-xs text-slate-500">
                    Gemini Vision integration ready
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setForm({ ...form, image: e.target.files[0] })
                    }
                  />
                </label>
              </div>

              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Example: Large pothole near railway station"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />

              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                placeholder="Add details: danger level, nearby landmark, public impact..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />

              <input
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-xs text-slate-400"
              />

              <button
                onClick={analyzeIssue}
                disabled={isAnalyzing}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    <span>Gemini Civic Agents Analyzing...</span>
                  </>
                ) : (
                  <span>Analyze & Submit via Gemini AI</span>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-1 text-white flex items-center gap-2">
                <Award className="text-amber-400" /> Community Heroes
              </h2>

              <p className="text-xs text-slate-400 mb-6">
                Citizens earn points for reporting and verifying issues.
                Gamification encourages transparent civic participation.
              </p>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-900/40 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="text-md font-bold text-amber-400 w-6 text-center">
                      #1
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">
                        Himanshu Singh
                      </h4>
                      <p className="text-xs text-slate-500">
                        CivicGuardian AI Founder • Kolkata
                      </p>
                    </div>
                  </div>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-bold border border-emerald-500/20">
                    {totalPoints} Points
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-900/20 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="text-md font-bold text-slate-400 w-6 text-center">
                      #2
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300">
                        Kolkata Community
                      </h4>
                      <p className="text-xs text-slate-500">
                        {totalVotes} verifications submitted
                      </p>
                    </div>
                  </div>
                  <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-bold border border-slate-700">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}