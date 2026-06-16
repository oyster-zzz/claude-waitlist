// Bundled build

// --- shared/constants.js ---
const __mod_shared_constants = (() => {
const STORAGE_KEY = "claudeQueueResumerState";
const CLAUDE_URL_PATTERNS = [
    "https://claude.ai/*",
    "https://www.claude.ai/*",
    "https://claude.com/*",
    "https://www.claude.com/*"
];
const RESET_ALARM = "claude-queue-resumer-reset";
const RESET_FIVE_MIN_ALARM = "claude-queue-resumer-reset-minus-five";
const RETRY_SEND_ALARM = "claude-queue-resumer-retry-send";
const NOTIFICATION_ICON_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
const QUEUE_TASK_LIMIT = 6;
const DEFAULT_SETTINGS = {
    autoSendNext: true,
    requireConfirmByDefault: true,
    maxAutoSendAfterReset: QUEUE_TASK_LIMIT,
    desktopNotifications: true,
    allowBatchAfterReset: false,
    language: "en"
};
return { STORAGE_KEY, CLAUDE_URL_PATTERNS, RESET_ALARM, RESET_FIVE_MIN_ALARM, RETRY_SEND_ALARM, NOTIFICATION_ICON_URL, QUEUE_TASK_LIMIT, DEFAULT_SETTINGS };
})();

// --- shared/queue.js ---
const __mod_shared_queue = (() => {
const sendableStatuses = new Set(["pending", "ready"]);
const activeStatuses = new Set(["pending", "ready", "waiting_limit", "sending", "needs_confirm"]);
const terminalStatuses = new Set(["sent", "failed", "skipped"]);
const knownStatuses = new Set(["pending", "waiting_limit", "ready", "sending", "sent", "failed", "skipped", "needs_confirm"]);
function createTask(input) {
    const now = Date.now();
    const id = crypto.randomUUID();
    return {
        id,
        title: input.title.trim() || input.fallbackTitle || "未命名任务",
        content: input.content,
        conversationMode: input.conversationMode,
        conversationTitle: input.conversationTitle,
        conversationUrl: input.conversationUrl,
        chainId: input.chainId ?? (input.conversationMode === "new" ? id : undefined),
        chainOrder: input.chainOrder ?? (input.conversationMode === "new" ? 0 : undefined),
        status: "pending",
        priority: input.priority ?? 0,
        createdAt: now,
        updatedAt: now,
        requireConfirm: input.requireConfirm ?? false,
        autoSend: input.autoSend ?? true,
        retryCount: 0,
        maxRetries: 2
    };
}
function sortQueue(tasks) {
    return [...tasks].sort((a, b) => {
        if (b.priority !== a.priority)
            return b.priority - a.priority;
        return a.createdAt - b.createdAt;
    });
}
function getNextTask(tasks, includeNeedsConfirm = false) {
    const allowed = new Set(sendableStatuses);
    if (includeNeedsConfirm)
        allowed.add("needs_confirm");
    return sortQueue(tasks).find((task) => allowed.has(task.status) && !isBlockedByChainPredecessor(task, tasks));
}
function getNextAutoSendTask(tasks) {
    return sortQueue(tasks).find((task) => sendableStatuses.has(task.status) && task.autoSend && !task.requireConfirm && !isBlockedByChainPredecessor(task, tasks));
}
function getNextResetResumeTask(tasks) {
    return sortQueue(tasks).find((task) => sendableStatuses.has(task.status) && !task.requireConfirm && !isBlockedByChainPredecessor(task, tasks));
}
function isBlockedByChainPredecessor(task, tasks) {
    if (!task.chainId || task.chainOrder === undefined)
        return false;
    const chainOrder = task.chainOrder;
    return tasks.some((candidate) => {
        if (candidate.id === task.id || candidate.chainId !== task.chainId)
            return false;
        if ((candidate.chainOrder ?? 0) >= chainOrder)
            return false;
        return candidate.status !== "sent" && candidate.status !== "skipped";
    });
}
function isActiveQueueTask(task) {
    return activeStatuses.has(task.status);
}
function isTerminalTask(task) {
    return terminalStatuses.has(task.status);
}
function getActiveTasks(tasks) {
    return sortQueue(tasks).filter(isActiveQueueTask);
}
function touchTask(task, patch) {
    return {
        ...task,
        ...patch,
        updatedAt: Date.now()
    };
}
function normalizeImportedTasks(tasks, fallbackTitle = "导入的任务") {
    const now = Date.now();
    return tasks
        .filter((task) => typeof task.content === "string" && task.content.trim().length > 0)
        .map((task) => {
        const status = knownStatuses.has(task.status) ? task.status : "pending";
        return {
            id: typeof task.id === "string" && task.id ? task.id : crypto.randomUUID(),
            title: typeof task.title === "string" && task.title ? task.title : fallbackTitle,
            content: task.content,
            conversationMode: task.conversationMode === "new" || task.conversationMode === "current" ? task.conversationMode : undefined,
            conversationTitle: typeof task.conversationTitle === "string" ? task.conversationTitle : undefined,
            conversationUrl: typeof task.conversationUrl === "string" ? task.conversationUrl : undefined,
            chainId: typeof task.chainId === "string" && task.chainId ? task.chainId : undefined,
            chainOrder: Number.isFinite(task.chainOrder) ? task.chainOrder : undefined,
            status: status === "sending" ? "pending" : status,
            priority: Number.isFinite(task.priority) ? task.priority : 0,
            createdAt: Number.isFinite(task.createdAt) ? task.createdAt : now,
            updatedAt: now,
            sentAt: task.sentAt,
            error: status === "sending" ? undefined : task.error,
            requireConfirm: typeof task.requireConfirm === "boolean" ? task.requireConfirm : false,
            autoSend: typeof task.autoSend === "boolean" ? task.autoSend : false,
            retryCount: Number.isFinite(task.retryCount) ? task.retryCount : 0,
            maxRetries: Number.isFinite(task.maxRetries) ? task.maxRetries : 2
        };
    });
}
return { createTask, sortQueue, getNextTask, getNextAutoSendTask, getNextResetResumeTask, isActiveQueueTask, isTerminalTask, getActiveTasks, touchTask, normalizeImportedTasks };
})();

