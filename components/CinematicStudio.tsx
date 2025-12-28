"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CinematicCanvas from "@/components/CinematicCanvas";
import {
  aspectRatios,
  cameraMotions,
  defaultSettings,
  getCameraMotion,
  getMood,
  getResolution,
  moods,
  resolutionPresets,
  type CinematicSettings
} from "@/lib/cinematicPresets";

type ShotPlan = {
  title: string;
  description: string;
  duration: number;
};

const CinematicStudio = () => {
  const [settings, setSettings] = useState<CinematicSettings>(defaultSettings);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const progressIntervalRef = useRef<number>();

  const mood = getMood(settings.moodId);
  const resolution = getResolution(settings.resolutionPresetId, settings.aspectRatio);
  const motion = getCameraMotion(settings.cameraMotionId);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const handleSettingChange = useCallback(
    <K extends keyof CinematicSettings>(key: K, value: CinematicSettings[K]) => {
      setSettings((prev) => ({
        ...prev,
        [key]: value
      }));
    },
    []
  );

  const shotPlan = useMemo(() => buildShotPlan(settings), [settings]);

  const handleGenerate = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setError("Canvas introuvable pour l’enregistrement.");
      return;
    }

    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
      setError(
        "MediaRecorder n’est pas disponible dans ce navigateur. Essayez Chrome ou Edge version récente."
      );
      return;
    }

    try {
      setError(null);
      setIsGenerating(true);
      setProgress(0);

      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
      }

      const stream = canvas.captureStream(settings.frameRate);
      if (!stream) {
        throw new Error("Impossible de capturer le flux vidéo depuis le canvas.");
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: Math.max(2_500_000, Math.round(6_000_000 * settings.bloom))
      });
      mediaRecorderRef.current = recorder;

      const blobs: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          blobs.push(event.data);
        }
      };

      const stopPromise = new Promise<string>((resolve, reject) => {
        recorder.onstop = () => {
          const blob = new Blob(blobs, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          resolve(url);
        };
        recorder.onerror = (event) => {
          const recorderError = (event as { error?: DOMException }).error;
          reject(recorderError ?? new Error("Erreur inconnue pendant l’enregistrement."));
        };
      });

      recorder.start();

      const totalDuration = settings.duration * 1000;
      const startTime = performance.now();

      progressIntervalRef.current = window.setInterval(() => {
        const elapsed = performance.now() - startTime;
        setProgress(Math.min(100, (elapsed / totalDuration) * 100));
      }, 120);

      await new Promise<void>((resolve) => {
        window.setTimeout(() => {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
          resolve();
        }, totalDuration);
      });

      const url = await stopPromise;
      setVideoUrl(url);
      setProgress(100);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur inattendue est survenue pendant la génération."
      );
    } finally {
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      setIsGenerating(false);
    }
  }, [settings, videoUrl]);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)]">
      <div className="relative rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/60 via-slate-900/30 to-black p-4 shadow-[0_25px_80px_-35px_rgba(229,9,20,0.45)] lg:p-6">
        <div className="relative overflow-hidden rounded-[24px] bg-black ring-1 ring-white/5">
          <CinematicCanvas ref={canvasRef} settings={settings} />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/35" />

          <div className="absolute left-0 top-0 w-full p-5">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/70">
              <span>Sequencer</span>
              <span>
                {resolution.width} × {resolution.height} · {settings.frameRate} fps
              </span>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-black/55 p-4 backdrop-blur-lg">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Mood</p>
                <p className="text-sm font-semibold text-white sm:text-base">{mood.name}</p>
                <p className="text-xs text-slate-400 sm:text-sm">{mood.description}</p>
              </div>

              <div className="hidden h-10 w-px bg-white/10 lg:block" />

              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Caméra</p>
                <p className="text-sm font-semibold text-white sm:text-base">{motion.name}</p>
                <p className="text-xs text-slate-400 sm:text-sm">{motion.description}</p>
              </div>

              <div className="hidden h-10 w-px bg-white/10 lg:block" />

              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Progression</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-8">
        <section className="rounded-[24px] border border-white/10 bg-slate-950/60 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white sm:text-xl">
            Configuration artistique
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Ajustez la palette, le mouvement et les effets pour façonner votre séquence.
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <label className="text-xs uppercase tracking-[0.35em] text-slate-400">
                palette
              </label>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {moods.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => handleSettingChange("moodId", candidate.id)}
                    className={`flex items-center justify-between rounded-2xl border p-3 text-left transition hover:border-white/30 hover:bg-white/5 ${
                      settings.moodId === candidate.id
                        ? "border-primary/80 bg-primary/10 shadow-glow"
                        : "border-white/5"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{candidate.name}</p>
                      <p className="text-xs text-slate-400">{candidate.description}</p>
                    </div>
                    <div className="ml-4 flex shrink-0 overflow-hidden rounded-xl">
                      {candidate.palette.map((color) => (
                        <span
                          key={color}
                          className="h-10 w-4"
                          style={{ background: color }}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <RangeField
                label="Durée"
                unit="s"
                min={3}
                max={14}
                step={0.5}
                value={settings.duration}
                onChange={(value) => handleSettingChange("duration", value)}
              />
              <RangeField
                label="Frame rate"
                unit="fps"
                min={12}
                max={60}
                step={1}
                value={settings.frameRate}
                onChange={(value) => handleSettingChange("frameRate", Math.round(value))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Résolution"
                options={resolutionPresets.map((preset) => ({
                  label: preset.label,
                  value: preset.id
                }))}
                value={settings.resolutionPresetId}
                onChange={(value) =>
                  handleSettingChange("resolutionPresetId", value as CinematicSettings["resolutionPresetId"])
                }
              />
              <SelectField
                label="Ratio"
                options={aspectRatios.map((ratio) => ({
                  label: ratio.label,
                  value: ratio.value.toString()
                }))}
                value={settings.aspectRatio.toString()}
                onChange={(value) =>
                  handleSettingChange("aspectRatio", parseFloat(value))
                }
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.35em] text-slate-400">caméra</label>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {cameraMotions.map((camera) => (
                  <button
                    key={camera.id}
                    type="button"
                    onClick={() => handleSettingChange("cameraMotionId", camera.id)}
                    className={`rounded-2xl border p-3 text-left transition hover:border-white/30 hover:bg-white/5 ${
                      settings.cameraMotionId === camera.id
                        ? "border-accent/70 bg-accent/10 shadow-glow"
                        : "border-white/5"
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">{camera.name}</p>
                    <p className="text-xs text-slate-400">{camera.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <RangeField
                label="Bloom"
                min={0}
                max={1}
                step={0.05}
                value={settings.bloom}
                onChange={(value) => handleSettingChange("bloom", value)}
              />
              <RangeField
                label="Grain analogique"
                min={0}
                max={1}
                step={0.05}
                value={settings.grain}
                onChange={(value) => handleSettingChange("grain", value)}
              />
              <RangeField
                label="Parallaxe"
                min={0}
                max={1}
                step={0.05}
                value={settings.parallax}
                onChange={(value) => handleSettingChange("parallax", value)}
              />
              <RangeField
                label="Chroma shift"
                min={0}
                max={0.6}
                step={0.02}
                value={settings.chromaShift}
                onChange={(value) => handleSettingChange("chromaShift", value)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
          <h3 className="text-lg font-semibold text-white">Timeline générée</h3>
          <div className="mt-4 space-y-4">
            {shotPlan.map((shot, index) => (
              <div
                key={shot.title}
                className="flex items-start gap-4 rounded-2xl border border-white/5 bg-black/40 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{shot.title}</p>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                      {shot.duration.toFixed(1)} s
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400 sm:text-sm">{shot.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
          <h3 className="text-lg font-semibold text-white">Export vidéo</h3>
          <p className="mt-1 text-sm text-slate-400">
            Lancez l’enregistrement en WebM (VP9). La capture se fait en direct, pensez à garder
            l’onglet actif.
          </p>

          <div className="mt-4 flex flex-col gap-4">
            {error && (
              <p className="rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-primary/50"
            >
              {isGenerating ? "Génération en cours…" : "Générer la séquence"}
            </button>

            {videoUrl && (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded-xl border border-white/5"
                  preload="metadata"
                />
                <a
                  href={videoUrl}
                  download="sequence-cinematique.webm"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-white/40 hover:text-white"
                >
                  Télécharger WebM
                </a>
              </div>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
};

export default CinematicStudio;

type RangeFieldProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
};

const RangeField = ({ label, min, max, step, value, unit, onChange }: RangeFieldProps) => {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
        <span>{label}</span>
        <span className="text-white">
          {value.toFixed(2).replace(/\.00$/, "")}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(parseFloat(event.target.value))}
        className="mt-2 h-2 w-full appearance-none rounded-full bg-white/10 accent-primary"
      />
    </label>
  );
};

type SelectFieldProps = {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
};

const SelectField = ({ label, options, value, onChange }: SelectFieldProps) => {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</span>
      <div className="mt-2">
        <select
          className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white focus:border-primary/60 focus:outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
};

const buildShotPlan = (settings: CinematicSettings): ShotPlan[] => {
  const segments = 3;
  const segmentDuration = settings.duration / segments;
  const mood = getMood(settings.moodId);
  const motion = getCameraMotion(settings.cameraMotionId);

  return [
    {
      title: "Plan d’ouverture · establishing",
      description: `Halo ${mood.name.toLowerCase()} avec mouvement ${motion.name.toLowerCase()} qui révèle progressivement les volumes.`,
      duration: segmentDuration * 1.1
    },
    {
      title: "Plan médian · montée en tension",
      description:
        "Lignes de perspective amplifiées, oscillation des couches parallaxe et intensification du flare principal.",
      duration: segmentDuration * 0.9
    },
    {
      title: "Plan final · apogée",
      description:
        "Pulse chromatique soutenu, grain accentué et ralentissement progressif pour préparer un cut vers le noir.",
      duration: segmentDuration * 1.2
    }
  ];
};
