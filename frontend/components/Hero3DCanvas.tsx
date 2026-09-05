"use client";

import { useEffect, useRef } from "react";

export function Hero3DCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    let animationId: number;
    // Typed references so cleanup can reach them
    let _renderer: import("three").WebGLRenderer | undefined;
    let _onMouseMove: ((e: MouseEvent) => void) | undefined;
    let _onResize: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");

      if (!mountRef.current) return; // component might have unmounted during async

      const W = mountRef.current.clientWidth;
      const H = mountRef.current.clientHeight;

      // ── Scene ──────────────────────────────────────────────────────────
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x080b11, 0.045);

      // ── Camera ─────────────────────────────────────────────────────────
      const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 200);
      camera.position.z = 22;

      // ── Renderer ────────────────────────────────────────────────────────
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      _renderer = renderer;
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      mountRef.current.appendChild(renderer.domElement);

      // ── Particle Field ──────────────────────────────────────────────────
      const PARTICLE_COUNT = 1800;
      const positions = new Float32Array(PARTICLE_COUNT * 3);
      const colors = new Float32Array(PARTICLE_COUNT * 3);
      const mintC = new THREE.Color("#0df2a4");
      const cyanC = new THREE.Color("#00d8f6");
      const whiteC = new THREE.Color("#ffffff");

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 80;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
        const t = Math.random();
        const c = t < 0.4 ? mintC : t < 0.7 ? cyanC : whiteC;
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      const ptGeo = new THREE.BufferGeometry();
      ptGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      ptGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const ptMat = new THREE.PointsMaterial({
        size: 0.18,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
      });
      const particles = new THREE.Points(ptGeo, ptMat);
      scene.add(particles);

      // ── Central Icosahedron Wireframe ───────────────────────────────────
      const icoGeo = new THREE.IcosahedronGeometry(5.5, 1);
      const icoMat = new THREE.MeshBasicMaterial({
        color: "#0df2a4",
        wireframe: true,
        transparent: true,
        opacity: 0.18,
      });
      const ico = new THREE.Mesh(icoGeo, icoMat);
      scene.add(ico);

      // ── Outer Icosahedron (cyan, slower) ────────────────────────────────
      const ico2Geo = new THREE.IcosahedronGeometry(9, 1);
      const ico2Mat = new THREE.MeshBasicMaterial({
        color: "#00d8f6",
        wireframe: true,
        transparent: true,
        opacity: 0.08,
      });
      const ico2 = new THREE.Mesh(ico2Geo, ico2Mat);
      scene.add(ico2);

      // ── Torus Ring ──────────────────────────────────────────────────────
      const torusGeo = new THREE.TorusGeometry(7, 0.04, 12, 100);
      const torusMat = new THREE.MeshBasicMaterial({
        color: "#00d8f6",
        transparent: true,
        opacity: 0.25,
      });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      torus.rotation.x = Math.PI / 2.5;
      scene.add(torus);

      // ── Ambient glow sprites ────────────────────────────────────────────
      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = 64;
      glowCanvas.height = 64;
      const ctx = glowCanvas.getContext("2d")!;
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(13,242,164,0.6)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      const glowTex = new THREE.CanvasTexture(glowCanvas);
      const glowMat = new THREE.SpriteMaterial({
        map: glowTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      for (let i = 0; i < 6; i++) {
        const sprite = new THREE.Sprite(glowMat.clone());
        const scale = 4 + Math.random() * 5;
        sprite.scale.set(scale, scale, 1);
        sprite.position.set(
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10
        );
        scene.add(sprite);
      }

      // ── Mouse Tracking ──────────────────────────────────────────────────
      const targetRot = { x: 0, y: 0 };
      const currentRot = { x: 0, y: 0 };

      _onMouseMove = (e: MouseEvent) => {
        const mx = (e.clientX / window.innerWidth - 0.5) * 2;
        const my = -(e.clientY / window.innerHeight - 0.5) * 2;
        targetRot.x = my * 0.3;
        targetRot.y = mx * 0.5;
      };

      _onResize = () => {
        if (!mountRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      window.addEventListener("mousemove", _onMouseMove);
      window.addEventListener("resize", _onResize);

      // ── Animate ─────────────────────────────────────────────────────────
      const clock = new THREE.Clock();
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        currentRot.x += (targetRot.x - currentRot.x) * 0.04;
        currentRot.y += (targetRot.y - currentRot.y) * 0.04;
        scene.rotation.x = currentRot.x;
        scene.rotation.y = currentRot.y;

        ico.rotation.y = t * 0.12;
        ico.rotation.x = t * 0.07;
        ico2.rotation.y = -t * 0.07;
        ico2.rotation.z = t * 0.05;
        torus.rotation.z = t * 0.08;
        particles.rotation.y = t * 0.015;

        icoMat.opacity = 0.12 + Math.sin(t * 1.2) * 0.06;
        ico2Mat.opacity = 0.05 + Math.sin(t * 0.8 + 1) * 0.04;

        renderer.render(scene, camera);
      };
      animate();
    })();

    return () => {
      cancelAnimationFrame(animationId);
      if (_onMouseMove) window.removeEventListener("mousemove", _onMouseMove);
      if (_onResize) window.removeEventListener("resize", _onResize);
      if (_renderer) {
        _renderer.dispose();
        _renderer.domElement.remove();
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
}