// --- shared/storage.js ---
const __mod_shared_storage = (() => {
const DEFAULT_SETTINGS = __mod_shared_constants.DEFAULT_SETTINGS;
const STORAGE_KEY = __mod_shared_constants.STORAGE_KEY;
function normalizeLanguage(value) {
    return value === "en" || value === "zh" ? value : DEFAULT_SETTINGS.language;
}
function normalizeSettings(settings) {
    return {
        ...DEFAULT_SETTINGS,
        language: normalizeLanguage(settings?.language)
    };
}
function defaultState() {
    return {
        claudePage: {
            isOpen: false,
            limitStatus: "unknown"
        },
        tasks: [],
        settings: { ...DEFAULT_SETTINGS },
        updatedAt: Date.now()
    };
}
async function loadState() {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const existing = stored[STORAGE_KEY];
    const fallback = defaultState();
    return {
        ...fallback,
        ...existing,
        claudePage: {
            ...fallback.claudePage,
            ...existing?.claudePage
        },
        settings: normalizeSettings(existing?.settings),
        tasks: Array.isArray(existing?.tasks) ? existing.tasks : []
    };
}
async function saveState(state) {
    const next = {
        ...state,
        settings: normalizeSettings(state.settings),
        updatedAt: Date.now()
    };
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    return next;
}
async function updateState(mutator) {
    const current = await loadState();
    const next = await mutator(current);
    return saveState(next);
}
return { defaultState, loadState, saveState, updateState };
})();

