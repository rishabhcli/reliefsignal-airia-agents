import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from "remotion";

type Accent = {
  primary: string;
  secondary: string;
  glow: string;
  card: string;
};

type Scene = {
  slug: string;
  durationInFrames: number;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  footer: string;
  asset?: string;
  mode: "image" | "notes" | "system" | "finale";
  accent: Accent;
};

const ink = "#eef8ff";
const shell = "#04111a";
const panelShadow = "0 30px 70px rgba(0, 0, 0, 0.34)";
const fontFamily =
  '"Avenir Next", "Segoe UI", sans-serif';
const displayFamily =
  '"Avenir Next Condensed", "Franklin Gothic Medium", "Arial Narrow", sans-serif';

const accents = {
  alert: {
    primary: "#071a27",
    secondary: "#ff6a3d",
    glow: "rgba(255,106,61,0.24)",
    card: "rgba(8,30,43,0.88)"
  },
  signal: {
    primary: "#082332",
    secondary: "#68f0e0",
    glow: "rgba(104,240,224,0.2)",
    card: "rgba(7,30,42,0.88)"
  },
  sky: {
    primary: "#0b2235",
    secondary: "#5bc2ff",
    glow: "rgba(91,194,255,0.22)",
    card: "rgba(8,29,42,0.9)"
  }
};

const scenes: Scene[] = [
  {
    slug: "intro",
    durationInFrames: 360,
    eyebrow: "AI For Good Demo",
    title: "ReliefSignal turns chaotic field intake into a coordinated disaster response workspace.",
    body:
      "The product is built for the first 72 hours of relief when updates are messy, time is short, and every handoff matters.",
    bullets: [
      "Local-first operations board",
      "Priority queue, brief, checklist, and outreach plan",
      "Built to stay useful without backend infrastructure"
    ],
    footer: "ReliefSignal walkthrough",
    asset: "remotion/reliefsignal-full.jpg",
    mode: "image",
    accent: accents.alert
  },
  {
    slug: "problem",
    durationInFrames: 390,
    eyebrow: "The intake problem",
    title: "Coordinators receive WhatsApp updates, volunteer notes, clinic alerts, and needs assessments as one noisy stream.",
    body:
      "ReliefSignal starts with the raw notes responders already have and reshapes them into actions that can be verified, assigned, and briefed quickly.",
    bullets: [
      "Messy notes become response signals",
      "Critical needs stop getting buried",
      "The next operational cycle becomes visible immediately"
    ],
    footer: "Noise into signal",
    mode: "notes",
    accent: accents.signal
  },
  {
    slug: "queue",
    durationInFrames: 390,
    eyebrow: "AI-assisted triage",
    title: "Each incoming signal is scored for urgency, impact, and effort so the queue surfaces what to coordinate first.",
    body:
      "The workspace creates a credible command view for human coordinators instead of an empty dashboard waiting for manual setup.",
    bullets: [
      "Priority scoring stays visible on every card",
      "Sector tags show who needs to engage",
      "The top actions are always ready for a briefing"
    ],
    footer: "Priority queue",
    asset: "remotion/reliefsignal-hero.jpg",
    mode: "image",
    accent: accents.sky
  },
  {
    slug: "board",
    durationInFrames: 390,
    eyebrow: "Coordination board",
    title: "Signals move from incoming to verified, mobilizing, and resolved so field teams can see what is actually advancing.",
    body:
      "The goal is operational clarity. ReliefSignal shows where the response is stuck, what is already moving, and what can be handed to partners next.",
    bullets: [
      "Verification and mobilization lanes stay distinct",
      "Timeboxes and response windows keep context attached",
      "The board feels ready to run on first launch"
    ],
    footer: "Command surface",
    asset: "remotion/reliefsignal-board.jpg",
    mode: "image",
    accent: accents.alert
  },
  {
    slug: "brief",
    durationInFrames: 390,
    eyebrow: "Shared artifacts",
    title: "The same local state also produces a response brief, a coordination checklist, and a partner outreach plan.",
    body:
      "That matters because real relief work is not only about triage. Teams also need something polished enough to hand to clinics, shelter leads, volunteer captains, and radio partners.",
    bullets: [
      "Copyable response brief",
      "Checklist for the next cycle",
      "Outreach prompts for local partners"
    ],
    footer: "Brief, checklist, outreach",
    asset: "remotion/reliefsignal-full.jpg",
    mode: "image",
    accent: accents.signal
  },
  {
    slug: "system",
    durationInFrames: 330,
    eyebrow: "Why the build matters",
    title: "ReliefSignal keeps the architecture intentionally simple: static, local-first, offline-capable, and easy to inspect.",
    body:
      "The app runs fully in the browser, stores the workspace locally, and deploys as static files. That keeps the product practical for hackathon judges and credible for low-connectivity scenarios.",
    bullets: [
      "No backend or secrets required",
      "Service worker keeps the shell available",
      "Static deploy path is simple to verify"
    ],
    footer: "Practical architecture",
    asset: "remotion/reliefsignal-icon.svg",
    mode: "system",
    accent: accents.sky
  },
  {
    slug: "finale",
    durationInFrames: 300,
    eyebrow: "Closing",
    title: "ReliefSignal reframes AI For Good as a coordination problem, not only a model problem.",
    body:
      "The result is a stronger social-good demo: a polished product that helps responders move from scattered reports to shared action without losing the local-first constraint.",
    bullets: [
      "Built for real coordination pressure",
      "Presentation-ready and static deployable",
      "Easy to extend with real intake channels later"
    ],
    footer: "Ready for judges",
    asset: "remotion/reliefsignal-thumbnail.jpg",
    mode: "finale",
    accent: accents.alert
  }
];

