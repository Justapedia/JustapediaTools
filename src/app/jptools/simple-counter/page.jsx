"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import axios from "axios";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Clock, Search, ArrowUpRight } from "lucide-react";

export default function SimpleCounter() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-zinc-500">Loading tool...</div>}>
      <SimpleCounterContent />
    </Suspense>
  );
}

function SimpleCounterContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [editCount, setEditCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCount = useCallback(async (overrideUser) => {
    const user = (typeof overrideUser === "string" ? overrideUser : username).trim();
    if (!user) return;

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("username", user);
    
    const newSearchString = params.toString();
    if (newSearchString !== searchParams.toString()) {
      router.replace(`${pathname}?${newSearchString}`);
    }

    setLoading(true);
    setError("");
    setEditCount(null);

    try {
      const response = await axios.get("/api/justapedia", {
        params: {
          action: "query",
          list: "users",
          ususers: user,
          usprop: "editcount",
          format: "json",
          // origin: "*",
        },
      });

      const userData = response.data?.query?.users?.[0];

      if (!userData || userData.missing !== undefined) {
        setError("User not found.");
      } else {
        setEditCount(userData.editcount);
      }
    } catch (err) {
      setError("Error fetching data.");
    } finally {
      setLoading(false);
    }
  }, [username, searchParams, pathname, router]);

  useEffect(() => {
    const u = searchParams.get("username");
    if (u) {
      setUsername(u);
      fetchCount(u);
    }
  }, [searchParams, fetchCount]);

  return (
    <div className="max-w-xl mx-auto mt-20 text-center space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-white flex justify-center items-center gap-3">
          <Clock className="w-10 h-10 text-gray-500" /> Simple Counter
        </h1>
        <p className="text-zinc-500">Fast, lightweight edit counter for Justapedia.</p>
      </div>
      
      <div className="relative">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username..."
          className="w-full text-center text-2xl py-4 rounded-full border-2 border-zinc-200 dark:border-zinc-800 focus:border-blue-500 focus:outline-none bg-transparent"
          onKeyDown={(e) => e.key === "Enter" && fetchCount()}
          autoFocus
        />
        <button 
          onClick={() => fetchCount()}
          className="absolute right-3 top-3 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          <Search className="w-6 h-6 text-zinc-500" />
        </button>
      </div>

      {loading && <div className="text-zinc-400 animate-pulse">Fetching...</div>}

      {error && <div className="text-red-500">{error}</div>}

      {editCount !== null && (
        <div className="bg-zinc-100 dark:bg-zinc-800 p-8 rounded-2xl inline-block min-w-[200px]">
          <span className="block text-sm text-zinc-500 uppercase tracking-wider mb-1">Edit Count</span>
          <span className="text-5xl font-black text-blue-600 dark:text-blue-400">
            {editCount.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
