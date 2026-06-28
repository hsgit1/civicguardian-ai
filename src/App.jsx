import { useState,useEffect } from "react";
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
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const aiClient = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64Data = reader.result.split(",")[1];

      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      resolve(reader.result);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function analyzeWithGemini(title, description, location, imageFile) {
  const prompt = `
You are CivicGuardian AI, an expert civic infrastructure agent for Kolkata and Hooghly communities.

Analyze this community issue using text and uploaded image if provided. Return ONLY valid JSON.

Issue Title: ${title}
Description: ${description}
Location: ${location}

Return JSON exactly in this structure:
{
  "category": "Road Damage | Water Leakage | Streetlight Issue | Waste Management | Public Infrastructure | Drainage Issue | Electrical Hazard | Other",
  "severity": "Low | Medium | High | Critical",
  "aiSummary": "2 sentence civic impact summary",
  "recommendedAction": "what authority/community should do next",
  "priorityReason": "why this priority was selected",
  "authority":"",
  "estimatedResponseTime":"",
  "citizenAdvice":"",
  "riskScore":"",
  "department":"",
  "estimatedPopulation":"",
  "nearbyLandmark":"",
  "responseTime":"",
  "urgency":"",
  "futureRisk":"",
  "probability":"",
  "nextHotspot":"",
  "preventiveRecommendation":""
}


Authority Mapping:

Road Damage → PWD / Municipal Road Department

Water Leakage → Water Supply Department

Streetlight Issue → Electricity Department

Waste Management → Municipal Sanitation

Electrical Hazard → WBSEDCL

Drainage Issue → Drainage Department

Public Infrastructure → Municipal Corporation

Estimate realistic response time.

Return riskScore from 1-10.
Location Intelligence Agent:
Estimate nearbyLandmark, affected population, responsible department, responseTime, and urgency.

Prediction Agent:
Predict futureRisk, probability, nextHotspot, and preventiveRecommendation.

Use Kolkata/Hooghly context such as Salt Lake, New Town, Gariahat, Behala, Ballygunge, Tollygunge,
Park Street, Rishra, Serampore, Konnagar where relevant.

Estimate realistic response time.
Return riskScore from 1-10.
`;

  const parts = [{ text: prompt }];

  if (imageFile) {
    const imagePart = await fileToGenerativePart(imageFile);
    parts.push(imagePart);
  }

  const response = await aiClient.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const cleaned = response.text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(cleaned);
}

async function checkDuplicateWithGemini(title, description, location, issues) {
  const existingIssues = issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    description: issue.desc,
    location: issue.location,
    category: issue.category,
    status: issue.status,
  }));

  const prompt = `
You are CivicGuardian AI Duplicate Detection Agent.

Compare the new civic issue with the existing issue list.

New Issue:
Title: ${title}
Description: ${description}
Location: ${location}

Existing Issues:
${JSON.stringify(existingIssues, null, 2)}

Return ONLY valid JSON:
{
  "isDuplicate": true or false,
  "duplicateId": number or null,
  "confidence": "Low | Medium | High",
  "reason": "short reason"
}
`;

  const response = await aiClient.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = response.text;
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

