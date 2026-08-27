import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Ban,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  FolderTree,
  Globe,
  GripVertical,
  ListFilter,
  Moon,
  MoreVertical,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Star,
  Sun,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { useT, type TranslateFn } from "../../i18n";
import { btnPrimary, btnSecondary, modalHeader, modalPanel } from "../components/uiStyles";

export const TUTORIAL_SEEN_KEY = "gdr.tutorialSeen";
const LAST_INDEX = 9;

function markSeen(): void {
  try {
    window.localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
  } catch (_e) {
    void _e;
  }
}

function Bar({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`block h-1.5 rounded-full bg-zinc-700 ${className}`} />;
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
      style={{ paddingLeft: 6 + depth * 12 }}
      className={`flex items-center gap-1 rounded-md py-1 pr-1 text-[9px] ${active ? "bg-sky-500/15 text-sky-200 ring-2 ring-sky-400" : "text-zinc-300"}`}
    >
      {chevron ? <ChevronRight className="h-2.5 w-2.5 shrink-0 rotate-90 text-zinc-500" /> : <span className="w-3 shrink-0" />}
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-sky-500/10 text-sky-300">
        <Icon className="h-2.5 w-2.5" />
      </span>
      <span className="truncate">{label}</span>
      {active ? <span className="ml-auto shrink-0 rounded bg-zinc-800 px-1 py-px text-[7px] tabular-nums text-zinc-500">2</span> : null}
      {active ? <span className="shrink-0 rounded bg-zinc-800 px-1 py-px text-[7px] tabular-nums text-zinc-500">1</span> : null}
    </div>
  );
}

function WelcomeCard({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex w-24 flex-col items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">{icon}</span>
      <span className="text-[10px] font-medium text-zinc-300">{label}</span>
    </div>
  );
}

function WelcomeVisual({ t }: { t: TranslateFn }) {
  return (
    <div className="flex h-56 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <WelcomeCard icon={<Folder className="h-5 w-5" />} label={t("tutorial.s1PasoSecciones")} />
      <ArrowRight className="h-4 w-4 shrink-0 text-sky-400" />
      <WelcomeCard icon={<FileText className="h-5 w-5" />} label={t("tutorial.s1PasoPlantillas")} />
      <ArrowRight className="h-4 w-4 shrink-0 text-sky-400" />
      <WelcomeCard icon={<Table2 className="h-5 w-5" />} label={t("tutorial.s1PasoRegistros")} />
    </div>
  );
}

