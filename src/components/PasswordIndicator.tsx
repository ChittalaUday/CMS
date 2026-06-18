import { useState, useEffect } from "react";
import { cn } from "@/lib/utils/utils";

export type PasswordStrength =
    | "LOW"
    | "MODERATE"
    | "GOOD"
    | "VERY_GOOD";

interface PasswordStrengthIndicatorProps {
    password: string;
    setValid: (valid: boolean) => void;
}

export default function PasswordIndicator({ password, setValid }: PasswordStrengthIndicatorProps) {
    const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>("LOW");

    useEffect(() => {
        let score = 0;

        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/([^A-Za-z0-9])/.test(password)) score++;

        switch (score) {
            case 0:
            case 1:
            case 2:
                setPasswordStrength("LOW");
                setValid(false);
                break;

            case 3:
                setPasswordStrength("MODERATE");
                setValid(false);
                break;

            case 4:
                setPasswordStrength("GOOD");
                setValid(true);
                break;

            case 5:
                setPasswordStrength("VERY_GOOD");
                setValid(true);
                break;
        }
    }, [password, setValid]);

    const getStrengthColor = (strength: PasswordStrength) => {
        switch (strength) {
            case "LOW":
                return "text-destructive dark:text-red-400";
            case "MODERATE":
                return "text-amber-500 dark:text-amber-400";
            case "GOOD":
                return "text-emerald-500 dark:text-emerald-400";
            case "VERY_GOOD":
                return "text-blue-500 dark:text-blue-400";
        }
    };

    const getStrengthLabel = (strength: PasswordStrength) => {
        switch (strength) {
            case "LOW":
                return "Weak";
            case "MODERATE":
                return "Fair";
            case "GOOD":
                return "Good";
            case "VERY_GOOD":
                return "Strong";
        }
    };

    return (
        <div className={cn(
            "space-y-2 w-full overflow-hidden transition-all duration-300 ease-in-out",
            password.length > 0 ? "opacity-100 max-h-12 mt-2" : "opacity-0 max-h-0 pointer-events-none mt-0"
        )}>
            <div className="flex gap-1.5 w-full">
                {Array.from({ length: 4 }).map((_, index) => {
                    const active = isActive(index, passwordStrength);
                    return (
                        <div
                            key={index}
                            className={cn(
                                "h-1.5 w-full rounded-full transition-all duration-500 ease-out transform origin-left",
                                active ? getBarColor(passwordStrength) : "bg-muted dark:bg-muted/30",
                                active ? "scale-x-100" : "scale-x-95"
                            )}
                        />
                    );
                })}
            </div>
            <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Password strength:</span>
                <span className={cn("font-semibold transition-all duration-300", getStrengthColor(passwordStrength))}>
                    {getStrengthLabel(passwordStrength)}
                </span>
            </div>
        </div>
    );
}

function isActive(index: number, strength: PasswordStrength): boolean {
    switch (strength) {
        case "LOW":
            return index < 1;
        case "MODERATE":
            return index < 2;
        case "GOOD":
            return index < 3;
        case "VERY_GOOD":
            return index < 4;
        default:
            return false;
    }
}

function getBarColor(strength: PasswordStrength): string {
    switch (strength) {
        case "LOW":
            return "bg-destructive";
        case "MODERATE":
            return "bg-amber-500";
        case "GOOD":
            return "bg-emerald-500";
        case "VERY_GOOD":
            return "bg-blue-500";
        default:
            return "bg-muted";
    }
}

