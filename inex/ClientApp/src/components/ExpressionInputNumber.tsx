import React, { useState, useEffect } from "react";
import { Input } from "antd";
import { Parser } from "expr-eval";

interface ExpressionInputNumberProps {
    value?: number;
    onChange?: (value: number | null) => void;
    addonAfter?: React.ReactNode;
    precision?: number;
    placeholder?: string;
    size?: "large" | "middle" | "small";
    style?: React.CSSProperties;
    creation?: boolean;
    locale?: string;
    id?: string;
}

const parser = new Parser();

const evaluateExpression = (input: string): number | null => {
    let expr = input.trim().replace(/^=/, "");
    expr = expr.replace(/,/g, '.');
    try {
        const result = parser.evaluate(expr);
        if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
            return result;
        }
        return null;
    } catch {
        return null;
    }
};

const ExpressionInputNumber: React.FC<ExpressionInputNumberProps> = ({
    value,
    onChange,
    addonAfter,
    precision = 2,
    placeholder,
    size,
    style,
    creation = false,
    locale = "en",
    id,
}) => {
    const format = (number: number) => new Intl.NumberFormat(locale, {
        useGrouping: false, minimumFractionDigits: precision, maximumFractionDigits: precision,
    }).format(number);
    const [input, setInput] = useState<string>(creation && !value ? "" : value !== undefined ? value.toString() : "");
    const [evaluated, setEvaluated] = useState<number | null>(value ?? null);

    useEffect(() => {
        // Only update input if value changes from parent and is different from evaluated
        if (typeof value === "number" && value !== evaluated) {
            setInput(creation && value === 0 ? "" : value.toString());
            setEvaluated(value);
        }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const strVal = e.target.value;
        setInput(strVal);

        const result = evaluateExpression(strVal);
        // Creation publishes zero through its parent for incomplete input. Track
        // that emitted value so the parent echo does not erase an expression
        // while the user is still typing its next operand.
        setEvaluated(creation ? (result === null ? 0 : Number(result.toFixed(precision))) : result);
        // Only call onChange if the expression is valid and complete
        if (result !== null && !isNaN(result)) {
            if (onChange) onChange(creation ? Number(result.toFixed(precision)) : result);
        } else if (creation) {
            onChange?.(null);
        }
    };

    const commitResult = () => {
        const result = evaluateExpression(input);
        if (result !== null && !isNaN(result)) {
            const rounded = Number(result.toFixed(precision));
            const formatted = creation ? format(rounded) : result.toFixed(precision);
            setInput(formatted);
            setEvaluated(creation ? rounded : result);
            if (onChange) onChange(creation ? rounded : result);
        }
    };

    const handleBlur = () => {
        commitResult();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            commitResult();
        }
    };

    return (
        <Input
            id={id}
            inputMode={creation ? "decimal" : undefined}
            value={input}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            size={size}
            style={style}
            addonAfter={addonAfter}
        />
    );
};

export default ExpressionInputNumber;