function DrawerVisual() {
  return (
    <div className="flex h-56 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      <aside className="flex w-48 shrink-0 flex-col gap-1 border-r border-zinc-800 bg-zinc-900/60 p-2">
        <div className="mb-1 flex items-center gap-1.5 px-1">
          <span className="h-5 w-5 rounded-md border border-zinc-800 bg-sky-500/10" />
          <span className="text-[8px] font-semibold uppercase tracking-widest text-zinc-600">GDR</span>
        </div>
        <span className="mb-1 inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-2 py-1 text-[9px] font-semibold text-white ring-2 ring-sky-400">
          <Plus className="h-3 w-3" />
          + Nueva sección
        </span>
        <div className="flex flex-col gap-0.5">
          <TreeRow depth={0} icon={Folder} label="Proyectos" chevron />
          <TreeRow depth={1} icon={Folder} label="Clientes" chevron />
          <TreeRow depth={2} icon={FileText} label="Contactos" active />
          <div style={{ paddingLeft: 18 + 2 * 12 }} className="flex items-center gap-1 py-0.5 text-[8px] text-zinc-500">
            <span className="flex h-3 w-3 items-center justify-center rounded text-zinc-600">
              <FileText className="h-2.5 w-2.5" />
            </span>
            <span className="truncate">Tareas</span>
          </div>
          <TreeRow depth={1} icon={FileText} label="Facturas" />
          <div className="flex items-center gap-1 rounded-md py-1 pr-1 text-[9px] opacity-50" style={{ paddingLeft: 6 }}>
            <span className="w-3 shrink-0" />
            <span className="flex h-5 w-5 items-center justify-center rounded-md border border-zinc-800 bg-sky-500/10 text-sky-300">
              <Folder className="h-2.5 w-2.5" />
            </span>
            <span className="truncate">Colección</span>
            <span className="ml-auto rounded bg-zinc-800 px-1 py-px text-[7px] uppercase tracking-wide text-zinc-500">Off</span>
            <span className="flex items-center rounded bg-zinc-800 p-px text-zinc-500">
              <Ban className="h-2 w-2" />
            </span>
          </div>
        </div>
        <div className="mt-auto flex items-center gap-2 border-t border-zinc-800 px-1 pt-2 text-[9px] text-zinc-500">
          <Trash2 className="h-3 w-3" /> Papelera
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <Bar className="w-1/2 bg-zinc-600" />
        <Bar className="w-2/3" />
        <Bar className="w-1/3" />
        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-2">
              <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                <Folder className="h-3.5 w-3.5" />
              </span>
              <Bar className="mx-auto mt-1.5 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TypesVisual({ t }: { t: TranslateFn }) {
  return (
    <div className="grid h-56 grid-cols-2 gap-3">
      <div className="flex flex-col gap-1.5 rounded-lg border border-sky-500/40 bg-zinc-900 p-3">
        <div className="flex items-center gap-1.5">
          <FolderTree className="h-4 w-4 shrink-0 text-sky-300" />
          <p className="text-xs font-semibold text-zinc-100">{t("tutorial.s3Jerarquica")}</p>
        </div>
        <p className="text-[10px] leading-snug text-zinc-500">{t("tutorial.s3JerarquicaDesc")}</p>
        <div className="mt-auto flex flex-col gap-1 rounded-md border border-zinc-800 bg-zinc-950 p-1.5">
          <TreeRow depth={0} icon={Folder} label="Proyectos" chevron />
          <div className="flex items-center gap-1 pl-3 text-[8px] text-zinc-500">
            <span className="rounded bg-zinc-800 px-1 py-px text-[7px]">2</span> subsecciones
            <span className="rounded bg-zinc-800 px-1 py-px text-[7px]">1</span> formularios
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-lg border border-sky-500/40 bg-zinc-900 p-3">
        <div className="flex items-center gap-1.5">
          <Table2 className="h-4 w-4 shrink-0 text-sky-300" />
          <p className="text-xs font-semibold text-zinc-100">{t("tutorial.s3Plana")}</p>
        </div>
        <p className="text-[10px] leading-snug text-zinc-500">{t("tutorial.s3PlanaDesc")}</p>
        <div className="mt-auto overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-2 py-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
              <Table2 className="h-3 w-3" />
            </span>
            <span className="h-1.5 w-16 rounded-full bg-zinc-700" />
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-2 py-1 text-[7px] font-semibold uppercase tracking-wide text-zinc-500">
            <span>{t("comun.nombre")}</span>
            <span>{t("registros.creado")}</span>
            <span>{t("comun.acciones")}</span>
          </div>
          <div className="divide-y divide-zinc-800/70">
            <div className="grid grid-cols-[1fr_auto_auto] items-center px-2 py-1">
              <Bar className="w-12" />
              <span className="text-[7px] text-zinc-600">12/08</span>
              <MoreVertical className="h-2.5 w-2.5 text-zinc-600" />
            </div>
            <div className="grid grid-cols-[1fr_auto_auto] items-center px-2 py-1">
              <Bar className="w-10" />
              <span className="text-[7px] text-zinc-600">20/08</span>
              <MoreVertical className="h-2.5 w-2.5 text-zinc-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateVisual({ t }: { t: TranslateFn }) {
  const iconBox = (selected: boolean, icon: ReactNode) => (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded border ${selected ? "border-sky-400 bg-sky-500/15 text-sky-300 ring-2 ring-sky-400" : "border-zinc-700 bg-zinc-950 text-zinc-500"}`}
    >
      {icon}
    </span>
  );
  return (
    <div className="relative flex h-56 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <span className="flex w-fit items-center gap-1 rounded-md bg-sky-600 px-2 py-1 text-[10px] font-semibold text-white ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-950">
        <Plus className="h-3 w-3" />
        {t("secciones.nueva")}
      </span>
      <div className="mx-auto mt-3 w-64 rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-2xl">
        <p className="text-[10px] font-semibold text-zinc-100">{t("secciones.nueva")}</p>
        <p className="mt-1.5 text-[8px] uppercase tracking-wide text-zinc-500">{t("comun.nombre")}</p>
        <div className="mt-0.5 flex items-center gap-2 rounded-md border border-sky-400 bg-zinc-950 px-2 py-1">
          <span className="h-1.5 w-full rounded-full bg-zinc-700" />
        </div>
        <p className="mt-1.5 text-[8px] uppercase tracking-wide text-zinc-500">{t("comun.descripcion")}</p>
        <div className="mt-0.5 h-4 rounded-md border border-zinc-700 bg-zinc-900" />
        <p className="mt-1.5 text-[8px] uppercase tracking-wide text-zinc-500">{t("secciones.icono")}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 text-sky-300">
            <Folder className="h-4 w-4" />
          </span>
          <span className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[8px] text-zinc-500">{t("secciones.iconoPlaceholder")}</span>
        </div>
        <div className="mt-1 flex gap-1.5">
          {iconBox(true, <Folder className="h-3 w-3" />)}
          {iconBox(false, <FileText className="h-3 w-3" />)}
          {iconBox(false, <Star className="h-3 w-3" />)}
          {iconBox(false, <Search className="h-3 w-3" />)}
        </div>
        <label className="mt-2 flex items-center gap-1.5 text-[8px] text-zinc-400">
          <input type="checkbox" checked readOnly className="h-3 w-3 accent-sky-500" />
          {t("secciones.permitirSubsecciones")}
        </label>
        <div className="mt-2 flex justify-end gap-1.5">
          <span className="rounded-md border border-zinc-700 px-1.5 py-0.5 text-[8px] font-medium text-zinc-400">{t("comun.cancelar")}</span>
          <span className="rounded-md bg-sky-600 px-1.5 py-0.5 text-[8px] font-semibold text-white">{t("comun.guardar")}</span>
        </div>
      </div>
      <svg aria-hidden className="pointer-events-none absolute right-6 top-10 h-8 w-8 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 8 L14 8 L14 6 L18 10 L14 14 L14 12 L6 12 Z" />
      </svg>
    </div>
  );
}

function TemplateVisual({ t }: { t: TranslateFn }) {
  function row(label: string, badge: string, opts: { active?: boolean; required?: boolean; searchable?: boolean; dragging?: boolean } = {}) {
    const { active = false, required = false, searchable = true, dragging = false } = opts;
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${dragging ? "z-10 border-sky-400/70 bg-zinc-900 shadow-xl shadow-sky-500/10 ring-2 ring-sky-400/40" : active ? "border-transparent bg-zinc-900 ring-2 ring-sky-400" : "border-zinc-800 bg-zinc-900/60"}`}
      >
        <GripVertical className={`h-4 w-4 shrink-0 ${dragging ? "text-sky-300" : "text-zinc-600"}`} />
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-zinc-100">{label}</span>
        <span className="flex items-center gap-1">
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400">{badge}</span>
          {required ? <span className="rounded bg-sky-500/15 px-1 py-0.5 text-[8px] font-medium text-sky-300">{t("comun.obligatorio")}</span> : null}
          {searchable ? <span className="rounded bg-sky-500/15 px-1 py-0.5 text-[8px] font-medium text-sky-300">{t("comun.buscable")}</span> : null}
        </span>
        <MoreVertical className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
      </div>
    );
  }
  return (
    <div className="flex h-56 flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      {row("Título", t("campos.tipos.texto"), { required: true, searchable: true })}
      {row("Estado", t("campos.tipos.seleccion"), { active: true, searchable: true })}
      {row("Notas", t("campos.tipos.textoLargo"), { searchable: false })}
      <div className="mt-auto flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white ring-2 ring-sky-400">
          <Plus className="h-3 w-3" />
          {t("plantilla.anadirCampo")}
        </span>
        <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[9px] text-zinc-400">
          <Trash2 className="mr-1 inline h-3 w-3" />
          {t("plantilla.papeleraBoton", { n: 2 })}
        </span>
      </div>
    </div>
  );
}

