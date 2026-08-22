import { Component, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Loader, Sparkles, useGLTF } from '@react-three/drei';

const TOKENS = {
  background: '#0A0A0F',
  card: '#14141C',
  panel: 'rgba(20,20,28,0.92)',
  panelBorder: 'rgba(42,36,56,0.8)',
  purple: '#8B5CF6',
  purpleLight: '#A855F7',
  gold: '#F5C542',
  text: '#FFFFFF',
  muted: '#A1A1AA',
  fontDisplay: "'Cinzel', serif",
  fontBody: "'Inter', system-ui, sans-serif",
};

class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props?.onFallback?.();
  }

  componentDidUpdate(previousProps) {
    if (previousProps?.modelUrl !== this.props?.modelUrl && this.state?.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    return this.state?.hasError ? this.props?.fallback : this.props?.children;
  }
}

function GLTFModel({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function BodyMaterial({ color = '#252540', emissive = '#120e25' }) {
  return <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.22} metalness={0.1} roughness={0.76} />;
}

function BodyShapeModel({ dimensions }) {
  const coreRef = useRef(null);
  const auraRef = useRef(null);

  useFrame((state) => {
    const elapsed = state?.clock?.elapsedTime || 0;
    const coreMaterial = coreRef.current?.material;
    const auraMaterial = auraRef.current?.material;

    if (coreMaterial) {
      coreMaterial.emissiveIntensity = 0.5 + Math.sin(elapsed * 1.8) * 0.18;
    }
    if (auraMaterial) {
      auraMaterial.opacity = 0.09 + Math.sin(elapsed * 1.2) * 0.025;
    }
  });

  return (
    <group position={[0, -1.02, 0]} scale={[dimensions?.widthScale || 1, dimensions?.heightScale || 1, dimensions?.depthScale || 1]}>
      <mesh ref={auraRef} position={[0, 1.02, 0]} scale={[1.02, 1.08, 0.78]}>
        <capsuleGeometry args={[0.44, 1.5, 8, 18]} />
        <meshBasicMaterial color={TOKENS.purpleLight} opacity={0.1} side={2} transparent />
      </mesh>

      <mesh position={[0, 1.68, 0]} scale={[0.94, 1.04, 0.92]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <BodyMaterial color="#292941" />
      </mesh>
      <mesh position={[0, 1.48, 0]}>
        <cylinderGeometry args={[0.105, 0.12, 0.18, 18]} />
        <BodyMaterial />
      </mesh>

      <mesh position={[0, 1.12, 0]} scale={[dimensions?.shoulderScale || 1, 1, 0.78]}>
        <capsuleGeometry args={[0.28, 0.62, 8, 18]} />
        <BodyMaterial color="#252540" />
      </mesh>
      <mesh position={[0, 0.69, 0]} scale={[dimensions?.hipScale || 1, 0.9, 0.8]}>
        <sphereGeometry args={[0.28, 22, 22]} />
        <BodyMaterial color="#202038" />
      </mesh>
      <mesh ref={coreRef} position={[0, 1.04, 0.275]}>
        <circleGeometry args={[0.055, 24]} />
        <meshStandardMaterial color={TOKENS.gold} emissive={TOKENS.gold} emissiveIntensity={0.6} />
      </mesh>

      {[-0.36, 0.36].map((xPosition) => (
        <group key={`arm-${xPosition}`}>
          <mesh position={[xPosition, 1.13, 0]} rotation={[0, 0, xPosition > 0 ? -0.08 : 0.08]}>
            <capsuleGeometry args={[0.075, 0.54, 8, 14]} />
            <BodyMaterial color="#24243d" />
          </mesh>
          <mesh position={[xPosition * 1.04, 0.78, 0]}>
            <capsuleGeometry args={[0.062, 0.38, 8, 14]} />
            <BodyMaterial color="#202037" />
          </mesh>
          <mesh position={[xPosition * 1.06, 0.52, 0]}>
            <sphereGeometry args={[0.072, 16, 16]} />
            <BodyMaterial color="#252540" />
          </mesh>
        </group>
      ))}

      {[-0.16, 0.16].map((xPosition) => (
        <group key={`leg-${xPosition}`}>
          <mesh position={[xPosition, 0.33, 0]}>
            <capsuleGeometry args={[0.115, 0.62, 8, 16]} />
            <BodyMaterial color="#24243d" />
          </mesh>
          <mesh position={[xPosition, -0.08, 0]}>
            <capsuleGeometry args={[0.09, 0.48, 8, 16]} />
            <BodyMaterial color="#202037" />
          </mesh>
          <mesh position={[xPosition, -0.38, 0.07]} scale={[1, 0.72, 1.55]}>
            <sphereGeometry args={[0.105, 16, 16]} />
            <BodyMaterial color="#252540" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PreviewScene({ autoRotate, dimensions, draggingRef, modelUrl, onFallback, rotationRef }) {
  const rotationGroupRef = useRef(null);
  const bobGroupRef = useRef(null);

  useFrame((state, delta) => {
    if (autoRotate && !draggingRef.current) {
      rotationRef.current += delta * 0.3;
    }
    if (rotationGroupRef.current) {
      rotationGroupRef.current.rotation.y = rotationRef.current;
    }
    if (bobGroupRef.current) {
      bobGroupRef.current.position.y = Math.sin((state?.clock?.elapsedTime || 0) * 1.3) * 0.025;
    }
  });

  return (
    <>
      <ambientLight color="#574583" intensity={0.62} />
      <directionalLight color="#f3d995" intensity={1.05} position={[3, 5, 4]} />
      <pointLight color={TOKENS.purple} distance={7} intensity={2} position={[-2.4, 1.2, -1.8]} />
      <pointLight color={TOKENS.purpleLight} intensity={0.45} position={[0, -0.4, 2.4]} />

      <group ref={rotationGroupRef}>
        <group ref={bobGroupRef}>
          {modelUrl ? (
            <ModelErrorBoundary fallback={<BodyShapeModel dimensions={dimensions} />} modelUrl={modelUrl} onFallback={onFallback}>
              <Suspense fallback={null}>
                <GLTFModel url={modelUrl} />
              </Suspense>
            </ModelErrorBoundary>
          ) : <BodyShapeModel dimensions={dimensions} />}
        </group>
      </group>

      <Sparkles color={TOKENS.purpleLight} count={38} opacity={0.42} position={[0, 0, 0]} scale={[1.4, 2.5, 1.4]} size={1.8} speed={0.2} />
      <ContactShadows blur={2.5} color="#000000" far={2} opacity={0.5} position={[0, -1.43, 0]} scale={4} />
    </>
  );
}

function formatValue(value, suffix = '') {
  if (value === null || value === undefined || value === '') {
    return '--';
  }

  return `${value}${suffix}`;
}

function PreviewStat({ label, value, tone = '' }) {
  return (
    <div className="sa-body-stat">
      <span className="sa-body-stat-label">{label}</span>
      <span className={`sa-body-stat-value ${tone}`}>{value}</span>
    </div>
  );
}

export default function AIBodyShapeAvatar({
  age = null,
  bodyFocus = 'Body Shape',
  bodyGoal = '',
  gender = '',
  goal = 'Set goal',
  height = null,
  modelUrl = null,
  progress = null,
  viewerHeight = 360,
  weight = null,
  workoutConsistency = null,
}) {
  const rotationRef = useRef(0);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [fallbackActive, setFallbackActive] = useState(false);
  const dimensions = useMemo(() => {
    const safeHeight = Number(height);
    const safeWeight = Number(weight);
    const heightScale = Number.isFinite(safeHeight) && safeHeight > 0 ? Math.max(0.9, Math.min(1.1, safeHeight / 172)) : 1;
    const bmi = Number.isFinite(safeHeight) && safeHeight > 0 && Number.isFinite(safeWeight) && safeWeight > 0
      ? safeWeight / ((safeHeight / 100) ** 2)
      : 22;
    const widthScale = Math.max(0.88, Math.min(1.14, 0.96 + (bmi - 22) * 0.012));

    return {
      depthScale: Math.max(0.9, Math.min(1.12, widthScale)),
      heightScale,
      hipScale: Math.max(0.92, Math.min(1.1, widthScale)),
      shoulderScale: Math.max(0.94, Math.min(1.12, widthScale + 0.02)),
      widthScale,
    };
  }, [height, weight]);

  const handlePointerDown = useCallback((event) => {
    draggingRef.current = true;
    lastXRef.current = event?.clientX || 0;
    event?.currentTarget?.setPointerCapture?.(event?.pointerId);
  }, []);

  const handlePointerMove = useCallback((event) => {
    if (!draggingRef.current) {
      return;
    }

    const currentX = event?.clientX || 0;
    rotationRef.current += (currentX - lastXRef.current) * 0.012;
    lastXRef.current = currentX;
  }, []);

  const endDrag = useCallback(() => {
    draggingRef.current = false;
  }, []);
  const progressLabel = progress === null || progress === undefined ? 'Tracking' : `${Math.round(Number(progress) || 0)}%`;
  const metadata = [
    height ? `${height} cm` : '',
    age ? `Age ${age}` : '',
    gender ? String(gender).replace(/^./, (character) => character.toUpperCase()) : '',
    workoutConsistency ? `${workoutConsistency} consistency` : '',
  ].filter(Boolean);

  return (
    <div className="sa-body-root">
      <div className="sa-body-glow" aria-hidden="true" />
      <div
        aria-label="Rotatable AI body shape preview"
        className="sa-body-canvas-wrap"
        onPointerCancel={endDrag}
        onPointerDown={handlePointerDown}
        onPointerLeave={endDrag}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        role="img"
        style={{ height: viewerHeight }}
      >
        <Canvas camera={{ position: [0, 0.15, 4.35], fov: 32 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}>
          <Suspense fallback={null}>
            <PreviewScene autoRotate={autoRotate} dimensions={dimensions} draggingRef={draggingRef} modelUrl={modelUrl} onFallback={() => setFallbackActive(true)} rotationRef={rotationRef} />
          </Suspense>
        </Canvas>

        {modelUrl ? (
          <Loader
            barStyles={{ background: TOKENS.gold, height: 4 }}
            containerStyles={{ background: 'rgba(5,5,14,0.88)' }}
            dataInterpolation={(loadingProgress) => `Preparing body preview... ${loadingProgress.toFixed(0)}%`}
            dataStyles={{ color: TOKENS.text, fontFamily: TOKENS.fontBody, fontSize: 11, marginTop: 8 }}
            innerStyles={{ background: '#1f1f3a', height: 4, width: 140 }}
          />
        ) : null}

        <button
          aria-pressed={autoRotate}
          className="sa-body-toggle"
          onClick={() => setAutoRotate((current) => !current)}
          onPointerDown={(event) => event?.stopPropagation?.()}
          type="button"
        >
          {autoRotate ? 'Pause Auto-Rotate' : 'Start Auto-Rotate'}
        </button>
        {fallbackActive ? <div className="sa-body-badge">Preview Mode</div> : null}
        <div className="sa-body-hint">Drag to rotate</div>
      </div>

      <div className="sa-body-panel">
        <div className="sa-body-stat-grid">
          <PreviewStat label="Weight" tone="sa-body-gold" value={formatValue(weight, weight ? ' kg' : '')} />
          <PreviewStat label="Goal" tone="sa-body-purple" value={goal || 'Set goal'} />
          <PreviewStat label="Progress" value={progressLabel} />
          <PreviewStat label="Focus" value={bodyGoal || bodyFocus || 'Body Shape'} />
        </div>
        {metadata?.length ? <p className="sa-body-meta">{metadata.join(' | ')}</p> : <p className="sa-body-meta">Complete your calculator profile to refine this preview.</p>}
      </div>

      <style>{`
        .sa-body-root { position:relative; display:flex; flex-direction:column; gap:10px; width:100%; max-width:430px; min-width:0; margin:0 auto; font-family:${TOKENS.fontBody}; color:${TOKENS.text}; }
        .sa-body-glow { position:absolute; top:0; left:50%; width:88%; height:68%; transform:translateX(-50%); background:radial-gradient(ellipse at 50% 45%,rgba(139,92,246,0.24) 0%,rgba(139,92,246,0.07) 45%,transparent 72%); pointer-events:none; filter:blur(2px); z-index:0; }
        .sa-body-canvas-wrap { position:relative; width:100%; max-width:100%; max-height:60dvh; border-radius:14px; overflow:hidden; background:linear-gradient(180deg,rgba(20,20,28,0.52) 0%,rgba(10,10,15,0.92) 100%); border:1px solid ${TOKENS.panelBorder}; touch-action:none; cursor:grab; z-index:1; }
        .sa-body-canvas-wrap:active { cursor:grabbing; }
        .sa-body-canvas-wrap canvas { display:block; max-width:100%; touch-action:none; }
        .sa-body-toggle { position:absolute; top:10px; right:10px; min-height:36px; max-width:calc(100% - 20px); background:rgba(10,10,15,0.88); border:1px solid rgba(124,58,237,0.25); color:${TOKENS.purpleLight}; font-family:${TOKENS.fontBody}; font-size:10px; font-weight:700; padding:7px 10px; border-radius:18px; cursor:pointer; transition:background 0.15s ease,border-color 0.15s ease; }
        .sa-body-toggle:hover { background:rgba(124,58,237,0.16); border-color:rgba(124,58,237,0.5); }
        .sa-body-toggle:focus-visible { outline:2px solid ${TOKENS.purpleLight}; outline-offset:2px; }
        .sa-body-badge { position:absolute; top:10px; left:10px; background:rgba(245,197,66,0.12); border:1px solid rgba(245,197,66,0.32); color:${TOKENS.gold}; font-size:9px; font-weight:800; text-transform:uppercase; padding:5px 9px; border-radius:18px; }
        .sa-body-hint { position:absolute; bottom:10px; left:50%; transform:translateX(-50%); white-space:nowrap; font-size:9px; color:${TOKENS.muted}; letter-spacing:0.08em; text-transform:uppercase; pointer-events:none; opacity:0.75; }
        .sa-body-panel { position:relative; z-index:1; min-width:0; background:${TOKENS.panel}; border:1px solid ${TOKENS.panelBorder}; border-radius:12px; padding:12px; }
        .sa-body-stat-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; }
        .sa-body-stat { min-width:0; display:flex; flex-direction:column; align-items:center; gap:3px; background:rgba(139,92,246,0.06); border:1px solid rgba(124,58,237,0.16); border-radius:8px; padding:8px 4px; }
        .sa-body-stat-label { font-size:9px; letter-spacing:0.08em; text-transform:uppercase; color:${TOKENS.muted}; font-weight:700; }
        .sa-body-stat-value { width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:center; font-family:${TOKENS.fontDisplay}; font-size:12px; font-weight:700; color:${TOKENS.text}; }
        .sa-body-gold { color:${TOKENS.gold}; text-shadow:0 0 10px rgba(245,197,66,0.3); }
        .sa-body-purple { color:${TOKENS.purpleLight}; text-shadow:0 0 10px rgba(168,85,247,0.3); }
        .sa-body-meta { margin:9px 0 0; overflow-wrap:anywhere; text-align:center; color:${TOKENS.muted}; font-size:10px; line-height:1.5; }
        @media (min-width:720px) { .sa-body-root { max-width:680px; flex-direction:row; align-items:stretch; } .sa-body-canvas-wrap { flex:1.25; height:100% !important; min-height:420px; max-height:none; } .sa-body-panel { display:flex; flex:0.9; flex-direction:column; justify-content:center; align-self:center; } }
        @media (max-width:390px) { .sa-body-toggle { font-size:9px; } .sa-body-stat-value { font-size:11px; } }
      `}</style>
    </div>
  );
}

AIBodyShapeAvatar.preload = (url) => {
  if (url) {
    useGLTF.preload(url);
  }
};
