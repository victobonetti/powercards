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
        name: "Tangerine",
        value: "tangerine",
        light: { primary: "24.6 95% 53.1%", ring: "24.6 95% 53.1%" },
        dark: { primary: "20.5 90.2% 48.2%", ring: "20.5 90.2% 48.2%" },
    },
    {
        name: "Blue",
        value: "blue",
        light: { primary: "221.2 83.2% 53.3%", ring: "221.2 83.2% 53.3%" },
        dark: { primary: "217.2 91.2% 59.8%", ring: "217.2 91.2% 59.8%" },
    },
    {
        name: "Green",
        value: "green",
        light: { primary: "142.1 76.2% 36.3%", ring: "142.1 76.2% 36.3%" },
        dark: { primary: "142.1 70.6% 45.3%", ring: "142.1 70.6% 45.3%" },
    },
    {
        name: "Red",
        value: "red",
        light: { primary: "0 84.2% 60.2%", ring: "0 84.2% 60.2%" },
        dark: { primary: "0 72.2% 50.6%", ring: "0 72.2% 50.6%" },
    },
    {
        name: "Purple",
        value: "purple",
        light: { primary: "262.1 83.3% 57.8%", ring: "262.1 83.3% 57.8%" },
        dark: { primary: "263.4 70% 50.4%", ring: "263.4 70% 50.4%" },
    },
    {
        name: "Pink",
        value: "pink",
        light: { primary: "330.4 81.2% 60.4%", ring: "330.4 81.2% 60.4%" },
        dark: { primary: "330.4 70% 50.4%", ring: "330.4 70% 50.4%" },
    },
    {
        name: "Yellow",
        value: "yellow",
        light: { primary: "47.9 95.8% 53.1%", ring: "47.9 95.8% 53.1%" },
        dark: { primary: "47.9 95.8% 53.1%", ring: "47.9 95.8% 53.1%" },
    },
    {
        name: "Teal",
        value: "teal",
        light: { primary: "175.9 58.3% 40.8%", ring: "175.9 58.3% 40.8%" },
        dark: { primary: "175.9 48.3% 50.8%", ring: "175.9 48.3% 50.8%" },
    },
    {
        name: "Cyan",
        value: "cyan",
        light: { primary: "188.7 94.5% 42.7%", ring: "188.7 94.5% 42.7%" },
        dark: { primary: "188.7 94.5% 42.7%", ring: "188.7 94.5% 42.7%" },
    },
    {
        name: "Indigo",
        value: "indigo",
        light: { primary: "238.7 83.5% 66.7%", ring: "238.7 83.5% 66.7%" },
        dark: { primary: "238.7 83.5% 66.7%", ring: "238.7 83.5% 66.7%" },
    },
    {
        name: "Violet",
        value: "violet",
        light: { primary: "270 50% 40%", ring: "270 50% 40%" },
        dark: { primary: "270 50% 60%", ring: "270 50% 60%" },
    },
    {
        name: "Lime",
        value: "lime",
        light: { primary: "84.8 85.2% 51.4%", ring: "84.8 85.2% 51.4%" },
        dark: { primary: "84.8 85.2% 51.4%", ring: "84.8 85.2% 51.4%" },
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
