"use client";

import React, { useEffect, useRef, useState } from "react";

export interface RiskOrb3DProps {
  spotShockPct?: number; // e.g. -0.30 for -30%
  basisBps?: number; // e.g. 50 for +50bps
  healthStatus?: "SAFE" | "WARNING" | "LIQUIDATION";
  deltaBps?: number;
  className?: string;
}

export const RiskOrb3D: React.FC<RiskOrb3DProps> = ({
  spotShockPct = 0,
  basisBps = 0,
  healthStatus = "SAFE",
  deltaBps = 0,
  className = "",
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Store active animation parameters in ref so the animation loop can read dynamic props
  const stateRef = useRef({ spotShockPct, basisBps, healthStatus, deltaBps });
  useEffect(() => {
    stateRef.current = { spotShockPct, basisBps, healthStatus, deltaBps };
  }, [spotShockPct, basisBps, healthStatus, deltaBps]);

  useEffect(() => {
    if (!isClient || !mountRef.current) return;

    let animationId: number;
    let renderer: import("three").WebGLRenderer | undefined;
    let isDisposed = false;

    (async () => {
      const THREE = await import("three");
      if (!mountRef.current || isDisposed) return;

      const container = mountRef.current;
      const width = container.clientWidth || 140;
      const height = container.clientHeight || 140;

      // ── Scene & Camera ───────────────────────────────────────────────────
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.z = 8.5;

      // ── Renderer ──────────────────────────────────────────────────────────
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      // ── Group Hierarchy ───────────────────────────────────────────────────
      const gyroGroup = new THREE.Group();
      scene.add(gyroGroup);

      // ── Color Definitions ─────────────────────────────────────────────────
      const mintColor = new THREE.Color("#0df2a4");
      const cyanColor = new THREE.Color("#00d8f6");
      const amberColor = new THREE.Color("#fbbf24");
      const roseColor = new THREE.Color("#f43f5e");

      // ── Outer Ring: Spot Long (Mint) ──────────────────────────────────────
      const outerRingGeo = new THREE.TorusGeometry(2.3, 0.04, 16, 64);
      const outerRingMat = new THREE.MeshBasicMaterial({
        color: mintColor.clone(),
        transparent: true,
        opacity: 0.85,
        wireframe: false,
      });
      const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
      gyroGroup.add(outerRing);

      // ── Inner Ring: Perp Short (Cyan) ─────────────────────────────────────
      const innerRingGeo = new THREE.TorusGeometry(1.7, 0.035, 16, 64);
      const innerRingMat = new THREE.MeshBasicMaterial({
        color: cyanColor.clone(),
        transparent: true,
        opacity: 0.85,
        wireframe: false,
      });
      const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
      gyroGroup.add(innerRing);

      // ── Center Core: Delta Equilibrium Icosahedron ────────────────────────
      const coreGeo = new THREE.IcosahedronGeometry(0.9, 1);
      const coreMat = new THREE.MeshBasicMaterial({
        color: mintColor.clone(),
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      gyroGroup.add(core);

      // ── Center Particle Spark (Equilibrium focal point) ───────────────────
      const sparkGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const sparkMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
      });
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      gyroGroup.add(spark);

      // ── Animation Loop ───────────────────────────────────────────────────
      let clock = 0;

      const animate = () => {
        if (isDisposed) return;
        animationId = requestAnimationFrame(animate);

        clock += 0.018;

        const { spotShockPct: shock, basisBps: basis, healthStatus: status } = stateRef.current;
        const absShock = Math.abs(shock);
        const absBasis = Math.abs(basis);
        const isDisturbed = absShock > 0.01 || absBasis > 5 || status !== "SAFE";

        // Target target colors based on health
        let targetOuterColor = mintColor;
        let targetInnerColor = cyanColor;
        let targetCoreColor = mintColor;
        let jitter = 0;

        if (status === "LIQUIDATION" || absShock >= 0.4) {
          targetOuterColor = roseColor;
          targetInnerColor = roseColor;
          targetCoreColor = roseColor;
          jitter = 0.09;
        } else if (status === "WARNING" || absShock >= 0.15 || absBasis >= 150) {
          targetOuterColor = amberColor;
          targetInnerColor = amberColor;
          targetCoreColor = amberColor;
          jitter = 0.035;
        }

        // Color interpolation for smooth transitions
        outerRingMat.color.lerp(targetOuterColor, 0.08);
        innerRingMat.color.lerp(targetInnerColor, 0.08);
        coreMat.color.lerp(targetCoreColor, 0.08);

        // Ambient rotation speeds
        const speedMultiplier = isDisturbed ? 1.6 : 1.0;
        outerRing.rotation.y = clock * 0.9 * speedMultiplier;
        outerRing.rotation.x = Math.sin(clock * 0.4) * 0.25;

        innerRing.rotation.x = clock * 0.75 * speedMultiplier;
        innerRing.rotation.z = Math.cos(clock * 0.5) * 0.3;

        core.rotation.y = -clock * 0.6;
        core.rotation.x = clock * 0.4;

        // Dynamic tilt based on spot price shock & basis divergence
        const targetTiltX = shock * 1.6; // negative shock tilts downward
        const targetTiltZ = (basis / 300) * 1.2;
        gyroGroup.rotation.x += (targetTiltX - gyroGroup.rotation.x) * 0.1;
        gyroGroup.rotation.z += (targetTiltZ - gyroGroup.rotation.z) * 0.1;

        // Jitter / micro-vibration when under margin stress
        if (jitter > 0) {
          gyroGroup.position.x = (Math.random() - 0.5) * jitter;
          gyroGroup.position.y = (Math.random() - 0.5) * jitter;
        } else {
          gyroGroup.position.x = 0;
          gyroGroup.position.y = 0;
        }

        // Breathing opacity
        coreMat.opacity = isDisturbed
          ? 0.4 + Math.sin(clock * 8) * 0.25
          : 0.25 + Math.sin(clock * 2) * 0.1;

        renderer?.render(scene, camera);
      };

      animate();
    })();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationId);
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [isClient]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* 140x140 fixed canvas container */}
      <div
        ref={mountRef}
        className="w-[140px] h-[140px] relative flex items-center justify-center"
        style={{ pointerEvents: "none" }}
      />
      {/* Ambient glow behind the orb */}
      <div
        className={`absolute inset-0 pointer-events-none rounded-full blur-xl transition-opacity duration-300 ${
          healthStatus === "LIQUIDATION"
            ? "bg-rose-500/20 opacity-70"
            : healthStatus === "WARNING"
            ? "bg-amber-400/20 opacity-60"
            : "bg-[var(--mint)]/10 opacity-40"
        }`}
      />
    </div>
  );
};
export default RiskOrb3D;
