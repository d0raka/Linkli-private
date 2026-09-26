"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowClockwise, ArrowCounterClockwise } from "@phosphor-icons/react/ssr";
import { composeEmojiElementStyle, elementHasFreeLayout, elementLayoutStyle, insertElementInOrder, isElementStyleKey, isFlowLockedKey, isTextLayoutKey, paintsChildFill, applyCanvasKeyAction, resizeElementFromHandle, resolveElementOrder, resolvedCopyAlign, rotateElementFromDrag, setElementFreePosition, snapPosition, unpinElement, type ResizeHandle } from "@/lib/element-layout";
import { CUSTOM_BLOCKS, FONT_FAMILIES, getTemplateFeatures, scratchSecretText, SCRATCH_COVER_PLACEHOLDER, SCRATCH_SECRET_PLACEHOLDER, templates, DEFAULT_MEMORY_SLIDES, type ElementStyleKey, type MemorySlide, type TemplateConfig, type TemplateElementStyle, type TemplateFeature, type TemplateQuestion } from "@/lib/templates";
import type { ProjectRecord } from "@/lib/projects";
import { canUsePagePassword, canUsePhotos, featureForConfigKey, featureForElementKey, hasPlanAccess, isPaidPlan, isPlanGatedValue, parsePlanFeature, requiredPlanForFeature, type PlanFeatureId, type PlanType } from "@/lib/plans";
import { CanvasElementChrome, type CanvasTransformHandle } from "../canvas-element-chrome";
import { ElementControlCard, ElementStyleEditor, type ElementContentField } from "../element-customizer";
import { buildDecorationItems, decorationMotionKey } from "@/lib/decoration-motion";
import { EVENT_TIMEZONE_OPTIONS } from "@/lib/event-time";
import { ApiError, apiFetch, errorMessage } from "@/lib/api-client";
import { primaryPublishLabel } from "@/lib/studio-actions";
import { backgroundImageUrl, compressBackgroundImage, compressSymbolImage, emojiImageUrl } from "@/lib/background-image";
import { DecorationMotionControls } from "../decoration-motion-controls";
import { EditorToolbox, type ToolboxTab } from "../editor-toolbox";
import { PlanLockChip, PlanLockLayer } from "../plan-lock";
import PageMusicPlayer, { MusicMuteFab, MusicPlaybackProvider } from "../page-music-player";
import RsvpDashboard from "../rsvp-dashboard";
import { formatHostWhatsAppInvite, whatsappShareHref } from "@/lib/whatsapp-share";
import { toDisplayPhone, toNormalizedPhone, editorSections, DESIGN_PRESETS, NAV_FEATURE_KEYS, SHARE_FEATURE_KEYS, elementGroup, featureGroup, lockFeature, OPENING_ELEMENTS, QUESTION_ELEMENTS, COMPLETION_ELEMENTS, ELEMENT_LABELS, CORE_FEATURE_KEYS, featureStyleKey, featureBelongsToStage, type EditorSection, type PreviewScreen, type FeatureStage, type ElementDefinition, type ToolboxItem } from "./editor-model";
import { BackgroundTemplatePicker, SymbolFace, EmojiImageField, EmojiPicker } from "./pickers";
import { InlineField } from "./inline-field";
import { UserImage } from "@/app/ui/user-image";

type CanvasDropHint =
  | { mode: "insert"; targetKey: ElementStyleKey; before: boolean; left: number; top: number; width: number }
  | { mode: "free"; left: number; top: number; width: number; height: number };

export type Profile = { email: string; displayName: string; plan: PlanType; bonusPages: number; pageLimit: number; emailVerified: boolean };