// --- background/i18n.js ---
const __mod_background_i18n = (() => {
let currentLocale = "en";
function setLocale(locale) {
    currentLocale = locale;
}
const messages = {
    "queue.unnamed_task": { zh: "未命名任务", en: "Unnamed task" },
    "queue.imported_task": { zh: "导入的任务", en: "Imported task" },
    "sw.no_pending": { zh: "没有待发送任务。", en: "No pending task." },
    "sw.no_claude_page": { zh: "未找到打开的 Claude 页面。", en: "Claude page not found." },
    "sw.send_request_failed": { zh: "发送请求失败。", en: "Send request failed." },
    "sw.submit_stop_retry": { zh: "已触发发送，但无法确认 Claude 是否已清空输入。已停止重试以避免重复发送。", en: "Send triggered, but could not confirm input was cleared. Stopped retrying." },
    "sw.notify_queue_title": { zh: "Claude Waitlist", en: "Claude Waitlist" },
    "sw.notify_sent": { zh: "已发送：{title}", en: "Sent: {title}" },
    "sw.notify_submitted_no_retry": { zh: "已触发发送，未重试：{title}", en: "Triggered, no retry: {title}" },
    "sw.input_not_empty": { zh: "Claude 输入框已有内容，为避免覆盖你的输入，本次未发送。", en: "Claude input has content. Skipped to avoid overwriting." },
    "sw.retry_later": { zh: "{error} 将在 1 分钟后重试（{count}/{max}）。", en: "{error} Retrying in 1 min ({count}/{max})." },
    "sw.send_failed": { zh: "发送失败。", en: "Send failed." },
    "sw.notify_retry": { zh: "发送失败，将重试：{title}", en: "Send failed, will retry: {title}" },
    "sw.notify_failed": { zh: "发送失败：{error}", en: "Send failed: {error}" },
    "sw.unknown_error": { zh: "未知错误", en: "Unknown error" },
    "sw.limit_detected": { zh: "检测到 Claude 使用限制", en: "Claude usage limit detected" },
    "sw.limit_wait_with_reset": { zh: "已进入等待状态，将在检测到的重置时间后继续。", en: "Waiting, will resume after detected reset time." },
    "sw.limit_wait_no_reset": { zh: "已进入等待状态，但未检测到明确重置时间。", en: "Waiting, but no clear reset time detected." },
    "sw.reset_soon": { zh: "Claude 即将重置", en: "Claude resetting soon" },
    "sw.reset_5min": { zh: "距离检测到的重置时间约 5 分钟。", en: "About 5 minutes until detected reset time." },
    "sw.reset_now": { zh: "Claude 重置时间已到", en: "Claude reset time reached" },
    "sw.reset_sending": { zh: "正在检测 Claude 页面，并准备依次发送队列任务。", en: "Detecting Claude page, preparing to send queue tasks." },
    "sw.queue_full": { zh: "队列最多保留 {n} 条待处理任务。", en: "Queue can hold at most {n} pending tasks." },
    "sw.unsupported": { zh: "不支持的消息。", en: "Unsupported message." }
};
function t(key, params) {
    const entry = messages[key];
    let text = entry?.[currentLocale] ?? entry?.zh ?? key;
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(`{${k}}`, String(v));
        }
    }
    return text;
}
return { setLocale, t };
})();

// --- background/serviceWorker.js (entry) ---
const CLAUDE_URL_PATTERNS = __mod_shared_constants.CLAUDE_URL_PATTERNS;
const DEFAULT_SETTINGS = __mod_shared_constants.DEFAULT_SETTINGS;
const NOTIFICATION_ICON_URL = __mod_shared_constants.NOTIFICATION_ICON_URL;
const QUEUE_TASK_LIMIT = __mod_shared_constants.QUEUE_TASK_LIMIT;
const RESET_ALARM = __mod_shared_constants.RESET_ALARM;
const RESET_FIVE_MIN_ALARM = __mod_shared_constants.RESET_FIVE_MIN_ALARM;
const RETRY_SEND_ALARM = __mod_shared_constants.RETRY_SEND_ALARM;
const createTask = __mod_shared_queue.createTask;
const getNextAutoSendTask = __mod_shared_queue.getNextAutoSendTask;
const getNextResetResumeTask = __mod_shared_queue.getNextResetResumeTask;
const getNextTask = __mod_shared_queue.getNextTask;
const isActiveQueueTask = __mod_shared_queue.isActiveQueueTask;
const isTerminalTask = __mod_shared_queue.isTerminalTask;
const normalizeImportedTasks = __mod_shared_queue.normalizeImportedTasks;
const sortQueue = __mod_shared_queue.sortQueue;
const touchTask = __mod_shared_queue.touchTask;
const loadState = __mod_shared_storage.loadState;
const saveState = __mod_shared_storage.saveState;
const updateState = __mod_shared_storage.updateState;
const setLocale = __mod_background_i18n.setLocale;
const t = __mod_background_i18n.t;
let autoSendInFlight = false;
function normalizeLanguage(value) {
    return value === "en" || value === "zh" ? value : undefined;
}
function shouldKeepUsageLimit(previous, detection) {
    const previousLimit = previous.claudePage.limitStatus;
    const usageLimited = previousLimit === "limited" || previousLimit === "limited_unknown_reset";
    const usageSource = previous.claudePage.usageText?.startsWith("usage snapshot:");
    const resetStillPending = previous.claudePage.resetAt === undefined || previous.claudePage.resetAt > Date.now();
    return usageLimited && usageSource === true && resetStillPending && detection.source !== "usage" && detection.limitStatus === "available";
}
async function syncLocale() {
    const state = await loadState();
    setLocale(state.settings.language ?? DEFAULT_SETTINGS.language);
}
async function notify(title, message) {
    const state = await loadState();
    if (!state.settings.desktopNotifications)
        return;
    try {
        await chrome.notifications.create({
            type: "basic",
            iconUrl: NOTIFICATION_ICON_URL,
            title,
            message
        });
    }
    catch (error) {
        console.warn("Notification failed", error);
    }
}
async function broadcastState() {
    chrome.runtime.sendMessage({ type: "STATE_UPDATED", state: await loadState() }).catch(() => undefined);
}
async function scheduleResetAlarms(resetAt) {
    await chrome.alarms.clear(RESET_ALARM);
    await chrome.alarms.clear(RESET_FIVE_MIN_ALARM);
    if (!resetAt)
        return;
    await chrome.alarms.create(RESET_ALARM, { when: resetAt });
    const fiveMinutesBefore = resetAt - 5 * 60 * 1000;
    if (fiveMinutesBefore > Date.now()) {
        await chrome.alarms.create(RESET_FIVE_MIN_ALARM, { when: fiveMinutesBefore });
    }
}
function isClaudeUrl(url) {
    if (!url)
        return false;
    return /^https:\/\/(www\.)?claude\.(ai|com)\//.test(url);
}
function isClaudeChatUrl(url) {
    if (!url)
        return false;
    try {
        const parsed = new URL(url);
        return isClaudeUrl(url) && /\/chat\//.test(parsed.pathname);
    }
    catch {
        return false;
    }
}
function sendWasStarted(result) {
    return result.ok || result.submitted === true;
}
function normalizeTitle(value) {
    return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}
