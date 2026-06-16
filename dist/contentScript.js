function ot(e,t,n){const r=new Date(e);return r.setHours(t,n,0,0),r}function st(e,t){return t?t.toLowerCase()==="am"?e===12?0:e:e===12?12:e+12:e}function xe(e,t){const n=e.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);if(!n)return null;const r=Number(n[1]),i=n[2]?Number(n[2]):0,o=n[3];if(i>59)return null;if(o){if(r<1||r>12)return null}else if(r>23)return null;return ot(t,st(r,o),i)}function lt(e,t){if(e.getTime()<=t.getTime()){const n=new Date(e);return n.setDate(n.getDate()+1),n}return e}function we(e,t=new Date){const n=e.replace(/\s+/g," ").trim(),r=n.toLowerCase(),i=r.match(/\bin\s+(?:(\d+)\s*(?:hours?|hrs?|h))?\s*(?:(\d+)\s*(?:minutes?|mins?|m))?\b/);if(i&&(i[1]||i[2])){const l=i[1]?Number(i[1]):0,u=i[2]?Number(i[2]):0,d=new Date(t);return d.setMinutes(d.getMinutes()+l*60+u),d.setSeconds(0,0),d}const o=r.match(/\btomorrow\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);if(o){const l=new Date(t);return l.setDate(l.getDate()+1),xe(o[1],l)}const s=[/\b(?:resets?|resetting|reset)\s+(?:at|around)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,/\btry\s+again\s+(?:at|around)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,/\bavailable\s+again\s+(?:at|around)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,/\b(?:until|after)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i];for(const l of s){const u=n.match(l);if(!u)continue;const d=xe(u[1],t);if(d)return lt(d,t)}return null}const ct=["limit reached","usage limit","message limit","try again","resets at","reset","5-hour","5 hour","available again","reached your limit"],dt=[/\b\d+\s+(?:messages?|prompts?|requests?)\s+(?:remaining|left)\b/i,/\b(?:remaining|left):?\s*\d+\s+(?:messages?|prompts?|requests?)\b/i,/\b\d+\s*%\s*(?:used|remaining|left)\b/i,/\b(?:used|usage):?\s*\d+\s*(?:\/|of)\s*\d+\b/i,/\b(?:\d+\s*(?:\/|of)\s*\d+)\s+(?:messages?|prompts?|requests?)\b/i,/\busage\s+limit\s+reached\s*[∙•-]?\s*(?:resets?|reset)\s+[^.。\n]{2,80}/i,/\b(?:resets?|reset)\s+(?:at|in)?\s*[^.。\n]{2,80}/i],ut=/\b(resets?|reset)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,pt="claude-queue-resumer-floating-root";function ft(e){return/\b(?:usage|message)\s+limit\s+reached\b/i.test(e)||/\blimit\s+reached\b/i.test(e)||/\breached\s+(?:your|the)\s+(?:usage\s+|message\s+)?limit\b/i.test(e)||/\byou(?:'ve| have)?\s+reached\b[^.。\n]{0,80}\blimit\b/i.test(e)||/\btry\s+again\b/i.test(e)&&/\b(?:reset|available again|hours?|hrs?|minutes?|mins?|later)\b/i.test(e)}function gt(e){var r;const t=e.body;if(!t)return"";const n=t.cloneNode(!0);return(r=n.querySelector(`#${pt}`))==null||r.remove(),n.innerText??n.textContent??""}function ve(e){if(!e)return;const t=e.replace(/\[[^\]]+\]\([^)]*\)/g,"").replace(/https?:\/\/\S+/g,"").replace(/\s+/g," ").trim();if(!t)return;const n=t.match(ut);return t.toLowerCase().includes("usage limit reached")?n?`Usage limit reached · ${n[1]} ${n[2]}`:"Usage limit reached":n?`${n[1]} ${n[2]}`:t.split(/[∙•·|]/)[0].replace(/\b(?:limits?\s+shared|shared\s+with|claude\s+code|learn\s+more|settings)\b.*$/i,"").replace(/\s+/g," ").trim().slice(0,80)}function mt(e){const t=e.toLowerCase(),n=ct.reduce((o,s)=>{const l=t.indexOf(s);return l===-1?o:o===void 0?l:Math.min(o,l)},void 0);if(n===void 0)return;const r=Math.max(0,n-160),i=Math.min(e.length,n+360);return e.slice(r,i).replace(/\s+/g," ").trim()}function bt(e){const t=e.replace(/\s+/g," ").trim(),n=t.match(/\busage\s+limit\s+reached\b[^.。\n]{0,140}/i);if(n)return ve(n[0]);for(const r of dt){const i=t.match(r);if(i)return ve(i[0])}}function Le(e=document,t=new Date){const n=gt(e),r=mt(n),i=bt(n),o=we(r||n,t);return ft(n)?{limitStatus:o?"limited":"limited_unknown_reset",resetAt:o==null?void 0:o.getTime(),resetText:r,usageText:i,matchedText:r,source:"page",checkedAt:Date.now()}:{limitStatus:"available",usageText:i,source:"page",checkedAt:Date.now()}}function ye(e){return Math.max(0,Math.min(100,e))}function ht(e,t){for(const n of t){const r=e[n];if(typeof r=="number"&&Number.isFinite(r))return r}}function xt(e){const t=ht(e,["percent_used","percentage","used_percentage"]);if(t!==void 0)return ye(t);const n=e.utilization;if(!(typeof n!="number"||!Number.isFinite(n)))return ye(n>0&&n<1?n*100:n)}function _e(e){if(!e||typeof e!="object")return;const t=e,n=xt(t);if(n===void 0)return;const r=t.resets_at??t.reset_at??t.resetAt,i=typeof r=="string"?Date.parse(r):typeof r=="number"&&Number.isFinite(r)?r<1e10?r*1e3:r:void 0;return{utilization:n,resetsAt:i&&Number.isFinite(i)?i:void 0}}function wt(e){if(!e||typeof e!="object")return;const t=e,n=typeof t.windows=="object"&&t.windows?t.windows:void 0,r=_e(t.five_hour??t.fiveHour??t.session??(n==null?void 0:n["5h"])),i=_e(t.seven_day??t.sevenDay??t.weekly??(n==null?void 0:n["7d"]));if(!(!r&&!i))return{fiveHour:r,weekly:i,updatedAt:Date.now()}}let ae="en";function Ne(e){ae=e}function vt(){return ae}const yt={"status.pending":{zh:"待发送",en:"Pending"},"status.waiting_limit":{zh:"等待重置",en:"Waiting"},"status.ready":{zh:"就绪",en:"Ready"},"status.sending":{zh:"发送中",en:"Sending"},"status.sent":{zh:"已发送",en:"Sent"},"status.failed":{zh:"失败",en:"Failed"},"status.skipped":{zh:"已跳过",en:"Skipped"},"status.needs_confirm":{zh:"需确认",en:"Confirm"},"status.unknown":{zh:"检测中",en:"Detecting"},"status.available":{zh:"可用",en:"Available"},"status.limited":{zh:"受限",en:"Limited"},"status.limited_unknown_reset":{zh:"受限",en:"Limited"},"time.now":{zh:"现在",en:"now"},"time.hours_minutes":{zh:"{h}小时{m}分",en:"{h}h {m}m"},"time.minutes":{zh:"{m}分",en:"{m}m"},"time.no_reset":{zh:"暂无重置时间",en:"No reset time"},"time.reset_unknown":{zh:"重置时间未知",en:"Reset time unknown"},"time.already_reset":{zh:"已重置",en:"Reset"},"time.reset_days":{zh:"{d}天 {h}小时后重置",en:"Resets in {d}d {h}h"},"time.reset_hours":{zh:"{h}小时 {m}分后重置",en:"Resets in {h}h {m}m"},"time.reset_minutes":{zh:"{m}分后重置",en:"Resets in {m}m"},"time.next_reset":{zh:"距离下次重置",en:"Next reset"},"time.detect_after_open":{zh:"打开 Claude 后检测",en:"Open Claude to detect"},"usage.limit_reached":{zh:"已达到使用限制",en:"Usage limit reached"},"usage.open_to_show":{zh:"打开 Claude 页面后显示用量",en:"Open Claude to show usage"},"usage.currently_available":{zh:"当前可用",en:"Currently available"},"usage.waiting_detect":{zh:"等待检测用量",en:"Detecting usage"},"usage.five_hour":{zh:"5小时使用量",en:"5-hour usage"},"usage.weekly":{zh:"本周使用量",en:"Weekly usage"},"usage.five_hour_label":{zh:"5小时用量",en:"5h usage"},"usage.pct_used":{zh:"{pct}% 已用",en:"{pct}% used"},"usage.reset_at":{zh:"重置 {time}",en:"Resets {time}"},"usage.five_hour_100":{zh:"5小时用量 100%",en:"5-hour usage 100%"},"usage.five_hour_100_reset":{zh:"5小时用量 100% · {time}",en:"5-hour usage 100% · {time}"},"panel.aria_open":{zh:"打开 Claude Waitlist",en:"Open Claude Waitlist"},"panel.aria_label":{zh:"Claude Waitlist",en:"Claude Waitlist"},"panel.claude_assistant":{zh:"Claude 助手",en:"Claude Assistant"},"panel.refresh":{zh:"刷新",en:"Refresh"},"panel.collapse":{zh:"折叠",en:"Collapse"},"panel.claude_status":{zh:"Claude 状态",en:"Claude Status"},"panel.reset_time_label":{zh:"重置时间",en:"Reset time"},"panel.continue_current":{zh:"继续当前对话",en:"Continue conversation"},"panel.new_conversation":{zh:"以新对话继续",en:"New conversation"},"panel.queue_label":{zh:"队列",en:"Queue"},"panel.clear":{zh:"清空",en:"Clear"},"panel.queue_empty":{zh:"队列为空",en:"Queue empty"},"panel.queue_empty_hint":{zh:"选择下方入口添加继续任务或新对话任务。",en:"Use the buttons below to add tasks."},"panel.no_claude_page":{zh:"未找到 Claude 页面",en:"Claude page not found"},"panel.back":{zh:"返回",en:"Back"},"form.continue_title":{zh:"继续当前对话",en:"Continue conversation"},"form.new_title":{zh:"以新对话继续",en:"New conversation"},"form.continue_subtitle":{zh:"当前对话名称已自动填充",en:"Current conversation name auto-filled"},"form.new_subtitle":{zh:"请新建对话名称",en:"Enter a conversation name"},"form.title_placeholder_edit":{zh:"加载对话名称",en:"Loading conversation name"},"form.title_placeholder_new":{zh:"例如：分析 Q3 财报",en:"e.g., Analyze Q3 report"},"form.title_placeholder_continue":{zh:"对话名称",en:"Conversation name"},"form.content_placeholder_edit":{zh:"加载任务内容",en:"Loading task content"},"form.content_placeholder":{zh:"输入您要 Claude 执行的任务...",en:"Enter the task for Claude..."},"form.conversation_name":{zh:"对话名称",en:"Conversation name"},"form.task_content":{zh:"任务内容",en:"Task content"},"form.save":{zh:"保存",en:"Save"},"form.add_to_queue":{zh:"加入队列",en:"Add to queue"},"form.new_claude_conversation":{zh:"新的 Claude 对话",en:"New Claude conversation"},"edit.title":{zh:"编辑",en:"Edit"},"edit.subtitle":{zh:"任务内容修改",en:"Edit task content"},"edit.not_found":{zh:"未找到这条队列任务",en:"Task not found"},"edit.not_found_hint":{zh:"返回首页后可以重新选择队列任务。",en:"Go back to select another task."},"settings.title":{zh:"设置",en:"Settings"},"settings.subtitle":{zh:"数据与发送策略",en:"Data & send strategy"},"settings.desktop_notifications":{zh:"桌面通知",en:"Desktop notifications"},"settings.desktop_notifications_desc":{zh:"重置提醒和队列发送结果",en:"Reset reminders and send results"},"settings.auto_send":{zh:"自动发送新任务",en:"Auto-send new tasks"},"settings.auto_send_desc":{zh:"Claude 可用时自动发送符合条件的任务",en:"Auto-send eligible tasks when Claude is available"},"settings.confirm_before_send":{zh:"发送前确认",en:"Confirm before send"},"settings.confirm_before_send_desc":{zh:"新任务默认进入确认状态",en:"New tasks default to confirmation required"},"settings.batch_after_reset":{zh:"重置后批量续发",en:"Batch send after reset"},"settings.batch_after_reset_desc":{zh:"官方重置后按队列继续自动任务",en:"Continue queue tasks after official reset"},"settings.send_strategy":{zh:"发送策略",en:"Send strategy"},"settings.auto_send_status":{zh:"自动续发 • {status}",en:"Auto-send • {status}"},"settings.confirm_status":{zh:"确认默认 • {status}",en:"Confirm default • {status}"},"settings.queue_limit":{zh:"批量上限 • {n} 条本地队列",en:"Queue limit • {n} local tasks"},"settings.enabled":{zh:"已开启",en:"On"},"settings.disabled_default":{zh:"默认关闭",en:"Off"},"settings.disabled":{zh:"已关闭",en:"Off"},"settings.local_queue":{zh:"本地队列",en:"Local queue"},"settings.import_export":{zh:"导入、导出与清理",en:"Import, export & cleanup"},"settings.storage_note":{zh:"任务只保存在 chrome.storage.local。",en:"Tasks are stored in chrome.storage.local only."},"settings.export_json":{zh:"导出 JSON",en:"Export JSON"},"settings.import_json":{zh:"导入 JSON",en:"Import JSON"},"settings.clear_ended":{zh:"清理已结束",en:"Clear ended"},"settings.test_reset":{zh:"模拟重置发送",en:"Test reset send"},"settings.interface":{zh:"界面",en:"Interface"},"settings.language":{zh:"语言",en:"Language"},"settings.language_zh_detail":{zh:"简体中文",en:"Simplified Chinese"},"settings.language_en_detail":{zh:"English",en:"English"},"settings.current_language":{zh:"当前语言：{language}",en:"Current language: {language}"},"settings.language_action":{zh:"切换语言",en:"Switch language"},"settings.about":{zh:"关于",en:"About"},"settings.github":{zh:"插件 GitHub",en:"Plugin GitHub"},"settings.developer":{zh:"开发者",en:"Developer"},"settings.placeholder":{zh:"待填写",en:"TBD"},"task.edit":{zh:"编辑任务",en:"Edit task"},"task.bump":{zh:"置顶",en:"Move to top"},"task.delete":{zh:"删除",en:"Delete"},"task.new_label":{zh:"新对话",en:"New"},"toast.action_failed":{zh:"操作失败",en:"Action failed"},"toast.sending":{zh:"正在发送到 Claude...",en:"Sending to Claude..."},"toast.submit_no_confirm":{zh:"已触发发送，但无法确认 Claude 是否已清空输入。已停止重试以避免重复发送。",en:"Send triggered, but could not confirm input was cleared. Stopped retrying to avoid duplicates."},"toast.input_not_empty":{zh:"Claude 输入框已有内容，为避免覆盖你的输入，本次未发送。",en:"Claude input already has content. Skipped to avoid overwriting."},"toast.send_failed":{zh:"发送失败。",en:"Send failed."},"toast.sent":{zh:"已发送到 Claude。",en:"Sent to Claude."},"toast.submitted_no_retry":{zh:"已触发发送，已停止重试以避免重复。",en:"Send triggered, stopped retrying to avoid duplicates."},"toast.reset_test_start":{zh:"正在模拟重置，并发送队列下一条...",en:"Simulating reset, sending next in queue..."},"toast.reset_test_failed":{zh:"重置测试失败。",en:"Reset test failed."},"toast.reset_test_started":{zh:"重置测试已开始依次发送队列。",en:"Reset test started sending queue."},"toast.reset_test_no_task":{zh:"重置测试未发送任务。",en:"Reset test did not send any task."},"toast.task_updated":{zh:"任务已更新。",en:"Task updated."},"toast.queue_json_invalid":{zh:"队列 JSON 无效。",en:"Invalid queue JSON."},"toast.queue_imported":{zh:"队列已导入。",en:"Queue imported."},"error.input_not_empty":{zh:"Claude 输入框已有内容，为避免覆盖你的输入，本次未发送。",en:"Claude input already has content. Skipped to avoid overwriting."},"error.no_pending_task":{zh:"没有待发送任务。",en:"No pending task."},"error.needs_confirm":{zh:"需要用户确认。",en:"Needs user confirmation."},"error.no_claude_page":{zh:"未找到打开的 Claude 页面。",en:"Claude page not found."},"error.no_input_box":{zh:"未找到 Claude 输入框。",en:"Claude input box not found."},"error.cannot_open_new":{zh:"无法打开新的 Claude 对话。",en:"Could not open a new Claude conversation."},"error.input_not_cleared":{zh:"发送后 Claude 输入框仍未清空。",en:"Claude input was not cleared after sending."},"error.unsupported_message":{zh:"不支持的消息。",en:"Unsupported message."},"error.waiting_confirm":{zh:"等待用户确认后发送。",en:"Waiting for user confirmation."},"error.sending_requires_confirm":{zh:"发送需要确认。",en:"Sending requires confirmation."},"sender.cannot_open_new":{zh:"无法打开新的 Claude 对话。",en:"Could not open a new Claude conversation."},"sender.no_input":{zh:"未找到 Claude 输入框。",en:"Claude input box not found."},"sender.submit_no_confirm":{zh:"已触发发送，但无法确认 Claude 是否已清空输入。",en:"Send triggered, but could not confirm input was cleared."},"queue.unnamed_task":{zh:"未命名任务",en:"Unnamed task"},"queue.imported_task":{zh:"导入的任务",en:"Imported task"},"sw.no_pending":{zh:"没有待发送任务。",en:"No pending task."},"sw.no_claude_page":{zh:"未找到打开的 Claude 页面。",en:"Claude page not found."},"sw.send_request_failed":{zh:"发送请求失败。",en:"Send request failed."},"sw.submit_stop_retry":{zh:"已触发发送，但无法确认 Claude 是否已清空输入。已停止重试以避免重复发送。",en:"Send triggered, but could not confirm input was cleared. Stopped retrying."},"sw.notify_queue_title":{zh:"Claude Waitlist",en:"Claude Waitlist"},"sw.notify_sent":{zh:"已发送：{title}",en:"Sent: {title}"},"sw.notify_submitted_no_retry":{zh:"已触发发送，未重试：{title}",en:"Triggered, no retry: {title}"},"sw.input_not_empty":{zh:"Claude 输入框已有内容，为避免覆盖你的输入，本次未发送。",en:"Claude input has content. Skipped to avoid overwriting."},"sw.retry_later":{zh:"{error} 将在 1 分钟后重试（{count}/{max}）。",en:"{error} Retrying in 1 min ({count}/{max})."},"sw.send_failed":{zh:"发送失败。",en:"Send failed."},"sw.notify_retry":{zh:"发送失败，将重试：{title}",en:"Send failed, will retry: {title}"},"sw.notify_failed":{zh:"发送失败：{error}",en:"Send failed: {error}"},"sw.unknown_error":{zh:"未知错误",en:"Unknown error"},"sw.limit_detected":{zh:"检测到 Claude 使用限制",en:"Claude usage limit detected"},"sw.limit_wait_with_reset":{zh:"已进入等待状态，将在检测到的重置时间后继续。",en:"Waiting, will resume after detected reset time."},"sw.limit_wait_no_reset":{zh:"已进入等待状态，但未检测到明确重置时间。",en:"Waiting, but no clear reset time detected."},"sw.reset_soon":{zh:"Claude 即将重置",en:"Claude resetting soon"},"sw.reset_5min":{zh:"距离检测到的重置时间约 5 分钟。",en:"About 5 minutes until detected reset time."},"sw.reset_now":{zh:"Claude 重置时间已到",en:"Claude reset time reached"},"sw.reset_sending":{zh:"正在检测 Claude 页面，并准备依次发送队列任务。",en:"Detecting Claude page, preparing to send queue tasks."},"sw.queue_full":{zh:"队列最多保留 {n} 条待处理任务。",en:"Queue can hold at most {n} pending tasks."},"sw.unsupported":{zh:"不支持的消息。",en:"Unsupported message."},"conv.claude_chat":{zh:"Claude 对话 {id}",en:"Claude chat {id}"},"conv.current_claude_chat":{zh:"当前 Claude 对话",en:"Current Claude conversation"},"lang.switch":{zh:"EN",en:"中"},"lang.tooltip":{zh:"Switch to English",en:"切换到中文"}};function a(e,t){const n=yt[e];let r=(n==null?void 0:n[ae])??(n==null?void 0:n.zh)??e;if(t)for(const[i,o]of Object.entries(t))r=r.replace(`{${i}}`,String(o));return r}const _t="claude-queue-resumer-floating-root",kt=6*60*1e3,qt=3500;function C(e){const t=e.getBoundingClientRect(),n=window.getComputedStyle(e);return t.width>0&&t.height>0&&n.visibility!=="hidden"&&n.display!=="none"}function q(e){return new Promise(t=>window.setTimeout(t,e))}function W(e){return e instanceof HTMLTextAreaElement||e instanceof HTMLInputElement?e.value:e.innerText||e.textContent||""}function M(){var t;return((t=[...document.querySelectorAll('div[contenteditable="true"], [role="textbox"], textarea')].filter(n=>!(!C(n)||n instanceof HTMLTextAreaElement&&n.disabled||n.getAttribute("aria-disabled")==="true")).map(n=>{const r=n.getBoundingClientRect(),i=`${n.getAttribute("aria-label")??""} ${n.getAttribute("placeholder")??""} ${n.getAttribute("data-placeholder")??""}`.toLowerCase();let o=r.bottom;return/(reply|prompt|message|ask|send|输入|消息)/.test(i)&&(o+=500),/(search|title|name|filter|rename)/.test(i)&&(o-=800),n instanceof HTMLTextAreaElement&&(o+=160),n.isContentEditable&&(o+=120),(r.height<24||r.width<180)&&(o-=500),{element:n,score:o}}).sort((n,r)=>r.score-n.score)[0])==null?void 0:t.element)??null}function ke(e){const t=W(e);e.dispatchEvent(new InputEvent("beforeinput",{bubbles:!0,inputType:"insertText",data:t})),e.dispatchEvent(new InputEvent("input",{bubbles:!0,inputType:"insertText",data:t})),e.dispatchEvent(new Event("change",{bubbles:!0})),e.dispatchEvent(new KeyboardEvent("keyup",{bubbles:!0,key:"Unidentified"})),e.dispatchEvent(new CompositionEvent("compositionend",{bubbles:!0}))}function zt(e,t){var o;if(e.focus(),e instanceof HTMLTextAreaElement||e instanceof HTMLInputElement){const s=(o=Object.getOwnPropertyDescriptor(e.constructor.prototype,"value"))==null?void 0:o.set;s==null||s.call(e,t),ke(e);return}const n=window.getSelection(),r=document.createRange();r.selectNodeContents(e),n==null||n.removeAllRanges(),n==null||n.addRange(r),document.execCommand("insertText",!1,t)||(e.textContent=t),ke(e)}function R(e){return!e.disabled&&e.getAttribute("aria-disabled")!=="true"}function Ie(e){return`${e.getAttribute("aria-label")??""} ${e.title??""} ${e.innerText??""} ${e.dataset.testid??""}`.toLowerCase()}function X(e){const t=Ie(e);if(/(send|submit|发送|送出)/.test(t))return!0;if(/(attach|upload|image|file|mic|voice|stop|cancel|pause|tools?|model|settings|menu|dictate|browse)/.test(t))return!1;const n=[...e.querySelectorAll("svg")].map(i=>`${i.getAttribute("aria-label")??""} ${i.getAttribute("data-icon")??""} ${i.className}`).join(" ").toLowerCase();if(/(send|arrow-up|paper-plane|send-horizontal)/.test(n))return!0;const r=e.getBoundingClientRect();return!!e.querySelector("svg")&&r.width<=64&&r.height<=64}function Tt(e){const t=Ie(e);if(/(stop|cancel|pause|停止|中止|取消)/.test(t))return!0;const n=[...e.querySelectorAll("svg")].map(r=>`${r.getAttribute("aria-label")??""} ${r.getAttribute("data-icon")??""} ${r.className}`).join(" ").toLowerCase();return/(stop|square|pause|cancel)/.test(n)}function Ct(){return document.querySelector('[aria-busy="true"]')||[...document.querySelectorAll("button")].filter(n=>C(n)&&R(n)).some(Tt)?!0:[...document.querySelectorAll("[aria-label], [title], [data-state]")].filter(C).some(n=>{const r=`${n.getAttribute("aria-label")??""} ${n.getAttribute("title")??""} ${n.getAttribute("data-state")??""}`.toLowerCase();return/(generating|thinking|loading|response in progress|正在生成|思考中|生成中)/.test(r)})}function qe(){var n;const t=(document.querySelector("main")??document.body).cloneNode(!0);return(n=t.querySelector(`#${_t}`))==null||n.remove(),(t.innerText||t.textContent||"").replace(/\s+/g," ").trim()}function Et(){const e=M();return!!(e&&W(e).trim().length===0)}function St(e){const t=[];let n=e;for(let r=0;n&&r<8;r+=1)t.push(n),n=n.parentElement;return t.find(r=>[...r.querySelectorAll("button")].filter(o=>C(o)&&R(o)).some(X))??e.closest("form")??e.parentElement??document.body}function $t(e){const r=[...St(e).querySelectorAll("button")].filter(o=>C(o)&&R(o)).find(X);return r||([...document.querySelectorAll("button")].filter(o=>C(o)&&R(o)).find(X)??null)}async function At(e){const t=Date.now();for(;Date.now()-t<2500;){const n=$t(e);if(n)return n;await q(100)}return null}function ze(e){e.focus();for(const t of[{key:"Enter",code:"Enter",bubbles:!0,cancelable:!0},{key:"Enter",code:"Enter",bubbles:!0,cancelable:!0,metaKey:!0},{key:"Enter",code:"Enter",bubbles:!0,cancelable:!0,ctrlKey:!0}])e.dispatchEvent(new KeyboardEvent("keydown",t)),e.dispatchEvent(new KeyboardEvent("keyup",t))}async function Te(e,t){const n=Date.now();for(;Date.now()-n<3e3;){const r=M()??e;if(W(r).trim().length===0||window.location.href!==t&&/\/chat\//.test(window.location.pathname)||!document.documentElement.contains(e))return!0;await q(150)}return!1}async function Pt(e,t){if(/\/chat\//.test(window.location.pathname))return window.location.href;if((t==null?void 0:t.conversationMode)!=="new")return/\/chat\//.test(new URL(e).pathname)?e:void 0;const n=Date.now();for(;Date.now()-n<8e3;){if(/\/chat\//.test(window.location.pathname))return window.location.href;await q(200)}}function Lt(e){const t=`${e.getAttribute("aria-label")??""} ${e.getAttribute("title")??""} ${e.innerText??""}`.toLowerCase();return!!(/(new chat|new conversation|start chat|新对话|新聊天|开始新)/.test(t)||e instanceof HTMLAnchorElement&&/\/new(?:[/?#]|$)/.test(e.href))}async function Nt(){if(/\/new(?:[/?#]|$)/.test(window.location.pathname))return!0;const t=[...document.querySelectorAll('a[href*="/new"], button, [role="button"], a')].filter(n=>C(n)&&Lt(n))[0];if(t)return t.click(),await q(900),!!M();try{return history.pushState(null,"","/new"),window.dispatchEvent(new PopStateEvent("popstate")),await q(900),!!M()}catch{return!1}}async function It(){await q(1500);const e=Date.now();let t=qe(),n=Date.now();for(;Date.now()-e<kt;){const r=qe();if(r!==t&&(t=r,n=Date.now()),!Ct()&&Et()&&Date.now()-n>=qt)return;await q(900)}}async function Me(e,t){if((t==null?void 0:t.conversationMode)==="new"&&!await Nt())return{ok:!1,error:a("sender.cannot_open_new")};const n=M();if(!n)return{ok:!1,error:a("sender.no_input")};if(W(n).trim().length>0)return{ok:!1,error:"INPUT_NOT_EMPTY"};const r=window.location.href;zt(n,e),await q(350);const i=await At(n);i?(i.focus(),i.dispatchEvent(new MouseEvent("mousedown",{bubbles:!0,cancelable:!0})),i.dispatchEvent(new MouseEvent("mouseup",{bubbles:!0,cancelable:!0})),i.click()):ze(n),await Te(n,r)||ze(n);const o=await Te(n,r),s=await Pt(r,t),l=t==null?void 0:t.conversationTitle;return o?{ok:!0,submitted:!0,conversationUrl:s,conversationTitle:l}:{ok:!1,submitted:!0,conversationUrl:s,conversationTitle:l,error:a("sender.submit_no_confirm")}}const Ce="claude-queue-resumer-floating-root",Mt="claudeQueueResumerState",Z="claudeQueueResumerPanelPosition",Dt=6,De=15e3,Ot=`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" focusable="false" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="#8b4a2b"></rect>
    <path d="M10 8H22M10 24H22M11 8C11 11.5 13.5 13.5 16 16C18.5 13.5 21 11.5 21 8M11 24C11 20.5 13.5 18.5 16 16C18.5 18.5 21 20.5 21 24" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
    <circle cx="16" cy="16" r="1.5" fill="#f4eee6"></circle>
  </svg>
`;function Oe(e){return a(`status.${e}`)}const Ut=new Set(["pending","ready","waiting_limit","sending","needs_confirm"]);let c,p,z=!1,b="home",k,Ee=!1,E,S,$,Y,m,J=!1,A,D,B,H=!1,U=!1;function ie(e){return e instanceof Error&&/Extension context invalidated/i.test(e.message)}function oe(){U=!0,E&&window.clearInterval(E),S&&window.clearInterval(S),$&&window.clearInterval($),E=void 0,S=void 0,$=void 0}function se(e){if(ie(e)){oe();return}throw e}function jt(e){if(ie(e)){oe();return}console.error(e)}function f(e){e.catch(jt)}function Rt(e){return[...e].sort((t,n)=>n.priority!==t.priority?n.priority-t.priority:t.createdAt-n.createdAt)}function le(e){return Rt(e).filter(t=>Ut.has(t.status))}function Ue(e,t,n){const i=Math.max(8,window.innerWidth-t-8),o=Math.max(8,window.innerHeight-n-8);return{left:Math.min(Math.max(8,e.left),i),top:Math.min(Math.max(8,e.top),o)}}function je(){const e=F();return e?`left: ${Math.round(e.left)}px; top: ${Math.round(e.top)}px; right: auto; bottom: auto;`:""}function Re(e=p){return(e==null?void 0:e.querySelector("[data-draggable-panel]"))??void 0}function V(e){return!!(e&&typeof e=="object"&&Number.isFinite(e.left)&&Number.isFinite(e.top))}function F(){return z?A:D}function Be(e){z?A=e:D=e}function He(){const e=Re();if(!e)return F();const t=e.getBoundingClientRect();return{left:t.left,top:t.top}}function _(){B=He()}async function Fe(){if(!U)try{await chrome.storage.local.set({[Z]:{collapsed:A,expanded:D}})}catch(e){se(e)}}async function Bt(){if(U)return;let e;try{e=(await chrome.storage.local.get(Z))[Z]}catch(t){se(t);return}if(V(e)){A=e,D=e;return}V(e==null?void 0:e.collapsed)&&(A=e.collapsed),V(e==null?void 0:e.expanded)&&(D=e.expanded)}function We(e){const t=Re(e);if(!t)return;const n=t.getBoundingClientRect(),r=B??F(),i=r?Ue(r,n.width,n.height):void 0;if(B=void 0,!i)return;const o=F();(!o||i.left!==o.left||i.top!==o.top)&&(Be(i),t.style.left=`${Math.round(i.left)}px`,t.style.top=`${Math.round(i.top)}px`,t.style.right="auto",t.style.bottom="auto",f(Fe()))}function Ke(e){if(!e)return"-";const t=e-Date.now();if(t<=0)return a("time.now");const n=Math.ceil(t/6e4),r=Math.floor(n/60),i=n%60;return r>0?a("time.hours_minutes",{h:r,m:i}):a("time.minutes",{m:i})}function ce(e){return e?new Date(e).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):a("time.no_reset")}function Ht(e){if(!e)return a("time.reset_unknown");const t=e-Date.now();if(t<=0)return a("time.already_reset");const n=Math.ceil(t/6e4),r=Math.floor(n/1440),i=Math.floor(n%1440/60),o=n%60;return r>0?a("time.reset_days",{d:r,h:i}):i>0?a("time.reset_hours",{h:i,m:o}):a("time.reset_minutes",{m:o})}function Ft(e){return e===void 0?"-":`${Math.round(e*10)/10}%`}function Ge(e){return e===void 0?"cqr-usage-neutral":e>=85?"cqr-usage-danger":e>=60?"cqr-usage-warn":"cqr-usage-ok"}function de(e){const t=m==null?void 0:m.fiveHour;return t?t.utilization>=100?t.resetsAt?"limited":"limited_unknown_reset":"available":e.claudePage.limitStatus}function Qe(e){var n;if(!e)return;const t=(n=m==null?void 0:m.fiveHour)==null?void 0:n.resetsAt;if(t&&Number.isFinite(t))return t;if(!(e.claudePage.limitStatus!=="limited"&&e.claudePage.limitStatus!=="limited_unknown_reset"))return e.claudePage.resetAt}function Ye(e){return e.claudePage.limitStatus==="limited"||e.claudePage.limitStatus==="limited_unknown_reset",a("time.next_reset")}function Je(e,t){return t||e.claudePage.limitStatus==="limited"||e.claudePage.limitStatus==="limited_unknown_reset"?ce(t):e.claudePage.isOpen?a("time.no_reset"):a("time.detect_after_open")}function Wt(e){const t=de(e);return t==="limited"||t==="limited_unknown_reset"?a("usage.limit_reached"):e.claudePage.isOpen?a(t==="available"?"usage.currently_available":"usage.waiting_detect"):a("usage.open_to_show")}function Kt(e){const t=e.fiveHour;if(t&&!U)if(t.utilization>=100){const n=t.resetsAt&&t.resetsAt>Date.now()?t.resetsAt:void 0;f(P({type:"CONTENT_STATUS",detection:{limitStatus:n?"limited":"limited_unknown_reset",resetAt:n,resetText:n?a("usage.five_hour_100_reset",{time:ce(n)}):a("usage.five_hour_100"),usageText:"usage snapshot: 5-hour 100%",source:"usage",checkedAt:Date.now()}}))}else f(P({type:"CONTENT_STATUS",detection:{limitStatus:"available",usageText:`usage snapshot: 5-hour ${Math.round(t.utilization)}%`,source:"usage",checkedAt:Date.now()}}))}function Gt(e){const t=m==null?void 0:m.fiveHour,n=m==null?void 0:m.weekly;return`
    <div class="flex flex-col gap-3 flex-1 cqr-usage-meters" title="${g(Wt(e))}">
      ${Se(a("usage.five_hour"),t)}
      ${Se(a("usage.weekly"),n)}
    </div>
  `}function Se(e,t){const n=t?Math.max(0,Math.min(100,t.utilization)):0,r=Ft(t==null?void 0:t.utilization);return`
    <div class="flex flex-col gap-1 cqr-usage-meter ${Ge(t==null?void 0:t.utilization)}">
      <div class="flex justify-between items-end">
        <span class="font-caption text-caption text-muted-text">${e}</span>
        <span class="font-pill-value text-pill-value cqr-usage-value">${r}</span>
      </div>
      <div class="h-1.5 rounded-full progress-track overflow-hidden" aria-hidden="true">
        <div class="h-full cqr-usage-fill rounded-full" style="width: ${n}%;"></div>
      </div>
    </div>
  `}function g(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function Ve(e){const t=e.replace(/\s+/g," ").trim();if(!t)return t;const n=t.split(" ");if(n.length%2===0){const i=n.length/2,o=n.slice(0,i).join(" "),s=n.slice(i).join(" ");if(o&&o===s)return o}const r=t.replace(/\s+/g,"");if(r.length>=4&&r.length%2===0){const i=r.length/2,o=r.slice(0,i),s=r.slice(i);if(o===s)return o}return t}function Xe(){var i,o,s,l,u,d;const e=((o=(i=document.querySelector('a[aria-current="page"], [aria-current="page"]'))==null?void 0:i.innerText)==null?void 0:o.trim())??((l=(s=document.querySelector('[data-testid*="conversation"][aria-selected="true"]'))==null?void 0:s.innerText)==null?void 0:l.trim()),t=(d=(u=document.querySelector("main h1, h1"))==null?void 0:u.innerText)==null?void 0:d.trim(),n=document.title.replace(/\s*[|·-]\s*Claude.*$/i,"").replace(/\s*Claude\s*$/i,"").trim(),r=window.location.pathname.match(/\/chat\/([^/?#]+)/);return Ve(e||t||n||(r?a("conv.claude_chat",{id:r[1].slice(0,8)}):a("conv.current_claude_chat")))}function Ze(){return window.location.href}async function P(e){if(!U)try{return await chrome.runtime.sendMessage(e)}catch(t){if(ie(t)){oe();return}throw t}}async function K(e=!1){if(!e&&pe())return;const t=await P({type:"GET_STATE"});t!=null&&t.ok&&t.state&&x(t.state)}function Qt(){const e=performance.getEntriesByType("resource");for(const t of e){const n=t.name.match(/\/api\/organizations\/([^/?#]+)/);if(n!=null&&n[1])return decodeURIComponent(n[1])}}async function ue(e=!1){if(J||!e&&m&&Date.now()-m.updatedAt<De)return;const t=Qt();if(t){J=!0;try{const n=await fetch(`${window.location.origin}/api/organizations/${encodeURIComponent(t)}/usage`,{method:"GET",credentials:"include"});if(!n.ok)return;const r=wt(await n.json());if(!r)return;m=r,Kt(r),c&&!pe()&&x(c)}catch{}finally{J=!1}}}function et(e="cqr-logo"){return`<span class="${e}" aria-label="Claude Waitlist Logo">${Ot}</span>`}async function v(e){const t=await P(e);return t?t.ok&&t.state?(x(t.state),t):t.ok?(await K(!0),t):(y(O(t.error)??a("toast.action_failed")),t):{ok:!1}}function Yt(e,t){if(e)return le(e.tasks).filter(n=>n.content===t&&["pending","ready","waiting_limit","needs_confirm"].includes(n.status)).sort((n,r)=>r.createdAt-n.createdAt)[0]}async function $e(e,t){t&&await v({type:"UPDATE_TASK",taskId:t.id,patch:{status:"sending",error:void 0}}),y(a("toast.sending"));const n=await Me(e,t);t&&await v({type:"UPDATE_TASK",taskId:t.id,patch:n.ok||n.submitted?{status:"sent",sentAt:Date.now(),conversationUrl:n.conversationUrl??t.conversationUrl,conversationTitle:n.conversationTitle??t.conversationTitle,error:n.ok?void 0:a("toast.submit_no_confirm")}:{status:n.error==="INPUT_NOT_EMPTY"?"needs_confirm":"failed",error:n.error==="INPUT_NOT_EMPTY"?a("toast.input_not_empty"):O(n.error)??a("toast.send_failed")}}),y(n.ok?a("toast.sent"):n.submitted?a("toast.submitted_no_retry"):O(n.error)??a("toast.send_failed"))}async function Jt(){var t,n;y(a("toast.reset_test_start"));const e=await P({type:"SIMULATE_RESET_SEND_TEST"});if(e){if(e.state&&x(e.state),!e.ok){y(O(e.error)??a("toast.reset_test_failed"));return}y((t=e.result)!=null&&t.ok?a("toast.reset_test_started"):O((n=e.result)==null?void 0:n.error)??a("toast.reset_test_no_task"))}}function O(e){return e?{INPUT_NOT_EMPTY:a("error.input_not_empty"),"No pending task.":a("error.no_pending_task"),"Needs user confirmation.":a("error.needs_confirm"),"Claude page is not open.":a("error.no_claude_page"),"Claude input box was not found.":a("error.no_input_box"),"Could not open a new Claude conversation.":a("error.cannot_open_new"),"Send action did not clear the Claude input.":a("error.input_not_cleared"),"Unsupported message.":a("error.unsupported_message"),"Waiting for user confirmation before sending.":a("error.waiting_confirm"),"Sending requires confirmation.":a("error.sending_requires_confirm")}[e]:void 0}function pe(){const e=p==null?void 0:p.activeElement;return e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement}function Vt(){if(!c)return;const e=p==null?void 0:p.querySelector("[data-countdown]"),t=Qe(c);e&&(e.textContent=t?Ke(t):"-");const n=p==null?void 0:p.querySelector("[data-reset-label]");n&&(n.textContent=Ye(c));const r=p==null?void 0:p.querySelector("[data-reset-time]");r&&(r.textContent=Je(c,t)),p==null||p.querySelectorAll("[data-usage-reset]").forEach(i=>{const o=Number(i.dataset.usageReset);i.textContent=Number.isFinite(o)?Ht(o):a("time.reset_unknown")})}function y(e){const t=p==null?void 0:p.querySelector("[data-toast]");t&&(t.textContent=e,t.hidden=!1,window.setTimeout(()=>{t.hidden=!0},3600))}function x(e){c=e,Ne(e.settings.language??"en");const t=p;t&&(t.innerHTML=`<style>${xn}</style>${z?Zt(e):en(e)}`,mn(t),gn(t),We(t))}function tt(){z||(B=A??He(),z=!0,c&&x(c))}function Xt(){if(_(),z=!1,b="home",k=void 0,c){x(c);return}f(K(!0))}async function nt(e=!1){e?await v({type:"DETECT_NOW"}):await K(!0),f(ue(!0))}function Zt(e){const t=de(e),n=m==null?void 0:m.fiveHour,r=n?Math.round(n.utilization*10)/10:0,i=n?Math.max(0,Math.min(100,n.utilization)):0,o=Ge(n==null?void 0:n.utilization),s=n?a("usage.pct_used",{pct:r}):Oe(t)??t,l=n!=null&&n.resetsAt?a("usage.reset_at",{time:ce(n.resetsAt)}):a("time.reset_unknown");return`
    <button class="cqr-pill glass-panel w-panel-width-collapsed min-h-[72px] rounded-[18px] p-inner-padding flex flex-col justify-center cursor-grab active:cursor-grabbing hover:bg-surface-container-highest transition-colors duration-200 cqr-state-${t} ${o}" style="padding-right: 18px; ${je()}" type="button" data-action="expand" data-draggable-panel aria-label="${a("panel.aria_open")}">
      <span class="flex items-center gap-3">
        ${et("cqr-pill-logo w-8 h-8 rounded-lg flex-shrink-0 object-contain")}
        <span class="flex-1 flex flex-col gap-1 w-full">
          <span class="flex justify-between items-center mb-0.5">
            <span class="font-label-caps text-label-caps text-muted-text tracking-wider uppercase">${a("usage.five_hour_label")}</span>
            <span class="font-pill-value text-pill-value cqr-usage-value">${g(s)}</span>
          </span>
          <span class="w-full h-1.5 bg-border-subtle rounded-full overflow-hidden mb-1" aria-hidden="true">
            <span class="h-full cqr-usage-fill rounded-full transition-all duration-500 ease-out" style="width: ${i}%"></span>
          </span>
          <span class="flex justify-start">
            <span class="font-caption text-caption text-muted-text opacity-80">${g(l)}</span>
          </span>
        </span>
      </span>
    </button>
  `}function en(e){const t=le(e.tasks),n=k?e.tasks.find(l=>l.id===k):void 0,r=de(e),i=e.claudePage.isOpen?Oe(r)??r:a("panel.no_claude_page");return`
    <section class="${b==="continue"||b==="new"||b==="edit"||b==="settings"?"cqr-panel cqr-panel-form glass-panel w-panel-width-expanded bg-panel-bg rounded-[28px] border border-border-subtle overflow-hidden relative flex flex-col h-auto":"cqr-panel cqr-panel-home glass-panel w-panel-width-expanded rounded-[28px] p-container-padding flex flex-col gap-stack-gap-lg"}" style="${je()}" data-draggable-panel aria-label="${a("panel.aria_label")}">
      ${b==="home"?tn():""}

      ${b==="home"?nn(e,t,r,i):""}
      ${b==="continue"?on():""}
      ${b==="new"?sn():""}
      ${b==="edit"?ln(n):""}
      ${b==="settings"?cn(e):""}

      <p class="cqr-toast" data-toast hidden></p>
    </section>
  `}function tn(){return`
      <header class="cqr-header flex items-center justify-between px-2 pt-1 pb-2">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm">
            ${et("cqr-logo w-full h-full object-contain rounded-md")}
          </div>
          <div class="flex flex-col">
            <span class="font-label-caps text-label-caps text-muted-text">${a("panel.claude_assistant")}</span>
            <span class="font-headline-panel text-headline-panel text-ink">Claude Waitlist</span>
          </div>
        </div>
        <div class="flex items-center gap-1 cqr-header-actions">
          <button class="p-1.5 text-muted-text hover:text-ink hover:bg-border-subtle rounded-md transition-colors" type="button" data-action="detect" title="${a("panel.refresh")}" aria-label="${a("panel.refresh")}"><span class="material-symbols-outlined text-[20px]" data-icon="refresh">refresh</span></button>
          <button class="p-1.5 text-muted-text hover:text-ink hover:bg-border-subtle rounded-md transition-colors" type="button" data-action="show-settings" title="${a("settings.title")}" aria-label="${a("settings.title")}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg></button>
          <button class="p-1.5 text-muted-text hover:text-ink hover:bg-border-subtle rounded-md transition-colors" type="button" data-action="collapse" title="${a("panel.collapse")}" aria-label="${a("panel.collapse")}"><span class="material-symbols-outlined text-[20px]" data-icon="close_fullscreen">close_fullscreen</span></button>
        </div>
      </header>
  `}function nn(e,t,n,r){const i=Qe(e),o=i?Ke(i):"-";return`
    <main class="cqr-view flex flex-col gap-stack-gap-lg">
      <section class="card-glass rounded-xl p-inner-padding flex flex-col gap-3 cqr-now" style="background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(92, 67, 45, 0.16); border-radius: 20px;">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="font-title-card text-title-card text-ink">${a("panel.claude_status")}</span>
            <span class="px-2 py-0.5 bg-error/15 text-error rounded-full font-label-caps text-[10px] ml-2 cqr-badge cqr-state-${n}">${g(r)}</span>
          </div>
        </div>
        <div class="flex justify-between gap-4">
          ${Gt(e)}
          <div class="flex flex-col justify-center gap-3 border-l border-border-subtle pl-4 cqr-reset">
            <div class="flex flex-col items-end gap-0.5">
              <span class="font-caption text-caption text-muted-text" data-reset-label>${g(Ye(e))}</span>
              <span class="font-timer-display text-timer-display text-ink" data-countdown>${g(o)}</span>
            </div>
            <div class="flex flex-col items-end gap-0.5">
              <span class="font-caption text-caption text-muted-text">${a("panel.reset_time_label")}</span>
              <span class="font-body-md text-body-md text-ink" data-reset-time>${g(Je(e,i))}</span>
            </div>
          </div>
        </div>
      </section>

      ${rn(t)}

      <section class="flex gap-3 pt-2 cqr-actions">
        <button class="flex-1 bg-primary text-on-primary font-title-card text-title-card py-2.5 rounded-[14px] hover:bg-accent-dark transition-colors shadow-sm flex justify-center items-center cqr-primary" style="border-radius: 18px;" type="button" data-action="show-continue">${a("panel.continue_current")}</button>
        <button class="flex-1 bg-border-subtle text-ink font-title-card text-title-card py-2.5 rounded-[14px] hover:bg-[rgba(92,67,45,0.2)] transition-colors border border-transparent hover:border-outline-variant flex justify-center items-center" style="border-radius: 18px;" type="button" data-action="show-new">${a("panel.new_conversation")}</button>
      </section>
    </main>
  `}function rn(e){return`
    <section class="flex flex-col cqr-queue-home ${e.length?"cqr-queue-home-has-items":"cqr-queue-home-empty"}">
      <div class="flex justify-between items-center px-1 mb-2 cqr-queue-head">
        <span class="font-label-caps text-label-caps text-muted-text cqr-kicker">${a("panel.queue_label")} (${e.length})</span>
        <button class="text-caption text-primary" type="button" data-action="clear-active">${a("panel.clear")}</button>
      </div>
      ${an(e)}
    </section>
  `}function an(e){return e.length?`
    <div class="queue-list overflow-y-auto flex flex-col gap-1 pr-1 cqr-list cqr-list-home">
      ${e.map(t=>dn(t)).join("")}
    </div>
  `:`
      <div class="card-glass rounded-lg p-2.5 flex flex-col gap-1 border-l-2 border-l-transparent cqr-queue-card" style="border-radius: 20px;">
        <span class="font-title-card text-title-card text-ink">${a("panel.queue_empty")}</span>
        <span class="font-caption text-caption text-muted-text">${a("panel.queue_empty_hint")}</span>
      </div>
    `}function fe(e){const t=e.mode==="new",n=(c?le(c.tasks).length:0)>=Dt,r=!!e.taskId,i=e.readonlyTitle??(!t&&!r),o=e.title??a(t?"form.new_title":"form.continue_title"),s=e.subtitle??a(t?"form.new_subtitle":"form.continue_subtitle"),l=a(r?"form.title_placeholder_edit":t?"form.title_placeholder_new":"form.title_placeholder_continue"),u=a(r?"form.content_placeholder_edit":"form.content_placeholder"),d=r?160:120;return`
    <form class="cqr-form-view cqr-form ${r?"cqr-edit-form":"cqr-task-form"} flex flex-col h-auto" data-task-form data-conversation-mode="${e.mode}" data-conversation-url="${g(e.conversationUrl??"")}" ${e.taskId?`data-task-id="${g(e.taskId)}"`:""}>
      <div class="flex items-center justify-between px-inner-padding h-12 w-full bg-card-glass backdrop-blur-md border-b border-border-subtle shadow-sm z-10 sticky top-0 shrink-0 cqr-subnav">
        <button class="flex items-center justify-center w-8 h-8 rounded-full text-muted-text hover:bg-border-subtle hover:text-ink transition-colors cursor-pointer group" type="button" data-action="show-home" aria-label="${a("panel.back")}">
          <span class="material-symbols-outlined text-[20px]" data-icon="arrow_back">arrow_back</span>
        </button>
        <div class="flex-1 text-center">
          <h1 class="font-headline-panel text-headline-panel font-bold text-ink">${g(o)}</h1>
        </div>
        <div class="w-8" aria-hidden="true"></div>
      </div>
      <div class="flex-1 overflow-y-auto p-container-padding flex flex-col gap-stack-lg cqr-form-body">
        <p class="font-body-md text-body-md text-muted-text text-center -mt-2 mb-2 cqr-form-helper">${g(s)}</p>
        <div class="flex flex-col gap-stack-sm cqr-field-label">
          <label class="font-label-caps text-label-caps text-muted-text uppercase">${a("form.conversation_name")}</label>
          <div class="bg-[rgba(255,255,255,0.5)] border border-border-subtle rounded-lg px-3 py-2 flex items-center cqr-input-shell" style="border-radius: 20px;">
            <input class="w-full bg-transparent border-none p-0 text-ink font-body-md text-body-md focus:ring-0 ${i?"opacity-70 cursor-not-allowed":""}" name="conversationTitle" type="text" maxlength="160" value="${g(e.conversationTitle)}" ${i?"readonly":""} placeholder="${g(l)}" />
          </div>
        </div>
        <div class="flex flex-col gap-stack-sm cqr-field-label">
          <label class="font-label-caps text-label-caps text-muted-text uppercase">${a("form.task_content")}</label>
          <div class="bg-[rgba(255,255,255,0.5)] border border-border-subtle rounded-lg p-3 flex-1 flex flex-col input-focus transition-all duration-200 min-h-[120px] cqr-textarea-shell" style="border-radius: 20px; height: ${d}px; min-height: ${d}px; flex: 0 0 auto;">
            <textarea class="w-full h-full resize-none bg-transparent border-none p-0 text-ink font-body-md text-body-md focus:ring-0 placeholder-muted-text" name="content" rows="5" placeholder="${g(u)}" required>${g(e.content??"")}</textarea>
          </div>
        </div>
        <input name="priority" type="hidden" value="${e.priority??0}" />
      </div>
      <div class="p-container-padding border-t border-border-subtle bg-surface-container-low shrink-0 flex gap-stack-md cqr-form-actions">
        <button class="flex-1 bg-[#8b4a2b] text-[#ffffff] font-title-card text-title-card py-2.5 px-4 rounded-[16px] hover:bg-[#6e3316] transition-colors flex items-center justify-center gap-2 shadow-sm cqr-primary" style="border-radius: 18px;" type="submit" name="submitAction" value="${r?"save":"queue"}" ${!r&&n?"disabled":""}>
          ${g(e.primaryLabel??a(r?"form.save":"form.add_to_queue"))}
        </button>
      </div>
      </form>
  `}function on(){return fe({mode:"current",conversationTitle:Xe(),conversationUrl:Ze()})}function sn(){return fe({mode:"new",conversationTitle:""})}function ln(e){return e?fe({mode:e.conversationMode==="new"?"new":"current",conversationTitle:e.conversationTitle??e.title,conversationUrl:e.conversationUrl,content:e.content,priority:e.priority,taskId:e.id,title:a("edit.title"),subtitle:a("edit.subtitle"),primaryLabel:a("form.save"),readonlyTitle:!1}):`
      <main class="cqr-form-view cqr-form flex flex-col h-auto">
        <div class="flex items-center justify-between px-inner-padding h-12 w-full bg-card-glass backdrop-blur-md border-b border-border-subtle shadow-sm z-10 sticky top-0 shrink-0 cqr-subnav">
          <button class="flex items-center justify-center w-8 h-8 rounded-full text-muted-text hover:bg-border-subtle hover:text-ink transition-colors cursor-pointer group" type="button" data-action="show-home" aria-label="${a("panel.back")}">
            <span class="material-symbols-outlined text-[20px]" data-icon="arrow_back">arrow_back</span>
          </button>
          <div class="flex-1 text-center">
            <h1 class="font-headline-panel text-headline-panel font-bold text-ink">${a("edit.title")}</h1>
          </div>
          <div class="w-8" aria-hidden="true"></div>
        </div>
        <div class="flex-1 overflow-y-auto p-container-padding flex flex-col gap-stack-lg">
          <div class="card-glass rounded-xl p-inner-padding flex flex-col gap-1" style="background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(92, 67, 45, 0.16); border-radius: 20px;">
            <span class="font-title-card text-title-card text-ink">${a("edit.not_found")}</span>
            <span class="font-caption text-caption text-muted-text">${a("edit.not_found_hint")}</span>
          </div>
        </div>
      </main>
    `}function Ae(e,t,n){return`<button class="flex-1 py-1.5 text-center font-title-card text-title-card transition-colors cursor-pointer ${n?"bg-primary text-on-primary shadow-sm":"text-muted-text hover:text-ink"}" style="border-radius: 12px; border: none; outline: none;" type="button" role="radio" aria-checked="${n}" data-action="set-lang" data-locale="${e}">${g(t)}</button>`}function cn(e){const t=e.settings.language==="en"?"en":"zh";return`
    <main class="cqr-form-view cqr-form flex flex-col h-auto">
      <div class="flex items-center justify-between px-inner-padding h-12 w-full bg-card-glass backdrop-blur-md border-b border-border-subtle shadow-sm z-10 sticky top-0 shrink-0 cqr-subnav">
        <button class="flex items-center justify-center w-8 h-8 rounded-full text-muted-text hover:bg-border-subtle hover:text-ink transition-colors cursor-pointer group" type="button" data-action="show-home" aria-label="${a("panel.back")}">
          <span class="material-symbols-outlined text-[20px]" data-icon="arrow_back">arrow_back</span>
        </button>
        <div class="flex-1 text-center">
          <h1 class="font-headline-panel text-headline-panel font-bold text-ink">${a("settings.title")}</h1>
        </div>
        <div class="w-8" aria-hidden="true"></div>
      </div>
      <div class="flex-1 overflow-y-auto p-container-padding flex flex-col gap-stack-lg cqr-form-body">
        <section class="card-glass rounded-xl p-inner-padding flex flex-col gap-3" style="background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(92, 67, 45, 0.16); border-radius: 20px;">
          <div class="flex items-center justify-between">
            <span class="font-title-card text-title-card text-ink">${a("settings.language")}</span>
          </div>
          <div class="flex gap-1 p-1 bg-[rgba(255,255,255,0.45)]" style="border-radius: 14px;" role="radiogroup" aria-label="${a("settings.language")}">
            ${Ae("zh","中文",t==="zh")}
            ${Ae("en","English",t==="en")}
          </div>
        </section>
        <section class="card-glass rounded-xl p-inner-padding flex flex-col gap-3" style="background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(92, 67, 45, 0.16); border-radius: 20px;">
          <div class="flex flex-col gap-1">
            <span class="font-label-caps text-label-caps text-muted-text uppercase">${a("settings.about")}</span>
            <span class="font-title-card text-title-card text-ink">Claude Waitlist</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="font-caption text-caption text-muted-text">${a("settings.github")}: ${a("settings.placeholder")}</span>
            <span class="font-caption text-caption text-muted-text">${a("settings.developer")}: ${a("settings.placeholder")}</span>
          </div>
        </section>
      </div>
    </main>
  `}function dn(e){const t=Ve(e.conversationTitle??e.title),n=e.conversationMode==="new";return`
    <div class="queue-item card-glass rounded-lg p-2.5 flex items-center justify-between group transition-colors cqr-task cqr-queue-card" style="border-radius: 20px; position: relative; cursor: pointer;" data-action="edit-task" data-task-id="${g(e.id)}" role="button" tabindex="0" title="${a("task.edit")}">
      <div class="flex items-center gap-2.5 overflow-hidden cqr-task-main">
        <div class="flex flex-col cqr-task-copy">
          <span class="font-title-card text-title-card text-ink cqr-task-title"><span class="cqr-task-title-text">${g(t)}</span>${n?un():""}</span>
        </div>
      </div>
      <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity cqr-task-actions">
        <button class="p-1 text-muted-text rounded" type="button" data-action="bump" data-task-id="${g(e.id)}" title="${a("task.bump")}" aria-label="${a("task.bump")}"><span class="material-symbols-outlined text-[16px]" data-icon="keyboard_arrow_up">keyboard_arrow_up</span></button>
        <button class="p-1 text-muted-text rounded" type="button" data-action="delete" data-task-id="${g(e.id)}" title="${a("task.delete")}" aria-label="${a("task.delete")}"><span class="material-symbols-outlined text-[16px]" data-icon="delete">delete</span></button>
      </div>
    </div>
  `}function un(){return`<span class="cqr-new-icon" style="display: inline-flex; margin-left: 12px; color: #2f7d4a; background: transparent; padding: 0; font-size: 10px; font-weight: 800; line-height: 14px; letter-spacing: 0.04em; vertical-align: middle;" title="${a("task.new_label")}" aria-label="${a("task.new_label")}">NEW</span>`}function pn(){const e=(c==null?void 0:c.tasks)??[],t=new Blob([JSON.stringify({tasks:e},null,2)],{type:"application/json"}),n=URL.createObjectURL(t),r=document.createElement("a");r.href=n,r.download=`claude-queue-${new Date().toISOString().slice(0,10)}.json`,r.click(),URL.revokeObjectURL(n)}function fn(e,t){const n=e instanceof Element?e:void 0,r=n==null?void 0:n.closest("button");return r&&r===t&&t.classList.contains("cqr-pill")?!1:!!(n!=null&&n.closest("button, input, textarea, label, select, [data-task-form], .cqr-list, .cqr-task-actions"))}function gn(e){const t=e.querySelector("[data-draggable-panel]");if(!t)return;let n,r=0,i=0,o=0,s=0,l=!1;t.addEventListener("pointerdown",d=>{if(d.button!==0||fn(d.target,t))return;const w=t.getBoundingClientRect();n=d.pointerId,r=d.clientX,i=d.clientY,o=w.left,s=w.top,l=!1,t.setPointerCapture(d.pointerId),t.classList.add("cqr-dragging")}),t.addEventListener("pointermove",d=>{if(n!==d.pointerId)return;const w=d.clientX-r,T=d.clientY-i;if(Math.abs(w)+Math.abs(T)>4&&(l=!0),!l)return;const L=t.getBoundingClientRect(),N=Ue({left:o+w,top:s+T},L.width,L.height);Be(N),t.style.left=`${Math.round(N.left)}px`,t.style.top=`${Math.round(N.top)}px`,t.style.right="auto",t.style.bottom="auto",H=!0,d.preventDefault()});const u=d=>{n===d.pointerId&&(n=void 0,t.classList.remove("cqr-dragging"),t.hasPointerCapture(d.pointerId)&&t.releasePointerCapture(d.pointerId),l&&(f(Fe()),window.setTimeout(()=>{H=!1},0)))};t.addEventListener("pointerup",u),t.addEventListener("pointercancel",u)}function mn(e){var n;e.querySelectorAll("[data-action]").forEach(r=>{r.addEventListener("click",i=>{var u;if(H){H=!1,i.preventDefault(),i.stopPropagation();return}i.stopPropagation();const o=i.currentTarget,s=o.dataset.action,l=o.dataset.taskId;if(s==="expand")_(),z=!1,c&&x(c);else if(s==="collapse")tt();else if(s==="show-home")_(),b="home",k=void 0,c&&x(c);else if(s==="show-continue")_(),b="continue",k=void 0,c&&x(c);else if(s==="show-new")_(),b="new",k=void 0,c&&x(c);else if(s==="show-settings")_(),b="settings",k=void 0,c&&x(c);else if(s==="edit-task"&&l)_(),k=l,b="edit",c&&x(c);else if(s==="set-lang"){const d=o.dataset.locale;if(d!=="zh"&&d!=="en")return;const w=d;if(w===vt())return;Ne(w),f(P({type:"UPDATE_SETTINGS",patch:{language:w}})),_(),c&&(c={...c,settings:{...c.settings,language:w}},x(c))}else s==="detect"?(f(ue(!0)),f(v({type:"DETECT_NOW"}))):s==="send"?f(v({type:"SEND_NEXT_NOW"})):s==="test-reset"?f(Jt()):s==="bump"&&l?f(v({type:"BUMP_TASK",taskId:l})):s==="skip"&&l?f(v({type:"SKIP_TASK",taskId:l})):s==="delete"&&l?f(v({type:"DELETE_TASK",taskId:l})):s==="export-queue"?pn():s==="import-queue"?(u=e.querySelector("[data-import-queue-input]"))==null||u.click():s==="clear-active"?f(v({type:"CLEAR_ACTIVE"})):s==="clear-ended"&&f(v({type:"CLEAR_SENT"}))})});const t=e.querySelector("[data-task-form]");t==null||t.addEventListener("submit",r=>{r.preventDefault();const i=new FormData(t),o=String(i.get("content")??"").trim();if(!o)return;const s=r.submitter,l=(s==null?void 0:s.value)==="sendNow",u=t.dataset.conversationMode==="new"?"new":"current",d=String(i.get("conversationTitle")??"").trim()||(u==="new"?a("form.new_claude_conversation"):Xe()),w=u==="current"?t.dataset.conversationUrl||Ze():void 0,T=t.dataset.taskId;_(),b="home",k=void 0,f((async()=>{var ge;if(T){const h=c==null?void 0:c.tasks.find(Q=>Q.id===T),me=(h==null?void 0:h.status)==="needs_confirm"?"ready":h==null?void 0:h.status,be={title:d,content:o,conversationMode:u,conversationTitle:d,conversationUrl:w,priority:Number(i.get("priority"))||0,requireConfirm:l?!1:(h==null?void 0:h.requireConfirm)??!1,autoSend:l||((h==null?void 0:h.autoSend)??(c==null?void 0:c.settings.autoSendNext)??!1),error:void 0,...me?{status:me}:{}},he=await v({type:"UPDATE_TASK",taskId:T,patch:be});if(!he.ok)return;if((s==null?void 0:s.value)!=="saveAndSend"){y(a("toast.task_updated"));return}const it=((ge=he.state)==null?void 0:ge.tasks.find(Q=>Q.id===T))??(h?{...h,...be}:void 0);await $e(o,it);return}const L=await v({type:"ADD_TASK",title:d,content:o,conversationMode:u,conversationTitle:d,conversationUrl:w,priority:Number(i.get("priority"))||0,requireConfirm:!1,autoSend:!0});if(!L.ok||!l)return;const N=Yt(L.state??c,o);await $e(o,N)})())}),(n=e.querySelector("[data-import-queue-input]"))==null||n.addEventListener("change",r=>{var s;const i=r.currentTarget,o=(s=i.files)==null?void 0:s[0];o&&f((async()=>{try{const l=JSON.parse(await o.text()),u=Array.isArray(l)?l:l.tasks;if(!Array.isArray(u)){y(a("toast.queue_json_invalid"));return}await v({type:"IMPORT_QUEUE",tasks:u}),y(a("toast.queue_imported"))}catch{y(a("toast.queue_json_invalid"))}finally{i.value=""}})())})}function bn(e){const t=["beforeinput","input","change","keydown","keyup","keypress","compositionstart","compositionupdate","compositionend","paste","cut","copy","pointerdown","pointerup","mousedown","mouseup","click","dblclick","wheel","focusin","focusout"];for(const n of t)e.addEventListener(n,r=>r.stopPropagation())}function hn(){if(Ee||document.getElementById(Ce))return;Ee=!0;const e=document.createElement("div");e.id=Ce,e.setAttribute("data-claude-queue-resumer","true"),Object.assign(e.style,{position:"fixed",inset:"0",width:"0",height:"0",zIndex:"2147483647",pointerEvents:"none"}),(document.body??document.documentElement).append(e),Y=e,p=e.attachShadow({mode:"open"}),bn(p),document.addEventListener("pointerdown",t=>{if(z||!Y)return;t.composedPath().includes(Y)||tt()},!0),f(Bt().then(()=>nt(!0)));try{chrome.storage.onChanged.addListener((t,n)=>{var i;if(n!=="local")return;const r=(i=t[Mt])==null?void 0:i.newValue;r&&!pe()&&x(r)})}catch(t){se(t)}E=window.setInterval(()=>f(K(!1)),15e3),S=window.setInterval(Vt,3e4),$=window.setInterval(()=>f(ue(!1)),De),window.addEventListener("resize",()=>{p&&We(p)}),window.addEventListener("pagehide",()=>{E&&window.clearInterval(E),S&&window.clearInterval(S),$&&window.clearInterval($)})}const xn=`
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

`;let Pe="",I,ee,te,G=!1;function ne(e){return e instanceof Error&&/Extension context invalidated/i.test(e.message)}function re(){G=!0,at.disconnect(),I!==void 0&&window.clearTimeout(I),te!==void 0&&window.clearTimeout(te),ee!==void 0&&window.clearInterval(ee)}function rt(e){if(!G)try{chrome.runtime.sendMessage(e).catch(t=>{ne(t)&&re()})}catch(t){if(ne(t)){re();return}throw t}}function j(){if(G)return;const e=Le(),t=JSON.stringify({limitStatus:e.limitStatus,resetAt:e.resetAt,resetText:e.resetText,usageText:e.usageText});t!==Pe&&(Pe=t,rt({type:"CONTENT_STATUS",detection:e}))}function wn(){G||(I&&window.clearTimeout(I),I=window.setTimeout(j,350))}const at=new MutationObserver(wn);at.observe(document.documentElement,{childList:!0,subtree:!0,characterData:!0});te=window.setTimeout(j,500);ee=window.setInterval(j,3e4);hn();window.addEventListener("pageshow",()=>{j(),nt(!0).catch(e=>{ne(e)&&re()})});chrome.runtime.onMessage.addListener((e,t,n)=>{if(e.type==="PING")return n({ok:!0}),!1;if(e.type==="DETECT_NOW"){const r=Le();return rt({type:"CONTENT_STATUS",detection:r}),n({ok:!0,detection:r}),!1}return e.type==="SHOW_FLOATING_PANEL"?(Xt(),j(),n({ok:!0}),!1):e.type==="SEND_TASK"?(Me(e.content,e.task).then(n).catch(r=>{n({ok:!1,error:r instanceof Error?r.message:String(r)})}),!0):e.type==="WAIT_FOR_CLAUDE_RESPONSE_COMPLETE"?(It().then(()=>n({ok:!0})).catch(r=>{n({ok:!1,error:r instanceof Error?r.message:String(r)})}),!0):!1});
//# sourceMappingURL=contentScript.js.map
