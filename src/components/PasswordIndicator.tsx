import { useState, useEffect } from "react";
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
    }, [password]);


    return (
        <>
            {password.length > 0 &&
                <>
                    <div className="flex gap-1 w-full">
                        {
                            Array.from({ length: 4 }).map((_, index) => {
                                return (
                                    <div key={index} className={`w-full h-2 rounded-full ${getBackgroundColor(index, passwordStrength)}`} ></div>
                                )
                            })
                        }

                    </div>
                    <div>{passwordStrength}</div>
                </>
            }
        </>

    )
}

function getBackgroundColor(index: number, strength: PasswordStrength): string {

    switch (strength) {
        case "LOW":
            return index < 1 ? "bg-red-500" : "bg-gray-500";
        case "MODERATE":
            return index < 2 ? "bg-yellow-500" : "bg-gray-500";
        case "GOOD":
            return index < 3 ? "bg-green-500" : "bg-gray-500";
        case "VERY_GOOD":
            return index < 4 ? "bg-blue-500" : "bg-gray-500";
        default:
            return "bg-gray-500";
    }
}