export function Editor({ project, profile, saving, onProject, onConfig, onSave, onSaveConfig, onCommitSlug, onPublish, onUnpublish, onPassword, onDelete, onRequirePlan }: { project: ProjectRecord; profile: Profile; saving: boolean; onProject: (patch: Partial<ProjectRecord>) => void; onConfig: <K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) => void; onSave: () => Promise<boolean>; onSaveConfig: (config: TemplateConfig) => Promise<boolean>; onCommitSlug: () => void; onPublish: () => void; onUnpublish: () => void; onPassword: (password: string | null) => Promise<boolean>; onDelete: () => void; onRequirePlan: (feature: PlanFeatureId) => void }) {
  const c = project.config;
  const templateFeatures = getTemplateFeatures(project.templateId);
  const isCustomBlank = project.templateId === "custom-blank";
  const hasShareFeature = isCustomBlank ? (c.customBlocks || CUSTOM_BLOCKS.map((item) => item.id)).includes("share") : templateFeatures.some((feature) => feature.key === "showWhatsApp");
  const [section, setSection] = useState<EditorSection>("opening");
  const [memoryBusy, setMemoryBusy] = useState<number | null>(null);
  const [memoryError, setMemoryError] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [previewScreen, setPreviewScreen] = useState<PreviewScreen>("intro");
  const [previewQuestion, setPreviewQuestion] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState<string[]>(() => c.questions.map(() => ""));
  const [mobilePane, setMobilePane] = useState<"edit" | "preview">("preview");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewDecorations, setPreviewDecorations] = useState(true);
  const [copied, setCopied] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [editingElement, setEditingElementState] = useState<ElementStyleKey | null>(null);
  // Mirrors the selection synchronously so a fast second click on the same element starts text editing.
  const editingElementRef = useRef<ElementStyleKey | null>(null);
  const setEditingElement = useCallback((next: ElementStyleKey | null | ((current: ElementStyleKey | null) => ElementStyleKey | null)) => {
    const value = typeof next === "function" ? next(editingElementRef.current) : next;
    editingElementRef.current = value;
    setEditingElementState(value);
  }, []);
  const [toolboxTab, setToolboxTab] = useState<ToolboxTab>("elements");
  const [selectedToolboxId, setSelectedToolboxId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [dropHint, setDropHint] = useState<CanvasDropHint | null>(null);
  const [optionDrag, setOptionDrag] = useState<{ question: number; from: number; over: number } | null>(null);
  const dropHintRef = useRef<CanvasDropHint | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ v?: number; h?: number } | null>(null);
  const historyRef = useRef<TemplateConfig[]>([structuredClone(c)]);
  const historyIndexRef = useRef(0);
  const skipHistoryRef = useRef(0);
  const historyTimerRef = useRef<number>(0);
  const toolboxItemsRef = useRef<ToolboxItem[]>([]);
  const configRef = useRef(c);
  const transformEndRef = useRef<(event?: React.PointerEvent<HTMLButtonElement> | PointerEvent) => void>(() => {});
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const ignoreHistoryRef = useRef(false);
  const skipTextEditRef = useRef(false);
  const moveSessionRef = useRef<{
    key: ElementStyleKey;
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    screen: DOMRect;
    moved: boolean;
    textField: HTMLElement | null;
    wasSelected: boolean;
  } | null>(null);
  const transformSessionRef = useRef<
    | {
        kind: "resize";
        key: ElementStyleKey;
        pointerId: number;
        handle: ResizeHandle;
        originX: number;
        originY: number;
        originW: number;
        originH: number;
        rotate: number;
        screen: DOMRect;
      }
    | {
        kind: "rotate";
        key: ElementStyleKey;
        pointerId: number;
        originRotate: number;
        startAngle: number;
        originX: number;
        originY: number;
        originW?: number;
        originH?: number;
        centerX: number;
        centerY: number;
      }
    | null
  >(null);
  const [isMovingElement, setIsMovingElement] = useState(false);
  const [isTransformingElement, setIsTransformingElement] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const [bgUploadError, setBgUploadError] = useState("");
  const [emojiUploading, setEmojiUploading] = useState(false);
  const [emojiUploadError, setEmojiUploadError] = useState("");
  const [previewFrame, setPreviewFrame] = useState<HTMLDivElement | null>(null);
  const attachPreviewFrame = useCallback((node: HTMLDivElement | null) => {
    previewFrameRef.current = node;
    setPreviewFrame(node);
  }, []);
  useEffect(() => {
    configRef.current = c;
  });
  const visibleEditorSections = editorSections.filter((item) => item.id !== "guests" || project.templateId === "event" || c.rsvpEnabled === true || c.showGuests === true);
  const shareUrl = typeof window === "undefined" ? `/p/${project.slug}` : `${window.location.origin}/p/${project.slug}`;
  const whatsappShareUrl = whatsappShareHref(formatHostWhatsAppInvite({ headline: c.headline, tease: c.subtitle || c.introLabel, url: shareUrl, emoji: c.emoji }));
  const activeSectionIndex = visibleEditorSections.findIndex((item) => item.id === section);
  const activeSection = visibleEditorSections[activeSectionIndex] || visibleEditorSections[0];
  const activeQuestion = c.questions[questionIndex];
  const previewQuestionData = c.questions[previewQuestion];

  function updateQuestion(index: number, patch: Partial<TemplateQuestion>) {
    onConfig("questions", c.questions.map((question, currentIndex) => currentIndex === index ? { ...question, ...patch } : question));
  }

  function updateQuestionOption(questionPosition: number, optionPosition: number, value: string) {
    const question = c.questions[questionPosition];
    const previous = question.options[optionPosition];
    const options = question.options.map((option, index) => index === optionPosition ? value.slice(0, 120) : option);
    updateQuestion(questionPosition, { options, correctOption: question.correctOption === previous ? value.slice(0, 120) : question.correctOption });
  }

  function addQuestionOption(questionPosition: number) {
    const question = c.questions[questionPosition];
    if (question.options.length >= 6) return;
    updateQuestion(questionPosition, { options: [...question.options, `אפשרות ${question.options.length + 1}`] });
  }

  function moveQuestionOption(questionPosition: number, from: number, to: number) {
    const question = c.questions[questionPosition];
    if (!question || from === to || from < 0 || to < 0 || from >= question.options.length || to >= question.options.length) return;
    const options = [...question.options];
    const [moved] = options.splice(from, 1);
    options.splice(to, 0, moved);
    updateQuestion(questionPosition, { options });
  }

  function removeQuestionOption(questionPosition: number, optionPosition: number) {
    const question = c.questions[questionPosition];
    if (question.options.length <= 2) return;
    const removed = question.options[optionPosition];
    updateQuestion(questionPosition, { options: question.options.filter((_, index) => index !== optionPosition), correctOption: question.correctOption === removed ? "" : question.correctOption });
    if (previewAnswers[questionPosition] === removed) setPreviewAnswers((answers) => answers.map((answer, index) => index === questionPosition ? "" : answer));
  }

  function addQuestion() {
    if (c.questions.length >= 10) return;
    const nextQuestion: TemplateQuestion = { id: crypto.randomUUID(), widget: "choice", prompt: `שאלה ${c.questions.length + 1}`, helper: "הוסיפו הסבר קצר שיעזור לבחור תשובה.", options: ["אפשרות 1", "אפשרות 2"], correctOption: "" };
    const nextIndex = c.questions.length;
    onConfig("questions", [...c.questions, nextQuestion]);
    setPreviewAnswers((answers) => [...answers, ""]);
    setQuestionIndex(nextIndex);
    setPreviewQuestion(nextIndex);
    setPreviewScreen("question");
  }

  function removeQuestion(position: number) {
    if (c.questions.length <= 1) return;
    const nextQuestions = c.questions.filter((_, index) => index !== position);
    const nextIndex = Math.min(position, nextQuestions.length - 1);
    onConfig("questions", nextQuestions);
    setPreviewAnswers((answers) => answers.filter((_, index) => index !== position));
    setQuestionIndex(nextIndex);
    setPreviewQuestion(nextIndex);
  }

  function updateHighlight(position: number, value: string) {
    onConfig("highlights", c.highlights.map((highlight, index) => index === position ? value.slice(0, 80) : highlight));
  }

  function addHighlight() {
    if (c.highlights.length >= 5) return;
    onConfig("highlights", [...c.highlights, ""]);
  }

  function removeHighlight(position: number) {
    onConfig("highlights", c.highlights.filter((_, index) => index !== position));
  }

  function memorySlides() {
    return c.memorySlides?.length ? c.memorySlides : DEFAULT_MEMORY_SLIDES;
  }

  function updateMemorySlide(position: number, patch: Partial<MemorySlide>) {
    const slides = memorySlides().map((slide, index) => index === position ? { ...slide, ...patch } : slide);
    onConfig("memorySlides", slides);
  }

  async function uploadMemoryPhoto(index: number, file?: File) {
    if (!canUsePhotos(profile.plan)) { onRequirePlan("photos"); return; }
    setMemoryBusy(index); setMemoryError("");
    try {
      let photoKey: string | undefined;
      if (file) {
        const form = new FormData(); form.append("file", await compressBackgroundImage(file), "memory.jpg");
        const result = await apiFetch<{ photoKey: string }>(`/api/projects/${project.id}/memories/${index}`, { method: "POST", body: form }, { timeoutMs: 45_000 });
        photoKey = result.photoKey;
      } else {
        await apiFetch(`/api/projects/${project.id}/memories/${index}`, { method: "DELETE", json: {} });
      }
      const memorySlides = (configRef.current.memorySlides || DEFAULT_MEMORY_SLIDES).map((slide, position) => position === index ? { ...slide, photoKey } : slide);
      await persistBackgroundConfig({ ...configRef.current, memorySlides });
    } catch (error) { setMemoryError(uploadFailure(error, "לא הצלחנו לעדכן את תמונת הזיכרון.")); }
    finally { setMemoryBusy(null); }
  }

  function memoryPhotoFields() {
    return <div className="toolbox-extra-fields memory-inspector"><b>מצגת זיכרונות</b>{memorySlides().map((slide, index) => <fieldset key={index}><legend>שקופית {index + 1}</legend>
      <label>סמל<input aria-label={`סמל שקופית ${index + 1}`} value={slide.icon} maxLength={8} onChange={(event) => updateMemorySlide(index, { icon: event.target.value })}/></label>
      <label>כותרת<input value={slide.title} maxLength={80} onChange={(event) => updateMemorySlide(index, { title: event.target.value })}/></label>
      <label>הסיפור<textarea value={slide.text} maxLength={240} onChange={(event) => updateMemorySlide(index, { text: event.target.value })}/></label>
      {slide.photoKey && <UserImage className="memory-inspector-photo" src={`/api/public/${project.slug}/memory?key=${encodeURIComponent(slide.photoKey)}`} alt={slide.title} />}
      <PlanLockLayer feature="photos" plan={profile.plan} onUnlock={onRequirePlan} name="תמונה בשקופית"><label>תמונה אישית<input aria-label={`תמונה לשקופית ${index + 1}`} type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={memoryBusy !== null} onChange={(event) => { const file = event.target.files?.[0]; if(file) void uploadMemoryPhoto(index, file); event.target.value = ""; }}/></label></PlanLockLayer>
      {slide.photoKey && <button type="button" disabled={memoryBusy !== null} onClick={() => void uploadMemoryPhoto(index)}>הסרת התמונה</button>}
    </fieldset>)}<button type="button" disabled={memorySlides().length >= 6} onClick={() => onConfig("memorySlides", [...memorySlides(), { icon: "🌿", title: "עוד רגע שלנו", text: "כאן מתחיל הסיפור של הרגע הזה." }])}>הוספת שקופית</button>{memoryError && <p role="alert">{memoryError}</p>}</div>;
  }

  function moveQuestion(position: number, direction: -1 | 1) {
    const target = position + direction;
    if (target < 0 || target >= c.questions.length) return;
    const next = [...c.questions]; [next[position], next[target]] = [next[target], next[position]];
    onConfig("questions", next); setQuestionIndex(target); setPreviewQuestion(target);
    setPreviewAnswers((answers) => { const nextAnswers = [...answers]; [nextAnswers[position], nextAnswers[target]] = [nextAnswers[target], nextAnswers[position]]; return nextAnswers; });
  }

  function questionWidgetField(position: number) {
    const question = c.questions[position];
    return <div className="toolbox-extra-fields"><label>סוג השאלה<select aria-label={`סוג שאלה ${position + 1}`} value={question.widget || "choice"} onChange={(event) => {
      const widget = event.target.value as TemplateQuestion["widget"];
      if (widget !== "choice" && !hasPlanAccess(profile.plan, "max")) { onRequirePlan("eventTools"); return; }
      updateQuestion(position, { widget });
    }}><option value="choice">בחירה</option><option value="guest-count">ספירת אורחים</option><option value="dj-song">שיר ל-DJ</option></select></label>
      <div className="question-reorder"><button type="button" disabled={position === 0} onClick={() => moveQuestion(position, -1)} aria-label={`הקדמת שאלה ${position + 1}`}>הקדמה ↑</button><button type="button" disabled={position === c.questions.length - 1} onClick={() => moveQuestion(position, 1)} aria-label={`העברת שאלה ${position + 1} להמשך`}>בהמשך ↓</button></div>
    </div>;
  }

  function rsvpPanel() {
    return <><RsvpDashboard projectId={project.id} published={project.published} enabled={c.rsvpEnabled === true} notifyOwner={c.rsvpNotifyOwner === true} plan={profile.plan} onEnabled={(value) => onConfig("rsvpEnabled", value)} onNotify={(value) => onConfig("rsvpNotifyOwner", value)} onRequirePlan={onRequirePlan}/>
      <PlanLockLayer feature="eventTools" plan={profile.plan} onUnlock={onRequirePlan} name="מכסת תשובות ושמירה"><div className="toolbox-extra-fields"><label>מקסימום תשובות<input type="number" min={1} max={5000} value={c.responseLimit ?? 500} onChange={(event) => onConfig("responseLimit", Math.min(5000, Math.max(1, Number(event.target.value) || 1)))}/></label><label>כמה ימים לשמור תשובות<input type="number" min={30} max={730} value={c.retentionDays ?? 365} onChange={(event) => onConfig("retentionDays", Math.min(730, Math.max(30, Number(event.target.value) || 30)))}/></label><p>אחרי המכסה האורחים יראו שההרשמה נסגרה. תשובות ישנות נמחקות אוטומטית.</p></div></PlanLockLayer></>;
  }

  async function savePagePassword() {
    if (!canUsePagePassword(profile.plan)) {
      onRequirePlan("pagePassword");
      return;
    }
    if (await onPassword(passwordDraft)) setPasswordDraft("");
  }

  function chooseSection(nextSection: EditorSection) {
    setSection(nextSection);
    if (nextSection === "opening") setPreviewScreen("intro");
    if (nextSection === "questions") {
      setPreviewQuestion(questionIndex);
      setPreviewScreen("question");
    }
    if (nextSection === "guests") setPreviewScreen("question");
    if (nextSection === "design") {
      setPreviewScreen("intro");
      setMobilePane("edit");
    } else {
      setMobilePane("preview");
    }
  }

  function chooseQuestion(index: number) {
    setQuestionIndex(index);
    setPreviewQuestion(index);
    setPreviewScreen("question");
  }

  async function moveSection(direction: -1 | 1) {
    const nextIndex = Math.min(visibleEditorSections.length - 1, Math.max(0, activeSectionIndex + direction));
    if (direction === 1 && !(await onSave())) return;
    chooseSection(visibleEditorSections[nextIndex].id);
  }

  const pageBackgroundUrl = c.bgImageVersion ? backgroundImageUrl(project.slug, c.bgImageVersion) : "";
  const pageEmojiUrl = c.emojiImageVersion ? emojiImageUrl(project.slug, c.emojiImageVersion) : "";

  /** Image uploads change the config version, which must be saved right away or the preview lies. */
  async function persistBackgroundConfig(nextConfig: TemplateConfig) {
    const saved = await onSaveConfig(nextConfig);
    if (!saved) throw new Error("התמונה הועלתה אבל שמירת העמוד נכשלה. נסו לשמור שוב.");
  }

  function uploadFailure(error: unknown, fallback: string) {
    if (error instanceof ApiError && error.status === 403 && (error.code === "plan_limit" || error.feature)) {
      onRequirePlan(parsePlanFeature(error.feature) || "photos");
      return "";
    }
    if (error instanceof ApiError && error.status === 413) return "התמונה גדולה מדי גם אחרי כיווץ. נסו תמונה קטנה יותר.";
    return errorMessage(error, fallback);
  }

  async function uploadPageBackground(file: File) {
    if (!canUsePhotos(profile.plan)) {
      onRequirePlan("photos");
      return;
    }
    setBgUploading(true);
    setBgUploadError("");
    try {
      const blob = await compressBackgroundImage(file);
      const form = new FormData();
      form.append("file", blob, "background.jpg");
      const data = await apiFetch<{ version: number }>(`/api/projects/${project.id}/background`, { method: "POST", body: form }, { timeoutMs: 45_000 });
      await persistBackgroundConfig({ ...c, bgStyle: "image", bgImageVersion: Number(data.version) || Date.now() });
    } catch (error) {
      setBgUploadError(uploadFailure(error, "לא הצלחנו להעלות את התמונה"));
    } finally {
      setBgUploading(false);
    }
  }

  async function uploadPageEmoji(file: File) {
    if (!canUsePhotos(profile.plan)) {
      onRequirePlan("photos");
      return;
    }
    setEmojiUploading(true);
    setEmojiUploadError("");
    try {
      const blob = await compressSymbolImage(file);
      const form = new FormData();
      form.append("file", blob, "emoji.jpg");
      const data = await apiFetch<{ version: number }>(`/api/projects/${project.id}/emoji`, { method: "POST", body: form }, { timeoutMs: 45_000 });
      await persistBackgroundConfig({ ...c, emojiImageVersion: Number(data.version) || Date.now() });
    } catch (error) {
      setEmojiUploadError(uploadFailure(error, "לא הצלחנו להעלות את התמונה"));
    } finally {
      setEmojiUploading(false);
    }
  }

  async function removePageEmoji() {
    setEmojiUploading(true);
    setEmojiUploadError("");
    try {
      await apiFetch(`/api/projects/${project.id}/emoji`, { method: "DELETE" });
      await persistBackgroundConfig({ ...c, emojiImageVersion: 0 });
    } catch (error) {
      setEmojiUploadError(errorMessage(error, "לא הצלחנו להסיר את התמונה"));
    } finally {
      setEmojiUploading(false);
    }
  }

  async function removePageBackground() {
    setBgUploading(true);
    setBgUploadError("");
    try {
      await apiFetch(`/api/projects/${project.id}/background`, { method: "DELETE" });
      await persistBackgroundConfig({ ...c, bgStyle: "soft", bgImageVersion: 0 });
    } catch (error) {
      setBgUploadError(errorMessage(error, "לא הצלחנו להסיר את התמונה"));
    } finally {
      setBgUploading(false);
    }
  }

  function applyDesignPreset(preset: (typeof DESIGN_PRESETS)[number]) {
    onProject({
      config: {
        ...c,
        accent: preset.accent,
        accentSoft: preset.soft,
        cardBackground: preset.card,
        cardBorderColor: preset.soft,
        emojiBackground: preset.soft,
        bgStyle: "soft",
        buttonStyle: "gradient",
        fontFamily: "Rubik",
      },
    });
  }

  function advancePreview() {
    if (previewQuestion < c.questions.length - 1) {
      setPreviewQuestion((index) => index + 1);
      setPreviewScreen("question");
    } else setPreviewScreen("result");
  }

  function updateFeature(key: string, value: boolean) {
    onConfig(key as keyof TemplateConfig, value as never);
  }

  function patchConfig(patch: Partial<TemplateConfig>) {
    for (const key of Object.keys(patch)) {
      const feature = featureForConfigKey(key);
      if (feature && isPlanGatedValue(patch[key as keyof TemplateConfig]) && !hasPlanAccess(profile.plan, requiredPlanForFeature(feature))) {
        onRequirePlan(feature);
        return;
      }
    }
    onProject({ config: { ...c, ...patch } });
  }

  function toggleCustomBlock(blockId: string) {
    const current = c.customBlocks ?? CUSTOM_BLOCKS.map((block) => block.id);
    onConfig("customBlocks", current.includes(blockId) ? current.filter((item) => item !== blockId) : [...current, blockId]);
  }

  function featureEnabled(feature: TemplateFeature) {
    return Boolean((c as unknown as Record<string, unknown>)[feature.key]);
  }

  function previewBlockEnabled(blockId: string) {
    return !isCustomBlank || (c.customBlocks || CUSTOM_BLOCKS.map((item) => item.id)).includes(blockId);
  }

  function customBlockForElement(key: ElementStyleKey) {
    if (key === "emoji") return "emoji";
    if (key === "highlights") return "highlights";
    if (key === "question" || key === "options" || key === "guestCounter" || key === "djSong") return "questions";
    if (key === "venue" || key === "calendar" || key === "countdown") return "location";
    if (key === "shareButtons") return "share";
    if (key === "answerRecap") return "answers";
    if (key === "decorations") return "decorations";
    return null;
  }

  function defaultElementStyle(key: ElementStyleKey): TemplateElementStyle {
    const filled = key === "primaryButton";
    return {
      background: key === "emoji" ? (c.emojiBackground || c.accentSoft) : key === "shareButtons" ? "#25a862" : key === "musicPlayer" ? "#ffffff" : filled ? c.accent : "#ffffff",
      color: filled ? "#ffffff" : key === "musicPlayer" ? "#201a2d" : "#21182c",
      accent: c.accent,
      radius: key === "introLabel" || key === "resultLabel" || key === "shareButtons" ? 999 : key === "emoji" ? 22 : 16,
      size: 100,
      align: key === "options" || key === "djSong" || key === "answerRecap" ? "right" : "center",
      bold: key === "headline" || key === "resultTitle" || key === "primaryButton",
      italic: false,
      underline: false,
    };
  }

  function getElementStyle(key: ElementStyleKey) {
    return c.elementStyles?.[key] || defaultElementStyle(key);
  }

  function updateElementStyle(key: ElementStyleKey, patch: Partial<TemplateElementStyle>) {
    onConfig("elementStyles", {
      ...(c.elementStyles || {}),
      [key]: { ...getElementStyle(key), ...patch },
    });
  }

  function resetElementStyle(key: ElementStyleKey) {
    const next = { ...(c.elementStyles || {}) };
    delete next[key];
    onConfig("elementStyles", next);
  }

  function previewElementStyle(key: ElementStyleKey, withLayout = true): React.CSSProperties {
    const style = c.elementStyles?.[key];
    const layout = withLayout && key !== "decorations" ? elementLayoutStyle(c, key) : {};
    if (key === "emoji") {
      const vars = style ? {
        "--element-accent": style.accent,
        "--element-bg": style.background,
        "--element-color": style.color,
        "--element-radius": `${style.radius}px`,
        "--element-scale": style.size / 100,
      } as React.CSSProperties : {};
      return { ...vars, ...composeEmojiElementStyle(c, layout, style) };
    }
    if (!style) return layout;
    const vars = {
      "--element-accent": style.accent,
      "--element-bg": style.background,
      "--element-color": style.color,
      "--element-radius": `${style.radius}px`,
      "--element-scale": style.size / 100,
      textAlign: resolvedCopyAlign(key, style.align),
    } as React.CSSProperties;
    const textFormat = isTextLayoutKey(key) ? {
      fontWeight: style.bold ? 800 : undefined,
      fontStyle: style.italic ? "italic" : undefined,
      textDecoration: style.underline ? "underline" : undefined,
    } : {};
    if (key === "highlights" || paintsChildFill(key)) return { ...vars, ...textFormat, ...layout };
    return {
      ...vars,
      backgroundColor: style.background,
      color: style.color,
      borderColor: style.accent,
      borderRadius: `${style.radius}px`,
      ...textFormat,
      ...layout,
    };
  }

  function previewElementClass(key: ElementStyleKey, base = "", withLayout = true) {
    return `${base} preview-el preview-el-${key} ${c.elementStyles?.[key] ? "preview-element-customized" : ""} ${withLayout && elementHasFreeLayout(c, key) ? "preview-el-free" : ""} ${editingElement === key ? "is-canvas-selected" : ""}`.trim();
  }

  function keyFromPreviewElement(target: EventTarget | null): ElementStyleKey | null {
    const node = target instanceof Element ? target.closest("[class*='preview-el-']") : null;
    if (!node) return null;
    const match = [...node.classList].find((item) => item.startsWith("preview-el-") && item !== "preview-el" && item !== "preview-el-free");
    const key = match?.slice("preview-el-".length);
    return isElementStyleKey(key) ? key : null;
  }

  function parseDroppedElement(event: React.DragEvent): ElementStyleKey | null {
    const raw = event.dataTransfer.getData("application/x-linkli-element") || event.dataTransfer.getData("text/plain");
    if (isElementStyleKey(raw)) return raw;
    const fromToolbox = raw.match(/^el:[^:]+:(.+)$/);
    return fromToolbox && isElementStyleKey(fromToolbox[1]) ? fromToolbox[1] : null;
  }

  function enableDroppedElement(key: ElementStyleKey) {
    const item = toolboxItemsRef.current.find((row) => row.styleKey === key);
    if (item && !item.enabled) item.onToggle?.(true);
  }

  function publishDropHint(next: CanvasDropHint | null) {
    if (JSON.stringify(dropHintRef.current) === JSON.stringify(next)) return;
    dropHintRef.current = next;
    setDropHint(next);
  }

  function clearDropUi() {
    dropHintRef.current = null;
    setDropHint(null);
    setDropActive(false);
    setSnapGuides(null);
  }

  function elementAtCanvasPoint(clientX: number, clientY: number, ignoreKey?: ElementStyleKey | null) {
    const stack = document.elementsFromPoint(clientX, clientY);
    for (const el of stack) {
      if (!(el instanceof Element)) continue;
      if (el.closest(".canvas-drop-hint, .canvas-el-chrome, .editor-history-actions, .page-music-mute-fab")) continue;
      const key = keyFromPreviewElement(el);
      if (!key || key === "decorations" || key === ignoreKey) continue;
      const node = el.closest<HTMLElement>(".preview-el");
      if (!node) continue;
      return { key, node };
    }
    return null;
  }

  function collectSnapTargets(frame: HTMLElement, ignoreKey?: ElementStyleKey | null) {
    const screen = previewScreenNode(frame).getBoundingClientRect();
    const targets: { x: number; y: number }[] = [];
    frame.querySelectorAll<HTMLElement>(".preview-site-card .preview-el").forEach((node) => {
      const key = keyFromPreviewElement(node);
      if (!key || key === "decorations" || key === ignoreKey) return;
      const rect = node.getBoundingClientRect();
      targets.push({
        x: ((rect.left + rect.width / 2 - screen.left) / Math.max(screen.width, 1)) * 100,
        y: ((rect.top + rect.height / 2 - screen.top) / Math.max(screen.height, 1)) * 100,
      });
    });
    return { screen, targets };
  }

  function snapToCanvas(frame: HTMLElement, x: number, y: number, ignoreKey?: ElementStyleKey | null) {
    const { screen, targets } = collectSnapTargets(frame, ignoreKey);
    const snapped = snapPosition(x, y, targets);
    const frameRect = frame.getBoundingClientRect();
    setSnapGuides({
      v: snapped.guides.v == null ? undefined : Math.round(screen.left - frameRect.left + (snapped.guides.v / 100) * screen.width),
      h: snapped.guides.h == null ? undefined : Math.round(screen.top - frameRect.top + (snapped.guides.h / 100) * screen.height),
    });
    return snapped;
  }

  function nearestInsertTarget(frame: HTMLElement, clientX: number, clientY: number, ignoreKey?: ElementStyleKey | null) {
    const hit = elementAtCanvasPoint(clientX, clientY, ignoreKey);
    if (hit) return hit;
    const screen = previewScreenNode(frame);
    let bestKey: ElementStyleKey | null = null;
    let bestNode: HTMLElement | null = null;
    let bestDistance = 36;
    screen.querySelectorAll<HTMLElement>(".preview-el").forEach((node) => {
      const key = keyFromPreviewElement(node);
      if (!key || key === "decorations" || key === ignoreKey) return;
      const rect = node.getBoundingClientRect();
      const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
      const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
      const distance = Math.hypot(dx, dy);
      if (distance > bestDistance) return;
      bestDistance = distance;
      bestKey = key;
      bestNode = node;
    });
    return bestKey && bestNode ? { key: bestKey, node: bestNode } : null;
  }

  function readDropHint(frame: HTMLElement, clientX: number, clientY: number, ignoreKey?: ElementStyleKey | null): CanvasDropHint {
    const frameRect = frame.getBoundingClientRect();
    const hit = nearestInsertTarget(frame, clientX, clientY, ignoreKey);
    if (hit) {
      const rect = hit.node.getBoundingClientRect();
      const before = clientY < rect.top + rect.height / 2;
      return {
        mode: "insert",
        targetKey: hit.key,
        before,
        left: Math.round(rect.left - frameRect.left),
        top: Math.round((before ? rect.top : rect.bottom) - frameRect.top),
        width: Math.max(24, Math.round(rect.width)),
      };
    }
    const card = frame.querySelector(".preview-site-card");
    const cardWidth = card?.getBoundingClientRect().width ?? 240;
    const width = Math.round(Math.min(280, Math.max(168, cardWidth * 0.72)));
    const height = 54;
    return {
      mode: "free",
      left: Math.round(clientX - frameRect.left - width / 2),
      top: Math.round(clientY - frameRect.top - height / 2),
      width,
      height,
    };
  }

  function handleCanvasDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (!dropActive) setDropActive(true);
    publishDropHint(readDropHint(event.currentTarget, event.clientX, event.clientY));
  }

  function handleCanvasDragEnter(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropActive(true);
  }

  function handleCanvasDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) clearDropUi();
  }

  function applyCanvasDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const hint = dropHintRef.current;
    clearDropUi();
    const key = parseDroppedElement(event);
    if (!key || key === "decorations") return;
    enableDroppedElement(key);
    if (isFlowLockedKey(key)) {
      if (hint?.mode === "insert" && hint.targetKey !== key) {
        patchConfig({
          elementOrder: insertElementInOrder(resolveElementOrder(c), key, hint.targetKey, hint.before),
          elementLayout: unpinElement(c.elementLayout, key),
        });
      }
      selectByStyleKey(key);
      return;
    }
    if (hint?.mode === "insert" && hint.targetKey !== key) {
      patchConfig({
        elementOrder: insertElementInOrder(resolveElementOrder(c), key, hint.targetKey, hint.before),
        elementLayout: unpinElement(c.elementLayout, key),
      });
    } else {
      const screen = previewScreenNode(event.currentTarget).getBoundingClientRect();
      const rawX = ((event.clientX - screen.left) / Math.max(screen.width, 1)) * 100;
      const rawY = ((event.clientY - screen.top) / Math.max(screen.height, 1)) * 100;
      const snapped = snapToCanvas(event.currentTarget, rawX, rawY, key);
      patchConfig({
        elementLayout: setElementFreePosition(c.elementLayout, key, snapped.x, snapped.y),
      });
    }
    selectByStyleKey(key);
  }

  function previewScreenNode(root: HTMLElement) {
    return root.querySelector<HTMLElement>(".preview-site-intro, .preview-site-result, .preview-site-question, .preview-flow-intro, .preview-flow-result")
      || root.querySelector<HTMLElement>(".preview-site-card")
      || root;
  }

  function selectedToolboxFor(key: ElementStyleKey) {
    return toolboxItemsRef.current.find((row) => row.styleKey === key);
  }

  function deleteCanvasElement(key: ElementStyleKey) {
    const item = selectedToolboxFor(key);
    if (!item || item.required) return;
    item.onToggle?.(false);
    patchConfig({ elementLayout: unpinElement(configRef.current.elementLayout, key) });
    clearCanvasSelection();
  }

  function commitHistorySnapshot() {
    ignoreHistoryRef.current = false;
    const snapshot = structuredClone(configRef.current);
    const last = historyRef.current[historyIndexRef.current];
    if (!last || JSON.stringify(last) !== JSON.stringify(snapshot)) {
      const past = historyRef.current.slice(0, historyIndexRef.current + 1);
      past.push(snapshot);
      if (past.length > 60) past.shift();
      historyRef.current = past;
      historyIndexRef.current = past.length - 1;
      setCanUndo(true);
      setCanRedo(false);
    }
  }

  function applyLiveLayout(key: ElementStyleKey, x: number, y: number, extra?: { w?: number; h?: number; rotate?: number }) {
    const nextExtra = isTextLayoutKey(key) ? { w: extra?.w, rotate: extra?.rotate, h: undefined } : extra;
    onProject({
      config: {
        ...configRef.current,
        elementLayout: setElementFreePosition(configRef.current.elementLayout, key, x, y, nextExtra),
      },
    });
  }

  function measureCanvasLayout(key: ElementStyleKey, node: HTMLElement, screen: DOMRect) {
    const existing = configRef.current.elementLayout?.[key];
    const rect = node.getBoundingClientRect();
    const x = existing?.x ?? ((rect.left + rect.width / 2 - screen.left) / Math.max(screen.width, 1)) * 100;
    const y = existing?.y ?? ((rect.top + rect.height / 2 - screen.top) / Math.max(screen.height, 1)) * 100;
    const rotate = existing?.rotate ?? 0;
    const w = existing?.w ?? (node.offsetWidth / Math.max(screen.width, 1)) * 100;
    const h = existing?.h ?? (node.offsetHeight / Math.max(screen.height, 1)) * 100;
    return { x, y, w, h, rotate, rect };
  }

  function handleChromeKeyboard(input: { key: string; shiftKey: boolean }) {
    const frame = previewFrameRef.current;
    if (!frame || !editingElement || isFlowLockedKey(editingElement)) return null;
    const key = editingElement;
    const node = frame.querySelector<HTMLElement>(`.preview-el-${key}`);
    if (!node) return null;
    const screen = previewScreenNode(frame).getBoundingClientRect();
    const measured = measureCanvasLayout(key, node, screen);
    const current = configRef.current.elementLayout?.[key] || { x: measured.x, y: measured.y, w: measured.w, h: measured.h, rotate: measured.rotate };
    const next = applyCanvasKeyAction(current, input);
    if (!next) return null;
    applyLiveLayout(key, next.x, next.y, { w: next.w, h: next.h, rotate: next.rotate ?? 0 });
    return `${ELEMENT_LABELS[key]}: ${Math.round(next.x)}%, ${Math.round(next.y)}%${next.rotate ? `, ${Math.round(next.rotate)}°` : ""}`;
  }

  function handleChromeTransformStart(handle: CanvasTransformHandle, event: React.PointerEvent<HTMLButtonElement>) {
    const frame = previewFrameRef.current;
    if (!frame || !editingElement || isFlowLockedKey(editingElement)) return;
    const key = editingElement;
    const node = frame.querySelector<HTMLElement>(`.preview-el-${key}`);
    if (!node) return;
    const screen = previewScreenNode(frame).getBoundingClientRect();
    const measured = measureCanvasLayout(key, node, screen);
    ignoreHistoryRef.current = true;
    setIsTransformingElement(true);
    if (handle === "rotate") {
      transformSessionRef.current = {
        kind: "rotate",
        key,
        pointerId: event.pointerId,
        originRotate: measured.rotate,
        startAngle: Math.atan2(
          event.clientY - (measured.rect.top + measured.rect.height / 2),
          event.clientX - (measured.rect.left + measured.rect.width / 2),
        ),
        originX: measured.x,
        originY: measured.y,
        originW: configRef.current.elementLayout?.[key]?.w,
        originH: configRef.current.elementLayout?.[key]?.h,
        centerX: measured.rect.left + measured.rect.width / 2,
        centerY: measured.rect.top + measured.rect.height / 2,
      };
      if (!configRef.current.elementLayout?.[key]) {
        applyLiveLayout(key, measured.x, measured.y);
      }
      return;
    }
    transformSessionRef.current = {
      kind: "resize",
      key,
      pointerId: event.pointerId,
      handle,
      originX: measured.x,
      originY: measured.y,
      originW: measured.w,
      originH: measured.h,
      rotate: measured.rotate,
      screen,
    };
  }

  function handleChromeTransformMove(event: React.PointerEvent<HTMLButtonElement>) {
    const session = transformSessionRef.current;
    if (!session || event.pointerId !== session.pointerId) return;
    if (session.kind === "resize") {
      const pointerX = ((event.clientX - session.screen.left) / Math.max(session.screen.width, 1)) * 100;
      const pointerY = ((event.clientY - session.screen.top) / Math.max(session.screen.height, 1)) * 100;
      const next = resizeElementFromHandle(
        { x: session.originX, y: session.originY, w: session.originW, h: session.originH, rotate: session.rotate },
        session.handle,
        pointerX,
        pointerY,
      );
      applyLiveLayout(session.key, next.x, next.y, { w: next.w, h: next.h, rotate: next.rotate ?? 0 });
      return;
    }
    const angle = Math.atan2(event.clientY - session.centerY, event.clientX - session.centerX);
    const rotate = rotateElementFromDrag(session.originRotate, session.startAngle, angle);
    applyLiveLayout(session.key, session.originX, session.originY, {
      w: session.originW,
      h: session.originH,
      rotate,
    });
  }

  function handleChromeTransformEnd(event?: React.PointerEvent<HTMLButtonElement> | PointerEvent) {
    const session = transformSessionRef.current;
    if (!session) return;
    if (event && "pointerId" in event && event.pointerId !== session.pointerId) return;
    transformSessionRef.current = null;
    skipTextEditRef.current = true;
    setIsTransformingElement(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    commitHistorySnapshot();
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (transformSessionRef.current) return;
    const target = event.target as HTMLElement;
    if (target.closest(".canvas-el-chrome, .editor-history-actions, .page-music-controls, .page-music-progress, .page-music-mute-fab")) return;
    const textField = target.closest<HTMLElement>(".inline-edit");
    if (textField && document.activeElement === textField && !skipTextEditRef.current) return;
    const key = keyFromPreviewElement(target);
    if (!key || key === "decorations") return;
    if (isFlowLockedKey(key)) {
      selectByStyleKey(key);
      return;
    }
    const node = target.closest<HTMLElement>(".preview-el");
    if (!node) return;
    if (textField) event.preventDefault();
    const screen = previewScreenNode(event.currentTarget).getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    moveSessionRef.current = {
      key,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: ((rect.left + rect.width / 2 - screen.left) / Math.max(screen.width, 1)) * 100,
      originY: ((rect.top + rect.height / 2 - screen.top) / Math.max(screen.height, 1)) * 100,
      screen,
      moved: false,
      textField,
      wasSelected: editingElementRef.current === key,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCanvasPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const session = moveSessionRef.current;
    if (!session || event.pointerId !== session.pointerId) return;
    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;
    if (!session.moved && dx * dx + dy * dy < 25) return;
    if (!session.moved) {
      session.moved = true;
      ignoreHistoryRef.current = true;
      setIsMovingElement(true);
      selectByStyleKey(session.key);
    }
    const rawX = session.originX + (dx / Math.max(session.screen.width, 1)) * 100;
    const rawY = session.originY + (dy / Math.max(session.screen.height, 1)) * 100;
    const hint = readDropHint(event.currentTarget, event.clientX, event.clientY, session.key);
    if (hint.mode === "insert") {
      setSnapGuides(null);
      publishDropHint(hint);
    } else {
      publishDropHint(null);
      const snapped = snapToCanvas(event.currentTarget, rawX, rawY, session.key);
      onProject({
        config: {
          ...configRef.current,
          elementLayout: setElementFreePosition(configRef.current.elementLayout, session.key, snapped.x, snapped.y),
        },
      });
      return;
    }
    onProject({
      config: {
        ...configRef.current,
        elementLayout: setElementFreePosition(configRef.current.elementLayout, session.key, rawX, rawY),
      },
    });
  }

  function handleCanvasPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const session = moveSessionRef.current;
    if (!session || event.pointerId !== session.pointerId) return;
    moveSessionRef.current = null;
    if (session.moved) {
      skipTextEditRef.current = true;
      const hint = dropHintRef.current;
      ignoreHistoryRef.current = false;
      setIsMovingElement(false);
      publishDropHint(null);
      let snapshot = structuredClone(configRef.current);
      setSnapGuides(null);
      if (hint?.mode === "insert" && hint.targetKey !== session.key) {
        snapshot = {
          ...snapshot,
          elementOrder: insertElementInOrder(resolveElementOrder(snapshot), session.key, hint.targetKey, hint.before),
          elementLayout: unpinElement(snapshot.elementLayout, session.key),
        };
        patchConfig({ elementOrder: snapshot.elementOrder, elementLayout: snapshot.elementLayout });
      }
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      const last = historyRef.current[historyIndexRef.current];
      if (!last || JSON.stringify(last) !== JSON.stringify(snapshot)) {
        const past = historyRef.current.slice(0, historyIndexRef.current + 1);
        past.push(snapshot);
        if (past.length > 60) past.shift();
        historyRef.current = past;
        historyIndexRef.current = past.length - 1;
        setCanUndo(true);
        setCanRedo(false);
      }
      return;
    }
    selectByStyleKey(session.key);
    if (skipTextEditRef.current) {
      skipTextEditRef.current = false;
      return;
    }
    if (session.wasSelected && session.textField) {
      session.textField.focus();
    }
  }

  function syncHistoryButtons() {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }

  function applyHistoryConfig(next: TemplateConfig) {
    skipHistoryRef.current += 1;
    onProject({ config: structuredClone(next) });
    syncHistoryButtons();
  }

  function undoHistory() {
    if (historyIndexRef.current <= 0) return;
    window.clearTimeout(historyTimerRef.current);
    historyIndexRef.current -= 1;
    applyHistoryConfig(historyRef.current[historyIndexRef.current]);
  }

  function redoHistory() {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    window.clearTimeout(historyTimerRef.current);
    historyIndexRef.current += 1;
    applyHistoryConfig(historyRef.current[historyIndexRef.current]);
  }

  function selectByStyleKey(key: ElementStyleKey) {
    const item = visibleToolboxItems.find((row) => row.styleKey === key) || toolboxItems.find((row) => row.styleKey === key);
    setEditingElement(key);
    setToolboxTab("elements");
    if (item) setSelectedToolboxId(item.id);
  }

  function clearCanvasSelection() {
    setEditingElement(null);
    setSelectedToolboxId(null);
  }

  function handlePreviewBackgroundPointer(event: React.MouseEvent<HTMLDivElement>) {
    if (!editingElement) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest(".preview-el, .canvas-el-chrome, .editor-history-actions")) return;
    clearCanvasSelection();
  }

  function elementEnabled(definition: ElementDefinition) {
    const customBlock = customBlockForElement(definition.key);
    if (isCustomBlank && customBlock && !previewBlockEnabled(customBlock)) return false;
    if (!definition.visibilityKey) return true;
    return (c as unknown as Record<string, unknown>)[definition.visibilityKey] !== false;
  }

  function toggleElement(definition: ElementDefinition, value: boolean) {
    const customBlock = customBlockForElement(definition.key);
    if (isCustomBlank && customBlock && previewBlockEnabled(customBlock) !== value) toggleCustomBlock(customBlock);
    if (definition.visibilityKey) updateFeature(definition.visibilityKey, value);
  }

  function featureScreen(feature: TemplateFeature): PreviewScreen {
    if (featureBelongsToStage(feature, "questions")) return "question";
    if (featureBelongsToStage(feature, "completion")) return "result";
    return "intro";
  }

  function screenLabel(screen: PreviewScreen) {
    if (screen === "question") return "שאלות";
    if (screen === "result") return "סיום";
    if (screen === "all") return "כל העמוד";
    return "פתיחה";
  }

  function clipLiveText(value: string, max = 36) {
    const text = value.replace(/\s+/g, " ").trim();
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }

  function elementLiveText(key: ElementStyleKey, screen: PreviewScreen) {
    const question = c.questions[previewQuestion] || c.questions[0];
    if (key === "introLabel") return clipLiveText(c.introLabel);
    if (key === "emoji") return c.emoji || "";
    if (key === "greeting") return clipLiveText(`שלום ${c.recipient}`.trim() + ",");
    if (key === "headline") return clipLiveText(c.headline);
    if (key === "subtitle") return clipLiveText(c.subtitle, 42);
    if (key === "highlights") return clipLiveText((c.highlights || []).filter(Boolean).join(" · "));
    if (key === "primaryButton") {
      if (screen === "question") {
        return clipLiveText(previewQuestion === c.questions.length - 1 ? c.finalButtonText : "לשאלה הבאה");
      }
      return clipLiveText(c.startText);
    }
    if (key === "decorations") return clipLiveText((c.decorations || []).slice(0, 4).join(" "));
    if (key === "question") return clipLiveText(question?.prompt || "");
    if (key === "options") return clipLiveText((question?.options || []).filter(Boolean).join(" · "));
    if (key === "resultLabel") return clipLiveText(c.resultLabel);
    if (key === "resultTitle") return clipLiveText(c.successTitle);
    if (key === "resultText") return clipLiveText(c.successText, 42);
    if (key === "shareButtons") return clipLiveText(c.buttonText);
    if (key === "venue") return clipLiveText(c.venueName || "");
    if (key === "countdown" || key === "calendar") return clipLiveText(c.eventDate || "");
    if (key === "scratch") return clipLiveText(scratchSecretText(c));
    if (key === "musicPlayer") return clipLiveText(c.musicYoutubeUrl || "קישור יוטיוב");
    return "";
  }

  function elementLiveIcon(key: ElementStyleKey, fallback: string) {
    if (key === "emoji") return c.emoji || fallback;
    if (key === "decorations") return c.decorations?.[0] || fallback;
    return fallback;
  }

  function jumpToScreen(screen: PreviewScreen, showPreview = false) {
    if (screen === "intro") {
      setPreviewScreen("intro");
      setSection("opening");
    } else if (screen === "question") {
      setPreviewQuestion(questionIndex);
      setPreviewScreen("question");
      setSection("questions");
    } else if (screen === "result") {
      setPreviewScreen("result");
      setSection("completion");
    } else {
      setPreviewScreen("all");
    }
    if (showPreview) setMobilePane("preview");
  }

  const toolboxItems: ToolboxItem[] = (() => {
    const items: ToolboxItem[] = [];

    function addDefinition(definition: ElementDefinition, screen: PreviewScreen) {
      const required = Boolean(definition.required && !(isCustomBlank && definition.key === "question"));
      items.push({
        id: `el:${screen}:${definition.key}`,
        icon: elementLiveIcon(definition.key, definition.icon),
        title: definition.title,
        description: definition.description,
        liveText: elementLiveText(definition.key, screen) || undefined,
        enabled: elementEnabled(definition),
        required,
        group: elementGroup(definition.key),
        screen,
        screenLabel: screenLabel(screen),
        styleKey: definition.key,
        lockedFeature: lockFeature(profile.plan, featureForElementKey(definition.key) || (definition.visibilityKey ? featureForConfigKey(String(definition.visibilityKey)) : null)),
        onToggle: required ? undefined : (value) => toggleElement(definition, value),
      });
    }

    function addNavBundle(screen: PreviewScreen) {
      items.push({
        id: "bundle:nav",
        icon: "📍",
        title: "יומן וניווט",
        description: "יומן במכשיר, ווייז ומפות",
        liveText: clipLiveText([c.eventDate, c.venueName].filter(Boolean).join(" · ")) || undefined,
        enabled: Boolean(c.showCalendar || c.showAppleCalendar || c.showWaze || c.showGoogleMaps),
        group: "place",
        screen,
        screenLabel: screenLabel(screen),
        styleKey: "calendar",
        lockedFeature: lockFeature(profile.plan, "calendarNav"),
        onToggle: (value) => {
          if (value && isCustomBlank && !previewBlockEnabled("location")) toggleCustomBlock("location");
          patchConfig({
            showCalendar: value,
            showAppleCalendar: value ? Boolean(c.showAppleCalendar) : false,
            showWaze: value,
            showGoogleMaps: value ? Boolean(c.showGoogleMaps) : false,
          });
        },
      });
    }

    function addShareBundle(screen: PreviewScreen) {
      items.push({
        id: "bundle:share",
        icon: "📲",
        title: "שיתוף ותגובה",
        description: "וואטסאפ, טלגרם והעתקה",
        liveText: clipLiveText(c.buttonText) || undefined,
        enabled: c.showWhatsApp !== false || c.showTelegram === true || c.showCopy === true,
        group: "share",
        screen,
        screenLabel: screenLabel(screen),
        styleKey: "shareButtons",
        onToggle: (value) => {
          if (value && isCustomBlank && !previewBlockEnabled("share")) toggleCustomBlock("share");
          patchConfig({ showWhatsApp: value, showTelegram: value ? Boolean(c.showTelegram) : false, showCopy: value ? Boolean(c.showCopy) : false });
        },
      });
    }

    OPENING_ELEMENTS.forEach((definition) => addDefinition(definition, "intro"));
    QUESTION_ELEMENTS.forEach((definition) => addDefinition(definition, "question"));
    COMPLETION_ELEMENTS.forEach((definition) => addDefinition(definition, "result"));

    if (!isCustomBlank) {
      const extras = templateFeatures.filter((feature) => !CORE_FEATURE_KEYS.includes(feature.key as (typeof CORE_FEATURE_KEYS)[number]));
      if (extras.some((feature) => (NAV_FEATURE_KEYS as readonly string[]).includes(feature.key))) addNavBundle("intro");
      if (extras.some((feature) => (SHARE_FEATURE_KEYS as readonly string[]).includes(feature.key))) addShareBundle("result");
      extras
        .filter((feature) => !(NAV_FEATURE_KEYS as readonly string[]).includes(feature.key) && !(SHARE_FEATURE_KEYS as readonly string[]).includes(feature.key))
        .forEach((feature) => {
          const screen = featureScreen(feature);
          items.push({
            id: `feat:${feature.key}`,
            icon: feature.icon,
            title: feature.label,
            description: feature.description,
            liveText: elementLiveText(featureStyleKey(feature.key), screen) || undefined,
            enabled: featureEnabled(feature),
            unique: true,
            group: featureGroup(feature.key),
            screen,
            screenLabel: screenLabel(screen),
            styleKey: featureStyleKey(feature.key),
            lockedFeature: lockFeature(profile.plan, featureForConfigKey(feature.key) || featureForElementKey(featureStyleKey(feature.key))),
            onToggle: (value) => updateFeature(feature.key, value),
          });
        });
    } else {
      ([
        ["showWaxEnvelope", "waxEnvelope", "💌", "מעטפת שעווה", "פתיחה חגיגית לפני הצגת התוכן", "intro"],
        ["showMemoriesSlider", "memories", "📸", "מצגת זיכרונות", "מעבר בין רגעים וסיפורים קצרים", "intro"],
        ["showCountdown", "countdown", "⏱️", "ספירה לאחור", "טיימר חי עד מועד האירוע", "intro"],
        ["showVenueCard", "venue", "🎟️", "כרטיס מקום", "תאריך, מקום ופרטי הגעה", "intro"],
        ["showGuests", "guestCounter", "👥", "מונה אורחים", "בחירת כמות אורחים בצורה נוחה", "question"],
        ["showDjSong", "djSong", "🎵", "בקשת שיר", "שדה פתוח לשיר שהמבקר רוצה", "question"],
        ["showVoucher", "voucher", "🎁", "שובר מתנה", "כרטיס עם קוד מימוש ופרטים", "result"],
        ["showCandle", "candle", "🕯️", "כיבוי הנר", "לוחצים על הנר ופותחים את הברכה", "result"],
        ["showScratchCard", "scratch", "🪄", "כרטיס גירוד", "חשיפת ההפתעה בצורה משחקית", "result"],
        ["showMusicPlayer", "musicPlayer", "♫", "נגן מוזיקה", "נגן על העמוד מקישור יוטיוב", "intro"],
        ["showAnswerRecap", "answerRecap", "✓", "סיכום תשובות", "הצגת הבחירות במסך הסיום", "result"],
      ] as const).forEach(([visibilityKey, styleKey, icon, title, description, screen]) => {
        items.push({
          id: `extra:${visibilityKey}`,
          icon,
          title,
          description,
          liveText: elementLiveText(styleKey, screen) || undefined,
          enabled: Boolean(c[visibilityKey]),
          unique: true,
          group: elementGroup(styleKey),
          screen,
          screenLabel: screenLabel(screen),
          styleKey,
          lockedFeature: lockFeature(profile.plan, featureForConfigKey(visibilityKey) || featureForElementKey(styleKey)),
          onToggle: (value) => {
            if (value) {
              const block = styleKey === "guestCounter" || styleKey === "djSong" ? "questions"
                : styleKey === "countdown" || styleKey === "venue" ? "location"
                : styleKey === "answerRecap" ? "answers"
                : null;
              if (block && !previewBlockEnabled(block)) toggleCustomBlock(block);
            }
            onConfig(visibilityKey, value);
          },
        });
      });
      addNavBundle("intro");
      addShareBundle("result");
    }

    return items;
  })();

  useEffect(() => {
    toolboxItemsRef.current = toolboxItems;
  });

  const visibleToolboxItems = previewScreen === "all"
    ? toolboxItems
    : toolboxItems.filter((item) => item.screen === previewScreen);

  function renderLockedPreview(screen: PreviewScreen) {
    const items = toolboxItems.filter((item) => item.lockedFeature && item.screen === screen);
    if (!items.length) return null;
    return (
      <div className="plan-lock-preview-row">
        {items.map((item) => (
          <PlanLockChip key={item.id} icon={item.icon} title={item.title} feature={item.lockedFeature!} plan={profile.plan} onUnlock={onRequirePlan} />
        ))}
      </div>
    );
  }

  useEffect(() => {
    if (!editingElement) return;
    document.querySelector(".visual-editor .is-canvas-selected")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [editingElement, previewScreen]);

  useEffect(() => {
    transformEndRef.current = handleChromeTransformEnd;
  });

  // Deep links such as /studio/[id]?tab=page#rsvp-settings open the matching toolbox panel.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requested = new URLSearchParams(window.location.search).get("tab");
      if (requested !== "design" && requested !== "page") return;
      setToolboxTab(requested);
      if (window.location.hash) {
        window.requestAnimationFrame(() => {
          const target = document.getElementById(window.location.hash.slice(1));
          if (target instanceof HTMLDetailsElement) target.open = true;
          target?.scrollIntoView({ block: "center" });
        });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function endExternalDrag() {
      clearDropUi();
    }
    function endTransform(event: PointerEvent) {
      if (!transformSessionRef.current) return;
      transformEndRef.current(event);
    }
    window.addEventListener("dragend", endExternalDrag);
    window.addEventListener("pointerup", endTransform);
    window.addEventListener("pointercancel", endTransform);
    return () => {
      window.removeEventListener("dragend", endExternalDrag);
      window.removeEventListener("pointerup", endTransform);
      window.removeEventListener("pointercancel", endTransform);
    };
  }, []);

  useEffect(() => {
    if (ignoreHistoryRef.current || skipHistoryRef.current > 0) {
      if (skipHistoryRef.current > 0) skipHistoryRef.current -= 1;
      return;
    }
    window.clearTimeout(historyTimerRef.current);
    historyTimerRef.current = window.setTimeout(() => {
      const snapshot = structuredClone(c);
      const last = historyRef.current[historyIndexRef.current];
      if (last && JSON.stringify(last) === JSON.stringify(snapshot)) return;
      const past = historyRef.current.slice(0, historyIndexRef.current + 1);
      past.push(snapshot);
      if (past.length > 60) past.shift();
      historyRef.current = past;
      historyIndexRef.current = past.length - 1;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(false);
    }, 350);
    return () => window.clearTimeout(historyTimerRef.current);
  }, [c]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target?.closest("input, textarea, [contenteditable='true']"));
      if ((event.key === "Backspace" || event.key === "Delete") && !typing && editingElement && editingElement !== "decorations") {
        const item = selectedToolboxFor(editingElement);
        if (item && !item.required) {
          event.preventDefault();
          deleteCanvasElement(editingElement);
        }
        return;
      }
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (typing) return;
      if (event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        redoHistory();
      } else if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoHistory();
      } else if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redoHistory();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function selectToolboxItem(id: string) {
    const item = toolboxItems.find((row) => row.id === id);
    if (!item) return;
    if (item.lockedFeature) {
      onRequirePlan(item.lockedFeature);
      return;
    }
    const closing = selectedToolboxId === id;
    setSelectedToolboxId(closing ? null : id);
    setEditingElement(closing ? null : item.styleKey || null);
    setToolboxTab("elements");
    if (!closing && previewScreen !== "all" && previewScreen !== item.screen) jumpToScreen(item.screen);
  }

  function toggleToolboxItem(id: string, enabled: boolean) {
    const item = toolboxItems.find((row) => row.id === id);
    if (item?.lockedFeature) {
      onRequirePlan(item.lockedFeature);
      return;
    }
    item?.onToggle?.(enabled);
  }

  function inspectorContentFields(key: ElementStyleKey, screen: PreviewScreen): ElementContentField[] {
    const question = c.questions[previewQuestion] || c.questions[0];
    if (key === "introLabel") return [{ label: "טקסט", value: c.introLabel, maxLength: 80, placeholder: "תווית עליונה", onChange: (value) => onConfig("introLabel", value) }];
    if (key === "greeting") return [{
      label: "השם בברכה",
      value: c.recipient,
      maxLength: 80,
      placeholder: "שירה",
      onChange: (value) => onConfig("recipient", value),
    }];
    if (key === "headline") return [{ label: "טקסט", value: c.headline, maxLength: 120, placeholder: "הכותרת שרואים", onChange: (value) => onConfig("headline", value) }];
    if (key === "subtitle") return [{ label: "טקסט", value: c.subtitle, maxLength: 320, multiline: true, placeholder: "התיאור שרואים", onChange: (value) => onConfig("subtitle", value) }];
    if (key === "primaryButton") {
      if (screen === "question") {
        return [{ label: "טקסט", value: c.finalButtonText, maxLength: 80, placeholder: "טקסט הסיום", onChange: (value) => onConfig("finalButtonText", value) }];
      }
      return [{ label: "טקסט", value: c.startText, maxLength: 80, placeholder: "טקסט הכפתור", onChange: (value) => onConfig("startText", value) }];
    }
    if (key === "question" && question) {
      return [
        { label: "השאלה", value: question.prompt, maxLength: 140, placeholder: "כתבו את השאלה", onChange: (value) => updateQuestion(previewQuestion, { prompt: value }) },
        { label: "הסבר", value: question.helper, maxLength: 240, multiline: true, placeholder: "רמז קטן, לא חובה", onChange: (value) => updateQuestion(previewQuestion, { helper: value }) },
      ];
    }
    if (key === "options" && question) {
      return question.options.map((option, index) => ({
        label: `אפשרות ${index + 1}`,
        value: option,
        maxLength: 120,
        placeholder: `אפשרות ${index + 1}`,
        onChange: (value: string) => updateQuestionOption(previewQuestion, index, value),
      }));
    }
    if (key === "resultLabel") return [{ label: "טקסט", value: c.resultLabel, maxLength: 80, placeholder: "תווית הסיום", onChange: (value) => onConfig("resultLabel", value) }];
    if (key === "resultTitle") return [{ label: "טקסט", value: c.successTitle, maxLength: 140, placeholder: "כותרת הסיום", onChange: (value) => onConfig("successTitle", value) }];
    if (key === "resultText") return [{ label: "טקסט", value: c.successText, maxLength: 700, multiline: true, placeholder: "הודעת הסיום", onChange: (value) => onConfig("successText", value) }];
    if (key === "shareButtons") return [{ label: "טקסט", value: c.buttonText, maxLength: 80, placeholder: "טקסט השיתוף", onChange: (value) => onConfig("buttonText", value) }];
    if (key === "venue") return [
      { label: "שם המקום", value: c.venueName || "", maxLength: 80, placeholder: "חוות רונית, השרון", onChange: (value) => onConfig("venueName", value) },
      { label: "תאריך ושעה", value: c.eventStartsAt || c.eventDate || "", maxLength: 40, placeholder: "2026-09-18T19:30", onChange: (value) => onConfig("eventStartsAt", value) },
    ];
    if (key === "memories") {
      return memorySlides().flatMap((slide, index) => [
        { label: `שקופית ${index + 1} · סמל`, value: slide.icon, maxLength: 8, placeholder: "סמל הרגע", onChange: (value: string) => updateMemorySlide(index, { icon: value }) },
        { label: `שקופית ${index + 1} · כותרת`, value: slide.title, maxLength: 80, placeholder: "כותרת הרגע", onChange: (value: string) => updateMemorySlide(index, { title: value }) },
        { label: `שקופית ${index + 1} · טקסט`, value: slide.text, maxLength: 240, multiline: true, placeholder: "כמה מילים על הרגע", onChange: (value: string) => updateMemorySlide(index, { text: value }) },
      ]);
    }
    if (key === "scratch") return [
      { label: "טקסט הכיסוי", value: c.scratchCover ?? "", maxLength: 80, placeholder: SCRATCH_COVER_PLACEHOLDER, onChange: (value) => onConfig("scratchCover", value) },
      { label: "ההפתעה בפנים", value: c.scratchSecret ?? "", maxLength: 140, placeholder: SCRATCH_SECRET_PLACEHOLDER, onChange: (value) => onConfig("scratchSecret", value) },
    ];
    return [];
  }

  function renderToolboxInspector() {
    const item = toolboxItems.find((row) => row.id === selectedToolboxId);
    if (!item) return null;
    const styleKey = item.styleKey;
    const extraKey = item.id.replace(/^(el:intro:|el:question:|el:result:|feat:|extra:|block:|bundle:)/, "");
    return <section className="toolbox-inspector">
      <header><span>{item.icon}</span><div><b>{item.title}</b><small>מסומן בעמוד החי</small></div></header>
      {item.id === "bundle:nav" && <div className="toolbox-mini-toggles">
        <label><input type="checkbox" checked={Boolean(c.showCalendar)} onChange={(event) => onConfig("showCalendar", event.target.checked)} /> Google</label>
        <label><input type="checkbox" checked={Boolean(c.showAppleCalendar)} onChange={(event) => onConfig("showAppleCalendar", event.target.checked)} /> Apple</label>
        <label><input type="checkbox" checked={Boolean(c.showWaze)} onChange={(event) => onConfig("showWaze", event.target.checked)} /> ווייז</label>
        <label><input type="checkbox" checked={Boolean(c.showGoogleMaps)} onChange={(event) => onConfig("showGoogleMaps", event.target.checked)} /> מפות</label>
      </div>}
      {item.id === "bundle:share" && <div className="toolbox-mini-toggles">
        <label><input type="checkbox" checked={c.showWhatsApp !== false} onChange={(event) => onConfig("showWhatsApp", event.target.checked)} /> וואטסאפ</label>
        <label><input type="checkbox" checked={Boolean(c.showTelegram)} onChange={(event) => onConfig("showTelegram", event.target.checked)} /> טלגרם</label>
        <label><input type="checkbox" checked={Boolean(c.showCopy)} onChange={(event) => onConfig("showCopy", event.target.checked)} /> העתקה</label>
      </div>}
      {(styleKey === "emoji" || extraKey === "emoji") && <>
        <EmojiImageField imageUrl={pageEmojiUrl} uploading={emojiUploading} error={emojiUploadError} onUpload={uploadPageEmoji} onRemove={removePageEmoji} photosLocked={!canUsePhotos(profile.plan)} onUnlockPhotos={() => onRequirePlan("photos")} />
        <EmojiPicker value={c.emoji} onChange={(next) => onProject({ config: { ...c, emoji: String(next), emojiImageVersion: 0 } })} />
      </>}
      {(styleKey === "decorations" || extraKey === "showFallingEmojis") && <>
        <EmojiPicker multiple value={c.decorations} onChange={(next) => onConfig("decorations", Array.isArray(next) ? next : [next])} />
        <p className="emoji-picker-hint">עד שמונה אימוג׳ים שזזים ברקע.</p>
        <DecorationMotionControls
          from={c.decorationFrom}
          to={c.decorationTo}
          count={c.decorationCount}
          speed={c.decorationSpeed}
          onFrom={(value) => onConfig("decorationFrom", value)}
          onTo={(value) => onConfig("decorationTo", value)}
          onCount={(value) => onConfig("decorationCount", value)}
          onSpeed={(value) => onConfig("decorationSpeed", value)}
        />
      </>}
      {styleKey === "question" && questionWidgetField(previewQuestion)}
      {styleKey === "memories" && memoryPhotoFields()}
      {styleKey && styleKey !== "decorations" ? <details className="toolbox-style-fold" open>
        <summary>תוכן, צבעים וגודל</summary>
        <ElementStyleEditor
          elementKey={styleKey}
          title={item.title}
          style={getElementStyle(styleKey)}
          content={inspectorContentFields(styleKey, item.screen)}
          onChange={(patch) => updateElementStyle(styleKey, patch)}
          onReset={() => resetElementStyle(styleKey)}
        />
        {elementHasFreeLayout(c, styleKey) ? (
          <button type="button" className="toolbox-reset-layout" onClick={() => patchConfig({ elementLayout: unpinElement(c.elementLayout, styleKey) })}>
            החזרה למיקום הרגיל
          </button>
        ) : null}
      </details> : null}
      {(extraKey === "highlights" || styleKey === "highlights") && <div className="toolbox-extra-fields">
        <b>פרטים חשובים</b>
        {c.highlights.map((highlight, index) => <div className="toolbox-inline-row" key={index}><input value={highlight} maxLength={80} aria-label={`פרט חשוב ${index + 1}`} placeholder={index === 0 ? "תאריך או שעה" : "מקום או פרט"} onChange={(event) => updateHighlight(index, event.target.value)} /><button type="button" onClick={() => removeHighlight(index)} aria-label={`מחיקת פרט ${index + 1}`}>×</button></div>)}
        <button type="button" className="toolbox-extra-add" disabled={c.highlights.length >= 5} onClick={addHighlight}>הוסף</button>
      </div>}
      {(styleKey === "countdown" || styleKey === "venue" || styleKey === "calendar" || extraKey === "showCountdown" || extraKey === "showVenueCard") && <div className="toolbox-extra-fields">
        <b>תאריך, מקום וניווט</b>
        <label>תאריך ושעת התחלה<input type="datetime-local" value={(c.eventStartsAt || "").slice(0, 16)} onChange={(event) => onConfig("eventStartsAt", event.target.value)} /></label>
        <label>תאריך ושעת סיום<input type="datetime-local" value={(c.eventEndsAt || "").slice(0, 16)} onChange={(event) => onConfig("eventEndsAt", event.target.value)} /></label>
        <label>אזור זמן<select value={c.eventTimezone || "Asia/Jerusalem"} onChange={(event) => onConfig("eventTimezone", event.target.value)}>{EVENT_TIMEZONE_OPTIONS.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}</select></label>
        <label>שם המקום<input value={c.venueName || ""} maxLength={80} placeholder="חוות רונית, השרון" onChange={(event) => onConfig("venueName", event.target.value)} /></label>
        <label>קישור לווייז<input value={c.wazeUrl || ""} maxLength={300} placeholder="https://waze.com/ul?..." onChange={(event) => onConfig("wazeUrl", event.target.value)} /></label>
        <label>קישור למפות<input value={c.googleMapsUrl || ""} maxLength={500} placeholder="https://maps.google.com/?q=..." onChange={(event) => onConfig("googleMapsUrl", event.target.value)} /></label>
      </div>}
      {(styleKey === "voucher" || extraKey === "showVoucher") && <div className="toolbox-extra-fields">
        <b>תוכן השובר</b>
        <label>כותרת<input value={c.voucherTitle || ""} maxLength={100} placeholder="שובר ספא זוגי" onChange={(event) => onConfig("voucherTitle", event.target.value)} /></label>
        <label>קוד מימוש<input value={c.voucherCode || ""} maxLength={40} placeholder="LINKLI-GIFT-2026" onChange={(event) => onConfig("voucherCode", event.target.value)} /></label>
        <label>תנאים<textarea value={c.voucherTerms || ""} maxLength={200} placeholder="בתוקף לשנה · בתיאום מראש" onChange={(event) => onConfig("voucherTerms", event.target.value)} /></label>
      </div>}
      {(styleKey === "guestCounter" || extraKey === "showGuests") && <div className="toolbox-extra-fields">
        <label>מקסימום אורחים<input type="number" min={1} max={20} value={c.maxGuests ?? 10} onChange={(event) => onConfig("maxGuests", Math.min(20, Math.max(1, Number(event.target.value) || 1)))} /></label>
      </div>}
      {(styleKey === "musicPlayer" || extraKey === "showMusicPlayer") && <div className="toolbox-extra-fields">
        <b>מוזיקה</b>
        <label>קישור יוטיוב<input dir="ltr" value={c.musicYoutubeUrl || ""} maxLength={300} placeholder="https://youtu.be/…" onChange={(event) => onConfig("musicYoutubeUrl", event.target.value)} /></label>
        <button type="button" className="toolbox-extra-save" disabled={saving} onClick={onSave}>{saving ? "שומר…" : "שמירה"}</button>
      </div>}
      {(styleKey === "shareButtons" || extraKey === "showWhatsApp") && <div className="toolbox-extra-fields">
        <b>וואטסאפ</b>
        <label>
          <span className="toolbox-field-heading">
            מספר טלפון
            <span className="field-hover-tip">
              <button type="button" aria-label="מידע על מספר הטלפון">i</button>
              <span role="tooltip">המספר נשמר בעמוד כדי שהאורחים יוכלו לכתוב אליכם בוואטסאפ.</span>
            </span>
          </span>
          <div className="phone-field" dir="ltr"><span>🇮🇱 +972</span><input type="tel" value={toDisplayPhone(c.whatsapp)} maxLength={14} placeholder="050-123-4567" inputMode="numeric" dir="ltr" onChange={(event) => onConfig("whatsapp", toNormalizedPhone(event.target.value))} /></div>
        </label>
        <label>טקסט על הכפתור<input value={c.buttonText} maxLength={80} placeholder="שליחת האישור" onChange={(event) => onConfig("buttonText", event.target.value)} /></label>
        <label>הודעה<textarea value={c.whatsappText} maxLength={500} placeholder="הטקסט שלפני סיכום התשובות" onChange={(event) => onConfig("whatsappText", event.target.value)} /></label>
      </div>}
    </section>;
  }

  function renderElementPanel(title: string, helper: string, definitions: ElementDefinition[]) {
    const activeDefinition = definitions.find((item) => item.key === editingElement);
    return <section className="editor-elements-panel full">
      <div className="elements-panel-heading"><div><span>שליטה בזמן אמת</span><h3>{title}</h3><p>{helper}</p></div><strong>{definitions.filter(elementEnabled).length}/{definitions.length}</strong></div>
      <div className="element-control-grid">{definitions.map((definition) => {
        const required = Boolean(definition.required && !(isCustomBlank && definition.key === "question"));
        return <ElementControlCard
          key={definition.key}
          icon={definition.icon}
          title={definition.title}
          description={definition.description}
          enabled={elementEnabled(definition)}
          required={required}
          editing={editingElement === definition.key}
          lockedFeature={lockFeature(profile.plan, featureForElementKey(definition.key) || (definition.visibilityKey ? featureForConfigKey(String(definition.visibilityKey)) : null))}
          plan={profile.plan}
          onUnlock={onRequirePlan}
          onToggle={(value) => toggleElement(definition, value)}
          onEdit={() => setEditingElement((current) => current === definition.key ? null : definition.key)}
        />;
      })}</div>
      {activeDefinition && <ElementStyleEditor
        elementKey={activeDefinition.key}
        title={activeDefinition.title}
        style={getElementStyle(activeDefinition.key)}
        onChange={(patch) => updateElementStyle(activeDefinition.key, patch)}
        onReset={() => resetElementStyle(activeDefinition.key)}
      />}
    </section>;
  }

  function renderFeaturePanel(stage: FeatureStage) {
    if (isCustomBlank) return null;
    const features = templateFeatures.filter((feature) => featureBelongsToStage(feature, stage) && !CORE_FEATURE_KEYS.includes(feature.key as typeof CORE_FEATURE_KEYS[number]));
    if (!features.length) return null;
    const stageCopy = stage === "opening"
      ? { eyebrow: "ייחודי לתבנית הזו", title: "בונים את הפתיחה", helper: "הפעילו רק את החוויה שמתאימה לעמוד הזה. את התוכן שלה עורכים כאן, באותו שלב." }
      : stage === "questions"
        ? { eyebrow: "ייחודי לשאלות", title: "מעצבים את הדרך לתשובה", helper: "כל תבנית מציגה שאלות שונות. אפשר להפעיל כאן את השדות המיוחדים שלה." }
        : { eyebrow: "ייחודי לסיום", title: "מתאימים את הרגע האחרון", helper: "הגדירו מה המבקר יראה ויוכל לעשות כשהוא מסיים את העמוד." };
    return <div className="template-feature-panel contextual-feature-panel">
      <div className="feature-section-heading"><div><span>{stageCopy.eyebrow}</span><h3>{stageCopy.title}</h3><p>{stageCopy.helper}</p></div><strong>{features.filter(featureEnabled).length}/{features.length}</strong></div>
      <div className="element-control-grid">{features.map((feature) => {
        const styleKey = featureStyleKey(feature.key);
        return <ElementControlCard
          key={feature.key}
          icon={feature.icon}
          title={feature.label}
          description={feature.description}
          enabled={featureEnabled(feature)}
          editing={editingElement === styleKey}
          lockedFeature={lockFeature(profile.plan, featureForConfigKey(feature.key) || featureForElementKey(styleKey))}
          plan={profile.plan}
          onUnlock={onRequirePlan}
          onToggle={(value) => updateFeature(feature.key, value)}
          onEdit={() => setEditingElement((current) => current === styleKey ? null : styleKey)}
        />;
      })}</div>
      {editingElement && features.some((feature) => featureStyleKey(feature.key) === editingElement) && <ElementStyleEditor
        elementKey={editingElement}
        title={features.find((feature) => featureStyleKey(feature.key) === editingElement)?.label || "האלמנט"}
        style={getElementStyle(editingElement)}
        content={inspectorContentFields(editingElement, stage === "questions" ? "question" : stage === "completion" ? "result" : "intro")}
        onChange={(patch) => updateElementStyle(editingElement, patch)}
        onReset={() => resetElementStyle(editingElement)}
      />}
    </div>;
  }

  function renderPreviewOpeningSpecials() {
    return <>
      {c.showWaxEnvelope === true && <div className={previewElementClass("waxEnvelope", "preview-special-card preview-wax-card")} style={previewElementStyle("waxEnvelope")}><span>💌</span><b>מכתב אישי מהלב</b><small>לחצו לפתיחת חותם השעווה</small></div>}
      {c.showCountdown && previewBlockEnabled("location") && <div className={previewElementClass("countdown", "preview-special-card preview-countdown-card")} style={previewElementStyle("countdown")}><span>⏱️ סופרים לאירוע</span><div><b>48<small>ימים</small></b><b>14<small>שעות</small></b><b>32<small>דקות</small></b></div></div>}
      {c.showVenueCard && previewBlockEnabled("location") && <div className={previewElementClass("venue", "preview-special-card preview-venue-card")} style={previewElementStyle("venue")}><span>🎟️ פרטי האירוע</span>{c.eventDate ? <p>📅 <b>{c.eventDate}</b></p> : null}{c.venueName ? <p>📍 <b>{c.venueName}</b></p> : null}</div>}
      {c.showMemoriesSlider === true && (() => {
        const slide = memorySlides()[0];
        return <div className={previewElementClass("memories", "preview-special-card preview-memory-card")} style={previewElementStyle("memories")}><span>{slide.icon}</span><b>{slide.title}</b><small>{slide.text}</small><i><em /><em className="active" /><em /></i></div>;
      })()}
      {c.showMusicPlayer === true && <div className={previewElementClass("musicPlayer", "preview-music-player")} style={previewElementStyle("musicPlayer")}><PageMusicPlayer /></div>}
    </>;
  }

  function renderPreviewQuestion(question: TemplateQuestion, questionPosition: number) {
    const showGuestCounter = c.showGuests === true && question.widget === "guest-count";
    return <div className="preview-flow-question" key={questionPosition}>
      <div className={previewElementClass("question", "preview-question-copy")} style={previewElementStyle("question")}><span className="preview-step-label">שאלה {questionPosition + 1}</span><InlineField as="h3" value={question.prompt} maxLength={140} placeholder="כתבו את השאלה" onChange={(value) => updateQuestion(questionPosition, { prompt: value })} /><InlineField as="p" value={question.helper} maxLength={240} placeholder="רמז קטן, לא חובה" onChange={(value) => updateQuestion(questionPosition, { helper: value })} /></div>
      {showGuestCounter ? <div className={previewElementClass("guestCounter", "preview-guest-counter")} style={previewElementStyle("guestCounter")}><button type="button">−</button><b>2<small>אורחים</small></b><button type="button">+</button><span>👤 👤</span></div>
        : <div className={previewElementClass("options", "preview-options")} style={previewElementStyle("options")}>{question.options.map((option, optionPosition) => <div role="button" tabIndex={0} aria-pressed={previewAnswers[questionPosition] === option} draggable className={`${previewAnswers[questionPosition] === option ? "selected" : ""}${optionDrag?.question === questionPosition && optionDrag.from === optionPosition ? " is-dragging" : ""}${optionDrag?.question === questionPosition && optionDrag.over === optionPosition && optionDrag.from !== optionPosition ? " is-drop-over" : ""}`.trim()} key={`${questionPosition}-${option}-${optionPosition}`} onClick={() => setPreviewAnswers((answers) => answers.map((value, index) => index === questionPosition ? option : value))} onPointerDown={(event) => event.stopPropagation()} onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(optionPosition)); setOptionDrag({ question: questionPosition, from: optionPosition, over: optionPosition }); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setOptionDrag((current) => current && current.question === questionPosition ? { ...current, over: optionPosition } : current); }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); const from = optionDrag?.question === questionPosition ? optionDrag.from : Number(event.dataTransfer.getData("text/plain")); moveQuestionOption(questionPosition, from, optionPosition); setOptionDrag(null); }} onDragEnd={() => setOptionDrag(null)}><span>{optionPosition + 1}</span><InlineField as="b" value={option} maxLength={120} placeholder={`אפשרות ${optionPosition + 1}`} onChange={(value) => updateQuestionOption(questionPosition, optionPosition, value)} /><i>✓</i><button type="button" className="preview-option-remove" disabled={question.options.length <= 2} aria-label={`מחיקת אפשרות ${optionPosition + 1}`} onClick={(event) => { event.stopPropagation(); removeQuestionOption(questionPosition, optionPosition); }} onPointerDown={(event) => event.stopPropagation()} onDragStart={(event) => event.preventDefault()}>×</button></div>)}</div>}
      {c.showDjSong === true && question.widget === "dj-song" && <div className={previewElementClass("djSong", "preview-dj-field")} style={previewElementStyle("djSong")}><label>🎵 בקשת שיר ל־DJ</label><input type="text" value="" readOnly placeholder="שם השיר והאמן..." /></div>}
    </div>;
  }

  function renderPreviewResultSpecials() {
    return <>
      {c.showVoucher === true && <div className={previewElementClass("voucher", "preview-special-card preview-voucher-card")} style={previewElementStyle("voucher")}><span>🎟️ שובר מתנה אישי</span><b>{c.voucherTitle || c.successTitle}</b><code>{c.voucherCode || "LINKLI-GIFT-2026"}</code><small>{c.voucherTerms}</small></div>}
      {c.showCandle === true && <div className={previewElementClass("candle", "preview-special-card preview-candle-card")} style={previewElementStyle("candle")}><span>🔥</span><b>לחצו על הנר</b></div>}
      {c.showScratchCard === true && <div className={previewElementClass("scratch", "preview-special-card preview-scratch-card")} style={previewElementStyle("scratch")}><InlineField value={c.scratchCover ?? ""} maxLength={80} placeholder={SCRATCH_COVER_PLACEHOLDER} onChange={(value) => onConfig("scratchCover", value)} /><InlineField as="b" value={c.scratchSecret ?? ""} maxLength={140} placeholder={SCRATCH_SECRET_PLACEHOLDER} onChange={(value) => onConfig("scratchSecret", value)} /></div>}
      {c.showMemoriesSlider === true && (() => {
        const slide = memorySlides()[memorySlides().length - 1];
        return <div className={previewElementClass("memories", "preview-special-card preview-memory-card")} style={previewElementStyle("memories")}><span>{slide.icon}</span><b>{slide.title}</b><small>{slide.text}</small><i><em /><em /><em className="active" /></i></div>;
      })()}
    </>;
  }

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return <div className="editor-workspace visual-editor">
    <div className="mobile-editor-switch" role="group" aria-label="בחירת אזור עבודה">
      <button type="button" className={mobilePane === "edit" ? "active" : ""} aria-pressed={mobilePane === "edit"} onClick={() => setMobilePane("edit")}>אלמנטים</button>
      <button type="button" className={mobilePane === "preview" ? "active" : ""} aria-pressed={mobilePane === "preview"} onClick={() => setMobilePane("preview")}>העמוד</button>
    </div>
    <div className="editor-grid editor-grid-guided">
      <EditorToolbox
        className={mobilePane === "edit" ? "mobile-active" : ""}
        templateName={templates.find((item) => item.id === project.templateId)?.name || "העמוד"}
        tab={toolboxTab}
        onTab={setToolboxTab}
        rows={visibleToolboxItems}
        selectedId={selectedToolboxId}
        onSelect={selectToolboxItem}
        onClose={clearCanvasSelection}
        onToggle={toggleToolboxItem}
        screenLabel={screenLabel(previewScreen)}
        plan={profile.plan}
        onUnlock={onRequirePlan}
        inspector={visibleToolboxItems.some((item) => item.id === selectedToolboxId) ? renderToolboxInspector() : null}
        design={<>
          <p className="editor-toolbox-lead">בחרו אווירה בלחיצה. אפשר לדייק צבעים אחרי זה.</p>
          <div className="toolbox-preset-grid" role="group" aria-label="בחירת אווירה">
            {DESIGN_PRESETS.map((preset) => {
              const selectedPreset = c.accent.toLowerCase() === preset.accent && c.accentSoft.toLowerCase() === preset.soft;
              return <button type="button" key={preset.id} className={selectedPreset ? "active" : ""} aria-pressed={selectedPreset} onClick={() => applyDesignPreset(preset)} style={{ "--preset-accent": preset.accent, "--preset-soft": preset.soft } as React.CSSProperties}>
                <span>{preset.icon}</span><b>{preset.name}</b><small>{preset.helper}</small>
              </button>;
            })}
          </div>
          <div className="toolbox-extra-fields">
            <label className="color-field"><span><b>צבע ראשי</b></span><input type="color" value={c.accent} aria-label="צבע ראשי" onChange={(event) => onConfig("accent", event.target.value)} /><code>{c.accent}</code></label>
            <label className="color-field"><span><b>צבע רקע</b></span><input type="color" value={c.accentSoft} aria-label="צבע רקע" onChange={(event) => onConfig("accentSoft", event.target.value)} /><code>{c.accentSoft}</code></label>
            <label>גופן<select value={(FONT_FAMILIES as readonly string[]).includes(c.fontFamily || "") ? c.fontFamily : "Rubik"} onChange={(event) => onConfig("fontFamily", event.target.value)}><option value="Rubik">Rubik</option><option value="Heebo">Heebo</option></select></label>
            <b>רקע העמוד</b>
            <BackgroundTemplatePicker value={c.bgStyle} accent={c.accent} soft={c.accentSoft} imageUrl={pageBackgroundUrl} uploading={bgUploading} error={bgUploadError} onChange={(id) => onConfig("bgStyle", id)} onUpload={uploadPageBackground} onRemove={removePageBackground} photosLocked={!canUsePhotos(profile.plan)} onUnlockPhotos={() => onRequirePlan("photos")} />
            <label>סגנון כפתורים<select value={c.buttonStyle || "gradient"} onChange={(event) => onConfig("buttonStyle", event.target.value)}><option value="gradient">מעבר צבעים</option><option value="solid">צבע מלא</option><option value="outline">קו מתאר</option><option value="soft">רך</option></select></label>
          </div>
        </>}
        page={<>
          <p className="editor-toolbox-lead">שם העמוד, פרטיות ומחיקה. התוכן עצמו נערך על העמוד החי.</p>
          <div className="toolbox-extra-fields">
            <label>שם העמוד אצלך<input value={project.title} maxLength={80} placeholder="ההזמנה של נועה" onChange={(event) => onProject({ title: event.target.value })} /></label>
            <label>למי העמוד<input value={c.recipient} maxLength={80} placeholder="נועה" onChange={(event) => onConfig("recipient", event.target.value)} /></label>
            <label>כתובת העמוד
              <div className="toolbox-slug-row" dir="ltr">
                <span>/p/</span>
                <input dir="ltr" value={project.slug} maxLength={50} spellCheck={false} autoComplete="off" placeholder="daniel-birthday" onChange={(event) => onProject({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50) })} onBlur={onCommitSlug} />
              </div>
              <small className="toolbox-slug-hint">אותיות באנגלית, מספרים ומקף. אחרי שמירה הקישור הישן כבר לא יעבוד.</small>
            </label>
          </div>
          <PlanLockLayer feature="branding" plan={profile.plan} onUnlock={onRequirePlan} name="הסרת מיתוג">
          <div className="toolbox-access">
            <div className="toolbox-access-heading">
              <span aria-hidden="true">✨</span>
              <div>
                <b>הסרת מיתוג Linkli</b>
                <small>עמוד נקי בלי חותם בתחתית. כלול במסלול יוצר.</small>
              </div>
            </div>
            <label className="toolbox-access-toggle">
              <span>בלי לוגו Linkli</span>
              <input type="checkbox" checked={Boolean(c.hideBranding)} onChange={(event) => {
                if (!isPaidPlan(profile.plan)) {
                  onRequirePlan("branding");
                  return;
                }
                onConfig("hideBranding", event.target.checked);
              }} />
            </label>
          </div>
          </PlanLockLayer>
          <PlanLockLayer feature="pagePassword" plan={profile.plan} onUnlock={onRequirePlan} name="נעילה בסיסמה">
          <div className={`toolbox-access ${project.passwordProtected ? "protected" : ""}`}>
            <div className="toolbox-access-heading">
              <span aria-hidden="true">{project.passwordProtected ? "🔒" : "🔓"}</span>
              <div>
                <b>{project.passwordProtected ? "העמוד נעול בסיסמה" : "נעילה בסיסמה"}</b>
                <small>{project.passwordProtected ? "רק מי שיש לו את הסיסמה יכול לפתוח." : "אפשר להשאיר את העמוד פרטי ולשתף רק עם מי שרוצים."}</small>
              </div>
            </div>
            <label>{project.passwordProtected ? "סיסמה חדשה" : "סיסמה"}<input type="password" value={passwordDraft} minLength={6} maxLength={64} autoComplete="new-password" dir="ltr" placeholder="לפחות 6 תווים" onFocus={() => { if (!canUsePagePassword(profile.plan)) onRequirePlan("pagePassword"); }} onChange={(event) => { if (!canUsePagePassword(profile.plan)) { onRequirePlan("pagePassword"); return; } setPasswordDraft(event.target.value); }} /></label>
            <div className="toolbox-access-actions">
              <button type="button" disabled={saving || passwordDraft.length < 6} onClick={savePagePassword}>{project.passwordProtected ? "עדכון הסיסמה" : "שמירת הסיסמה"}</button>
              {project.passwordProtected ? <button type="button" className="toolbox-access-remove" disabled={saving} onClick={() => onPassword(null)}>הסרת הסיסמה</button> : null}
            </div>
          </div>
          </PlanLockLayer>
          <details className="advanced-disclosure"><summary>שאלות והסדר שלהן</summary>{c.questions.map((question, index) => <div className="toolbox-extra-fields" key={question.id}><label>שאלה {index + 1}<input value={question.prompt} onChange={(event) => updateQuestion(index, { prompt: event.target.value })}/></label>{questionWidgetField(index)}</div>)}</details>
          <details className="advanced-disclosure" id="rsvp-settings"><summary>אישורי הגעה לאירועים</summary>{rsvpPanel()}</details>
          {c.showMemoriesSlider && <details className="advanced-disclosure"><summary>מצגת זיכרונות</summary>{memoryPhotoFields()}</details>}
          {c.showWhatsApp !== false && !c.whatsapp && <p className="whatsapp-warning editor-whatsapp-chip" role="status">בלי מספר וואטסאפ, הכפתור בסוף רק פותח שיתוף. עם מספר, האורחים כותבים ישר אליכם.</p>}
          <button type="button" className="toolbox-delete" onClick={onDelete}>מחיקת העמוד</button>
        </>}
      />
      <section className={`studio-panel editor-panel ${mobilePane === "edit" ? "mobile-active" : ""}`}>
        <div className="editor-section-heading">
          <div><h2>{activeSection.label}</h2><p>{activeSection.helper}. אפשר לערוך כאן או ללחוץ על הטקסט בעמוד.</p></div>
        </div>

        {section === "opening" && <div className="form-section editor-stage-fields">
          <div className="stage-content-heading full"><h3>למי העמוד ומה כתוב בהתחלה</h3><p>אפשר לשנות הכול. מה שכבר כתוב כאן הוא רק הצעה.</p></div>
          <label><span className="field-label"><b>שם העמוד</b><small>רק אצלך, לניהול</small></span><input value={project.title} maxLength={80} placeholder="לדוגמה: ההזמנה של נועה" onChange={(event) => onProject({ title: event.target.value })} /></label>
          <label><span className="field-label"><b>למי העמוד?</b><small>שם פרטי או קבוצה</small></span><input value={c.recipient} maxLength={80} placeholder="לדוגמה: נועה" onChange={(event) => onConfig("recipient", event.target.value)} /></label>
          <label className="full"><span className="field-label"><b>הכותרת שרואים</b><small>המסר הראשון והחשוב ביותר</small></span><input value={c.headline} maxLength={120} placeholder="מה תרצו לומר ברגע הראשון?" aria-label="הכותרת שרואים" onChange={(event) => onConfig("headline", event.target.value)} /></label>
          <label className="full"><span className="field-label"><b>כמה מילים לפני שמתחילים</b><small>משפט או שניים שמכינים להמשך</small></span><textarea value={c.subtitle} maxLength={320} placeholder="ספרו בקצרה מה מחכה בעמוד" onChange={(event) => onConfig("subtitle", event.target.value)} /></label>

          <details className="advanced-disclosure full">
            <summary><span className="disclosure-icon">＋</span><div><b>להוסיף פרטים לפתיחה</b><small>תווית, כפתור, תאריך, מקום וניווט</small></div><i>לא חובה</i></summary>
            <div className="disclosure-content disclosure-grid">
              <label>טקסט קטן מעל הכותרת<input value={c.introLabel} maxLength={80} placeholder="לדוגמה: הזמנה אישית" onChange={(event) => onConfig("introLabel", event.target.value)} /></label>
              <label>טקסט על כפתור ההתחלה<input value={c.startText} maxLength={80} placeholder="לדוגמה: מתחילים" onChange={(event) => onConfig("startText", event.target.value)} /></label>
              <fieldset className="highlight-editor full"><legend>פרטים חשובים <small>עד חמש שורות</small></legend><div className="highlight-list">{c.highlights.map((highlight, index) => <div className="highlight-row" key={index}><input value={highlight} maxLength={80} aria-label={`פרט חשוב ${index + 1}`} placeholder={index === 0 ? "לדוגמה: 18.09.2026 · 19:30" : "לדוגמה: חוות רונית, השרון"} onChange={(event) => updateHighlight(index, event.target.value)} /><button type="button" onClick={() => removeHighlight(index)} aria-label={`מחיקת פרט חשוב ${index + 1}`}>×</button></div>)}</div><button type="button" className="highlight-add" disabled={c.highlights.length >= 5} onClick={addHighlight}>+ הוספת שורה</button></fieldset>
              {(isCustomBlank || templateFeatures.some((feature) => ["showCountdown", "showVenueCard", "showCalendar", "showAppleCalendar", "showWaze", "showGoogleMaps"].includes(feature.key))) && <div className="feature-detail-panel full">
                <div className="field-divider full"><b>📍 תאריך, מקום וניווט</b><span>מלאו רק את הפרטים שרלוונטיים לעמוד הזה.</span></div>
                <label>תאריך ושעת התחלה<input type="datetime-local" value={(c.eventStartsAt || "").slice(0, 16)} onChange={(e) => onConfig("eventStartsAt", e.target.value)} /></label>
                <label>תאריך ושעת סיום<input type="datetime-local" value={(c.eventEndsAt || "").slice(0, 16)} onChange={(e) => onConfig("eventEndsAt", e.target.value)} /></label>
                <label>אזור זמן<select value={c.eventTimezone || "Asia/Jerusalem"} onChange={(e) => onConfig("eventTimezone", e.target.value)}>{EVENT_TIMEZONE_OPTIONS.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}</select></label>
                <label>שם המקום / אולם<input value={c.venueName || ""} maxLength={80} placeholder="לדוגמה: חוות רונית, השרון" onChange={(e) => onConfig("venueName", e.target.value)} /></label>
                <label>קישור לווייז<input value={c.wazeUrl || ""} maxLength={300} placeholder="https://waze.com/ul?..." onChange={(e) => onConfig("wazeUrl", e.target.value)} /></label>
                <label>קישור למפות<input value={c.googleMapsUrl || ""} maxLength={500} placeholder="https://maps.google.com/?q=..." onChange={(e) => onConfig("googleMapsUrl", e.target.value)} /></label>
              </div>}
            </div>
          </details>

          <details className="advanced-disclosure full">
            <summary><span className="disclosure-icon">◇</span><div><b>שליטה מתקדמת בפתיחה</b><small>הצגה, הסתרה ועיצוב נפרד של כל אלמנט</small></div><i>למתקדמים</i></summary>
            <div className="disclosure-content advanced-controls-stack">
              {renderElementPanel("אלמנטים בפתיחה", "הפעילו רק את מה שמשרת את הסיפור, ופתחו עיצוב נפרד רק כשצריך.", OPENING_ELEMENTS)}
              {renderFeaturePanel("opening")}
              {isCustomBlank && <div className="custom-stage-elements full">
                <div className="elements-panel-heading"><div><span>חוויות פתיחה</span><h3>אלמנטים אינטראקטיביים</h3><p>הוסיפו מעטפה נפתחת או מצגת זיכרונות לעמוד החופשי.</p></div></div>
                <div className="element-control-grid">
                  <ElementControlCard icon="💌" title="מעטפת שעווה" description="פתיחה חגיגית לפני הצגת התוכן" enabled={c.showWaxEnvelope === true} editing={editingElement === "waxEnvelope"} onToggle={(value) => onConfig("showWaxEnvelope", value)} onEdit={() => setEditingElement((current) => current === "waxEnvelope" ? null : "waxEnvelope")} />
                  <ElementControlCard icon="📸" title="מצגת זיכרונות" description="מעבר בין רגעים וסיפורים קצרים" enabled={c.showMemoriesSlider === true} editing={editingElement === "memories"} onToggle={(value) => onConfig("showMemoriesSlider", value)} onEdit={() => setEditingElement((current) => current === "memories" ? null : "memories")} />
                </div>
                {editingElement && ["waxEnvelope", "memories"].includes(editingElement) && <ElementStyleEditor elementKey={editingElement} title={editingElement === "waxEnvelope" ? "מעטפת שעווה" : "מצגת זיכרונות"} style={getElementStyle(editingElement)} onChange={(patch) => updateElementStyle(editingElement, patch)} onReset={() => resetElementStyle(editingElement)} />}
              </div>}
              {isCustomBlank && <div className="custom-stage-elements full">
                <div className="elements-panel-heading"><div><span>אירוע וניווט</span><h3>כלים שימושיים</h3><p>הפעילו רק את הכלים שתרצו להציג.</p></div></div>
                <div className="element-control-grid">
                  {([
                    ["showCountdown", "countdown", "⏱️", "ספירה לאחור", "טיימר חי עד מועד האירוע"],
                    ["showVenueCard", "venue", "🎟️", "כרטיס מקום", "תאריך, מקום ופרטי הגעה"],
                    ["showCalendar", "calendar", "📅", "הוספה ליומן", "האירוע נכנס ליומן במכשיר"],
                    ["showAppleCalendar", "calendar", "", "הורדה ליומן", "קובץ לאייפון ולמק"],
                    ["showWaze", "calendar", "🧭", "ניווט בווייז", "פתיחת נסיעה ישירות למקום"],
                    ["showGoogleMaps", "calendar", "📍", "ניווט במפות", "פתיחת המיקום במפות"],
                  ] as const).map(([visibilityKey, styleKey, icon, title, description]) => <ElementControlCard key={visibilityKey} icon={icon} title={title} description={description} enabled={previewBlockEnabled("location") && c[visibilityKey] !== false && Boolean(c[visibilityKey])} editing={editingElement === styleKey} lockedFeature={lockFeature(profile.plan, featureForConfigKey(visibilityKey) || featureForElementKey(styleKey))} plan={profile.plan} onUnlock={onRequirePlan} onToggle={(value) => { if (value && !previewBlockEnabled("location")) toggleCustomBlock("location"); onConfig(visibilityKey, value); }} onEdit={() => setEditingElement((current) => current === styleKey ? null : styleKey)} />)}
                </div>
                {editingElement && ["countdown", "venue", "calendar"].includes(editingElement) && <ElementStyleEditor elementKey={editingElement} title={editingElement === "countdown" ? "ספירה לאחור" : editingElement === "venue" ? "כרטיס מקום" : "כפתורי יומן וניווט"} style={getElementStyle(editingElement)} onChange={(patch) => updateElementStyle(editingElement, patch)} onReset={() => resetElementStyle(editingElement)} />}
              </div>}
            </div>
          </details>
        </div>}

        {section === "questions" && activeQuestion && <div className="questions-stage">
          <div className="stage-content-heading"><span>שאלה אחת בכל פעם</span><h3>מה תרצו לשאול?</h3><p>בחרו שאלה, כתבו אותה בשפה טבעית והוסיפו לפחות שתי אפשרויות. התצוגה עוברת אוטומטית לאותה שאלה.</p></div>
          <div className="question-tabs" role="tablist" aria-label="בחירת שאלה לעריכה">
            {c.questions.map((_, index) => <button type="button" role="tab" aria-selected={questionIndex === index} className={questionIndex === index ? "active" : ""} key={index} onClick={() => chooseQuestion(index)}>שאלה {index + 1}</button>)}
            <button type="button" className="add-question-tab" disabled={c.questions.length >= 10} onClick={addQuestion}>+ הוספת שאלה</button>
          </div>
          <fieldset className="question-editor question-editor-focused">
            <legend><span>{questionIndex + 1}</span> שאלה {questionIndex + 1}</legend>
            <button type="button" className="remove-question-button" disabled={c.questions.length === 1} onClick={() => removeQuestion(questionIndex)}>מחיקת השאלה</button>
            <label><span className="field-label"><b>השאלה</b><small>קצרה וברורה</small></span><input value={activeQuestion.prompt} maxLength={140} placeholder="לדוגמה: איזו אווירה מתאימה לערב?" onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })} /></label>
            <label><span className="field-label"><b>רמז קטן</b><small>לא חובה</small></span><input value={activeQuestion.helper} maxLength={240} placeholder="משפט שיעזור לבחור תשובה" onChange={(event) => updateQuestion(questionIndex, { helper: event.target.value })} /></label>
            <div className="option-editor"><div><b>אפשרויות תשובה</b><small>כל אפשרות נשמרת בשורה נפרדת.</small></div>{activeQuestion.options.map((option, index) => <div className="option-editor-row" key={index}><span>{index + 1}</span><input value={option} aria-label={`אפשרות ${index + 1}`} maxLength={120} onChange={(event) => updateQuestionOption(questionIndex, index, event.target.value)} /><button type="button" aria-label={`מחיקת אפשרות ${index + 1}`} disabled={activeQuestion.options.length <= 2} onClick={() => removeQuestionOption(questionIndex, index)}>×</button></div>)}<button type="button" className="add-option-button" disabled={activeQuestion.options.length >= 6} onClick={() => addQuestionOption(questionIndex)}>+ הוספת אפשרות</button></div>
          </fieldset>
          <div className="question-stage-navigation"><button type="button" className="button button-outline" disabled={questionIndex === 0} onClick={() => chooseQuestion(questionIndex - 1)}>שאלה קודמת</button><span>{questionIndex + 1} / {c.questions.length}</span><button type="button" className="button button-dark" disabled={questionIndex === c.questions.length - 1} onClick={() => chooseQuestion(questionIndex + 1)}>שאלה הבאה</button></div>

          <details className="advanced-disclosure">
            <summary><span className="disclosure-icon">◇</span><div><b>אפשרויות מתקדמות לשאלות</b><small>ניקוד, איסוף מידע ועיצוב האלמנטים</small></div><i>לא חובה</i></summary>
            <div className="disclosure-content advanced-controls-stack">
              <label className="quiz-answer-field">תשובה נכונה <small>רק אם זה חידון עם ניקוד</small><select value={activeQuestion.correctOption} onChange={(event) => updateQuestion(questionIndex, { correctOption: event.target.value })}><option value="">ללא ניקוד</option>{activeQuestion.options.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
              {renderElementPanel("עיצוב השאלות", "עיצוב השאלה, אפשרויות התשובה וכפתור ההמשך נשמר בנפרד משאר העמוד.", QUESTION_ELEMENTS)}
              {isCustomBlank && <div className="custom-stage-elements">
                <div className="elements-panel-heading"><div><span>איסוף מידע נוסף</span><h3>עוד סוגי תשובה</h3><p>אפשר להוסיף מונה אורחים או שדה פתוח לבקשת שיר.</p></div></div>
                <div className="element-control-grid">
                  <ElementControlCard icon="👥" title="מונה אורחים" description="בחירת כמות אורחים בצורה נוחה" enabled={previewBlockEnabled("questions") && c.showGuests === true} editing={editingElement === "guestCounter"} lockedFeature={lockFeature(profile.plan, "eventTools")} plan={profile.plan} onUnlock={onRequirePlan} onToggle={(value) => { if (value && !previewBlockEnabled("questions")) toggleCustomBlock("questions"); onConfig("showGuests", value); }} onEdit={() => setEditingElement((current) => current === "guestCounter" ? null : "guestCounter")} />
                  <ElementControlCard icon="🎵" title="בקשת שיר" description="שדה פתוח לשיר שהמבקר רוצה" enabled={previewBlockEnabled("questions") && c.showDjSong === true} editing={editingElement === "djSong"} lockedFeature={lockFeature(profile.plan, "eventTools")} plan={profile.plan} onUnlock={onRequirePlan} onToggle={(value) => { if (value && !previewBlockEnabled("questions")) toggleCustomBlock("questions"); onConfig("showDjSong", value); }} onEdit={() => setEditingElement((current) => current === "djSong" ? null : "djSong")} />
                </div>
                {editingElement && ["guestCounter", "djSong"].includes(editingElement) && <ElementStyleEditor elementKey={editingElement} title={editingElement === "guestCounter" ? "מונה אורחים" : "בקשת שיר"} style={getElementStyle(editingElement)} onChange={(patch) => updateElementStyle(editingElement, patch)} onReset={() => resetElementStyle(editingElement)} />}
              </div>}
              {renderFeaturePanel("questions")}
              {(isCustomBlank || templateFeatures.some((feature) => feature.key === "showGuests")) && <div className="feature-detail-panel question-detail-panel">
                <div className="field-divider full"><b>👥 פרטי אישור ההגעה</b><span>כמה אורחים אפשר לבחור?</span></div>
                <label>מקסימום אורחים<input type="number" min={1} max={20} value={c.maxGuests ?? 10} onChange={(event) => onConfig("maxGuests", Math.min(20, Math.max(1, Number(event.target.value) || 1)))} /></label>
              </div>}
            </div>
          </details>
        </div>}

        {section === "guests" && (
          <RsvpDashboard
            projectId={project.id}
            published={project.published}
            enabled={c.rsvpEnabled === true}
            notifyOwner={c.rsvpNotifyOwner === true}
            plan={profile.plan}
            onEnabled={(value) => onConfig("rsvpEnabled", value)}
            onNotify={(value) => onConfig("rsvpNotifyOwner", value)}
            onRequirePlan={() => onRequirePlan("eventTools")}
          />
        )}

        {section === "completion" && <div className="form-section editor-stage-fields">
          <div className="stage-content-heading full"><span>הרגע האחרון</span><h3>עם איזה מסר מסיימים?</h3><p>זה המסר שהמבקר ייקח איתו מהעמוד. כתבו אותו כאילו אתם אומרים אותו פנים אל פנים.</p></div>
          <label className="full"><span className="field-label"><b>כותרת הסיום</b><small>המשפט שמסכם את הרגע</small></span><input value={c.successTitle} maxLength={140} placeholder="לדוגמה: זה דייט! עכשיו זה רשמי" onChange={(event) => onConfig("successTitle", event.target.value)} /></label>
          <label className="full"><span className="field-label"><b>הודעת הסיום</b><small>ברכה, תודה או מה קורה עכשיו</small></span><textarea value={c.successText} maxLength={700} placeholder="כתבו כמה מילים אישיות לסיום" onChange={(event) => onConfig("successText", event.target.value)} /></label>

          <details className="advanced-disclosure full">
            <summary><span className="disclosure-icon">＋</span><div><b>פעולה ופרטים בסיום</b><small>כפתור, וואטסאפ או פרטי שובר</small></div><i>לפי הצורך</i></summary>
            <div className="disclosure-content disclosure-grid">
              <label>טקסט קטן מעל הכותרת<input value={c.resultLabel} maxLength={80} placeholder="לדוגמה: קבענו ✨" onChange={(event) => onConfig("resultLabel", event.target.value)} /></label>
              <label>טקסט על כפתור הסיום<input value={c.finalButtonText} maxLength={80} placeholder="לדוגמה: להצגת ההפתעה" onChange={(event) => onConfig("finalButtonText", event.target.value)} /></label>
              {(project.templateId === "gift" || (isCustomBlank && c.showVoucher === true)) && <div className="feature-detail-panel full">
                <div className="field-divider full"><b>🎟️ תוכן השובר</b><span>הפרטים שיופיעו אחרי פתיחת המתנה.</span></div>
                <label>כותרת השובר<input value={c.voucherTitle || ""} maxLength={100} placeholder="לדוגמה: שובר ספא זוגי" onChange={(e) => onConfig("voucherTitle", e.target.value)} /></label>
                <label>קוד מימוש אישי<input value={c.voucherCode || ""} maxLength={40} placeholder="LINKLI-GIFT-2026" onChange={(e) => onConfig("voucherCode", e.target.value)} /></label>
                <label className="full">תנאי מימוש ומידע נוסף<textarea value={c.voucherTerms || ""} maxLength={200} placeholder="בתוקף לשנה · בתיאום מראש" onChange={(e) => onConfig("voucherTerms", e.target.value)} /></label>
              </div>}
              {hasShareFeature && <><div className="field-divider full"><b>📲 קבלת תשובות ב־וואטסאפ</b><span>אם משאירים מספר ריק, הכפתור יוצג בלי נמען קבוע.</span></div>
                <label><span className="field-label"><b>מספר טלפון</b><small>מספר ישראלי רגיל</small></span><div className="phone-field" dir="ltr"><span>🇮🇱 +972</span><input type="tel" value={toDisplayPhone(c.whatsapp)} maxLength={14} placeholder="050-123-4567" inputMode="numeric" dir="ltr" onChange={(event) => onConfig("whatsapp", toNormalizedPhone(event.target.value))} /></div></label>
                <label>טקסט על הכפתור<input value={c.buttonText} maxLength={80} placeholder="לדוגמה: שליחת האישור" onChange={(event) => onConfig("buttonText", event.target.value)} /></label>
                <label className="full">הודעת וואטסאפ<textarea value={c.whatsappText} maxLength={500} placeholder="הטקסט שיופיע לפני סיכום התשובות" onChange={(event) => onConfig("whatsappText", event.target.value)} /></label></>}
            </div>
          </details>

          <details className="advanced-disclosure full">
            <summary><span className="disclosure-icon">◇</span><div><b>אפקטים ועיצוב הסיום</b><small>הפתעה אינטראקטיבית, שיתוף ועיצוב אלמנטים</small></div><i>למתקדמים</i></summary>
            <div className="disclosure-content advanced-controls-stack">
              {renderElementPanel("עיצוב הסיום", "הכותרת, ההודעה והתווית יכולות לקבל עיצוב נפרד.", COMPLETION_ELEMENTS)}
              {renderFeaturePanel("completion")}
              {isCustomBlank && <div className="custom-stage-elements full">
                <div className="elements-panel-heading"><div><span>רגע הסיום</span><h3>הפתעה אינטראקטיבית</h3><p>בחרו איך לחשוף את המסר האחרון.</p></div></div>
                <div className="element-control-grid">
                  <ElementControlCard icon="🎁" title="שובר מתנה" description="כרטיס עם קוד מימוש ופרטים" enabled={c.showVoucher === true} editing={editingElement === "voucher"} onToggle={(value) => onConfig("showVoucher", value)} onEdit={() => setEditingElement((current) => current === "voucher" ? null : "voucher")} />
                  <ElementControlCard icon="🕯️" title="כיבוי הנר" description="לוחצים על הנר ופותחים את הברכה" enabled={c.showCandle === true} editing={editingElement === "candle"} onToggle={(value) => onConfig("showCandle", value)} onEdit={() => setEditingElement((current) => current === "candle" ? null : "candle")} />
                  <ElementControlCard icon="🪄" title="כרטיס גירוד" description="חשיפת ההפתעה בצורה משחקית" enabled={c.showScratchCard === true} editing={editingElement === "scratch"} onToggle={(value) => onConfig("showScratchCard", value)} onEdit={() => setEditingElement((current) => current === "scratch" ? null : "scratch")} />
                </div>
                {editingElement && ["voucher", "candle", "scratch"].includes(editingElement) && <ElementStyleEditor elementKey={editingElement} title={editingElement === "voucher" ? "שובר מתנה" : editingElement === "candle" ? "כיבוי הנר" : "כרטיס גירוד"} style={getElementStyle(editingElement)} content={inspectorContentFields(editingElement, "result")} onChange={(patch) => updateElementStyle(editingElement, patch)} onReset={() => resetElementStyle(editingElement)} />}
              </div>}
              {isCustomBlank && <div className="custom-stage-elements full">
                <div className="elements-panel-heading"><div><span>פעולות בסיום</span><h3>מה המבקר יוכל לעשות?</h3><p>הפעילו רק את הפעולות שמתאימות לעמוד.</p></div></div>
                <div className="element-control-grid">
                  {([
                    ["showWhatsApp", "shareButtons", "🟢", "וואטסאפ", "שליחת התשובה ישירות ב־וואטסאפ"],
                    ["showTelegram", "shareButtons", "✈️", "טלגרם", "שיתוף מהיר דרך טלגרם"],
                    ["showCopy", "shareButtons", "📋", "העתקת מענה", "העתקת כל התשובות ללוח"],
                    ["showAnswerRecap", "answerRecap", "✓", "סיכום תשובות", "הצגת הבחירות במסך הסיום"],
                  ] as const).map(([visibilityKey, styleKey, icon, title, description]) => <ElementControlCard key={visibilityKey} icon={icon} title={title} description={description} enabled={previewBlockEnabled(styleKey === "answerRecap" ? "answers" : "share") && (visibilityKey === "showTelegram" || visibilityKey === "showCopy" ? Boolean(c[visibilityKey]) : c[visibilityKey] !== false)} editing={editingElement === styleKey} onToggle={(value) => { const block = styleKey === "answerRecap" ? "answers" : "share"; if (value && !previewBlockEnabled(block)) toggleCustomBlock(block); onConfig(visibilityKey, value); }} onEdit={() => setEditingElement((current) => current === styleKey ? null : styleKey)} />)}
                </div>
                {editingElement && ["answerRecap", "shareButtons"].includes(editingElement) && <ElementStyleEditor elementKey={editingElement} title={editingElement === "answerRecap" ? "סיכום תשובות" : "כפתורי שיתוף"} style={getElementStyle(editingElement)} onChange={(patch) => updateElementStyle(editingElement, patch)} onReset={() => resetElementStyle(editingElement)} />}
              </div>}
            </div>
          </details>
        </div>}

        {section === "design" && <div className="design-stage">
          <div className="design-preset-heading"><span>הדרך המהירה</span><h3>בוחרים אווירה בלחיצה</h3><p>כל בחירה מתאימה יחד את הצבעים, הרקע והכפתורים. אפשר לדייק ידנית אחר כך.</p></div>
          <div className="design-preset-grid" role="group" aria-label="בחירת אווירה לעמוד">
            {DESIGN_PRESETS.map((preset) => {
              const selectedPreset = c.accent.toLowerCase() === preset.accent && c.accentSoft.toLowerCase() === preset.soft;
              return <button type="button" key={preset.id} className={selectedPreset ? "active" : ""} aria-pressed={selectedPreset} onClick={() => applyDesignPreset(preset)} style={{ "--preset-accent": preset.accent, "--preset-soft": preset.soft } as React.CSSProperties}>
                <span>{preset.icon}</span><div><b>{preset.name}</b><small>{preset.helper}</small></div><i>{selectedPreset ? "✓" : ""}</i>
              </button>;
            })}
          </div>

          <details className="advanced-disclosure design-precision">
            <summary><span className="disclosure-icon">⌁</span><div><b>לדייק את העיצוב ידנית</b><small>צבעים, גופן, כרטיס, אימוג׳ים ומיתוג</small></div><i>למתקדמים</i></summary>
            <div className="disclosure-content">
              <div className="color-grid">
                <label className="color-field"><span><b>צבע ראשי</b><small>כפתורים והדגשות</small></span><input type="color" value={c.accent} aria-label="צבע ראשי" onChange={(event) => onConfig("accent", event.target.value)} /><code>{c.accent}</code></label>
                <label className="color-field"><span><b>צבע רקע</b><small>הרקע הרך של העמוד</small></span><input type="color" value={c.accentSoft} aria-label="צבע רקע" onChange={(event) => onConfig("accentSoft", event.target.value)} /><code>{c.accentSoft}</code></label>
              </div>

          <div className="form-section editor-stage-fields design-precision-fields">
            <div className="field-divider full"><b>הגופן והכרטיס</b><span>גופן, צורת הכרטיס, רקע, מסגרת וטשטוש.</span></div>
            <label>גופן עברי ראשי
              <select value={(FONT_FAMILIES as readonly string[]).includes(c.fontFamily || "") ? c.fontFamily : "Rubik"} onChange={(e) => onConfig("fontFamily", e.target.value)}>
                <option value="Rubik">Rubik</option>
                <option value="Heebo">Heebo</option>
              </select>
            </label>

            <label>צורת הכרטיס
              <select value={c.cardShape || "rounded-3d"} onChange={(e) => onConfig("cardShape", e.target.value)}>
                <option value="rounded-3d">מעוגל עם עומק</option>
                <option value="rounded-pill">מלבן מעוגל</option>
                <option value="square-minimal">פינות עדינות</option>
              </select>
            </label>

            <div className="full">
              <b className="bg-template-label">רקע העמוד</b>
              <BackgroundTemplatePicker value={c.bgStyle} accent={c.accent} soft={c.accentSoft} imageUrl={pageBackgroundUrl} uploading={bgUploading} error={bgUploadError} onChange={(id) => onConfig("bgStyle", id)} onUpload={uploadPageBackground} onRemove={removePageBackground} photosLocked={!canUsePhotos(profile.plan)} onUnlockPhotos={() => onRequirePlan("photos")} />
            </div>

            <label>סגנון כפתורים
              <select value={c.buttonStyle || "gradient"} onChange={(e) => onConfig("buttonStyle", e.target.value)}>
                <option value="gradient">מעבר צבעים</option>
                <option value="solid">צבע מלא</option>
                <option value="outline">קו מתאר</option>
                <option value="soft">רך ובהיר</option>
              </select>
            </label>

            <label className="color-field"><span><b>רקע הכרטיס</b><small>הצבע של הכרטיס עצמו</small></span><input type="color" value={c.cardBackground || "#ffffff"} aria-label="רקע הכרטיס" onChange={(event) => onConfig("cardBackground", event.target.value)} /><code>{c.cardBackground || "#ffffff"}</code></label>
            <label className="color-field"><span><b>צבע המסגרת</b><small>הקו שמקיף את הכרטיס</small></span><input type="color" value={c.cardBorderColor || "#ffffff"} aria-label="צבע המסגרת" onChange={(event) => onConfig("cardBorderColor", event.target.value)} /><code>{c.cardBorderColor || "#ffffff"}</code></label>

            <label className="full">עיגול פינות: <span>{c.cardRadius ?? 34}px</span><input type="range" min={0} max={48} value={c.cardRadius ?? 34} onChange={(e) => onConfig("cardRadius", Number(e.target.value))} /></label>

            <div className="field-divider full"><b>😊 האימוג׳י והאווירה</b><span>אפשר להחליף את הסמל, הרקע שלו, הצורה והגודל.</span></div>
            <label>אימוג׳י ראשי<input value={c.emoji} maxLength={16} placeholder="✨" onChange={(e) => onConfig("emoji", e.target.value)} /></label>
            <label>צורת רקע לאימוג׳י
              <select value={c.emojiShape || "rounded"} onChange={(e) => onConfig("emojiShape", e.target.value)}>
                <option value="rounded">מעוגל</option><option value="circle">עיגול</option><option value="square">מרובע</option><option value="pill">מלבן מעוגל</option>
              </select>
            </label>
            <label className="color-field"><span><b>צבע רקע לאימוג׳י</b><small>הכתם מאחורי הסמל</small></span><input type="color" value={c.emojiBackground || c.accentSoft} aria-label="צבע רקע לאימוג׳י" onChange={(event) => onConfig("emojiBackground", event.target.value)} /><code>{c.emojiBackground || c.accentSoft}</code></label>
            <label>גודל האימוג׳י: <span>{c.emojiSize ?? 55}px</span><input type="range" min={28} max={96} value={c.emojiSize ?? 55} onChange={(e) => onConfig("emojiSize", Number(e.target.value))} /></label>
            <label className="full">אימוג׳ים לאווירה <small>הפרידו בפסיקים, למשל: ✨, 💕, 🌸</small><input value={c.decorations.join(", ")} maxLength={140} onChange={(e) => onConfig("decorations", e.target.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8))} /></label>
            <label className="full">שקיפות אימוג׳י רקע: <span>{Math.round((c.decorationOpacity ?? 0.5) * 100)}%</span><input type="range" min={0} max={1} step={0.05} value={c.decorationOpacity ?? 0.5} onChange={(e) => onConfig("decorationOpacity", Number(e.target.value))} /></label>

            <label className="full">טשטוש הזכוכית: <span>{c.glassBlur ?? 30}px</span>
              <input type="range" min={0} max={50} value={c.glassBlur ?? 30} onChange={(e) => onConfig("glassBlur", Number(e.target.value))} />
            </label>

            <div className="field-divider full"><b>מיתוג</b><span>הסרת לוגו Linkli כלולה במסלול יוצר.</span></div>

            <PlanLockLayer className="full" feature="branding" plan={profile.plan} onUnlock={onRequirePlan} name="הסרת מיתוג">
            <label className="full" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "14px 18px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
              <div>
                <b style={{ display: "block", fontSize: "14px", color: "#0f172a" }}>הסרת מיתוג Linkli בתחתית העמוד</b>
                <small id="hide-branding-help" style={{ color: "#64748b", fontSize: "12px" }}>{isPaidPlan(profile.plan) ? "העמוד בלי חותם בתחתית" : "הסרת המיתוג כלולה במסלול יוצר"}</small>
              </div>
              <input type="checkbox" checked={Boolean(c.hideBranding)} disabled={!isPaidPlan(profile.plan)} aria-describedby="hide-branding-help" onChange={(e) => { if (!isPaidPlan(profile.plan)) { onRequirePlan("branding"); return; } onConfig("hideBranding", e.target.checked); }} style={{ width: "20px", height: "20px", cursor: "pointer" }} />
            </label>
            </PlanLockLayer>
          </div>
            </div>
          </details>

          <details className={`advanced-disclosure access-disclosure ${project.passwordProtected ? "protected" : ""}`}>
            <summary><span className="disclosure-icon">{project.passwordProtected ? "🔒" : "🔓"}</span><div><b>פרטיות והגנת סיסמה</b><small>{project.passwordProtected ? "העמוד מוגן כרגע" : "אפשר להגביל כניסה לעמוד"}</small></div><i>{project.passwordProtected ? "פעיל" : "לא חובה"}</i></summary>
            <div className="disclosure-content"><PlanLockLayer feature="pagePassword" plan={profile.plan} onUnlock={onRequirePlan} name="הגנה באמצעות סיסמה"><div className={`page-access-card ${project.passwordProtected ? "protected" : ""}`}><div className="page-access-heading"><span>{project.passwordProtected ? "🔒" : "🔓"}</span><div><b>הגנה באמצעות סיסמה</b><p>{project.passwordProtected ? "המבקרים חייבים להזין סיסמה לפני הצגת העמוד." : "אפשר להגן על העמוד ולשתף את הסיסמה רק עם מי שצריך."}</p></div><strong>{project.passwordProtected ? "פעיל" : "כבוי"}</strong></div><label>{project.passwordProtected ? "סיסמה חדשה (רק אם רוצים להחליף)" : "בחירת סיסמה לעמוד"}<input type="password" value={passwordDraft} minLength={6} maxLength={64} autoComplete="new-password" dir="ltr" placeholder="לפחות 6 תווים" onFocus={() => { if (!canUsePagePassword(profile.plan)) onRequirePlan("pagePassword"); }} onChange={(event) => { if (!canUsePagePassword(profile.plan)) { onRequirePlan("pagePassword"); return; } setPasswordDraft(event.target.value); }} /></label><div className="page-access-actions"><button type="button" className="button button-dark" disabled={saving || passwordDraft.length < 6} onClick={savePagePassword}>{saving ? "שומרים…" : project.passwordProtected ? "החלפת סיסמה" : "הפעלת הגנה"}</button>{project.passwordProtected && <button type="button" className="remove-access-button" disabled={saving} onClick={() => onPassword(null)}>הסרת ההגנה</button>}</div></div></PlanLockLayer></div>
          </details>
          <div className="publish-card publish-card-final">
            <div className="publish-card-heading"><span className={project.published ? "published" : ""}>{project.published ? "● באוויר" : "✓ מוכן"}</span><div><b>{project.published ? "הקישור שלכם מוכן לשיתוף" : "נשאר רק לפרסם"}</b><p>{project.published ? "אפשר להעתיק, לפתוח או לשלוח אותו עכשיו." : "הפרסום שומר את השינויים והופך את הטיוטה לקישור פעיל."}</p></div></div>
            {project.published ? <div className="share-url-row"><span dir="ltr">{shareUrl}</span><button type="button" onClick={copyShareUrl}>{copied ? "הועתק ✓" : "העתקת קישור"}</button></div> : <div className="publish-ready-note"><span>✓</span><p><b>עד הפרסום רק אתם רואים את העמוד</b><small>אפשר לחזור ולשנות אותו גם אחרי שהוא באוויר.</small></p></div>}
            <div className="publish-actions"><button type="button" className="button button-primary" disabled={saving} onClick={onPublish}>{primaryPublishLabel(project, saving, "full")}</button>{project.published && <><a className="button button-outline" href={`/p/${project.slug}`} target="_blank" rel="noreferrer">פתיחת העמוד ↗</a><a className="button button-whatsapp" href={whatsappShareUrl} target="_blank" rel="noreferrer">שיתוף ב־וואטסאפ</a></>}</div>
            {project.published ? <p className="publish-unpublish-row"><span>צריך להוריד את העמוד מהאוויר לזמן מה?</span><button type="button" className="unpublish-link" disabled={saving} onClick={onUnpublish}>הורדה מהאוויר</button></p> : null}
          </div>
          <details className="danger-disclosure"><summary>ניהול הטיוטה</summary><button type="button" className="delete-project-link" onClick={onDelete}>מחיקת העמוד לצמיתות</button></details>
        </div>}

        <div className="editor-workflow-actions">
          <button type="button" className="button button-outline" disabled={activeSectionIndex === 0} onClick={() => moveSection(-1)}>חזרה</button>
          <button type="button" className="save-inline" disabled={saving} onClick={onSave}>{saving ? "שומר שינויים…" : "שמירה בלי להמשיך"}</button>
          {activeSectionIndex < visibleEditorSections.length - 1 ? <button type="button" className="button button-primary" disabled={saving} onClick={() => moveSection(1)}>{saving ? "שומרים…" : `המשך ל${visibleEditorSections[activeSectionIndex + 1].label}`}</button> : <button type="button" className="button button-primary" disabled={saving} onClick={project.published ? onSave : onPublish}>{saving ? "שומרים…" : project.published ? "שמירת השינויים" : "פרסום וקבלת קישור"}</button>}
        </div>
      </section>

      <aside className={`live-preview-panel preview-device-${previewDevice} ${mobilePane === "preview" ? "mobile-active" : ""}`} aria-label="תצוגה חיה של העמוד">
        <div className="live-preview-heading"><div><b>עריכה על העמוד</b><small>{editingElement ? `מסומן: ${ELEMENT_LABELS[editingElement]}` : "לחצו על טקסט, כותרת או כפתור כדי לשנות"}</small></div><button type="button" className={`preview-device-toggle ${previewDecorations ? "active" : ""}`} aria-pressed={previewDecorations} onClick={() => setPreviewDecorations((value) => !value)}>{previewDecorations ? "בלי אימוג׳ים ברקע" : "עם אימוג׳ים ברקע"}</button><button type="button" className={`preview-device-toggle ${previewDevice === "mobile" ? "active" : ""}`} aria-pressed={previewDevice === "mobile"} onClick={() => setPreviewDevice((current) => current === "mobile" ? "desktop" : "mobile")}>{previewDevice === "mobile" ? "גרסת מחשב" : "גרסת מובייל"}</button></div>
        <div className="preview-screen-tabs" role="tablist" aria-label="בחירת מסך לתצוגה">
          <button type="button" role="tab" aria-selected={previewScreen === "intro"} className={previewScreen === "intro" ? "active" : ""} onClick={() => setPreviewScreen("intro")}>פתיחה</button>
          {previewBlockEnabled("questions") && c.questions.map((_, index) => <button type="button" role="tab" aria-selected={previewScreen === "question" && previewQuestion === index} className={previewScreen === "question" && previewQuestion === index ? "active" : ""} key={index} onClick={() => { setPreviewQuestion(index); setPreviewScreen("question"); }}>{index + 1}</button>)}
          <button type="button" role="tab" aria-selected={previewScreen === "result"} className={previewScreen === "result" ? "active" : ""} onClick={() => setPreviewScreen("result")}>סיום</button>
          <button type="button" role="tab" aria-selected={previewScreen === "all"} className={previewScreen === "all" ? "active" : ""} onClick={() => setPreviewScreen("all")}>כל העמוד</button>
        </div>

        <div ref={attachPreviewFrame} className={`preview-frame preview-frame-live preview-${c.theme} bg-${c.bgStyle || "soft"}${dropActive ? " is-drop-target" : ""}${isMovingElement ? " is-moving-element" : ""}${isTransformingElement ? " is-transforming-element" : ""}${dropHint ? " has-drop-hint" : ""}${previewDecorations ? " is-preview-decorations" : ""}`} onMouseDown={handlePreviewBackgroundPointer} onPointerDown={handleCanvasPointerDown} onPointerMove={handleCanvasPointerMove} onPointerUp={handleCanvasPointerUp} onPointerCancel={handleCanvasPointerUp} onDragOver={handleCanvasDragOver} onDragEnter={handleCanvasDragEnter} onDragLeave={handleCanvasDragLeave} onDrop={applyCanvasDrop} style={{ "--preview-soft": c.accentSoft, "--preview-accent": c.accent, "--preview-card-bg": c.cardBackground || "#ffffff", "--preview-card-border": c.cardBorderColor || "#ffffff", "--preview-card-radius": `${c.cardRadius ?? 34}px`, "--preview-emoji-bg": c.emojiBackground || c.accentSoft, "--preview-emoji-size": `${c.emojiSize ?? 55}px`, "--preview-decoration-opacity": c.decorationOpacity ?? 0.5, "--preview-bg-image": pageBackgroundUrl ? `url("${pageBackgroundUrl}")` : "none" } as React.CSSProperties}>
          <MusicPlaybackProvider youtubeUrl={c.showMusicPlayer ? (c.musicYoutubeUrl || "") : ""}>
          <div className="editor-history-actions" dir="ltr">
            <button type="button" className="editor-history-button" disabled={!canUndo} onClick={undoHistory} title="אחורה" aria-label="ביטול פעולה אחרונה">
              <ArrowCounterClockwise aria-hidden="true" />
            </button>
            <button type="button" className="editor-history-button" disabled={!canRedo} onClick={redoHistory} title="קדימה" aria-label="חזרה על פעולה">
              <ArrowClockwise aria-hidden="true" />
            </button>
          </div>
          {editingElement ? (
            <CanvasElementChrome
              frame={previewFrame}
              elementKey={editingElement}
              label={ELEMENT_LABELS[editingElement]}
              canDelete={!toolboxItems.find((row) => row.styleKey === editingElement)?.required && !isFlowLockedKey(editingElement)}
              locked={isFlowLockedKey(editingElement)}
              rotate={c.elementLayout?.[editingElement]?.rotate ?? 0}
              version={`${c.elementLayout?.[editingElement]?.x ?? ""}-${c.elementLayout?.[editingElement]?.y ?? ""}-${c.elementLayout?.[editingElement]?.w ?? ""}-${c.elementLayout?.[editingElement]?.h ?? ""}-${c.elementLayout?.[editingElement]?.rotate ?? ""}-${c.elementOrder?.join(",") ?? ""}`}
              onDelete={() => deleteCanvasElement(editingElement)}
              onTransformStart={handleChromeTransformStart}
              onTransformMove={handleChromeTransformMove}
              onTransformEnd={handleChromeTransformEnd}
              onKeyboardAction={handleChromeKeyboard}
            />
          ) : null}
          {dropHint ? (
            <div
              className={`canvas-drop-hint ${dropHint.mode === "insert" ? "is-insert" : "is-ghost"}`}
              style={dropHint.mode === "insert"
                ? { left: dropHint.left, top: dropHint.top, width: dropHint.width }
                : { left: dropHint.left, top: dropHint.top, width: dropHint.width, height: dropHint.height }}
              aria-hidden="true"
            />
          ) : null}
          {snapGuides?.v != null ? <i className="canvas-snap-guide is-vertical" style={{ left: snapGuides.v }} aria-hidden="true" /> : null}
          {snapGuides?.h != null ? <i className="canvas-snap-guide is-horizontal" style={{ top: snapGuides.h }} aria-hidden="true" /> : null}
          {c.showFallingEmojis !== false && previewBlockEnabled("decorations") && <div key={decorationMotionKey(c)} className="preview-falling" aria-hidden="true">{buildDecorationItems(c).map((item, index) => <span key={index} style={item.style}>{item.value}</span>)}</div>}
          <div className="preview-site-card">
            {c.showMusicPlayer ? <MusicMuteFab /> : null}
            <div className="preview-site-topline"><span className="preview-site-brand">Link<span>li</span></span></div>

            {previewScreen === "all" && <div className="preview-site-flow">
              <div className="preview-flow-heading"><div><span className="preview-flow-kicker">תצוגת העמוד המלא</span><h2>{c.headline}</h2><p>כאן רואים את כל השלבים ברצף אחד: הפתיחה, השאלות והסיום.</p></div><button type="button" onClick={() => setSection("opening")}>עריכת פתיחה</button></div>
              <section className="preview-flow-section preview-flow-intro preview-layout-stack">
                <div className="preview-flow-section-heading"><span>01</span><b>פתיחה</b><button type="button" onClick={() => setSection("opening")}>עריכה</button></div>
                {c.showIntroLabel !== false && <InlineField className={previewElementClass("introLabel", "preview-mini-label")} style={previewElementStyle("introLabel")} value={c.introLabel} maxLength={80} placeholder="תווית עליונה" onChange={(value) => onConfig("introLabel", value)} />}
                {c.showEmoji !== false && previewBlockEnabled("emoji") && <button type="button" className={previewElementClass("emoji", "big-emoji canvas-emoji")} style={previewElementStyle("emoji")} aria-label="בחירת סמל ראשי" onClick={() => selectByStyleKey("emoji")}><SymbolFace emoji={c.emoji} imageUrl={pageEmojiUrl} /></button>}
                {c.showGreeting !== false && <p className={previewElementClass("greeting", "preview-greeting")} style={previewElementStyle("greeting")}>שלום <InlineField value={c.recipient} maxLength={80} placeholder="השם" onChange={(value) => onConfig("recipient", value)} />,</p>}
                <InlineField as="h3" className={previewElementClass("headline")} style={previewElementStyle("headline")} value={c.headline} maxLength={120} placeholder="הכותרת שרואים" onChange={(value) => onConfig("headline", value)} />
                <InlineField as="p" className={previewElementClass("subtitle")} style={previewElementStyle("subtitle")} multiline value={c.subtitle} maxLength={320} placeholder="כמה מילים לפני שמתחילים" onChange={(value) => onConfig("subtitle", value)} />
                {renderPreviewOpeningSpecials()}
                {renderLockedPreview("intro")}
                {c.showHighlights !== false && previewBlockEnabled("highlights") && <div className={previewElementClass("highlights", "preview-highlights")} style={previewElementStyle("highlights")}>{c.highlights.map((highlight, index) => <span key={index}><InlineField value={highlight} maxLength={80} placeholder="פרט חשוב" onChange={(value) => updateHighlight(index, value)} /></span>)}</div>}
                {previewBlockEnabled("location") && (c.showCalendar || c.showAppleCalendar || c.showWaze || c.showGoogleMaps) && <div className={previewElementClass("calendar", "preview-utility-actions")} style={previewElementStyle("calendar")}>{c.showCalendar && <button type="button">📅 יומן</button>}{c.showAppleCalendar && <button type="button"> הורדה</button>}{c.showWaze && <button type="button">🧭 ווייז</button>}{c.showGoogleMaps && <button type="button">📍 מפות</button>}</div>}
                <div role="button" tabIndex={0} className={previewElementClass("primaryButton", "preview-action")} style={previewElementStyle("primaryButton")} onClick={() => { setPreviewQuestion(0); setPreviewScreen(previewBlockEnabled("questions") ? "question" : "result"); }}><InlineField value={c.startText} maxLength={80} placeholder="טקסט הכפתור" onChange={(value) => onConfig("startText", value)} /><span>←</span></div>
              </section>

              {previewBlockEnabled("questions") && <section className="preview-flow-section preview-flow-questions">
                <div className="preview-flow-section-heading"><span>02</span><b>שאלות</b><button type="button" onClick={() => setSection("questions")}>עריכה</button></div>
                {c.questions.map(renderPreviewQuestion)}
                {renderLockedPreview("question")}
              </section>}

              <section className="preview-flow-section preview-flow-result preview-layout-stack">
                <div className="preview-flow-section-heading"><span>{previewBlockEnabled("questions") ? "03" : "02"}</span><b>סיום</b><button type="button" onClick={() => setSection("completion")}>עריכה</button></div>
                {c.showEmoji !== false && previewBlockEnabled("emoji") && <button type="button" className={previewElementClass("emoji", "preview-result-emoji canvas-emoji")} style={previewElementStyle("emoji")} aria-label="בחירת סמל ראשי" onClick={() => selectByStyleKey("emoji")}><SymbolFace emoji={c.emoji} imageUrl={pageEmojiUrl} /></button>}
                <InlineField className={previewElementClass("resultLabel", "preview-mini-label")} style={previewElementStyle("resultLabel")} value={c.resultLabel} maxLength={80} placeholder="תווית הסיום" onChange={(value) => onConfig("resultLabel", value)} />
                <InlineField as="h3" className={previewElementClass("resultTitle")} style={previewElementStyle("resultTitle")} value={c.successTitle} maxLength={140} placeholder="כותרת הסיום" onChange={(value) => onConfig("successTitle", value)} />
                {renderPreviewResultSpecials()}
                {renderLockedPreview("result")}
                <InlineField as="p" className={previewElementClass("resultText")} style={previewElementStyle("resultText")} multiline value={c.successText} maxLength={700} placeholder="הודעת הסיום" onChange={(value) => onConfig("successText", value)} />
                {c.showAnswerRecap !== false && previewBlockEnabled("answers") && <div className={previewElementClass("answerRecap", "preview-answer-recap")} style={previewElementStyle("answerRecap")}>{c.questions.map((question, index) => <div key={index}><span>{index + 1}</span><p><small>{question.prompt}</small><b>{previewAnswers[index] || "עדיין לא נבחרה תשובה"}</b></p></div>)}</div>}
                {previewBlockEnabled("share") && <div className={previewElementClass("shareButtons", "preview-share-actions")} style={previewElementStyle("shareButtons")}>{c.showWhatsApp !== false && <div role="button" tabIndex={0} className="preview-action preview-whatsapp"><InlineField value={c.buttonText} maxLength={80} placeholder="טקסט השיתוף" onChange={(value) => onConfig("buttonText", value)} /></div>}{c.showTelegram === true && <button type="button" className="preview-share-button">✈️ טלגרם</button>}{c.showCopy === true && <button type="button" className="preview-share-button">📋 העתקה</button>}</div>}
              </section>
            </div>}

            {previewScreen === "intro" && <div className="preview-site-screen preview-site-intro preview-layout-stack">
              {c.showIntroLabel !== false && <InlineField className={previewElementClass("introLabel", "preview-mini-label")} style={previewElementStyle("introLabel")} value={c.introLabel} maxLength={80} placeholder="תווית עליונה" onChange={(value) => onConfig("introLabel", value)} />}
              {c.showEmoji !== false && previewBlockEnabled("emoji") && <button type="button" className={previewElementClass("emoji", "big-emoji canvas-emoji")} style={previewElementStyle("emoji")} aria-label="בחירת סמל ראשי" onClick={() => selectByStyleKey("emoji")}><SymbolFace emoji={c.emoji} imageUrl={pageEmojiUrl} /></button>}
              {c.showGreeting !== false && <p className={previewElementClass("greeting", "preview-greeting")} style={previewElementStyle("greeting")}>שלום <InlineField value={c.recipient} maxLength={80} placeholder="השם" onChange={(value) => onConfig("recipient", value)} />,</p>}
              <InlineField as="h2" className={previewElementClass("headline")} style={previewElementStyle("headline")} value={c.headline} maxLength={120} placeholder="הכותרת שרואים" onChange={(value) => onConfig("headline", value)} />
              <InlineField as="p" className={previewElementClass("subtitle")} style={previewElementStyle("subtitle")} multiline value={c.subtitle} maxLength={320} placeholder="כמה מילים לפני שמתחילים" onChange={(value) => onConfig("subtitle", value)} />
              {renderPreviewOpeningSpecials()}
              {renderLockedPreview("intro")}
              {c.showHighlights !== false && previewBlockEnabled("highlights") && <div className={previewElementClass("highlights", "preview-highlights")} style={previewElementStyle("highlights")}>{c.highlights.map((highlight, index) => <span key={index}><InlineField value={highlight} maxLength={80} placeholder="פרט חשוב" onChange={(value) => updateHighlight(index, value)} /></span>)}</div>}
              {previewBlockEnabled("location") && (c.showCalendar || c.showAppleCalendar || c.showWaze || c.showGoogleMaps) && <div className={previewElementClass("calendar", "preview-utility-actions")} style={previewElementStyle("calendar")}>{c.showCalendar && <button type="button">📅 יומן</button>}{c.showAppleCalendar && <button type="button"> הורדה</button>}{c.showWaze && <button type="button">🧭 ווייז</button>}{c.showGoogleMaps && <button type="button">📍 מפות</button>}</div>}
              <div role="button" tabIndex={0} className={previewElementClass("primaryButton", "preview-action")} style={previewElementStyle("primaryButton")} onClick={() => { setPreviewQuestion(0); setPreviewScreen(previewBlockEnabled("questions") ? "question" : "result"); }}><InlineField value={c.startText} maxLength={80} placeholder="טקסט הכפתור" onChange={(value) => onConfig("startText", value)} /><span>←</span></div>
            </div>}

            {previewScreen === "question" && previewBlockEnabled("questions") && previewQuestionData && <div className="preview-site-screen preview-site-question preview-layout-stack">
              <div className="preview-progress" style={{ gridTemplateColumns: `repeat(${c.questions.length}, minmax(0, 1fr))` }}>{c.questions.map((_, index) => <i className={index <= previewQuestion ? "active" : ""} key={index} />)}</div>
              {renderPreviewQuestion(previewQuestionData, previewQuestion)}
              {renderLockedPreview("question")}
              <div className="visual-question-tools"><button type="button" disabled={!previewQuestionData || previewQuestionData.options.length >= 6} onClick={() => addQuestionOption(previewQuestion)}>הוספת שורה חדשה</button><button type="button" disabled={c.questions.length === 1} onClick={() => removeQuestion(previewQuestion)}>מחיקת שאלה</button><button type="button" disabled={c.questions.length >= 10} onClick={addQuestion}>הוספת שאלה</button></div>
              <div className="preview-navigation"><button type="button" className="preview-back" disabled={previewQuestion === 0} onClick={() => setPreviewQuestion((index) => Math.max(0, index - 1))}>חזרה</button><div role="button" tabIndex={0} className={previewElementClass("primaryButton", "preview-action", false)} style={previewElementStyle("primaryButton", false)} onClick={advancePreview}>{previewQuestion === c.questions.length - 1 ? <InlineField value={c.finalButtonText} maxLength={80} placeholder="טקסט הסיום" onChange={(value) => onConfig("finalButtonText", value)} /> : "לשאלה הבאה"}<span>←</span></div></div>
            </div>}

            {previewScreen === "result" && <div className="preview-site-screen preview-site-result preview-layout-stack">
              {c.showEmoji !== false && previewBlockEnabled("emoji") && <button type="button" className={previewElementClass("emoji", "preview-result-emoji canvas-emoji")} style={previewElementStyle("emoji")} aria-label="בחירת סמל ראשי" onClick={() => selectByStyleKey("emoji")}><SymbolFace emoji={c.emoji} imageUrl={pageEmojiUrl} /></button>}
              <InlineField className={previewElementClass("resultLabel", "preview-mini-label")} style={previewElementStyle("resultLabel")} value={c.resultLabel} maxLength={80} placeholder="תווית הסיום" onChange={(value) => onConfig("resultLabel", value)} />
              <InlineField as="h2" className={previewElementClass("resultTitle")} style={previewElementStyle("resultTitle")} value={c.successTitle} maxLength={140} placeholder="כותרת הסיום" onChange={(value) => onConfig("successTitle", value)} />
              {renderPreviewResultSpecials()}
              {renderLockedPreview("result")}
              <InlineField as="p" className={previewElementClass("resultText")} style={previewElementStyle("resultText")} multiline value={c.successText} maxLength={700} placeholder="הודעת הסיום" onChange={(value) => onConfig("successText", value)} />
              {c.showAnswerRecap !== false && previewBlockEnabled("answers") && <div className={previewElementClass("answerRecap", "preview-answer-recap")} style={previewElementStyle("answerRecap")}>{c.questions.map((question, index) => <div key={index}><span>{index + 1}</span><p><small>{question.prompt}</small><b>{previewAnswers[index] || "עדיין לא נבחרה תשובה"}</b></p></div>)}</div>}
              {previewBlockEnabled("share") && <div className={previewElementClass("shareButtons", "preview-share-actions")} style={previewElementStyle("shareButtons")}>{c.showWhatsApp !== false && <div role="button" tabIndex={0} className="preview-action preview-whatsapp"><InlineField value={c.buttonText} maxLength={80} placeholder="טקסט השיתוף" onChange={(value) => onConfig("buttonText", value)} /></div>}{c.showTelegram === true && <button type="button" className="preview-share-button">✈️ טלגרם</button>}{c.showCopy === true && <button type="button" className="preview-share-button">📋 העתקה</button>}</div>}<button type="button" className="preview-restart" onClick={() => setPreviewScreen("intro")}>התחלה מחדש</button>
            </div>}
            {profile.plan === "free" && <div className="preview-watermark">נוצר עם <b>Linkli</b></div>}
          </div>
          </MusicPlaybackProvider>
        </div>
        <p className="preview-interaction-hint">גררו מהסרגל אל העמוד כדי להוסיף. אחרי זה אפשר ללחוץ, להזיז ולמחוק כמו בעורך ויזואלי.</p>
      </aside>
    </div>
  </div>;
}
