import * as React from "react";
import { Input, Popover, type InputProps, type InputRef } from "antd";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "../../store/hooks";
import { useGetCommentSuggestionsQuery } from "../../store/transactions/transactions-api";
import { commentToken, replaceCommentToken } from "./comment-autocomplete";

export default function TransactionCommentInput({ value = "", onChange, ...props }: Omit<InputProps, "value"> & { value: string }) {
    const { t } = useTranslation();
    const userId = useAppSelector(state => state.auth.user?.id) ?? 0;
    const input = React.useRef<InputRef>(null);
    const popup = React.useRef<HTMLDivElement>(null);
    const listId = `comment-suggestions-${React.useId().replace(/:/g, "")}`;
    const [selection, setSelection] = React.useState({ start: 0, end: 0 });
    const [focused, setFocused] = React.useState(false);
    const [composing, setComposing] = React.useState(false);
    const [dismissed, setDismissed] = React.useState<string>();
    const [highlighted, setHighlighted] = React.useState(0);
    const token = commentToken(value, selection.start, selection.end);
    const identity = token && userId ? JSON.stringify([userId, value, token.start, token.end, selection.start]) : "";
    const active = Boolean(focused && !composing && identity && dismissed !== identity);
    const [popupHeight, setPopupHeight] = React.useState(320);
    React.useLayoutEffect(() => {
        if (!active) return;
        const measure = () => {
            const top = input.current?.input?.getBoundingClientRect().top ?? 0;
            const viewport = window.visualViewport;
            setPopupHeight(Math.max(44, Math.min(320, top - (viewport?.offsetTop ?? 0) - 24,
                (viewport?.height ?? window.innerHeight) - 96)));
        };
        measure();
        window.addEventListener("resize", measure);
        document.addEventListener("scroll", measure, true);
        window.visualViewport?.addEventListener("resize", measure);
        window.visualViewport?.addEventListener("scroll", measure);
        return () => {
            window.removeEventListener("resize", measure);
            document.removeEventListener("scroll", measure, true);
            window.visualViewport?.removeEventListener("resize", measure);
            window.visualViewport?.removeEventListener("scroll", measure);
        };
    }, [active]);
    const [debounced, setDebounced] = React.useState("");
    React.useEffect(() => {
        setHighlighted(0);
        const timer = window.setTimeout(() => setDebounced(active ? identity : ""), 200);
        return () => window.clearTimeout(timer);
    }, [active, identity]);
    const ready = active && debounced === identity;
    const result = useGetCommentSuggestionsQuery({ userId, type: token?.type ?? "tag", query: token?.query ?? "" }, { skip: !ready });
    const options = ready && !result.isFetching && !result.isError ? (result.currentData?.suggestions ?? [])
        .filter(key => !token || props.maxLength === undefined || replaceCommentToken(value, token, key).value.length <= props.maxLength) : [];
    const selectedIndex = Math.min(highlighted, Math.max(0, options.length - 1));
    React.useEffect(() => {
        const container = popup.current;
        const selected = container?.querySelector<HTMLElement>('[aria-selected="true"]');
        if (!container || !selected) return;
        if (selected.offsetTop < container.scrollTop) container.scrollTop = selected.offsetTop;
        else if (selected.offsetTop + selected.offsetHeight > container.scrollTop + container.clientHeight) {
            container.scrollTop = selected.offsetTop + selected.offsetHeight - container.clientHeight;
        }
    }, [active, selectedIndex, popupHeight, result.currentData]);
    const captureSelection = () => {
        const element = input.current?.input;
        if (element) setSelection({ start: element.selectionStart ?? 0, end: element.selectionEnd ?? 0 });
    };
    const choose = (key: string) => {
        const element = input.current?.input;
        const current = element && commentToken(element.value, element.selectionStart ?? 0, element.selectionEnd ?? 0);
        if (!element || !current || !ready || !options.includes(key) || element.value !== value || JSON.stringify(current) !== JSON.stringify(token)) return;
        const replacement = replaceCommentToken(value, current, key);
        // Dispatch a real input event so every existing controlled onChange consumer
        // receives its normal event and React tracks the programmatic edit.
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(element, replacement.value);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.focus();
        element.setSelectionRange(replacement.caret, replacement.caret);
        setSelection({ start: replacement.caret, end: replacement.caret });
        setDismissed(JSON.stringify([userId, replacement.value, current.start, replacement.caret, replacement.caret]));
    };
    const status = !ready || result.isFetching ? "commentSuggestionsLoading"
        : result.isError ? "commentSuggestionsUnavailable" : "commentSuggestionsEmpty";
    const content = <div ref={popup} className="transaction-comment-suggestions" style={{ maxHeight: popupHeight }}>
        <div id={listId} role="listbox" aria-label={t("transactions.commentSuggestionsLabel")}>
            {options.map((key, index) => <div key={key} id={`${listId}-${index}`} role="option"
                aria-selected={index === selectedIndex} className="transaction-comment-option"
                onPointerDown={event => event.preventDefault()} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setHighlighted(index)}
                onClick={() => choose(key)}>
                <span>{token?.marker}{key}</span>
            </div>)}
        </div>
        {!options.length && <div className="transaction-comment-status" role="status">{t(`transactions.${status}`)}</div>}
    </div>;
    return <Popover open={active} content={content} trigger={[]} placement="topLeft"
        overlayClassName="transaction-comment-popup" autoAdjustOverflow>
        <Input {...props} ref={input} value={value} onChange={event => { onChange?.(event); captureSelection(); setDismissed(undefined); }}
            role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={active}
            aria-controls={active ? listId : undefined} aria-activedescendant={active && options[selectedIndex] ? `${listId}-${selectedIndex}` : undefined}
            onSelect={captureSelection} onClick={captureSelection}
            onFocus={() => { setFocused(true); setDismissed(undefined); captureSelection(); }} onBlur={() => setFocused(false)}
            onCompositionStart={() => setComposing(true)} onCompositionEnd={() => { setComposing(false); captureSelection(); }}
            onKeyDown={event => {
                if (composing || event.nativeEvent.isComposing || !active || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
                if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setDismissed(identity); }
                if (options.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                    event.preventDefault(); event.stopPropagation();
                    setHighlighted((selectedIndex + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
                }
                if (options[selectedIndex] && (event.key === "Enter" || event.key === "Tab")) {
                    event.preventDefault(); event.stopPropagation(); choose(options[selectedIndex]);
                }
            }} />
    </Popover>;
}
