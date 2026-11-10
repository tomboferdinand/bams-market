import Image from "next/image";
import type { Role } from "@/types/auth";

const DEFAULT_AVATAR_BY_ROLE: Partial<Record<Role, string>> = {
    COMMERCANT: "/images/commercant.jpg",
    LIVREUR: "/images/livreur.jpg",
    ADMINISTRATEUR: "/images/admin.jpg",
    CLIENT: "/images/client.jpg",
};

function getInitials(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

interface AvatarProps {
    name: string;
    avatarUrl?: string | null;
    role?: Role;
    size?: number;
    className?: string;
}

export function Avatar({ name, avatarUrl, role, size = 36, className }: AvatarProps) {
    const src = avatarUrl ?? (role ? DEFAULT_AVATAR_BY_ROLE[role] : undefined);

    if (src) {
        return (
            <div
                className={`relative overflow-hidden rounded-full border border-outline-variant ${className ?? ""}`}
                style={{ width: size, height: size }}
            >
                <Image src={src} alt={name} fill className="object-cover" sizes={`${size}px`} />
            </div>
        );
    }

    return (
        <div
            className={`flex items-center justify-center rounded-full bg-primary-container text-on-primary-container font-semibold ${className ?? ""}`}
            style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
            {getInitials(name)}
        </div>
    );
}