"use client";

import { useState } from "react";
import axios from "axios";
import { User, Shield, Calendar, Clock, AlertCircle, History, Search, CheckCircle } from "lucide-react";

export default function UserRights() {
  const [username, setUsername] = useState("");
  const [userData, setUserData] = useState(null);
  const [rightsLog, setRightsLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!username.trim()) return;

    setLoading(true);
    setError("");
    setUserData(null);
    setRightsLog([]);
    setHasSearched(true);

    try {
      // 1. Fetch User Info
      const userRes = await axios.get("/api/justapedia", {
        params: {
          action: "query",
          list: "users",
          ususers: username,
          usprop: "groups|rights|registration|gender|editcount",
          format: "json",
          // origin: "*"
        }
      });

      const user = userRes.data?.query?.users?.[0];
      if (!user || user.missing !== undefined) {
        throw new Error(`User "${username}" not found.`);
      }
      setUserData(user);

      // 2. Fetch Rights Log
      // Note: In MediaWiki, rights logs target the user page "User:Username"
      const logRes = await axios.get("/api/justapedia", {
        params: {
          action: "query",
          list: "logevents",
          letype: "rights",
          letitle: `User:${user.name}`,
          lelimit: 50,
          format: "json",
          // origin: "*"
        }
      });

      setRightsLog(logRes.data?.query?.logevents || []);

    } catch (err) {
      setError(err.message || "Failed to fetch user rights data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
        <Shield className="w-8 h-8 text-green-600" /> User Rights Inspector
      </h1>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Enter Username
        </label>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <User className="absolute left-3 top-3 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. ExampleUser"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Inspect"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {userData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 text-2xl font-bold">
                  {userData.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{userData.name}</h2>
                  <p className="text-sm text-zinc-500">
                    ID: {userData.userid} • {userData.gender}
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-600 dark:text-zinc-300">
                    Registered: {new Date(userData.registration).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-600 dark:text-zinc-300">
                    Edit Count: {userData.editcount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" /> Current Groups
              </h3>
              <div className="flex flex-wrap gap-2">
                {userData.groups?.map(g => (
                  <span key={g} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-medium border border-zinc-200 dark:border-zinc-700">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Rights Log */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 h-full">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-lg">
                <History className="w-5 h-5 text-blue-500" /> Rights Change History
              </h3>
              
              {rightsLog.length === 0 ? (
                <p className="text-zinc-500 italic">No rights changes found in log.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-800/50">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Performer</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Comment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {rightsLog.map((log) => (
                        <tr key={log.logid} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                          <td className="px-4 py-3 whitespace-nowrap text-zinc-500">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 font-medium text-blue-600 dark:text-blue-400">
                            {log.user}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              {/* Parse params for old/new groups */}
                              {log.params && (
                                <>
                                  <span className="text-red-500 text-xs">- {log.params.oldgroups?.join(", ") || "none"}</span>
                                  <span className="text-green-500 text-xs">+ {log.params.newgroups?.join(", ") || "none"}</span>
                                </>
                              )}
                              {!log.params && <span className="text-zinc-400">Changed rights</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 italic">
                            {log.comment || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
