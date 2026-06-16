// Bundled build

// --- shared/parseResetTime.js ---
const __mod_shared_parseResetTime = (() => {
function withTime(base, hour, minute) {
    const result = new Date(base);
    result.setHours(hour, minute, 0, 0);
    return result;
}
function normalizeHour(hour, meridiem) {
    if (!meridiem)
        return hour;
    const marker = meridiem.toLowerCase();
    if (marker === "am")
        return hour === 12 ? 0 : hour;
    return hour === 12 ? 12 : hour + 12;
}
function parseClockTime(value, base) {
    const match = value.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (!match)
        return null;
    const rawHour = Number(match[1]);
    const minute = match[2] ? Number(match[2]) : 0;
    const meridiem = match[3];
    if (minute > 59)
        return null;
    if (meridiem) {
        if (rawHour < 1 || rawHour > 12)
            return null;
    }
    else if (rawHour > 23) {
        return null;
    }
    return withTime(base, normalizeHour(rawHour, meridiem), minute);
}
function addIfPast(date, now) {
    if (date.getTime() <= now.getTime()) {
        const tomorrow = new Date(date);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
    }
    return date;
}
function parseResetTime(text, now = new Date()) {
    const normalized = text.replace(/\s+/g, " ").trim();
    const lower = normalized.toLowerCase();
    const relative = lower.match(/\bin\s+(?:(\d+)\s*(?:hours?|hrs?|h))?\s*(?:(\d+)\s*(?:minutes?|mins?|m))?\b/);
    if (relative && (relative[1] || relative[2])) {
        const hours = relative[1] ? Number(relative[1]) : 0;
        const minutes = relative[2] ? Number(relative[2]) : 0;
        const result = new Date(now);
        result.setMinutes(result.getMinutes() + hours * 60 + minutes);
        result.setSeconds(0, 0);
        return result;
    }
    const tomorrow = lower.match(/\btomorrow\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
    if (tomorrow) {
        const base = new Date(now);
        base.setDate(base.getDate() + 1);
        return parseClockTime(tomorrow[1], base);
    }
    const explicitPatterns = [
        /\b(?:resets?|resetting|reset)\s+(?:at|around)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,
        /\btry\s+again\s+(?:at|around)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,
        /\bavailable\s+again\s+(?:at|around)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,
        /\b(?:until|after)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i
    ];
    for (const pattern of explicitPatterns) {
        const match = normalized.match(pattern);
        if (!match)
            continue;
        const parsed = parseClockTime(match[1], now);
        if (parsed)
            return addIfPast(parsed, now);
    }
    return null;
}
function runParseResetTimeSelfTest() {
    const now = new Date("2026-06-12T14:00:00");
    const localKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    const cases = [
        ["resets at 3:00 PM", "2026-06-12T15:00"],
        ["Usage limit reached ∙ Resets 5:30 AM ∙ limits shared with Claude Code", "2026-06-13T05:30"],
        ["resets at 15:00", "2026-06-12T15:00"],
        ["try again at 3pm", "2026-06-12T15:00"],
        ["available again at 3:00 PM", "2026-06-12T15:00"],
        ["in 2 hours", "2026-06-12T16:00"],
        ["in 37 minutes", "2026-06-12T14:37"],
        ["tomorrow at 9:00 AM", "2026-06-13T09:00"]
    ];
    for (const [input, expectedPrefix] of cases) {
        const parsed = parseResetTime(input, now);
        if (!parsed || localKey(parsed) !== expectedPrefix) {
            throw new Error(`parseResetTime failed for "${input}": got ${parsed ? localKey(parsed) : "null"}`);
        }
    }
}
return { parseResetTime, runParseResetTimeSelfTest };
})();

// --- content/claudeDetector.js ---
const __mod_content_claudeDetector = (() => {
const parseResetTime = __mod_shared_parseResetTime.parseResetTime;
const LIMIT_KEYWORDS = [
    "limit reached",
    "usage limit",
    "message limit",
    "try again",
    "resets at",
    "reset",
    "5-hour",
    "5 hour",
    "available again",
    "reached your limit"
];
const USAGE_PATTERNS = [
    /\b\d+\s+(?:messages?|prompts?|requests?)\s+(?:remaining|left)\b/i,
    /\b(?:remaining|left):?\s*\d+\s+(?:messages?|prompts?|requests?)\b/i,
    /\b\d+\s*%\s*(?:used|remaining|left)\b/i,
    /\b(?:used|usage):?\s*\d+\s*(?:\/|of)\s*\d+\b/i,
    /\b(?:\d+\s*(?:\/|of)\s*\d+)\s+(?:messages?|prompts?|requests?)\b/i,
    /\busage\s+limit\s+reached\s*[∙•-]?\s*(?:resets?|reset)\s+[^.。\n]{2,80}/i,
    /\b(?:resets?|reset)\s+(?:at|in)?\s*[^.。\n]{2,80}/i
];
const RESET_TIME_PATTERN = /\b(resets?|reset)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
const FLOATING_PANEL_ROOT_ID = "claude-queue-resumer-floating-root";
function hasLimitBlockedText(text) {
    return (/\b(?:usage|message)\s+limit\s+reached\b/i.test(text) ||
        /\blimit\s+reached\b/i.test(text) ||
        /\breached\s+(?:your|the)\s+(?:usage\s+|message\s+)?limit\b/i.test(text) ||
        /\byou(?:'ve| have)?\s+reached\b[^.。\n]{0,80}\blimit\b/i.test(text) ||
        (/\btry\s+again\b/i.test(text) && /\b(?:reset|available again|hours?|hrs?|minutes?|mins?|later)\b/i.test(text)));
}
function getPageText(doc) {
    const body = doc.body;
    if (!body)
        return "";
    const clonedBody = body.cloneNode(true);
    clonedBody.querySelector(`#${FLOATING_PANEL_ROOT_ID}`)?.remove();
    return clonedBody.innerText ?? clonedBody.textContent ?? "";
}
function cleanDetectedUsageText(value) {
    if (!value)
        return undefined;
    const normalized = value
        .replace(/\[[^\]]+\]\([^)]*\)/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\s+/g, " ")
        .trim();
    if (!normalized)
        return undefined;
    const resetMatch = normalized.match(RESET_TIME_PATTERN);
    if (normalized.toLowerCase().includes("usage limit reached")) {
        return resetMatch ? `Usage limit reached · ${resetMatch[1]} ${resetMatch[2]}` : "Usage limit reached";
    }
    if (resetMatch)
        return `${resetMatch[1]} ${resetMatch[2]}`;
    return normalized
        .split(/[∙•·|]/)[0]
        .replace(/\b(?:limits?\s+shared|shared\s+with|claude\s+code|learn\s+more|settings)\b.*$/i, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
}
function extractMatchedText(text) {
    const lower = text.toLowerCase();
    const firstIndex = LIMIT_KEYWORDS.reduce((best, keyword) => {
        const index = lower.indexOf(keyword);
        if (index === -1)
            return best;
        return best === undefined ? index : Math.min(best, index);
    }, undefined);
    if (firstIndex === undefined)
        return undefined;
    const start = Math.max(0, firstIndex - 160);
    const end = Math.min(text.length, firstIndex + 360);
    return text.slice(start, end).replace(/\s+/g, " ").trim();
}
function extractUsageText(text) {
    const normalized = text.replace(/\s+/g, " ").trim();
    const claudeLimit = normalized.match(/\busage\s+limit\s+reached\b[^.。\n]{0,140}/i);
    if (claudeLimit)
        return cleanDetectedUsageText(claudeLimit[0]);
    for (const pattern of USAGE_PATTERNS) {
        const match = normalized.match(pattern);
        if (!match)
            continue;
        return cleanDetectedUsageText(match[0]);
    }
    return undefined;
}
function detectClaudeLimitState(doc = document, now = new Date()) {
    const bodyText = getPageText(doc);
    const matchedText = extractMatchedText(bodyText);
    const usageText = extractUsageText(bodyText);
    const resetDate = matchedText ? parseResetTime(matchedText, now) : parseResetTime(bodyText, now);
    if (hasLimitBlockedText(bodyText)) {
        return {
            limitStatus: resetDate ? "limited" : "limited_unknown_reset",
            resetAt: resetDate?.getTime(),
            resetText: matchedText,
            usageText,
            matchedText,
            source: "page",
            checkedAt: Date.now()
        };
    }
    return {
        limitStatus: "available",
        usageText,
        source: "page",
        checkedAt: Date.now()
    };
}
return { detectClaudeLimitState };
})();

// --- shared/usageSnapshot.js ---
const __mod_shared_usageSnapshot = (() => {
function clampPercent(value) {
    return Math.max(0, Math.min(100, value));
}
function readNumericField(record, keys) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "number" && Number.isFinite(value))
            return value;
    }
    return undefined;
}
function normalizeUsagePercent(record) {
    const percentValue = readNumericField(record, ["percent_used", "percentage", "used_percentage"]);
    if (percentValue !== undefined)
        return clampPercent(percentValue);
    const utilization = record.utilization;
    if (typeof utilization !== "number" || !Number.isFinite(utilization))
        return undefined;
    return clampPercent(utilization > 0 && utilization < 1 ? utilization * 100 : utilization);
}
function normalizeUsageWindow(value) {
    if (!value || typeof value !== "object")
        return undefined;
    const record = value;
    const utilization = normalizeUsagePercent(record);
    if (utilization === undefined)
        return undefined;
    const rawReset = record.resets_at ?? record.reset_at ?? record.resetAt;
    const resetsAt = typeof rawReset === "string"
        ? Date.parse(rawReset)
        : typeof rawReset === "number" && Number.isFinite(rawReset)
            ? rawReset < 10000000000
                ? rawReset * 1000
                : rawReset
            : undefined;
    return {
        utilization,
        resetsAt: resetsAt && Number.isFinite(resetsAt) ? resetsAt : undefined
    };
}
function parseUsagePayload(payload) {
    if (!payload || typeof payload !== "object")
        return undefined;
    const record = payload;
    const windows = typeof record.windows === "object" && record.windows ? record.windows : undefined;
    const fiveHour = normalizeUsageWindow(record.five_hour ?? record.fiveHour ?? record.session ?? windows?.["5h"]);
    const weekly = normalizeUsageWindow(record.seven_day ?? record.sevenDay ?? record.weekly ?? windows?.["7d"]);
    if (!fiveHour && !weekly)
        return undefined;
    return {
        fiveHour,
        weekly,
        updatedAt: Date.now()
    };
}
return { normalizeUsageWindow, parseUsagePayload };
})();