function findReusableChainId(tasks, message) {
    if (message.chainId)
        return message.chainId;
    if (message.conversationMode !== "new")
        return undefined;
    const title = normalizeTitle(message.conversationTitle || message.title);
    if (!title)
        return undefined;
    return sortQueue(tasks).find((task) => {
        if (!isActiveQueueTask(task))
            return false;
        if (task.conversationMode !== "new")
            return false;
        if (!task.chainId || task.conversationUrl)
            return false;
        return normalizeTitle(task.conversationTitle || task.title) === title;
    })?.chainId;
}
function nextChainOrder(tasks, chainId) {
    if (!chainId)
        return undefined;
    const orders = tasks.filter((task) => task.chainId === chainId).map((task) => task.chainOrder).filter((order) => Number.isFinite(order));
    return orders.length ? Math.max(...orders) + 1 : 0;
}
async function ensureContentScript(tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, { type: "PING" });
        return true;
    }
    catch {
        // Extension reloads do not automatically attach content scripts to already-open tabs.
    }
    try {
        const tab = await chrome.tabs.get(tabId);
        if (!isClaudeUrl(tab.url))
            return false;
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ["contentScript.js"]
        });
        await chrome.tabs.sendMessage(tabId, { type: "PING" });
        return true;
    }
    catch (error) {
        console.warn("Unable to attach content script", error);
        return false;
    }
}
async function findClaudeTab(preferredTabId) {
    if (preferredTabId !== undefined) {
        if (await ensureContentScript(preferredTabId)) {
            return preferredTabId;
        }
    }
    const tabs = await chrome.tabs.query({ url: CLAUDE_URL_PATTERNS });
    for (const tab of tabs) {
        if (tab.id === undefined)
            continue;
        if (await ensureContentScript(tab.id)) {
            return tab.id;
        }
    }
    return undefined;
}
async function waitForTabLoad(tabId) {
    await new Promise((resolve) => {
        let timeout;
        const finish = () => {
            if (timeout !== undefined)
                globalThis.clearTimeout(timeout);
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
        };
        const listener = (updatedTabId, changeInfo) => {
            if (updatedTabId !== tabId || changeInfo.status !== "complete")
                return;
            finish();
        };
        timeout = globalThis.setTimeout(finish, 8000);
        chrome.tabs.onUpdated.addListener(listener);
    });
}
async function prepareTabForTask(tabId, task) {
    if (task.conversationMode === "current" && task.conversationUrl) {
        const tab = await chrome.tabs.get(tabId).catch(() => undefined);
        if (tab?.url !== task.conversationUrl) {
            await chrome.tabs.update(tabId, { url: task.conversationUrl });
            await waitForTabLoad(tabId);
            return (await ensureContentScript(tabId)) ? tabId : undefined;
        }
    }
    return tabId;
}
async function requestDetectNow() {
    const state = await loadState();
    const tabId = await findClaudeTab(state.claudePage.tabId);
    if (tabId === undefined) {
        await updateState((current) => ({
            ...current,
            claudePage: {
                ...current.claudePage,
                isOpen: false,
                limitStatus: "unknown",
                lastCheckedAt: Date.now()
            }
        }));
        await broadcastState();
        return;
    }
    const response = (await chrome.tabs.sendMessage(tabId, { type: "DETECT_NOW" }));
    if (response?.detection) {
        const tab = await chrome.tabs.get(tabId).catch(() => undefined);
        await handleDetectionResult(response.detection, tabId, tab?.url);
    }
}
async function ensureClaudeTabOpen() {
    const state = await loadState();
    const existing = await findClaudeTab(state.claudePage.tabId);
    if (existing !== undefined)
        return existing;
    try {
        const created = await chrome.tabs.create({ url: "https://claude.ai/new", active: false });
        if (created.id === undefined)
            return undefined;
        await waitForTabLoad(created.id);
        if (!(await ensureContentScript(created.id)))
            return undefined;
        await updateState((current) => ({
            ...current,
            claudePage: { ...current.claudePage, isOpen: true, tabId: created.id }
        }));
        return created.id;
    }
    catch {
        return undefined;
    }
}
async function showFloatingPanelFromAction() {
    const state = await loadState();
    let tabId = await findClaudeTab(state.claudePage.tabId);
    if (tabId === undefined) {
        const created = await chrome.tabs.create({ url: "https://claude.ai/new", active: true });
        if (created.id === undefined)
            return;
        tabId = created.id;
        await waitForTabLoad(tabId);
        if (!(await ensureContentScript(tabId)))
            return;
    }
    else {
        const tab = await chrome.tabs.get(tabId).catch(() => undefined);
        await chrome.tabs.update(tabId, { active: true }).catch(() => undefined);
        if (tab?.windowId !== undefined) {
            await chrome.windows.update(tab.windowId, { focused: true }).catch(() => undefined);
        }
    }
    await chrome.tabs.sendMessage(tabId, { type: "SHOW_FLOATING_PANEL" }).catch(() => undefined);
    await requestDetectNow();
}
async function waitForResponseCompleteOnTab(tabId) {
    const targetTabId = await findClaudeTab(tabId);
    if (targetTabId === undefined)
        return;
    await chrome.tabs.sendMessage(targetTabId, { type: "WAIT_FOR_CLAUDE_RESPONSE_COMPLETE" });
}
async function sendReadyTasksAfterReset() {
    const initial = await loadState();
    if (initial.claudePage.limitStatus !== "available" || !initial.settings.allowBatchAfterReset)
        return;
    for (let sent = 0; sent < initial.settings.maxAutoSendAfterReset; sent += 1) {
        const result = await sendNextTask("reset");
        if (!sendWasStarted(result))
            break;
        const latest = await loadState();
        if (!getNextResetResumeTask(latest.tasks))
            break;
        await waitForResponseCompleteOnTab(latest.claudePage.tabId);
    }
}
async function runAutoSendQueueAfterReset() {
    if (autoSendInFlight)
        return;
    autoSendInFlight = true;
    try {
        await sendReadyTasksAfterReset();
    }
    finally {
        autoSendInFlight = false;
    }
}
async function simulateResetSendTest() {
    await updateState((state) => ({
        ...state,
        claudePage: {
            ...state.claudePage,
            limitStatus: "available",
            resetAt: undefined,
            resetText: undefined,
            lastCheckedAt: Date.now()
        },
        tasks: state.tasks.map((task) => (task.status === "waiting_limit" ? touchTask(task, { status: "ready", error: undefined }) : task))
    }));
    await broadcastState();
    let result = { ok: false, error: t("sw.no_pending") };
    for (let sent = 0; sent < QUEUE_TASK_LIMIT; sent += 1) {
        result = await sendNextTask("manual");
        if (!sendWasStarted(result))
            break;
        const latest = await loadState();
        if (!getNextTask(latest.tasks))
            break;
        await waitForResponseCompleteOnTab(latest.claudePage.tabId);
    }
    await broadcastState();
    return result;
}
function updateTask(tasks, taskId, patch) {
    return tasks.map((task) => (task.id === taskId ? touchTask(task, patch) : task));
}
function bindChainContinuationTasks(tasks, task, conversationUrl, conversationTitle) {
    if (!task.chainId || !conversationUrl)
        return tasks;
    return tasks.map((item) => {
        if (item.id === task.id || item.chainId !== task.chainId || !isActiveQueueTask(item))
            return item;
        return touchTask(item, {
            conversationMode: "current",
            conversationUrl,
            conversationTitle: item.conversationTitle || conversationTitle,
            error: undefined
        });
    });
}
function updateSentTaskAndChain(tasks, task, result, error) {
    const conversationUrl = isClaudeChatUrl(result.conversationUrl) ? result.conversationUrl : task.conversationUrl;
    const conversationTitle = result.conversationTitle || task.conversationTitle;
    const sentPatch = {
        status: "sent",
        sentAt: Date.now(),
        conversationUrl,
        conversationTitle,
        error
    };
    return bindChainContinuationTasks(tasks.map((item) => (item.id === task.id ? touchTask(item, sentPatch) : item)), task, conversationUrl, conversationTitle);
}
async function sendNextTask(mode = "auto") {
    const state = await loadState();
    const nextTask = mode === "manual" ? getNextTask(state.tasks, true) : mode === "reset" ? getNextResetResumeTask(state.tasks) : getNextAutoSendTask(state.tasks);
    if (!nextTask)
        return { ok: false, error: t("sw.no_pending") };
    const foundTabId = (await findClaudeTab(state.claudePage.tabId)) ?? (await ensureClaudeTabOpen());
    const tabId = foundTabId === undefined ? undefined : await prepareTabForTask(foundTabId, nextTask);
    if (tabId === undefined) {
        await updateState((current) => ({
            ...current,
            claudePage: { ...current.claudePage, isOpen: false },
            tasks: updateTask(current.tasks, nextTask.id, { status: "failed", error: t("sw.no_claude_page") })
        }));
        await broadcastState();
        return { ok: false, error: t("sw.no_claude_page") };
    }
    await updateState((current) => ({
        ...current,
        tasks: updateTask(current.tasks, nextTask.id, { status: "sending", error: undefined })
    }));
    await broadcastState();
    let result;
    try {
        result = (await chrome.tabs.sendMessage(tabId, {
            type: "SEND_TASK",
            taskId: nextTask.id,
            content: nextTask.content,
            task: nextTask
        }));
    }
    catch (error) {
        result = { ok: false, error: error instanceof Error ? error.message : t("sw.send_request_failed") };
    }
    if (sendWasStarted(result)) {
        await updateState((current) => ({
            ...current,
            tasks: updateSentTaskAndChain(current.tasks, nextTask, result, result.ok ? undefined : t("sw.submit_stop_retry"))
        }));
        await notify(t("sw.notify_queue_title"), result.ok ? t("sw.notify_sent", { title: nextTask.title }) : t("sw.notify_submitted_no_retry", { title: nextTask.title }));
    }
    else {
        const shouldRetry = mode !== "manual" &&
            result.error !== "INPUT_NOT_EMPTY" &&
            nextTask.conversationMode !== "new" &&
            nextTask.retryCount + 1 <= nextTask.maxRetries;
        const status = result.error === "INPUT_NOT_EMPTY" ? "needs_confirm" : shouldRetry ? "ready" : "failed";
        const retryCount = nextTask.retryCount + 1;
        const error = result.error === "INPUT_NOT_EMPTY"
            ? t("sw.input_not_empty")
            : shouldRetry
                ? t("sw.retry_later", { error: result.error ?? t("sw.send_failed"), count: retryCount, max: nextTask.maxRetries })
                : result.error ?? t("sw.send_failed");
        await updateState((current) => ({
            ...current,
            tasks: updateTask(current.tasks, nextTask.id, {
                status,
                retryCount,
                error
            })
        }));
        await notify(t("sw.notify_queue_title"), shouldRetry ? t("sw.notify_retry", { title: nextTask.title }) : t("sw.notify_failed", { error: result.error ?? t("sw.unknown_error") }));
        if (shouldRetry) {
            await chrome.alarms.create(RETRY_SEND_ALARM, { delayInMinutes: 1 });
        }
    }
    await broadcastState();
    return result;
}
async function handleDetectionResult(detection, tabId, url) {
    const previous = await loadState();
    const hadWaitingTasks = previous.tasks.some((task) => task.status === "waiting_limit");
    const effectiveDetection = shouldKeepUsageLimit(previous, detection)
        ? {
            ...detection,
            limitStatus: previous.claudePage.limitStatus,
            resetAt: previous.claudePage.resetAt,
            resetText: previous.claudePage.resetText,
            usageText: previous.claudePage.usageText
        }
        : detection;
    const next = await saveState({
        ...previous,
        claudePage: {
            isOpen: true,
            tabId,
            url,
            lastSeenAt: Date.now(),
            limitStatus: effectiveDetection.limitStatus,
            resetAt: effectiveDetection.resetAt,
            resetText: effectiveDetection.resetText,
            usageText: effectiveDetection.usageText,
            lastCheckedAt: effectiveDetection.checkedAt
        },
        tasks: effectiveDetection.limitStatus === "limited" || effectiveDetection.limitStatus === "limited_unknown_reset"
            ? previous.tasks.map((task) => task.status === "pending" || task.status === "ready" ? touchTask(task, { status: "waiting_limit" }) : task)
            : previous.tasks
    });
    if (effectiveDetection.limitStatus === "limited" || effectiveDetection.limitStatus === "limited_unknown_reset") {
        await notify(t("sw.limit_detected"), effectiveDetection.resetAt ? t("sw.limit_wait_with_reset") : t("sw.limit_wait_no_reset"));
    }
    await scheduleResetAlarms(effectiveDetection.resetAt);
    await broadcastState();
    if (next.claudePage.limitStatus === "available" && previous.claudePage.limitStatus !== "available") {
        await updateState((current) => ({
            ...current,
            tasks: current.tasks.map((task) => (task.status === "waiting_limit" ? touchTask(task, { status: "ready" }) : task))
        }));
        await broadcastState();
        const latest = await loadState();
        const hasReadyTasks = Boolean(getNextResetResumeTask(latest.tasks));
        if (hadWaitingTasks || hasReadyTasks || previous.claudePage.limitStatus === "limited" || previous.claudePage.limitStatus === "limited_unknown_reset") {
            await runAutoSendQueueAfterReset();
        }
    }
}
async function handleContentStatus(message, sender) {
    await handleDetectionResult(message.detection, sender.tab?.id, sender.tab?.url);
}
chrome.runtime.onInstalled.addListener(async () => {
    await saveState(await loadState());
});
chrome.action.onClicked.addListener(() => {
    void showFloatingPanelFromAction().catch((error) => console.error(error));
});
chrome.alarms.onAlarm.addListener((alarm) => {
    (async () => {
        await syncLocale();
        if (alarm.name === RESET_FIVE_MIN_ALARM) {
            await notify(t("sw.reset_soon"), t("sw.reset_5min"));
            return;
        }
        if (alarm.name === RESET_ALARM) {
            await notify(t("sw.reset_now"), t("sw.reset_sending"));
            // The alarm was scheduled at the reset time — trust it and set available directly,
            // rather than relying on page detection which requires an open Claude tab.
            await updateState((state) => ({
                ...state,
                claudePage: {
                    ...state.claudePage,
                    limitStatus: "available",
                    resetAt: undefined,
                    resetText: undefined,
                    lastCheckedAt: Date.now()
                },
                tasks: state.tasks.map((task) => (task.status === "waiting_limit" ? touchTask(task, { status: "ready" }) : task))
            }));
            await broadcastState();
            // Ensure a Claude tab exists so auto-send can proceed
            await ensureClaudeTabOpen();
            await runAutoSendQueueAfterReset();
            return;
        }
        if (alarm.name === RETRY_SEND_ALARM) {
            await sendNextTask("auto");
        }
    })().catch((error) => console.error(error));
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        await syncLocale();
        switch (message.type) {
            case "CONTENT_STATUS":
                await handleContentStatus(message, sender);
                return { ok: true };
            case "GET_STATE":
                return { ok: true, state: await loadState() };
            case "DETECT_NOW":
                await requestDetectNow();
                return { ok: true, state: await loadState() };
            case "SEND_NEXT_NOW":
                return { ok: true, result: await sendNextTask("manual"), state: await loadState() };
            case "SIMULATE_RESET_SEND_TEST":
                return { ok: true, result: await simulateResetSendTest(), state: await loadState() };
            case "ADD_TASK": {
                const current = await loadState();
                if (current.tasks.filter(isActiveQueueTask).length >= QUEUE_TASK_LIMIT) {
                    return { ok: false, error: t("sw.queue_full", { n: QUEUE_TASK_LIMIT }), state: current };
                }
                const chainId = findReusableChainId(current.tasks, message);
                const autoSend = message.autoSend ?? true;
                const state = await updateState((current) => ({
                    ...current,
                    tasks: sortQueue([
                        ...current.tasks,
                        createTask({
                            title: message.title,
                            content: message.content,
                            conversationMode: message.conversationMode,
                            conversationTitle: message.conversationTitle,
                            conversationUrl: message.conversationUrl,
                            chainId,
                            chainOrder: message.chainOrder ?? nextChainOrder(current.tasks, chainId),
                            priority: message.priority,
                            requireConfirm: message.requireConfirm ?? false,
                            autoSend,
                            fallbackTitle: t("queue.unnamed_task")
                        })
                    ])
                }));
                const existingTaskIds = new Set(current.tasks.map((task) => task.id));
                const createdTask = state.tasks.find((task) => !existingTaskIds.has(task.id));
                if (createdTask?.autoSend && !createdTask.requireConfirm && state.claudePage.limitStatus === "available") {
                    await sendNextTask("auto");
                    return { ok: true, state: await loadState() };
                }
                return { ok: true, state };
            }
            case "UPDATE_TASK": {
                const state = await updateState((current) => ({
                    ...current,
                    tasks: (() => {
                        const originalTask = current.tasks.find((task) => task.id === message.taskId);
                        const updatedTasks = updateTask(current.tasks, message.taskId, message.patch);
                        if (!originalTask || message.patch.status !== "sent" || !isClaudeChatUrl(message.patch.conversationUrl))
                            return updatedTasks;
                        return bindChainContinuationTasks(updatedTasks, originalTask, message.patch.conversationUrl, message.patch.conversationTitle || originalTask.conversationTitle);
                    })()
                }));
                return { ok: true, state };
            }
            case "DELETE_TASK": {
                const state = await updateState((current) => ({
                    ...current,
                    tasks: current.tasks.filter((task) => task.id !== message.taskId)
                }));
                return { ok: true, state };
            }
            case "SKIP_TASK": {
                const state = await updateState((current) => ({
                    ...current,
                    tasks: updateTask(current.tasks, message.taskId, { status: "skipped" })
                }));
                return { ok: true, state };
            }
            case "BUMP_TASK": {
                const state = await updateState((current) => {
                    const maxPriority = current.tasks.reduce((highest, task) => {
                        if (!isActiveQueueTask(task) || task.id === message.taskId)
                            return highest;
                        return Math.max(highest, task.priority ?? 0);
                    }, 0);
                    return {
                        ...current,
                        tasks: sortQueue(updateTask(current.tasks, message.taskId, { priority: maxPriority + 1 }))
                    };
                });
                return { ok: true, state };
            }
            case "CLEAR_ACTIVE": {
                const state = await updateState((current) => ({
                    ...current,
                    tasks: current.tasks.filter((task) => !isActiveQueueTask(task))
                }));
                return { ok: true, state };
            }
            case "CLEAR_SENT": {
                const state = await updateState((current) => ({
                    ...current,
                    tasks: current.tasks.filter((task) => !isTerminalTask(task))
                }));
                return { ok: true, state };
            }
            case "IMPORT_QUEUE": {
                const current = await loadState();
                const remainingSlots = Math.max(0, QUEUE_TASK_LIMIT - current.tasks.filter(isActiveQueueTask).length);
                if (remainingSlots === 0) {
                    return { ok: false, error: t("sw.queue_full", { n: QUEUE_TASK_LIMIT }), state: current };
                }
                let addedActive = 0;
                const imported = normalizeImportedTasks(message.tasks, t("queue.imported_task")).filter((task) => {
                    if (!isActiveQueueTask(task))
                        return true;
                    if (addedActive >= remainingSlots)
                        return false;
                    addedActive += 1;
                    return true;
                });
                const state = await updateState((current) => ({
                    ...current,
                    tasks: sortQueue([...current.tasks, ...imported])
                }));
                return { ok: true, state };
            }
            case "UPDATE_SETTINGS": {
                const state = await updateState((current) => {
                    const nextLanguage = normalizeLanguage(message.patch.language);
                    const settings = {
                        ...current.settings,
                        language: nextLanguage ?? current.settings.language
                    };
                    return {
                        ...current,
                        settings
                    };
                });
                return { ok: true, state };
            }
            default:
                return { ok: false, error: t("sw.unsupported") };
        }
    })()
        .then(sendResponse)
        .catch((error) => {
        console.error(error);
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    });
    return true;
});
