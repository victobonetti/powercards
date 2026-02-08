export type ColorPaletteName =
    | "tangerine"
    | "blue"
    | "green"
    | "red"
    | "purple"
    | "pink"
    | "yellow"
    | "teal"
    | "cyan"
    | "indigo"
    | "violet"
    | "lime";

export interface PaletteColors {
    name: string;
    value: ColorPaletteName;
    light: {
        primary: string;
        ring: string;
    };
    dark: {
        primary: string;
        ring: string;
    };
}

export const palettes: PaletteColors[] = [
    {
        name: "Pastel Orange",
        value: "tangerine",
        light: { primary: "25 90% 65%", ring: "25 90% 65%" },
        dark: { primary: "25 80% 65%", ring: "25 80% 65%" },
    },
    {
        name: "Pastel Blue",
        value: "blue",
        light: { primary: "215 85% 70%", ring: "215 85% 70%" },
        dark: { primary: "215 75% 70%", ring: "215 75% 70%" },
    },
    {
        name: "Pastel Green",
        value: "green",
        light: { primary: "140 55% 60%", ring: "140 55% 60%" },
        dark: { primary: "140 45% 60%", ring: "140 45% 60%" },
    },
    {
        name: "Pastel Red",
        value: "red",
        light: { primary: "0 75% 70%", ring: "0 75% 70%" },
        dark: { primary: "0 65% 70%", ring: "0 65% 70%" },
    },
    {
        name: "Pastel Purple",
        value: "purple",
        light: { primary: "265 65% 70%", ring: "265 65% 70%" },
        dark: { primary: "265 55% 70%", ring: "265 55% 70%" },
    },
    {
        name: "Pastel Pink",
        value: "pink",
        light: { primary: "330 75% 70%", ring: "330 75% 70%" },
        dark: { primary: "330 65% 70%", ring: "330 65% 70%" },
    },
    {
        name: "Pastel Yellow",
        value: "yellow",
        light: { primary: "45 90% 60%", ring: "45 90% 60%" },
        dark: { primary: "45 80% 60%", ring: "45 80% 60%" },
    },
    {
        name: "Pastel Teal",
        value: "teal",
        light: { primary: "170 55% 60%", ring: "170 55% 60%" },
        dark: { primary: "170 45% 60%", ring: "170 45% 60%" },
    },
    {
        name: "Pastel Cyan",
        value: "cyan",
        light: { primary: "190 65% 60%", ring: "190 65% 60%" },
        dark: { primary: "190 55% 60%", ring: "190 55% 60%" },
    },
    {
        name: "Pastel Indigo",
        value: "indigo",
        light: { primary: "240 65% 70%", ring: "240 65% 70%" },
        dark: { primary: "240 55% 70%", ring: "240 55% 70%" },
    },
    {
        name: "Pastel Violet",
        value: "violet",
        light: { primary: "270 55% 70%", ring: "270 55% 70%" },
        dark: { primary: "270 45% 70%", ring: "270 45% 70%" },
    },
    {
        name: "Pastel Lime",
        value: "lime",
        light: { primary: "85 65% 60%", ring: "85 65% 60%" },
        dark: { primary: "85 55% 60%", ring: "85 55% 60%" },
    },
];

// Helper to get Hue and Saturation from HSL string "H S% L%"
function getHsValues(hsl: string): { h: string, s: string } {
    const parts = hsl.split(" ");
    return { h: parts[0], s: parts[1] };
}

export function applyTheme(paletteName: string, isDark: boolean) {
    const palette = palettes.find((p) => p.value === paletteName) || palettes[0];
    const colors = isDark ? palette.dark : palette.light;
    const root = document.documentElement;

    // Extract Hue and Saturation for tinting
    const { h } = getHsValues(colors.primary);

    // Apply key CSS variables to root
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--ring", colors.ring);

    // Apply tinted backgrounds and borders
    if (isDark) {
        // Desaturate slightly for background (e.g., 30% of original saturation or fixed low saturation)
        // Using a fixed low saturation (e.g., 30%) often looks better than full saturation for dark backgrounds
        const bgSaturation = "30%";

        root.style.setProperty("--background", `${h} ${bgSaturation} 6%`);
        root.style.setProperty("--card", `${h} ${bgSaturation} 10%`);
        root.style.setProperty("--popover", `${h} ${bgSaturation} 10%`);
        root.style.setProperty("--secondary", `${h} ${bgSaturation} 15%`);
        root.style.setProperty("--muted", `${h} ${bgSaturation} 15%`);
        root.style.setProperty("--accent", `${h} ${bgSaturation} 15%`);
        root.style.setProperty("--border", `${h} ${bgSaturation} 20%`);
        root.style.setProperty("--input", `${h} ${bgSaturation} 20%`);
    } else {
        // Light mode with subtle tint
        root.style.removeProperty("--background");
        root.style.removeProperty("--card");
        root.style.removeProperty("--popover");

        // Use a very low saturation for light mode neutrals to avoid looking "dirty"
        // But keep them consistent with the theme
        const lightSat = "10%";

        root.style.setProperty("--secondary", `${h} ${lightSat} 96%`);
        root.style.setProperty("--muted", `${h} ${lightSat} 96%`);
        root.style.setProperty("--accent", `${h} ${lightSat} 96%`);
        root.style.setProperty("--border", `${h} ${lightSat} 90%`);
        root.style.setProperty("--input", `${h} ${lightSat} 90%`);
    }
}