function DragVisual({ t }: { t: TranslateFn }) {
  return (
    <div className="flex h-56 flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="grid flex-1 grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <p className="text-[8px] font-semibold uppercase tracking-wide text-zinc-500">{t("plantilla.tab")} · {t("comun.cambiarOrden")}</p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 opacity-60">
              <GripVertical className="h-3 w-3 text-zinc-600" />
              <span className="text-[10px] text-zinc-300">Título</span>
              <span className="ml-auto rounded bg-zinc-800 px-1 py-px text-[8px] text-zinc-400">{t("campos.tipos.texto")}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-sky-400/70 bg-zinc-900 px-2 py-1.5 shadow-xl shadow-sky-500/10 ring-2 ring-sky-400/40">
              <GripVertical className="h-3 w-3 text-sky-300" />
              <span className="text-[10px] font-medium text-zinc-100">Estado</span>
              <span className="ml-auto rounded bg-sky-500/15 px-1 py-px text-[8px] text-sky-300">{t("campos.tipos.seleccion")}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 opacity-60">
              <GripVertical className="h-3 w-3 text-zinc-600" />
              <span className="text-[10px] text-zinc-300">Notas</span>
              <span className="ml-auto rounded bg-zinc-800 px-1 py-px text-[8px] text-zinc-400">{t("campos.tipos.textoLargo")}</span>
            </div>
          </div>
          <p className="text-[8px] text-zinc-600">⋮⋮ mantén 350 ms · arrastra</p>
          <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-1.5">
            <p className="text-[8px] uppercase tracking-wide text-zinc-500">{t("plantilla.opciones")}</p>
            <div className="mt-1 flex flex-col gap-1">
              <div className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-1 opacity-60">
                <GripVertical className="h-3 w-3 text-zinc-600" />
                <span className="flex-1 text-[9px] text-zinc-400">Pendiente</span>
              </div>
              <div className="flex items-center gap-1 rounded-md border border-sky-400/70 bg-zinc-900 px-1.5 py-1 shadow-lg ring-2 ring-sky-400/40">
                <GripVertical className="h-3 w-3 text-sky-300" />
                <span className="flex-1 text-[9px] text-zinc-100">En curso</span>
              </div>
              <div className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-1 opacity-60">
                <GripVertical className="h-3 w-3 text-zinc-600" />
                <span className="flex-1 text-[9px] text-zinc-400">Hecho</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-[8px] font-semibold uppercase tracking-wide text-zinc-500">{t("secciones.aunNoHay")} · tarjetas</p>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-2 opacity-60">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                <Folder className="h-4 w-4" />
              </span>
              <Bar className="mt-1.5 w-10" />
            </div>
            <div className="rounded-xl border border-sky-400/70 bg-zinc-900 p-2 shadow-xl ring-2 ring-sky-400/40">
              <div className="flex items-start justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                  <Folder className="h-4 w-4" />
                </span>
                <GripVertical className="h-3 w-3 text-sky-300" />
              </div>
              <Bar className="mt-1.5 w-12 bg-zinc-600" />
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-2 opacity-60">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                <Folder className="h-4 w-4" />
              </span>
              <Bar className="mt-1.5 w-8" />
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-2 opacity-60">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                <Folder className="h-4 w-4" />
              </span>
              <Bar className="mt-1.5 w-10" />
            </div>
          </div>
          <div className="mt-auto rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[8px] leading-snug text-sky-200">
            Esc cancela · suelta para confirmar
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordsVisual({ t }: { t: TranslateFn }) {
  function th(label: string, sortable = true, active = false) {
    return (
      <th className="whitespace-nowrap px-3 py-2 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
        <span className={`inline-flex items-center gap-1 ${active ? "text-sky-300" : ""}`}>
          {label}
          {active ? <ChevronDown className="h-3 w-3" /> : sortable ? <ChevronDown className="h-2.5 w-2.5 opacity-0" /> : null}
        </span>
      </th>
    );
  }
  return (
    <div className="flex h-56 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 text-[10px]">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 px-2 py-1.5">
        <span className="text-xs font-semibold text-zinc-100">Contactos</span>
        <span className="inline-flex items-center rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-sky-300">3</span>
        <label className="relative ml-1 flex w-28 items-center rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1">
          <ListFilter className="mr-1 h-3 w-3 shrink-0 text-zinc-600" />
          <span className="text-[10px] text-zinc-500">{t("registros.filtroPlaceholder")}</span>
        </label>
        <label className="ml-auto flex items-center gap-1 text-[10px] text-zinc-400">
          <input type="checkbox" readOnly className="h-3 w-3 accent-sky-500" />
          {t("papelera.boton")}
        </label>
        <span className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-2 py-1 text-[10px] font-semibold text-white ring-2 ring-sky-400">
          <Plus className="h-3 w-3" />
          {t("registros.nuevo")}
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950">
              {th("Nombre", true, true)}
              {th(t("registros.creado"), true)}
              {th(t("registros.modificado"), true)}
              <th className="w-8 px-2 py-2 text-right">
                <span className="sr-only">{t("comun.acciones")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            <tr className="odd:bg-zinc-950/40 hover:bg-zinc-900">
              <td className="px-3 py-1.5 text-zinc-200">Ana López</td>
              <td className="whitespace-nowrap px-3 py-1.5 text-zinc-500">ahora mismo</td>
              <td className="whitespace-nowrap px-3 py-1.5 text-zinc-500">hace 1 h</td>
              <td className="px-2 py-1.5 text-right">
                <MoreVertical className="h-3 w-3 text-zinc-600" />
              </td>
            </tr>
            <tr className="bg-sky-500/10 ring-2 ring-inset ring-sky-400">
              <td className="px-3 py-1.5 text-sky-100">Proyecto alpha</td>
              <td className="px-3 py-1.5 text-zinc-500">hace 2 h</td>
              <td className="px-3 py-1.5 text-zinc-500">hace 2 h</td>
              <td className="px-2 py-1.5 text-right">
                <MoreVertical className="h-3 w-3 text-sky-300" />
              </td>
            </tr>
            <tr className="odd:bg-zinc-950/40 hover:bg-zinc-900">
              <td className="px-3 py-1.5 text-zinc-200">—</td>
              <td className="px-3 py-1.5 text-zinc-500">hace 1 día</td>
              <td className="px-3 py-1.5 text-zinc-500">hace 1 día</td>
              <td className="px-2 py-1.5 text-right">
                <MoreVertical className="h-3 w-3 text-zinc-600" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-zinc-800 px-2 py-1">
        <span className="text-[10px] tabular-nums text-zinc-500">{t("registros.mostrando", { a: 1, b: 3, c: 3 })}</span>
        <span className="text-[10px] tabular-nums text-zinc-500">1 / 1</span>
      </div>
    </div>
  );
}

function SearchVisual({ t }: { t: TranslateFn }) {
  return (
    <div className="flex h-56 items-start justify-center rounded-lg border border-zinc-800 bg-black/60 p-3">
      <div className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
          <Search className="h-3 w-3 shrink-0 text-zinc-500" />
          <span className="text-[11px] text-zinc-100">proyecto</span>
          <span aria-hidden className="h-3 w-px animate-pulse bg-sky-400" />
          <kbd className="ml-auto rounded border border-zinc-700 bg-zinc-950 px-1 text-[8px] uppercase text-zinc-500">Ctrl F</kbd>
        </div>
        <div className="flex flex-col gap-1.5 border-b border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <div className="flex gap-1.5">
            <span className="max-w-[10rem] truncate rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[8px] text-zinc-300">{t("busqueda.todasLasSecciones")}</span>
            <span className="max-w-[10rem] truncate rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[8px] text-zinc-400">{t("busqueda.todosLosFormularios")}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="rounded-full border border-sky-400/60 bg-sky-500/20 px-2 py-0.5 text-[8px] font-medium text-sky-300">Texto</span>
            <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[8px] text-zinc-500">Selección</span>
            <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[8px] text-zinc-500">Fecha</span>
            <span className="text-[8px] text-zinc-500 underline">{t("busqueda.limpiar")}</span>
          </div>
        </div>
        <div className="p-1.5">
          <p className="px-1.5 pb-1 text-[8px] font-semibold uppercase tracking-wide text-zinc-500">Proyectos / Tareas</p>
          <div className="flex items-center gap-1.5 rounded-md bg-sky-500/15 px-1.5 py-1 ring-2 ring-sky-400">
            <FileText className="h-3 w-3 shrink-0 text-sky-300" />
            <span className="text-[10px] text-sky-100">
              proyecto <mark className="rounded-sm bg-sky-500/30 px-0.5 text-sky-300">alpha</mark>
            </span>
            <span className="ml-auto rounded-full border border-zinc-700 px-1 text-[7px] text-zinc-500">{t("busqueda.cercano")}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 rounded-md px-1.5 py-1">
            <FileText className="h-3 w-3 shrink-0 text-zinc-600" />
            <Bar className="w-1/2" />
          </div>
        </div>
        <p className="border-t border-zinc-800 px-3 py-1 text-right text-[7px] uppercase tracking-wide text-zinc-600">{t("busqueda.atajos")}</p>
      </div>
    </div>
  );
}

function TrashVisual({ t }: { t: TranslateFn }) {
  return (
    <div className="grid h-56 grid-cols-2 gap-3">
      <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
        <p className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wide text-zinc-500">
          <Ban className="h-3 w-3" />
          {t("comun.deshabilitar")}
        </p>
        <div className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-2 opacity-60">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <Folder className="h-3 w-3 text-zinc-600" />
            <span>Colección</span>
            <span className="ml-auto rounded bg-zinc-800 px-1 py-px text-[8px] uppercase tracking-wide text-zinc-500">{t("comun.off")}</span>
          </div>
          <ul className="mt-1.5 list-disc pl-4 text-[8px] leading-snug text-zinc-600">
            <li>lectura sí · edición no</li>
            <li>oculta de búsqueda</li>
            <li>bloquea + registro / plantilla</li>
          </ul>
        </div>
        <span className="mx-auto mt-auto inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[9px] text-zinc-300">
          <RotateCcw className="h-3 w-3" />
          {t("comun.habilitar")}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 rounded-lg border border-sky-500/40 bg-zinc-950 p-3">
        <p className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wide text-zinc-600">
          <RotateCcw className="h-2.5 w-2.5" />
          {t("papelera.boton")} · soft delete
        </p>
        <div className="flex flex-col gap-1">
          {["Ideas viejas", "Plantilla borrada"].map((name) => (
            <div key={name} className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-1.5 py-1">
              <span className="truncate text-[10px] text-zinc-500 line-through">{name}</span>
              <span className="ml-auto flex items-center gap-1">
                <span className="rounded border border-zinc-700 px-1 py-px text-[8px] text-sky-300">{t("comun.restaurar")}</span>
                <Trash2 className="h-3 w-3 text-rose-300" />
              </span>
            </div>
          ))}
        </div>
        <ul className="list-disc pl-4 text-[8px] leading-snug text-zinc-500">
          <li>restaura 1 clic</li>
          <li>cascada a papelera</li>
          <li>borrado definitivo aparte</li>
        </ul>
      </div>
    </div>
  );
}

function SettingsVisual({ t }: { t: TranslateFn }) {
  return (
    <div className="flex h-56 flex-col rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex justify-end">
        <span className="rounded-md p-1.5 text-zinc-200 ring-2 ring-sky-400">
          <Settings className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mx-auto mt-2 flex w-64 flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 shadow-2xl">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1 rounded-lg border border-sky-500/60 bg-sky-500/10 p-1.5">
            <span className="flex items-center justify-between text-[9px] font-medium text-zinc-200">
              <span className="flex items-center gap-1">
                <Moon className="h-3 w-3" />
                {t("ajustes.temaOscuro")}
              </span>
              <Check className="h-3 w-3 text-sky-400" />
            </span>
            <span aria-hidden className="block h-12 rounded-md border" style={{ backgroundColor: "#09090b", borderColor: "#3f3f46" }}>
              <span className="flex h-3 items-center gap-1 border-b px-1" style={{ backgroundColor: "#18181b", borderColor: "#27272a" }}>
                <span className="h-1 w-6 rounded-full" style={{ backgroundColor: "#0284c7" }} />
                <span className="h-1 w-4 rounded-full" style={{ backgroundColor: "#52525b" }} />
              </span>
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-zinc-700 p-1.5">
            <span className="flex items-center gap-1 text-[9px] font-medium text-zinc-200">
              <Sun className="h-3 w-3" />
              {t("ajustes.temaClaro")}
            </span>
            <span aria-hidden className="block h-12 rounded-md border" style={{ backgroundColor: "#f4f4f5", borderColor: "#d4d4d8" }}>
              <span className="flex h-3 items-center gap-1 border-b bg-white px-1" style={{ borderColor: "#e4e4e7" }}>
                <span className="h-1 w-6 rounded-full" style={{ backgroundColor: "#0284c7" }} />
                <span className="h-1 w-4 rounded-full" style={{ backgroundColor: "#a1a1aa" }} />
              </span>
            </span>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-[10px] text-zinc-200">
          <Globe className="h-3 w-3 shrink-0 text-zinc-500" />
          {t("ajustes.espanol")}
          <ChevronDown className="ml-auto h-3 w-3 text-zinc-500" />
        </span>
      </div>
    </div>
  );
}

export function TutorialModal({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [index, setIndex] = useState(0);
  const finishAndClose = useCallback(() => {
    markSeen();
    onClose();
  }, [onClose]);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") finishAndClose();
      else if (event.key === "ArrowRight") setIndex((p) => Math.min(p + 1, LAST_INDEX));
      else if (event.key === "ArrowLeft") setIndex((p) => Math.max(p - 1, 0));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [finishAndClose]);
  const slides: ReadonlyArray<{ titulo: string; desc: string; visual: ReactNode }> = [
    { titulo: t("tutorial.s1Titulo"), desc: t("tutorial.s1Desc"), visual: <WelcomeVisual t={t} /> },
    { titulo: t("tutorial.s2Titulo"), desc: t("tutorial.s2Desc"), visual: <DrawerVisual /> },
    { titulo: t("tutorial.s3Titulo"), desc: t("tutorial.s3Desc"), visual: <TypesVisual t={t} /> },
    { titulo: t("tutorial.s4Titulo"), desc: t("tutorial.s4Desc"), visual: <CreateVisual t={t} /> },
    { titulo: t("tutorial.s5Titulo"), desc: t("tutorial.s5Desc"), visual: <TemplateVisual t={t} /> },
    { titulo: t("tutorial.s6Titulo"), desc: t("tutorial.s6Desc"), visual: <DragVisual t={t} /> },
    { titulo: t("tutorial.s7Titulo"), desc: t("tutorial.s7Desc"), visual: <RecordsVisual t={t} /> },
    { titulo: t("tutorial.s8Titulo"), desc: t("tutorial.s8Desc"), visual: <SearchVisual t={t} /> },
    { titulo: t("tutorial.s9Titulo"), desc: t("tutorial.s9Desc"), visual: <TrashVisual t={t} /> },
    { titulo: t("tutorial.s10Titulo"), desc: t("tutorial.s10Desc"), visual: <SettingsVisual t={t} /> },
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
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <header className={modalHeader}>
          <h2 className="text-sm font-semibold text-zinc-100">{t("tutorial.titulo")}</h2>
          <button type="button" title={t("tutorial.cerrar")} aria-label={t("tutorial.cerrar")} className="rounded-md p-1 text-zinc-400 transition-colors duration-150 hover:bg-zinc-800 hover:text-zinc-100" onClick={finishAndClose}>
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
                  className={`h-1.5 rounded-full transition-colors duration-150 ${dot === index ? "w-4 bg-sky-400" : "w-1.5 bg-zinc-700 hover:bg-zinc-600"}`}
                  onClick={() => {
                    setIndex(dot);
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] tabular-nums text-zinc-500">{t("tutorial.progreso", { a: index + 1, b: slides.length })}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={btnSecondary}
              disabled={index === 0}
              onClick={() => {
                setIndex((p) => Math.max(p - 1, 0));
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
                if (isLast) finishAndClose();
                else setIndex((p) => Math.min(p + 1, LAST_INDEX));
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
