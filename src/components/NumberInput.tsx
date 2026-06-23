import { forwardRef, type InputHTMLAttributes } from "react";
import { useI18n } from "../context/I18nContext";
import { formatWholeNumberInput, parseWholeNumberInput } from "../lib/format";

type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "inputMode" | "value" | "onChange"
> & {
  value: unknown;
  onValueChange: (value: string) => void;
};

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput({ value, onValueChange, ...props }, ref) {
    const { language } = useI18n();

    return (
      <input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatWholeNumberInput(value, language)}
        onChange={(event) =>
          onValueChange(parseWholeNumberInput(event.target.value))
        }
      />
    );
  },
);
