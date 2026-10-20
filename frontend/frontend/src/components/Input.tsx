import type { InputHTMLAttributes } from "react";

import "./Input.css";

interface InputProps
    extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

function Input({
    label,
    error,
    id,
    className = "",
    ...props
}: InputProps) {
    return (
        <div className="input-group">
            <label htmlFor={id}>
                {label}
            </label>

            <input
                id={id}
                className={`input-field ${error ? "input-error" : ""} ${className}`.trim()}
                {...props}
            />

            {error && (
                <span className="input-error-message">
                    {error}
                </span>
            )}
        </div>
    );
}

export default Input;