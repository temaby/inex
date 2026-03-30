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
    style
}) => {
    const [input, setInput] = useState<string>(value !== undefined ? value.toString() : "");
    const [evaluated, setEvaluated] = useState<number | null>(value ?? null);

    useEffect(() => {
        // Only update input if value changes from parent and is different from evaluated
        if (typeof value === "number" && value !== evaluated) {
            setInput(value.toString());
            setEvaluated(value);
        }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const strVal = e.target.value;
        setInput(strVal);

        const result = evaluateExpression(strVal);
        setEvaluated(result);
        // Only call onChange if the expression is valid and complete
        if (result !== null && !isNaN(result)) {
            if (onChange) onChange(result);
        }
    };

    const commitResult = () => {
        const result = evaluateExpression(input);
        if (result !== null && !isNaN(result)) {
            const formatted = result.toFixed(precision);
            setInput(formatted);
            setEvaluated(result);
            if (onChange) onChange(result);
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