// --- shared/i18n.js ---
const __mod_shared_i18n = (() => {
let currentLocale = "en";
function setLocale(locale) {
    currentLocale = locale;
}
function getLocale() {
    return currentLocale;
}
const messages = {
    // --- Status labels ---
    "status.pending": { zh: "待发送", en: "Pending" },
    "status.waiting_limit": { zh: "等待重置", en: "Waiting" },
    "status.ready": { zh: "就绪", en: "Ready" },
    "status.sending": { zh: "发送中", en: "Sending" },
    "status.sent": { zh: "已发送", en: "Sent" },
    "status.failed": { zh: "失败", en: "Failed" },
    "status.skipped": { zh: "已跳过", en: "Skipped" },
    "status.needs_confirm": { zh: "需确认", en: "Confirm" },
    "status.unknown": { zh: "检测中", en: "Detecting" },
    "status.available": { zh: "可用", en: "Available" },
    "status.limited": { zh: "受限", en: "Limited" },
    "status.limited_unknown_reset": { zh: "受限", en: "Limited" },
    // --- Countdown / time ---
    "time.now": { zh: "现在", en: "now" },
    "time.hours_minutes": { zh: "{h}小时{m}分", en: "{h}h {m}m" },
    "time.minutes": { zh: "{m}分", en: "{m}m" },
    "time.no_reset": { zh: "暂无重置时间", en: "No reset time" },
    "time.reset_unknown": { zh: "重置时间未知", en: "Reset time unknown" },
    "time.already_reset": { zh: "已重置", en: "Reset" },
    "time.reset_days": { zh: "{d}天 {h}小时后重置", en: "Resets in {d}d {h}h" },
    "time.reset_hours": { zh: "{h}小时 {m}分后重置", en: "Resets in {h}h {m}m" },
    "time.reset_minutes": { zh: "{m}分后重置", en: "Resets in {m}m" },
    "time.next_reset": { zh: "距离下次重置", en: "Next reset" },
    "time.detect_after_open": { zh: "打开 Claude 后检测", en: "Open Claude to detect" },
    // --- Usage ---
    "usage.limit_reached": { zh: "已达到使用限制", en: "Usage limit reached" },
    "usage.open_to_show": { zh: "打开 Claude 页面后显示用量", en: "Open Claude to show usage" },
    "usage.currently_available": { zh: "当前可用", en: "Currently available" },
    "usage.waiting_detect": { zh: "等待检测用量", en: "Detecting usage" },
    "usage.five_hour": { zh: "5小时使用量", en: "5-hour usage" },
    "usage.weekly": { zh: "本周使用量", en: "Weekly usage" },
    "usage.five_hour_label": { zh: "5小时用量", en: "5h usage" },
    "usage.pct_used": { zh: "{pct}% 已用", en: "{pct}% used" },
    "usage.reset_at": { zh: "重置 {time}", en: "Resets {time}" },
    "usage.five_hour_100": { zh: "5小时用量 100%", en: "5-hour usage 100%" },
    "usage.five_hour_100_reset": { zh: "5小时用量 100% · {time}", en: "5-hour usage 100% · {time}" },
    // --- Panel UI ---
    "panel.aria_open": { zh: "打开 Claude Waitlist", en: "Open Claude Waitlist" },
    "panel.aria_label": { zh: "Claude Waitlist", en: "Claude Waitlist" },
    "panel.claude_assistant": { zh: "Claude 助手", en: "Claude Assistant" },
    "panel.refresh": { zh: "刷新", en: "Refresh" },
    "panel.collapse": { zh: "折叠", en: "Collapse" },
    "panel.claude_status": { zh: "Claude 状态", en: "Claude Status" },
    "panel.reset_time_label": { zh: "重置时间", en: "Reset time" },
    "panel.continue_current": { zh: "继续当前对话", en: "Continue conversation" },
    "panel.new_conversation": { zh: "以新对话继续", en: "New conversation" },
    "panel.queue_label": { zh: "队列", en: "Queue" },
    "panel.clear": { zh: "清空", en: "Clear" },
    "panel.queue_empty": { zh: "队列为空", en: "Queue empty" },
    "panel.queue_empty_hint": { zh: "选择下方入口添加继续任务或新对话任务。", en: "Use the buttons below to add tasks." },
    "panel.no_claude_page": { zh: "未找到 Claude 页面", en: "Claude page not found" },
    "panel.back": { zh: "返回", en: "Back" },
    // --- Task form ---
    "form.continue_title": { zh: "继续当前对话", en: "Continue conversation" },
    "form.new_title": { zh: "以新对话继续", en: "New conversation" },
    "form.continue_subtitle": { zh: "当前对话名称已自动填充", en: "Current conversation name auto-filled" },
    "form.new_subtitle": { zh: "请新建对话名称", en: "Enter a conversation name" },
    "form.title_placeholder_edit": { zh: "加载对话名称", en: "Loading conversation name" },
    "form.title_placeholder_new": { zh: "例如：分析 Q3 财报", en: "e.g., Analyze Q3 report" },
    "form.title_placeholder_continue": { zh: "对话名称", en: "Conversation name" },
    "form.content_placeholder_edit": { zh: "加载任务内容", en: "Loading task content" },
    "form.content_placeholder": { zh: "输入您要 Claude 执行的任务...", en: "Enter the task for Claude..." },
    "form.conversation_name": { zh: "对话名称", en: "Conversation name" },
    "form.task_content": { zh: "任务内容", en: "Task content" },
    "form.save": { zh: "保存", en: "Save" },
    "form.add_to_queue": { zh: "加入队列", en: "Add to queue" },
    "form.new_claude_conversation": { zh: "新的 Claude 对话", en: "New Claude conversation" },
    // --- Edit view ---
    "edit.title": { zh: "编辑", en: "Edit" },
    "edit.subtitle": { zh: "任务内容修改", en: "Edit task content" },
    "edit.not_found": { zh: "未找到这条队列任务", en: "Task not found" },
    "edit.not_found_hint": { zh: "返回首页后可以重新选择队列任务。", en: "Go back to select another task." },
    // --- Settings ---
    "settings.title": { zh: "设置", en: "Settings" },
    "settings.subtitle": { zh: "数据与发送策略", en: "Data & send strategy" },
    "settings.desktop_notifications": { zh: "桌面通知", en: "Desktop notifications" },
    "settings.desktop_notifications_desc": { zh: "重置提醒和队列发送结果", en: "Reset reminders and send results" },
    "settings.auto_send": { zh: "自动发送新任务", en: "Auto-send new tasks" },
    "settings.auto_send_desc": { zh: "Claude 可用时自动发送符合条件的任务", en: "Auto-send eligible tasks when Claude is available" },
    "settings.confirm_before_send": { zh: "发送前确认", en: "Confirm before send" },
    "settings.confirm_before_send_desc": { zh: "新任务默认进入确认状态", en: "New tasks default to confirmation required" },
    "settings.batch_after_reset": { zh: "重置后批量续发", en: "Batch send after reset" },
    "settings.batch_after_reset_desc": { zh: "官方重置后按队列继续自动任务", en: "Continue queue tasks after official reset" },
    "settings.send_strategy": { zh: "发送策略", en: "Send strategy" },
    "settings.auto_send_status": { zh: "自动续发 • {status}", en: "Auto-send • {status}" },
    "settings.confirm_status": { zh: "确认默认 • {status}", en: "Confirm default • {status}" },
    "settings.queue_limit": { zh: "批量上限 • {n} 条本地队列", en: "Queue limit • {n} local tasks" },
    "settings.enabled": { zh: "已开启", en: "On" },
    "settings.disabled_default": { zh: "默认关闭", en: "Off" },
    "settings.disabled": { zh: "已关闭", en: "Off" },
    "settings.local_queue": { zh: "本地队列", en: "Local queue" },
    "settings.import_export": { zh: "导入、导出与清理", en: "Import, export & cleanup" },
    "settings.storage_note": { zh: "任务只保存在 chrome.storage.local。", en: "Tasks are stored in chrome.storage.local only." },
    "settings.export_json": { zh: "导出 JSON", en: "Export JSON" },
    "settings.import_json": { zh: "导入 JSON", en: "Import JSON" },
    "settings.clear_ended": { zh: "清理已结束", en: "Clear ended" },
    "settings.test_reset": { zh: "模拟重置发送", en: "Test reset send" },
    "settings.interface": { zh: "界面", en: "Interface" },
    "settings.language": { zh: "语言", en: "Language" },
    "settings.language_zh_detail": { zh: "简体中文", en: "Simplified Chinese" },
    "settings.language_en_detail": { zh: "English", en: "English" },
    "settings.current_language": { zh: "当前语言：{language}", en: "Current language: {language}" },
    "settings.language_action": { zh: "切换语言", en: "Switch language" },
    "settings.about": { zh: "关于", en: "About" },
    "settings.github": { zh: "插件 GitHub", en: "Plugin GitHub" },
    "settings.developer": { zh: "开发者", en: "Developer" },
    "settings.placeholder": { zh: "待填写", en: "TBD" },
    // --- Task card ---
    "task.edit": { zh: "编辑任务", en: "Edit task" },
    "task.bump": { zh: "置顶", en: "Move to top" },
    "task.delete": { zh: "删除", en: "Delete" },
    "task.new_label": { zh: "新对话", en: "New" },
    // --- Toast / action messages ---
    "toast.action_failed": { zh: "操作失败", en: "Action failed" },
    "toast.sending": { zh: "正在发送到 Claude...", en: "Sending to Claude..." },
    "toast.submit_no_confirm": { zh: "已触发发送，但无法确认 Claude 是否已清空输入。已停止重试以避免重复发送。", en: "Send triggered, but could not confirm input was cleared. Stopped retrying to avoid duplicates." },
    "toast.input_not_empty": { zh: "Claude 输入框已有内容，为避免覆盖你的输入，本次未发送。", en: "Claude input already has content. Skipped to avoid overwriting." },
    "toast.send_failed": { zh: "发送失败。", en: "Send failed." },
    "toast.sent": { zh: "已发送到 Claude。", en: "Sent to Claude." },
    "toast.submitted_no_retry": { zh: "已触发发送，已停止重试以避免重复。", en: "Send triggered, stopped retrying to avoid duplicates." },
    "toast.reset_test_start": { zh: "正在模拟重置，并发送队列下一条...", en: "Simulating reset, sending next in queue..." },
    "toast.reset_test_failed": { zh: "重置测试失败。", en: "Reset test failed." },
    "toast.reset_test_started": { zh: "重置测试已开始依次发送队列。", en: "Reset test started sending queue." },
    "toast.reset_test_no_task": { zh: "重置测试未发送任务。", en: "Reset test did not send any task." },
    "toast.task_updated": { zh: "任务已更新。", en: "Task updated." },
    "toast.queue_json_invalid": { zh: "队列 JSON 无效。", en: "Invalid queue JSON." },
    "toast.queue_imported": { zh: "队列已导入。", en: "Queue imported." },
    // --- Error messages (localizeError) ---
    "error.input_not_empty": { zh: "Claude 输入框已有内容，为避免覆盖你的输入，本次未发送。", en: "Claude input already has content. Skipped to avoid overwriting." },
    "error.no_pending_task": { zh: "没有待发送任务。", en: "No pending task." },
    "error.needs_confirm": { zh: "需要用户确认。", en: "Needs user confirmation." },
    "error.no_claude_page": { zh: "未找到打开的 Claude 页面。", en: "Claude page not found." },
    "error.no_input_box": { zh: "未找到 Claude 输入框。", en: "Claude input box not found." },
    "error.cannot_open_new": { zh: "无法打开新的 Claude 对话。", en: "Could not open a new Claude conversation." },
    "error.input_not_cleared": { zh: "发送后 Claude 输入框仍未清空。", en: "Claude input was not cleared after sending." },
    "error.unsupported_message": { zh: "不支持的消息。", en: "Unsupported message." },
    "error.waiting_confirm": { zh: "等待用户确认后发送。", en: "Waiting for user confirmation." },
    "error.sending_requires_confirm": { zh: "发送需要确认。", en: "Sending requires confirmation." },
    // --- claudeSender.ts errors ---
    "sender.cannot_open_new": { zh: "无法打开新的 Claude 对话。", en: "Could not open a new Claude conversation." },
    "sender.no_input": { zh: "未找到 Claude 输入框。", en: "Claude input box not found." },
    "sender.submit_no_confirm": { zh: "已触发发送，但无法确认 Claude 是否已清空输入。", en: "Send triggered, but could not confirm input was cleared." },
    // --- queue.ts ---
    "queue.unnamed_task": { zh: "未命名任务", en: "Unnamed task" },
    "queue.imported_task": { zh: "导入的任务", en: "Imported task" },
    // --- serviceWorker.ts ---
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
    "sw.unsupported": { zh: "不支持的消息。", en: "Unsupported message." },
    // --- Claude conversation fallback ---
    "conv.claude_chat": { zh: "Claude 对话 {id}", en: "Claude chat {id}" },
    "conv.current_claude_chat": { zh: "当前 Claude 对话", en: "Current Claude conversation" },
    // --- Language toggle ---
    "lang.switch": { zh: "EN", en: "中" },
    "lang.tooltip": { zh: "Switch to English", en: "切换到中文" },
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
return { setLocale, getLocale, t };
})();

// --- content/claudeSender.js ---
const __mod_content_claudeSender = (() => {
const t = __mod_shared_i18n.t;
const FLOATING_ROOT_ID = "claude-queue-resumer-floating-root";
const RESPONSE_WAIT_TIMEOUT_MS = 6 * 60 * 1000;
const RESPONSE_STABLE_MS = 3500;
function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
}
function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}
function getEditableText(element) {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        return element.value;
    }
    return element.innerText || element.textContent || "";
}
function findInputElement() {
    const candidates = [
        ...document.querySelectorAll('div[contenteditable="true"], [role="textbox"], textarea')
    ].filter((element) => {
        if (!isVisible(element))
            return false;
        if (element instanceof HTMLTextAreaElement && element.disabled)
            return false;
        if (element.getAttribute("aria-disabled") === "true")
            return false;
        return true;
    });
    return (candidates
        .map((element) => {
        const rect = element.getBoundingClientRect();
        const text = `${element.getAttribute("aria-label") ?? ""} ${element.getAttribute("placeholder") ?? ""} ${element.getAttribute("data-placeholder") ?? ""}`.toLowerCase();
        let score = rect.bottom;
        if (/(reply|prompt|message|ask|send|输入|消息)/.test(text))
            score += 500;
        if (/(search|title|name|filter|rename)/.test(text))
            score -= 800;
        if (element instanceof HTMLTextAreaElement)
            score += 160;
        if (element.isContentEditable)
            score += 120;
        if (rect.height < 24 || rect.width < 180)
            score -= 500;
        return { element, score };
    })
        .sort((a, b) => b.score - a.score)[0]?.element ?? null);
}
function dispatchEditableEvents(element) {
    const data = getEditableText(element);
    element.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, inputType: "insertText", data }));
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Unidentified" }));
    element.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
}
function fillInput(element, content) {
    element.focus();
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        const setter = Object.getOwnPropertyDescriptor(element.constructor.prototype, "value")?.set;
        setter?.call(element, content);
        dispatchEditableEvents(element);
        return;
    }
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection?.removeAllRanges();
    selection?.addRange(range);
    const inserted = document.execCommand("insertText", false, content);
    if (!inserted) {
        element.textContent = content;
    }
    dispatchEditableEvents(element);
}
function isEnabledButton(button) {
    return !button.disabled && button.getAttribute("aria-disabled") !== "true";
}
function getButtonLabel(button) {
    return `${button.getAttribute("aria-label") ?? ""} ${button.title ?? ""} ${button.innerText ?? ""} ${button.dataset.testid ?? ""}`.toLowerCase();
}
function buttonLooksLikeSend(button) {
    const label = getButtonLabel(button);
    if (/(send|submit|发送|送出)/.test(label))
        return true;
    if (/(attach|upload|image|file|mic|voice|stop|cancel|pause|tools?|model|settings|menu|dictate|browse)/.test(label))
        return false;
    const svgText = [...button.querySelectorAll("svg")]
        .map((svg) => `${svg.getAttribute("aria-label") ?? ""} ${svg.getAttribute("data-icon") ?? ""} ${svg.className}`)
        .join(" ")
        .toLowerCase();
    if (/(send|arrow-up|paper-plane|send-horizontal)/.test(svgText))
        return true;
    const rect = button.getBoundingClientRect();
    return Boolean(button.querySelector("svg")) && rect.width <= 64 && rect.height <= 64;
}
function buttonLooksLikeStop(button) {
    const label = getButtonLabel(button);
    if (/(stop|cancel|pause|停止|中止|取消)/.test(label))
        return true;
    const svgText = [...button.querySelectorAll("svg")]
        .map((svg) => `${svg.getAttribute("aria-label") ?? ""} ${svg.getAttribute("data-icon") ?? ""} ${svg.className}`)
        .join(" ")
        .toLowerCase();
    return /(stop|square|pause|cancel)/.test(svgText);
}
function isClaudeBusy() {
    if (document.querySelector('[aria-busy="true"]'))
        return true;
    const buttons = [...document.querySelectorAll("button")].filter((button) => isVisible(button) && isEnabledButton(button));
    if (buttons.some(buttonLooksLikeStop))
        return true;
    const busyElements = [...document.querySelectorAll("[aria-label], [title], [data-state]")].filter(isVisible);
    return busyElements.some((element) => {
        const label = `${element.getAttribute("aria-label") ?? ""} ${element.getAttribute("title") ?? ""} ${element.getAttribute("data-state") ?? ""}`.toLowerCase();
        return /(generating|thinking|loading|response in progress|正在生成|思考中|生成中)/.test(label);
    });
}
function getPageTextSnapshot() {
    const main = document.querySelector("main") ?? document.body;
    const clone = main.cloneNode(true);
    clone.querySelector(`#${FLOATING_ROOT_ID}`)?.remove();
    return (clone.innerText || clone.textContent || "").replace(/\s+/g, " ").trim();
}
function composerLooksReady() {
    const input = findInputElement();
    return Boolean(input && getEditableText(input).trim().length === 0);
}
function findComposerRoot(input) {
    const candidates = [];
    let current = input;
    for (let depth = 0; current && depth < 8; depth += 1) {
        candidates.push(current);
        current = current.parentElement;
    }
    return (candidates.find((element) => {
        const buttons = [...element.querySelectorAll("button")].filter((button) => isVisible(button) && isEnabledButton(button));
        return buttons.some(buttonLooksLikeSend);
    }) ?? input.closest("form") ?? input.parentElement ?? document.body);
}
function findSendButton(input) {
    const composer = findComposerRoot(input);
    const scopedButtons = [...composer.querySelectorAll("button")].filter((button) => isVisible(button) && isEnabledButton(button));
    const scopedSend = scopedButtons.find(buttonLooksLikeSend);
    if (scopedSend)
        return scopedSend;
    const allButtons = [...document.querySelectorAll("button")].filter((button) => isVisible(button) && isEnabledButton(button));
    return allButtons.find(buttonLooksLikeSend) ?? null;
}
async function waitForSendButton(input) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 2500) {
        const button = findSendButton(input);
        if (button)
            return button;
        await sleep(100);
    }
    return null;
}
function pressSendShortcut(input) {
    input.focus();
    for (const init of [
        { key: "Enter", code: "Enter", bubbles: true, cancelable: true },
        { key: "Enter", code: "Enter", bubbles: true, cancelable: true, metaKey: true },
        { key: "Enter", code: "Enter", bubbles: true, cancelable: true, ctrlKey: true }
    ]) {
        input.dispatchEvent(new KeyboardEvent("keydown", init));
        input.dispatchEvent(new KeyboardEvent("keyup", init));
    }
}
async function waitForSubmissionEvidence(originalInput, beforeUrl) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 3000) {
        const currentInput = findInputElement() ?? originalInput;
        const text = getEditableText(currentInput).trim();
        if (text.length === 0)
            return true;
        if (window.location.href !== beforeUrl && /\/chat\//.test(window.location.pathname))
            return true;
        if (!document.documentElement.contains(originalInput))
            return true;
        await sleep(150);
    }
    return false;
}
async function waitForConversationUrl(beforeUrl, task) {
    if (/\/chat\//.test(window.location.pathname))
        return window.location.href;
    if (task?.conversationMode !== "new")
        return /\/chat\//.test(new URL(beforeUrl).pathname) ? beforeUrl : undefined;
    const startedAt = Date.now();
    while (Date.now() - startedAt < 8000) {
        if (/\/chat\//.test(window.location.pathname))
            return window.location.href;
        await sleep(200);
    }
    return undefined;
}
function elementLooksLikeNewChat(element) {
    const label = `${element.getAttribute("aria-label") ?? ""} ${element.getAttribute("title") ?? ""} ${element.innerText ?? ""}`.toLowerCase();
    if (/(new chat|new conversation|start chat|新对话|新聊天|开始新)/.test(label))
        return true;
    if (element instanceof HTMLAnchorElement && /\/new(?:[/?#]|$)/.test(element.href))
        return true;
    return false;
}
async function prepareNewConversation() {
    if (/\/new(?:[/?#]|$)/.test(window.location.pathname))
        return true;
    const candidates = [
        ...document.querySelectorAll('a[href*="/new"], button, [role="button"], a')
    ].filter((element) => isVisible(element) && elementLooksLikeNewChat(element));
    const target = candidates[0];
    if (target) {
        target.click();
        await sleep(900);
        return Boolean(findInputElement());
    }
    try {
        history.pushState(null, "", "/new");
        window.dispatchEvent(new PopStateEvent("popstate"));
        await sleep(900);
        return Boolean(findInputElement());
    }
    catch {
        return false;
    }
}
async function waitForClaudeResponseComplete() {
    await sleep(1500);
    const startedAt = Date.now();
    let lastSnapshot = getPageTextSnapshot();
    let stableSince = Date.now();
    while (Date.now() - startedAt < RESPONSE_WAIT_TIMEOUT_MS) {
        const snapshot = getPageTextSnapshot();
        if (snapshot !== lastSnapshot) {
            lastSnapshot = snapshot;
            stableSince = Date.now();
        }
        if (!isClaudeBusy() && composerLooksReady() && Date.now() - stableSince >= RESPONSE_STABLE_MS) {
            return;
        }
        await sleep(900);
    }
}
async function sendTaskToClaude(taskContent, task) {
    if (task?.conversationMode === "new") {
        const ready = await prepareNewConversation();
        if (!ready)
            return { ok: false, error: t("sender.cannot_open_new") };
    }
    const input = findInputElement();
    if (!input)
        return { ok: false, error: t("sender.no_input") };
    if (getEditableText(input).trim().length > 0) {
        return { ok: false, error: "INPUT_NOT_EMPTY" };
    }
    const beforeUrl = window.location.href;
    fillInput(input, taskContent);
    await sleep(350);
    const button = await waitForSendButton(input);
    if (button) {
        button.focus();
        button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        button.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
        button.click();
    }
    else {
        pressSendShortcut(input);
    }
    if (!(await waitForSubmissionEvidence(input, beforeUrl))) {
        pressSendShortcut(input);
    }
    const hasEvidence = await waitForSubmissionEvidence(input, beforeUrl);
    const conversationUrl = await waitForConversationUrl(beforeUrl, task);
    const conversationTitle = task?.conversationTitle;
    return hasEvidence
        ? { ok: true, submitted: true, conversationUrl, conversationTitle }
        : { ok: false, submitted: true, conversationUrl, conversationTitle, error: t("sender.submit_no_confirm") };
}
return { waitForClaudeResponseComplete, sendTaskToClaude };
})();

// --- content/floatingPanel.js ---
const __mod_content_floatingPanel = (() => {
const parseUsagePayload = __mod_shared_usageSnapshot.parseUsagePayload;
const sendTaskToClaude = __mod_content_claudeSender.sendTaskToClaude;
const setLocale = __mod_shared_i18n.setLocale;
const getLocale = __mod_shared_i18n.getLocale;
const t = __mod_shared_i18n.t;
const ROOT_ID = "claude-queue-resumer-floating-root";
const STORAGE_KEY = "claudeQueueResumerState";
const PANEL_POSITION_KEY = "claudeQueueResumerPanelPosition";
const QUEUE_TASK_LIMIT = 6;
const USAGE_REFRESH_INTERVAL_MS = 15000;
const WAITLIST_LOGO_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" focusable="false" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="#8b4a2b"></rect>
    <path d="M10 8H22M10 24H22M11 8C11 11.5 13.5 13.5 16 16C18.5 13.5 21 11.5 21 8M11 24C11 20.5 13.5 18.5 16 16C18.5 18.5 21 20.5 21 24" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
    <circle cx="16" cy="16" r="1.5" fill="#f4eee6"></circle>
  </svg>
`;
function statusLabel(key) {
    return t(`status.${key}`);
}
const activeTaskStatuses = new Set(["pending", "ready", "waiting_limit", "sending", "needs_confirm"]);
const nextTaskStatuses = new Set(["pending", "ready", "waiting_limit", "needs_confirm"]);
let currentState;
let shadowRootRef;
let collapsed = false;
let view = "home";
let editingTaskId;
let initialized = false;
let refreshTimer;
let countdownTimer;
let usageTimer;
let hostElement;
let usageSnapshot;
let usageFetchInFlight = false;
let collapsedPanelPosition;
let expandedPanelPosition;
let pendingPanelPosition;
let suppressNextClick = false;
let extensionContextInvalidated = false;
function isExtensionContextInvalidated(error) {
    return error instanceof Error && /Extension context invalidated/i.test(error.message);
}
function stopExtensionBackedWork() {
    extensionContextInvalidated = true;
    if (refreshTimer)
        window.clearInterval(refreshTimer);
    if (countdownTimer)
        window.clearInterval(countdownTimer);
    if (usageTimer)
        window.clearInterval(usageTimer);
    refreshTimer = undefined;
    countdownTimer = undefined;
    usageTimer = undefined;
}
function handleExtensionError(error) {
    if (isExtensionContextInvalidated(error)) {
        stopExtensionBackedWork();
        return;
    }
    throw error;
}
function reportAsyncError(error) {
    if (isExtensionContextInvalidated(error)) {
        stopExtensionBackedWork();
        return;
    }
    console.error(error);
}
function runExtensionTask(task) {
    void task.catch(reportAsyncError);
}
function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
        if (b.priority !== a.priority)
            return b.priority - a.priority;
        return a.createdAt - b.createdAt;
    });
}
function getActiveTasks(tasks) {
    return sortTasks(tasks).filter((task) => activeTaskStatuses.has(task.status));
}
function getNextQueueTask(tasks) {
    return sortTasks(tasks).find((task) => nextTaskStatuses.has(task.status));
}
function clampPanelPosition(position, width, height) {
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - width - margin);
    const maxTop = Math.max(margin, window.innerHeight - height - margin);
    return {
        left: Math.min(Math.max(margin, position.left), maxLeft),
        top: Math.min(Math.max(margin, position.top), maxTop)
    };
}
function panelPositionStyle() {
    const position = getActivePanelPosition();
    if (!position)
        return "";
    return `left: ${Math.round(position.left)}px; top: ${Math.round(position.top)}px; right: auto; bottom: auto;`;
}
function getRenderedPanel(root = shadowRootRef) {
    return root?.querySelector("[data-draggable-panel]") ?? undefined;
}
function isPanelPosition(value) {
    return Boolean(value &&
        typeof value === "object" &&
        Number.isFinite(value.left) &&
        Number.isFinite(value.top));
}
function getActivePanelPosition() {
    return collapsed ? collapsedPanelPosition : expandedPanelPosition;
}
function setActivePanelPosition(position) {
    if (collapsed) {
        collapsedPanelPosition = position;
    }
    else {
        expandedPanelPosition = position;
    }
}
function capturePanelPosition() {
    const element = getRenderedPanel();
    if (!element)
        return getActivePanelPosition();
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
}
function preservePanelPositionForNextRender() {
    pendingPanelPosition = capturePanelPosition();
}
async function savePanelPositions() {
    if (extensionContextInvalidated)
        return;
    try {
        await chrome.storage.local.set({
            [PANEL_POSITION_KEY]: {
                collapsed: collapsedPanelPosition,
                expanded: expandedPanelPosition
            }
        });
    }
    catch (error) {
        handleExtensionError(error);
    }
}
async function loadPanelPosition() {
    if (extensionContextInvalidated)
        return;
    let stored;
    try {
        stored = (await chrome.storage.local.get(PANEL_POSITION_KEY))[PANEL_POSITION_KEY];
    }
    catch (error) {
        handleExtensionError(error);
        return;
    }
    if (isPanelPosition(stored)) {
        collapsedPanelPosition = stored;
        expandedPanelPosition = stored;
        return;
    }
    if (isPanelPosition(stored?.collapsed))
        collapsedPanelPosition = stored.collapsed;
    if (isPanelPosition(stored?.expanded))
        expandedPanelPosition = stored.expanded;
}
function applyRenderedPanelPosition(root) {
    const element = getRenderedPanel(root);
    if (!element)
        return;
    const rect = element.getBoundingClientRect();
    const candidate = pendingPanelPosition ?? getActivePanelPosition();
    const next = candidate ? clampPanelPosition(candidate, rect.width, rect.height) : undefined;
    pendingPanelPosition = undefined;
    if (!next)
        return;
    const activePosition = getActivePanelPosition();
    if (!activePosition || next.left !== activePosition.left || next.top !== activePosition.top) {
        setActivePanelPosition(next);
        element.style.left = `${Math.round(next.left)}px`;
        element.style.top = `${Math.round(next.top)}px`;
        element.style.right = "auto";
        element.style.bottom = "auto";
        runExtensionTask(savePanelPositions());
    }
}
function formatCountdown(timestamp) {
    if (!timestamp)
        return "-";
    const remaining = timestamp - Date.now();
    if (remaining <= 0)
        return t("time.now");
    const totalMinutes = Math.ceil(remaining / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? t("time.hours_minutes", { h: hours, m: minutes }) : t("time.minutes", { m: minutes });
}
function formatReset(timestamp) {
    if (!timestamp)
        return t("time.no_reset");
    return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function formatUsageReset(timestamp) {
    if (!timestamp)
        return t("time.reset_unknown");
    const remaining = timestamp - Date.now();
    if (remaining <= 0)
        return t("time.already_reset");
    const totalMinutes = Math.ceil(remaining / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0)
        return t("time.reset_days", { d: days, h: hours });
    if (hours > 0)
        return t("time.reset_hours", { h: hours, m: minutes });
    return t("time.reset_minutes", { m: minutes });
}
function formatUsagePercent(value) {
    if (value === undefined)
        return "-";
    return `${Math.round(value * 10) / 10}%`;
}
function usageToneClass(value) {
    if (value === undefined)
        return "cqr-usage-neutral";
    if (value >= 85)
        return "cqr-usage-danger";
    if (value >= 60)
        return "cqr-usage-warn";
    return "cqr-usage-ok";
}
function effectiveLimitStatus(state) {
    const fiveHour = usageSnapshot?.fiveHour;
    if (fiveHour) {
        // Usage snapshot is the most authoritative source — trust it over potentially stale stored state
        if (fiveHour.utilization >= 100) {
            return fiveHour.resetsAt ? "limited" : "limited_unknown_reset";
        }
        return "available";
    }
    return state.claudePage.limitStatus;
}
function displayResetAt(state) {
    if (!state)
        return undefined;
    const fiveHourResetAt = usageSnapshot?.fiveHour?.resetsAt;
    if (fiveHourResetAt && Number.isFinite(fiveHourResetAt))
        return fiveHourResetAt;
    if (state.claudePage.limitStatus !== "limited" && state.claudePage.limitStatus !== "limited_unknown_reset")
        return undefined;
    return state.claudePage.resetAt;
}
function formatResetPanelLabel(state) {
    if (state.claudePage.limitStatus === "limited" || state.claudePage.limitStatus === "limited_unknown_reset") {
        return t("time.next_reset");
    }
    return t("time.next_reset");
}
function formatResetPanelTime(state, resetAt) {
    if (resetAt || state.claudePage.limitStatus === "limited" || state.claudePage.limitStatus === "limited_unknown_reset") {
        return formatReset(resetAt);
    }
    return state.claudePage.isOpen ? t("time.no_reset") : t("time.detect_after_open");
}
function formatUsageFallback(state) {
    const status = effectiveLimitStatus(state);
    if (status === "limited" || status === "limited_unknown_reset") {
        return t("usage.limit_reached");
    }
    if (!state.claudePage.isOpen)
        return t("usage.open_to_show");
    if (status === "available")
        return t("usage.currently_available");
    return t("usage.waiting_detect");
}
function reportUsageLimitState(snapshot) {
    const fiveHour = snapshot.fiveHour;
    if (!fiveHour)
        return;
    if (extensionContextInvalidated)
        return;
    if (fiveHour.utilization >= 100) {
        const resetAt = fiveHour.resetsAt && fiveHour.resetsAt > Date.now() ? fiveHour.resetsAt : undefined;
        runExtensionTask(sendMessage({
            type: "CONTENT_STATUS",
            detection: {
                limitStatus: resetAt ? "limited" : "limited_unknown_reset",
                resetAt,
                resetText: resetAt ? t("usage.five_hour_100_reset", { time: formatReset(resetAt) }) : t("usage.five_hour_100"),
                usageText: "usage snapshot: 5-hour 100%",
                source: "usage",
                checkedAt: Date.now()
            }
        }));
    }
    else {
        // Clear any stale usage-based limit when usage is below 100%
        runExtensionTask(sendMessage({
            type: "CONTENT_STATUS",
            detection: {
                limitStatus: "available",
                usageText: `usage snapshot: 5-hour ${Math.round(fiveHour.utilization)}%`,
                source: "usage",
                checkedAt: Date.now()
            }
        }));
    }
}
function renderUsageOverview(state) {
    const fiveHour = usageSnapshot?.fiveHour;
    const weekly = usageSnapshot?.weekly;
    return `
    <div class="flex flex-col gap-3 flex-1 cqr-usage-meters" title="${escapeHtml(formatUsageFallback(state))}">
      ${renderUsageMeter(t("usage.five_hour"), fiveHour)}
      ${renderUsageMeter(t("usage.weekly"), weekly)}
    </div>
  `;
}
function renderUsageMeter(label, usage) {
    const width = usage ? Math.max(0, Math.min(100, usage.utilization)) : 0;
    const pct = formatUsagePercent(usage?.utilization);
    const toneClass = usageToneClass(usage?.utilization);
    return `
    <div class="flex flex-col gap-1 cqr-usage-meter ${toneClass}">
      <div class="flex justify-between items-end">
        <span class="font-caption text-caption text-muted-text">${label}</span>
        <span class="font-pill-value text-pill-value cqr-usage-value">${pct}</span>
      </div>
      <div class="h-1.5 rounded-full progress-track overflow-hidden" aria-hidden="true">
        <div class="h-full cqr-usage-fill rounded-full" style="width: ${width}%;"></div>
      </div>
    </div>
  `;
}
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function normalizeConversationTitle(value) {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized)
        return normalized;
    const parts = normalized.split(" ");
    if (parts.length % 2 === 0) {
        const midpoint = parts.length / 2;
        const first = parts.slice(0, midpoint).join(" ");
        const second = parts.slice(midpoint).join(" ");
        if (first && first === second)
            return first;
    }
    const compact = normalized.replace(/\s+/g, "");
    if (compact.length >= 4 && compact.length % 2 === 0) {
        const midpoint = compact.length / 2;
        const first = compact.slice(0, midpoint);
        const second = compact.slice(midpoint);
        if (first === second)
            return first;
    }
    return normalized;
}
function getCurrentConversationTitle() {
    const selectedNavText = document.querySelector('a[aria-current="page"], [aria-current="page"]')?.innerText?.trim() ??
        document.querySelector('[data-testid*="conversation"][aria-selected="true"]')?.innerText?.trim();
    const headingText = document.querySelector("main h1, h1")?.innerText?.trim();
    const documentTitle = document.title.replace(/\s*[|·-]\s*Claude.*$/i, "").replace(/\s*Claude\s*$/i, "").trim();
    const pathMatch = window.location.pathname.match(/\/chat\/([^/?#]+)/);
    return normalizeConversationTitle(selectedNavText || headingText || documentTitle || (pathMatch ? t("conv.claude_chat", { id: pathMatch[1].slice(0, 8) }) : t("conv.current_claude_chat")));
}
function getCurrentConversationUrl() {
    return window.location.href;
}
async function sendMessage(message) {
    if (extensionContextInvalidated)
        return undefined;
    try {
        return (await chrome.runtime.sendMessage(message));
    }
    catch (error) {
        if (isExtensionContextInvalidated(error)) {
            stopExtensionBackedWork();
            return undefined;
        }
        throw error;
    }
}
async function refresh(force = false) {
    if (!force && isUserTyping())
        return;
    const response = await sendMessage({ type: "GET_STATE" });
    if (response?.ok && response.state)
        render(response.state);
}
function findObservedOrgId() {
    const entries = performance.getEntriesByType("resource");
    for (const entry of entries) {
        const match = entry.name.match(/\/api\/organizations\/([^/?#]+)/);
        if (match?.[1])
            return decodeURIComponent(match[1]);
    }
    return undefined;
}
async function refreshUsageSnapshot(force = false) {
    if (usageFetchInFlight)
        return;
    if (!force && usageSnapshot && Date.now() - usageSnapshot.updatedAt < USAGE_REFRESH_INTERVAL_MS)
        return;
    const orgId = findObservedOrgId();
    if (!orgId)
        return;
    usageFetchInFlight = true;
    try {
        const response = await fetch(`${window.location.origin}/api/organizations/${encodeURIComponent(orgId)}/usage`, {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok)
            return;
        const parsed = parseUsagePayload(await response.json());
        if (!parsed)
            return;
        usageSnapshot = parsed;
        reportUsageLimitState(parsed);
        if (currentState && !isUserTyping())
            render(currentState);
    }
    catch {
        // Usage data is optional. Never disturb the Claude page if it is unavailable.
    }
    finally {
        usageFetchInFlight = false;
    }
}
function renderLogoMark(className = "cqr-logo") {
    return `<span class="${className}" aria-label="Claude Waitlist Logo">${WAITLIST_LOGO_SVG}</span>`;
}
async function mutate(message) {
    const response = await sendMessage(message);
    if (!response)
        return { ok: false };
    if (response.ok && response.state) {
        render(response.state);
        return response;
    }
    if (!response.ok) {
        renderToast(localizeError(response.error) ?? t("toast.action_failed"));
        return response;
    }
    await refresh(true);
    return response;
}
function findCreatedTask(state, content) {
    if (!state)
        return undefined;
    return getActiveTasks(state.tasks)
        .filter((task) => task.content === content && ["pending", "ready", "waiting_limit", "needs_confirm"].includes(task.status))
        .sort((a, b) => b.createdAt - a.createdAt)[0];
}
async function sendContentNow(content, task) {
    if (task) {
        await mutate({ type: "UPDATE_TASK", taskId: task.id, patch: { status: "sending", error: undefined } });
    }
    renderToast(t("toast.sending"));
    const result = await sendTaskToClaude(content, task);
    if (task) {
        await mutate({
            type: "UPDATE_TASK",
            taskId: task.id,
            patch: result.ok || result.submitted
                ? {
                    status: "sent",
                    sentAt: Date.now(),
                    conversationUrl: result.conversationUrl ?? task.conversationUrl,
                    conversationTitle: result.conversationTitle ?? task.conversationTitle,
                    error: result.ok ? undefined : t("toast.submit_no_confirm")
                }
                : {
                    status: result.error === "INPUT_NOT_EMPTY" ? "needs_confirm" : "failed",
                    error: result.error === "INPUT_NOT_EMPTY"
                        ? t("toast.input_not_empty")
                        : localizeError(result.error) ?? t("toast.send_failed")
                }
        });
    }
    renderToast(result.ok ? t("toast.sent") : result.submitted ? t("toast.submitted_no_retry") : localizeError(result.error) ?? t("toast.send_failed"));
}
async function simulateResetSendTest() {
    renderToast(t("toast.reset_test_start"));
    const response = await sendMessage({
        type: "SIMULATE_RESET_SEND_TEST"
    });
    if (!response)
        return;
    if (response.state)
        render(response.state);
    if (!response.ok) {
        renderToast(localizeError(response.error) ?? t("toast.reset_test_failed"));
        return;
    }
    renderToast(response.result?.ok ? t("toast.reset_test_started") : localizeError(response.result?.error) ?? t("toast.reset_test_no_task"));
}
function localizeError(raw) {
    if (!raw)
        return undefined;
    const map = {
        INPUT_NOT_EMPTY: t("error.input_not_empty"),
        "No pending task.": t("error.no_pending_task"),
        "Needs user confirmation.": t("error.needs_confirm"),
        "Claude page is not open.": t("error.no_claude_page"),
        "Claude input box was not found.": t("error.no_input_box"),
        "Could not open a new Claude conversation.": t("error.cannot_open_new"),
        "Send action did not clear the Claude input.": t("error.input_not_cleared"),
        "Unsupported message.": t("error.unsupported_message"),
        "Waiting for user confirmation before sending.": t("error.waiting_confirm"),
        "Sending requires confirmation.": t("error.sending_requires_confirm")
    };
    return map[raw];
}
function isUserTyping() {
    const active = shadowRootRef?.activeElement;
    return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
}
function updateCountdownOnly() {
    if (!currentState)
        return;
    const countdown = shadowRootRef?.querySelector("[data-countdown]");
    const resetAt = displayResetAt(currentState);
    if (countdown)
        countdown.textContent = resetAt ? formatCountdown(resetAt) : "-";
    const resetLabel = shadowRootRef?.querySelector("[data-reset-label]");
    if (resetLabel)
        resetLabel.textContent = formatResetPanelLabel(currentState);
    const resetTime = shadowRootRef?.querySelector("[data-reset-time]");
    if (resetTime)
        resetTime.textContent = formatResetPanelTime(currentState, resetAt);
    shadowRootRef?.querySelectorAll("[data-usage-reset]").forEach((element) => {
        const resetAt = Number(element.dataset.usageReset);
        element.textContent = Number.isFinite(resetAt) ? formatUsageReset(resetAt) : t("time.reset_unknown");
    });
}
function renderToast(message) {
    const toast = shadowRootRef?.querySelector("[data-toast]");
    if (!toast)
        return;
    toast.textContent = message;
    toast.hidden = false;
    window.setTimeout(() => {
        toast.hidden = true;
    }, 3600);
}
function render(state) {
    currentState = state;
    setLocale(state.settings.language ?? "en");
    const root = shadowRootRef;
    if (!root)
        return;
    root.innerHTML = `<style>${stitchStyles}</style>${collapsed ? renderCollapsed(state) : renderExpanded(state)}`;
    bindPanelEvents(root);
    bindPanelDrag(root);
    applyRenderedPanelPosition(root);
}
function collapsePanel() {
    if (collapsed)
        return;
    pendingPanelPosition = collapsedPanelPosition ?? capturePanelPosition();
    collapsed = true;
    if (currentState)
        render(currentState);
}
function showFloatingPanel() {
    preservePanelPositionForNextRender();
    collapsed = false;
    view = "home";
    editingTaskId = undefined;
    if (currentState) {
        render(currentState);
        return;
    }
    runExtensionTask(refresh(true));
}
async function refreshFloatingPanel(forceDetect = false) {
    if (forceDetect) {
        await mutate({ type: "DETECT_NOW" });
    }
    else {
        await refresh(true);
    }
    runExtensionTask(refreshUsageSnapshot(true));
}
function renderCollapsed(state) {
    const status = effectiveLimitStatus(state);
    const fiveHour = usageSnapshot?.fiveHour;
    const fiveHourPct = fiveHour ? Math.round(fiveHour.utilization * 10) / 10 : 0;
    const fiveHourWidth = fiveHour ? Math.max(0, Math.min(100, fiveHour.utilization)) : 0;
    const fiveHourToneClass = usageToneClass(fiveHour?.utilization);
    const usageLabel = fiveHour ? t("usage.pct_used", { pct: fiveHourPct }) : (statusLabel(status) ?? status);
    const usageMeta = fiveHour?.resetsAt ? t("usage.reset_at", { time: formatReset(fiveHour.resetsAt) }) : t("time.reset_unknown");
    return `
    <button class="cqr-pill glass-panel w-panel-width-collapsed min-h-[72px] rounded-[18px] p-inner-padding flex flex-col justify-center cursor-grab active:cursor-grabbing hover:bg-surface-container-highest transition-colors duration-200 cqr-state-${status} ${fiveHourToneClass}" style="padding-right: 18px; ${panelPositionStyle()}" type="button" data-action="expand" data-draggable-panel aria-label="${t("panel.aria_open")}">
      <span class="flex items-center gap-3">
        ${renderLogoMark("cqr-pill-logo w-8 h-8 rounded-lg flex-shrink-0 object-contain")}
        <span class="flex-1 flex flex-col gap-1 w-full">
          <span class="flex justify-between items-center mb-0.5">
            <span class="font-label-caps text-label-caps text-muted-text tracking-wider uppercase">${t("usage.five_hour_label")}</span>
            <span class="font-pill-value text-pill-value cqr-usage-value">${escapeHtml(usageLabel)}</span>
          </span>
          <span class="w-full h-1.5 bg-border-subtle rounded-full overflow-hidden mb-1" aria-hidden="true">
            <span class="h-full cqr-usage-fill rounded-full transition-all duration-500 ease-out" style="width: ${fiveHourWidth}%"></span>
          </span>
          <span class="flex justify-start">
            <span class="font-caption text-caption text-muted-text opacity-80">${escapeHtml(usageMeta)}</span>
          </span>
        </span>
      </span>
    </button>
  `;
}
function renderExpanded(state) {
    const activeTasks = getActiveTasks(state.tasks);
    const editingTask = editingTaskId ? state.tasks.find((item) => item.id === editingTaskId) : undefined;
    const status = effectiveLimitStatus(state);
    const statusText = state.claudePage.isOpen ? (statusLabel(status) ?? status) : t("panel.no_claude_page");
    const isFormPanel = view === "continue" || view === "new" || view === "edit" || view === "settings";
    const panelClasses = isFormPanel
        ? "cqr-panel cqr-panel-form glass-panel w-panel-width-expanded bg-panel-bg rounded-[28px] border border-border-subtle overflow-hidden relative flex flex-col h-auto"
        : "cqr-panel cqr-panel-home glass-panel w-panel-width-expanded rounded-[28px] p-container-padding flex flex-col gap-stack-gap-lg";
    return `
    <section class="${panelClasses}" style="${panelPositionStyle()}" data-draggable-panel aria-label="${t("panel.aria_label")}">
      ${view === "home" ? renderHomeHeader() : ""}

      ${view === "home" ? renderHome(state, activeTasks, status, statusText) : ""}
      ${view === "continue" ? renderContinueConversation() : ""}
      ${view === "new" ? renderNewConversation() : ""}
      ${view === "edit" ? renderEditTask(editingTask) : ""}
      ${view === "settings" ? renderSettings(state) : ""}

      <p class="cqr-toast" data-toast hidden></p>
    </section>
  `;
}
function renderHomeHeader() {
    return `
      <header class="cqr-header flex items-center justify-between px-2 pt-1 pb-2">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm">
            ${renderLogoMark("cqr-logo w-full h-full object-contain rounded-md")}
          </div>
          <div class="flex flex-col">
            <span class="font-label-caps text-label-caps text-muted-text">${t("panel.claude_assistant")}</span>
            <span class="font-headline-panel text-headline-panel text-ink">Claude Waitlist</span>
          </div>
        </div>
        <div class="flex items-center gap-1 cqr-header-actions">
          <button class="p-1.5 text-muted-text hover:text-ink hover:bg-border-subtle rounded-md transition-colors" type="button" data-action="detect" title="${t("panel.refresh")}" aria-label="${t("panel.refresh")}"><span class="material-symbols-outlined text-[20px]" data-icon="refresh">refresh</span></button>
          <button class="p-1.5 text-muted-text hover:text-ink hover:bg-border-subtle rounded-md transition-colors" type="button" data-action="show-settings" title="${t("settings.title")}" aria-label="${t("settings.title")}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg></button>
          <button class="p-1.5 text-muted-text hover:text-ink hover:bg-border-subtle rounded-md transition-colors" type="button" data-action="collapse" title="${t("panel.collapse")}" aria-label="${t("panel.collapse")}"><span class="material-symbols-outlined text-[20px]" data-icon="close_fullscreen">close_fullscreen</span></button>
        </div>
      </header>
  `;
}
function renderHome(state, activeTasks, status, statusText) {
    const resetAt = displayResetAt(state);
    const resetCountdown = resetAt ? formatCountdown(resetAt) : "-";
    return `
    <main class="cqr-view flex flex-col gap-stack-gap-lg">
      <section class="card-glass rounded-xl p-inner-padding flex flex-col gap-3 cqr-now" style="background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(92, 67, 45, 0.16); border-radius: 20px;">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="font-title-card text-title-card text-ink">${t("panel.claude_status")}</span>
            <span class="px-2 py-0.5 bg-error/15 text-error rounded-full font-label-caps text-[10px] ml-2 cqr-badge cqr-state-${status}">${escapeHtml(statusText)}</span>
          </div>
        </div>
        <div class="flex justify-between gap-4">
          ${renderUsageOverview(state)}
          <div class="flex flex-col justify-center gap-3 border-l border-border-subtle pl-4 cqr-reset">
            <div class="flex flex-col items-end gap-0.5">
              <span class="font-caption text-caption text-muted-text" data-reset-label>${escapeHtml(formatResetPanelLabel(state))}</span>
              <span class="font-timer-display text-timer-display text-ink" data-countdown>${escapeHtml(resetCountdown)}</span>
            </div>
            <div class="flex flex-col items-end gap-0.5">
              <span class="font-caption text-caption text-muted-text">${t("panel.reset_time_label")}</span>
              <span class="font-body-md text-body-md text-ink" data-reset-time>${escapeHtml(formatResetPanelTime(state, resetAt))}</span>
            </div>
          </div>
        </div>
      </section>

      ${renderHomeQueuePanel(activeTasks)}

      <section class="flex gap-3 pt-2 cqr-actions">
        <button class="flex-1 bg-primary text-on-primary font-title-card text-title-card py-2.5 rounded-[14px] hover:bg-accent-dark transition-colors shadow-sm flex justify-center items-center cqr-primary" style="border-radius: 18px;" type="button" data-action="show-continue">${t("panel.continue_current")}</button>
        <button class="flex-1 bg-border-subtle text-ink font-title-card text-title-card py-2.5 rounded-[14px] hover:bg-[rgba(92,67,45,0.2)] transition-colors border border-transparent hover:border-outline-variant flex justify-center items-center" style="border-radius: 18px;" type="button" data-action="show-new">${t("panel.new_conversation")}</button>
      </section>
    </main>
  `;
}
function renderHomeQueuePanel(activeTasks) {
    const queueStateClass = activeTasks.length ? "cqr-queue-home-has-items" : "cqr-queue-home-empty";
    return `
    <section class="flex flex-col cqr-queue-home ${queueStateClass}">
      <div class="flex justify-between items-center px-1 mb-2 cqr-queue-head">
        <span class="font-label-caps text-label-caps text-muted-text cqr-kicker">${t("panel.queue_label")} (${activeTasks.length})</span>
        <button class="text-caption text-primary" type="button" data-action="clear-active">${t("panel.clear")}</button>
      </div>
      ${renderHomeQueueList(activeTasks)}
    </section>
  `;
}
function renderHomeQueueList(activeTasks) {
    if (!activeTasks.length) {
        return `
      <div class="card-glass rounded-lg p-2.5 flex flex-col gap-1 border-l-2 border-l-transparent cqr-queue-card" style="border-radius: 20px;">
        <span class="font-title-card text-title-card text-ink">${t("panel.queue_empty")}</span>
        <span class="font-caption text-caption text-muted-text">${t("panel.queue_empty_hint")}</span>
      </div>
    `;
    }
    return `
    <div class="queue-list overflow-y-auto flex flex-col gap-1 pr-1 cqr-list cqr-list-home">
      ${activeTasks.map((task) => renderQueueTask(task)).join("")}
    </div>
  `;
}
function renderConversationForm(options) {
    const isNew = options.mode === "new";
    const queueIsFull = (currentState ? getActiveTasks(currentState.tasks).length : 0) >= QUEUE_TASK_LIMIT;
    const isEdit = Boolean(options.taskId);
    const titleReadonly = options.readonlyTitle ?? (!isNew && !isEdit);
    const heading = options.title ?? (isNew ? t("form.new_title") : t("form.continue_title"));
    const helper = options.subtitle ?? (isNew ? t("form.new_subtitle") : t("form.continue_subtitle"));
    const titlePlaceholder = isEdit ? t("form.title_placeholder_edit") : isNew ? t("form.title_placeholder_new") : t("form.title_placeholder_continue");
    const textareaPlaceholder = isEdit ? t("form.content_placeholder_edit") : t("form.content_placeholder");
    const textareaHeight = isEdit ? 160 : 120;
    return `
    <form class="cqr-form-view cqr-form ${isEdit ? "cqr-edit-form" : "cqr-task-form"} flex flex-col h-auto" data-task-form data-conversation-mode="${options.mode}" data-conversation-url="${escapeHtml(options.conversationUrl ?? "")}" ${options.taskId ? `data-task-id="${escapeHtml(options.taskId)}"` : ""}>
      <div class="flex items-center justify-between px-inner-padding h-12 w-full bg-card-glass backdrop-blur-md border-b border-border-subtle shadow-sm z-10 sticky top-0 shrink-0 cqr-subnav">
        <button class="flex items-center justify-center w-8 h-8 rounded-full text-muted-text hover:bg-border-subtle hover:text-ink transition-colors cursor-pointer group" type="button" data-action="show-home" aria-label="${t("panel.back")}">
          <span class="material-symbols-outlined text-[20px]" data-icon="arrow_back">arrow_back</span>
        </button>
        <div class="flex-1 text-center">
          <h1 class="font-headline-panel text-headline-panel font-bold text-ink">${escapeHtml(heading)}</h1>
        </div>
        <div class="w-8" aria-hidden="true"></div>
      </div>
      <div class="flex-1 overflow-y-auto p-container-padding flex flex-col gap-stack-lg cqr-form-body">
        <p class="font-body-md text-body-md text-muted-text text-center -mt-2 mb-2 cqr-form-helper">${escapeHtml(helper)}</p>
        <div class="flex flex-col gap-stack-sm cqr-field-label">
          <label class="font-label-caps text-label-caps text-muted-text uppercase">${t("form.conversation_name")}</label>
          <div class="bg-[rgba(255,255,255,0.5)] border border-border-subtle rounded-lg px-3 py-2 flex items-center cqr-input-shell" style="border-radius: 20px;">
            <input class="w-full bg-transparent border-none p-0 text-ink font-body-md text-body-md focus:ring-0 ${titleReadonly ? "opacity-70 cursor-not-allowed" : ""}" name="conversationTitle" type="text" maxlength="160" value="${escapeHtml(options.conversationTitle)}" ${titleReadonly ? "readonly" : ""} placeholder="${escapeHtml(titlePlaceholder)}" />
          </div>
        </div>
        <div class="flex flex-col gap-stack-sm cqr-field-label">
          <label class="font-label-caps text-label-caps text-muted-text uppercase">${t("form.task_content")}</label>
          <div class="bg-[rgba(255,255,255,0.5)] border border-border-subtle rounded-lg p-3 flex-1 flex flex-col input-focus transition-all duration-200 min-h-[120px] cqr-textarea-shell" style="border-radius: 20px; height: ${textareaHeight}px; min-height: ${textareaHeight}px; flex: 0 0 auto;">
            <textarea class="w-full h-full resize-none bg-transparent border-none p-0 text-ink font-body-md text-body-md focus:ring-0 placeholder-muted-text" name="content" rows="5" placeholder="${escapeHtml(textareaPlaceholder)}" required>${escapeHtml(options.content ?? "")}</textarea>
          </div>
        </div>
        <input name="priority" type="hidden" value="${options.priority ?? 0}" />
      </div>
      <div class="p-container-padding border-t border-border-subtle bg-surface-container-low shrink-0 flex gap-stack-md cqr-form-actions">
        <button class="flex-1 bg-[#8b4a2b] text-[#ffffff] font-title-card text-title-card py-2.5 px-4 rounded-[16px] hover:bg-[#6e3316] transition-colors flex items-center justify-center gap-2 shadow-sm cqr-primary" style="border-radius: 18px;" type="submit" name="submitAction" value="${isEdit ? "save" : "queue"}" ${!isEdit && queueIsFull ? "disabled" : ""}>
          ${escapeHtml(options.primaryLabel ?? (isEdit ? t("form.save") : t("form.add_to_queue")))}
        </button>
      </div>
      </form>
  `;
}
function renderContinueConversation() {
    return renderConversationForm({
        mode: "current",
        conversationTitle: getCurrentConversationTitle(),
        conversationUrl: getCurrentConversationUrl()
    });
}
function renderNewConversation() {
    return renderConversationForm({
        mode: "new",
        conversationTitle: ""
    });
}
function renderEditTask(task) {
    if (!task) {
        return `
      <main class="cqr-form-view cqr-form flex flex-col h-auto">
        <div class="flex items-center justify-between px-inner-padding h-12 w-full bg-card-glass backdrop-blur-md border-b border-border-subtle shadow-sm z-10 sticky top-0 shrink-0 cqr-subnav">
          <button class="flex items-center justify-center w-8 h-8 rounded-full text-muted-text hover:bg-border-subtle hover:text-ink transition-colors cursor-pointer group" type="button" data-action="show-home" aria-label="${t("panel.back")}">
            <span class="material-symbols-outlined text-[20px]" data-icon="arrow_back">arrow_back</span>
          </button>
          <div class="flex-1 text-center">
            <h1 class="font-headline-panel text-headline-panel font-bold text-ink">${t("edit.title")}</h1>
          </div>
          <div class="w-8" aria-hidden="true"></div>
        </div>
        <div class="flex-1 overflow-y-auto p-container-padding flex flex-col gap-stack-lg">
          <div class="card-glass rounded-xl p-inner-padding flex flex-col gap-1" style="background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(92, 67, 45, 0.16); border-radius: 20px;">
            <span class="font-title-card text-title-card text-ink">${t("edit.not_found")}</span>
            <span class="font-caption text-caption text-muted-text">${t("edit.not_found_hint")}</span>
          </div>
        </div>
      </main>
    `;
    }
    return renderConversationForm({
        mode: task.conversationMode === "new" ? "new" : "current",
        conversationTitle: task.conversationTitle ?? task.title,
        conversationUrl: task.conversationUrl,
        content: task.content,
        priority: task.priority,
        taskId: task.id,
        title: t("edit.title"),
        subtitle: t("edit.subtitle"),
        primaryLabel: t("form.save"),
        readonlyTitle: false
    });
}
function renderLanguageSegment(locale, label, selected) {
    const base = "flex-1 py-1.5 text-center font-title-card text-title-card transition-colors cursor-pointer";
    const active = selected
        ? "bg-primary text-on-primary shadow-sm"
        : "text-muted-text hover:text-ink";
    return `<button class="${base} ${active}" style="border-radius: 12px; border: none; outline: none;" type="button" role="radio" aria-checked="${selected}" data-action="set-lang" data-locale="${locale}">${escapeHtml(label)}</button>`;
}
function renderSettings(state) {
    const currentLocale = state.settings.language === "en" ? "en" : "zh";
    return `
    <main class="cqr-form-view cqr-form flex flex-col h-auto">
      <div class="flex items-center justify-between px-inner-padding h-12 w-full bg-card-glass backdrop-blur-md border-b border-border-subtle shadow-sm z-10 sticky top-0 shrink-0 cqr-subnav">
        <button class="flex items-center justify-center w-8 h-8 rounded-full text-muted-text hover:bg-border-subtle hover:text-ink transition-colors cursor-pointer group" type="button" data-action="show-home" aria-label="${t("panel.back")}">
          <span class="material-symbols-outlined text-[20px]" data-icon="arrow_back">arrow_back</span>
        </button>
        <div class="flex-1 text-center">
          <h1 class="font-headline-panel text-headline-panel font-bold text-ink">${t("settings.title")}</h1>
        </div>
        <div class="w-8" aria-hidden="true"></div>
      </div>
      <div class="flex-1 overflow-y-auto p-container-padding flex flex-col gap-stack-lg cqr-form-body">
        <section class="card-glass rounded-xl p-inner-padding flex flex-col gap-3" style="background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(92, 67, 45, 0.16); border-radius: 20px;">
          <div class="flex items-center justify-between">
            <span class="font-title-card text-title-card text-ink">${t("settings.language")}</span>
          </div>
          <div class="flex gap-1 p-1 bg-[rgba(255,255,255,0.45)]" style="border-radius: 14px;" role="radiogroup" aria-label="${t("settings.language")}">
            ${renderLanguageSegment("zh", "中文", currentLocale === "zh")}
            ${renderLanguageSegment("en", "English", currentLocale === "en")}
          </div>
        </section>
        <section class="card-glass rounded-xl p-inner-padding flex flex-col gap-3" style="background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(92, 67, 45, 0.16); border-radius: 20px;">
          <div class="flex flex-col gap-1">
            <span class="font-label-caps text-label-caps text-muted-text uppercase">${t("settings.about")}</span>
            <span class="font-title-card text-title-card text-ink">Claude Waitlist</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="font-caption text-caption text-muted-text">${t("settings.github")}: ${t("settings.placeholder")}</span>
            <span class="font-caption text-caption text-muted-text">${t("settings.developer")}: ${t("settings.placeholder")}</span>
          </div>
        </section>
      </div>
    </main>
  `;
}
function renderQueueTask(task) {
    const conversationTitle = normalizeConversationTitle(task.conversationTitle ?? task.title);
    const isNew = task.conversationMode === "new";
    return `
    <div class="queue-item card-glass rounded-lg p-2.5 flex items-center justify-between group transition-colors cqr-task cqr-queue-card" style="border-radius: 20px; position: relative; cursor: pointer;" data-action="edit-task" data-task-id="${escapeHtml(task.id)}" role="button" tabindex="0" title="${t("task.edit")}">
      <div class="flex items-center gap-2.5 overflow-hidden cqr-task-main">
        <div class="flex flex-col cqr-task-copy">
          <span class="font-title-card text-title-card text-ink cqr-task-title"><span class="cqr-task-title-text">${escapeHtml(conversationTitle)}</span>${isNew ? renderNewConversationIcon() : ""}</span>
        </div>
      </div>
      <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity cqr-task-actions">
        <button class="p-1 text-muted-text rounded" type="button" data-action="bump" data-task-id="${escapeHtml(task.id)}" title="${t("task.bump")}" aria-label="${t("task.bump")}"><span class="material-symbols-outlined text-[16px]" data-icon="keyboard_arrow_up">keyboard_arrow_up</span></button>
        <button class="p-1 text-muted-text rounded" type="button" data-action="delete" data-task-id="${escapeHtml(task.id)}" title="${t("task.delete")}" aria-label="${t("task.delete")}"><span class="material-symbols-outlined text-[16px]" data-icon="delete">delete</span></button>
      </div>
    </div>
  `;
}
function renderNewConversationIcon() {
    return `<span class="cqr-new-icon" style="display: inline-flex; margin-left: 12px; color: #2f7d4a; background: transparent; padding: 0; font-size: 10px; font-weight: 800; line-height: 14px; letter-spacing: 0.04em; vertical-align: middle;" title="${t("task.new_label")}" aria-label="${t("task.new_label")}">NEW</span>`;
}
function exportQueue() {
    const tasks = currentState?.tasks ?? [];
    const blob = new Blob([JSON.stringify({ tasks }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `claude-queue-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
}
function isDragBlocked(target, panel) {
    const element = target instanceof Element ? target : undefined;
    const button = element?.closest("button");
    if (button && button === panel && panel.classList.contains("cqr-pill"))
        return false;
    return Boolean(element?.closest("button, input, textarea, label, select, [data-task-form], .cqr-list, .cqr-task-actions"));
}
function bindPanelDrag(root) {
    const panel = root.querySelector("[data-draggable-panel]");
    if (!panel)
        return;
    let pointerId;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let moved = false;
    panel.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || isDragBlocked(event.target, panel))
            return;
        const rect = panel.getBoundingClientRect();
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        startLeft = rect.left;
        startTop = rect.top;
        moved = false;
        panel.setPointerCapture(event.pointerId);
        panel.classList.add("cqr-dragging");
    });
    panel.addEventListener("pointermove", (event) => {
        if (pointerId !== event.pointerId)
            return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (Math.abs(dx) + Math.abs(dy) > 4)
            moved = true;
        if (!moved)
            return;
        const rect = panel.getBoundingClientRect();
        const next = clampPanelPosition({ left: startLeft + dx, top: startTop + dy }, rect.width, rect.height);
        setActivePanelPosition(next);
        panel.style.left = `${Math.round(next.left)}px`;
        panel.style.top = `${Math.round(next.top)}px`;
        panel.style.right = "auto";
        panel.style.bottom = "auto";
        suppressNextClick = true;
        event.preventDefault();
    });
    const finishDrag = (event) => {
        if (pointerId !== event.pointerId)
            return;
        pointerId = undefined;
        panel.classList.remove("cqr-dragging");
        if (panel.hasPointerCapture(event.pointerId))
            panel.releasePointerCapture(event.pointerId);
        if (moved) {
            runExtensionTask(savePanelPositions());
            window.setTimeout(() => {
                suppressNextClick = false;
            }, 0);
        }
    };
    panel.addEventListener("pointerup", finishDrag);
    panel.addEventListener("pointercancel", finishDrag);
}
function bindPanelEvents(root) {
    root.querySelectorAll("[data-action]").forEach((element) => {
        element.addEventListener("click", (event) => {
            if (suppressNextClick) {
                suppressNextClick = false;
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            event.stopPropagation();
            const target = event.currentTarget;
            const action = target.dataset.action;
            const taskId = target.dataset.taskId;
            if (action === "expand") {
                preservePanelPositionForNextRender();
                collapsed = false;
                if (currentState)
                    render(currentState);
            }
            else if (action === "collapse") {
                collapsePanel();
            }
            else if (action === "show-home") {
                preservePanelPositionForNextRender();
                view = "home";
                editingTaskId = undefined;
                if (currentState)
                    render(currentState);
            }
            else if (action === "show-continue") {
                preservePanelPositionForNextRender();
                view = "continue";
                editingTaskId = undefined;
                if (currentState)
                    render(currentState);
            }
            else if (action === "show-new") {
                preservePanelPositionForNextRender();
                view = "new";
                editingTaskId = undefined;
                if (currentState)
                    render(currentState);
            }
            else if (action === "show-settings") {
                preservePanelPositionForNextRender();
                view = "settings";
                editingTaskId = undefined;
                if (currentState)
                    render(currentState);
            }
            else if (action === "edit-task" && taskId) {
                preservePanelPositionForNextRender();
                editingTaskId = taskId;
                view = "edit";
                if (currentState)
                    render(currentState);
            }
            else if (action === "set-lang") {
                const requestedLocale = target.dataset.locale;
                if (requestedLocale !== "zh" && requestedLocale !== "en")
                    return;
                const next = requestedLocale;
                if (next === getLocale())
                    return;
                setLocale(next);
                runExtensionTask(sendMessage({ type: "UPDATE_SETTINGS", patch: { language: next } }));
                preservePanelPositionForNextRender();
                if (currentState) {
                    currentState = { ...currentState, settings: { ...currentState.settings, language: next } };
                    render(currentState);
                }
            }
            else if (action === "detect") {
                runExtensionTask(refreshUsageSnapshot(true));
                runExtensionTask(mutate({ type: "DETECT_NOW" }));
            }
            else if (action === "send") {
                runExtensionTask(mutate({ type: "SEND_NEXT_NOW" }));
            }
            else if (action === "test-reset") {
                runExtensionTask(simulateResetSendTest());
            }
            else if (action === "bump" && taskId) {
                runExtensionTask(mutate({ type: "BUMP_TASK", taskId }));
            }
            else if (action === "skip" && taskId) {
                runExtensionTask(mutate({ type: "SKIP_TASK", taskId }));
            }
            else if (action === "delete" && taskId) {
                runExtensionTask(mutate({ type: "DELETE_TASK", taskId }));
            }
            else if (action === "export-queue") {
                exportQueue();
            }
            else if (action === "import-queue") {
                root.querySelector("[data-import-queue-input]")?.click();
            }
            else if (action === "clear-active") {
                runExtensionTask(mutate({ type: "CLEAR_ACTIVE" }));
            }
            else if (action === "clear-ended") {
                runExtensionTask(mutate({ type: "CLEAR_SENT" }));
            }
        });
    });
    const form = root.querySelector("[data-task-form]");
    form?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const content = String(data.get("content") ?? "").trim();
        if (!content)
            return;
        const submitter = event.submitter;
        const shouldSendNow = submitter?.value === "sendNow";
        const conversationMode = form.dataset.conversationMode === "new" ? "new" : "current";
        const conversationTitle = String(data.get("conversationTitle") ?? "").trim() || (conversationMode === "new" ? t("form.new_claude_conversation") : getCurrentConversationTitle());
        const conversationUrl = conversationMode === "current" ? form.dataset.conversationUrl || getCurrentConversationUrl() : undefined;
        const taskId = form.dataset.taskId;
        preservePanelPositionForNextRender();
        view = "home";
        editingTaskId = undefined;
        runExtensionTask((async () => {
            if (taskId) {
                const existingTask = currentState?.tasks.find((task) => task.id === taskId);
                const status = existingTask?.status === "needs_confirm" ? "ready" : existingTask?.status;
                const patch = {
                    title: conversationTitle,
                    content,
                    conversationMode,
                    conversationTitle,
                    conversationUrl,
                    priority: Number(data.get("priority")) || 0,
                    requireConfirm: shouldSendNow ? false : (existingTask?.requireConfirm ?? false),
                    autoSend: shouldSendNow || (existingTask?.autoSend ?? currentState?.settings.autoSendNext ?? false),
                    error: undefined,
                    ...(status ? { status } : {})
                };
                const response = await mutate({ type: "UPDATE_TASK", taskId, patch });
                if (!response.ok)
                    return;
                if (submitter?.value !== "saveAndSend") {
                    renderToast(t("toast.task_updated"));
                    return;
                }
                const updatedTask = response.state?.tasks.find((task) => task.id === taskId) ?? (existingTask ? { ...existingTask, ...patch } : undefined);
                await sendContentNow(content, updatedTask);
                return;
            }
            const response = await mutate({
                type: "ADD_TASK",
                title: conversationTitle,
                content,
                conversationMode,
                conversationTitle,
                conversationUrl,
                priority: Number(data.get("priority")) || 0,
                requireConfirm: false,
                autoSend: true
            });
            if (!response.ok)
                return;
            if (!shouldSendNow)
                return;
            const task = findCreatedTask(response.state ?? currentState, content);
            await sendContentNow(content, task);
        })());
    });
    root.querySelector("[data-import-queue-input]")?.addEventListener("change", (event) => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        if (!file)
            return;
        runExtensionTask((async () => {
            try {
                const parsed = JSON.parse(await file.text());
                const tasks = Array.isArray(parsed) ? parsed : parsed.tasks;
                if (!Array.isArray(tasks)) {
                    renderToast(t("toast.queue_json_invalid"));
                    return;
                }
                await mutate({ type: "IMPORT_QUEUE", tasks });
                renderToast(t("toast.queue_imported"));
            }
            catch {
                renderToast(t("toast.queue_json_invalid"));
            }
            finally {
                input.value = "";
            }
        })());
    });
}
function isolatePanelEvents(root) {
    const eventNames = [
        "beforeinput",
        "input",
        "change",
        "keydown",
        "keyup",
        "keypress",
        "compositionstart",
        "compositionupdate",
        "compositionend",
        "paste",
        "cut",
        "copy",
        "pointerdown",
        "pointerup",
        "mousedown",
        "mouseup",
        "click",
        "dblclick",
        "wheel",
        "focusin",
        "focusout"
    ];
    for (const eventName of eventNames) {
        root.addEventListener(eventName, (event) => event.stopPropagation());
    }
}
function initFloatingPanel() {
    if (initialized || document.getElementById(ROOT_ID))
        return;
    initialized = true;
    const host = document.createElement("div");
    host.id = ROOT_ID;
    host.setAttribute("data-claude-queue-resumer", "true");
    Object.assign(host.style, {
        position: "fixed",
        inset: "0",
        width: "0",
        height: "0",
        zIndex: "2147483647",
        pointerEvents: "none"
    });
    (document.body ?? document.documentElement).append(host);
    hostElement = host;
    shadowRootRef = host.attachShadow({ mode: "open" });
    isolatePanelEvents(shadowRootRef);
    document.addEventListener("pointerdown", (event) => {
        if (collapsed || !hostElement)
            return;
        const path = event.composedPath();
        if (!path.includes(hostElement))
            collapsePanel();
    }, true);
    runExtensionTask(loadPanelPosition().then(() => refreshFloatingPanel(true)));
    try {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName !== "local")
                return;
            const next = changes[STORAGE_KEY]?.newValue;
            if (next && !isUserTyping())
                render(next);
        });
    }
    catch (error) {
        handleExtensionError(error);
    }
    refreshTimer = window.setInterval(() => runExtensionTask(refresh(false)), 15000);
    countdownTimer = window.setInterval(updateCountdownOnly, 30000);
    usageTimer = window.setInterval(() => runExtensionTask(refreshUsageSnapshot(false)), USAGE_REFRESH_INTERVAL_MS);
    window.addEventListener("resize", () => {
        if (shadowRootRef)
            applyRenderedPanelPosition(shadowRootRef);
    });
    window.addEventListener("pagehide", () => {
        if (refreshTimer)
            window.clearInterval(refreshTimer);
        if (countdownTimer)
            window.clearInterval(countdownTimer);
        if (usageTimer)
            window.clearInterval(usageTimer);
    });
}
const styles = `
  :host {
    all: initial;
    position: fixed;
    inset: 0;
    width: 0;
    height: 0;
    z-index: 2147483647;
    pointer-events: none;
    color-scheme: light;
    --cqr-ink: #29231d;
    --cqr-muted: #736a60;
    --cqr-panel: #f4eee6;
    --cqr-card: rgba(255, 252, 246, 0.74);
    --cqr-line: rgba(92, 67, 45, 0.16);
    --cqr-line-strong: rgba(92, 67, 45, 0.24);
    --cqr-accent: #8b4a2b;
    --cqr-accent-strong: #6d371e;
    --cqr-amber: #8a5b13;
    --cqr-green: #2f6d4c;
    --cqr-red: #a13b2f;
    --cqr-surface-low: #f9f3eb;
    --cqr-surface: #fff8f0;
    --cqr-track: rgba(92, 67, 45, 0.08);
    --cqr-blur: blur(16px) saturate(1.12);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  .cqr-panel,
  .cqr-pill {
    position: fixed;
    right: max(18px, env(safe-area-inset-right));
    z-index: 2147483647;
  }

  .cqr-panel {
    top: max(84px, env(safe-area-inset-top));
    bottom: auto;
    width: min(390px, calc(100vw - 28px));
    max-height: calc(100vh - 112px);
    display: grid;
    gap: 12px;
    overflow: auto;
    border: 1px solid var(--cqr-line);
    border-radius: 28px;
    background: rgba(255, 252, 246, 0.74);
    box-shadow:
      0 8px 32px rgba(41, 35, 29, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.72);
    padding: 14px;
    cursor: grab;
    -webkit-backdrop-filter: var(--cqr-blur);
    backdrop-filter: var(--cqr-blur);
  }

  .cqr-panel.cqr-dragging,
  .cqr-pill.cqr-dragging {
    cursor: grabbing;
    user-select: none;
  }

  .cqr-panel::before {
    content: none;
  }

  .cqr-panel > * {
    position: relative;
    z-index: 1;
  }

  .cqr-header,
  .cqr-title,
  .cqr-header-actions,
  .cqr-actions,
  .cqr-mode,
  .cqr-subnav,
  .cqr-task,
  .cqr-task-actions {
    display: flex;
    align-items: center;
  }

  .cqr-header {
    justify-content: space-between;
    gap: 12px;
    border: 1px solid var(--cqr-line);
    border-radius: 16px;
    background: var(--cqr-card);
    padding: 8px;
    touch-action: none;
    box-shadow: 0 2px 8px rgba(41, 35, 29, 0.04);
  }

  .cqr-title {
    min-width: 0;
    gap: 10px;
  }

  .cqr-title span,
  .cqr-kicker,
  .cqr-reset span,
  .cqr-subnav span {
    color: var(--cqr-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .cqr-title strong,
  .cqr-subnav strong {
    display: block;
    color: var(--cqr-ink);
    font-size: 18px;
    font-weight: 760;
    letter-spacing: 0;
    line-height: 1.05;
  }

  .cqr-logo,
  .cqr-pill-logo {
    display: block;
    width: 32px;
    height: 32px;
    flex: 0 0 auto;
  }

  .cqr-logo svg,
  .cqr-pill-logo svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  button,
  input,
  textarea {
    font: inherit;
  }

  button {
    min-height: 38px;
    border: 1px solid var(--cqr-line);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.5);
    color: var(--cqr-ink);
    cursor: pointer;
    padding: 8px 12px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.76);
    transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
  }

  input,
  textarea,
  label,
  .cqr-list {
    cursor: auto;
  }

  button:hover {
    border-color: rgba(139, 74, 43, 0.36);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      0 9px 22px rgba(90, 61, 38, 0.1);
  }

  button:active {
    transform: translateY(1px) scale(0.99);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    box-shadow: none;
  }

  .cqr-header-actions {
    gap: 4px;
  }

  .cqr-header-actions button {
    width: 32px;
    height: 32px;
    min-height: 32px;
    padding: 0;
    border-color: transparent;
    border-radius: 8px;
    background: transparent;
    box-shadow: none;
    color: var(--cqr-muted);
    font-size: 18px;
    font-weight: 760;
    line-height: 1;
  }

  .cqr-header-actions button:hover {
    border-color: transparent;
    background: rgba(92, 67, 45, 0.12);
    color: var(--cqr-ink);
    box-shadow: none;
  }

  .cqr-view {
    display: grid;
    gap: 11px;
  }

  .cqr-now,
  .cqr-card,
  .cqr-subnav,
  .cqr-form,
  .cqr-task,
  .cqr-empty {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--cqr-line);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.5);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.72),
      0 2px 8px rgba(41, 35, 29, 0.04);
    -webkit-backdrop-filter: var(--cqr-blur);
    backdrop-filter: var(--cqr-blur);
  }

  .cqr-now {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(126px, 0.82fr);
    align-items: center;
    gap: 12px;
    min-height: 118px;
    padding: 12px;
  }

  .cqr-panel-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .cqr-panel-label > span {
    color: var(--cqr-ink);
    font-size: 14px;
    font-weight: 760;
  }

  .cqr-now p,
  .cqr-next p,
  .cqr-task p,
  .cqr-hint {
    margin: 7px 0 0;
    color: var(--cqr-muted);
    font-size: 12px;
    line-height: 1.35;
  }

  .cqr-usage-meters {
    display: grid;
    gap: 8px;
    margin-top: 10px;
  }

  .cqr-usage-meter {
    display: grid;
    gap: 5px;
  }

  .cqr-usage-meter-label {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    color: var(--cqr-muted);
    font-size: 12px;
    line-height: 1;
  }

  .cqr-usage-meter-label span {
    font-weight: 850;
  }

  .cqr-usage-meter-label strong {
    color: var(--cqr-ink);
    font-size: 13px;
    font-weight: 900;
  }

  .cqr-usage-meter-track {
    height: 6px;
    overflow: hidden;
    border: 0;
    border-radius: 999px;
    background: var(--cqr-track);
    box-shadow: inset 0 1px 2px rgba(70, 50, 34, 0.08);
  }

  .cqr-usage-meter-track i {
    display: block;
    height: 100%;
    min-width: 3px;
    border-radius: inherit;
    background: var(--cqr-green);
  }

  .cqr-usage-value {
    color: var(--cqr-ink);
  }

  .cqr-usage-fill,
  .cqr-usage-ok .cqr-usage-meter-track i,
  .cqr-usage-ok.cqr-pill .cqr-pill-track i {
    background: var(--cqr-green);
  }

  .cqr-usage-ok .cqr-usage-value {
    color: var(--cqr-green);
  }

  .cqr-usage-warn .cqr-usage-fill,
  .cqr-usage-warn .cqr-usage-meter-track i,
  .cqr-usage-warn.cqr-pill .cqr-pill-track i {
    background: var(--cqr-amber);
  }

  .cqr-usage-warn .cqr-usage-value {
    color: var(--cqr-amber);
  }

  .cqr-usage-danger .cqr-usage-fill,
  .cqr-usage-danger .cqr-usage-meter-track i,
  .cqr-usage-danger.cqr-pill .cqr-pill-track i {
    background: var(--cqr-red);
  }

  .cqr-usage-danger .cqr-usage-value {
    color: var(--cqr-red);
  }

  .cqr-usage-neutral .cqr-usage-fill {
    background: var(--cqr-accent);
  }

  .cqr-usage-empty {
    margin-top: 10px;
    color: var(--cqr-ink);
    font-size: 14px;
    font-weight: 850;
  }

  .cqr-reset {
    min-width: 128px;
    border-left: 1px solid var(--cqr-line);
    padding-left: 14px;
    text-align: right;
  }

  .cqr-reset strong {
    display: block;
    margin-top: 5px;
    color: var(--cqr-ink);
    font-size: 20px;
    font-variant-numeric: tabular-nums;
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
  }

  .cqr-reset small {
    display: block;
    margin-top: 6px;
    color: var(--cqr-muted);
    font-size: 11px;
    font-weight: 750;
  }

  .cqr-badge,
  .cqr-chip,
  .cqr-mode span {
    display: inline-flex;
    align-items: center;
    min-height: 25px;
    border-radius: 999px;
    border: 1px solid rgba(92, 67, 45, 0.12);
    background: rgba(244, 238, 229, 0.75);
    color: var(--cqr-muted);
    font-size: 12px;
    font-weight: 850;
    line-height: 1;
    padding: 6px 9px;
    white-space: nowrap;
  }

  .cqr-badge.cqr-state-available,
  .cqr-status-ready,
  .cqr-status-sent {
    color: var(--cqr-green);
    border-color: #c5d4c7;
    background: #dbe7db;
  }

  .cqr-state-limited,
  .cqr-state-limited_unknown_reset,
  .cqr-status-waiting_limit,
  .cqr-status-needs_confirm {
    color: var(--cqr-red);
    border-color: rgba(161, 59, 47, 0.18);
    background: rgba(161, 59, 47, 0.15);
  }

  .cqr-status-failed {
    color: var(--cqr-red);
    background: rgba(207, 84, 66, 0.14);
  }

  .cqr-next strong,
  .cqr-section-head strong,
  .cqr-task strong {
    display: block;
    color: var(--cqr-ink);
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
    overflow-wrap: anywhere;
  }

  .cqr-mode {
    gap: 7px;
    flex-wrap: wrap;
  }

  .cqr-queue-home {
    display: grid;
    gap: 8px;
    min-height: 0;
    max-height: none;
  }

  .cqr-queue-home-has-items {
    max-height: none;
  }

  .cqr-queue-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0 4px;
  }

  .cqr-queue-head button {
    min-height: 22px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    box-shadow: none;
    color: var(--cqr-accent);
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    padding: 2px 4px;
  }

  .cqr-section-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .cqr-section-head > span,
  .cqr-section-actions > span {
    color: var(--cqr-muted);
    font-size: 11px;
    font-weight: 720;
    white-space: nowrap;
  }

  .cqr-section-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    min-width: 0;
  }

  .cqr-section-actions button {
    width: 28px;
    height: 28px;
    min-height: 28px;
    padding: 0;
  }

  .cqr-next-strip {
    display: inline-flex;
    width: fit-content;
    max-width: 100%;
    min-height: 24px;
    align-items: center;
    border: 1px solid rgba(139, 74, 43, 0.12);
    border-radius: 999px;
    background: rgba(139, 74, 43, 0.08);
    color: var(--cqr-accent-strong);
    cursor: pointer;
    font-size: 11px;
    font-weight: 760;
    padding: 4px 8px;
  }

  .cqr-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .cqr-actions button {
    min-height: 42px;
    border-radius: 15px;
    padding-left: 8px;
    padding-right: 8px;
    font-size: 14px;
    font-weight: 900;
  }

  .cqr-actions button span {
    margin-right: 5px;
  }

  .cqr-primary {
    border-color: #864829;
    background: var(--cqr-accent);
    color: #fffaf4;
    font-weight: 900;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.22),
      0 10px 24px rgba(111, 55, 30, 0.18);
  }

  .cqr-subnav {
    min-height: 48px;
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) 32px;
    align-items: center;
    gap: 8px;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    padding: 0;
    text-align: center;
  }

  .cqr-subnav button {
    width: 32px;
    height: 32px;
    min-height: 32px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    box-shadow: none;
    color: var(--cqr-muted);
    font-size: 18px;
    font-weight: 700;
    padding: 0;
  }

  .cqr-subnav h1 {
    margin: 0;
    color: var(--cqr-ink);
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 24px;
  }

  .cqr-subnav > span {
    display: block;
    width: 32px;
    height: 32px;
  }

  .cqr-form-view {
    display: grid;
    gap: 0;
  }

  .cqr-form {
    display: grid;
    gap: 20px;
    overflow: visible;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    padding: 0 0 2px;
  }

  .cqr-form-context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border: 1px solid var(--cqr-line);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.38);
    color: var(--cqr-muted);
    font-size: 11px;
    font-weight: 760;
    padding: 9px 10px;
  }

  .cqr-form-context strong {
    color: var(--cqr-accent-strong);
  }

  input,
  textarea {
    width: 100%;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--cqr-ink);
    padding: 0;
    outline: none;
  }

  textarea {
    min-height: 136px;
    resize: vertical;
  }

  input[readonly] {
    color: var(--cqr-muted);
    background: transparent;
  }

  .cqr-field-label {
    display: grid;
    gap: 8px;
    color: var(--cqr-ink);
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
  }

  .cqr-form-helper {
    margin: 0;
    color: var(--cqr-muted);
    font-size: 13px;
    line-height: 18px;
  }

  .cqr-input-shell,
  .cqr-textarea-shell {
    display: flex;
    width: 100%;
    gap: 10px;
    border: 1px solid var(--cqr-line);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.5);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
    color: var(--cqr-muted);
    padding: 12px 14px;
  }

  .cqr-input-shell {
    min-height: 48px;
    align-items: center;
  }

  .cqr-textarea-shell {
    min-height: 160px;
    align-items: flex-start;
  }

  .cqr-field-icon {
    flex: 0 0 auto;
    color: var(--cqr-muted);
    font-size: 16px;
    line-height: 1;
  }

  .cqr-form-grid {
    display: grid;
    grid-template-columns: minmax(78px, 1fr) auto;
    gap: 9px;
    align-items: end;
  }

  .cqr-form-grid label {
    color: var(--cqr-muted);
    font-size: 11px;
    font-weight: 700;
  }

  .cqr-form-note {
    align-self: center;
    border: 1px solid rgba(68, 143, 96, 0.18);
    border-radius: 999px;
    background: rgba(68, 143, 96, 0.13);
    color: var(--cqr-green);
    font-size: 11px;
    font-weight: 780;
    line-height: 1.1;
    padding: 8px 10px;
    white-space: nowrap;
  }

  .cqr-form-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
    padding-top: 4px;
  }

  .cqr-form-actions button {
    min-height: 48px;
    border-radius: 999px;
    padding-left: 16px;
    padding-right: 16px;
  }

  .cqr-check {
    min-height: 38px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .cqr-check input {
    width: 18px;
    height: 18px;
    accent-color: var(--cqr-accent);
  }

  .cqr-hint {
    font-size: 11px;
  }

  .cqr-list {
    display: grid;
    gap: 4px;
    max-height: min(50vh, 390px);
    overflow: auto;
    padding-right: 2px;
  }

  .cqr-list-home {
    max-height: none;
    margin-top: 0;
  }

  .cqr-list::-webkit-scrollbar {
    width: 4px;
  }

  .cqr-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .cqr-list::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background: rgba(92, 67, 45, 0.2);
  }

  .cqr-task {
    justify-content: space-between;
    gap: 10px;
    min-height: 56px;
    border-radius: 8px;
    padding: 10px;
    cursor: pointer;
    border-left: 2px solid transparent;
    transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
  }

  .cqr-task:hover {
    border-color: rgba(139, 74, 43, 0.28);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.76),
      0 10px 24px rgba(72, 52, 34, 0.12);
  }

  .cqr-task:active {
    transform: translateY(1px);
  }

  .cqr-task-primary {
    border-left-color: var(--cqr-accent);
  }

  .cqr-task-index {
    display: grid;
    width: 16px;
    height: 20px;
    flex: 0 0 auto;
    place-items: center;
    border: 0;
    background: transparent;
    color: var(--cqr-muted);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0;
    line-height: 1;
  }

  .cqr-task-copy {
    min-width: 0;
    flex: 1 1 auto;
  }

  .cqr-task-main {
    min-width: 0;
    flex: 1 1 auto;
  }

  .cqr-task-title {
    display: inline-flex;
    max-width: 100%;
    align-items: center;
    gap: 6px;
  }

  .cqr-task-title-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cqr-task-copy > span {
    margin-top: 2px;
    color: var(--cqr-muted);
    font-size: 11px;
    font-weight: 400;
    line-height: 14px;
  }

  .cqr-new-icon {
    display: inline-flex;
    width: auto;
    height: auto;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: transparent;
    color: #2f7d4a;
    margin-left: 12px;
    padding: 0;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
    line-height: 14px;
    text-transform: uppercase;
    vertical-align: middle;
  }

  .cqr-task-actions {
    align-self: stretch;
    align-items: center;
    gap: 4px;
    flex: 0 0 auto;
    opacity: 0;
    transition: opacity 150ms ease;
  }

  .cqr-task:hover .cqr-task-actions,
  .cqr-task:focus-within .cqr-task-actions {
    opacity: 1;
  }

  .cqr-task-actions button {
    width: 28px;
    height: 28px;
    min-height: 28px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    box-shadow: none;
    color: var(--cqr-muted);
    font-size: 16px;
    font-weight: 760;
    line-height: 1;
    padding: 0;
  }

  .cqr-task-actions button:hover {
    background: rgba(92, 67, 45, 0.12);
    color: var(--cqr-ink);
    box-shadow: none;
  }

  .cqr-empty {
    display: grid;
    gap: 5px;
    padding: 20px 14px;
    text-align: center;
  }

  .cqr-empty strong {
    color: var(--cqr-ink);
    font-size: 13px;
  }

  .cqr-empty span {
    color: var(--cqr-muted);
    font-size: 12px;
  }

  .cqr-settings-card {
    display: grid;
    gap: 12px;
    padding: 12px;
  }

  .cqr-settings-form {
    display: grid;
    gap: 10px;
  }

  .cqr-switch-row {
    min-height: 54px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border: 1px solid var(--cqr-line);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.42);
    padding: 10px 12px;
  }

  .cqr-switch-row strong,
  .cqr-policy-grid strong {
    display: block;
    color: var(--cqr-ink);
    font-size: 13px;
    font-weight: 760;
  }

  .cqr-switch-row small,
  .cqr-policy-grid small {
    display: block;
    margin-top: 3px;
    color: var(--cqr-muted);
    font-size: 11px;
    line-height: 1.2;
  }

  .cqr-switch-row input {
    width: 38px;
    height: 22px;
    flex: 0 0 auto;
    accent-color: var(--cqr-accent);
  }

  .cqr-policy-grid,
  .cqr-utility-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .cqr-policy-grid span {
    min-width: 0;
    border: 1px solid var(--cqr-line);
    border-radius: 14px;
    background: rgba(249, 243, 235, 0.72);
    padding: 9px;
  }

  .cqr-utility-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cqr-utility-grid button {
    min-height: 38px;
    padding-left: 8px;
    padding-right: 8px;
    font-size: 12px;
    font-weight: 760;
  }

  .cqr-toast {
    margin: 0;
    border: 1px solid rgba(139, 74, 43, 0.18);
    border-radius: 12px;
    background: rgba(255, 252, 246, 0.9);
    color: var(--cqr-accent-strong);
    font-size: 12px;
    line-height: 1.35;
    padding: 9px 10px;
  }

  .cqr-pill {
    bottom: max(18px, env(safe-area-inset-bottom));
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    align-items: center;
    gap: 9px;
    width: min(224px, calc(100vw - 28px));
    min-height: 72px;
    border-radius: 18px;
    padding: 9px 10px;
    cursor: grab;
    touch-action: none;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.74), rgba(255, 248, 239, 0.56)),
      var(--cqr-card);
    box-shadow:
      0 8px 32px rgba(41, 35, 29, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
    -webkit-backdrop-filter: var(--cqr-blur);
    backdrop-filter: var(--cqr-blur);
  }

  .cqr-pill-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
    text-align: left;
  }

  .cqr-pill-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }

  .cqr-pill strong {
    color: var(--cqr-ink);
    font-size: 13px;
    font-weight: 780;
    line-height: 1.1;
  }

  .cqr-pill small {
    overflow: hidden;
    color: var(--cqr-muted);
    font-size: 10px;
    font-weight: 780;
    letter-spacing: 0.055em;
    text-transform: uppercase;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cqr-pill-track {
    height: 6px;
    overflow: hidden;
    border: 1px solid rgba(92, 67, 45, 0.12);
    border-radius: 999px;
    background: rgba(230, 220, 209, 0.62);
    box-shadow: inset 0 1px 2px rgba(70, 50, 34, 0.08);
  }

  .cqr-pill-track i {
    display: block;
    height: 100%;
    min-width: 3px;
    border-radius: inherit;
    background: var(--cqr-green);
  }

  .cqr-pill-reset {
    color: var(--cqr-accent-strong);
    font-size: 10px;
    font-weight: 760;
    line-height: 1.15;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Stitch Bilingual Design System utility layer. */
  .glass-panel {
    border: 1px solid rgba(92, 67, 45, 0.16);
    background: rgba(255, 252, 246, 0.74);
    box-shadow: 0 8px 32px rgba(41, 35, 29, 0.12);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
  }

  .card-glass {
    border: 1px solid rgba(92, 67, 45, 0.08);
    background: rgba(255, 252, 246, 0.74);
    box-shadow: 0 2px 8px rgba(41, 35, 29, 0.04);
  }

  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .items-center { align-items: center; }
  .items-end { align-items: flex-end; }
  .justify-between { justify-content: space-between; }
  .justify-center { justify-content: center; }
  .justify-start { justify-content: flex-start; }
  .flex-1 { flex: 1 1 0%; }
  .shrink-0 { flex-shrink: 0; }
  .flex-shrink-0 { flex-shrink: 0; }
  .w-full { width: 100%; }
  .h-full { height: 100%; }
  .h-auto { height: auto; }
  .w-8 { width: 32px; }
  .h-8 { height: 32px; }
  .h-12 { height: 48px; }
  .h-1\\.5 { height: 6px; }
  .min-h-\\[72px\\] { min-height: 72px; }
  .min-h-\\[120px\\] { min-height: 120px; }
  .w-panel-width-expanded { width: min(390px, calc(100vw - 28px)); }
  .w-panel-width-collapsed { width: min(224px, calc(100vw - 28px)); }
  .min-h-\\[160px\\] { min-height: 160px; }
  .max-h-\\[200px\\] { max-height: 200px; }
  .min-h-screen { min-height: 100vh; }
  .gap-0\\.5 { gap: 2px; }
  .gap-1 { gap: 4px; }
  .gap-1\\.5 { gap: 6px; }
  .gap-2 { gap: 8px; }
  .gap-2\\.5 { gap: 10px; }
  .gap-3 { gap: 12px; }
  .gap-4 { gap: 16px; }
  .gap-stack-sm { gap: 4px; }
  .gap-stack-md { gap: 8px; }
  .gap-stack-lg,
  .gap-stack-gap-lg { gap: 12px; }
  .p-container-padding { padding: 14px; }
  .p-inner-padding { padding: 12px; }
  .p-0 { padding: 0; }
  .p-1 { padding: 4px; }
  .p-1\\.5 { padding: 6px; }
  .p-2\\.5 { padding: 10px; }
  .p-3 { padding: 12px; }
  .p-4 { padding: 16px; }
  .p-8 { padding: 32px; }
  .px-1 { padding-left: 4px; padding-right: 4px; }
  .px-2 { padding-left: 8px; padding-right: 8px; }
  .px-3 { padding-left: 12px; padding-right: 12px; }
  .px-4 { padding-left: 16px; padding-right: 16px; }
  .px-inner-padding { padding-left: 12px; padding-right: 12px; }
  .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
  .py-2 { padding-top: 8px; padding-bottom: 8px; }
  .py-2\\.5 { padding-top: 10px; padding-bottom: 10px; }
  .pt-1 { padding-top: 4px; }
  .pt-2 { padding-top: 8px; }
  .pb-2 { padding-bottom: 8px; }
  .pl-4 { padding-left: 16px; }
  .pr-1 { padding-right: 4px; }
  .mb-0\\.5 { margin-bottom: 2px; }
  .mb-1 { margin-bottom: 4px; }
  .mb-2 { margin-bottom: 8px; }
  .-mt-2 { margin-top: -8px; }
  .ml-1 { margin-left: 4px; }
  .ml-2 { margin-left: 8px; }
  .mr-2 { margin-right: 8px; }
  .rounded-full { border-radius: 9999px; }
  .rounded { border-radius: 4px; }
  .rounded-md { border-radius: 6px; }
  .rounded-lg { border-radius: 8px; }
  .rounded-xl { border-radius: 12px; }
  .rounded-\\[14px\\] { border-radius: 14px; }
  .rounded-\\[16px\\] { border-radius: 16px; }
  .rounded-\\[18px\\] { border-radius: 18px; }
  .rounded-\\[28px\\] { border-radius: 28px; }
  .overflow-hidden { overflow: hidden; }
  .overflow-y-auto { overflow-y: auto; }
  .relative { position: relative; }
  .sticky { position: sticky; }
  .top-0 { top: 0; }
  .z-10 { z-index: 10; }
  .cursor-pointer { cursor: pointer; }
  .cursor-grab { cursor: grab; }
  .cursor-not-allowed { cursor: not-allowed; }
  .active\\:cursor-grabbing:active { cursor: grabbing; }
  .transition-colors,
  .transition-opacity,
  .transition-all { transition: color 150ms ease, background-color 150ms ease, border-color 150ms ease, opacity 150ms ease, box-shadow 150ms ease; }
  .duration-200 { transition-duration: 200ms; }
  .duration-500 { transition-duration: 500ms; }
  .ease-out { transition-timing-function: ease-out; }
  .shadow-sm { box-shadow: 0 1px 2px rgba(41, 35, 29, 0.06); }
  .text-center { text-align: center; }
  .uppercase { text-transform: uppercase; }
  .tracking-wider { letter-spacing: 0.06em; }
  .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .opacity-0 { opacity: 0; }
  .opacity-70 { opacity: 0.7; }
  .opacity-80 { opacity: 0.8; }
  .group:hover .group-hover\\:opacity-100 { opacity: 1; }
  .border { border: 1px solid currentColor; }
  .border-none { border: 0; }
  .border-transparent { border-color: transparent; }
  .border-border-subtle { border-color: rgba(92, 67, 45, 0.16); }
  .border-l { border-left: 1px solid rgba(92, 67, 45, 0.16); }
  .border-b { border-bottom: 1px solid rgba(92, 67, 45, 0.16); }
  .border-t { border-top: 1px solid rgba(92, 67, 45, 0.16); }
  .border-l-2 { border-left-width: 2px; }
  .border-l-primary { border-left-color: #6e3316; }
  .border-l-transparent { border-left-color: transparent; }
  .bg-card-glass { background: rgba(255, 252, 246, 0.74); }
  .bg-background { background: #fff8f0; }
  .bg-panel-bg { background: #f4eee6; }
  .bg-surface-container-low { background: #f9f3eb; }
  .bg-border-subtle { background: rgba(92, 67, 45, 0.16); }
  .bg-primary { background: #6e3316; }
  .bg-primary-container { background: #8b4a2b; }
  .bg-success { background: #2f6d4c; }
  .bg-warning { background: #8a5b13; }
  .bg-transparent { background: transparent; }
  .bg-error\\/15 { background: rgba(161, 59, 47, 0.15); }
  .bg-error\\/10 { background: rgba(161, 59, 47, 0.1); }
  .bg-\\[\\#8b4a2b\\] { background: #8b4a2b; }
  .bg-\\[\\#6e3316\\] { background: #6e3316; }
  .bg-\\[rgba\\(255\\,255\\,255\\,0\\.5\\)\\] { background: rgba(255, 255, 255, 0.5); }
  .bg-\\[rgba\\(92\\,67\\,45\\,0\\.2\\)\\] { background: rgba(92, 67, 45, 0.2); }
  .text-ink { color: #29231d; }
  .text-muted-text { color: #736a60; }
  .text-primary { color: #6e3316; }
  .text-error { color: #a13b2f; }
  .text-on-primary { color: #ffffff; }
  .text-on-primary-container { color: #ffc8b1; }
  .text-\\[\\#ffffff\\] { color: #ffffff; }
  .text-\\[10px\\] { font-size: 10px; }
  .text-\\[16px\\] { font-size: 16px; }
  .text-\\[18px\\] { font-size: 18px; }
  .text-\\[20px\\] { font-size: 20px; }
  .text-sm { font-size: 14px; line-height: 20px; }
  .font-bold { font-weight: 700; }
  .font-label-caps,
  .text-label-caps {
    font-size: 11px;
    line-height: 16px;
    font-weight: 700;
    letter-spacing: 0.06em;
  }
  .font-pill-value,
  .text-pill-value {
    font-size: 14px;
    line-height: 16px;
    font-weight: 600;
  }
  .font-caption,
  .text-caption {
    font-size: 11px;
    line-height: 14px;
    font-weight: 400;
  }
  .font-body-md,
  .text-body-md {
    font-size: 13px;
    line-height: 18px;
    font-weight: 400;
  }
  .font-timer-display,
  .text-timer-display {
    font-size: 16px;
    line-height: 20px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .font-title-card,
  .text-title-card {
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
  }
  .font-headline-panel,
  .text-headline-panel {
    font-size: 18px;
    line-height: 24px;
    letter-spacing: 0;
    font-weight: 600;
  }
  .backdrop-blur-md {
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
  }
  .resize-none { resize: none; }
  .focus\\:ring-0:focus { box-shadow: none; }
  .placeholder-muted-text::placeholder { color: #736a60; }
  .object-contain { object-fit: contain; }
  .antialiased { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  .input-focus:focus-within {
    border-color: #6e3316;
    box-shadow: 0 0 0 2px rgba(110, 51, 22, 0.1);
  }
  .hover\\:underline:hover { text-decoration: underline; }
  .hover\\:text-ink:hover { color: #29231d; }
  .hover\\:text-error:hover { color: #a13b2f; }
  .hover\\:bg-border-subtle:hover { background: rgba(92, 67, 45, 0.16); }
  .hover\\:bg-surface-container-highest:hover { background: #e7e2da; }
  .hover\\:bg-accent-dark:hover,
  .hover\\:bg-\\[\\#6e3316\\]:hover { background: #6e3316; }
  .hover\\:bg-error\\/10:hover { background: rgba(161, 59, 47, 0.1); }
  .hover\\:bg-\\[rgba\\(92\\,67\\,45\\,0\\.08\\)\\]:hover { background: rgba(92, 67, 45, 0.08); }
  .hover\\:bg-\\[rgba\\(92\\,67\\,45\\,0\\.2\\)\\]:hover { background: rgba(92, 67, 45, 0.2); }
  .hover\\:border-outline-variant:hover { border-color: #d9c2b9; }

  .material-symbols-outlined {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    --cqr-icon-size: 18px;
    width: var(--cqr-icon-size);
    height: var(--cqr-icon-size);
    overflow: hidden;
    color: currentColor;
    font-size: 0 !important;
    line-height: 1;
  }

  .material-symbols-outlined::before {
    font-size: var(--cqr-icon-size, 18px);
    line-height: 1;
  }

  .text-\\[16px\\].material-symbols-outlined { --cqr-icon-size: 16px; }
  .text-\\[18px\\].material-symbols-outlined { --cqr-icon-size: 18px; }
  .text-\\[20px\\].material-symbols-outlined { --cqr-icon-size: 20px; }
  .material-symbols-outlined[data-icon="refresh"]::before { content: "↻"; }
  .material-symbols-outlined[data-icon="close_fullscreen"]::before { content: "↙"; }
  .material-symbols-outlined[data-icon="resume"]::before { content: "↳"; }
  .material-symbols-outlined[data-icon="add_comment"]::before { content: "+"; }
  .material-symbols-outlined[data-icon="arrow_back"]::before { content: "←"; }
  .material-symbols-outlined[data-icon="queue"]::before { content: "≡"; }
  .material-symbols-outlined[data-icon="drag_indicator"]::before { content: "⋮"; letter-spacing: 0; }
  .material-symbols-outlined[data-icon="keyboard_arrow_up"]::before { content: "↑"; }
  .material-symbols-outlined[data-icon="delete"]::before { content: "×"; }
  .material-symbols-outlined[data-icon="settings"]::before { content: "⚙"; }
  .material-symbols-outlined[data-icon="check"]::before { content: "✓"; }

  .cqr-panel {
    width: min(390px, calc(100vw - 28px));
    border-radius: 28px;
  }

  .cqr-panel-home {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    overflow: auto;
    background: rgba(255, 252, 246, 0.74);
  }

  .cqr-panel-form {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0;
    overflow: hidden;
    background: #f4eee6;
  }

  .cqr-header {
    min-height: auto;
    border-color: rgba(92, 67, 45, 0.08);
    border-radius: 0;
    padding: 4px 8px 8px;
  }

  .cqr-header-actions button {
    width: 32px;
    height: 32px;
    min-height: 32px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #736a60;
    padding: 6px;
  }

  .cqr-now {
    display: flex;
    flex-direction: column;
    min-height: auto;
    padding: 12px;
  }

  .progress-track {
    background: rgba(92, 67, 45, 0.08);
  }

  .cqr-badge {
    min-height: 20px;
    border: 0;
    padding: 2px 8px;
    font-size: 10px;
    line-height: 16px;
  }

  .cqr-state-limited,
  .cqr-state-limited_unknown_reset {
    color: #a13b2f;
    background: rgba(161, 59, 47, 0.15);
  }

  .cqr-reset {
    min-width: auto;
    border-left: 1px solid rgba(92, 67, 45, 0.16);
    padding-left: 16px;
    text-align: right;
  }

  .cqr-reset [data-countdown] {
    display: inline;
    margin: 0;
    font-size: 16px;
    line-height: 20px;
    font-weight: 700;
  }

  .cqr-reset [data-reset-time] {
    display: inline;
    margin: 0;
    font-size: 13px;
    line-height: 18px;
    font-weight: 400;
  }

  .cqr-queue-home {
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    min-height: 0;
    max-height: none;
  }

  .cqr-queue-home-has-items {
    max-height: none;
  }

  .queue-list::-webkit-scrollbar {
    width: 4px;
  }

  .queue-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .queue-list::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background: rgba(92, 67, 45, 0.2);
  }

  .queue-item {
    min-height: 52px;
    border-top: 1px solid rgba(92, 67, 45, 0.08);
    border-right: 1px solid rgba(92, 67, 45, 0.08);
    border-bottom: 1px solid rgba(92, 67, 45, 0.08);
    background: rgba(255, 252, 246, 0.74);
    box-shadow: 0 2px 8px rgba(41, 35, 29, 0.04);
    cursor: pointer;
  }

  .queue-item,
  .queue-item * {
    cursor: pointer;
  }

  .queue-item:hover {
    background: rgba(92, 67, 45, 0.04);
  }

  .cqr-task-copy > span:first-child {
    color: #29231d;
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
  }

  .cqr-task-main {
    min-width: 0;
    flex: 1 1 auto;
  }

  .cqr-task-title {
    display: inline-flex;
    max-width: 100%;
    align-items: center;
    gap: 6px;
  }

  .cqr-task-title-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cqr-task-copy > span:last-child:not(:first-child) {
    margin-top: 0;
    color: #736a60;
    font-size: 11px;
    line-height: 14px;
    font-weight: 400;
  }

  .cqr-task-index {
    display: inline-flex;
    width: 16px;
    height: 16px;
    letter-spacing: 0;
  }

  .cqr-new-icon {
    display: inline-flex;
    width: auto;
    height: auto;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: transparent;
    color: #2f7d4a;
    margin-left: 12px;
    padding: 0;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
    line-height: 14px;
    text-transform: uppercase;
    vertical-align: middle;
  }

  .cqr-task-actions {
    align-self: center;
    opacity: 0;
  }

  .cqr-task:hover .cqr-task-actions {
    opacity: 1;
  }

  .cqr-task-actions button {
    width: 24px;
    height: 24px;
    min-height: 24px;
    border: 0;
    background: transparent;
    box-shadow: none;
    padding: 4px;
  }

  .cqr-actions {
    display: flex;
  }

  .cqr-actions button {
    min-height: 40px;
    border: 1px solid transparent;
    padding: 10px 8px;
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
  }

  .cqr-actions button:not(.cqr-primary) {
    background: rgba(92, 67, 45, 0.16);
    color: #29231d;
  }

  .cqr-primary {
    border-color: transparent;
    background: #8b4a2b;
    color: #ffffff;
  }

  .cqr-form-view {
    width: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .cqr-form {
    gap: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .cqr-subnav {
    display: flex;
    min-height: 48px;
    border-bottom: 1px solid rgba(92, 67, 45, 0.16);
    border-radius: 0;
    background: rgba(255, 252, 246, 0.74);
    padding: 0 12px;
    box-shadow: 0 1px 2px rgba(41, 35, 29, 0.04);
  }

  .cqr-subnav button {
    width: 32px;
    height: 32px;
    min-height: 32px;
    border: 0;
    background: transparent;
    box-shadow: none;
    padding: 0;
  }

  .cqr-subnav h1 {
    margin: 0;
    font-size: 18px;
    line-height: 24px;
    font-weight: 700;
  }

  .cqr-form-body {
    padding: 14px;
  }

  .cqr-form-helper {
    margin: -8px 0 8px;
    text-align: center;
    color: #736a60;
    font-size: 13px;
    line-height: 18px;
  }

  .cqr-field-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: #736a60;
  }

  .cqr-field-label label {
    color: #736a60;
    font-size: 11px;
    line-height: 16px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .cqr-input-shell {
    min-height: auto;
    padding: 8px 12px;
  }

  .cqr-textarea-shell {
    height: 160px;
    min-height: 120px;
    padding: 12px;
  }

  .cqr-input-shell,
  .cqr-textarea-shell {
    border: 1px solid rgba(92, 67, 45, 0.16);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.5);
    box-shadow: none;
  }

  .cqr-input-shell:focus-within,
  .cqr-textarea-shell:focus-within {
    border-color: #6e3316;
    box-shadow: 0 0 0 2px rgba(110, 51, 22, 0.1);
  }

  input,
  textarea {
    width: 100%;
    border: 0;
    background: transparent;
    color: #29231d;
    font-size: 13px;
    line-height: 18px;
    padding: 0;
    outline: none;
  }

  textarea {
    height: 100%;
    min-height: 0;
    resize: none;
  }

  .cqr-form-actions {
    display: flex;
    border-top: 1px solid rgba(92, 67, 45, 0.16);
    background: #f9f3eb;
    padding: 14px;
  }

  .cqr-form-actions button {
    min-height: 40px;
    border: 0;
    padding: 10px 16px;
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
  }

  .cqr-pill {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0;
    width: min(224px, calc(100vw - 28px));
    min-height: 72px;
    border-radius: 18px;
    padding: 12px;
    background: rgba(255, 252, 246, 0.74);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
  }

  .cqr-pill-logo {
    width: 32px;
    height: 32px;
  }

  @media (max-width: 520px) {
    .cqr-panel {
      right: 10px;
      top: 10px;
      width: calc(100vw - 20px);
      max-height: calc(100vh - 20px);
      border-radius: 24px;
      padding: 12px;
    }

    .cqr-actions {
      grid-template-columns: 1fr;
    }

    .cqr-policy-grid {
      grid-template-columns: 1fr;
    }

    .cqr-now {
      grid-template-columns: 1fr;
    }

    .cqr-reset {
      border-left: 0;
      border-top: 1px solid rgba(92, 67, 45, 0.14);
      padding: 10px 0 0;
      text-align: left;
    }

    .cqr-form-grid {
      grid-template-columns: 1fr;
    }
  }
`;
const stitchStyles = `
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap");
  @import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");

  :host {
    all: initial;
    color-scheme: light;
    --ink: #29231d;
    --muted-text: #736a60;
    --primary: #6e3316;
    --primary-container: #8b4a2b;
    --accent-dark: #6d371e;
    --success: #2f6d4c;
    --warning: #8a5b13;
    --error: #a13b2f;
    --panel-bg: #f4eee6;
    --card-glass: rgba(255, 252, 246, 0.74);
    --border-subtle: rgba(92, 67, 45, 0.16);
    --surface-container-low: #f9f3eb;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  button,
  input,
  textarea {
    font: inherit;
  }

  button {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
    cursor: pointer;
  }

  input,
  textarea {
    margin: 0;
    outline: none;
  }

  img {
    display: block;
  }

  .cqr-panel,
  .cqr-pill {
    position: fixed;
    right: max(18px, env(safe-area-inset-right));
    z-index: 2147483647;
    color: var(--ink);
    pointer-events: auto;
  }

  .cqr-panel {
    top: max(84px, env(safe-area-inset-top));
    bottom: auto;
    max-height: calc(100vh - 112px);
    cursor: grab;
    touch-action: none;
  }

  .cqr-panel-home {
    width: min(390px, calc(100vw - 28px));
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: auto;
    padding: 14px;
    border-radius: 28px;
    background: rgba(255, 252, 246, 0.74);
  }

  .cqr-panel-form {
    width: min(390px, calc(100vw - 28px));
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: hidden;
    padding: 0;
    border-radius: 28px;
    background: var(--panel-bg);
  }

  .cqr-dragging {
    cursor: grabbing;
    user-select: none;
  }

  .glass-panel {
    border: 1px solid var(--border-subtle);
    background: rgba(255, 252, 246, 0.74);
    box-shadow: 0 8px 32px rgba(41, 35, 29, 0.12);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
  }

  .card-glass {
    border: 1px solid rgba(92, 67, 45, 0.08);
    background: var(--card-glass);
    box-shadow: 0 2px 8px rgba(41, 35, 29, 0.04);
  }

  .flex { display: flex; }
  .grid { display: grid; }
  .flex-col { flex-direction: column; }
  .items-center { align-items: center; }
  .items-end { align-items: flex-end; }
  .justify-between { justify-content: space-between; }
  .justify-center { justify-content: center; }
  .justify-start { justify-content: flex-start; }
  .flex-1 { flex: 1 1 0%; min-width: 0; }
  .shrink-0 { flex-shrink: 0; }
  .flex-shrink-0 { flex-shrink: 0; }
  .w-full { width: 100%; }
  .h-full { height: 100%; }
  .h-auto { height: auto; }
  .w-8 { width: 32px; }
  .h-8 { height: 32px; }
  .h-12 { height: 48px; }
  .h-1\\.5 { height: 6px; }
  .min-h-\\[72px\\] { min-height: 72px; }
  .min-h-\\[120px\\] { min-height: 120px; }
  .min-h-\\[160px\\] { min-height: 160px; }
  .min-h-screen { min-height: 100vh; }
  .max-h-\\[200px\\] { max-height: 200px; }
  .w-panel-width-expanded { width: min(390px, calc(100vw - 28px)); }
  .w-panel-width-collapsed { width: min(224px, calc(100vw - 28px)); }

  .gap-0\\.5 { gap: 2px; }
  .gap-1 { gap: 4px; }
  .gap-1\\.5 { gap: 6px; }
  .gap-2 { gap: 8px; }
  .gap-2\\.5 { gap: 10px; }
  .gap-3 { gap: 12px; }
  .gap-4 { gap: 16px; }
  .gap-stack-sm { gap: 4px; }
  .gap-stack-md { gap: 8px; }
  .gap-stack-lg,
  .gap-stack-gap-lg { gap: 12px; }

  .p-0 { padding: 0; }
  .p-1 { padding: 4px; }
  .p-1\\.5 { padding: 6px; }
  .p-2\\.5 { padding: 10px; }
  .p-3 { padding: 12px; }
  .p-4 { padding: 16px; }
  .p-8 { padding: 32px; }
  .p-container-padding { padding: 14px; }
  .p-inner-padding { padding: 12px; }
  .px-1 { padding-left: 4px; padding-right: 4px; }
  .px-2 { padding-left: 8px; padding-right: 8px; }
  .px-3 { padding-left: 12px; padding-right: 12px; }
  .px-4 { padding-left: 16px; padding-right: 16px; }
  .px-inner-padding { padding-left: 12px; padding-right: 12px; }
  .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
  .py-2 { padding-top: 8px; padding-bottom: 8px; }
  .py-2\\.5 { padding-top: 10px; padding-bottom: 10px; }
  .pt-1 { padding-top: 4px; }
  .pt-2 { padding-top: 8px; }
  .pb-2 { padding-bottom: 8px; }
  .pl-4 { padding-left: 16px; }
  .pr-1 { padding-right: 4px; }
  .mb-0\\.5 { margin-bottom: 2px; }
  .mb-1 { margin-bottom: 4px; }
  .mb-2 { margin-bottom: 8px; }
  .-mt-2 { margin-top: -8px; }
  .ml-1 { margin-left: 4px; }
  .ml-2 { margin-left: 8px; }
  .mr-2 { margin-right: 8px; }

  .rounded { border-radius: 4px; }
  .rounded-md { border-radius: 6px; }
  .rounded-lg { border-radius: 8px; }
  .rounded-xl { border-radius: 12px; }
  .rounded-full { border-radius: 9999px; }
  .rounded-\\[14px\\] { border-radius: 14px; }
  .rounded-\\[16px\\] { border-radius: 16px; }
  .rounded-\\[18px\\] { border-radius: 18px; }
  .rounded-\\[28px\\] { border-radius: 28px; }

  .border { border: 1px solid currentColor; }
  .border-none { border: 0; }
  .border-transparent { border-color: transparent; }
  .border-border-subtle { border-color: var(--border-subtle); }
  .border-l { border-left: 1px solid var(--border-subtle); }
  .border-b { border-bottom: 1px solid var(--border-subtle); }
  .border-t { border-top: 1px solid var(--border-subtle); }
  .border-l-2 { border-left-width: 2px; }
  .border-l-primary { border-left-color: var(--primary); }
  .border-l-transparent { border-left-color: transparent; }

  .bg-card-glass { background: var(--card-glass); }
  .bg-background { background: #fff8f0; }
  .bg-panel-bg { background: var(--panel-bg); }
  .bg-surface-container-low { background: var(--surface-container-low); }
  .bg-border-subtle { background: var(--border-subtle); }
  .bg-primary { background: var(--primary); }
  .bg-primary-container { background: var(--primary-container); }
  .bg-warning { background: var(--warning); }
  .bg-success { background: var(--success); }
  .bg-transparent { background: transparent; }
  .bg-error\\/15 { background: rgba(161, 59, 47, 0.15); }
  .bg-error\\/10 { background: rgba(161, 59, 47, 0.1); }
  .bg-\\[\\#8b4a2b\\] { background: #8b4a2b; }
  .bg-\\[\\#6e3316\\] { background: #6e3316; }
  .bg-\\[rgba\\(255\\,255\\,255\\,0\\.5\\)\\] { background: rgba(255, 255, 255, 0.5); }
  .bg-\\[rgba\\(92\\,67\\,45\\,0\\.2\\)\\] { background: rgba(92, 67, 45, 0.2); }

  .text-ink { color: var(--ink); }
  .text-muted-text { color: var(--muted-text); }
  .text-primary { color: var(--primary); }
  .text-error { color: var(--error); }
  .text-on-primary,
  .text-\\[\\#ffffff\\] { color: #ffffff; }
  .text-on-primary-container { color: #ffc8b1; }
  .text-\\[10px\\] { font-size: 10px; }
  .text-\\[16px\\] { font-size: 16px; }
  .text-\\[18px\\] { font-size: 18px; }
  .text-\\[20px\\] { font-size: 20px; }
  .text-sm { font-size: 14px; line-height: 20px; }
  .font-bold { font-weight: 700; }

  .font-label-caps,
  .text-label-caps {
    font-size: 11px;
    line-height: 16px;
    letter-spacing: 0.06em;
    font-weight: 700;
  }
  .font-headline-panel,
  .text-headline-panel {
    font-size: 18px;
    line-height: 24px;
    letter-spacing: 0;
    font-weight: 600;
  }
  .font-title-card,
  .text-title-card {
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
  }
  .font-body-md,
  .text-body-md {
    font-size: 13px;
    line-height: 18px;
    font-weight: 400;
  }
  .font-caption,
  .text-caption {
    font-size: 11px;
    line-height: 14px;
    font-weight: 400;
  }
  .font-pill-value,
  .text-pill-value {
    font-size: 14px;
    line-height: 16px;
    font-weight: 600;
  }
  .font-timer-display,
  .text-timer-display {
    font-size: 16px;
    line-height: 20px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .relative { position: relative; }
  .sticky { position: sticky; }
  .top-0 { top: 0; }
  .z-10 { z-index: 10; }
  .overflow-hidden { overflow: hidden; }
  .overflow-y-auto { overflow-y: auto; }
  .cursor-grab { cursor: grab; }
  .cursor-pointer { cursor: pointer; }
  .cursor-not-allowed { cursor: not-allowed; }
  .active\\:cursor-grabbing:active { cursor: grabbing; }
  .text-center { text-align: center; }
  .uppercase { text-transform: uppercase; }
  .tracking-wider { letter-spacing: 0.06em; }
  .shadow-sm { box-shadow: 0 1px 2px rgba(41, 35, 29, 0.06); }
  .object-contain { object-fit: contain; }
  .antialiased { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  .resize-none { resize: none; }
  .opacity-0 { opacity: 0; }
  .opacity-70 { opacity: 0.7; }
  .opacity-80 { opacity: 0.8; }
  .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .transition-colors,
  .transition-opacity,
  .transition-all {
    transition: color 150ms ease, background-color 150ms ease, border-color 150ms ease, opacity 150ms ease, box-shadow 150ms ease;
  }
  .duration-200 { transition-duration: 200ms; }
  .duration-500 { transition-duration: 500ms; }
  .ease-out { transition-timing-function: ease-out; }
  .group:hover .group-hover\\:opacity-100 { opacity: 1; }
  .hover\\:underline:hover { text-decoration: underline; }
  .hover\\:text-ink:hover { color: var(--ink); }
  .hover\\:text-error:hover { color: var(--error); }
  .hover\\:bg-border-subtle:hover { background: var(--border-subtle); }
  .hover\\:bg-surface-container-highest:hover { background: #e7e2da; }
  .hover\\:bg-accent-dark:hover { background: var(--accent-dark); }
  .hover\\:bg-\\[\\#6e3316\\]:hover { background: #6e3316; }
  .hover\\:bg-error\\/10:hover { background: rgba(161, 59, 47, 0.1); }
  .hover\\:bg-\\[rgba\\(92\\,67\\,45\\,0\\.08\\)\\]:hover { background: rgba(92, 67, 45, 0.08); }
  .hover\\:bg-\\[rgba\\(92\\,67\\,45\\,0\\.2\\)\\]:hover { background: rgba(92, 67, 45, 0.2); }
  .hover\\:border-outline-variant:hover { border-color: #d9c2b9; }
  .backdrop-blur-md {
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
  }

  .focus\\:ring-0:focus {
    box-shadow: none;
  }

  .cqr-logo,
  .cqr-pill-logo {
    display: block;
  }

  .cqr-logo svg,
  .cqr-pill-logo svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .cqr-header button,
  .cqr-subnav button,
  .cqr-task-actions button {
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .cqr-header {
    border-radius: 0;
  }

  .progress-track {
    background: rgba(92, 67, 45, 0.08);
  }

  .cqr-usage-value {
    color: var(--ink);
  }

  .cqr-usage-fill {
    display: block;
    min-width: 3px;
    background: var(--primary);
  }

  .cqr-usage-neutral .cqr-usage-fill {
    background: var(--primary);
  }

  .cqr-usage-ok .cqr-usage-fill {
    background: var(--success);
  }

  .cqr-usage-ok .cqr-usage-value {
    color: var(--success);
  }

  .cqr-usage-warn .cqr-usage-fill {
    background: var(--warning);
  }

  .cqr-usage-warn .cqr-usage-value {
    color: var(--warning);
  }

  .cqr-usage-danger .cqr-usage-fill {
    background: var(--error);
  }

  .cqr-usage-danger .cqr-usage-value {
    color: var(--error);
  }

  .queue-list::-webkit-scrollbar {
    width: 4px;
  }
  .queue-list::-webkit-scrollbar-track {
    background: transparent;
  }
  .queue-list::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background: rgba(92, 67, 45, 0.2);
  }

  .queue-item,
  .queue-item * {
    cursor: pointer;
  }

  .queue-item:hover {
    background: rgba(92, 67, 45, 0.04);
  }

  .cqr-new-icon {
    display: inline-flex;
    margin-left: 12px;
    color: #2f7d4a;
    background: transparent;
    padding: 0;
    font-size: 10px;
    font-weight: 800;
    line-height: 14px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    vertical-align: middle;
  }

  .cqr-queue-head button {
    min-height: auto;
    border: 0;
    background: transparent;
    box-shadow: none;
    padding: 0;
  }

  .cqr-badge {
    border: 0;
    min-height: 20px;
  }

  .cqr-badge.cqr-state-available {
    border: 1px solid rgba(47, 109, 76, 0.24);
    background: rgba(47, 109, 76, 0.14);
    color: var(--success);
  }

  .cqr-badge.cqr-state-limited,
  .cqr-badge.cqr-state-limited_unknown_reset {
    background: rgba(161, 59, 47, 0.15);
    color: var(--error);
  }

  .cqr-queue-card {
    border-radius: 20px;
  }

  .cqr-list-home {
    flex: 0 1 auto;
    max-height: none;
    overflow-y: auto;
  }

  .cqr-form-view {
    width: 100%;
  }

  .cqr-form-body {
    min-height: 0;
  }

  .cqr-usage-meters {
    min-width: 0;
  }

  .cqr-reset {
    flex: 0 0 112px;
    min-width: 112px;
    box-sizing: border-box;
  }

  .cqr-reset [data-countdown],
  .cqr-reset [data-reset-time] {
    white-space: nowrap;
  }

  .input-focus:focus-within,
  .cqr-input-shell:focus-within {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(110, 51, 22, 0.1);
  }

  .cqr-form-actions button,
  .cqr-actions button.cqr-primary {
    border: 0;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .cqr-checkbox {
    width: 18px;
    height: 18px;
    accent-color: var(--primary-container);
  }

  .cqr-utility-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  input,
  textarea {
    width: 100%;
    border: 0;
    background: transparent;
    color: var(--ink);
    padding: 0;
  }

  textarea {
    height: 100%;
    min-height: 0;
  }

  .placeholder-muted-text::placeholder {
    color: var(--muted-text);
  }

  .material-symbols-outlined {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    --cqr-icon-size: 18px;
    width: var(--cqr-icon-size);
    height: var(--cqr-icon-size);
    overflow: hidden;
    color: currentColor;
    font-size: 0 !important;
    line-height: 1;
    letter-spacing: 0;
    text-transform: none;
    white-space: nowrap;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
  }

  .material-symbols-outlined::before {
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    font-size: var(--cqr-icon-size);
    font-weight: 700;
    line-height: 1;
  }

  .text-\\[16px\\].material-symbols-outlined { --cqr-icon-size: 16px; }
  .text-\\[18px\\].material-symbols-outlined { --cqr-icon-size: 18px; }
  .text-\\[20px\\].material-symbols-outlined { --cqr-icon-size: 20px; }
  .material-symbols-outlined[data-icon="refresh"]::before { content: "↻"; }
  .material-symbols-outlined[data-icon="close_fullscreen"]::before { content: "↙"; }
  .material-symbols-outlined[data-icon="resume"]::before { content: "↳"; }
  .material-symbols-outlined[data-icon="add_comment"]::before { content: "+"; }
  .material-symbols-outlined[data-icon="arrow_back"]::before { content: "←"; }
  .material-symbols-outlined[data-icon="queue"]::before { content: "≡"; }
  .material-symbols-outlined[data-icon="drag_indicator"]::before { content: "⋮"; letter-spacing: 0; }
  .material-symbols-outlined[data-icon="keyboard_arrow_up"]::before { content: "↑"; }
  .material-symbols-outlined[data-icon="delete"]::before { content: "×"; }
  .material-symbols-outlined[data-icon="settings"]::before { content: "⚙"; }
  .material-symbols-outlined[data-icon="check"]::before { content: "✓"; }

  .cqr-pill {
    bottom: max(18px, env(safe-area-inset-bottom));
    width: min(224px, calc(100vw - 28px));
    min-height: 72px;
    border-radius: 18px;
    padding: 12px;
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    touch-action: none;
  }

  .cqr-toast {
    margin: 0;
    border: 1px solid rgba(139, 74, 43, 0.18);
    border-radius: 12px;
    background: rgba(255, 252, 246, 0.9);
    color: var(--accent-dark);
    font-size: 12px;
    line-height: 1.35;
    padding: 9px 10px;
  }

`;
return { showFloatingPanel, refreshFloatingPanel, initFloatingPanel };
})();