const defaultIssues =[
  {
      id: 1,
      category: "Road Damage",
      title: "Large pothole near station",
      desc: "Deep pothole creating accident risk for students, bikes and autos near railway station.",
      location: "Rishra Station Area , Hooghly",
      lat: 22.7145,
      lng: 88.3478,
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
      lat: 22.5726,
      lng: 88.4335,
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
      lat: 22.5195,
      lng: 88.3656,
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
      lat: 22.7102,
      lng: 88.3518,
      status: "Resolved",
      votes: 28,
      severity: "Medium",
      points: 120,
      aiSummary:
        "Gemini AI identified this as a waste management issue affecting cleanliness and public movement.",
    },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const [issues, setIssues] = useState(() => {
    const saved = localStorage.getItem("civicguardian-issues");
    return saved ? JSON.parse(saved) : defaultIssues;
  });

  const [form, setForm] = useState({
    title: "",
    location: "Fetching current GPS coordinates...",
    description: "",
    image: null,
    imageBase64: null,
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [duplicateAlert, setDuplicateAlert] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("Detect GPS");

  useEffect(() => {
      localStorage.setItem(
          "civicguardian-issues",
          JSON.stringify(issues)
      );
  }, [issues]);

  const detectGPS = () => {
  if (!navigator.geolocation) {
    alert("GPS not supported");
    return;
  }

  setGpsStatus("Detecting...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setForm({
        ...form,
        location: `Live GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        lat,
        lng,
      });

      setGpsStatus("GPS Captured");
    },
    () => {
      alert("GPS permission denied. Using manual location.");
      setGpsStatus("GPS Denied");
    }
  );
};

  const analyzeIssue = async () => {
    if (!form.title || !form.description) {
      alert("Please enter issue title and description");
      return;
    }

    setIsAnalyzing(true);

    try {
      const duplicate = await checkDuplicateWithGemini(
        form.title,
        form.description,
        form.location,
        issues
      );

      if (duplicate.isDuplicate && duplicate.confidence !== "Low") {
        const matchedIssue = issues.find(
          (issue) => issue.id === duplicate.duplicateId
        );

        setDuplicateAlert({
          ...duplicate,
          matchedIssue,
        });

        setIsAnalyzing(false);
        return;
      }

      setDuplicateAlert(null);
      const ai = await analyzeWithGemini(
        form.title,
        form.description,
        form.location,
        form.image
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
        authority: ai.authority,
        estimatedResponseTime: ai.estimatedResponseTime,
        citizenAdvice: ai.citizenAdvice,
        riskScore: ai.riskScore,
        department: ai.department,
        estimatedPopulation: ai.estimatedPopulation,
        nearbyLandmark: ai.nearbyLandmark,
        responseTime: ai.responseTime,
        urgency: ai.urgency,
        futureRisk: ai.futureRisk,
        probability: ai.probability,
        nextHotspot: ai.nextHotspot,
        preventiveRecommendation: ai.preventiveRecommendation,
        imageUrl: form.imageBase64,
        resolvedImageUrl: null,
        lat: form.lat || 22.5726,
        lng: form.lng || 88.3639,
      };

      setIssues([newIssue, ...issues]);

      setForm({
        title: "",
        location: "Fetching current GPS coordinates...",
        description: "",
        image: null,
        imageBase64: null,
      });
      setImagePreview(null);
      setDuplicateAlert(null);

      setActiveTab("dashboard");
    } catch (error) {
      console.error("Gemini Core Error:", error);
      //alert("Gemini analysis failed. Check API key, .env file, or browser console.");
      alert(error.message);
      throw error;
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
  const criticalIssues = issues.filter(
    (i) => i.severity === "Critical"
  ).length;

  const categoryCounts = issues.reduce((acc, issue) => {
    acc[issue.category] = (acc[issue.category] || 0) + 1;
    return acc;
  }, {});

  const mostCommonIssue =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "No issues yet";

  const areaCounts = issues.reduce((acc, issue) => {
    const area = issue.location?.split(",")[0] || "Unknown Area";
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {});

  const mostReportedArea =
    Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "No hotspot yet";

  const resolutionRate =
    issues.length === 0 ? 0 : Math.round((resolved / issues.length) * 100);

  const predictedHotspot =
    issues.find((issue) => issue.nextHotspot)?.nextHotspot ||
    "Rishra • Serampore • Konnagar";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-100 font-sans">
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
              <div className="bg-slate-950/80 backdrop-blur border border-slate-800 rounded-xl p-5 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
                <AlertTriangle className="text-rose-400" />
                <h3 className="text-3xl font-bold mt-2">{issues.length}</h3>
                <p className="text-sm text-slate-400">Total Issues</p>
              </div>

              <div className="bg-slate-950/80 backdrop-blur border border-slate-800 rounded-xl p-5 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
                <ShieldCheck className="text-amber-400" />
                <h3 className="text-3xl font-bold mt-2">{highRisk}</h3>
                <p className="text-sm text-slate-400">High Risk</p>
              </div>

              <div className="bg-slate-950/80 backdrop-blur border border-slate-800 rounded-xl p-5 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
                <Users className="text-blue-400" />
                <h3 className="text-3xl font-bold mt-2">{totalVotes}</h3>
                <p className="text-sm text-slate-400">Verifications</p>
              </div>

              <div className="bg-slate-950/80 backdrop-blur border border-slate-800 rounded-xl p-5 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
                <Trophy className="text-emerald-400" />
                <h3 className="text-3xl font-bold mt-2">{resolved}</h3>
                <p className="text-sm text-slate-400">Resolved Issues</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase">
                  Highest Risk
                </p>

                <h3 className="text-2xl font-bold text-red-400 mt-2">
                  {criticalIssues}
                </h3>

                <p className="text-sm text-slate-400">
                  Critical Issues
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase">
                  Most Common
                </p>

                <h3 className="text-lg font-bold text-emerald-400 mt-2">
                  {mostCommonIssue}
                </h3>

                <p className="text-sm text-slate-400">
                  Issue Category
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase">
                  Hotspot
                </p>

                <h3 className="text-lg font-bold text-yellow-400 mt-2">
                  {mostReportedArea}
                </h3>

                <p className="text-sm text-slate-400">
                  Highest Activity Zones
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase">
                  Prediction
                </p>

                <h3 className="text-lg font-bold text-cyan-400 mt-2">
                  {predictedHotspot}
                </h3>

                <p className="text-sm text-slate-400">
                  Predicted Hotspots
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase">
                  Resolution Rate
                </p>

                <h3 className="text-2xl font-bold text-pink-400 mt-2">
                  {resolutionRate}%
                </h3>

                <p className="text-sm text-slate-400">
                  Completed Cases
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase">
                  AI Status
                </p>

                <h3 className="text-lg font-bold text-green-400 mt-2 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400"></span>
                  </span>
                  Active
                </h3>

                <p className="text-sm text-slate-400">
                  Gemini Agents
                </p>
              </div>

            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <h2 className="text-lg font-bold text-white mb-3">
                Live Civic Issue Map
              </h2>

              <div className="h-96 rounded-xl overflow-hidden">
                <MapContainer
                  center={[22.5726, 88.3639]}
                  zoom={11}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {issues.map((issue) => (
                    <Marker
                      key={issue.id}
                      position={[issue.lat || 22.5726, issue.lng || 88.3639]}
                      icon={markerIcon}
                    >
                      <Popup>
                        <b>{issue.title}</b>
                        <br />
                        {issue.category}
                        <br />
                        Severity: {issue.severity}
                        <br />
                        Status: {issue.status}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>

            <h2 className="text-lg font-bold tracking-wide text-slate-400 uppercase">
              Active Kolkata Neighborhood Alerts
            </h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-slate-950/80 backdrop-blur border border-slate-800 rounded-2xl p-5 hover:border-emerald-400/60 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 flex flex-col justify-between"
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

                   {issue.imageUrl && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 uppercase mb-2">Reported Image</p>
                      <img
                        src={issue.imageUrl}
                        alt="Reported civic issue"
                        className="w-full h-40 object-cover rounded-xl border border-slate-700"
                      />
                    </div>
                  )}
                  {issue.resolvedImageUrl && (
                    <div className="mb-4">
                      <p className="text-xs text-green-400 uppercase mb-2">Resolved Image</p>
                      <img
                        src={issue.resolvedImageUrl}
                        alt="Resolved civic issue"
                        className="w-full h-40 object-cover rounded-xl border border-green-500/40"
                      />
                    </div>
                  )}

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
                      {issue.authority && (
                        <p className="text-xs text-blue-300 mt-2">
                          <b>Responsible Authority:</b> {issue.authority}
                        </p>
                      )}

                      {issue.estimatedResponseTime && (
                        <p className="text-xs text-yellow-300 mt-2">
                          <b>Estimated Response:</b> {issue.estimatedResponseTime}
                        </p>
                      )}

                      {issue.citizenAdvice && (
                        <p className="text-xs text-green-300 mt-2">
                          <b>Citizen Advice:</b> {issue.citizenAdvice}
                        </p>
                      )}

                      {issue.riskScore && (
                        <p className="text-xs text-red-400 mt-2">
                          <b>Risk Score:</b> {issue.riskScore}/10
                        </p>
                      )}
                      {issue.nearbyLandmark && (
                        <p className="text-xs text-purple-300 mt-2">
                          <b>Nearby Landmark:</b> {issue.nearbyLandmark}
                        </p>
                      )}

                      {issue.estimatedPopulation && (
                        <p className="text-xs text-cyan-300 mt-2">
                          <b>Estimated Affected Population:</b> {issue.estimatedPopulation}
                        </p>
                      )}

                      {issue.department && (
                        <p className="text-xs text-blue-300 mt-2">
                          <b>Assigned Department:</b> {issue.department}
                        </p>
                      )}

                      {issue.urgency && (
                        <p className="text-xs text-red-300 mt-2">
                          <b>Urgency:</b> {issue.urgency}
                        </p>
                      )}
                      {issue.futureRisk && (
                        <div className="mt-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
                          <p className="text-xs text-cyan-400 font-bold mb-1">
                            AI Prediction Agent
                          </p>

                          <p className="text-xs text-slate-300 mt-1">
                            <b>Future Risk:</b> {issue.futureRisk}
                          </p>

                          <p className="text-xs text-slate-300 mt-1">
                            <b>Probability:</b> {issue.probability}
                          </p>

                          <p className="text-xs text-slate-300 mt-1">
                            <b>Next Hotspot:</b> {issue.nextHotspot}
                          </p>

                          <p className="text-xs text-slate-300 mt-1">
                            <b>Prevention:</b> {issue.preventiveRecommendation}
                          </p>
                        </div>
                      )}
                     </div>
                  </div>

                  <div className="mt-4 bg-slate-900 rounded-xl p-4 border border-slate-800">

                    <p className="text-xs text-slate-400 uppercase mb-3">
                      AI Resolution Timeline
                    </p>

                    <div className="space-y-2 text-sm">

                      <div className="flex items-center gap-2 text-green-400">
                        ✅ Vision Agent
                      </div>

                      <div className="flex items-center gap-2 text-green-400">
                        ✅ Issue Classification
                      </div>

                      <div className="flex items-center gap-2 text-green-400">
                        ✅ Severity Analysis
                      </div>

                      <div className={`flex items-center gap-2 ${
                        issue.votes >= 5 ? "text-green-400" : "text-yellow-400"
                      }`}>
                        {issue.votes >= 5 ? "✅" : "⏳"} Community Verification
                      </div>

                      <div className={`flex items-center gap-2 ${
                        issue.status === "In Progress" || issue.status === "Resolved"
                          ? "text-green-400"
                          : "text-yellow-400"
                      }`}>
                        {issue.status === "In Progress" || issue.status === "Resolved"
                          ? "✅"
                          : "⏳"} Authority Assigned
                      </div>

                      <div className={`flex items-center gap-2 ${
                        issue.status === "Resolved"
                          ? "text-green-400"
                          : "text-slate-500"
                      }`}>
                        {issue.status === "Resolved"
                          ? "✅"
                          : "○"} Resolution Complete
                      </div>

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
                    <label className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-lg text-center cursor-pointer">
                      Upload Resolved Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;

                          const resolvedUrl = await fileToBase64(file);

                          setIssues(
                            issues.map((item) =>
                              item.id === issue.id
                                ? {
                                    ...item,
                                    resolvedImageUrl: resolvedUrl,
                                    status: "Resolved",
                                  }
                                : item
                            )
                          );
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "report" && (
          <div className="max-w-xl mx-auto bg-slate-950/80 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-2xl shadow-emerald-500/10">
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-white">
              <Camera className="text-emerald-500" /> Smart AI Report Console
            </h2>

            <p className="text-xs text-slate-400 mb-6">
              Upload or describe a civic issue. Gemini AI will classify the
              category, assess severity, generate a summary and create a public
              issue card.
            </p>

            <div className="space-y-4">
              {duplicateAlert && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <h3 className="text-amber-400 font-bold text-sm mb-2">
                    Possible Duplicate Detected
                  </h3>

                  <p className="text-xs text-slate-300 mb-2">
                    {duplicateAlert.reason}
                  </p>

                  {duplicateAlert.matchedIssue && (
                    <div className="bg-slate-900 rounded-lg p-3 text-xs text-slate-300">
                      <p>
                        <b>Matched Issue:</b> {duplicateAlert.matchedIssue.title}
                      </p>
                      <p>
                        <b>Location:</b> {duplicateAlert.matchedIssue.location}
                      </p>
                      <p>
                        <b>Status:</b> {duplicateAlert.matchedIssue.status}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (duplicateAlert.matchedIssue) {
                        handleVote(duplicateAlert.matchedIssue.id);
                      }
                      setDuplicateAlert(null);
                      setActiveTab("dashboard");
                    }}
                    className="mt-3 w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-2 rounded-lg"
                  >
                    Join Existing Report
                  </button>

                  <button
                    onClick={() => setDuplicateAlert(null)}
                    className="mt-2 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-lg"
                  >
                    Report Anyway
                  </button>
                </div>
              )}
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
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Uploaded civic issue preview"
                      className="mt-4 h-40 w-full object-cover rounded-xl border border-slate-700"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;

                      const base64Image = await fileToBase64(file);

                      setForm({
                        ...form,
                        image: file,
                        imageBase64: base64Image,
                      });

                      setImagePreview(base64Image);
                    }}
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

              <button
                type="button"
                onClick={detectGPS}
                className="w-full bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold py-3 rounded-xl mb-4"
              >
                {gpsStatus}
              </button>

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