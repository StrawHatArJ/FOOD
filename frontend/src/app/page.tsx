"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { animate } from "animejs";

interface AnalysisItem {
  ingredient: string;
  limit: string;
  concern: string;
}

interface AnalysisResult {
  product: {
    product_name: string;
    ingredients_text: string;
    image_url: string;
    nutriscore_grade: string;
    brands: string;
  };
  analysis: {
    health_score: number;
    score_label: string;
    analysis: AnalysisItem[];
    daily_limit: string;
    alternatives: string[];
  };
  error?: string;
}

// Score color helper
function getScoreColor(score: number) {
  if (score >= 80) return { color: "#4ade80", label: "Excellent" };
  if (score >= 60) return { color: "#3b82f6", label: "Good" };
  if (score >= 40) return { color: "#fbbf24", label: "Moderate" };
  if (score >= 20) return { color: "#f97316", label: "Poor" };
  return { color: "#f87171", label: "Dangerous" };
}

// Score Ring SVG Component
function ScoreRing({ score, animationDelay = 0 }: { score: number; animationDelay?: number }) {
  const ringRef = useRef<SVGCircleElement>(null);
  const { color } = getScoreColor(score);
  const circumference = 2 * Math.PI * 80;
  const offset = circumference - (score / 100) * circumference;

  useEffect(() => {
    if (ringRef.current) {
      gsap.fromTo(
        ringRef.current,
        { strokeDashoffset: circumference },
        {
          strokeDashoffset: offset,
          duration: 2,
          delay: animationDelay,
          ease: "power3.out",
        }
      );
    }
  }, [score, circumference, offset, animationDelay]);

  return (
    <div className="score-ring-container">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" className="score-ring-bg" />
        <circle
          ref={ringRef}
          cx="100"
          cy="100"
          r="80"
          className="score-ring-fill"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
        />
      </svg>
      <div className="score-number">
        <motion.span
          className="value"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: animationDelay + 0.5, duration: 0.8, type: "spring" }}
        >
          {score}
        </motion.span>
        <span className="label">Health Index</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // GSAP Hero entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      tl.fromTo(
        titleRef.current,
        { y: 120, opacity: 0, rotateX: 40 },
        { y: 0, opacity: 1, rotateX: 0, duration: 1.4 }
      )
        .fromTo(
          subtitleRef.current,
          { y: 60, opacity: 0 },
          { y: 0, opacity: 1, duration: 1 },
          "-=0.8"
        )
        .fromTo(
          searchRef.current,
          { y: 80, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 1 },
          "-=0.6"
        );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  // Anime.js particles on results
  const triggerParticles = useCallback(() => {
    const container = resultsRef.current;
    if (!container) return;

    for (let i = 0; i < 30; i++) {
      const particle = document.createElement("div");
      const colors = ["#4ade80", "#3b82f6", "#8b5cf6", "#fbbf24"];
      particle.style.cssText = `
        position: absolute;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${colors[Math.floor(Math.random() * 4)]};
        pointer-events: none;
        z-index: 50;
        top: 50%;
        left: 50%;
      `;
      container.appendChild(particle);

      const randX = (Math.random() - 0.5) * 600;
      const randY = (Math.random() - 0.5) * 600;
      const dur = 800 + Math.random() * 1000;

      animate(particle, {
        translateX: randX,
        translateY: randY,
        scale: [1, 0],
        opacity: [1, 0],
        duration: dur,
        ease: 'out(3)',
        onComplete: () => particle.remove(),
      });
    }
  }, []);

  // GSAP results stagger animation
  useEffect(() => {
    if (result && resultsRef.current) {
      const cards = resultsRef.current.querySelectorAll(".reveal-up");
      gsap.fromTo(
        cards,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "power3.out",
        }
      );
      triggerParticles();
    }
  }, [result, triggerParticles]);

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();

      if (data.error && !data.product) {
        setError(data.error);
      } else if (data.product && data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen">
      {/* Animated Background Mesh */}
      <div className="bg-mesh" />

      {/* Hero Section */}
      <div ref={heroRef} className="relative z-10">
        <section className="flex flex-col items-center justify-center min-h-[70vh] px-6 pt-20">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-6"
          >
            <span className="tag" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}>
              🔬 Powered by Google Gemini AI
            </span>
          </motion.div>

          {/* Title */}
          <h1
            ref={titleRef}
            className="text-6xl md:text-8xl font-black text-center leading-tight mb-6"
            style={{ perspective: "1000px", opacity: 0 }}
          >
            <span className="text-gradient">AI Food</span>
            <br />
            <span style={{ color: "var(--text-primary)" }}>Analyzer</span>
          </h1>

          {/* Subtitle */}
          <p
            ref={subtitleRef}
            className="text-lg md:text-xl text-center max-w-xl mb-12"
            style={{ color: "var(--text-secondary)", opacity: 0 }}
          >
            Discover the real health impact of your packaged snacks — analyzed against{" "}
            <strong style={{ color: "var(--accent-green)" }}>FSSAI</strong> &{" "}
            <strong style={{ color: "var(--accent-blue)" }}>WHO</strong> standards.
          </p>

          {/* Search Bar */}
          <div ref={searchRef} className="w-full max-w-2xl" style={{ opacity: 0 }}>
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.div className="flex-1" whileFocus={{ scale: 1.01 }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search any food... Maggi, Oreo, or scan a barcode"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                />
              </motion.div>
              <motion.button
                className="analyze-btn"
                onClick={handleAnalyze}
                disabled={loading || !query.trim()}
                whileTap={{ scale: 0.96 }}
              >
                <span>{loading ? "Analyzing..." : "Analyze 🔍"}</span>
              </motion.button>
            </div>
          </div>
        </section>

        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-20"
            >
              <div className="glass-card pulse-glow p-10 flex flex-col items-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="w-12 h-12 border-3 border-t-transparent rounded-full mb-6"
                  style={{ borderColor: "var(--accent-blue)", borderTopColor: "transparent", borderWidth: 3 }}
                />
                <p style={{ color: "var(--text-secondary)" }}>
                  Scanning ingredients & evaluating health impact...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        <AnimatePresence>
          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-center px-6 py-10"
            >
              <div
                className="glass-card p-8 max-w-lg w-full text-center"
                style={{ borderColor: "rgba(248, 113, 113, 0.3)" }}
              >
                <p className="text-2xl mb-2">😔</p>
                <p style={{ color: "var(--accent-red)" }}>{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {result && !loading && (
            <motion.section
              ref={resultsRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative px-6 pb-32 max-w-6xl mx-auto"
            >
              {/* Product Header */}
              <div className="reveal-up glass-card p-8 mb-6 flex flex-col md:flex-row items-center gap-8">
                {result.product.image_url && (
                  <motion.img
                    src={result.product.image_url}
                    alt={result.product.product_name}
                    className="w-28 h-28 rounded-2xl object-cover"
                    style={{ border: "1px solid var(--glass-border)" }}
                    whileHover={{ scale: 1.08, rotate: 2 }}
                  />
                )}
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-3xl font-bold mb-1">{result.product.product_name}</h2>
                  {result.product.brands && (
                    <p style={{ color: "var(--text-secondary)" }}>by {result.product.brands}</p>
                  )}
                  <p
                    className="mt-3 text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)", maxWidth: 600 }}
                  >
                    {result.product.ingredients_text?.slice(0, 200)}
                    {result.product.ingredients_text?.length > 200 ? "..." : ""}
                  </p>
                </div>
              </div>

              {/* Score + Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Score Card */}
                <div className="reveal-up glass-card p-8 flex flex-col items-center justify-center">
                  <ScoreRing score={result.analysis.health_score} animationDelay={0.3} />
                  <motion.p
                    className="mt-4 text-sm font-semibold"
                    style={{
                      color: getScoreColor(result.analysis.health_score).color,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                  >
                    {result.analysis.score_label}
                  </motion.p>
                </div>

                {/* Daily Limit Card */}
                <div className="reveal-up glass-card p-8 flex flex-col justify-center">
                  <h3 className="text-sm uppercase tracking-widest mb-4" style={{ color: "var(--text-secondary)" }}>
                    ⚖️ Daily Limit
                  </h3>
                  <p className="text-lg font-medium leading-relaxed">{result.analysis.daily_limit}</p>
                </div>

                {/* Alternatives Card */}
                <div className="reveal-up glass-card p-8 flex flex-col justify-center">
                  <h3 className="text-sm uppercase tracking-widest mb-4" style={{ color: "var(--text-secondary)" }}>
                    🔄 Healthier Alternatives
                  </h3>
                  <ul className="space-y-2">
                    {result.analysis.alternatives?.map((alt, i) => (
                      <motion.li
                        key={i}
                        className="flex items-center gap-2 text-sm"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 1 + i * 0.2 }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: "var(--accent-green)" }}
                        />
                        {alt}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Analysis Table */}
              <div className="reveal-up glass-card p-8">
                <h3 className="text-sm uppercase tracking-widest mb-6" style={{ color: "var(--text-secondary)" }}>
                  🔬 Flagged Ingredients
                </h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>WHO / FSSAI Limit</th>
                      <th>Concern</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.analysis.analysis?.map((row, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + i * 0.15 }}
                      >
                        <td className="font-medium">{row.ingredient}</td>
                        <td style={{ color: "var(--accent-amber)" }}>{row.limit}</td>
                        <td style={{ color: "var(--accent-red)" }}>{row.concern}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Attribution */}
              <motion.p
                className="text-center mt-12 text-xs"
                style={{ color: "rgba(148, 163, 184, 0.4)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
              >
                Data sourced from Open Food Facts · Analysis by Google Gemini AI · Evaluated against WHO & FSSAI
                guidelines
              </motion.p>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