// --- content/contentScript.js (entry) ---
const detectClaudeLimitState = __mod_content_claudeDetector.detectClaudeLimitState;
const initFloatingPanel = __mod_content_floatingPanel.initFloatingPanel;
const refreshFloatingPanel = __mod_content_floatingPanel.refreshFloatingPanel;
const showFloatingPanel = __mod_content_floatingPanel.showFloatingPanel;
const sendTaskToClaude = __mod_content_claudeSender.sendTaskToClaude;
const waitForClaudeResponseComplete = __mod_content_claudeSender.waitForClaudeResponseComplete;
let lastSerializedDetection = "";
let debounceTimer;
let detectionInterval;
let initialDetectionTimer;
let extensionContextInvalidated = false;
function isExtensionContextInvalidated(error) {
    return error instanceof Error && /Extension context invalidated/i.test(error.message);
}
function stopContentScriptTimers() {
    extensionContextInvalidated = true;
    observer.disconnect();
    if (debounceTimer !== undefined)
        window.clearTimeout(debounceTimer);
    if (initialDetectionTimer !== undefined)
        window.clearTimeout(initialDetectionTimer);
    if (detectionInterval !== undefined)
        window.clearInterval(detectionInterval);
}
function sendRuntimeMessage(message) {
    if (extensionContextInvalidated)
        return;
    try {
        chrome.runtime.sendMessage(message).catch((error) => {
            if (isExtensionContextInvalidated(error)) {
                stopContentScriptTimers();
            }
        });
    }
    catch (error) {
        if (isExtensionContextInvalidated(error)) {
            stopContentScriptTimers();
            return;
        }
        throw error;
    }
}
function sendDetection() {
    if (extensionContextInvalidated)
        return;
    const detection = detectClaudeLimitState();
    const serialized = JSON.stringify({
        limitStatus: detection.limitStatus,
        resetAt: detection.resetAt,
        resetText: detection.resetText,
        usageText: detection.usageText
    });
    if (serialized === lastSerializedDetection)
        return;
    lastSerializedDetection = serialized;
    sendRuntimeMessage({ type: "CONTENT_STATUS", detection });
}
function scheduleDetection() {
    if (extensionContextInvalidated)
        return;
    if (debounceTimer)
        window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(sendDetection, 350);
}
const observer = new MutationObserver(scheduleDetection);
observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
});
initialDetectionTimer = window.setTimeout(sendDetection, 500);
detectionInterval = window.setInterval(sendDetection, 30000);
initFloatingPanel();
window.addEventListener("pageshow", () => {
    sendDetection();
    void refreshFloatingPanel(true).catch((error) => {
        if (isExtensionContextInvalidated(error))
            stopContentScriptTimers();
    });
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "PING") {
        sendResponse({ ok: true });
        return false;
    }
    if (message.type === "DETECT_NOW") {
        const detection = detectClaudeLimitState();
        sendRuntimeMessage({ type: "CONTENT_STATUS", detection });
        sendResponse({ ok: true, detection });
        return false;
    }
    if (message.type === "SHOW_FLOATING_PANEL") {
        showFloatingPanel();
        sendDetection();
        sendResponse({ ok: true });
        return false;
    }
    if (message.type === "SEND_TASK") {
        sendTaskToClaude(message.content, message.task).then(sendResponse).catch((error) => {
            sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
        });
        return true;
    }
    if (message.type === "WAIT_FOR_CLAUDE_RESPONSE_COMPLETE") {
        waitForClaudeResponseComplete().then(() => sendResponse({ ok: true })).catch((error) => {
            sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
        });
        return true;
    }
    return false;
});
