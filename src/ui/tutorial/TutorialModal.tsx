import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  FolderTree,
  Globe,
  GripVertical,
  Moon,
  MoreVertical,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Star,
  Sun,
  Table2,
  X,
} from "lucide-react";
import { useT, type TranslateFn } from "../../i18n";
import {
  btnPrimary,
  btnSecondary,
  modalHeader,
  modalPanel,
} from "../components/uiStyles";

export const TUTORIAL_SEEN_KEY = "gdr.tutorialSeen";

const LAST_INDEX = 8;

function markSeen(): void {
  try {
    window.localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
  } catch {
    // Sin localStorage el tutorial simplemente se volverá a mostrar.
  }
}

function Bar({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`block h-1.5 rounded-full bg-zinc-700 ${className}`} />  );
}

function SkeletonPane() {
  return (
    <div aria-hidden className="flex min-w-0 flex-1 flex-col gap-2 p-3">
      <Bar className="w-1/2 bg-zinc-600" />
      <Bar className="w-2/3" />
      <Bar className="w-1/3" />
      <Bar className="w-1/2" />
    </div>
  );
}

function TreeRow({
  depth,
  icon: Icon,
  label,
  active = false,
  chevron = false,
}: {
  depth: number;
  icon: typeof Folder;
  label: string;
  active?: boolean;
  chevron?: boolean;
}) {
  return (
    <div
      style={{ paddingLeft: depth * 10 }}
      className={`flex items-center gap-1 rounded-md py-[3px] pr-1 text-[9px] ${
        active ? "bg-sky-500/15 text-sky-200 ring-2 ring-sky-400" : "text-zinc-300"
      }`}
    >
      {chevron ? (
        <ChevronRight className="h-2.5 w-2.5 shrink-0 rotate-90 text-zinc-500" />
      ) : null}
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-zinc-800 bg-sky-500/10 text-sky-300">
        <Icon className="h-2.5 w-2.5" />
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function StepCard({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex w-24 flex-col items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-sky-500/10 text-sky-300">
        {icon}
      </span>
      <span className="text-[10px] font-medium text-zinc-300">{label}</span>
    </div>
  );
}

function WelcomeVisual({ t }: { t: TranslateFn }) {
  return (
    <div className="flex h-52 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <StepCard icon={<Folder className="h-4 w-4" />} label={t("tutorial.s1PasoSecciones")} />
      <ArrowRight className="h-4 w-4 shrink-0 text-sky-400" />
      <StepCard icon={<FileText className="h-4 w-4" />} label={t("tutorial.s1PasoPlantillas")} />
      <ArrowRight className="h-4 w-4 shrink-0 text-sky-400" />
      <StepCard icon={<Table2 className="h-4 w-4" />} label={t("tutorial.s1PasoRegistros")} />
    </div>
  );
}

function DrawerVisual() {
  return (
    <div className="flex h-52 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      <aside className="flex w-44 shrink-0 flex-col gap-1 border-r border-zinc-800 bg-zinc-900/60 p-2">
        <div className="mb-1 flex items-center gap-1.5 px-1">
          <span className="h-3.5 w-3.5 rounded border border-zinc-800 bg-sky-500/10" />
          <span className="text-[8px] font-semibold uppercase tracking-widest text-zinc-600">
            GDR
          </span>
        </div>
        <TreeRow depth={0} icon={Folder} label="Proyectos" chevron />
        <TreeRow depth={1} icon={Folder} label="Clientes" chevron />
        <TreeRow depth={2} icon={FileText} label="Contactos" active />
        <TreeRow depth={1} icon={FileText} label="Facturas" />
        <TreeRow depth={0} icon={Folder} label="Colección" chevron />
      </aside>
      <SkeletonPane />
    </div>
  );
}

function TypesVisual({ t }: { t: TranslateFn }) {
  return (
    <div className="grid h-52 grid-cols-2 gap-3">
      <div className="flex flex-col gap-1.5 rounded-lg border border-sky-500/40 bg-zinc-900 p-3">
        <div className="flex items-center gap-1.5">
          <FolderTree className="h-4 w-4 shrink-0 text-sky-300" />
          <p className="text-xs font-semibold text-zinc-100">{t("tutorial.s3Jerarquica")}</p>
        </div>
        <p className="text-[10px] leading-snug text-zinc-500">{t("tutorial.s3JerarquicaDesc")}</p>
        <div className="mt-auto flex flex-col gap-1 rounded-md border border-zinc-800 bg-zinc-950 p-1.5">
          <TreeRow depth={0} icon={Folder} label="Proyectos" chevron />
          <TreeRow depth={1} icon={FileText} label="Tareas" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-lg border border-sky-500/40 bg-zinc-900 p-3">
        <div className="flex items-center gap-1.5">
          <Table2 className="h-4 w-4 shrink-0 text-sky-300" />
          <p className="text-xs font-semibold text-zinc-100">{t("tutorial.s3Plana")}</p>
        </div>
        <p className="text-[10px] leading-snug text-zinc-500">{t("tutorial.s3PlanaDesc")}</p>
        <div className="mt-auto overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 p-1.5">
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1.5 px-1">
            <Bar className="w-3/4 bg-zinc-600" />
            <span aria-hidden className="h-1.5 w-6 rounded-full bg-zinc-700" />
            <Bar className="w-1/2" />
            <span aria-hidden className="h-1.5 w-6 rounded-full bg-zinc-700" />
            <Bar className="w-2/3" />
            <span aria-hidden className="h-1.5 w-6 rounded-full bg-zinc-700" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateVisual({ t }: { t: TranslateFn }) {
  const iconBox = (selected: boolean, icon: ReactNode) => (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded border ${
        selected
          ? "border-sky-400 bg-sky-500/15 text-sky-300 ring-2 ring-sky-400"
          : "border-zinc-700 bg-zinc-950 text-zinc-500"
      }`}
    >
      {icon}
    </span>
  );
  return (
    <div className="relative flex h-52 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <span className="flex w-fit items-center gap-1 rounded-md bg-sky-600 px-2 py-1 text-[10px] font-semibold text-white ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-950">
        <Plus className="h-3 w-3" />
        {t("secciones.nueva")}
      </span>
      <div className="mx-auto mt-3 w-64 rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-2xl">
        <p className="text-[10px] font-semibold text-zinc-100">{t("secciones.nueva")}</p>
        <p className="mt-1.5 text-[8px] uppercase tracking-wide text-zinc-500">
          {t("comun.nombre")}
        </p>
        <div className="mt-0.5 h-4 rounded border border-sky-400 bg-zinc-950" />
        <p className="mt-1.5 text-[8px] uppercase tracking-wide text-zinc-500">
          {t("comun.descripcion")}
        </p>
        <div className="mt-0.5 h-4 rounded border border-zinc-700 bg-zinc-950" />
        <p className="mt-1.5 truncate text-[8px] uppercase tracking-wide text-zinc-500">
          {t("secciones.icono")}
        </p>
        <div className="mt-1 flex gap-1.5">
          {iconBox(true, <Folder className="h-3 w-3" />)}
          {iconBox(false, <FileText className="h-3 w-3" />)}
          {iconBox(false, <Star className="h-3 w-3" />)}
          {iconBox(false, <Search className="h-3 w-3" />)}
        </div>
        <div className="mt-2 flex justify-end gap-1.5">
          <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[8px] font-medium text-zinc-400">
            {t("comun.cancelar")}
          </span>
          <span className="rounded bg-sky-600 px-1.5 py-0.5 text-[8px] font-semibold text-white">
            {t("comun.guardar")}
          </span>
        </div>
      </div>
    </div>
  );
}

function TemplateVisual({ t }: { t: TranslateFn }) {
  function fieldRow(label: string, badge: string, active = false): ReactNode {
    return (
      <div
        key={label}
        className={`flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300 ${
          active ? "border-transparent ring-2 ring-sky-400" : ""
        }`}
      >
        <GripVertical className="h-3 w-3 shrink-0 text-zinc-600" />
        <span className="truncate">{label}</span>
        <span className="ml-auto shrink-0 rounded bg-sky-500/15 px-1 py-px text-[8px] font-medium text-sky-300">
          {badge}
        </span>
      </div>
    );
  }
  return (
    <div className="flex h-52 flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      {fieldRow("Título", t("campos.tipos.texto"))}
      {fieldRow("Estado", t("campos.tipos.seleccion"), true)}
      {fieldRow("Notas", t("campos.tipos.textoLargo"))}
      <span className="mt-auto flex w-fit items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-300 ring-2 ring-sky-400">
        <Plus className="h-3 w-3" />
        {t("plantilla.anadirCampo")}
      </span>
    </div>
  );
}

function RecordsVisual({ t }: { t: TranslateFn }) {
  function row(highlight: boolean, width: string, date: string): ReactNode {
    return (
      <div
        className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 border-t border-zinc-800 px-2 py-1.5 ${
          highlight ? "bg-sky-500/10 ring-2 ring-inset ring-sky-400" : ""
        }`}
      >
        <Bar className={width} />
        <span className="rounded bg-zinc-800 px-1 py-px text-[8px] tabular-nums text-zinc-500">
          {date}
        </span>
        <MoreVertical
          className={`h-3 w-3 ${highlight ? "text-sky-300" : "text-zinc-600"}`}
        />
      </div>
    );
  }
  return (
    <div className="flex h-52 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 text-[10px]">
      <div className="flex items-center justify-between border-b border-zinc-800 px-2 py-1.5">
        <Bar className="w-24 bg-zinc-600" />
        <span className="flex items-center gap-1 rounded bg-sky-600 px-1.5 py-0.5 text-[8px] font-semibold text-white">
          <Plus className="h-2.5 w-2.5" />
          {t("registros.nuevo")}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-2 py-1 text-[8px] uppercase tracking-wide text-zinc-600">
        <span>{t("comun.nombre")}</span>
        <span>{t("registros.creado")}</span>
        <span>{t("comun.acciones")}</span>
      </div>
      {row(false, "w-3/4", "12/08")}
      {row(true, "w-1/2", "20/08")}
      {row(false, "w-2/3", "25/08")}
    </div>
  );
}

function SearchVisual({ t }: { t: TranslateFn }) {
  return (
    <div className="flex h-52 items-start justify-center rounded-lg border border-zinc-800 bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2 text-[10px]">
          <Search className="h-3 w-3 shrink-0 text-zinc-500" />
          <span className="text-zinc-100">proyecto</span>
          <span aria-hidden className="h-3 w-px animate-pulse bg-sky-400" />
          <kbd className="ml-auto rounded border border-zinc-700 bg-zinc-950 px-1 text-[8px] uppercase text-zinc-500">
            Ctrl F
          </kbd>
        </div>
        <div className="flex gap-1.5 border-b border-zinc-800 px-3 py-1.5">
          <span className="flex-1 truncate rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-[8px] text-zinc-400">
            {t("busqueda.todasLasSecciones")}
          </span>
          <span className="flex-1 truncate rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-[8px] text-zinc-400">
            {t("busqueda.todosLosFormularios")}
          </span>
        </div>
        <div className="p-1.5">
          <p className="px-1.5 pb-1 text-[8px] uppercase tracking-wide text-zinc-600">
            Proyectos / Tareas
          </p>
          <div className="flex items-center gap-1.5 rounded-md bg-sky-500/15 px-1.5 py-1 ring-2 ring-sky-400">
            <FileText className="h-3 w-3 shrink-0 text-sky-300" />
            <span className="text-[10px] text-sky-100">
              proyecto <span className="bg-sky-500/30">alpha</span>
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 rounded-md px-1.5 py-1">
            <FileText className="h-3 w-3 shrink-0 text-zinc-600" />
            <Bar className="w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrashVisual({ t }: { t: TranslateFn }) {
  return (
    <div className="grid h-52 grid-cols-2 gap-3">
      <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
        <p className="text-[8px] font-semibold uppercase tracking-wide text-zinc-600">
          {t("comun.deshabilitar")}
        </p>
        <div className="flex items-center gap-1.5 rounded-md px-1 py-1 text-[10px] text-zinc-500 opacity-70">
          <Ban className="h-3 w-3 shrink-0" />
          <span>Colección</span>
          <span className="ml-auto rounded bg-zinc-800 px-1 text-[8px] uppercase tracking-wide text-zinc-500">
            {t("comun.off")}
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md px-1 py-1 text-[10px] text-zinc-300">
          <Ban className="h-3 w-3 shrink-0 text-zinc-600" />
          <span>Herramientas</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-lg border border-sky-500/40 bg-zinc-950 p-3">
        <p className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wide text-zinc-600">
          <RotateCcw className="h-2.5 w-2.5" />
          {t("papelera.boton")}
        </p>
        {["Ideas viejas", "Plantilla borrada"].map((name) => (
          <div
            key={name}
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-1.5 py-1 text-[10px]"
          >
            <span className="truncate text-zinc-500 line-through">{name}</span>
            <RotateCcw className="ml-auto h-3 w-3 shrink-0 text-sky-300" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsVisual({ t }: { t: TranslateFn }) {
  return (
    <div className="flex h-52 flex-col rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex justify-end">
        <span className="rounded-md p-1.5 text-zinc-200 ring-2 ring-sky-400">
          <Settings className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mx-auto mt-2 flex w-64 flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 shadow-2xl">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1 rounded-md border border-sky-500/60 bg-sky-500/10 p-1.5">
            <span className="flex items-center gap-1 text-[9px] font-medium text-zinc-200">
              <Moon className="h-3 w-3" />
              {t("ajustes.temaOscuro")}
            </span>
            <span
              aria-hidden
              className="block h-8 rounded border border-zinc-700"
              style={{ backgroundColor: "#09090b" }}
            />
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-zinc-700 p-1.5">
            <span className="flex items-center gap-1 text-[9px] font-medium text-zinc-200">
              <Sun className="h-3 w-3" />
              {t("ajustes.temaClaro")}
            </span>
            <span
              aria-hidden
              className="block h-8 rounded border border-zinc-400"
              style={{ backgroundColor: "#f4f4f5" }}
            />
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-200">
          <Globe className="h-3 w-3 shrink-0 text-zinc-500" />
          {t("ajustes.espanol")}
          <ChevronDown className="ml-auto h-3 w-3 text-zinc-500" />
        </span>
      </div>
    </div>
  );
}

/**
 * Tutorial de entrada estilo presentación: 9 diapositivas con mockups CSS de la
 * interfaz. Navegable con flechas y Esc; cerrarlo marca gdr.tutorialSeen.
 */
export function TutorialModal({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [index, setIndex] = useState(0);

  const finishAndClose = useCallback(() => {
    markSeen();
    onClose();
  }, [onClose]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        finishAndClose();
      } else if (event.key === "ArrowRight") {
        setIndex((previous) => Math.min(previous + 1, LAST_INDEX));
      } else if (event.key === "ArrowLeft") {
        setIndex((previous) => Math.max(previous - 1, 0));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [finishAndClose]);

  const slides: ReadonlyArray<{ titulo: string; desc: string; visual: ReactNode }> = [
    {
      titulo: t("tutorial.s1Titulo"),
      desc: t("tutorial.s1Desc"),
      visual: <WelcomeVisual t={t} />,
    },
    {
      titulo: t("tutorial.s2Titulo"),
      desc: t("tutorial.s2Desc"),
      visual: <DrawerVisual />,
    },
    {
      titulo: t("tutorial.s3Titulo"),
      desc: t("tutorial.s3Desc"),
      visual: <TypesVisual t={t} />,
    },
    {
      titulo: t("tutorial.s4Titulo"),
      desc: t("tutorial.s4Desc"),
      visual: <CreateVisual t={t} />,
    },
    {
      titulo: t("tutorial.s5Titulo"),
      desc: t("tutorial.s5Desc"),
      visual: <TemplateVisual t={t} />,
    },
    {
      titulo: t("tutorial.s6Titulo"),
      desc: t("tutorial.s6Desc"),
      visual: <RecordsVisual t={t} />,
    },
    {
      titulo: t("tutorial.s7Titulo"),
      desc: t("tutorial.s7Desc"),
      visual: <SearchVisual t={t} />,
    },
    {
      titulo: t("tutorial.s8Titulo"),
      desc: t("tutorial.s8Desc"),
      visual: <TrashVisual t={t} />,
    },
    {
      titulo: t("tutorial.s9Titulo"),
      desc: t("tutorial.s9Desc"),
      visual: <SettingsVisual t={t} />,
    },
  ];

  const slide = slides[index];
  const isLast = index === LAST_INDEX;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("tutorial.titulo")}
        className={`${modalPanel} max-w-3xl`}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className={modalHeader}>
          <h2 className="text-sm font-semibold text-zinc-100">{t("tutorial.titulo")}</h2>
          <button
            type="button"
            title={t("tutorial.cerrar")}
            aria-label={t("tutorial.cerrar")}
            className="rounded-md p-1 text-zinc-400 transition-colors duration-150 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={finishAndClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-[22rem] flex-col gap-3 overflow-y-auto px-6 py-5">
          <h3 className="text-lg font-semibold text-zinc-100">{slide.titulo}</h3>
          <p className="text-sm leading-relaxed text-zinc-400">{slide.desc}</p>
          {slide.visual}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-800 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {slides.map((entry, dot) => (
                <button
                  key={entry.titulo}
                  type="button"
                  aria-label={t("tutorial.progreso", { a: dot + 1, b: slides.length })}
                  className={`h-1.5 rounded-full transition-colors duration-150 ${
                    dot === index ? "w-4 bg-sky-400" : "w-1.5 bg-zinc-700 hover:bg-zinc-600"
                  }`}
                  onClick={() => {
                    setIndex(dot);
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] tabular-nums text-zinc-500">
              {t("tutorial.progreso", { a: index + 1, b: slides.length })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={btnSecondary}
              disabled={index === 0}
              onClick={() => {
                setIndex((previous) => Math.max(previous - 1, 0));
              }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t("tutorial.anterior")}
            </button>
            <button
              type="button"
              autoFocus
              className={btnPrimary}
              onClick={() => {
                if (isLast) {
                  finishAndClose();
                } else {
                  setIndex((previous) => Math.min(previous + 1, LAST_INDEX));
                }
              }}
            >
              {isLast ? (
                t("tutorial.empezar")
              ) : (
                <>
                  {t("tutorial.siguiente")}
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