export const TOTAL_FRAMES = scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0);

const sceneOffsets = scenes.reduce<Array<Scene & {from: number}>>((acc, scene) => {
  const from = acc.length === 0 ? 0 : acc[acc.length - 1].from + acc[acc.length - 1].durationInFrames;
  acc.push({...scene, from});
  return acc;
}, []);

const rawNotes = [
  "East Bank School shelter needs dry bedding before sunset.",
  "Boat crews can launch if fuel is confirmed.",
  "Clinic is down to one-day insulin supply.",
  "North access road blocked by landslide debris.",
  "Local radio needs verified safe water guidance.",
  "Volunteer captains need tonight's roster and safety brief."
];

const fadeInOut = (frame: number, duration: number) => {
  const fadeIn = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const fadeOut = interpolate(frame, [duration - 22, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  return fadeIn * fadeOut;
};

const progressForFrame = (frame: number) =>
  interpolate(frame, [0, TOTAL_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

const shellStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: shell,
  color: ink,
  fontFamily,
  overflow: "hidden"
};

const SceneChrome: React.FC<{scene: Scene; index: number}> = ({scene, index}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = fadeInOut(frame, scene.durationInFrames);
  const enter = spring({
    frame: frame - 4,
    fps,
    config: {
      damping: 18,
      stiffness: 110
    }
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${0.985 + enter * 0.015})`,
        background: `radial-gradient(circle at top right, ${scene.accent.glow}, transparent 34%), linear-gradient(145deg, ${scene.accent.primary} 0%, #031019 100%)`
      }}
    >
      <AbsoluteFill
        style={{
          padding: 78,
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: 36
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "48px 44px",
            borderRadius: 34,
            background: scene.accent.card,
            border: "1px solid rgba(122,202,255,0.12)",
            boxShadow: panelShadow
          }}
        >
          <div style={{display: "grid", gap: 18}}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.06)",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                alignSelf: "flex-start"
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  backgroundColor: scene.accent.secondary,
                  boxShadow: `0 0 0 8px ${scene.accent.glow}`
                }}
              />
              {scene.eyebrow}
            </div>
            <div
              style={{
                fontFamily: displayFamily,
                fontWeight: 800,
                fontSize: 70,
                lineHeight: 0.95,
                letterSpacing: "0.01em"
              }}
            >
              {scene.title}
            </div>
            <div
              style={{
                fontSize: 28,
                lineHeight: 1.48,
                color: "rgba(238,248,255,0.76)"
              }}
            >
              {scene.body}
            </div>
            <div style={{display: "grid", gap: 14, marginTop: 12}}>
              {scene.bullets.map((bullet, bulletIndex) => {
                const local = Math.max(frame - bulletIndex * 8, 0);
                const shift = interpolate(local, [0, 18], [26, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp"
                });
                const bulletOpacity = interpolate(local, [0, 18], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp"
                });

                return (
                  <div
                    key={bullet}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 18,
                      transform: `translateX(${shift}px)`,
                      opacity: bulletOpacity
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 999,
                        backgroundColor: scene.accent.secondary,
                        boxShadow: `0 0 0 10px ${scene.accent.glow}`
                      }}
                    />
                    <div style={{fontSize: 24, lineHeight: 1.35, fontWeight: 700}}>{bullet}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(238,248,255,0.56)"
            }}
          >
            <div>{scene.footer}</div>
            <div>{String(index + 1).padStart(2, "0")}</div>
          </div>
        </div>

        <VisualPanel scene={scene} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const NoteCard: React.FC<{note: string; index: number}> = ({note, index}) => {
  const frame = useCurrentFrame();
  const local = Math.max(frame - index * 8, 0);
  const raise = interpolate(local, [0, 18], [34, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const rotate = interpolate(local, [0, 18], [-4, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <div
      style={{
        borderRadius: 28,
        padding: 28,
        minHeight: 220,
        background: index % 2 === 0 ? "rgba(255,255,255,0.92)" : "rgba(244,248,255,0.9)",
        color: "#10202b",
        boxShadow: panelShadow,
        transform: `translateY(${raise}px) rotate(${rotate}deg)`,
        display: "grid",
        alignContent: "space-between"
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "8px 12px",
          borderRadius: 999,
          backgroundColor: "rgba(4,17,26,0.08)",
          fontSize: 16,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          alignSelf: "flex-start"
        }}
      >
        Raw field note
      </div>
      <div style={{fontSize: 33, lineHeight: 1.14, fontWeight: 800}}>{note}</div>
    </div>
  );
};

const VisualPanel: React.FC<{scene: Scene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const settle = spring({
    frame,
    fps,
    config: {
      damping: 20,
      stiffness: 95
    }
  });
  const commonPanel: React.CSSProperties = {
    position: "relative",
    overflow: "hidden",
    borderRadius: 38,
    border: "1px solid rgba(122,202,255,0.14)",
    boxShadow: panelShadow
  };

  if (scene.mode === "notes") {
    return (
      <div style={{display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 22}}>
        {rawNotes.map((note, index) => (
          <NoteCard key={note} note={note} index={index} />
        ))}
      </div>
    );
  }

  if (scene.mode === "system") {
    const rows = [
      ["Local-first", "The workspace persists in the browser with no server dependency."],
      ["Offline shell", "A service worker keeps the app usable after the first load."],
      ["Static deploy", "The product builds into a docs folder for simple hosting."]
    ];

    return (
      <div style={{display: "grid", gap: 24}}>
        <div
          style={{
            ...commonPanel,
            minHeight: 420,
            background: "linear-gradient(145deg, rgba(5,18,27,0.96), rgba(8,31,45,0.96))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Img
            src={staticFile(scene.asset!)}
            style={{
              width: 280,
              height: 280,
              filter: "drop-shadow(0 24px 34px rgba(0,0,0,0.28))",
              transform: `scale(${0.92 + settle * 0.08})`
            }}
          />
        </div>
        <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18}}>
          {rows.map(([title, body]) => (
            <div
              key={title}
              style={{
                ...commonPanel,
                minHeight: 210,
                padding: 22,
                background: "rgba(8,31,45,0.88)"
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 800,
                  color: scene.accent.secondary
                }}
              >
                {title}
              </div>
              <div style={{marginTop: 14, fontSize: 22, lineHeight: 1.45, color: "rgba(238,248,255,0.78)"}}>
                {body}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (scene.mode === "finale") {
    const bullets = [
      "Response board and 72-hour timeline",
      "Shared brief, checklist, and outreach plan",
      "Static, local-first architecture"
    ];

    return (
      <div
        style={{
          ...commonPanel,
          background: "rgba(8,30,43,0.9)",
          padding: 24,
          display: "grid",
          gap: 20
        }}
      >
        <div
          style={{
            position: "relative",
            minHeight: 520,
            borderRadius: 28,
            overflow: "hidden"
          }}
        >
          <Img
            src={staticFile(scene.asset!)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${1.05 - settle * 0.05})`
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(4,17,26,0.12) 0%, rgba(4,17,26,0.76) 100%)"
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 24,
              right: 24,
              bottom: 24,
              display: "grid",
              gap: 12
            }}
          >
            <div style={{fontSize: 22, color: "rgba(255,255,255,0.78)", fontWeight: 700}}>
              AI For Good product demo
            </div>
            <div
              style={{
                fontFamily: displayFamily,
                fontSize: 46,
                lineHeight: 0.98,
                fontWeight: 800
              }}
            >
              Built for responders who need shared action, not more messy tabs.
            </div>
          </div>
        </div>
        <div style={{display: "grid", gap: 14}}>
          {bullets.map((line, index) => (
            <div
              key={line}
              style={{
                padding: "18px 20px",
                borderRadius: 18,
                background: "rgba(255,255,255,0.06)",
                transform: `translateY(${interpolate(frame, [index * 8, index * 8 + 14], [20, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp"
                })}px)`
              }}
            >
              <div style={{fontSize: 24, lineHeight: 1.4, fontWeight: 700}}>{line}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...commonPanel,
        minHeight: 820,
        background: "rgba(7,27,40,0.92)"
      }}
    >
      <Img
        src={staticFile(scene.asset!)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: scene.slug === "board" ? "cover" : "contain",
          objectPosition: scene.slug === "board" ? "center" : "center",
          transform:
            scene.slug === "board"
              ? `scale(${1.05 - settle * 0.03})`
              : `scale(${1.02 - settle * 0.02})`,
          filter: "saturate(1.04) contrast(1.02)"
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(4,17,26,0.04), rgba(4,17,26,0.24))"
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 22,
          bottom: 22,
          display: "grid",
          gap: 12
        }}
      >
        {scene.bullets.map((line, index) => (
          <CalloutChip key={line} line={line} index={index} accent={scene.accent.secondary} />
        ))}
      </div>
    </div>
  );
};

const CalloutChip: React.FC<{line: string; index: number; accent: string}> = ({line, index, accent}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [index * 10, index * 10 + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${interpolate(frame, [index * 10, index * 10 + 18], [20, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp"
        })}px)`,
        padding: "16px 18px",
        borderRadius: 18,
        background: "rgba(255,255,255,0.84)",
        color: "#10202b",
        fontSize: 20,
        fontWeight: 800,
        boxShadow: "0 16px 30px rgba(0,0,0,0.18)",
        borderLeft: `5px solid ${accent}`
      }}
    >
      {line}
    </div>
  );
};

export const ReliefSignalDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = progressForFrame(frame);
  const currentScene =
    sceneOffsets.find((scene) => frame >= scene.from && frame < scene.from + scene.durationInFrames) ??
    sceneOffsets[sceneOffsets.length - 1];

  return (
    <AbsoluteFill style={shellStyle}>
      <Audio src={staticFile("remotion/narration.mp3")} volume={0.95} />

      {sceneOffsets.map((scene, index) => (
        <Sequence key={scene.slug} from={scene.from} durationInFrames={scene.durationInFrames}>
          <SceneChrome scene={scene} index={index} />
        </Sequence>
      ))}

      <AbsoluteFill
        style={{
          pointerEvents: "none",
          justifyContent: "space-between",
          padding: "26px 38px"
        }}
      >
        <div
          style={{
            height: 8,
            width: "100%",
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.1)",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg, #ff6a3d 0%, #68f0e0 100%)"
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: "auto",
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(238,248,255,0.64)"
          }}
        >
          <div>{currentScene.eyebrow}</div>
          <div>ReliefSignal product walkthrough</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
